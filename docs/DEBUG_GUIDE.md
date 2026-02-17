# 🐛 Debug Guide for GitHub Pages Deployment

## How to Debug the App

When you deploy to GitHub Pages and see no participants, follow these steps:

### 1. Open Browser Developer Tools
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Safari**: Press `Cmd+Option+I` (Mac) - you may need to enable Developer menu first

### 2. Go to the Console Tab
Look for these specific log messages and report what you see:

#### When Loading Results Page:
```
🔍 Loading event data for ID: [event-id]
🔥 Attempting Firebase load...
🔥 Firebase URL: https://firestore.googleapis.com/v1/projects/privilegespectrum/databases/(default)/documents/events/[event-id]
🔥 Firebase loadEvent response: [status] [statusText]
```

**What to look for:**
- ❌ If you see CORS errors or network failures
- ❌ If you see 404 (Event not found)
- ❌ If you see 403 (Permission denied)
- ✅ If you see successful Firebase data loading

#### When Taking the Survey:
```
🔄 updateParticipant called for: [participant-name] Score: [score]
💾 Saving to localStorage...
✅ Saved to localStorage
🔥 Attempting Firebase update...
```

**What to look for:**
- ❌ If Firebase update fails
- ✅ If localStorage saves work
- ❌ If there are network errors

### 3. Check Network Tab
1. Go to **Network** tab in Developer Tools
2. Reload the page
3. Look for requests to `firestore.googleapis.com`
4. Check if they're failing (red status codes)

### 4. Check Application/Storage Tab
1. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
2. Look at **Local Storage** → your domain
3. Check if you see keys like:
   - `event_[event-id]`
   - `participant_[event-id]`

## Common Issues and Solutions

### Issue 1: CORS Errors
**Symptoms:** Console shows CORS policy errors
**Solution:** This is expected - Firebase REST API has CORS restrictions. The app should fall back to localStorage.

### Issue 2: No Event Data Found
**Symptoms:** Console shows "Event not found" or 404 errors
**Solution:** 
1. Make sure you're using the correct event ID in the URL
2. Check if the event was actually created and saved to Firebase
3. Verify the Firebase project ID is correct

### Issue 3: Participants Not Saving
**Symptoms:** Participants save to localStorage but not Firebase
**Solution:** This is normal for GitHub Pages due to CORS. Participants should still display from localStorage.

### Issue 4: No Participants Display at All
**Symptoms:** Results page shows empty spectrum
**Console logs to check:**
```
📁 Results loaded from localStorage: X participants
🚀 Starting simple round-robin allocation for X participants across 20 rows
👤 [Participant Name] ([Score]) → Row [X]
```

**If you don't see these logs:** The event has no participants
**If you see these logs but no display:** There's a rendering issue

## What to Report

Please copy and paste these specific console messages:

1. **Event Loading Messages:**
   - The Firebase URL being called
   - The response status
   - Any error messages

2. **Participant Data:**
   - How many participants were loaded
   - Whether they came from Firebase or localStorage

3. **Rendering Messages:**
   - The allocation messages showing participants being positioned
   - Any JavaScript errors

## Quick Test

To verify the app works:
1. Create a new event
2. Take the survey yourself
3. Go to results page
4. Check console for the debug messages above
5. Report what you see

## Emergency Fallback

If Firebase is completely broken, you can test with localStorage only:
1. Create an event
2. Take the survey (this saves to localStorage)
3. Results should show from localStorage even if Firebase fails

The comprehensive logging will help us identify exactly where the issue occurs!
