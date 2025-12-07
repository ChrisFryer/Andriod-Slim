@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>nul

echo ============================================
echo   Android Slim - Build Script (Windows)
echo ============================================
echo.

:: Change to script directory
cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

:: Display versions
echo Node.js version:
call node --version
echo npm version:
call npm --version
echo.

:: Install dependencies (including pkg)
echo Installing dependencies...
call npm install
if !ERRORLEVEL! neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

:: Create dist directory
if not exist dist mkdir dist

:: Build Windows executable
echo.
echo Building Windows executable...
call npx pkg . --targets node18-win-x64 --out-path dist --compress GZip

if !ERRORLEVEL! equ 0 (
    echo.
    echo ============================================
    echo   BUILD SUCCESSFUL!
    echo ============================================
    echo.
    echo Executable created: dist\android-slim.exe
    echo.
    echo To run: double-click android-slim.exe
    echo         or run from command line: dist\android-slim.exe
    echo.
    echo NOTE: ADB must be installed and in PATH for the app to work.
    echo.
) else (
    echo.
    echo BUILD FAILED!
    echo Check the errors above.
)

endlocal
pause
