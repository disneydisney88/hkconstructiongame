@echo off
cd /d "%~dp0"
start "" "http://localhost:8123/?t=%RANDOM%"
python server.py
