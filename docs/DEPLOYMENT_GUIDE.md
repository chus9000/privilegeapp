# Deployment Guide: Firebase + GitHub Pages

This guide walks you through setting up Firebase and deploying your Privilege Spectrum app to GitHub Pages.

## Prerequisites

- GitHub account
- Firebase account (free tier is sufficient)
- Git installed locally
- Node.js installed (for Firebase CLI)

---

## Part 1: Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `privilegespectrum` (or your preferred name)
4. Disable Google Analytics (optional for this project)
5. Click "Create project"

### Step 2: Enable Firebase Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

### Step 3: Create Realtime Database

1. In Firebase Console, go to **Build > Realtime Database**
2. Click "Create Database"
3. Choose database location: **europe-west1** (or your preferred region)
4. Start in **locked mode** (we'll set rules next)
5. Click "Enable"

### Step 4: Deploy Security Rules

You have two options to deploy security rules:

#### Option A: Using Firebase Console (Easier)

1. In Realtime Database, click on the "Rules" tab
2. Copy the contents from `firebase-security-rules.json` in your project
3. Paste into the rules editor
4. Click "Publish"

**Important**: The security rules include an index configuration for the `creatorId` field. This index is automatically deployed when you publish the rules and is required for the event creation quota feature to perform efficiently.

#### Option B: Using Firebase CLI (Recommended)

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init

# Select:
# - Realtime Database
# - Use existing project: privilegespectrum
# - Database rules file: firebase-security-rules.json

# Deploy rules (this also deploys the index configuration)
firebase deploy --only database
```

**Note**: The `firebase-security-rules.json` file includes an `.indexOn` directive for the `creatorId` field under the `events` node. This index is essential for the event creation quota enforcement feature to work efficiently. When you deploy the rules, Firebase automatically creates this index.

### Step 4.1: Verify Index Configuration

After deploying the security rules, verify that the index is active:

1. In Firebase Console, go to **Realtime Database**
2. Click on the **Rules** tab
3. Look for the `.indexOn` directive under the `events` node:
   ```json
   "events": {
     ".read": "auth != null",
     ".indexOn": ["creatorId"],
     ...
   }
   ```
4. If you see a warning about missing indexes in the Firebase Console logs, the index may not have been deployed correctly
5. You can also check the **Usage** tab to see if queries are using indexes efficiently

**Performance Note**: Without this index, queries that count events by `creatorId` would be slow and could fail for large datasets. The index ensures O(log n) query performance.

### Step 5: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the **Web** icon (`</>`) to add a web app
4. Register app with nickname: "Privilege Spectrum Web"
5. Copy the Firebase configuration object

### Step 6: Update Firebase Config in Code

Open `firebase-config.js` and replace the placeholder values:

```javascript
const FIREBASE_CONFIG = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

Also update these constants:
```javascript
const FIREBASE_PROJECT_ID = 'your-project-id';
const FIREBASE_RTDB_URL = `https://${FIREBASE_PROJECT_ID}-default-rtdb.europe-west1.firebasedatabase.app/`;
```

---

## Part 2: GitHub Repository Setup

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Repository name: `privilege-spectrum-app` (or your preferred name)
4. Choose **Public** (required for free GitHub Pages)
5. Don't initialize with README (you already have one)
6. Click "Create repository"

### Step 2: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit with Firebase integration"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/privilege-spectrum-app.git

# Push to main branch
git branch -M main
git push -u origin main
```

---

## Part 3: GitHub Pages Deployment

### Step 1: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. In left sidebar, click **Pages**
4. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** (will be created by workflow)
   - Folder: **/ (root)**
5. Click **Save**

### Step 2: Verify Deployment Workflow

The repository already has `.github/workflows/deploy.yml` configured. This workflow:
- Triggers on every push to `main` branch
- Deploys your app to GitHub Pages automatically

### Step 3: Trigger First Deployment

```bash
# Make a small change (or just push again)
git commit --allow-empty -m "Trigger GitHub Pages deployment"
git push origin main
```

### Step 4: Monitor Deployment

1. Go to your repository on GitHub
2. Click **Actions** tab
3. You should see "Deploy to GitHub Pages" workflow running
4. Wait for it to complete (green checkmark)

### Step 5: Access Your App

Your app will be available at:
```
https://YOUR_USERNAME.github.io/privilege-spectrum-app/
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Part 4: Environment Variables (Optional but Recommended)

For better security, you can use GitHub Secrets for Firebase config:

### Step 1: Add GitHub Secrets

1. Go to repository **Settings > Secrets and variables > Actions**
2. Click "New repository secret"
3. Add each Firebase config value as a secret:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_DATABASE_URL`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

### Step 2: Update Deployment Workflow

Modify `.github/workflows/deploy.yml` to inject secrets during build (requires build step).

---

## Part 5: Testing Your Deployment

### Test Firebase Connection

1. Open your deployed app
2. Open browser DevTools (F12) > Console
3. Look for: `🔥🔥🔥 Firebase Config v4.0 loaded`
4. Try creating an account (should work with Firebase Auth)

### Test Database Operations

1. Create an event
2. Check Firebase Console > Realtime Database
3. You should see data under `/events/`

### Test Authentication

1. Sign up with email/password
2. Check Firebase Console > Authentication
3. You should see the new user

---

## Part 6: Custom Domain (Optional)

### Step 1: Add CNAME File

Create a file named `CNAME` in your repository root:
```
yourdomain.com
```

### Step 2: Configure DNS

Add these DNS records with your domain provider:

For apex domain (yourdomain.com):
```
A     185.199.108.153
A     185.199.109.153
A     185.199.110.153
A     185.199.111.153
```

For www subdomain:
```
CNAME www.yourdomain.com YOUR_USERNAME.github.io
```

### Step 3: Enable HTTPS

1. Go to repository Settings > Pages
2. Check "Enforce HTTPS"
3. Wait for certificate provisioning (can take up to 24 hours)

---

## Troubleshooting

### Firebase Connection Issues

**Problem**: Console shows CORS errors

**Solution**: 
- Verify `databaseURL` in `firebase-config.js` matches your Firebase project
- Check that Realtime Database is enabled (not Firestore)
- Ensure security rules are deployed

**Problem**: Authentication fails

**Solution**:
- Verify Email/Password auth is enabled in Firebase Console
- Check `authDomain` in config matches your project
- Clear browser cache and try again

### GitHub Pages Issues

**Problem**: 404 error on deployed site

**Solution**:
- Wait 5-10 minutes after first deployment
- Check Actions tab for deployment errors
- Verify gh-pages branch was created
- Check Pages settings show correct branch

**Problem**: Changes not reflecting

**Solution**:
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check Actions tab to confirm deployment completed
- Wait a few minutes for CDN to update

### Security Rules Issues

**Problem**: Permission denied errors

**Solution**:
- Check Firebase Console > Realtime Database > Rules
- Verify rules match `firebase-security-rules.json`
- For testing, temporarily set rules to:
  ```json
  {
    "rules": {
      ".read": true,
      ".write": true
    }
  }
  ```
  (Remember to restore proper rules after testing!)

---

## Maintenance

### Updating Firebase Rules

```bash
# After modifying firebase-security-rules.json
firebase deploy --only database
```

### Updating Deployed App

```bash
# Make your changes
git add .
git commit -m "Your update message"
git push origin main

# GitHub Actions will automatically deploy
```

### Monitoring Usage

1. Firebase Console > Usage and billing
2. Check Realtime Database usage
3. Check Authentication usage
4. Free tier limits:
   - Realtime Database: 1GB storage, 10GB/month download
   - Authentication: Unlimited users

---

## Security Best Practices

1. **Never commit real Firebase credentials** to public repositories
2. **Use environment variables** for sensitive data
3. **Review security rules** regularly
4. **Enable Firebase App Check** for production (prevents abuse)
5. **Set up Firebase budget alerts** to avoid unexpected charges
6. **Use authentication** for write operations when possible
7. **Validate all user input** in security rules

---

## Next Steps

- [ ] Set up Firebase App Check for additional security
- [ ] Configure Firebase Analytics (optional)
- [ ] Set up custom domain
- [ ] Add monitoring and error tracking
- [ ] Configure backup strategy for Realtime Database
- [ ] Set up staging environment

---

## Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Firebase Realtime Database Rules](https://firebase.google.com/docs/database/security)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
