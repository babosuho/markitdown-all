@echo off
chcp 65001 > nul
echo ==============================================
echo  All-to-Markdown Server Starting...
echo  URL: http://localhost:8000
echo ==============================================
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
pause
