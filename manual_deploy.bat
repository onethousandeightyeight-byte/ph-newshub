@echo off
echo Starting robust manual deployment...
cd /d "c:\Users\My PC\Documents\PH News Hub"

echo Checking for lock files...
if exist .git\index.lock del .git\index.lock

echo Adding all changes...
git add -A

echo Checking status...
git status

echo Committing...
git commit -m "fix(scraper): urgent headers fix for WAF bypass"

echo Pushing final-fix...
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
echo DONE. Please check if the commit message appeared above.
pause
