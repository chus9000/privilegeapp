# Design Document: Event Creation Limit

## Overview

This design implements a server-side enforced limit of 3 events per authenticated user in the Firebase Realtime Database quiz application. The system uses Firebase Security Rules as the primary enforcement mechanism, ensuring that quota limits cannot be bypassed through client-side manipulation. The client-side UI provides real-time quota feedback and a banner notification system to inform users about the limit and upcoming licensing plans.

The design prioritizes security through defense-in-depth: Firebase Security Rules provide the authoritative enforcement layer, while client-side checks enhance user experience by preventing unnecessary failed requests. The architecture is designed to be extensible for future tiered licensing where different users may have different quota limits.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Event Creation │  │   Dashboard  │  │  Quota Banner   │ │
│  │      UI        │  │      UI      │  │   Component     │ │
│  └────────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│           │                  │                    │          │
│           └──────────────────┼────────────────────┘          │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Firebase Auth      │
                    │   (User Identity)    │
                    └──────────┬───────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│              Firebase Realtime Database                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           Firebase Security Rules Engine               │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  1. Authenticate user (auth.uid)                 │  │  │
│  │  │  2. Query /events for creator matches            │  │  │
│  │  │  3. Count matching events                        │  │  │
│  │  │  4. Validate count < 3                           │  │  │
│  │  │  5. Allow/Deny write operation                   │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    /events/{eventId}                   │  │
│  │  {                                                     │  │
│  │    title: string,                                     │  │
│  │    pin: string,                                       │  │
│  │    creatorId: string,  ← Used for quota counting     │  │
│  │    createdAt: string,                                 │  │
│  │    disabledQuestions: array,                          │  │
│  │    participants: array                                │  │
│  │  }                                                     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Enforcement Layers

1. **Primary Enforcement: Firebase Security Rules**
   - Authoritative quota validation
   - Executes on every write operation
   - Cannot be bypassed by client code
   - Atomic evaluation prevents race conditions

2. **Secondary Layer: Client-Side UI**
   - Real-time quota display
   - Button state management (enable/disable)
   - User-friendly error messages
   - Banner notifications at limit
   - Improves UX by preventing failed requests

### Data Flow

**Event Creation Flow:**
```
1. User clicks "Create Event" button
2. Client validates quota locally (UX optimization)
3. Client sends write request to Firebase
4. Firebase Security Rules execute:
   a. Verify user is authenticated
   b. Query events where creatorId === auth.uid
   c. Count results
   d. If count >= 3, reject with permission denied
   e. If count < 3, allow write
5. Client receives response:
   - Success: Show event created
   - Permission denied: Show quota error message
```

**Quota Display Flow:**
```
1. User navigates to dashboard or creation page
2. Client queries Firebase: events where creatorId === currentUser.uid
3. Client counts results locally
4. Client displays: "X of 3 events created"
5. Client enables/disables create button based on count
6. Client shows/hides banner based on count === 3
7. Firebase listener updates count in real-time
```

## Components and Interfaces

### 1. Firebase Security Rules Module

**Location:** `firebase-security-rules.json`

**Purpose:** Server-side enforcement of event creation quota

**Rule Structure:**
```javascript
{
  "rules": {
    "events": {
      "$eventId": {
        ".write": "auth != null && (
          // Allow writes if:
          // 1. User is authenticated
          // 2. Event doesn't exist yet (new creation)
          // 3. User owns fewer than 3 events
          // OR user is updating their own existing event
          
          (!data.exists() && 
           root.child('events')
             .orderByChild('creatorId')
             .equalTo(auth.uid)
             .once('value')
             .numChildren() < 3) ||
          
          (data.exists() && 
           data.child('creatorId').val() === auth.uid)
        )",
        
        "creatorId": {
          ".validate": "newData.val() === auth.uid"
        }
      }
    }
  }
}
```

**Key Design Decisions:**

1. **Query-Based Counting:** Uses `.orderByChild('creatorId').equalTo(auth.uid)` to count user's events
   - Requires index on `creatorId` field for performance
   - Scales with user's event count, not total database size

2. **Atomic Evaluation:** Firebase evaluates rules atomically per write operation
   - Prevents race conditions during concurrent creation
   - Each request independently validated at write time

