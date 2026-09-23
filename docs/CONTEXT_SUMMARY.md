# CONTEXT_SUMMARY

새 세션/에이전트가 코드를 처음부터 다 읽지 않고도 3초 만에 전체 맥락과 아키텍처를 파악할 수 있도록 돕는 요약 문서입니다.

## 아키텍처 요약
- **frontend/ (Cloudflare Pages 호환 SPA)**
  - `index.html` — 드래그 앤 드롭 업로더, 변환 목록, 실시간 마크다운 렌더러/코드 뷰어 UI
  - `app.js` — 다중 파일 비동기 업로드, 클립보드 원클릭 복사, 개별/전체 ZIP 다운로드 제어
  - `style.css` — 반응형 Tailwind 기반 모던 스타일
- **backend/ (Python 3.10+ FastAPI)**
  - `app.py` — REST API 엔드포인트 (`/api/convert`, `/api/convert/zip`, `/api/health`)
  - `parsers/smart_router.py` — 확장자/MIME 기반 지능형 라우팅
  - `parsers/markitdown_parser.py` — Microsoft MarkItDown 래퍼 (PDF, DOCX, PPTX, XLSX, HTML)
  - `parsers/hwpx_parser.py` — `defusedxml` 기반 보안 강화 HWPX 전용 마크다운 파서 (문단 및 표 복원)
  - `parsers/text_parser.py` — TXT/CSV/JSON/XML 인코딩 자동 보정 파서
  - `parsers/markdown_cleaner.py` — 공백 정리, 마크다운 표 정렬, 옵시디언 YAML Frontmatter 자동 주입
- **harness.ps1** — 검증 및 테스트 자동화 스크립트
- **dashboard.html** — docs를 시각적으로 확인하는 오프라인 HTML 대시보드

## 핵심 데이터 흐름 (Conversion Flow)
1. 사용자가 웹 UI에서 1개 또는 다수 파일 드롭.
2. `app.js`가 백엔드 `POST /api/convert`로 `multipart/form-data` 전송.
3. `smart_router.py`가 파일 형식 식별 후 적절한 파서(MarkItDown, HWPX, Text)로 위임.
4. `markdown_cleaner.py`가 옵시디언 메타데이터와 서식을 다듬어 최종 마크다운 반환.
5. 브라우저에 목록 표시: 각 파일별 **[내용 복사]**, **[.md 다운로드]**, **[전체 ZIP 다운로드]** 활성화.

## 제약 및 보안 수칙
- HWPX 압축 해제 시 디스크에 쓰지 않고 메모리 내 처리 (Zip Slip 원천 방지).
- XML 파서는 반드시 `defusedxml` 사용 (XXE 방지).
- 파일당 최대 50MB 용량 제한.
