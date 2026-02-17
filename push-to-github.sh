#!/bin/bash

# Quick GitHub Push Script for Securiclaw
# Replace YOUR_USERNAME with your actual GitHub username below

GITHUB_USERNAME="YOUR_USERNAME"

echo "🚀 Pushing Securiclaw to GitHub..."
echo "Repository: https://github.com/$GITHUB_USERNAME/Securiclaw"
echo ""

# Add remote
git remote add origin https://github.com/$GITHUB_USERNAME/Securiclaw.git

# Rename branch to main
git branch -M main

# Push
git push -u origin main

echo ""
echo "✅ Done! View your repo at:"
echo "https://github.com/$GITHUB_USERNAME/Securiclaw"
