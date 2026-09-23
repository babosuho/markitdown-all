"""
Microsoft MarkItDown Parser Wrapper
Handles Office formats (PDF, DOCX, PPTX, XLSX), HTML, and EPUB.
"""
import os
import tempfile
from typing import Union, BinaryIO
from markitdown import MarkItDown


class MarkItDownParser:
    def __init__(self):
        self.md_engine = MarkItDown()

    def parse(self, source: Union[str, BinaryIO, bytes], filename: str = "") -> str:
        """
        Converts file to markdown using Microsoft MarkItDown.
        """
        # If already a valid file path on disk
        if isinstance(source, str) and os.path.isfile(source):
            result = self.md_engine.convert(source)
            return result.text_content

        # If bytes or file-like object, write to a temp file with original extension
        ext = os.path.splitext(filename)[1] if filename else ".tmp"
        if isinstance(source, (bytes, bytearray)):
            file_bytes = bytes(source)
        elif isinstance(source, str):
            file_bytes = source.encode("utf-8")
        else:
            file_bytes = source.read()

        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_file:
            temp_path = temp_file.name
            temp_file.write(file_bytes)

        try:
            result = self.md_engine.convert(temp_path)
            return result.text_content
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
