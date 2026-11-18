@echo off
rem Serves the studio on your Wi-Fi so your phone can open it. Keep this window open while you use it.
rem Windows may ask once to allow Node.js on private networks - click Allow.
cd /d "%~dp0"
node serve.mjs --lan
pause
