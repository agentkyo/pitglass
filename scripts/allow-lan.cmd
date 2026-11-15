@echo off
rem Lets phones on your local network reach PitGlass: opens TCP 47830 in Windows Firewall,
rem for addresses on the local subnet only. Run once. To undo: scripts\allow-lan.cmd remove
title PitGlass - firewall
net session >nul 2>nul
if errorlevel 1 (
  echo Asking for administrator rights...
  powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath '%~f0' -ArgumentList '%*'"
  exit /b
)
netsh advfirewall firewall delete rule name="PitGlass" >nul 2>nul
if /i "%~1"=="remove" (
  echo Firewall rule removed.
) else (
  netsh advfirewall firewall add rule name="PitGlass" dir=in action=allow protocol=TCP localport=47830 remoteip=localsubnet profile=any
  echo.
  echo Done: devices on your local network can open PitGlass on port 47830.
)
echo.
pause
