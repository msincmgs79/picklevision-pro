#!/bin/bash

# Gemini Files API Implementation - Push to GitHub
# Date: June 7, 2026
# Purpose: Deploy fixed video analysis with proper file processing

echo "=========================================="
echo "PickleVision Pro - Gemini Files API Deploy"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ ERROR: Not in project root directory"
  echo "   Please run this script from: C:\Users\marti\picklevision-pro"
  exit 1
fi

echo "✅ Project directory verified"
echo ""

# Step 1: Check git status
echo "Step 1: Checking git status..."
git status --short
echo ""

# Step 2: Add all changes
echo "Step 2: Adding all changes..."
git add -A
echo "✅ Changes staged"
echo ""

# Step 3: Show what will be committed
echo "Step 3: Files to be committed:"
git diff --cached --name-only
echo ""

# Step 4: Commit with clear message
echo "Step 4: Creating commit..."
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
- Videos returning all zeros → now returns real metrics
- Root cause: File processing was async, code analyzed immediately
- Solution: Wait for file.state === 'ACTIVE' before analysis

VERIFIED:
- All API endpoints against Google documentation
- All header names (X-Goog-Upload-*)
- All field names (snake_case)
- All response structures (.file.name, .file.uri, .file.state)
- Error handling and timeouts
- Full logging at every step"

if [ $? -eq 0 ]; then
  echo "✅ Commit created successfully"
else
  echo "❌ Commit failed"
  exit 1
fi
echo ""

# Step 5: Show commit
echo "Step 5: Commit details:"
git log --oneline -1
echo ""

# Step 6: Push to GitHub
echo "Step 6: Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
  echo "✅ Push successful!"
  echo ""
  echo "=========================================="
  echo "✅ DEPLOYMENT COMPLETE"
  echo "=========================================="
  echo ""
  echo "What happens next:"
  echo "1. GitHub receives the push"
  echo "2. Vercel sees the new commit"
  echo "3. Vercel builds and deploys automatically"
  echo "4. New code goes live in ~2-5 minutes"
  echo ""
  echo "How to verify:"
  echo "1. Go to https://picklevision.vercel.app"
  echo "2. Upload a pickleball video"
  echo "3. Check Analytics page"
  echo "4. Should see real metrics (not zeros)"
  echo "5. Check browser console for detailed logs"
  echo ""
  echo "Expected logs:"
  echo "[FILES_API] Initiating upload..."
  echo "[FILES_API] Uploading file bytes..."
  echo "[FILES_API] Waiting for file to finish processing..."
  echo "[FILES_API] File state: PROCESSING"
  echo "[FILES_API] File state: ACTIVE"
  echo "[FILES_API] Analyzing with Gemini..."
  echo "[ROUTE] Raw analysis text: {kitchenTransition:...}"
  echo "[ROUTE] Parsed metrics: {success:true, ...}"
else
  echo "❌ Push failed"
  echo ""
  echo "Possible issues:"
  echo "- No internet connection"
  echo "- GitHub authentication issue"
  echo "- Branch name mismatch (using 'main')"
  echo ""
  echo "Try manually:"
  echo "  git push origin main --force-with-lease"
  exit 1
fi
