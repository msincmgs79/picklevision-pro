@echo off
REM Script to push the TypeScript fix to GitHub

echo Pushing TypeScript fix to GitHub...
echo.

REM Navigate to the script directory
cd /d "%~dp0"

REM Check if git is available
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: git is not installed or not in PATH
    pause
    exit /b 1
)

REM Configure git (if not already configured)
for /f "delims=" %%i in ('git config user.email') do set GIT_EMAIL=%%i
if "!GIT_EMAIL!"=="" (
    echo Configuring git user...
    git config user.email "mgsinclair1979@gmail.com"
    git config user.name "Martin Sinclair"
)

REM Check git status
echo Current git status:
git status
echo.

REM Add the specific file
echo Adding src/lib/db.ts...
git add src/lib/db.ts

REM Commit the changes
echo Committing changes...
git commit -m "Fix TypeScript error: use inline type for getUserVideos return type"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Commit successful! Pushing to GitHub...
    git push origin main

    if %ERRORLEVEL% EQU 0 (
        echo.
        echo [OK] Changes pushed successfully!
        pause
    ) else (
        echo.
        echo [ERROR] Error pushing to GitHub. Please check your authentication.
        pause
        exit /b 1
    )
) else (
    echo.
    echo No changes to commit or commit failed.
    pause
    exit /b 1
)
