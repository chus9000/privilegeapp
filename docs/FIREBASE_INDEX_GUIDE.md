# Firebase Database Index Configuration Guide

## Overview

This guide explains the Firebase Realtime Database index configuration for the event creation quota feature. The index on the `creatorId` field is essential for efficient query performance when enforcing the 3-event limit per user.

## Why an Index is Required

The event creation quota feature uses Firebase Security Rules to count how many events a user has created before allowing a new event. This counting operation queries the database:

```javascript
root.child('events')
  .orderByChild('creatorId')
  .equalTo(auth.uid)
  .once('value')
  .numChildren()
```

Without an index on `creatorId`, this query would:
- Perform a full scan of all events in the database
- Be slow and potentially timeout for large datasets
- Fail Firebase's query optimization requirements

With the index, the query:
- Uses O(log n) lookup time
- Scales efficiently as the database grows
- Completes within Firebase's rule evaluation time limits

## Index Configuration

The index is configured in `firebase-security-rules.json` under the `events` node:

```json
{
  "rules": {
    "events": {
      ".read": "auth != null",
      ".indexOn": ["creatorId"],
      "$eventId": {
        // ... rest of the rules
      }
    }
  }
}
```

The `.indexOn` directive tells Firebase to create and maintain an index on the `creatorId` field for all events.

## Deployment

### Method 1: Firebase CLI (Recommended)

The index is automatically deployed when you deploy the security rules:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy security rules (includes index configuration)
firebase deploy --only database
```

**Output:**
```
=== Deploying to 'your-project-id'...

i  database: checking rules syntax...
✔  database: rules syntax for database your-project-id is valid
i  database: releasing rules...
✔  database: rules for database your-project-id released successfully

✔  Deploy complete!
```

### Method 2: Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Realtime Database > Rules**
4. Copy the entire contents of `firebase-security-rules.json`
5. Paste into the rules editor
6. Click **Publish**

The index configuration in the `.indexOn` directive will be automatically applied.

## Verification

### Check 1: Verify in Firebase Console

1. Go to Firebase Console > Realtime Database
2. Click on the **Rules** tab
3. Look for the `.indexOn` directive:
   ```json
   "events": {
     ".read": "auth != null",
     ".indexOn": ["creatorId"],
     ...
   }
   ```

### Check 2: Run Local Verification Script

```bash
bash verify-setup.sh
```

Look for this line in the output:
```
✅ Database index for creatorId is configured
```

### Check 3: Monitor Firebase Console Logs

After deployment, monitor the Firebase Console for any index warnings:

1. Go to **Realtime Database > Usage** tab
2. Look for warnings about unindexed queries
3. If you see warnings about `creatorId` queries, the index may not be active

### Check 4: Test Query Performance

You can test the index by creating a few events and checking query performance:

```javascript
// In browser console after logging in
const eventsRef = firebase.database().ref('events');
const query = eventsRef.orderByChild('creatorId').equalTo(firebase.auth().currentUser.uid);

console.time('query');
query.once('value').then(snapshot => {
  console.timeEnd('query');
  console.log('Event count:', snapshot.numChildren());
});
```

**Expected results:**
- With index: Query completes in < 100ms
- Without index: Query may take seconds or fail

## Troubleshooting

### Issue: Index Not Applied After Deployment

**Symptoms:**
- Firebase Console shows warnings about unindexed queries
- Event creation is slow or fails
- Console logs show "FIREBASE WARNING: Using an unspecified index"

**Solutions:**

1. **Verify rules were deployed:**
   ```bash
   firebase deploy --only database
   ```

2. **Check rules syntax:**
   ```bash
   firebase database:rules:get
   ```

3. **Manually add index in Firebase Console:**
   - Go to Realtime Database > Rules
   - Ensure `.indexOn` directive is present
   - Click Publish

4. **Wait for index to build:**
   - For large databases, index creation may take a few minutes
   - Check the Usage tab for index status

### Issue: Permission Denied During Quota Check

**Symptoms:**
- Users cannot create events even when under quota
- Console shows "PERMISSION_DENIED" errors

**Solutions:**

1. **Verify index is active** (see verification steps above)

2. **Check security rules syntax:**
   - Ensure the quota check rule is correctly formatted
   - Test rules in Firebase Console Rules Playground

3. **Test with Firebase Emulator:**
   ```bash
   firebase emulators:start --only database
   ```

### Issue: Query Timeout

**Symptoms:**
- Event creation hangs or times out
- Console shows timeout errors

**Solutions:**

1. **Verify index is configured and deployed**

2. **Check database size:**
   - Large databases without indexes will timeout
   - Index is essential for databases with > 100 events

3. **Test query directly:**
   ```javascript
   // Test if query completes
   firebase.database().ref('events')
     .orderByChild('creatorId')
     .equalTo('test-uid')
     .once('value')
     .then(() => console.log('Query succeeded'))
     .catch(err => console.error('Query failed:', err));
   ```

## Performance Metrics

### With Index (Expected Performance)

| Database Size | Query Time | Status |
|--------------|------------|--------|
| 10 events    | < 50ms     | ✅ Excellent |
| 100 events   | < 100ms    | ✅ Good |
| 1,000 events | < 200ms    | ✅ Acceptable |
| 10,000 events| < 500ms    | ✅ Acceptable |

### Without Index (Poor Performance)

| Database Size | Query Time | Status |
|--------------|------------|--------|
| 10 events    | 100-500ms  | ⚠️ Slow |
| 100 events   | 1-5s       | ❌ Very Slow |
| 1,000 events | 10-30s     | ❌ Timeout Risk |
| 10,000 events| Timeout    | ❌ Fails |

## Index Maintenance

### Automatic Maintenance

Firebase automatically maintains the index:
- Updates when events are created
- Updates when events are deleted
- Updates when `creatorId` field changes
- No manual maintenance required

### Index Storage

The index consumes additional storage:
- Approximately 50-100 bytes per event
- For 1,000 events: ~50-100 KB
- Negligible impact on Firebase storage limits

### Index Rebuild

If you need to rebuild the index:

1. Remove the `.indexOn` directive
2. Deploy rules: `firebase deploy --only database`
3. Add the `.indexOn` directive back
4. Deploy rules again: `firebase deploy --only database`

**Note:** This is rarely necessary. Firebase handles index maintenance automatically.

## Future Considerations

### Multiple Indexes

If you need to query events by other fields in the future, add them to the `.indexOn` array:

```json
"events": {
  ".indexOn": ["creatorId", "createdAt", "status"]
}
```

### Composite Indexes

For queries that filter by multiple fields, you may need composite indexes. However, Firebase Realtime Database has limited support for composite indexes. Consider restructuring data or using Firestore for complex queries.

### Tiered Licensing Extension

When implementing tiered licensing with per-user quotas, you may need additional indexes:

```json
"users": {
  ".indexOn": ["tier", "quota"]
}
```

## Related Documentation

- [Firebase Realtime Database Indexing](https://firebase.google.com/docs/database/security/indexing-data)
- [Firebase Security Rules](https://firebase.google.com/docs/database/security)
- [Event Creation Quota Design](../.kiro/specs/event-creation-limit/design.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## Support

If you encounter issues with index configuration:

1. Check Firebase Console for warnings
2. Run `verify-setup.sh` to validate configuration
3. Test queries in Firebase Console Rules Playground
4. Review Firebase documentation on indexing
5. Check Firebase status page for service issues

---

**Last Updated:** 2024
**Feature:** Event Creation Limit (3 events per user)
**Requirements:** 9.2, 9.3, 9.4
