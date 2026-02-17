# Quick GitHub Push Script for Securiclaw (PowerShell)
# Replace YOUR_USERNAME with your actual GitHub username below

$GITHUB_USERNAME = "YOUR_USERNAME"

Write-Host "🚀 Pushing Securiclaw to GitHub..." -ForegroundColor Green
Write-Host "Repository: https://github.com/$GITHUB_USERNAME/Securiclaw" -ForegroundColor Cyan
Write-Host ""

# Add remote
git remote add origin "https://github.com/$GITHUB_USERNAME/Securiclaw.git"

# Rename branch to main
git branch -M main

# Push
git push -u origin main

Write-Host ""
Write-Host "✅ Done! View your repo at:" -ForegroundColor Green
Write-Host "https://github.com/$GITHUB_USERNAME/Securiclaw" -ForegroundColor Cyan
