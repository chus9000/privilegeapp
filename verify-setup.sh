#!/bin/bash

# Pre-Deployment Verification Script
# Checks if your Firebase configuration is ready for deployment

echo "🔍 Verifying Firebase Setup..."
echo "================================"
echo ""

ERRORS=0
WARNINGS=0

# Check if firebase-config.js exists
if [ ! -f "firebase-config.js" ]; then
    echo "❌ firebase-config.js not found!"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ firebase-config.js exists"
    
    # Check for placeholder values
    if grep -q "YOUR_ACTUAL_API_KEY\|your_api_key_here\|YOUR_PROJECT_ID\|your-project-id" firebase-config.js; then
        echo "⚠️  WARNING: firebase-config.js contains placeholder values"
        echo "   Please update with your actual Firebase credentials"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "✅ Firebase config appears to be updated"
    fi
    
    # Check for project ID
    if grep -q "privilegespectrum" firebase-config.js; then
        PROJECT_ID=$(grep -o "projectId: \"[^\"]*\"" firebase-config.js | cut -d'"' -f2)
        echo "✅ Project ID found: $PROJECT_ID"
    fi
fi

echo ""

# Check if firebase-security-rules.json exists
if [ ! -f "firebase-security-rules.json" ]; then
    echo "❌ firebase-security-rules.json not found!"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ firebase-security-rules.json exists"
    
    # Check for index configuration
    if grep -q '".indexOn".*"creatorId"' firebase-security-rules.json; then
        echo "✅ Database index for creatorId is configured"
    else
        echo "⚠️  WARNING: Database index for creatorId not found"
        echo "   The event creation quota feature requires an index on creatorId"
        echo "   Add '.indexOn': ['creatorId'] under the events node"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

echo ""

# Check if .github/workflows/deploy.yml exists
if [ ! -f ".github/workflows/deploy.yml" ]; then
    echo "❌ GitHub Actions workflow not found!"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ GitHub Actions workflow configured"
fi

echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "⚠️  WARNING: Git repository not initialized"
    echo "   Run: git init"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ Git repository initialized"
    
    # Check if remote is set
    if ! git remote -v | grep -q "origin"; then
        echo "⚠️  WARNING: Git remote 'origin' not set"
        echo "   Run: git remote add origin https://github.com/USERNAME/REPO.git"
        WARNINGS=$((WARNINGS + 1))
    else
        REMOTE=$(git remote get-url origin)
        echo "✅ Git remote configured: $REMOTE"
    fi
fi

echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "⚠️  WARNING: Firebase CLI not installed"
    echo "   Run: npm install -g firebase-tools"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ Firebase CLI installed"
fi

echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  WARNING: Dependencies not installed"
    echo "   Run: npm install"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ Dependencies installed"
fi

echo ""
echo "================================"
echo "Summary:"
echo "  Errors: $ERRORS"
echo "  Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo "❌ Please fix errors before deploying"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Please review warnings"
    echo ""
    echo "Next steps:"
    echo "  1. Update firebase-config.js with your Firebase credentials"
    echo "  2. Run: firebase deploy --only database"
    echo "  3. Test locally: open index.html"
    echo "  4. Push to GitHub: git push origin main"
    exit 0
else
    echo "✅ All checks passed!"
    echo ""
    echo "Ready to deploy! Next steps:"
    echo "  1. Test locally: open index.html"
    echo "  2. Commit changes: git add . && git commit -m 'Ready for deployment'"
    echo "  3. Push to GitHub: git push origin main"
    echo "  4. Enable GitHub Pages in repository settings"
    exit 0
fi
