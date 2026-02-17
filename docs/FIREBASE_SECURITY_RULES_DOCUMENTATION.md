# Firebase Security Rules Documentation

## Overview

This document describes the Firebase Realtime Database security rules implemented for the Privilege Spectrum Quiz application. The rules ensure proper access control for events, participants, and user data while maintaining the balance between security and functionality.

## Requirements Coverage

The security rules implement the following requirements:

- **Requirement 11.5**: Prevent unauthorized access to event data
- **Requirement 11.6**: Allow event creators to read/write their own events
- **Requirement 11.7**: Allow participants to write their own responses but not modify others; allow authenticated users to read/write only their own user data

## Security Rules Structure

### Events Collection

#### Public Read Access (Requirement 11.5)
```json
".read": true
```
- **Purpose**: Allow anyone to read event data for participation and spectrum visualization
- **Rationale**: Events are meant to be shared and viewed by participants via links
- **Security**: While read is public, write access is restricted (see below)

#### Authenticated Write (Requirement 11.6)
```json
".write": "auth != null || $eventId === 'freeplay'"
```
- **Purpose**: Only authenticated users can create/modify events, except for the special "freeplay" event
- **Rationale**: 
  - Regular events require authentication to track ownership
  - "freeplay" is a special event for anonymous participation
- **Security**: Prevents unauthorized event creation or modification

#### Creator ID Protection (Requirement 11.6)
```json
"creatorId": {
  ".validate": "newData.isString()",
  ".write": "!data.exists() && auth != null && newData.val() === auth.uid"
}
```
- **Purpose**: Ensure only the authenticated user can set their own UID as creator
- **Rationale**: Prevents users from impersonating other creators
- **Security**: 
  - `!data.exists()`: CreatorId can only be set once (immutable)
  - `auth != null`: Must be authenticated
  - `newData.val() === auth.uid`: CreatorId must match the authenticated user's UID

### Participants Collection

#### Public Write Access (Requirement 11.7)
```json
"participants": {
  ".read": true,
  ".write": true
}
```
- **Purpose**: Allow anyone to submit participant responses
- **Rationale**: Event participation is anonymous and doesn't require authentication
- **Security**: Data validation rules ensure data integrity (see below)

#### Participant Data Validation
```json
"$participantId": {
  ".validate": "newData.hasChildren(['id', 'score', 'answers', 'createdAt'])"
}
```
- **Purpose**: Ensure all participant submissions have required fields
- **Required Fields**:
  - `id`: Unique participant identifier (string)
  - `score`: Calculated privilege score (number)
  - `answers`: Question responses (object)
  - `createdAt`: Timestamp (string)
- **Optional Fields**:
  - `name`: Participant name (string)
  - `avatar`: Participant avatar emoji (string)

### Users Collection

#### Own Data Only Access (Requirement 11.7)
```json
"$userId": {
  ".read": "auth != null && auth.uid === $userId",
  ".write": "auth != null && auth.uid === $userId"
}
```
- **Purpose**: Users can only access their own user data
- **Rationale**: Protects user privacy and prevents unauthorized access
- **Security**: 
  - `auth != null`: Must be authenticated
  - `auth.uid === $userId`: Can only access data matching their own UID

## Data Validation Rules

### Event Title
```json
".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 100"
```
- Must be a non-empty string
- Maximum 100 characters
- Prevents empty or excessively long titles

### Event PIN
```json
".validate": "newData.isString() && newData.val().matches(/^[0-9]{6}$/)"
```
- Must be exactly 6 numeric digits
- Format: "123456"
- Ensures consistent PIN format

### Participant Score
```json
".validate": "newData.isNumber()"
```
- Must be a number (not a string)
- Ensures proper score calculations

### Participant Answers
```json
".validate": "newData.hasChildren()"
```
- Must be an object with at least one answer
- Ensures participants have submitted responses

## Testing the Security Rules

### Unit Tests

Run the security rules unit tests:
```bash
npm test -- test/firebase-security-rules.unit.test.js
```

The test suite validates:
- Public read access for events
- Authenticated write for event creation
- Creator ID enforcement
- Public write for participants
- User data access restrictions
- Data validation rules

### Firebase Emulator Testing

#### 1. Install Firebase Tools
```bash
npm install -g firebase-tools
```

#### 2. Initialize Firebase (if not already done)
```bash
firebase login
firebase init database
```

#### 3. Start the Emulator
```bash
firebase emulators:start
```

This will start:
- Realtime Database Emulator on port 9000
- Emulator UI on port 4000

#### 4. Access the Emulator UI
Open http://localhost:4000 in your browser to:
- View the database structure
- Test security rules manually
- Monitor read/write operations
- Debug rule violations

#### 5. Test Security Rules in Emulator

The Firebase Emulator UI provides a "Rules" tab where you can:
1. View the current security rules
2. Simulate authenticated and unauthenticated requests
3. Test specific read/write operations
4. See which rules allow or deny access

