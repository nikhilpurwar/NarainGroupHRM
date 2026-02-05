@echo off
echo 🚀 Starting production build process...

REM Check if EAS CLI is installed
where eas >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ EAS CLI not found. Installing...
    npm install -g @expo/eas-cli
)

REM Login to EAS (if not already logged in)
echo 🔐 Checking EAS authentication...
eas whoami || eas login

REM Build preview APK for testing
echo 📱 Building preview APK...
eas build -p android --profile preview --non-interactive

REM Build production AAB for Play Store
echo 🏪 Building production AAB for Play Store...
eas build -p android --profile production --non-interactive

echo ✅ Build process completed!
echo 📋 Next steps:
echo    1. Download APK from EAS dashboard for testing
echo    2. Test on physical devices
echo    3. Submit AAB to Google Play Store when ready

pause