@echo off
echo ========================================================
echo Launching Smart Fleet Management System (Module 1)
echo ========================================================

start "Smart Fleet - Backend Server" cmd /k "start_backend.bat"
timeout /t 3 /nobreak >nul
start "Smart Fleet - Frontend Client" cmd /k "start_frontend.bat"

echo.
echo Both servers are starting!
echo Backend Docs: http://localhost:8000/docs
echo Frontend App: http://localhost:5173
echo.
