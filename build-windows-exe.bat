@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo  COILED TUBING FATIGUE ^& WELLBORE FORCES SUITE
echo  Windows Standalone Executable (.EXE) Automated Builder
echo =====================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo Please install Node.js (v18, v20, or v22 LTS) from:
    echo   https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [*] Detected Node.js version: %NODE_VER%
echo.

:: 2. Check/Install dependencies
if not exist "node_modules\" (
    echo [1/3] Installing application dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install encountered an error.
        pause
        exit /b 1
    )
) else (
    echo [1/3] node_modules exists. Skipping full install (run 'npm install' manually if packages change).
)

:: 3. Build Vite bundle
echo.
echo [2/3] Building production assets (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Vite build failed. Check error output above.
    pause
    exit /b 1
)

:: 4. Package Windows .EXE with electron-builder
echo.
echo [3/3] Packaging standalone Windows .exe with Electron Builder...
echo       Targets: NSIS Installer Setup & Portable Executable (.exe)
call npx electron-builder --win nsis portable
if %errorlevel% neq 0 (
    echo [ERROR] Electron packaging failed.
    pause
    exit /b 1
)

echo.
echo =====================================================================
echo  BUILD SUCCESSFUL!
echo.
echo  Your standalone Windows installers have been generated in:
echo    .\release\
echo.
echo  Output Files:
echo    - Setup Installer : Coiled Tubing Engineering Suite-Setup-1.0.0.exe
echo    - Portable App    : Coiled Tubing Engineering Suite-v1.0.0-Portable.exe
echo =====================================================================
echo.

if exist "release\" (
    explorer release
)

pause
