@echo off
rem IVO Automation - Windows local launcher (ASCII-only for CMD compatibility)
chcp 65001 >nul 2>&1
setlocal EnableExtensions

cd /d "%~dp0"

set "PORT=3002"
set "HOST=127.0.0.1"
set "URL=http://localhost:%PORT%"
rem Strip trailing backslash (avoids broken quotes when calling PowerShell)
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "IVO_NODE=%PROJECT_ROOT%\.ivo-runtime\node"
set "NODE_EXE=%IVO_NODE%\node.exe"
set "NPM_CMD=%IVO_NODE%\npm.cmd"
set "NPX_CMD=%IVO_NODE%\npx.cmd"
set "PS1=%PROJECT_ROOT%scripts\ensure-windows-runtime.ps1"

echo ======================================================
echo   IVO Automation - Windows Local Launcher
echo ======================================================
echo.

if not exist "package.json" (
    echo ERROR: package.json not found in:
    echo   %CD%
    goto failed
)

if not exist "%NODE_EXE%" (
    echo Installing portable Node.js into .ivo-runtime\node ...
    if not exist "%PS1%" (
        echo ERROR: Missing scripts\ensure-windows-runtime.ps1
        goto failed
    )
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -ProjectRoot "%PROJECT_ROOT%"
    if errorlevel 1 (
        echo ERROR: Node.js download/install failed. Check internet and write access.
        goto failed
    )
)

if not exist "%NODE_EXE%" (
    echo ERROR: node.exe not found at:
    echo   %NODE_EXE%
    goto failed
)

if not exist "%NPM_CMD%" (
    echo ERROR: npm.cmd not found at:
    echo   %NPM_CMD%
    goto failed
)

if not exist "%NPX_CMD%" (
    echo ERROR: npx.cmd not found at:
    echo   %NPX_CMD%
    goto failed
)

set "PATH=%IVO_NODE%;%PATH%"

if not exist ".env" (
    if exist ".env.example" (
        echo Creating .env from .env.example ...
        copy /y ".env.example" ".env" >nul
        echo IMPORTANT: Edit .env before production use.
    ) else (
        echo WARNING: No .env or .env.example found.
    )
    echo.
)

if not exist "node_modules\" (
    echo Running npm install ...
    call "%NPM_CMD%" install
    if errorlevel 1 goto failed
    echo.
)

echo Installing/verifying Playwright Chromium ...
call "%NPX_CMD%" playwright install chromium
if errorlevel 1 goto failed

echo.
echo Starting server on %HOST%:%PORT%
echo Open in browser: %URL%
echo Close this window or press Ctrl+C to stop.
echo.

start "IVOBrowserWait" /B powershell -NoProfile -ExecutionPolicy Bypass -Command "$u='%URL%'; for ($i=0; $i -lt 120; $i++) { try { $null = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 2; Start-Process $u; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; Write-Host 'Open manually:' $u"

call "%NPM_CMD%" start
if errorlevel 1 goto failed

exit /b 0

:failed
echo.
echo ERROR: Launcher stopped. Read messages above.
echo If Playwright DLL errors appear, run this window as Administrator once:
echo   "%NPX_CMD%" playwright install-deps chromium
echo.
pause
exit /b 1
