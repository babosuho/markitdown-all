import os
import pytest
from pathlib import Path

from backend.parsers.smart_router import SmartRouter
from backend.parsers.hwpx_parser import SafeHWPXParser
from backend.parsers.text_parser import TextParser
from backend.parsers.markdown_cleaner import MarkdownCleaner


def test_markdown_cleaner():
    cleaner = MarkdownCleaner()
    dirty_text = "Line 1   \n\n\n\nLine 2   \r\n\r\nLine 3"
    cleaned = cleaner.clean(dirty_text)
    assert "Line 1\n\nLine 2\n\nLine 3" == cleaned

    with_fm = cleaner.add_frontmatter(cleaned, "test_doc.pdf", tags=["tag1", "tag2"])
    assert "---" in with_fm
    assert 'title: "test_doc"' in with_fm
    assert "  - tag1" in with_fm
    assert "Line 1" in with_fm


def test_text_parser_csv_and_json():
    parser = TextParser()
    csv_data = "이름,역할,점수\n홍길동,개발자,100\n이순신,장군,99"
    md_table = parser.parse(csv_data.encode("utf-8"), filename="test.csv")
    assert "| 이름 | 역할 | 점수 |" in md_table
    assert "| --- | --- | --- |" in md_table
    assert "| 홍길동 | 개발자 | 100 |" in md_table

    json_data = '{"name": "test", "items": [1, 2]}'
    json_md = parser.parse(json_data.encode("utf-8"), filename="test.json")
    assert "```json" in json_md
    assert '"name": "test"' in json_md


def test_hwpx_sample_parsing():
    sample_hwpx = list(Path(".").glob("*.hwpx"))
    if not sample_hwpx:
        pytest.skip("HWPX sample file not found")

    parser = SafeHWPXParser()
    result_md = parser.parse(str(sample_hwpx[0]))
    assert len(result_md) > 500
    assert "부산" in result_md
    assert "|" in result_md  # Markdown table generated


def test_smart_router_pdf_and_hwpx():
    router = SmartRouter()

    # Test PDF sample
    pdf_files = list(Path(".").glob("*.pdf"))
    if pdf_files:
        res_pdf = router.convert_file(str(pdf_files[0]))
        assert res_pdf.success is True
        assert res_pdf.char_count > 500
        assert "Microsoft MarkItDown" in res_pdf.parser_used
        assert "---" in res_pdf.markdown  # frontmatter included

    # Test HWPX sample
    hwpx_files = list(Path(".").glob("*.hwpx"))
    if hwpx_files:
        res_hwpx = router.convert_file(str(hwpx_files[0]))
        assert res_hwpx.success is True
        assert res_hwpx.char_count > 500
        assert "SafeHWPXParser" in res_hwpx.parser_used
        assert "---" in res_hwpx.markdown
