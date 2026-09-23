# All-to-Markdown (MarkItDown All)

All-to-Markdown은 다양한 포맷(PDF, Word, PPT, Excel, HWPX, Text, Code 등)의 문서를 최적화된 마크다운(.md)으로 변환하고, 개별/일괄 다운로드 및 내용 복사 기능을 제공하는 웹 서비스이자 RAG/AI 데이터 파이프라인 도구입니다.

## 구조
- `backend/` — Python FastAPI 기반 스마트 포맷 라우팅 및 변환 백엔드
  - `parsers/` — MarkItDown 래퍼, HWPX 전용 파서, 텍스트/데이터 정규화기, 마크다운 후처리기
  - `app.py` — REST API 엔드포인트 (`/api/convert`, `/api/convert/zip`, `/api/health`)
- `frontend/` — Cloudflare Pages 배포용 경량 SPA (드래그 앤 드롭, 실시간 렌더러, 원클릭 복사, ZIP 압축)
- `docs/` — 프로젝트 운영 체제 (아래 참조)
- `tests/` — 변환 파서 및 API 단위 테스트
- `dashboard.html` — 프로젝트 운영 현황 및 진도 시각화 대시보드
- `harness.ps1` — 파이프라인 자동 테스트 및 검증 스크립트

## 핵심 명령어

```powershell
# 백엔드 서버 실행 (포트 8000)
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload

# 단위 테스트 실행
pytest tests/ -v

# 하네스 검증 실행
./harness.ps1
```

## 문서 (docs/)
- `docs/OBJECTIVES.md` — 프로젝트 목적, 핵심 가치, 성공 기준
- `docs/PROGRESS.md` — 현재 상태, 완료된 작업, 진행 중인 작업, 실시간 로그
- `docs/LESSONS_LEARNED.md` — 발생 이슈, 원인, 해결책, 재발 방지 기록장
- `docs/CONTEXT_SUMMARY.md` — 아키텍처 및 핵심 플로우 초압축 요약 (새 세션 온보딩용)

## 작업 원칙 및 규칙
1. **문맥 보존**: 새 작업 시작 전 반드시 `docs/PROGRESS.md`와 `docs/CONTEXT_SUMMARY.md`를 먼저 확인한다.
2. **진도 표시**: 작업 완료 시 `docs/PROGRESS.md`의 진행 상태를 갱신한다.
3. **실수 기록**: 실패, 에러, 예외 케이스 발생 시 원인과 해결책을 `docs/LESSONS_LEARNED.md`에 즉시 기록하여 반복을 차단한다.
4. **보안 철칙**:
   - XML 파싱 시 반드시 `defusedxml`을 사용하여 XXE 공격 방지.
   - Zip/HWPX 처리 시 경로 순회(Zip Slip) 검증 수행.
   - 임의 파일 업로드에 대해 확장자 및 MIME 무결성 검증, 최대 파일 크기 제한 적용.
5. **일괄 처리(Batch execution)**: 산발적인 수정 대신 관련 모듈을 완전하고 응집력 있게 일괄 작성/수정한다.
