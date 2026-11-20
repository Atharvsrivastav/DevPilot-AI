@echo off
title DevPilot AI - Backend
echo Starting DevPilot AI Backend on port 8000...
set "PATH=C:\Users\Atharv\AppData\Local\hermes\bin;%PATH%"
cd /d "%~dp0backend"
"C:\Users\Atharv\AppData\Local\hermes\bin\uv.exe" run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
