# Design Document: Full-Featured Quiz Application

## Overview

This design transforms the MVP Privilege Spectrum application into a full-featured quiz platform with two distinct modes: Free Play (anonymous) and Event Management (authenticated). The architecture maintains the existing Firebase Realtime Database backend while adding Firebase Authentication for Google login, implementing a clear URL structure, and enhancing the user experience with a landing page, dashboard, and improved navigation.

The system follows a client-side architecture with Firebase as the backend service. All business logic runs in the browser, with Firebase providing authentication, real-time data synchronization, and persistence. The design preserves the existing CSS architecture and component patterns while adding new pages and authentication flows.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Landing    │  │  Free Play   │  │    Event     │      │
│  │     Page     │  │     Mode     │  │     Mode     │      │
│  │   (index)    │  │  (questions) │  │  (questions) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Event     │  │    Event     │  │   Spectrum   │      │
│  │  Dashboard   │  │   Creation   │  │     Page     │      │
│  │   (/app)     │  │ (/app/create)│  │  (spectrum)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Authentication Manager                     │    │
│  │         (Firebase Auth + Google OAuth)               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Data Manager                            │    │
│  │         (Firebase RTDB + localStorage)               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Services                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  Firebase Auth       │  │  Realtime Database   │        │
│  │  (Google OAuth)      │  │  (Data Storage)      │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

1. **Landing Page**: Entry point, mode selection, branding
2. **Free Play Mode**: Anonymous quiz with fixed question set
3. **Event Mode**: Authenticated event participation with custom questions
4. **Event Dashboard**: List and manage created events
5. **Event Creation**: Configure and create new events
6. **Spectrum Page**: Visualize participant distribution
7. **Authentication Manager**: Handle Google OAuth flow and session management
8. **Data Manager**: Coordinate Firebase RTDB and localStorage operations

### URL Structure

```
/                                    → Landing Page
/app                                 → Event Dashboard (auth required)
/app/create                          → Event Creation (auth required)
/app/questions.html?id=freeplay      → Free Play Questions
/app/questions.html?id={eventId}     → Event Questions
/app/results.html?id=freeplay        → Free Play Results
/app/results.html?id={eventId}       → Event Results
/app/spectrum.html?id={eventId}      → Spectrum Visualization
```

## Components and Interfaces

### 1. Authentication Manager

**Purpose**: Manage Google OAuth authentication and session state.

**Interface**:
```javascript
class AuthManager {
  // Initialize Firebase Auth with Google provider
  async initialize()
  
  // Trigger Google sign-in flow
  async signInWithGoogle()
  
  // Sign out current user
  async signOut()
  
  // Get current authenticated user
  getCurrentUser()
  
  // Check if user is authenticated
  isAuthenticated()
  
  // Listen for auth state changes
  onAuthStateChanged(callback)
  
  // Get user ID token for API calls
  async getIdToken()
}
```

**Implementation Notes**:
- Use Firebase Authentication SDK v9+ modular API
- Configure Google OAuth provider with appropriate scopes (email, profile)
- Store auth state in memory and sync with Firebase Auth
- Implement auth state persistence using Firebase's built-in session management
- Handle token refresh automatically via Firebase SDK

### 2. Landing Page Component

**Purpose**: Present mode selection and initiate appropriate flows.

**Interface**:
```javascript
class LandingPage {
  // Render landing page UI
  render()
  
  // Handle "Free Play" button click
  onFreePlayClick()
  
  // Handle "Create Event" button click
  onCreateEventClick()
  
  // Check for existing auth session
  checkAuthSession()
}
```

**HTML Structure**:
```html
<div class="landing-container">
  <div class="logo-main">
    <!-- Existing logo structure -->
  </div>
  
  <div class="mode-selection">
    <div class="mode-card free-play">
      <h2>Free Play</h2>
      <p>Take the quiz anonymously</p>
      <button id="freePlayBtn">Start Free Play</button>
    </div>
    
    <div class="mode-card event-mode">
      <h2>Create Your Own Event</h2>
      <p>Customize questions and share with others</p>
      <button id="createEventBtn">Sign in with Google</button>
    </div>
  </div>
</div>
```