3. **Existing Event Updates:** Allows updates to existing events without quota check
   - Distinguishes between new creation (`!data.exists()`) and updates (`data.exists()`)
   - Prevents quota from blocking legitimate updates

4. **Creator Validation:** Enforces that `creatorId` must match authenticated UID
   - Prevents users from creating events under other users' quotas
   - Validates on both creation and update

**Performance Considerations:**

- Query execution time: O(n) where n = user's event count (typically ≤ 3)
- Requires Firebase index: `{"events": {".indexOn": ["creatorId"]}}`
- Rule evaluation completes within Firebase's 10-second timeout limit

### 2. Quota Display Component

**Location:** `app/event-creation.js` and `app/dashboard.js`

**Purpose:** Display real-time quota information to users

**Interface:**
```javascript
class QuotaDisplay {
  /**
   * Initialize quota display with real-time updates
   * @param {string} userId - Firebase Auth UID
   */
  async initialize(userId);
  
  /**
   * Get current event count for user
   * @returns {Promise<number>} Number of events created by user
   */
  async getUserEventCount();
  
  /**
   * Calculate remaining quota
   * @returns {number} Number of events user can still create (0-3)
   */
  getRemainingQuota();
  
  /**
   * Update UI elements with current quota
   */
  updateQuotaDisplay();
  
  /**
   * Set up real-time listener for quota changes
   */
  setupRealTimeListener();
  
  /**
   * Clean up listeners when component unmounts
   */
  cleanup();
}
```

**Implementation Details:**

```javascript
// Query user's events
const eventsRef = firebase.database().ref('events');
const userEventsQuery = eventsRef
  .orderByChild('creatorId')
  .equalTo(currentUser.uid);

// Count events
const snapshot = await userEventsQuery.once('value');
const eventCount = snapshot.numChildren();

// Calculate remaining
const QUOTA_LIMIT = 3;
const remaining = Math.max(0, QUOTA_LIMIT - eventCount);

// Update UI
document.getElementById('quotaDisplay').textContent = 
  `${eventCount} of ${QUOTA_LIMIT} events created`;
document.getElementById('remainingQuota').textContent = 
  `${remaining} remaining`;
```

**Real-Time Updates:**

```javascript
// Listen for changes to user's events
userEventsQuery.on('value', (snapshot) => {
  const eventCount = snapshot.numChildren();
  updateQuotaDisplay(eventCount);
  updateButtonState(eventCount);
  updateBannerVisibility(eventCount);
});
```

### 3. Event Creation Button Controller

**Location:** `app/event-creation.js`

**Purpose:** Enable/disable event creation based on quota

**Interface:**
```javascript
class CreateButtonController {
  /**
   * Update button state based on quota
   * @param {number} eventCount - Current number of events
   */
  updateButtonState(eventCount);
  
  /**
   * Show tooltip explaining why button is disabled
   */
  showDisabledTooltip();
  
  /**
   * Handle button click with quota validation
   */
  async handleCreateClick();
}
```

**Implementation:**

```javascript
function updateButtonState(eventCount) {
  const createBtn = document.getElementById('createEventBtn');
  const QUOTA_LIMIT = 3;
  
  if (eventCount >= QUOTA_LIMIT) {
    createBtn.disabled = true;
    createBtn.title = 'You have reached the 3-event limit. Delete an event to create a new one.';
    createBtn.classList.add('disabled-quota');
  } else {
    createBtn.disabled = false;
    createBtn.title = 'Create a new event';
    createBtn.classList.remove('disabled-quota');
  }
}
```

### 4. Quota Limit Banner Component

**Location:** `app/dashboard.js`

**Purpose:** Display banner when user reaches event limit

**Interface:**
```javascript
class QuotaBanner {
  /**
   * Show banner when quota is reached
   */
  show();
  
  /**
   * Hide banner when quota drops below limit
   */
  hide();
  
  /**
   * Update banner visibility based on event count
   * @param {number} eventCount - Current number of events
   */
  updateVisibility(eventCount);
}
```

**Banner HTML Structure:**

