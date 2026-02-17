# Firebase Security Rules Setup Guide

## Quick Start

This guide will help you set up and test the Firebase Realtime Database security rules for the Privilege Spectrum Quiz application.

## Files Overview

- **`firebase-security-rules.json`**: The security rules definition
- **`firebase.json`**: Firebase project configuration
- **`test/firebase-security-rules.unit.test.js`**: Unit tests for security rules logic
- **`test-security-rules-emulator.html`**: Interactive emulator testing page
- **`FIREBASE_SECURITY_RULES_DOCUMENTATION.md`**: Comprehensive documentation

## Prerequisites

1. Node.js and npm installed
2. Firebase CLI installed: `npm install -g firebase-tools`
3. Firebase project created (or use emulator for testing)

## Step 1: Review Security Rules

The security rules are defined in `firebase-security-rules.json`. Key features:

✅ **Public read access** for events (Requirement 11.5)
✅ **Authenticated write** for event creation (Requirement 11.6)
✅ **Creator-only modification** of events (Requirement 11.6)
✅ **Public write** for participants (Requirement 11.7)
✅ **Own-data-only access** for users (Requirement 11.7)

## Step 2: Run Unit Tests

Test the security rules logic without Firebase:

```bash
npm test -- test/firebase-security-rules.unit.test.js
```

Expected output: All 25 tests should pass ✅

## Step 3: Test with Firebase Emulator

### 3.1 Start the Emulator

```bash
firebase emulators:start
```

This starts:
- Realtime Database Emulator on port 9000
- Emulator UI on http://localhost:4000

### 3.2 Open the Test Page

Open `test-security-rules-emulator.html` in your browser:

```bash
open test-security-rules-emulator.html
```

Or navigate to it manually in your browser.

### 3.3 Run Interactive Tests

1. Click "Sign In (Emulator)" to authenticate
2. Click "Run All Tests" to execute all security rule tests
3. Review the results - all tests should pass ✅

### 3.4 View in Emulator UI

Open http://localhost:4000 to:
- View the database structure
- See real-time data changes
- Monitor security rule evaluations
- Debug any issues

## Step 4: Deploy to Production

### 4.1 Review Before Deployment

⚠️ **Important**: Review the security rules carefully before deploying to production.

```bash
# View current rules
cat firebase-security-rules.json
```

### 4.2 Deploy Rules

```bash
# Deploy only database rules
firebase deploy --only database

# Or deploy everything
firebase deploy
```

### 4.3 Verify Deployment

1. Go to Firebase Console
2. Navigate to Realtime Database → Rules
3. Verify the rules match your local file
4. Test critical operations in production

## Testing Checklist

Before deploying, ensure:

- [ ] All unit tests pass
- [ ] Emulator tests pass
- [ ] Public can read events
- [ ] Authenticated users can create events
- [ ] Unauthenticated users cannot create regular events
- [ ] Participants can write responses
- [ ] Users can only access their own data
- [ ] CreatorId is immutable
- [ ] Data validation works correctly

## Common Issues

### Issue: "Permission Denied" in Production

**Solution**: 
1. Check if user is authenticated for protected operations
2. Verify creatorId matches auth.uid
3. Ensure all required fields are present
4. Check data types match validation rules

### Issue: Emulator Won't Start

**Solution**:
1. Check if ports 9000 and 4000 are available
2. Kill any existing Firebase processes
3. Try: `firebase emulators:start --only database`

### Issue: Tests Fail in Emulator

**Solution**:
1. Ensure emulator is running
2. Check browser console for errors
3. Verify Firebase SDK versions match
4. Clear emulator data: `firebase emulators:start --import=./emulator-data --export-on-exit`

## Security Best Practices

1. **Never disable security rules** in production
2. **Test thoroughly** before deploying
3. **Monitor access patterns** in Firebase Console
4. **Review rules regularly** as requirements change
5. **Use emulator** for development and testing
6. **Validate all data** at the database level
7. **Follow principle of least privilege**

## Requirements Coverage

The security rules implement:

- ✅ **Requirement 11.5**: Prevent unauthorized access to event data
- ✅ **Requirement 11.6**: Allow event creators to read/write their own events
- ✅ **Requirement 11.7**: Allow participants to write responses; users can only access own data

## Next Steps

1. ✅ Review security rules
2. ✅ Run unit tests
3. ✅ Test with emulator
4. ⏳ Deploy to production
5. ⏳ Monitor in production
6. ⏳ Update as needed

## Support

For more information:
- See `FIREBASE_SECURITY_RULES_DOCUMENTATION.md` for detailed documentation
- Check Firebase documentation: https://firebase.google.com/docs/database/security
- Review test files for examples

## Summary

The Firebase security rules are:
- ✅ Implemented and tested
- ✅ Meet all requirements (11.5, 11.6, 11.7)
- ✅ Include comprehensive validation
- ✅ Ready for deployment

Run the tests, verify everything works, and deploy with confidence! 🚀