### 3. Event Dashboard Component

**Purpose**: Display and manage user's created events.

**Interface**:
```javascript
class EventDashboard {
  // Load user's events from Firebase
  async loadEvents(userId)
  
  // Render events list
  renderEventsList(events)
  
  // Navigate to event creation
  navigateToCreate()
  
  // Navigate to event details
  navigateToEventDetails(eventId)
  
  // Delete event
  async deleteEvent(eventId)
  
  // Copy event link to clipboard
  copyEventLink(eventId)
}
```

**Data Flow**:
1. Check authentication on page load
2. Retrieve user ID from AuthManager
3. Query Firebase RTDB for events where `creatorId === userId`
4. Render events with title, date, participant count, link
5. Set up real-time listener for event updates

### 4. Event Creation Component

**Purpose**: Configure and create new events with custom question selection.

**Interface**:
```javascript
class EventCreation {
  // Initialize with question bank
  initialize(questions)
  
  // Render question selection UI
  renderQuestionSelection()
  
  // Toggle question enabled/disabled
  toggleQuestion(questionIndex)
  
  // Validate event configuration
  validateEvent(title, enabledQuestions)
  
  // Create and save event
  async createEvent(title, disabledQuestions, userId)
  
  // Generate event ID and PIN
  generateEventId()
  generatePin()
  
  // Display created event details
  showEventCreated(eventUrl, pin)
}
```

**Validation Rules**:
- Event title: Required, 1-100 characters
- Enabled questions: Minimum 5 questions
- Creator: Must be authenticated

### 5. Free Play Mode Component

**Purpose**: Provide anonymous quiz experience with aggregated analytics.

**Interface**:
```javascript
class FreePlayMode {
  // Initialize with all enabled questions
  initialize()
  
  // Load questions (all enabled by default)
  loadQuestions()
  
  // Handle answer selection
  selectAnswer(questionIndex, answer)
  
  // Calculate score
  calculateScore()
  
  // Save anonymous response to Firebase
  async saveFreePlayResponse(participant)
  
  // Navigate to results with analytics
  navigateToResults()
  
  // Generate anonymous participant
  generateAnonymousParticipant()
}
```

**Behavior**:
- Use special event ID: "freeplay"
- No PIN required
- Save responses to Firebase for aggregation
- Show ally tips on results page
- Display aggregated analytics instead of spectrum

### 6. Event Participation Component

**Purpose**: Handle event-specific quiz participation with PIN authentication.

**Interface**:
```javascript
class EventParticipation {
  // Load event data
  async loadEvent(eventId)
  
  // Verify PIN
  verifyPin(enteredPin, eventPin)
  
  // Load custom question set
  loadEventQuestions(disabledQuestions)
  
  // Handle answer selection
  selectAnswer(questionIndex, answer)
  
  // Save participant data to Firebase
  async saveParticipant(eventId, participant)
  
  // Navigate to results
  navigateToResults(eventId)
}
```

**Data Flow**:
1. Extract event ID from URL parameter
2. Load event data from Firebase RTDB
3. Display PIN entry screen
4. Verify PIN against event data
5. Load questions (filter by disabled questions)
6. Track answers in localStorage
7. Save completed participant to Firebase
8. Navigate to results with spectrum access

### 7. Spectrum Visualization Component

**Purpose**: Display participant distribution across privilege spectrum.

**Interface**:
```javascript
class SpectrumVisualization {
  // Load event and participants
  async loadEventData(eventId)
  
  // Calculate dynamic spectrum range
  calculateSpectrumRange(enabledQuestions)
  
  // Render spectrum bar
  renderSpectrumBar(min, max, colorInterval)
  
  // Position participants on spectrum
  positionParticipants(participants, min, max)
  
  // Highlight current participant
  highlightParticipant(participantId)
  
  // Set up real-time updates
  setupRealTimeUpdates(eventId)
  
  // Handle search/filter
  filterParticipants(searchTerm)
}
```

