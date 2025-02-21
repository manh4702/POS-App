@echo off
echo Cleaning old builds...
taskkill /F /IM electron.exe 2>nul
rmdir /s /q dist
rmdir /s /q frontend\build
rmdir /s /q backend\build

echo Installing dependencies...
call npm install
cd backend
call npm install
cd ..\frontend
call npm install
cd ..

echo Building frontend...
cd frontend
call npm run build
cd ..

echo Building backend...
cd backend
call npm run build
cd ..

echo Copying frontend build to resources...
mkdir backend\build\app
xcopy /E /I frontend\build\* backend\build\app\

echo Creating installer...
timeout /t 5
call npx electron-builder --config electron-builder.config.js

echo Build completed! Check the dist folder for the installer.
pause 