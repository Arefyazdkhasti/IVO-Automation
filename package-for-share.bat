@echo off
chcp 65001 >nul 2>&1
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

if not exist "package.json" (
  echo ❌ package.json در این پوشه نیست. اسکریپت را از ریشهٔ پروژه اجرا کنید.
  pause
  exit /b 1
)

set "INCLUDE_ENV=0"
set "INCLUDE_USERS=1"
set "USE_PASSWORD=1"
set "WITH_NODE=0"

:parse_args
if "%~1"=="" goto args_done

if /i "%~1"=="--with-env" (
    set "INCLUDE_ENV=1"
    shift
    goto parse_args
)

if /i "%~1"=="--with-node" (
    set "WITH_NODE=1"
    shift
    goto parse_args
)

if /i "%~1"=="--no-users" (
    set "INCLUDE_USERS=0"
    shift
    goto parse_args
)

if /i "%~1"=="--no-password" (
    set "USE_PASSWORD=0"
    shift
    goto parse_args
)

if /i "%~1"=="-h" goto show_help
if /i "%~1"=="--help" goto show_help

echo Unknown option: %~1
goto show_help

:show_help
echo Usage: package-for-share.bat [options]
echo   --with-env      شامل .env ^(فقط گیرندهٔ مورد اعتماد^)
echo   --with-node     Node.js portable ویندوز داخل zip ^(آفلاین^)
echo   --no-users      بدون users.json
echo   --no-password   zip بدون رمز
exit /b 0

:args_done

for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"`) do set "STAMP=%%T"
set "BASENAME=ivo-automation-share-%STAMP%"
set "STAGING=%TEMP%\%BASENAME%"
set "DEST=%STAGING%\%BASENAME%"
set "OUT_ZIP=%~dp0%BASENAME%.zip"

if exist "%STAGING%" rmdir /s /q "%STAGING%"
mkdir "%DEST%"

echo 📦 کپی فایل‌ها ^(بدون node_modules و .git^)…

robocopy "%~dp0" "%DEST%" /E /NFL /NDL /NJH /NJS /NC /NS /NP ^
  /XD node_modules .ivo-runtime .git .vscode .idea test-results playwright-report blob-report playwright\.cache data screenshots ^
  /XF .env .env.local *.zip .DS_Store Thumbs.db captcha_*.png temp_*.png ^
  >nul

if errorlevel 8 (
  echo ❌ robocopy با خطا متوقف شد.
  pause
  exit /b 1
)

if "%INCLUDE_ENV%"=="1" (
  if exist ".env" (
    copy /y ".env" "%DEST%\.env" >nul
    echo    ✓ .env اضافه شد
  ) else (
    echo    ⚠️  --with-env ولی .env وجود ندارد.
  )
) else (
  echo    ○ .env خارج شد — گیرنده از .env.example استفاده می‌کند.
)

if "%INCLUDE_USERS%"=="0" (
  if exist "%DEST%\users.json" del /f /q "%DEST%\users.json"
  echo    ○ users.json حذف شد
) else if exist "%DEST%\users.json" (
  echo    ✓ users.json داخل zip ^(رمز ورود — فقط مورد اعتماد^)
)

if "%WITH_NODE%"=="1" (
  echo    ⬇️  نصب Node.js portable داخل بسته ^(برای ویندوز خام^)…
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-windows-runtime.ps1" -ProjectRoot "%DEST%"
  if errorlevel 1 (
    echo ❌ دانلود Node برای zip ناموفق بود.
    goto cleanup_fail
  )
) else (
  echo    ○ بدون Node در zip — start.bat اولین بار خودش دانلود می‌کند
)

if exist "%OUT_ZIP%" del /f /q "%OUT_ZIP%"

echo.
echo 🗜  ساخت %BASENAME%.zip …

set "ZIP7="
if exist "C:\Program Files\7-Zip\7z.exe" set "ZIP7=C:\Program Files\7-Zip\7z.exe"
if exist "C:\Program Files (x86)\7-Zip\7z.exe" set "ZIP7=C:\Program Files (x86)\7-Zip\7z.exe"

if defined ZIP7 (
  pushd "%STAGING%"
  if "%USE_PASSWORD%"=="1" (
    echo    7-Zip رمز zip را می‌پرسد ^(Enter = بدون رمز^)
    "%ZIP7%" a -tzip -p "%OUT_ZIP%" "%BASENAME%"
  ) else (
    "%ZIP7%" a -tzip "%OUT_ZIP%" "%BASENAME%"
  )
  set "ZIP_ERR=!ERRORLEVEL!"
  popd
  if not "!ZIP_ERR!"=="0" (
    echo ❌ 7-Zip خطا داد.
    goto cleanup_fail
  )
) else (
  if "%USE_PASSWORD%"=="1" (
    echo ⚠️  7-Zip نصب نیست — zip بدون رمز ساخته می‌شود.
    echo    برای رمز: https://www.7-zip.org یا دوباره با --no-password و Keka/WinRAR.
  )
  powershell -NoProfile -Command ^
    "Compress-Archive -Path '%STAGING%\%BASENAME%' -DestinationPath '%OUT_ZIP%' -Force"
  if errorlevel 1 goto cleanup_fail
)

for %%A in ("%OUT_ZIP%") do set "ZIPSIZE=%%~zA"

echo.
echo ======================================================
echo ✅ آماده است:
echo    %OUT_ZIP%
echo    حجم تقریبی: !ZIPSIZE! bytes
echo.
echo گیرنده ویندوز خام: Extract → start.bat ^(بدون نصب Node^)
echo ======================================================

rmdir /s /q "%STAGING%" 2>nul
pause
exit /b 0

:cleanup_fail
rmdir /s /q "%STAGING%" 2>nul
pause
exit /b 1