**Spectrum Calculation**:
- Determine min/max based on enabled questions
- Use existing dynamic range logic (5-point intervals for ±25, etc.)
- Position participants proportionally within range
- Apply round-robin row allocation for overlapping scores

### 8. Ally Tips Component

**Purpose**: Provide educational content based on privilege score.

**Interface**:
```javascript
class AllyTips {
  // Get tips based on score
  getTipsForScore(score, min, max)
  
  // Render tips UI
  renderTips(tips)
  
  // Categorize score
  categorizeScore(score, min, max)
}
```

**Tip Categories**:
- **High Privilege (score > 60% of max)**: Focus on using privilege to support others
- **Neutral (score between -40% and +40%)**: Focus on awareness and intersectionality
- **Low Privilege (score < -60% of max)**: Focus on self-advocacy and community building

**Sample Tips Content**:
```javascript
const allyTips = {
  highPrivilege: [
    "Use your privilege to amplify marginalized voices",
    "Educate yourself on systemic inequalities",
    "Speak up when you witness discrimination",
    "Support organizations working for equity",
    "Examine your own biases regularly"
  ],
  neutral: [
    "Recognize that privilege is intersectional",
    "Listen to diverse perspectives",
    "Acknowledge both your privileges and challenges",
    "Build coalitions across different communities",
    "Continue learning about social justice"
  ],
  lowPrivilege: [
    "Connect with supportive communities",
    "Practice self-care and set boundaries",
    "Share your story when you feel safe",
    "Seek out resources and support systems",
    "Remember that your experiences are valid"
  ]
};
```

### 9. Free Play Analytics Component

**Purpose**: Display aggregated statistics for free play mode without showing individual participants.

**Interface**:
```javascript
class FreePlayAnalytics {
  // Load all free play responses
  async loadFreePlayResponses()
  
  // Calculate score statistics
  calculateScoreStats(responses)
  
  // Calculate percentile for user's score
  calculatePercentile(userScore, allScores)
  
  // Generate score distribution histogram
  generateScoreDistribution(scores)
  
  // Calculate per-question response rates
  calculateQuestionStats(responses)
  
  // Render analytics UI
  renderAnalytics(userScore, userAnswers, stats)
  
  // Render score comparison
  renderScoreComparison(userScore, percentile, mean, median)
  
  // Render question-by-question comparison
  renderQuestionComparison(userAnswers, questionStats)
}
```

**Analytics Display**:

1. **Score Comparison Section**:
   - User's score prominently displayed
   - Percentile: "You scored higher than X% of participants"
   - Mean score: "Average score: X"
   - Median score: "Median score: X"
   - Score range: "Scores range from X to Y"
   - Total participants: "Based on N responses"

2. **Score Distribution Chart**:
   - Histogram showing distribution of all scores
   - User's score highlighted on the chart
   - Visual representation of where user falls in distribution

3. **Question-by-Question Analysis**:
   - List of all questions
   - For each question:
     - Question text
     - User's answer (Yes/No) highlighted
     - Percentage who answered Yes: "X% answered Yes"
     - Percentage who answered No: "Y% answered No"
     - Visual bar chart showing distribution
   - Sort options: by question order or by response distribution

**Data Structure**:
```javascript
interface FreePlayStats {
  totalResponses: number;
  scoreStats: {
    mean: number;
    median: number;
    min: number;
    max: number;
    distribution: { score: number; count: number }[];
  };
  questionStats: {
    questionIndex: number;
    questionText: string;
    yesCount: number;
    noCount: number;
    yesPercentage: number;
    noPercentage: number;
  }[];
}
```

### 10. Data Manager

**Purpose**: Coordinate data operations between Firebase RTDB and localStorage.

