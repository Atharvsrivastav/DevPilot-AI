@echo off
title DevPilot AI - Frontend
echo Starting DevPilot AI Frontend on port 3000...
set "PATH=C:\Users\Atharv\AppData\Local\node-v24;%PATH%"
cd /d "%~dp0frontend"
call "C:\Users\Atharv\AppData\Local\node-v24\npm.cmd" run dev -- -H 0.0.0.0 -p 3000
pause
