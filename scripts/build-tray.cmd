@echo off
rem Builds PitGlass.exe (the tray icon) with the C# compiler that ships with Windows.
setlocal
cd /d "%~dp0.."
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (
  echo The .NET Framework 4 compiler was not found: PitGlass will run in a console window instead.
  exit /b 1
)
"%CSC%" /nologo /target:winexe /optimize+ /platform:anycpu /out:PitGlass.exe /win32icon:tray\pitglass.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:Microsoft.CSharp.dll tray\PitGlassTray.cs
if errorlevel 1 exit /b 1
echo built PitGlass.exe
