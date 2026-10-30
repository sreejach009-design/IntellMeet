@echo off
title IntellMeet Launcher
echo ========================================================
echo   Starting IntellMeet Enterprise Platform
echo   - Backend API & Real-time WebRTC Signaling (Port 5000)
echo   - Frontend React + Vite Application (Port 5173)
echo   - Cloudflare Worldwide Secure HTTPS Tunnel
echo ========================================================

start "IntellMeet Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul

start "IntellMeet Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 3 /nobreak >nul

if exist cloudflared.exe (
  start "IntellMeet Public Tunnel" cmd /k "cloudflared.exe tunnel --url http://localhost:5173"
)

timeout /t 3 /nobreak >nul
start http://localhost:5173

echo ========================================================
echo   IntellMeet is running! Opening browser...
echo ========================================================
