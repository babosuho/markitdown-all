"""
Markdown Cleaner & Formatter
- Cleans up excessive newlines and whitespace
- Cleans up slide banner noise (e.g., vertical decorative characters)
- Adds Obsidian-compatible YAML Frontmatter
- Ensures consistent UTF-8 formatting
"""
import re
from datetime import datetime
from typing import Optional, List


class MarkdownCleaner:
    @staticmethod
    def clean(markdown_text: str) -> str:
        """Clean excessive whitespaces, slide banner artifacts, and empty lines."""
        if not markdown_text:
            return ""

        # Normalize line endings to \n
        text = markdown_text.replace("\r\n", "\n").replace("\r", "\n")

        # Strip vertical banner decoration noise (e.g. 신 \n 청 \n 안 \n 내)
        text = re.sub(r"(?:^|\n)\s*신\s*\n\s*청\s*\n\s*안\s*\n\s*내\s*(?:\n|$)", "\n\n", text)
        text = re.sub(r"(?:^|\n)\s*안\s*\n\s*내\s*\n\s*사\s*\n\s*항\s*(?:\n|$)", "\n\n", text)

        # Strip trailing whitespace on each line
        lines = [line.rstrip() for line in text.split("\n")]
        text = "\n".join(lines)

        # Replace 3 or more consecutive newlines with 2 newlines
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    @staticmethod
    def add_frontmatter(
        markdown_text: str,
        filename: str,
        tags: Optional[List[str]] = None,
        extra_meta: Optional[dict] = None,
    ) -> str:
        """
        Prepend Obsidian-compatible YAML frontmatter.
        """
        if tags is None:
            tags = ["document", "all-to-markdown"]

        # Clean title by removing extension
        title = filename.rsplit(".", 1)[0] if "." in filename else filename
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        frontmatter_lines = [
            "---",
            f'title: "{title}"',
            f'source_file: "{filename}"',
            f'converted_at: "{now_str}"',
            "tags:",
        ]
        for tag in tags:
            frontmatter_lines.append(f"  - {tag}")

        if extra_meta:
            for k, v in extra_meta.items():
                frontmatter_lines.append(f'{k}: "{v}"')

        frontmatter_lines.append("---")
        frontmatter_lines.append("")

        return "\n".join(frontmatter_lines) + "\n" + markdown_text
