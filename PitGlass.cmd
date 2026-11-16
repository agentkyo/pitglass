@echo off
rem PitGlass - double-click to start. Installs and builds on the first run, then lives in the
rem system tray (PitGlass.exe). "PitGlass.cmd console" runs it in this window instead.
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
if /i "%~1"=="console" goto :console
if not exist PitGlass.exe call scripts\build-tray.cmd
if not exist PitGlass.exe goto :console
start "" PitGlass.exe
exit /b 0

:console
node src\server\main.ts --open
if errorlevel 1 goto :fail
exit /b 0

:fail
echo.
echo PitGlass stopped with an error. The message is above.
pause
exit /b 1
