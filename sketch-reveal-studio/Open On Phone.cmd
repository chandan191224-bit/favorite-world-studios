@echo off
rem Serves the studio on your Wi-Fi so you can open it on a phone (same network).
cd /d "%~dp0"
node serve.mjs --lan
pause
