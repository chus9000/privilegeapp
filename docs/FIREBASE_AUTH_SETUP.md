# Firebase Authentication Setup Guide

This guide walks you through setting up Firebase Authentication with Google OAuth for the Privilege Spectrum application.

## Prerequisites

- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)

## Step 1: Create or Select Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Either:
   - Click "Add project" to create a new project
   - Select your existing "privilegespectrum" project

## Step 2: Enable Google Authentication

1. In the Firebase Console, click on "Authentication" in the left sidebar
2. Click on the "Sign-in method" tab
3. Click on "Google" in the providers list
4. Toggle the "Enable" switch to ON
5. Enter a project support email (your email)
6. Click "Save"

## Step 3: Get Firebase Configuration

1. Click on the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. If you don't have a web app:
   - Click the "</>" (Web) icon to add a web app
   - Enter a nickname (e.g., "Privilege Spectrum Web")
   - Check "Also set up Firebase Hosting" if you plan to use it
   - Click "Register app"
5. Copy the Firebase configuration object

## Step 4: Update firebase-config.js

1. Open `firebase-config.js` in your project
2. Replace the placeholder values in `FIREBASE_CONFIG` with your actual values:

```javascript
const FIREBASE_CONFIG = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.region.firebasedatabase.app",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Step 5: Configure Authorized Domains

1. In Firebase Console > Authentication > Settings tab
2. Scroll to "Authorized domains"
3. Add your domains:
   - `localhost` (for local development)
   - Your GitHub Pages domain (e.g., `username.github.io`)
   - Any custom domains you use

## Step 6: Update Firebase Security Rules

1. In Firebase Console, go to "Realtime Database"
2. Click on the "Rules" tab
3. Copy the contents of `firebase-security-rules.json` from this project
4. Paste into the Firebase Console rules editor
5. Click "Publish"

The security rules ensure:
- All events are publicly readable
- Only authenticated users can create events
- Event creators can only write their own creatorId
- Participants can write their own responses
- Free play mode (eventId: "freeplay") allows anonymous writes

## Step 7: Test Authentication

1. Open your application in a browser
2. Try the "Create Your Own Event" flow
3. You should see a Google sign-in popup
4. After signing in, you should be authenticated

## Security Notes

### Current Implementation (Development)

The current `auth-manager.js` uses a simplified mock authentication for development and GitHub Pages compatibility. This is suitable for:
- Local development
- Testing the application flow
- GitHub Pages deployment without backend

### Production Implementation

For production use with real authentication:

1. **Use Firebase Auth SDK**: Replace the mock implementation in `auth-manager.js` with the actual Firebase Auth SDK:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Sign in with popup
async signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        // Handle user...
    } catch (error) {
        // Handle error...
    }
}
```

2. **Enable Firebase Hosting**: For production deployment with proper CORS and authentication support

3. **Use Environment Variables**: Store sensitive config in environment variables, not in source code

## Troubleshooting

### "auth/unauthorized-domain" Error

- Make sure your domain is added to Authorized domains in Firebase Console
- For localhost, ensure port is included if using non-standard port

### "auth/popup-blocked" Error

- Browser is blocking the popup
- User needs to allow popups for your domain
- Consider using redirect flow instead: `signInWithRedirect()`

### "auth/network-request-failed" Error

- Check internet connection
- Verify Firebase project is active
- Check browser console for CORS errors

### Session Not Persisting

- Check browser localStorage is enabled
- Verify `firebase-auth-user` key exists in localStorage
- Check token expiration (default: 1 hour)

## Next Steps

After setting up authentication:

1. Test the complete authentication flow
2. Implement the landing page (Task 2)
3. Create the event dashboard (Task 4)
4. Test event creation with authenticated users

## Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Auth REST API](https://firebase.google.com/docs/reference/rest/auth)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
