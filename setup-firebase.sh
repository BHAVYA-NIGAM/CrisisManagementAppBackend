#!/bin/bash

# Firebase Service Account Setup Script
# This script helps you set up Firebase credentials for the backend

echo "🔥 Firebase Service Account Setup"
echo "=================================="
echo ""

# Check if firebase-service-account.json exists
if [ -f "firebase-service-account.json" ]; then
    echo "✅ Found firebase-service-account.json"
    echo ""
    echo "Testing if it's valid JSON..."
    if jq empty firebase-service-account.json 2>/dev/null; then
        echo "✅ Valid JSON file"
        echo ""
        echo "📝 Your Firebase is configured using the file!"
        echo "   No need to set environment variables."
        echo ""
        echo "🚀 Start the server with: npm start"
    else
        echo "❌ Invalid JSON in firebase-service-account.json"
        echo "   Please download a new service account file from Firebase Console"
    fi
else
    echo "⚠️  firebase-service-account.json not found"
    echo ""
    echo "📥 To set up Firebase:"
    echo ""
    echo "1. Go to: https://console.firebase.google.com"
    echo "2. Select your project"
    echo "3. Click ⚙️ (Settings) → Project Settings"
    echo "4. Go to 'Service Accounts' tab"
    echo "5. Click 'Generate New Private Key'"
    echo "6. Download the JSON file"
    echo "7. Rename it to: firebase-service-account.json"
    echo "8. Move it to this directory (server/)"
    echo ""
    echo "Or use environment variable:"
    echo "  FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccountKey.json"
    echo ""
fi

echo ""
echo "📖 For detailed instructions, see:"
echo "   ../FIREBASE_SETUP.md"
