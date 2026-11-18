@echo off
rem Starts Map Animation Studio so your phone or tablet can use it on the same Wi-Fi.
rem Open the "Phone:" address it prints. Keep this window open. Windows may ask once to allow Node.js on private networks - click Allow.
title Map Animation Studio (phone)
cd /d "%~dp0"
node server\server.mjs --lan
pause
