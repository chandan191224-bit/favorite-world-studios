@echo off
rem Serves Hook Editor Studio Pro on your Wi-Fi so your phone can open it (port 7412).
cd /d "%~dp0"
node serve.mjs --lan
pause
