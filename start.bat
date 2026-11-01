@echo off
echo [NOVA] Starte Worker + Tommy Portal - Türkisches Militär Disiplin
echo.

if not exist .env (
  echo .env fehlt! Kopiere .env.example nach .env
  copy .env.example .env
  echo Dann .env bearbeiten mit META_API_KEY + GITHUB_PAT
  pause
  exit /b
)

echo [1/2] Starte Muse Spark Bridge (Internet für Meta AI)...
start cmd /k "node muse-spark-bridge.js"

echo [2/2] Starte Dashboard...
timeout /t 2
start cmd /k "npm run dev"

echo.
echo Beide Fenster offen lassen!
echo - Bridge Fenster = Internet für Meta AI
echo - Dev Fenster = Tommy Portal auf http://127.0.0.1:8000
pause