**Interface**:
```javascript
class DataManager {
  // Save event to Firebase
  async saveEvent(eventId, eventData)
  
  // Load event from Firebase
  async loadEvent(eventId)
  
  // Update participant in event
  async updateParticipant(eventId, participant)
  
  // Load events by creator
  async loadEventsByCreator(userId)
  
  // Delete event
  async deleteEvent(eventId)
  
  // Save to localStorage (fallback)
  saveToLocalStorage(key, data)
  
  // Load from localStorage
  loadFromLocalStorage(key)
  
  // Sync localStorage to Firebase
  async syncToFirebase(eventId)
}
```

**Sync Strategy**:
- Primary: Firebase RTDB for cross-device access
- Fallback: localStorage for offline support
- Sync on network reconnection
- Use Firebase's built-in offline persistence

## Data Models

### Firebase Realtime Database Structure

```
/
├── events/
│   ├── freeplay/                    # Special event for free play mode
│   │   └── participants/
│   │       ├── {participantId}/
│   │       │   ├── id: string
│   │       │   ├── score: number
│   │       │   ├── answers: object {questionIndex: answer}
│   │       │   └── createdAt: string (ISO 8601)
│   │       └── ...
│   ├── {eventId}/
│   │   ├── title: string
│   │   ├── pin: string (6 digits)
│   │   ├── creatorId: string (Firebase Auth UID)
│   │   ├── createdAt: string (ISO 8601)
│   │   ├── disabledQuestions: number[] (indices)
│   │   └── participants/
│   │       ├── {participantId}/
│   │       │   ├── id: string
│   │       │   ├── name: string
│   │       │   ├── avatar: string (emoji)
│   │       │   ├── score: number
│   │       │   ├── answers: object {questionIndex: answer}
│   │       │   └── createdAt: string (ISO 8601)
│   │       └── ...
│   └── ...
└── users/
    └── {userId}/
        ├── email: string
        ├── displayName: string
        ├── photoURL: string
        └── createdAt: string (ISO 8601)
```

### Event Model

```typescript
interface Event {
  title: string;
  pin: string;
  creatorId: string;
  createdAt: string;
  disabledQuestions: number[];
  participants: Participant[];
}
```

### Participant Model

```typescript
interface Participant {
  id: string;
  name: string;
  avatar: string;
  score: number;
  answers: { [questionIndex: number]: number };
  createdAt: string;
}
```

### Question Model

```typescript
interface Question {
  text: string;
  value: number;
}
```

### User Model

```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
}
```

### localStorage Structure

