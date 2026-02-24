# Design Document: Score Page Separation

## Overview

This design restructures the application's information architecture by creating a dedicated score.html page for personalized debrief content, separating it from the group results view. The change improves privacy by making personalized results accessible only to the participant who answered the questions, while maintaining group visibility on the results page.

The implementation reuses existing debrief-engine.js and debrief-renderer.js modules, updates navigation flows, and implements session-based access control to ensure participants can only view their own personalized debrief.

## Architecture

### Current Flow
```
questions.html → (complete) → results.html → (click avatar) → modal with full debrief
```

### New Flow
```
questions.html → (complete) → score.html (personalized debrief)
                                    ↓
                              [View Results] → results.html → (click avatar) → modal with stats only
                                    ↓                                                    ↓
                              [View Detailed] → detailed-results.html        [Back to My Score] (if own avatar)
```

### Key Architectural Changes

1. **New Page**: score.html displays personalized debrief for the session participant
2. **Modified Redirect**: questions.html completion redirects to score.html instead of results.html
3. **Modified Modal**: results.html modal shows stats only, not full debrief
4. **Session Tracking**: Store participant ID in sessionStorage to identify session participant
5. **Access Control**: Validate session participant on score.html load

## Components and Interfaces

### 1. Score Page (score.html)

**Purpose**: Display personalized debrief for the participant who completed the questions

**Structure**:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Results</title>
    <link rel="stylesheet" href="../styles.css">
</head>
<body class="score-page">
    <div class="score-layout">
        <header class="score-header">
            <div class="logo">Privilege Spectrum</div>
            <h1>Your Personal Results</h1>
        </header>
        
        <div class="score-content">
            <!-- Debrief container populated by JavaScript -->
            <div id="debriefContainer"></div>
            
            <!-- Ally tips container -->
            <div id="allyTipsContainer"></div>
        </div>
        
        <div class="score-actions">
            <button id="viewResultsBtn" class="btn btn-primary">View Group Results</button>
            <button id="viewDetailedBtn" class="btn btn-secondary">View Detailed Analysis</button>
        </div>
    </div>
    
    <footer class="footer">
        <!-- Standard footer -->
    </footer>
    
    <script src="../firebase-config.js"></script>
    <script src="../questions.js"></script>
    <script src="../free-play-analytics.js"></script>
    <script src="../ally-tips.js"></script>
    <script type="module" src="../score.js"></script>
</body>
</html>
```

### 2. Score Page JavaScript (score.js)

**Purpose**: Load and render personalized debrief, handle navigation, validate session access

**Key Functions**:

```javascript
// Get event ID and participant ID from URL and session
function getEventContext() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    const participantId = sessionStorage.getItem(`participant_${eventId}`);
    return { eventId, participantId };
}

// Validate that user is the session participant
async function validateAccess(eventId, participantId) {
    if (!participantId) {
        console.warn('No session participant found');
        redirectToResults(eventId);
        return false;
    }
    return true;
}

// Load participant data from Firebase
async function loadParticipantData(eventId, participantId) {
    // Fetch from Firebase: events/{eventId}/participants/{participantId}
    // Returns: { score, answers, name, avatar }
}

// Render the complete debrief
async function renderDebrief(participant, eventId) {
    // Get spectrum config
    const { min, max } = await getSpectrumConfig(eventId);
    
    // Get analytics data for stat cards
    const analyticsData = await getAnalyticsData(eventId, participant.score);
    
    // Use existing debrief-renderer
    const { renderFreePlayDebrief } = await import('./debrief-renderer.js');
    const debriefHTML = renderFreePlayDebrief(
        participant.score,
        participant.answers,
        min,
        max,
        questions,
        analyticsData
    );
    
    document.getElementById('debriefContainer').innerHTML = debriefHTML;
}

// Render ally tips
function renderAllyTips(score, min, max) {
    const tips = getTipsForScore(score, min, max);
    const category = categorizeScore(score, min, max);
    const tipsHTML = renderTips(tips, category);
    document.getElementById('allyTipsContainer').innerHTML = tipsHTML;
}

// Setup navigation buttons
function setupNavigation(eventId) {
    document.getElementById('viewResultsBtn').onclick = () => {
        window.location.href = `./results.html?id=${eventId}`;
    };
    
    document.getElementById('viewDetailedBtn').onclick = () => {
        window.location.href = `./detailed-results.html?id=${eventId}`;
    };
}

