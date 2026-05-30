#!/bin/bash

# PickleVision Deployment Script
# Push changes to GitHub and trigger Vercel deployment

echo "========================================"
echo "PickleVision Deployment"
echo "========================================"
echo ""

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed"
    exit 1
fi

echo "Pushing commits to GitHub..."
echo ""

git push origin main

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Failed to push to GitHub"
    echo "Please ensure:"
    echo "- You are logged in to GitHub (git config user.email, git config user.name)"
    echo "- You have permission to push to msincmgs79/picklevision-pro"
    echo "- Your internet connection is working"
    exit 1
fi

echo ""
echo "========================================"
echo "SUCCESS: Changes pushed to GitHub!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com/picklevision/picklevision-clean"
echo "2. Watch the automatic build and deployment"
echo "3. Test at https://picklevision-clean.vercel.app"
echo ""
echo "Your commits:"
git log --oneline -2
echo ""