```javascript
// Event data (fallback)
localStorage.setItem(`event_${eventId}`, JSON.stringify(eventData));

// Participant session
localStorage.setItem(`participant_${eventId}`, JSON.stringify(participant));

// Disabled questions (for event creation)
localStorage.setItem('disabledQuestions', JSON.stringify(disabledQuestions));

// Event archive (recent events)
localStorage.setItem('eventArchive', JSON.stringify(events));

// Cookie consent
localStorage.setItem('cookieConsent', 'accepted');

// Auth state (managed by Firebase)
// Firebase Auth handles this automatically
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Score Calculation Consistency

*For any* set of question answers, the calculated privilege score should equal the sum of values for questions answered "Yes" (where "No" contributes 0 points).

**Validates: Requirements 2.2, 8.3**

### Property 2: Question Filtering Correctness

*For any* event with a set of disabled question indices, the displayed questions should be exactly those questions whose indices are not in the disabled set.

**Validates: Requirements 2.1, 6.5**

### Property 3: Ally Tips Categorization

*For any* privilege score and spectrum range, the displayed ally tips should match the appropriate category: high privilege tips for scores > 60% of max, neutral tips for scores between -40% and +40%, and low privilege tips for scores < -60% of max.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 4: Event Data Persistence

*For any* event creation with title, PIN, disabled questions, and creator ID, saving to Firebase should result in a document at path `/events/{eventId}` containing all provided fields.

**Validates: Requirements 5.6, 5.8, 11.1, 11.3**

### Property 5: Participant Data Persistence

*For any* participant submission with answers and score, saving to Firebase should result in a document at path `/events/{eventId}/participants/{participantId}` containing the participant's complete data.

**Validates: Requirements 6.6, 11.4, 14.3**

### Property 6: PIN Verification

*For any* event and entered PIN, access should be granted if and only if the entered PIN matches the event's stored PIN.

**Validates: Requirements 6.2**

### Property 7: Event ID Uniqueness

*For any* two events created at different times, their generated event IDs should be distinct.

**Validates: Requirements 5.4**

### Property 8: PIN Format Validation

*For any* generated event PIN, it should be a string of exactly 6 numeric digits.

**Validates: Requirements 5.5**

### Property 9: Spectrum Positioning

*For any* participant with a score and a spectrum range (min, max), the participant's position percentage should equal `((score - min) / (max - min)) * 100`.

**Validates: Requirements 7.3**

### Property 10: Dynamic Spectrum Range Calculation

*For any* event with a specific set of enabled questions, the spectrum range should be determined by the maximum absolute sum of positive or negative question values, mapped to predefined ranges (±25 for 20-25, ±20 for 15-19, ±15 for 10-14, ±10 for 5-9, ±5 for 1-4).

**Validates: Requirements 7.5**

### Property 11: Event URL Structure

*For any* event with an event ID, the participation URL should follow the pattern `/app/questions.html?id={eventId}`, the results URL should follow `/app/results.html?id={eventId}`, and the spectrum URL should follow `/app/spectrum.html?id={eventId}`.

**Validates: Requirements 10.5, 10.7, 10.8**

### Property 12: Authentication State Persistence

*For any* authenticated user, navigating between pages should preserve the authentication state and user information.

**Validates: Requirements 3.2, 3.4**

### Property 13: Event Creator Association

*For any* authenticated user accessing the dashboard, the displayed events should be exactly those events where the `creatorId` field matches the user's ID.

**Validates: Requirements 4.1, 4.5**

### Property 14: Event Display Completeness

*For any* event displayed in the dashboard or details view, all required fields (title, creation date, participant count, access link) should be present in the rendered output.

**Validates: Requirements 4.2, 8.4**

### Property 15: Question Selection Validation

*For any* event creation attempt, the system should reject the creation if fewer than 5 questions are enabled.

**Validates: Requirements 5.3**

### Property 16: Answer Persistence Round-Trip

*For any* participant answering questions, saving answers to localStorage and then reloading the page should restore the exact same set of answers.

**Validates: Requirements 14.1, 14.2**

### Property 17: Unauthenticated Route Protection

*For any* attempt to access an authenticated route (paths starting with `/app` except `/app/questions.html` and `/app/results.html`) without authentication, the system should redirect to the landing page.

**Validates: Requirements 10.9**

### Property 18: Legacy Event Compatibility

*For any* event loaded from Firebase that lacks a `disabledQuestions` field, the system should treat it as having an empty disabled questions array (all questions enabled).

**Validates: Requirements 13.2, 13.3**

### Property 19: Error Message Display

*For any* failed operation (authentication, network request, validation), the system should display an appropriate error message to the user.

**Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.6**

### Property 20: Firebase Error Logging

*For any* Firebase operation that throws an error, the error should be logged to the console with sufficient context for debugging.

**Validates: Requirements 15.5**

### Property 21: Real-Time Data Updates

*For any* change to event participant data in Firebase, the spectrum visualization and analytics displays should update automatically within 5 seconds.

**Validates: Requirements 8.6**

### Property 22: Participant Display Completeness

*For any* participant displayed on the spectrum, the rendered output should include their avatar, name, and score.

**Validates: Requirements 7.6**

### Property 23: Event Session Association

*For any* participant session stored in localStorage, the data should include the event ID as a key component.

**Validates: Requirements 14.6**

### Property 24: Question Bank Display

*For any* event creation interface, all questions from the question bank should be displayed with enable/disable toggles.

**Validates: Requirements 5.2**

### Property 25: Free Play Score Percentile Calculation

*For any* user score and set of all free play scores, the calculated percentile should equal the percentage of scores that are less than or equal to the user's score.

**Validates: Requirements 2A.1**

### Property 26: Question Response Distribution

*For any* question and set of free play responses, the yes percentage should equal (yes count / total responses) * 100, and the no percentage should equal (no count / total responses) * 100.

**Validates: Requirements 2A.4**

### Property 27: Free Play Statistics Completeness

*For any* free play analytics display, all required statistics (mean, median, range, percentile, question distributions) should be present in the rendered output.

**Validates: Requirements 2A.2, 2A.3, 2A.4**

### Property 28: Free Play Response Persistence

*For any* completed free play session, the participant's score and answers should be saved to Firebase under `/events/freeplay/participants/{participantId}`.

**Validates: Requirements 2.7**

## Error Handling

### Authentication Errors

**Google OAuth Failures**:
- Network errors during OAuth flow
- User cancels authentication
- Invalid or expired tokens
- Insufficient permissions

**Handling Strategy**:
```javascript
try {
  const result = await signInWithGoogle();
  // Success flow
} catch (error) {
  if (error.code === 'auth/popup-closed-by-user') {
    // User cancelled - no error message needed
    return;
  } else if (error.code === 'auth/network-request-failed') {
    showError('Network error. Please check your connection and try again.');
  } else {
    showError('Authentication failed. Please try again.');
    console.error('Auth error:', error);
  }
  // Return to landing page
  navigateToLanding();
}
```

### Firebase RTDB Errors

**Common Failures**:
- Network connectivity issues
- Permission denied (security rules)
- Data not found (404)
- Rate limiting
- Quota exceeded

**Handling Strategy**:
```javascript
async function saveEventWithRetry(eventId, eventData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await FirebaseAPI.saveEvent(eventId, eventData);
      return true;
    } catch (error) {
      console.error(`Save attempt ${attempt} failed:`, error);
      
      if (error.code === 'permission-denied') {
        showError('Permission denied. Please sign in again.');
        return false;
      }
      
      if (attempt === maxRetries) {
        showError('Failed to save event. Please try again.');
        return false;
      }
      
      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}
