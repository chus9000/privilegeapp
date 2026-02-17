# Firebase Configuration Guide for GitHub Pages CORS Issues

## The Problem
Firebase Firestore REST API blocks requests from GitHub Pages due to CORS (Cross-Origin Resource Sharing) policies and security rules.

## Solutions to Try

### 1. Firebase Security Rules (Most Important)

Go to Firebase Console → Firestore Database → Rules and update your security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read/write access to events and participants
    match /events/{eventId} {
      allow read, write: if true;
    }
    
    match /participants/{participantId} {
      allow read, write: if true;
    }
    
    // More restrictive alternative (recommended for production)
    match /events/{eventId} {
      allow read: if true;
      allow write: if true; // You can add conditions here later
    }
    
    match /participants/{participantId} {
      allow read: if true;
      allow write: if resource == null || resource.data.eventId == request.resource.data.eventId;
    }
  }
}
```

**Important:** Click "Publish" after updating the rules.

### 2. Enable CORS in Firebase (If Available)

Unfortunately, Firebase Firestore doesn't have direct CORS configuration options in the console. The CORS policy is built into the service.

### 3. Alternative: Use Firebase Realtime Database

Realtime Database has different CORS policies. To set this up:

1. Go to Firebase Console → Realtime Database
2. Create a database
3. Set rules to:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Then update your app to use Realtime Database instead of Firestore.

### 4. Firebase Hosting (Best Solution)

Deploy your app to Firebase Hosting instead of GitHub Pages:

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init hosting
```

4. Deploy:
```bash
firebase deploy
```

Your app will be available at `https://your-project-id.web.app` and won't have CORS issues.

### 5. Web App Configuration

Make sure your Firebase web app is properly configured. In Firebase Console:

1. Go to Project Settings → General
2. Scroll to "Your apps" section
3. Make sure you have a web app configured
4. Add your GitHub Pages domain (`https://chus9000.github.io`) to authorized domains:
   - Go to Authentication → Settings → Authorized domains
   - Add `chus9000.github.io`

## Testing the Changes

After making these changes, test by:

1. Taking a survey on one device/browser
2. Opening results page on another device/browser
3. Check if participants from both devices appear

## What to Try First

1. **Update Firestore Security Rules** (most likely to help)
2. **Add your domain to authorized domains**
3. **Consider Firebase Hosting** (guaranteed to work)

## If Nothing Works

The fundamental issue is that Firebase Firestore REST API has strict CORS policies that can't be fully disabled. The most reliable solution is to deploy to Firebase Hosting instead of GitHub Pages.
