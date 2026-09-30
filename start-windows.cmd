@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo Installing Deluge Deck dependencies...
  call npm ci
  if errorlevel 1 exit /b 1
)
if not exist dist (
  echo Building Deluge Deck...
  call npm run build
  if errorlevel 1 exit /b 1
)
echo.
echo Deluge Deck is starting at http://127.0.0.1:8118
echo Close this window to stop it.
call npm start