```

**Offline Support**:
- Save to localStorage immediately
- Queue Firebase operations
- Sync when connection restored
- Show offline indicator to user

### Validation Errors

**Event Creation**:
- Empty title: "Please enter an event title"
- Too few questions: "Please enable at least 5 questions"
- Invalid question selection: "Invalid question configuration"

**PIN Entry**:
- Empty PIN: "Please enter a PIN"
- Incorrect PIN: "Invalid PIN. Please try again."
- Too many attempts: Rate limit after 5 failed attempts

**Form Validation**:
```javascript
function validateEventCreation(title, enabledQuestions) {
  const errors = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Event title is required');
  }
  
  if (title.length > 100) {
    errors.push('Event title must be 100 characters or less');
  }
  
  if (enabledQuestions.length < 5) {
    errors.push('At least 5 questions must be enabled');
  }
  
  return errors;
}
```

### Data Loading Errors

**Event Not Found**:
```javascript
async function loadEventWithFallback(eventId) {
  // Try Firebase first
  let eventData = await FirebaseAPI.loadEvent(eventId);
  
  if (!eventData) {
    // Fallback to localStorage
    eventData = JSON.parse(localStorage.getItem(`event_${eventId}`));
  }
  
  if (!eventData) {
    showError(`Event not found (ID: ${eventId})`);
    return null;
  }
  
  return eventData;
}
```

### Session Expiration

**Token Refresh**:
- Firebase Auth handles token refresh automatically
- Listen for auth state changes
- Prompt re-authentication if token invalid
- Preserve user's current page/state

```javascript
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    updateUIForAuthenticatedUser(user);
  } else {
    // User is signed out or token expired
    if (isOnProtectedRoute()) {
      showAuthPrompt('Your session has expired. Please sign in again.');
      navigateToLanding();
    }
  }
});
```

## Testing Strategy

### Dual Testing Approach

This application requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Landing page navigation flows
- PIN entry with correct/incorrect values
- Empty state displays (no events, no participants)
- Error message displays
- Offline mode behavior
- Session expiration handling

**Property-Based Tests**: Verify universal properties across all inputs
- Score calculation for any answer combination
- Question filtering for any disabled question set
- Spectrum positioning for any score and range
- Data persistence round-trips
- URL generation for any event ID
- Ally tips categorization for any score

### Property-Based Testing Configuration

**Library**: Use `fast-check` for JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: full-featured-quiz-app, Property {N}: {property description}`

