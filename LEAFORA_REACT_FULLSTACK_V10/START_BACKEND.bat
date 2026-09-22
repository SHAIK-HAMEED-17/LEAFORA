@echo off
title LEAFORA V8 - Backend
cd /d "%~dp0backend"
if not exist node_modules npm install
npm run dev
pause
