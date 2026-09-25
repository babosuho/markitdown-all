"""
Vision PDF Parser using Google Gemini API
Renders PDF pages into high-resolution images and uses Gemini Multimodal Vision
to accurately transcribe UI screenshots, slide decks, and image-heavy documents.
"""
import io
import os
from typing import Union, BinaryIO, Optional, List
from concurrent.futures import ThreadPoolExecutor

import fitz  # PyMuPDF
from google import genai
from google.genai import types


class VisionPdfParser:
    DEFAULT_MODEL = "gemini-2.5-flash"

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.model = model or self.DEFAULT_MODEL
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def set_api_key(self, api_key: str):
        self.api_key = api_key
        self.client = genai.Client(api_key=api_key)

    def _render_page_to_png(self, page, dpi: int = 150) -> bytes:
        pix = page.get_pixmap(dpi=dpi)
        return pix.tobytes("png")

    def _transcribe_page(self, page_num: int, png_bytes: bytes) -> str:
        if not self.client:
            raise ValueError("Gemini API 키가 설정되지 않았습니다.")

        prompt = (
            f"당신은 공문서/업무 매뉴얼/보고서 시각 분석 전문가입니다. "
            f"이 이미지는 문서의 {page_num}번째 페이지(슬라이드)입니다.\n"
            f"화면에 표시된 모든 텍스트, 웹 UI 조작 순서(번호, 메뉴 경로, 버튼명, 입력 항목), "
            f"그리고 표(Table) 데이터를 완벽한 GitHub Flavored Markdown(GFM) 형식으로 변환하세요.\n\n"
            f"반드시 지켜야 할 엄격한 규칙:\n"
            f"1. [표 변환 필수]: 이미지 내에 표, 양식, 비교 데이터, 통계가 포함되어 있다면 절대 텍스트나 목록으로 요약하지 말고, "
            f"반드시 표준 Markdown Table (`| 헤더1 | 헤더2 |` 및 `| --- | --- |` 및 `| 데이터1 | 데이터2 |`) 문법으로 100% 온전히 복원하세요.\n"
            f"2. [부연 설명 금지]: 서두 인사말(예: '다음은 변환 내용입니다'), 맺음말, 요약, 사족 등 문서 본문과 무관한 설명글을 절대로 출력하지 마세요.\n"
            f"3. [순수 마크다운만 출력]: 코드블록 태그(```markdown)로 감싸지 말고, 순수 마크다운 텍스트 자체만 즉시 출력하세요.\n"
            f"4. 세로 쓰기 장식 배너(예: '신청안내' 등)나 무의미한 디자인 테두리는 생략하세요.\n"
            f"5. 캡처 화면 속 1, 2, 3... 번호가 가리키는 실제 작업 내용(어디를 클릭하고 무엇을 입력해야 하는지)을 명확한 순서형 목록(`1. `, `2. `)으로 상세히 기술하세요.\n"
            f"6. 주의사항(※)이나 강조 문구(★)는 인용구(`> `)나 굵은 글씨(`**...**`)로 작성하세요."
        )

        image_part = types.Part.from_bytes(data=png_bytes, mime_type="image/png")

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[image_part, prompt],
            )
            return response.text.strip() if response.text else ""
        except Exception as e:
            # Fallback to secondary model if primary fails
            if self.model != "gemini-2.0-flash":
                try:
                    response = self.client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=[image_part, prompt],
                    )
                    return response.text.strip() if response.text else ""
                except Exception:
                    pass
            return f"> [페이지 {page_num} 변환 오류: {e}]"

    def parse(self, source: Union[str, BinaryIO, bytes], max_pages: int = 50) -> str:
        if not self.client:
            raise ValueError("Gemini API 키가 설정되지 않았습니다. 상단 설정에서 API 키를 입력해 주세요.")

        if isinstance(source, (bytes, bytearray)):
            doc = fitz.open(stream=bytes(source), filetype="pdf")
        elif isinstance(source, str):
            doc = fitz.open(source)
        else:
            doc = fitz.open(stream=source.read(), filetype="pdf")

        total_pages = min(len(doc), max_pages)
        tasks = []

        # Render all pages in memory
        for idx in range(total_pages):
            page = doc[idx]
            png_bytes = self._render_page_to_png(page)
            tasks.append((idx + 1, png_bytes))

        doc.close()

        # Concurrent transcription using ThreadPoolExecutor
        page_results = [None] * len(tasks)
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_idx = {
                executor.submit(self._transcribe_page, page_num, png_data): i
                for i, (page_num, png_data) in enumerate(tasks)
            }
            for future in future_to_idx:
                i = future_to_idx[future]
                try:
                    page_results[i] = future.result()
                except Exception as e:
                    page_results[i] = f"> [페이지 {i+1} 처리 실패: {e}]"

        return "\n\n---\n\n".join(page_results)
