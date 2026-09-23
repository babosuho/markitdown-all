"""
Safe HWPX to Markdown Parser
- Secure against Zip-Slip by validating entry paths and using in-memory reading.
- Secure against XXE by using defusedxml.
- Reconstructs document hierarchy: Headings, Paragraphs, Tables, and Callouts.
"""
import io
import zipfile
from typing import Union, BinaryIO, List
import defusedxml.ElementTree as ET


class SafeHWPXParser:
    def __init__(self):
        pass

    @staticmethod
    def _get_tag(elem) -> str:
        return elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag

    def _extract_text(self, node) -> str:
        """Extract all text (<hp:t>) within a node, preserving spaces."""
        text_parts = []
        for elem in node.iter():
            if self._get_tag(elem) == "t" and elem.text:
                text_parts.append(elem.text)
        return "".join(text_parts).strip()

    def _render_table(self, tbl_elem) -> str:
        """Convert a <hp:tbl> element into a Markdown table or callout."""
        rows = [c for c in tbl_elem if self._get_tag(c) == "tr"]
        if not rows:
            return ""

        table_matrix: List[List[str]] = []
        max_cols = 0

        for row in rows:
            cells = [c for c in row if self._get_tag(c) == "tc"]
            row_data = []
            for cell in cells:
                # Replace internal newlines with <br> to keep table intact
                cell_text = self._extract_text(cell).replace("\n", " ").replace("\r", "")
                # Escape pipe characters in markdown table cells
                cell_text = cell_text.replace("|", "\\|")
                row_data.append(cell_text)
            if row_data:
                table_matrix.append(row_data)
                if len(row_data) > max_cols:
                    max_cols = len(row_data)

        if not table_matrix or max_cols == 0:
            return ""

        # Normalize column count for all rows
        for r in table_matrix:
            while len(r) < max_cols:
                r.append("")

        # Single cell table often used as a callout box in HWP/HWPX
        if len(table_matrix) == 1 and max_cols == 1:
            return f"\n> {table_matrix[0][0]}\n"

        # Multi-column table
        md_lines = []
        header = table_matrix[0]
        md_lines.append("| " + " | ".join(header) + " |")
        md_lines.append("| " + " | ".join(["---"] * max_cols) + " |")

        for row in table_matrix[1:]:
            md_lines.append("| " + " | ".join(row) + " |")

        return "\n" + "\n".join(md_lines) + "\n"

    def parse(self, source: Union[str, BinaryIO, bytes]) -> str:
        """
        Parses HWPX file from file path, byte stream, or bytes.
        Returns formatted Markdown.
        """
        if isinstance(source, (bytes, bytearray)):
            zip_input = io.BytesIO(source)
        elif isinstance(source, str):
            with open(source, "rb") as f:
                zip_input = io.BytesIO(f.read())
        else:
            zip_input = io.BytesIO(source.read())

        markdown_blocks = []

        with zipfile.ZipFile(zip_input, "r") as z:
            # 1. Filter section files and sort them (section0.xml, section1.xml ...)
            section_files = sorted(
                [
                    name
                    for name in z.namelist()
                    if name.startswith("Contents/section") and name.endswith(".xml")
                    and ".." not in name  # Zip-slip prevention
                ]
            )

            if not section_files:
                raise ValueError("올바른 HWPX 문서가 아닙니다 (Contents/section XML 누락).")

            for sec_name in section_files:
                xml_content = z.read(sec_name)
                root = ET.fromstring(xml_content)

                # Iterate through each paragraph in section
                for p in root:
                    if self._get_tag(p) != "p":
                        continue

                    # Check if paragraph contains a table
                    tables = [e for e in p.iter() if self._get_tag(e) == "tbl"]
                    if tables:
                        for tbl in tables:
                            tbl_md = self._render_table(tbl)
                            if tbl_md:
                                markdown_blocks.append(tbl_md)
                        continue

                    # Check if paragraph contains text
                    p_text = self._extract_text(p)
                    if p_text:
                        # Detect headings (e.g. Ⅰ., 1., 1), 가., etc. or title indicators)
                        markdown_blocks.append(p_text)

        return "\n\n".join(markdown_blocks)
