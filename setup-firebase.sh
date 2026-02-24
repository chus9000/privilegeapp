#!/bin/bash

# Firebase Setup Script for Privilege Spectrum App
# This script helps automate Firebase CLI setup and deployment

set -e  # Exit on error

echo "🔥 Firebase Setup Script for Privilege Spectrum App"
echo "=================================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
    echo "✅ Firebase CLI installed successfully!"
else
    echo "✅ Firebase CLI is already installed"
fi

echo ""
echo "🔐 Logging into Firebase..."
firebase login

echo ""
echo "🎯 Initializing Firebase project..."
echo "   Please select the following options:"
echo "   - Realtime Database"
echo "   - Use an existing project"
echo "   - Select your project"
echo "   - Database rules file: firebase-security-rules.json"
echo ""

firebase init database

echo ""
echo "📤 Deploying security rules to Firebase..."
firebase deploy --only database

echo ""
echo "✅ Firebase setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Copy your Firebase config from Firebase Console"
echo "   2. Update firebase-config.js with your actual values"
echo "   3. Test locally by opening index.html in a browser"
echo "   4. Push to GitHub to trigger deployment"
echo ""
echo "📖 For detailed instructions, see docs/DEPLOYMENT_GUIDE.md"