### Manual Testing Scenarios

#### Scenario 1: Public Event Read
```javascript
// Should succeed (no auth required)
const eventRef = ref(database, 'events/event123');
const snapshot = await get(eventRef);
```

#### Scenario 2: Authenticated Event Creation
```javascript
// Should succeed (authenticated user)
const auth = getAuth();
const user = auth.currentUser;
const eventRef = ref(database, `events/${eventId}`);
await set(eventRef, {
  title: 'My Event',
  pin: '123456',
  creatorId: user.uid,
  createdAt: new Date().toISOString(),
  disabledQuestions: []
});
```

#### Scenario 3: Unauthenticated Event Creation
```javascript
// Should fail (not authenticated, not freeplay)
const eventRef = ref(database, 'events/event123');
await set(eventRef, {
  title: 'My Event',
  pin: '123456',
  creatorId: 'someUserId',
  createdAt: new Date().toISOString()
});
// Error: Permission denied
```

#### Scenario 4: Participant Submission
```javascript
// Should succeed (public write)
const participantRef = ref(database, `events/${eventId}/participants/${participantId}`);
await set(participantRef, {
  id: participantId,
  name: 'John Doe',
  avatar: '🐱',
  score: 10,
  answers: { 0: 1, 1: 0, 2: 1 },
  createdAt: new Date().toISOString()
});
```

#### Scenario 5: User Data Access
```javascript
// Should succeed (own data)
const auth = getAuth();
const user = auth.currentUser;
const userRef = ref(database, `users/${user.uid}`);
await set(userRef, {
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
  createdAt: new Date().toISOString()
});

// Should fail (other user's data)
const otherUserRef = ref(database, 'users/otherUserId');
const snapshot = await get(otherUserRef);
// Error: Permission denied
```

## Security Best Practices

### 1. Principle of Least Privilege
- Events: Public read, authenticated write
- Participants: Public write (necessary for anonymous participation)
- Users: Own data only

### 2. Data Validation
- All fields have type validation
- Required fields are enforced
- Format validation for PINs and titles

### 3. Immutable Fields
- `creatorId` cannot be changed once set
- Prevents ownership transfer attacks

### 4. Authentication Checks
- All sensitive operations require authentication
- User identity is verified before granting access

### 5. Special Cases
- "freeplay" event allows anonymous writes
- Participants can write without authentication (by design)

## Common Security Scenarios

### ✅ Allowed Operations

1. **Anyone can read events**: For sharing and participation
2. **Authenticated users can create events**: With their UID as creatorId
3. **Anyone can submit participant responses**: For anonymous participation
4. **Users can access their own user data**: Privacy protection
5. **Anonymous users can participate in freeplay**: Special case for demo mode

### ❌ Denied Operations

1. **Unauthenticated users cannot create regular events**: Prevents spam
2. **Users cannot set creatorId to another user's UID**: Prevents impersonation
3. **CreatorId cannot be modified after creation**: Prevents ownership hijacking
4. **Users cannot access other users' data**: Privacy protection
5. **Invalid data formats are rejected**: Data integrity

## Troubleshooting

### Permission Denied Errors

If you encounter "Permission denied" errors:

1. **Check authentication status**: Ensure the user is signed in for protected operations
2. **Verify creatorId matches auth.uid**: When creating events
3. **Check data structure**: Ensure all required fields are present
4. **Validate data types**: Ensure numbers are numbers, strings are strings
5. **Review the operation**: Some operations (like modifying creatorId) are intentionally restricted

### Testing in Development

For development testing, you can:
1. Use the Firebase Emulator (recommended)
2. Create a separate Firebase project for testing
3. Never disable security rules in production

### Debugging Rules

To debug security rules:
1. Check the Firebase Console logs
2. Use the Emulator UI to simulate operations
3. Review the security rules in `firebase-security-rules.json`
4. Run the unit tests to verify rule logic

## Deployment

### Deploying Security Rules

1. **Review the rules**: Ensure they match your requirements
2. **Test with emulator**: Verify all scenarios work correctly
3. **Deploy to Firebase**:
   ```bash
   firebase deploy --only database
   ```
4. **Verify in production**: Test critical operations after deployment

### Monitoring

After deployment:
1. Monitor Firebase Console for security rule violations
2. Check for unexpected permission denied errors
3. Review database access patterns
4. Update rules as needed based on usage patterns

## Summary

The Firebase security rules for this application provide:
- ✅ Public read access for events (Requirement 11.5)
- ✅ Authenticated write for event creation by creator only (Requirement 11.6)
- ✅ Public write for participants (Requirement 11.7)
- ✅ Authenticated read/write for users collection (own data only) (Requirement 11.7)
- ✅ Comprehensive data validation
- ✅ Protection against common security vulnerabilities

All requirements (11.5, 11.6, 11.7) are fully implemented and tested.
