@echo off
chcp 65001 > nul
echo ==============================================================
echo  All-to-Markdown Backend + Cloudflare Public HTTPS Tunnel
echo ==============================================================
echo.
echo [1/2] 로컬 백엔드 서버(포트 8000)를 새 창에서 실행합니다...
start "All-to-Markdown Backend" cmd /k "python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000"

echo [2/2] 스마트폰/외부 접속을 위한 보안 HTTPS 공용 터널을 생성합니다...
echo.
echo --------------------------------------------------------------
echo [안내] 잠시 후 아래에 'https://xxxx.trycloudflare.com' 링크가 표시됩니다.
echo 그 링크를 복사하여 스마트폰의 https://markitdown-all.pages.dev 상단
echo [서버 설정]에 붙여넣으시면 스마트폰에서도 즉시 초록불이 켜집니다!
echo --------------------------------------------------------------
echo.
.\cloudflared.exe tunnel --url http://localhost:8000
pause
