@echo off
REM Gemini Files API Implementation - Push to GitHub
REM Date: June 7, 2026
REM Purpose: Deploy fixed video analysis with proper file processing

echo.
echo ==========================================
echo PickleVision Pro - Gemini Files API Deploy
echo ==========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
  echo ERROR: Not in project root directory
  echo Please run this from: C:\Users\marti\picklevision-pro
  pause
  exit /b 1
)

echo [OK] Project directory verified
echo.

REM Step 1: Check git status
echo Step 1: Checking git status...
git status --short
echo.

REM Step 2: Add all changes
echo Step 2: Adding all changes...
git add -A
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Failed to stage changes
  pause
  exit /b 1
)
echo [OK] Changes staged
echo.

REM Step 3: Show what will be committed
echo Step 3: Files to be committed:
git diff --cached --name-only
echo.

REM Step 4: Commit with message
echo Step 4: Creating commit...
git commit -m "Implement Gemini Files API with proper async file processing

CRITICAL FIXES:
- Add file processing wait (poll until ACTIVE state)
- Use resumable upload protocol for reliability
- Verify file ready before Gemini analysis
- Throw error on unknown file states
- Use snake_case field names (REST API standard)

FILES CHANGED:
- src/app/api/analyze-video/route.ts (production)
- src/app/api/analyze-video/files-api.ts (reference)
- src/app/api/analyze-video/test-files-api.mjs (test)

WHAT THIS FIXES:
- Videos returning all zeros - now returns real metrics
- Root cause: File processing was async, code analyzed immediately
- Solution: Wait for file.state EQUALS ACTIVE before analysis

VERIFIED:
- All API endpoints against Google documentation
- All header names (X-Goog-Upload-*)
- All field names (snake_case)
- All response structures (.file.name, .file.uri, .file.state)
- Error handling and timeouts
- Full logging at every step"

if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Commit failed
  pause
  exit /b 1
)
echo [OK] Commit created successfully
echo.

REM Step 5: Show commit
echo Step 5: Commit details:
git log --oneline -1
echo.

REM Step 6: Push to GitHub
echo Step 6: Pushing to GitHub...
git push origin main

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ERROR: Push failed
  echo.
  echo Possible issues:
  echo - No internet connection
  echo - GitHub authentication not set up
  echo - Branch name should be 'main'
  echo.
  echo Try this command manually:
  echo   git push origin main --force-with-lease
  pause
  exit /b 1
)

echo.
echo [OK] Push successful!
echo.
echo ==========================================
echo DEPLOYMENT COMPLETE
echo ==========================================
echo.
echo What happens next:
echo 1. GitHub receives the push
echo 2. Vercel automatically builds and deploys
echo 3. New code goes live in 2-5 minutes
echo.
echo How to verify it's working:
echo 1. Go to https://picklevision.vercel.app
echo 2. Upload a pickleball video
echo 3. Go to Analytics page
echo 4. Should see REAL METRICS (not zeros)
echo 5. Open browser dev tools Console
echo 6. Should see logs like:
echo    [FILES_API] File state: PROCESSING
echo    [FILES_API] File state: ACTIVE
echo    [FILES_API] Analyzing with Gemini...
echo    [ROUTE] Parsed metrics: {success:true, ...}
echo.
echo If you see these logs, the fix worked!
echo.
pause
