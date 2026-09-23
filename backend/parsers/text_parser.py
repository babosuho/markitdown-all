"""
Text and Structured Data Parser
- Supports TXT, CSV, JSON, XML, MD, etc.
- Auto-detects Korean encodings (CP949, EUC-KR, UTF-8, UTF-8-SIG) using charset-normalizer.
- Formats CSV into Markdown tables.
- Formats JSON into formatted code blocks.
"""
import io
import csv
import json
from typing import Union, BinaryIO
import charset_normalizer


class TextParser:
    @staticmethod
    def _read_bytes(source: Union[str, BinaryIO, bytes]) -> bytes:
        if isinstance(source, (bytes, bytearray)):
            return bytes(source)
        elif isinstance(source, str):
            with open(source, "rb") as f:
                return f.read()
        else:
            return source.read()

    @staticmethod
    def _decode_bytes(raw_bytes: bytes) -> str:
        """Robust decoding with fallback to CP949 and utf-8 with replace."""
        if not raw_bytes:
            return ""

        # Try fast UTF-8 first
        try:
            return raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            pass

        # Try charset-normalizer
        try:
            detected = charset_normalizer.from_bytes(raw_bytes).best()
            if detected:
                return str(detected)
        except Exception:
            pass

        # Try CP949 (Korean legacy)
        try:
            return raw_bytes.decode("cp949")
        except UnicodeDecodeError:
            pass

        # Ultimate fallback
        return raw_bytes.decode("utf-8", errors="replace")

    def parse(self, source: Union[str, BinaryIO, bytes], filename: str = "") -> str:
        raw_bytes = self._read_bytes(source)
        text = self._decode_bytes(raw_bytes)
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

        # CSV formatting
        if ext == "csv":
            return self._format_csv(text)

        # JSON formatting
        if ext == "json":
            return self._format_json(text)

        # Markdown / Plain text
        return text

    def _format_csv(self, csv_text: str) -> str:
        """Converts CSV into Markdown table."""
        try:
            f = io.StringIO(csv_text.strip())
            reader = csv.reader(f)
            rows = list(reader)
            if not rows:
                return ""

            max_cols = max(len(r) for r in rows)
            if max_cols == 0:
                return ""

            # Pad columns
            for r in rows:
                while len(r) < max_cols:
                    r.append("")
                # Clean pipes and linebreaks in cells
                for i in range(len(r)):
                    r[i] = r[i].replace("|", "\\|").replace("\n", " ")

            md_lines = []
            header = rows[0]
            md_lines.append("| " + " | ".join(header) + " |")
            md_lines.append("| " + " | ".join(["---"] * max_cols) + " |")

            for r in rows[1:]:
                md_lines.append("| " + " | ".join(r) + " |")

            return "\n".join(md_lines)
        except Exception:
            # Fallback to code block
            return f"```csv\n{csv_text}\n```"

    def _format_json(self, json_text: str) -> str:
        """Formats JSON nicely in a markdown code block."""
        try:
            parsed = json.loads(json_text)
            formatted = json.dumps(parsed, indent=2, ensure_ascii=False)
            return f"```json\n{formatted}\n```"
        except Exception:
            return f"```json\n{json_text}\n```"
