# OBJECTIVES

## 프로젝트 목적
All-to-Markdown은 다양한 이종 문서 포맷(PDF, Word, PPT, Excel, HWPX, Text, Code 등)을 단일화된 최적 마크다운(.md)으로 변환하여, 사용자가 옵시디언(Obsidian) 지식 베이스에 바로 수납하거나 LLM/RAG 파이프라인의 학습 데이터셋으로 즉시 활용할 수 있도록 돕는 웹 서비스입니다.

## 핵심 가치
1. **스마트 포맷 라우팅 (Smart Routing)** — 파일 종류에 따라 Microsoft MarkItDown, HWPX 전용 안전 파서, 텍스트 정규화기를 자동 배분하여 최적의 마크다운 구조 보존.
2. **원클릭 생산성 (Zero-Friction UX)** — 브라우저에서 다수 파일 드래그 앤 드롭 -> 실시간 변환 -> 원클릭 클립보드 복사, 개별 .md 다운로드, 전체 ZIP 일괄 수령.
3. **AI / 옵시디언 최적화** — 마크다운 표 정렬, 불필요한 개행 축소, 옵시디언 호환 YAML Frontmatter(제목, 생성일, 태그) 자동 생성 지원.
4. **철저한 보안 및 안정성** — XXE/Zip Slip 차단, 대용량 파일 안전 처리, Cloudflare Pages 호환 구조.

## 현재 단계 (2026-09-24 기준)
- [x] 프로젝트 기획 및 전문가 5인 평가 완료
- [x] Project OS (docs/, Git, CLAUDE.md) 인프라 구축
- [x] 스마트 라우터 및 백엔드 파서(MarkItDown + HWPX + Text) 구현
- [x] FastAPI 엔드포인트 및 단위 테스트 구축
- [x] 반응형 프론트엔드 UI (Tailwind CSS, Cloudflare Pages 준비) 구현
- [x] 오프라인 시각화 대시보드(dashboard.html) 및 자동화 하네스(harness.ps1) 완성
- [x] PDF 및 HWPX 실문서 스모크 테스트 통과

## 성공 기준
- [x] PDF 및 HWPX 실문서 샘플이 마크다운으로 무결하게 변환될 것 (검증 완료)
- [x] 여러 개의 이종 파일을 한 번에 업로드했을 때 에러 없이 목록으로 출력될 것 (검증 완료)
- [x] 각 파일별 "내용 복사" 버튼 클릭 시 클립보드에 정확히 복사될 것 (검증 완료)
- [x] 개별 .md 파일 및 전체 ZIP 다운로드가 정상 작동할 것 (검증 완료)
- [x] 보안 취약점(XXE, Zip Slip, 메모리 누수)이 사전 차단될 것 (defusedxml 및 메모리 파싱 적용 완료)
