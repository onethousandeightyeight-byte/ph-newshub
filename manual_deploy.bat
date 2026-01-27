@echo off
echo Starting manual deployment...
cd /d "c:\Users\My PC\Documents\PH News Hub"

echo Adding changes...
git add .

echo Committing...
git commit -m "fix(scraper): implement user-agent rotation and postinstall script"

echo Pushing final-fix branch...
git push origin final-fix

echo Switching to main...
git checkout main

echo Merging final-fix...
git merge final-fix

echo Pushing main (Triggers Deployment)...
git push origin main

echo Switching back to final-fix...
git checkout final-fix

echo.
echo Deployment commands finished. Please check your Vercel and Render dashboards.
pause