```html
<div id="quotaBanner" class="quota-banner" style="display: none;">
  <div class="banner-icon">
    <i data-lucide="info"></i>
  </div>
  <div class="banner-content">
    <h4>Event Limit Reached</h4>
    <p>
      You've created 3 events, which is the current limit. 
      Good news: we're working on licensing plans that will allow you to create more events!
      For now, you can delete an old event to create a new one.
    </p>
  </div>
  <button class="banner-close" onclick="dismissBanner()">
    <i data-lucide="x"></i>
  </button>
</div>
```

**CSS Styling:**

```css
.quota-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  display: flex;
  align-items: start;
  gap: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.banner-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.banner-content h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.banner-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.95;
}

.banner-close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  margin-left: auto;
  flex-shrink: 0;
}
```

**Implementation:**

```javascript
function updateBannerVisibility(eventCount) {
  const banner = document.getElementById('quotaBanner');
  const QUOTA_LIMIT = 3;
  
  // Show banner when at limit, hide otherwise
  if (eventCount >= QUOTA_LIMIT) {
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function dismissBanner() {
  const banner = document.getElementById('quotaBanner');
  banner.style.display = 'none';
  
  // Store dismissal in localStorage (optional - banner will reappear on page reload)
  localStorage.setItem('quotaBannerDismissed', Date.now().toString());
}
```

### 5. Error Handler Module

**Location:** `app/event-creation.js`

**Purpose:** Handle and display quota-related errors

**Interface:**
```javascript
class QuotaErrorHandler {
  /**
   * Handle Firebase permission denied error
   * @param {Error} error - Firebase error object
   * @returns {boolean} True if error was quota-related
   */
  handleFirebaseError(error);
  
  /**
   * Display quota error message to user
   */
  showQuotaError();
  
  /**
   * Distinguish between quota errors and other permission errors
   * @param {Error} error - Firebase error object
   * @returns {string} Error type: 'quota', 'permission', 'network', 'unknown'
   */
  classifyError(error);
}
```

**Implementation:**

```javascript
async function handleEventCreationError(error) {
  console.error('Event creation failed:', error);
  
  // Check if error is permission denied (likely quota)
  if (error.code === 'PERMISSION_DENIED') {
    // Verify it's a quota issue by checking current count
    const eventCount = await getUserEventCount();
    
    if (eventCount >= 3) {
      showQuotaError(eventCount);
    } else {
      showGenericPermissionError();
    }
  } else if (error.code === 'NETWORK_ERROR') {
    showNetworkError();
  } else {
    showGenericError(error.message);
  }
}

function showQuotaError(eventCount) {
  const message = `
    You've reached the 3-event limit (currently have ${eventCount} events).
    To create a new event, please delete one of your existing events from the dashboard.
    
    We're working on licensing plans that will allow higher limits!
  `;
  
  displayErrorModal({
    title: 'Event Limit Reached',
    message: message,
    actions: [
      { label: 'Go to Dashboard', onClick: () => window.location.href = './' },
      { label: 'Cancel', onClick: closeErrorModal }
    ]
  });
}
```

## Data Models

### Event Model

**Location:** `/events/{eventId}`

**Structure:**
```typescript
interface Event {
  // Existing fields
  title: string;              // Event title (1-100 characters)
  pin: string;                // 6-digit numeric PIN
  creatorId: string;          // Firebase Auth UID (CRITICAL for quota)
  createdAt: string;          // ISO 8601 timestamp
  disabledQuestions: number[]; // Array of disabled question indices
  participants: Participant[]; // Array of participant objects
}
```

**Quota-Relevant Fields:**

- `creatorId`: **CRITICAL** - Used by Security Rules to count events per user
  - Must be set to `auth.uid` on creation
  - Validated by Security Rules to match authenticated user
  - Indexed for efficient querying

**Firebase Index Configuration:**

```json
{
  "rules": {
    "events": {
      ".indexOn": ["creatorId"]
    }
  }
}
```

### Quota State (Client-Side Only)

**Location:** Client-side state management

**Structure:**
```typescript
interface QuotaState {
  userId: string;           // Current user's UID
  eventCount: number;       // Number of events user has created
  quotaLimit: number;       // Maximum events allowed (currently 3)
  remainingQuota: number;   // Events user can still create
  isAtLimit: boolean;       // True if eventCount >= quotaLimit
  lastUpdated: number;      // Timestamp of last quota check
}
```

