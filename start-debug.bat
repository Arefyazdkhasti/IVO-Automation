@echo off
rem Keeps window open and writes a log if start.bat fails silently on double-click
cd /d "%~dp0"
set "LOG=%~dp0startup-last.log"
echo === %DATE% %TIME% === > "%LOG%"
echo Running start.bat ... Log: %LOG%
echo.
call "%~dp0start.bat" >> "%LOG%" 2>&1
set "EC=%ERRORLEVEL%"
echo. >> "%LOG%"
echo Exit code: %EC% >> "%LOG%"
type "%LOG%"
echo.
echo Full log saved: %LOG%
pause
exit /b %EC%
