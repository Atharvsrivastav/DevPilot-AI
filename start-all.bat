@echo off
title DevPilot AI - Launcher
echo ===================================================
echo Launching DevPilot AI Backend and Frontend servers...
echo ===================================================
start "DevPilot AI - Backend" "%~dp0start-backend.bat"
start "DevPilot AI - Frontend" "%~dp0start-frontend.bat"
echo.
echo Both servers are launching in their own persistent windows!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo You can leave those command prompt windows open while working.