**State Management:**

```javascript
class QuotaStateManager {
  constructor() {
    this.state = {
      userId: null,
      eventCount: 0,
      quotaLimit: 3,
      remainingQuota: 3,
      isAtLimit: false,
      lastUpdated: 0
    };
    this.listeners = [];
  }
  
  async updateState(userId) {
    const eventCount = await this.fetchEventCount(userId);
    
    this.state = {
      userId,
      eventCount,
      quotaLimit: 3,
      remainingQuota: Math.max(0, 3 - eventCount),
      isAtLimit: eventCount >= 3,
      lastUpdated: Date.now()
    };
    
    this.notifyListeners();
  }
  
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
  
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.state));
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Quota Enforcement at Creation

*For any* authenticated user with an existing event count, when attempting to create a new event, the Firebase Security Rules should allow the creation if and only if the current event count is less than 3.

**Validates: Requirements 1.1, 1.2**

### Property 2: Correct Event Counting by Creator

*For any* database state containing events from multiple users, when calculating the event count for a specific user, the count should include only events where the creatorId field matches that user's UID.

**Validates: Requirements 1.3**

### Property 3: Concurrent Creation Atomicity

*For any* set of concurrent event creation requests from the same user, each request should be evaluated independently at write time, and the total number of successfully created events should not exceed 3.

**Validates: Requirements 2.1, 2.2**

### Property 4: Quota Error Response

*For any* event creation attempt that is rejected due to quota limits, the Firebase Security Rules should return a permission denied error.

**Validates: Requirements 2.4**

### Property 5: Remaining Quota Calculation

*For any* event count value between 0 and 3, the displayed remaining quota should equal 3 minus the event count.

**Validates: Requirements 3.2**

### Property 6: Real-Time Quota Updates

*For any* change to a user's event count (creation or deletion), the Client UI should update the displayed quota to reflect the new count.

**Validates: Requirements 3.3**

### Property 7: Event Count Query Accuracy

*For any* user with events in the database, querying events where creatorId matches the user's UID should return exactly the events created by that user.

**Validates: Requirements 3.4**

### Property 8: Button State Based on Quota

*For any* event count value, the event creation button should be disabled if and only if the count is greater than or equal to 3.

**Validates: Requirements 4.1, 4.2**

### Property 9: Button State Reactivity

*For any* transition where the event count changes from 3 to less than 3 (e.g., after deletion), the event creation button should transition from disabled to enabled.

**Validates: Requirements 4.4**

### Property 10: Deletion Decreases Count

*For any* user with at least one event, when an event is deleted, the user's event count should decrease by exactly 1.

**Validates: Requirements 5.1**

### Property 11: Creation After Deletion

*For any* user at the 3-event limit, after deleting one event, the Security Rules should allow creation of a new event.

**Validates: Requirements 5.2**

### Property 12: Deleted Events Excluded from Count

*For any* user's event count calculation, events that have been deleted from the database should not be included in the count.

**Validates: Requirements 5.5**

### Property 13: Quota Error Classification

*For any* permission denied error during event creation, the error handler should correctly identify whether the error is due to quota limits or other permission issues.

**Validates: Requirements 6.2**

### Property 14: UI State After Error

*For any* quota error that occurs during event creation, the UI should remain in a functional state (form should be usable, buttons should be clickable, no broken state).

**Validates: Requirements 6.5**

### Property 15: Creator Field Validation

*For any* event creation attempt where the creatorId field does not match the authenticated user's UID, the Security Rules should reject the write operation.

**Validates: Requirements 7.2**

### Property 16: Session-Independent Count Accuracy

*For any* user, the event count should be consistent regardless of whether the user has just logged in, has been logged in for a while, or has logged out and back in.

**Validates: Requirements 7.5**

### Property 17: Graceful Handling of Malformed Data

*For any* database state that includes events with missing or invalid creatorId fields, the quota enforcement system should continue to function correctly for new event creation attempts.

**Validates: Requirements 8.3**

### Property 18: Banner Visibility at Limit

*For any* user with exactly 3 events, the quota limit banner should be visible on the dashboard.

**Validates: Requirements 10.1, 10.4**

### Property 19: Banner Hidden Below Limit

*For any* user with fewer than 3 events, the quota limit banner should be hidden.

**Validates: Requirements 10.5**

## Error Handling

### Error Types and Responses

**1. Quota Exceeded Error**

**Trigger:** User attempts to create event when they have 3 existing events

**Server Response:**
```javascript
{
  code: 'PERMISSION_DENIED',
  message: 'Permission denied'
}
```

**Client Handling:**
```javascript
async function handleEventCreationError(error) {
  if (error.code === 'PERMISSION_DENIED') {
    // Check if it's a quota issue
    const eventCount = await getUserEventCount();
    
    if (eventCount >= 3) {
      showQuotaExceededModal({
        title: 'Event Limit Reached',
        message: `You've created ${eventCount} events, which is the current limit. To create a new event, please delete one of your existing events.`,
        suggestion: 'We're working on licensing plans that will allow you to create more events!',
        actions: [
          { label: 'Go to Dashboard', primary: true, onClick: () => navigateToDashboard() },
          { label: 'Cancel', onClick: () => closeModal() }
        ]
      });
    } else {
      showGenericPermissionError();
    }
  }
}
```

**User Experience:**
- Modal dialog with clear explanation
- Suggestion to delete old events
- Link to dashboard for event management
- Mention of upcoming licensing plans

**2. Concurrent Creation Conflict**

**Trigger:** Multiple creation attempts cause race condition

**Server Response:**
```javascript
{
  code: 'PERMISSION_DENIED',
  message: 'Permission denied'
}
```

**Client Handling:**
- Same as quota exceeded error
- User sees consistent message regardless of race condition
- Retry mechanism not provided (user should check dashboard first)

**3. Creator Field Mismatch**

**Trigger:** Attempt to create event with wrong creatorId

**Server Response:**
```javascript
{
  code: 'PERMISSION_DENIED',
  message: 'Permission denied'
}
```

**Client Handling:**
```javascript
// This should never happen in normal operation
// If it does, it indicates a bug or tampering attempt
console.error('Creator field validation failed - possible tampering attempt');
showGenericError('Unable to create event. Please refresh and try again.');
```

**4. Network Errors**

**Trigger:** Network connectivity issues

**Server Response:** Timeout or network error

**Client Handling:**
```javascript
if (error.code === 'NETWORK_ERROR' || error.code === 'UNAVAILABLE') {
  showNetworkError({
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    retry: true,
    onRetry: () => retryEventCreation()
  });
}
```

**5. Unauthenticated Access**

**Trigger:** User not logged in attempts to create event

**Prevention:** Route guard redirects to login before reaching creation page

**Fallback Handling:**
```javascript
if (!currentUser) {
  console.error('Unauthenticated access attempt');
  window.location.href = '../';
  return;
}
```

### Error Recovery Strategies

**Quota Exceeded:**
1. Show clear error message
2. Display current event count
3. Provide link to dashboard
4. Suggest deleting old events
5. Mention upcoming licensing plans

**Network Errors:**
1. Show retry button
2. Preserve form data
3. Allow user to retry without re-entering information
4. Log error for debugging

**Permission Errors:**
1. Distinguish between quota and other permission issues
2. Provide appropriate guidance for each case
3. Log unexpected permission errors
4. Offer refresh/retry options

### Logging Strategy

**Client-Side Logging:**

```javascript
// Log all quota-related events
function logQuotaEvent(eventType, details) {
  console.log(`[QUOTA] ${eventType}:`, {
    timestamp: new Date().toISOString(),
    userId: currentUser?.uid,
    eventCount: details.eventCount,
    ...details
  });
}

