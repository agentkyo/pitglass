@echo off
rem PitGlass - double-click to start. Installs and builds on the first run.
title PitGlass
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 or newer is required: https://nodejs.org
  echo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies, first run only...
  call npm install --no-fund --no-audit
  if errorlevel 1 goto :fail
)
call node scripts\build.mjs
if errorlevel 1 goto :fail
node src\server\main.ts --open %*
if errorlevel 1 goto :fail
exit /b 0

:fail
echo.
echo PitGlass stopped with an error. The message is above.
pause
exit /b 1
