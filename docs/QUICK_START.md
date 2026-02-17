# Quick Start Guide

Get your app deployed in 15 minutes!

## Prerequisites

- GitHub account
- Firebase account
- Git installed

## Step-by-Step

### 1. Firebase Setup (5 minutes)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Run setup script
./setup-firebase.sh
```

Or manually:
1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication > Email/Password
3. Create Realtime Database (europe-west1)
4. Deploy rules: `firebase deploy --only database`

### 2. Update Config (2 minutes)

1. Get config from Firebase Console > Project Settings
2. Update `firebase-config.js`:

```javascript
const FIREBASE_CONFIG = {
    apiKey: "YOUR_KEY",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
};

const FIREBASE_PROJECT_ID = 'your-project';
```

### 3. Test Locally (2 minutes)

```bash
# Open in browser
open index.html

# Or use a local server
npx serve .
```

Check console for: `🔥🔥🔥 Firebase Config v4.0 loaded`

### 4. Deploy to GitHub (5 minutes)

```bash
# Create repo on GitHub, then:
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
git push -u origin main
```

### 5. Enable GitHub Pages (1 minute)

1. Go to repo Settings > Pages
2. Source: Deploy from a branch
3. Branch: gh-pages
4. Save

Wait 2-3 minutes, then visit:
```
https://USERNAME.github.io/REPO/
```

## Verify Deployment

✅ Open deployed URL
✅ Check console for Firebase connection
✅ Create test account
✅ Create test event
✅ Check Firebase Console for data

## Common Issues

**CORS errors**: Check `databaseURL` matches your Firebase project

**404 on GitHub Pages**: Wait 5 minutes, clear cache

**Auth fails**: Verify Email/Password is enabled in Firebase Console

**Data not saving**: Check security rules are deployed

## Next Steps

- [ ] Review [Full Deployment Guide](DEPLOYMENT_GUIDE.md)
- [ ] Complete [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring

## Need Help?

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed troubleshooting.