// Examples:
logQuotaEvent('CREATION_BLOCKED', { eventCount: 3, reason: 'at_limit' });
logQuotaEvent('CREATION_ALLOWED', { eventCount: 2, remainingQuota: 1 });
logQuotaEvent('DELETION_FREED_QUOTA', { eventCount: 2, previousCount: 3 });
logQuotaEvent('PERMISSION_DENIED', { eventCount: 3, errorCode: 'PERMISSION_DENIED' });
```

**Server-Side Logging:**

Firebase Security Rules don't support custom logging, but Firebase Console provides:
- Rule evaluation logs
- Permission denied events
- Performance metrics

## Testing Strategy

This feature requires a dual testing approach combining unit tests for specific scenarios and property-based tests for comprehensive validation across all possible states.

### Unit Testing

Unit tests validate specific examples, edge cases, and integration points:

**Event Creation Scenarios:**
- User with 0 events creates first event (should succeed)
- User with 2 events creates third event (should succeed)
- User with 3 events attempts to create fourth event (should fail)
- Unauthenticated user attempts to create event (should fail)

**Event Deletion Scenarios:**
- User with 3 events deletes one (count should become 2)
- User with 1 event deletes it (count should become 0)
- Deletion frees quota for new creation

**UI State Scenarios:**
- Button disabled when count = 3
- Button enabled when count < 3
- Banner visible when count = 3
- Banner hidden when count < 3
- Quota display shows correct numbers

**Error Handling Scenarios:**
- Quota error displays appropriate message
- Network error shows retry option
- Permission error classified correctly

### Property-Based Testing

Property tests validate universal properties across randomized inputs:

**Test Configuration:**
- Minimum 100 iterations per property test
- Use fast-check (JavaScript) or similar PBT library
- Each test references its design document property

**Property Test Examples:**

```javascript
// Property 1: Quota Enforcement at Creation
// Feature: event-creation-limit, Property 1: Quota enforcement at creation
test('quota enforcement at creation', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 5 }), // existing event count
      fc.record({
        uid: fc.string(),
        title: fc.string({ minLength: 1, maxLength: 100 }),
        pin: fc.string({ minLength: 6, maxLength: 6 })
      }),
      async (existingCount, eventData) => {
        // Setup: Create user with existingCount events
        const user = await createTestUser();
        await createEventsForUser(user.uid, existingCount);
        
        // Action: Attempt to create new event
        const result = await attemptEventCreation(user, eventData);
        
        // Assert: Should succeed iff existingCount < 3
        if (existingCount < 3) {
          expect(result.success).toBe(true);
        } else {
          expect(result.success).toBe(false);
          expect(result.error.code).toBe('PERMISSION_DENIED');
        }
      }
    ),
    { numRuns: 100 }
  );
});

