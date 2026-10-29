@echo off
title Hotel Billing Frontend (Vite)
echo ==============================================
echo   Starting Hotel Billing Frontend (Vite)
echo   Local URL:   http://localhost:5173
echo   Network URL: http://192.168.1.51:5173
echo ==============================================
cd /d "%~dp0"
npm run dev -- --host
pause