**Example Property Test**:
```javascript
import fc from 'fast-check';

// Feature: full-featured-quiz-app, Property 1: Score Calculation Consistency
test('score calculation equals sum of yes answers', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        value: fc.integer({ min: -5, max: 5 }),
        answer: fc.integer({ min: 0, max: 1 })
      })),
      (questions) => {
        const expectedScore = questions
          .filter(q => q.answer === 1)
          .reduce((sum, q) => sum + q.value, 0);
        
        const calculatedScore = calculateScore(questions);
        
        return calculatedScore === expectedScore;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Focus Areas

**Authentication Flow**:
- Google sign-in success
- Google sign-in cancellation
- Google sign-in failure
- Session persistence across page loads
- Logout clears session

**Event Creation**:
- Valid event creation
- Validation errors (empty title, too few questions)
- Event ID and PIN generation
- Firebase save success/failure

**Event Participation**:
- Correct PIN grants access
- Incorrect PIN shows error
- Question display matches event configuration
- Answer persistence to localStorage
- Completion triggers Firebase sync

**Spectrum Visualization**:
- Participants positioned correctly
- Dynamic range calculation
- Real-time updates on new participants
- Search/filter functionality
- Mobile scrolling and centering

**Error Handling**:
- Network failures show retry option
- Event not found shows error message
- Authentication failures redirect to landing
- Validation errors display inline

### Integration Testing

**End-to-End Flows**:
1. Landing → Sign in → Dashboard → Create event → Share link
2. Landing → Free play → Answer questions → View results
3. Event link → Enter PIN → Answer questions → View spectrum
4. Dashboard → View event → See analytics → View spectrum

**Cross-Browser Testing**:
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- Test Firebase Auth compatibility
- Test localStorage availability

### Testing Tools

- **Unit Tests**: Jest or Vitest
- **Property Tests**: fast-check
- **E2E Tests**: Playwright or Cypress
- **Firebase Emulator**: For local testing without hitting production
- **Coverage**: Aim for 80%+ code coverage

### Test Data Management

**Generators for Property Tests**:
```javascript
// Generate random questions
const questionGenerator = fc.array(
  fc.record({
    text: fc.string({ minLength: 10, maxLength: 100 }),
    value: fc.integer({ min: -5, max: 5 })
  }),
  { minLength: 5, maxLength: 35 }
);

// Generate random participants
const participantGenerator = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 30 }),
  avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
  score: fc.integer({ min: -25, max: 25 }),
  answers: fc.dictionary(
    fc.integer({ min: 0, max: 34 }).map(String),
    fc.integer({ min: 0, max: 1 })
  )
});

// Generate random events
const eventGenerator = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  pin: fc.integer({ min: 100000, max: 999999 }).map(String),
  disabledQuestions: fc.array(
    fc.integer({ min: 0, max: 34 }),
    { maxLength: 30 }
  ).map(arr => [...new Set(arr)]) // Ensure unique indices
});
```

### Continuous Integration

**CI Pipeline**:
1. Run unit tests
2. Run property tests (100 iterations each)
3. Run linter and type checker
4. Build application
5. Run E2E tests against Firebase emulator
6. Generate coverage report
7. Deploy to staging (on main branch)

**Pre-commit Hooks**:
- Run linter
- Run unit tests
- Check TypeScript types (if using TypeScript)

## Implementation Notes

### Firebase Configuration

**Authentication Setup**:
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
```

**Security Rules**:
```json
{
  "rules": {
    "events": {
      "$eventId": {
        ".read": true,
        ".write": "auth != null && (!data.exists() || data.child('creatorId').val() === auth.uid)",
        "participants": {
          "$participantId": {
            ".write": true
          }
        }
      }
    },
    "users": {
      "$userId": {
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null && auth.uid === $userId"
      }
    }
  }
}
```

