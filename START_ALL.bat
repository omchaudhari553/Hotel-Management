@echo off
title Start Hotel Management System
echo ==============================================
echo   Starting Hotel Management System (Backend + Frontend)
echo ==============================================

echo [1/2] Starting Spring Boot Backend (Port 8080)...
start "Hotel Backend (Port 8080)" cmd /k "cd /d "%~dp0backend" && java -jar target\hotel-backend-1.0.0.jar"

echo [2/2] Starting React Frontend (Port 5173)...
start "Hotel Frontend (Port 5173)" cmd /k "cd /d "%~dp0Hotel-Billing" && npm run dev -- --host"

echo ==============================================
echo Backend and Frontend windows launched!
echo Open your browser at: http://localhost:5173
echo Default Login:
echo   Username: hoteladmin
echo   Password: Admin@123
echo ==============================================
pause
