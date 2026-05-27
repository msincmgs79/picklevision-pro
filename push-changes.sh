#!/bin/bash

# Script to push the TypeScript fix to GitHub

echo "Pushing TypeScript fix to GitHub..."
echo ""

# Navigate to the repo directory
cd "$(dirname "$0")" || exit 1

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed or not in PATH"
    exit 1
fi

# Configure git (if not already configured)
if [ -z "$(git config user.email)" ]; then
    echo "Configuring git user..."
    git config user.email "mgsinclair1979@gmail.com"
    git config user.name "Martin Sinclair"
fi

# Check git status
echo "Current git status:"
git status
echo ""

# Add the specific file
echo "Adding src/lib/db.ts..."
git add src/lib/db.ts

# Commit the changes
echo "Committing changes..."
git commit -m "Fix TypeScript error: use inline type for getUserVideos return type"

# Check if commit was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "Commit successful! Pushing to GitHub..."
    git push origin main

    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Changes pushed successfully!"
    else
        echo ""
        echo "✗ Error pushing to GitHub. Please check your authentication."
        exit 1
    fi
else
    echo ""
    echo "No changes to commit or commit failed."
    exit 1
fi