### File Structure

```
/
├── index.html                 # Landing page
├── app/
│   ├── index.html            # Dashboard (requires auth)
│   ├── create.html           # Event creation (requires auth)
│   ├── questions.html        # Questions (free play or event)
│   ├── results.html          # Results (free play or event)
│   └── spectrum.html         # Spectrum visualization
├── js/
│   ├── auth-manager.js       # Authentication logic
│   ├── data-manager.js       # Firebase + localStorage
│   ├── landing.js            # Landing page logic
│   ├── dashboard.js          # Dashboard logic
│   ├── event-creation.js     # Event creation logic
│   ├── questions.js          # Questions data
│   ├── event.js              # Event participation logic
│   ├── results.js            # Results display logic
│   ├── spectrum.js           # Spectrum visualization logic
│   └── ally-tips.js          # Ally tips content and logic
├── css/
│   └── styles.css            # Existing styles + new components
├── firebase-config.js        # Firebase configuration
└── README.md
```

### Migration Strategy

**Phase 1: Add Authentication**
- Set up Firebase Auth
- Create AuthManager
- Add Google sign-in to landing page
- Test authentication flow

**Phase 2: Create Landing Page**
- Design and implement landing page
- Add mode selection UI
- Wire up navigation

**Phase 3: Implement Dashboard**
- Create dashboard page
- Implement event listing
- Add event filtering by creator
- Test with existing events

**Phase 4: Update Event Creation**
- Move event creation to /app/create
- Add authentication requirement
- Associate events with creators
- Test event creation flow

**Phase 5: Add Free Play Mode**
- Implement free play questions page
- Add ally tips to results
- Test free play flow

**Phase 6: Enhance Spectrum**
- Create dedicated spectrum page
- Add real-time updates
- Test with multiple participants

**Phase 7: Testing & Polish**
- Write unit tests
- Write property tests
- Fix bugs
- Optimize performance
- Update documentation

### Backward Compatibility Considerations

**URL Redirects**:
```javascript
// Redirect old event.html URLs to questions.html
if (window.location.pathname.includes('event.html')) {
  const newPath = window.location.pathname.replace('event.html', 'questions.html');
  window.location.replace(newPath + window.location.search);
}
```

**Data Migration**:
```javascript
// Handle events without creatorId (created before auth)
function migrateEventData(eventData) {
  if (!eventData.creatorId) {
    eventData.creatorId = 'legacy';
  }
  
  if (!eventData.disabledQuestions) {
    eventData.disabledQuestions = [];
  }
  
  return eventData;
}
```

### Performance Considerations

**Firebase Optimization**:
- Use Firebase's built-in caching
- Implement pagination for large event lists
- Limit real-time listeners to active pages
- Clean up listeners on page unload

**Bundle Size**:
- Use Firebase modular SDK (tree-shakeable)
- Lazy load non-critical components
- Minimize CSS and JavaScript
- Use CDN for Firebase SDK

**Rendering Performance**:
- Virtualize long participant lists
- Debounce search input
- Use CSS transforms for animations
- Optimize spectrum rendering for many participants

## Deployment

### Environment Variables

```
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_DATABASE_URL=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

### Build Process

1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. Build for production: `npm run build`
4. Deploy to hosting: `npm run deploy`

### Hosting

**GitHub Pages** (current):
- Configure custom domain if needed
- Set up HTTPS
- Configure Firebase Auth authorized domains

**Alternative: Firebase Hosting**:
- Better integration with Firebase services
- Automatic SSL
- CDN distribution
- Easy rollback

### Monitoring

**Firebase Analytics**:
- Track page views
- Monitor authentication success/failure rates
- Track event creation and participation
- Monitor error rates

**Console Logging**:
- Log all Firebase operations
- Log authentication events
- Log errors with context
- Use log levels (info, warn, error)

**User Feedback**:
- Add feedback form
- Monitor support emails
- Track common issues
- Iterate based on feedback
