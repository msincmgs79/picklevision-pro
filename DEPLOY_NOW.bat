@echo off
REM PickleVision Deployment Script
REM Push changes to GitHub and trigger Vercel deployment

echo ========================================
echo PickleVision Deployment
echo ========================================
echo.

REM Check if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH
    pause
    exit /b 1
)

echo Pushing commits to GitHub...
echo.

git push origin main

if errorlevel 1 (
    echo.
    echo ERROR: Failed to push to GitHub
    echo Please ensure:
    echo - You are logged in to GitHub (git config user.email, git config user.name)
    echo - You have permission to push to msincmgs79/picklevision-pro
    echo - Your internet connection is working
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS: Changes pushed to GitHub!
echo ========================================
echo.
echo Next steps:
echo 1. Go to https://vercel.com/picklevision/picklevision-clean
echo 2. Watch the automatic build and deployment
echo 3. Test at https://picklevision-clean.vercel.app
echo.
echo Your commits:
git log --oneline -2
echo.
pause