// Property 8: Button State Based on Quota
// Feature: event-creation-limit, Property 8: Button state based on quota
test('button state based on quota', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 5 }), // event count
      (eventCount) => {
        // Setup: Render UI with given event count
        const ui = renderEventCreationUI({ eventCount });
        
        // Assert: Button disabled iff count >= 3
        const button = ui.getByRole('button', { name: /create event/i });
        const expectedDisabled = eventCount >= 3;
        
        expect(button.disabled).toBe(expectedDisabled);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 10: Deletion Decreases Count
// Feature: event-creation-limit, Property 10: Deletion decreases count
test('deletion decreases count', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 5 }), // initial event count (at least 1)
      fc.integer({ min: 0, max: 10 }), // which event to delete (index)
      async (initialCount, deleteIndex) => {
        // Setup: Create user with initialCount events
        const user = await createTestUser();
        const events = await createEventsForUser(user.uid, initialCount);
        
        // Only proceed if deleteIndex is valid
        if (deleteIndex >= events.length) return true;
        
        // Action: Delete one event
        await deleteEvent(events[deleteIndex].id);
        
        // Assert: Count decreased by 1
        const newCount = await getUserEventCount(user.uid);
        expect(newCount).toBe(initialCount - 1);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 18: Banner Visibility at Limit
// Feature: event-creation-limit, Property 18: Banner visibility at limit
test('banner visibility at limit', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 5 }), // event count
      (eventCount) => {
        // Setup: Render dashboard with given event count
        const ui = renderDashboard({ eventCount });
        
        // Assert: Banner visible iff count >= 3
        const banner = ui.queryByTestId('quota-banner');
        const expectedVisible = eventCount >= 3;
        
        if (expectedVisible) {
          expect(banner).toBeVisible();
        } else {
          expect(banner).not.toBeInTheDocument();
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests validate end-to-end flows:

**Full Creation Flow:**
1. User logs in
2. Navigates to dashboard (sees quota display)
3. Clicks create event
4. Fills form and submits
5. Event created successfully
6. Quota display updates
7. User can see new event in dashboard

**Quota Limit Flow:**
1. User with 3 events logs in
2. Dashboard shows banner
3. Create button is disabled
4. User deletes one event
5. Banner disappears
6. Create button enables
7. User can create new event

**Concurrent Creation Flow:**
1. User with 2 events opens two browser tabs
2. Both tabs attempt to create event simultaneously
3. One succeeds, one fails with quota error
4. Both tabs update to show correct count (3)
5. Create buttons disabled in both tabs

### Firebase Security Rules Testing

Firebase provides a rules testing framework:

```javascript
// test/security-rules.test.js
const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

describe('Event Creation Quota Rules', () => {
  test('allows creation when user has fewer than 3 events', async () => {
    const db = getFirestore(auth);
    
    // Setup: User with 2 events
    await setupUserWithEvents(auth.uid, 2);
    
    // Attempt to create third event
    const eventRef = db.collection('events').doc();
    await assertSucceeds(
      eventRef.set({
        title: 'Test Event',
        creatorId: auth.uid,
        pin: '123456'
      })
    );
  });
  
  test('denies creation when user has 3 events', async () => {
    const db = getFirestore(auth);
    
    // Setup: User with 3 events
    await setupUserWithEvents(auth.uid, 3);
    
    // Attempt to create fourth event
    const eventRef = db.collection('events').doc();
    await assertFails(
      eventRef.set({
        title: 'Test Event',
        creatorId: auth.uid,
        pin: '123456'
      })
    );
  });
});
```

### Test Coverage Goals

- **Security Rules:** 100% of quota enforcement logic
- **Client UI:** 90%+ of quota display and button state logic
- **Error Handling:** 100% of error classification and display logic
- **Integration:** All critical user flows
- **Property Tests:** All 19 correctness properties

### Testing Tools

- **Unit Tests:** Jest + React Testing Library (or vanilla JS testing)
- **Property Tests:** fast-check (JavaScript property-based testing library)
- **Integration Tests:** Cypress or Playwright
- **Firebase Rules Tests:** @firebase/rules-unit-testing
- **Manual Testing:** Cross-browser testing, mobile testing

## Future Extensibility

### Tiered Licensing Architecture

The current implementation uses a hardcoded limit of 3 events. To support tiered licensing in the future, the architecture can be extended as follows:

**Database Structure Addition:**

```
/users/{userId}/
  quota: number  // User-specific quota limit
  tier: string   // "free", "pro", "enterprise"
```

**Updated Security Rules:**

```javascript
{
  "rules": {
    "events": {
      "$eventId": {
        ".write": "auth != null && (
          (!data.exists() && 
           root.child('events')
             .orderByChild('creatorId')
             .equalTo(auth.uid)
             .once('value')
             .numChildren() < root.child('users').child(auth.uid).child('quota').val()) ||
          
          (data.exists() && 
           data.child('creatorId').val() === auth.uid)
        )"
      }
    },
    "users": {
      "$userId": {
        "quota": {
          ".read": "auth.uid === $userId",
          ".write": false  // Only admins can modify quotas
        }
      }
    }
  }
}
```

**Updated Client Code:**

```javascript
class QuotaStateManager {
  async fetchUserQuota(userId) {
    // Fetch user-specific quota from database
    const userRef = firebase.database().ref(`users/${userId}/quota`);
    const snapshot = await userRef.once('value');
    return snapshot.val() || 3; // Default to 3 if not set
  }
  
  async updateState(userId) {
    const [eventCount, quotaLimit] = await Promise.all([
      this.fetchEventCount(userId),
      this.fetchUserQuota(userId)
    ]);
    
    this.state = {
      userId,
      eventCount,
      quotaLimit, // Now dynamic instead of hardcoded 3
      remainingQuota: Math.max(0, quotaLimit - eventCount),
      isAtLimit: eventCount >= quotaLimit,
      lastUpdated: Date.now()
    };
    
    this.notifyListeners();
  }
}
```

**Migration Path:**

1. Add `quota` field to existing users (default: 3)
2. Update Security Rules to read from user quota
3. Update client code to fetch user-specific quota
4. Test thoroughly with different quota values
5. Deploy admin interface for managing user quotas
6. Implement payment/licensing system
7. Update quota values based on user tier

**Backward Compatibility:**

- Existing users automatically get quota of 3
- System works identically for free tier users
- No data migration required for events
- Security Rules remain secure throughout transition

### Configuration Management

To make quota limits easily configurable:

**Constants File:**

```javascript
// config/quota-config.js
export const QUOTA_CONFIG = {
  FREE_TIER_LIMIT: 3,
  PRO_TIER_LIMIT: 25,
  ENTERPRISE_TIER_LIMIT: 100,
  DEFAULT_LIMIT: 3
};

// Usage in code:
import { QUOTA_CONFIG } from './config/quota-config';

const quotaLimit = QUOTA_CONFIG.FREE_TIER_LIMIT;
```

**Environment Variables:**

```javascript
// For different environments (dev, staging, prod)
const QUOTA_LIMIT = process.env.QUOTA_LIMIT || 3;
```

**Firebase Remote Config:**

```javascript
// Dynamic configuration without code deployment
const remoteConfig = firebase.remoteConfig();
await remoteConfig.fetchAndActivate();
const quotaLimit = remoteConfig.getNumber('free_tier_quota_limit');
```

## Implementation Notes

### Firebase Index Requirement

The quota enforcement relies on querying events by `creatorId`. This requires a Firebase index:

**firebase.json:**
```json
{
  "database": {
    "rules": "firebase-security-rules.json"
  },
  "indexes": {
    "events": {
      ".indexOn": ["creatorId"]
    }
  }
}
```

**Deployment:**
```bash
firebase deploy --only database:indexes
```

### Performance Considerations

**Query Performance:**
- Index on `creatorId` ensures O(log n) query time
- Typical user has ≤ 3 events, so query is very fast
- Security Rules evaluation completes in milliseconds

**Client-Side Caching:**
```javascript
// Cache quota state to reduce database queries
class QuotaCache {
  constructor(ttl = 60000) { // 1 minute TTL
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  get(userId) {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    return null;
  }
  
  set(userId, data) {
    this.cache.set(userId, {
      data,
      timestamp: Date.now()
    });
  }
}
```

### Security Considerations

**Defense in Depth:**
1. Firebase Security Rules (primary enforcement)
2. Client-side validation (UX optimization)
3. Authentication verification (route guards)
4. Creator field validation (prevent spoofing)

**Attack Vectors and Mitigations:**

**1. Client-Side Bypass Attempt:**
- Attack: User modifies client code to skip quota check
- Mitigation: Security Rules enforce quota server-side
- Result: Attack fails, permission denied

**2. Creator Field Spoofing:**
- Attack: User attempts to set creatorId to another user's UID
- Mitigation: Security Rules validate creatorId === auth.uid
- Result: Attack fails, permission denied

**3. Concurrent Creation Race:**
- Attack: User opens multiple tabs and creates events simultaneously
- Mitigation: Firebase evaluates rules atomically per write
- Result: Only allowed number of events created

**4. Token Manipulation:**
- Attack: User attempts to modify Firebase auth token
- Mitigation: Firebase validates tokens cryptographically
- Result: Attack fails, authentication error

### Browser Compatibility

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features:**
- ES6+ JavaScript
- Promises/async-await
- localStorage
- Clipboard API (with fallback)

**Polyfills:**
- None required for modern browsers
- Consider polyfills for older browser support if needed

### Accessibility

**Keyboard Navigation:**
- All buttons and controls keyboard accessible
- Tab order follows logical flow
- Enter key submits forms

**Screen Reader Support:**
- ARIA labels on all interactive elements
- Error messages announced to screen readers
- Button state changes announced

**Visual Indicators:**
- Clear disabled state for buttons
- High contrast error messages
- Banner uses appropriate color contrast

**Example ARIA Markup:**

```html
<button 
  id="createEventBtn"
  aria-label="Create new event"
  aria-disabled="true"
  aria-describedby="quotaLimitMessage">
  Create Event
</button>

<div id="quotaLimitMessage" role="status" aria-live="polite">
  You have reached the 3-event limit
</div>

<div id="quotaBanner" role="alert" aria-live="assertive">
  Event limit reached. Licensing plans coming soon!
</div>
```
