@echo off
title Hotel Management Backend (Spring Boot)
echo ==============================================
echo   Starting Hotel Management Backend (Port 8080)
echo   Central Database: 192.168.1.51:1433 (hotel_management)
echo ==============================================
cd /d "%~dp0"
mvn spring-boot:run
pause
