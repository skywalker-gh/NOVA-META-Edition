@echo off
echo ========================================
echo NOVA // Yggdrasil - META Edition
echo Auto Setup - Version 1.0
echo Gee (Guerkan) - Audiotech Founder
echo ========================================
echo.

echo [1/5] Checking folder...
if not exist "context" (
  echo ERROR: context folder not found! Are you in the right folder?
  pause
  exit /b
)
echo OK - In NOVA Root

echo.
echo [2/5] Git init...
if not exist ".git" (
  git init
  git branch -M main
  echo Git initialized
) else (
  echo Git already exists - skipping init
)

echo.
echo [3/5] Checking .env...
if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env"
    echo .env created from .env.example - PLEASE ADD YOUR META_API_KEY!
  )
) else (
  echo .env already exists
)

echo.
echo [4/5] Git add and commit...
git add .
git status
echo.
set /p commitmsg="Commit message (Enter for default 'genesis: NOVA META Edition V1.0'): "
if "%commitmsg%"=="" set commitmsg=genesis: NOVA META Edition V1.0
git commit -m "%commitmsg%"

echo.
echo [5/5] Installing Muse Connector...
if exist "agents\muse-spark-orchestrator\package.json" (
  cd agents\muse-spark-orchestrator
  call npm install
  cd ..\..
) else (
  echo No muse connector found, skipping npm install
)

echo.
echo ========================================
echo DONE! NOVA META Edition ready.
echo.
echo Next steps:
echo 1. Edit .env and add META_API_KEY from dev.meta.ai
echo 2. Run: gemini
echo 3. In Gemini: /mcp  - should show all connectors ACTIVE
echo 4. For Tommy: open online-dashboard\tommy\index.html in browser
echo ========================================
pause
