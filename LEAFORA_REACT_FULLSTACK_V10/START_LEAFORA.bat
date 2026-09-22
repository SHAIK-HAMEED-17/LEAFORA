@echo off
title LEAFORA V8 - Start Website
cd /d "%~dp0"
start "LEAFORA Backend" cmd /k "cd /d ""%~dp0backend"" && if not exist node_modules npm install && npm run dev"
start "LEAFORA Frontend" cmd /k "cd /d ""%~dp0frontend"" && if not exist node_modules npm install && npm run dev"
timeout /t 8 /nobreak >nul
start "" http://localhost:5173/
