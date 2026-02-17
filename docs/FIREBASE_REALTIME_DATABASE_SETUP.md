# Firebase Realtime Database Setup Instructions

## The Problem
Your app is getting 404 errors when trying to access Firebase Realtime Database because it's not enabled in your Firebase project.

## Solution: Enable Firebase Realtime Database

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **privilegespectrum**

### Step 2: Enable Realtime Database
1. In the left sidebar, click on **"Realtime Database"**
2. Click **"Create Database"** button
3. Choose your database location (select the closest region to your users)
4. **IMPORTANT**: Choose **"Start in test mode"** for now (we'll secure it later)

### Step 3: Configure Security Rules
After creating the database, you'll need to set up security rules. Click on the **"Rules"** tab and replace the default rules with:

```json
{
  "rules": {
    "events": {
      "$eventId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### Step 4: Verify Database URL
After creation, verify that your database URL matches what's in the code:
- Expected: `https://privilegespectrum-default-rtdb.firebaseio.com`
- If different, update the URL in `firebase-config.js`

### Step 5: Test the Connection
Once you've completed these steps:
1. Open your app
2. Try creating a new event
3. Check the browser console for success messages
4. Test real-time updates by opening the results page in multiple tabs

## Why This Will Fix Your Real-Time Updates

1. **404 Errors Gone**: The database will exist and respond to requests
2. **Real-Time Polling**: Your app polls every 2 seconds for changes
3. **Cross-Device Sync**: All participants will see each other's results
4. **CORS Compatible**: Realtime Database REST API works with GitHub Pages

## Security Note
The test mode rules above allow anyone to read/write. For production, you should implement proper authentication and more restrictive rules.
