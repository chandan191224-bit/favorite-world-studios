@echo off
cd /d "%~dp0..\.."
echo Starting Voiceover Studio Pro on LAN (open the printed IP URL on your phone)...
python studios\voiceover-studio\server.py --lan --no-open
pause
