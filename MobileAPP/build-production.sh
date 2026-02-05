#!/bin/bash

# Production Build Script for Narain Group HRM

echo "🚀 Starting production build process..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
fi

# Login to EAS (if not already logged in)
echo "🔐 Checking EAS authentication..."
eas whoami || eas login

# Build preview APK for testing
echo "📱 Building preview APK..."
eas build -p android --profile preview --non-interactive

# Build production AAB for Play Store
echo "🏪 Building production AAB for Play Store..."
eas build -p android --profile production --non-interactive

echo "✅ Build process completed!"
echo "📋 Next steps:"
echo "   1. Download APK from EAS dashboard for testing"
echo "   2. Test on physical devices"
echo "   3. Submit AAB to Google Play Store when ready"