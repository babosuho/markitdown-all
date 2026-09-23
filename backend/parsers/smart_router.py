"""
Smart Document Router
Intelligently routes files to the optimal parser based on extension and content.
Post-processes output for Obsidian and AI RAG suitability.
"""
import os
from dataclasses import dataclass
from typing import Union, BinaryIO, Optional, List

from backend.parsers.markitdown_parser import MarkItDownParser
from backend.parsers.hwpx_parser import SafeHWPXParser
from backend.parsers.text_parser import TextParser
from backend.parsers.markdown_cleaner import MarkdownCleaner


@dataclass
class ConversionResult:
    filename: str
    markdown: str
    char_count: int
    line_count: int
    parser_used: str
    success: bool
    error: Optional[str] = None


class SmartRouter:
    OFFICE_EXTENSIONS = {".pdf", ".docx", ".pptx", ".xlsx", ".html", ".htm", ".epub"}
    HWPX_EXTENSIONS = {".hwpx"}
    TEXT_EXTENSIONS = {
        ".txt", ".csv", ".json", ".xml", ".md", ".markdown",
        ".py", ".js", ".ts", ".jsx", ".tsx", ".sh", ".yaml", ".yml",
        ".css", ".scss", ".sql", ".log", ".ini", ".env", ".toml"
    }

    def __init__(self):
        self.markitdown_parser = MarkItDownParser()
        self.hwpx_parser = SafeHWPXParser()
        self.text_parser = TextParser()
        self.cleaner = MarkdownCleaner()

    def convert_file(
        self,
        source: Union[str, BinaryIO, bytes],
        filename: Optional[str] = None,
        enable_frontmatter: bool = True,
        frontmatter_tags: Optional[List[str]] = None,
    ) -> ConversionResult:
        """
        Main routing function to convert any document into Markdown.
        """
        # Determine filename
        if not filename:
            if isinstance(source, str):
                filename = os.path.basename(source)
            else:
                filename = "document"

        ext = os.path.splitext(filename)[1].lower()
        parser_name = "Unknown"
        raw_markdown = ""

        try:
            # 1. HWPX Router
            if ext in self.HWPX_EXTENSIONS:
                parser_name = "SafeHWPXParser"
                raw_markdown = self.hwpx_parser.parse(source)

            # 2. Office & Web Document Router (MarkItDown)
            elif ext in self.OFFICE_EXTENSIONS:
                parser_name = f"Microsoft MarkItDown ({ext.upper()})"
                raw_markdown = self.markitdown_parser.parse(source, filename=filename)

            # 3. Text & Structured Data Router
            elif ext in self.TEXT_EXTENSIONS:
                parser_name = f"TextNormalizer ({ext.upper()})"
                raw_markdown = self.text_parser.parse(source, filename=filename)

            # 4. Fallback / Unknown extension
            else:
                try:
                    parser_name = "Microsoft MarkItDown (Auto-detect)"
                    raw_markdown = self.markitdown_parser.parse(source, filename=filename)
                except Exception:
                    parser_name = "TextFallback"
                    raw_markdown = self.text_parser.parse(source, filename=filename)

            # Post-processing: clean excessive blanks
            cleaned_md = self.cleaner.clean(raw_markdown)

            # Post-processing: add Obsidian Frontmatter if enabled
            if enable_frontmatter:
                cleaned_md = self.cleaner.add_frontmatter(
                    cleaned_md,
                    filename=filename,
                    tags=frontmatter_tags or ["document", "all-to-markdown"],
                    extra_meta={"parser": parser_name},
                )

            lines = cleaned_md.split("\n")
            return ConversionResult(
                filename=filename,
                markdown=cleaned_md,
                char_count=len(cleaned_md),
                line_count=len(lines),
                parser_used=parser_name,
                success=True,
                error=None,
            )

        except Exception as e:
            return ConversionResult(
                filename=filename,
                markdown="",
                char_count=0,
                line_count=0,
                parser_used=parser_name,
                success=False,
                error=str(e),
            )
