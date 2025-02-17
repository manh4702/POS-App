@echo off
echo Cleaning old builds...
rmdir /s /q dist
rmdir /s /q frontend\build
rmdir /s /q backend\build

echo Installing dependencies...
call npm install
cd frontend
call npm install
cd ..\backend
call npm install
cd ..

echo Building frontend...
cd frontend
call npm run build
cd ..

echo Copying frontend build to resources...
mkdir backend\build\app
xcopy /E /I frontend\build\* backend\build\app\
xcopy /E /I frontend\public\*.ico backend\build\app\
xcopy /E /I frontend\public\*.png backend\build\app\
xcopy /E /I frontend\public\manifest.json backend\build\app\

echo Building backend...
cd backend
call npm run build
cd ..

echo Creating installer...
call npm run dist

echo Build completed! Check the dist folder for the installer.
pause 