// Main initialization
async function initialize() {
    const { eventId, participantId } = getEventContext();
    
    if (!await validateAccess(eventId, participantId)) {
        return;
    }
    
    const participant = await loadParticipantData(eventId, participantId);
    await renderDebrief(participant, eventId);
    renderAllyTips(participant.score, min, max);
    setupNavigation(eventId);
}

// Redirect helper
function redirectToResults(eventId) {
    window.location.href = `./results.html?id=${eventId}`;
}
```

### 3. Updated event.js

**Changes**: Store participant ID in sessionStorage and redirect to score.html

```javascript
// After participant is created/loaded
function storeSessionParticipant(eventId, participantId) {
    sessionStorage.setItem(`participant_${eventId}`, participantId);
}

// Update results link to point to score.html
function updateResultsLink(eventId) {
    document.getElementById('resultsLink').href = `./score.html?id=${eventId}`;
}

// Call after participant creation
storeSessionParticipant(eventId, participant.id);
updateResultsLink(eventId);
```

### 4. Updated results.js

**Changes**: Modify modal to show stats only, add "Back to My Score" button for session participant

```javascript
// Modified showParticipantModal function
async function showParticipantModal(participantId) {
    const participant = allParticipants.find(p => p.id === participantId);
    if (!participant) return;
    
    // Populate basic info
    document.getElementById('modalAvatar').textContent = participant.avatar;
    document.getElementById('modalName').textContent = participant.name;
    document.getElementById('modalScore').textContent = `Score: ${formatScore(participant.score)}`;
    
    // Render ONLY stat cards (not full debrief)
    const { min, max } = spectrumConfig;
    const modalDebrief = document.getElementById('modalDebrief');
    if (modalDebrief) {
        try {
            const { renderStatCards } = await import('../debrief-renderer.js');
            
            // Calculate analytics data
            const scores = allParticipants.map(p => p.score);
            const sortedScores = [...scores].sort((a, b) => a - b);
            const median = calculateMedian(sortedScores);
            const mean = calculateMean(scores);
            const mode = calculateMode(scores);
            const lessPrivilegedCount = scores.filter(s => s < participant.score).length;
            const percentile = Math.round((lessPrivilegedCount / scores.length) * 100);
            
            // Render only stat cards
            const statCardsHTML = renderStatCards(
                participant.score,
                { mean, median, mode },
                percentile,
                allParticipants.length,
                lessPrivilegedCount
            );
            
            modalDebrief.innerHTML = statCardsHTML;
        } catch (error) {
            console.error('Failed to load stat cards:', error);
            modalDebrief.innerHTML = '';
        }
    }
    
    // Check if this is the session participant
    const eventId = new URLSearchParams(window.location.search).get('id');
    const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
    
    // Add "Back to My Score" button if viewing own avatar
    if (participantId === sessionParticipantId) {
        const backToScoreBtn = document.createElement('button');
        backToScoreBtn.className = 'btn btn-primary';
        backToScoreBtn.textContent = 'View My Full Results';
        backToScoreBtn.onclick = () => {
            window.location.href = `./score.html?id=${eventId}`;
        };
        modalDebrief.appendChild(backToScoreBtn);
    }
    
    // Render ally tips
    const allyTipsArray = getTipsForScore(participant.score, min, max);
    const category = categorizeScore(participant.score, min, max);
    const allyTipsHTML = renderTips(allyTipsArray, category);
    
    const modalAllyTips = document.getElementById('modalAllyTips');
    if (modalAllyTips) {
        modalAllyTips.innerHTML = allyTipsHTML;
    }
    
    // Show modal
    document.getElementById('participantModal').style.display = 'block';
}
```

### 5. Updated debrief-renderer.js

**Changes**: Export renderStatCards as a standalone function

```javascript
// Already exists, just ensure it's exported
export function renderStatCards(userScore, stats = {}, percentile = null, totalParticipants = 0, lessPrivilegedCount = 0) {
    // Existing implementation
    // ...
}
```

### 6. Route Guard Updates

**Changes**: Add score.html to public routes list

```javascript
// In route-guard.js
function isPublicAppRoute(path) {
    const publicRoutes = [
        '/app/questions.html',
        '/app/results.html',
        '/app/score.html',  // Add this
        '/app/spectrum.html'
    ];
    
    return publicRoutes.some(route => path === route);
}
```

## Data Models

### Session Storage Schema

```javascript
// Key: participant_{eventId}
// Value: participantId (string)
{
    "participant_event-123": "participant-abc-456",
    "participant_freeplay": "participant-xyz-789"
}
```

### Participant Data (from Firebase)

```javascript
{
    id: "participant-abc-456",
    name: "John Doe",
    avatar: "😊",
    score: 15,
    answers: {
        "0": 1,
        "1": 0,
        "2": 1,
        // ...
    },
    timestamp: 1234567890
}
```

### Analytics Data Structure

```javascript
{
    stats: {
        mean: 10,
        median: 12,
        mode: 15,
        min: -5,
        max: 25
    },
    percentile: 75,
    totalParticipants: 20,
    lessPrivilegedCount: 15
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Session Participant Access Validation

*For any* attempt to access score.html, the system should verify that the accessing user is the session participant for that event, and deny access if validation fails.

**Validates: Requirements 2.1, 2.2, 8.2, 8.5**

### Property 2: Session Storage Persistence

*For any* participant who completes questions, the system should store their participant identifier in sessionStorage with the key format `participant_{eventId}`, and this identifier should be retrievable on subsequent page loads.

**Validates: Requirements 2.3, 2.4**

### Property 3: Session Participant Data Isolation

*For any* score page load, the displayed debrief data should match only the session participant's data, never displaying another participant's personal results.

**Validates: Requirements 2.5**

### Property 4: Modal Content Restriction

*For any* participant avatar clicked on the results page, the modal should display only statistical information (name, avatar, score, comparative stats) and should not include full debrief sections (score meaning, response analysis).

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Conditional Score Page Navigation

*For any* participant avatar clicked on the results page, the modal should include a "View My Full Results" button if and only if the clicked participant is the session participant.

**Validates: Requirements 3.4, 3.5, 4.4**

### Property 6: Event ID Preservation in Navigation

*For any* navigation transition between score.html, results.html, and detailed-results.html, the event ID query parameter should be preserved in the destination URL.

**Validates: Requirements 4.1, 4.2, 4.3, 4.5**

### Property 7: Data Retrieval Consistency

*For any* score page load, the system should retrieve the participant's answers from the data layer and pass the correct parameters (score, answers, spectrum range) to the debrief rendering functions.

**Validates: Requirements 7.1, 7.2**

### Property 8: Debrief Content Consistency

*For any* participant's debrief, the content rendered on score.html should be equivalent to the content that was previously rendered in the results.html modal (using the same rendering functions and data).

**Validates: Requirements 7.3**

### Property 9: Route Protection Preservation

*For any* authenticated route (dashboard, create event), the route guard should continue to enforce authentication requirements after adding score.html to public routes.

**Validates: Requirements 5.5**

## Error Handling

### Access Validation Failures

**Scenario**: User attempts to access score.html without being the session participant

**Handling**:
1. Check sessionStorage for `participant_{eventId}` key
2. If key is missing or doesn't match any valid participant, redirect to results.html
3. Log warning: "Unauthorized score page access attempt for event {eventId}"
4. Preserve event ID in redirect URL

### Data Loading Failures

**Scenario**: Participant data cannot be loaded from Firebase

**Handling**:
1. Catch error in loadParticipantData function
2. Display user-friendly error message: "Unable to load your results. Please try again."
3. Log error with details: "Failed to load participant data: {error}"
4. Provide "Return to Results" button as fallback
5. Do not break page rendering

### Debrief Rendering Failures

**Scenario**: Debrief rendering functions throw errors

**Handling**:
1. Wrap rendering calls in try-catch blocks
2. Display fallback message: "Your results are being processed. Please refresh the page."
3. Log error: "Debrief rendering failed: {error}"
4. Still display navigation buttons to allow user to proceed
5. Ensure page remains functional

### Missing Analytics Data (Free Play Mode)

**Scenario**: Analytics data unavailable because participant is first or in free play mode

**Handling**:
1. Check if analyticsData is null or totalParticipants === 1
2. Pass null for analyticsData to rendering functions
3. Rendering functions should handle null gracefully by skipping stat cards
4. Display message: "You're the first participant! Invite others to see comparisons."
5. Continue rendering other debrief sections normally

### Session Storage Unavailable

**Scenario**: Browser has sessionStorage disabled or unavailable

**Handling**:
1. Detect sessionStorage availability on page load
2. If unavailable, fall back to localStorage
3. If both unavailable, log error and redirect to results.html
4. Display message: "Your browser settings prevent storing session data. Viewing group results instead."

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Session Storage Operations**
   - Test storing participant ID with correct key format
   - Test retrieving participant ID from sessionStorage
   - Test handling missing sessionStorage keys

2. **Access Validation Logic**
   - Test validateAccess returns true for valid session participant
   - Test validateAccess returns false for missing participant ID
   - Test validateAccess returns false for mismatched participant ID

3. **Navigation Button Setup**
   - Test buttons have correct href values with event ID
   - Test button click handlers trigger correct navigation
   - Test event ID is properly encoded in URLs

4. **Modal Content Rendering**
   - Test modal shows stat cards but not full debrief
   - Test "View My Full Results" button appears for session participant
   - Test button does not appear for non-session participants

5. **Error Handling**
   - Test error message display when data loading fails
   - Test redirect behavior when validation fails
   - Test graceful degradation when analytics unavailable

### Property-Based Tests

Property tests will verify universal correctness across all inputs:

1. **Property Test: Session Participant Access Validation**
   - Generate random event IDs and participant IDs
   - For each combination, test that access is granted only when session matches
   - Verify redirect occurs for unauthorized access
   - **Minimum 100 iterations**
   - **Tag: Feature: score-page-separation, Property 1: Session Participant Access Validation**

2. **Property Test: Session Storage Persistence**
   - Generate random event IDs and participant IDs
   - Store each combination in sessionStorage
   - Verify retrieval returns correct participant ID
   - Test across page reloads (simulate with fresh context)
   - **Minimum 100 iterations**
   - **Tag: Feature: score-page-separation, Property 2: Session Storage Persistence**

3. **Property Test: Session Participant Data Isolation**
   - Generate random participant data sets
   - For each session participant, verify loaded data matches their ID
   - Ensure no data leakage from other participants
   - **Minimum 100 iterations**
   - **Tag: Feature: score-page-separation, Property 3: Session Participant Data Isolation**

4. **Property Test: Modal Content Restriction**
   - Generate random participant data
   - Render modal for each participant
   - Verify modal HTML contains stat elements but not debrief sections
   - Check for absence of score meaning and response analysis elements
   - **Minimum 100 iterations**
   - **Tag: Feature: score-page-separation, Property 4: Modal Content Restriction**

5. **Property Test: Conditional Score Page Navigation**
   - Generate random participant sets with one session participant
   - For each participant, render modal and check button presence
   - Verify button exists only for session participant
   - **Minimum 100 iterations**
   - **Tag: Feature: score-page-separation, Property 5: Conditional Score Page Navigation**

6. **Property Test: Event ID Preservation in Navigation**
   - Generate random event IDs
   - For each navigation path (score→results, score→detailed, results→score)
   - Verify event ID is preserved in destination URL
   - Test URL encoding handles special characters
   - **Minimum 100 iterations**
   - **Tag: Feature: score-page-separation, Property 6: Event ID Preservation in Navigation**

7. **Property Test: Data Retrieval Consistency**
   - Generate random participant data (scores, answers, spectrum ranges)
   - Load score page for each participant
   - Verify rendering functions receive correct parameters
   - Check all required data is passed (score, answers, min, max)
   - **Minimum 100 iterations**
   - **Tag: Feature: score-page-separation, Property 7: Data Retrieval Consistency**

8. **Property Test: Debrief Content Consistency**
   - Generate random participant data
   - Render debrief using both old modal method and new score page method
   - Compare rendered HTML for equivalence (ignoring container differences)
   - Verify same sections appear in same order
   - **Minimum 100 iterations**
   - **Tag: Feature: score-page-separation, Property 8: Debrief Content Consistency**

9. **Property Test: Route Protection Preservation**
   - Generate random route paths (authenticated and public)
   - For each route, verify route guard classification is correct
   - Ensure authenticated routes still require authentication
   - Ensure public routes (including score.html) remain public
   - **Minimum 100 iterations**
   - **Tag: Feature: score-page-separation, Property 9: Route Protection Preservation**

### Integration Tests

Integration tests will verify end-to-end flows:

1. **Complete Question Flow**
   - Complete questions as a participant
   - Verify redirect to score.html with correct event ID
   - Verify session participant ID is stored
   - Verify debrief renders correctly on score page

2. **Navigation Flow**
   - Start on score.html
   - Navigate to results.html
   - Click own avatar to open modal
   - Click "View My Full Results" to return to score.html
   - Verify event ID preserved throughout

3. **Unauthorized Access Flow**
   - Clear sessionStorage
   - Attempt to access score.html directly
   - Verify redirect to results.html
   - Verify appropriate error logging

4. **Free Play Mode Flow**
   - Complete questions in free play mode
   - Verify redirect to score.html?id=freeplay
   - Verify debrief renders without analytics data
   - Verify navigation to results works

### Testing Library

**Property-Based Testing Library**: fast-check (JavaScript)

**Configuration**:
- Minimum 100 iterations per property test
- Use fc.string() for event IDs and participant IDs
- Use fc.integer() for scores within spectrum range
- Use fc.record() for participant data structures
- Use fc.array() for participant lists

**Example Property Test**:
```javascript
import fc from 'fast-check';

// Feature: score-page-separation, Property 1: Session Participant Access Validation
test('Property 1: Session participant access validation', () => {
    fc.assert(
        fc.property(
            fc.string({ minLength: 1 }), // eventId
            fc.string({ minLength: 1 }), // sessionParticipantId
            fc.string({ minLength: 1 }), // attemptingParticipantId
            async (eventId, sessionParticipantId, attemptingParticipantId) => {
                // Setup: Store session participant
                sessionStorage.setItem(`participant_${eventId}`, sessionParticipantId);
                
                // Test: Validate access
                const hasAccess = await validateAccess(eventId, attemptingParticipantId);
                
                // Property: Access granted only when IDs match
                const shouldHaveAccess = sessionParticipantId === attemptingParticipantId;
                expect(hasAccess).toBe(shouldHaveAccess);
                
                // Cleanup
                sessionStorage.clear();
            }
        ),
        { numRuns: 100 }
    );
});
```

## Implementation Notes

### CSS Styling

The score page will reuse existing CSS classes from styles.css:
- `.score-page` for body styling
- `.debrief-container` for debrief sections
- `.stat-cards-container` for statistics display
- `.btn`, `.btn-primary`, `.btn-secondary` for buttons
- `.footer` for footer styling

New CSS classes needed:
```css
.score-layout {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

.score-header {
    text-align: center;
    margin-bottom: 2rem;
}

.score-content {
    margin-bottom: 2rem;
}

.score-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
}
```

### Performance Considerations

1. **Lazy Loading**: Import debrief-renderer.js only when needed using dynamic imports
2. **Caching**: Store spectrum config in memory to avoid repeated Firebase reads
3. **Debouncing**: If implementing real-time updates, debounce Firebase listeners
4. **Minimal Re-renders**: Only update DOM when data actually changes

### Browser Compatibility

- **sessionStorage**: Supported in all modern browsers (IE8+)
- **Dynamic imports**: Supported in modern browsers, may need polyfill for older browsers
- **URL API**: Use URLSearchParams for query parameter handling (IE11+ with polyfill)

### Security Considerations

1. **Client-Side Validation**: Session validation is client-side only, suitable for privacy but not security
2. **Firebase Rules**: Ensure Firebase security rules prevent unauthorized data access
3. **XSS Prevention**: Sanitize any user-generated content before rendering
4. **HTTPS**: Ensure all pages served over HTTPS to protect session data

### Accessibility

1. **Semantic HTML**: Use proper heading hierarchy (h1, h2, h3)
2. **ARIA Labels**: Add aria-labels to navigation buttons
3. **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
4. **Focus Management**: Set focus appropriately when modals open/close
5. **Screen Reader Support**: Ensure debrief content is properly announced

### Migration Strategy

1. **Phase 1**: Create score.html and score.js without changing existing flow
2. **Phase 2**: Update event.js to redirect to score.html (feature flag controlled)
3. **Phase 3**: Update results.js modal to show stats only
4. **Phase 4**: Add session participant tracking
5. **Phase 5**: Enable feature flag for all users
6. **Phase 6**: Remove old modal debrief code after validation period
