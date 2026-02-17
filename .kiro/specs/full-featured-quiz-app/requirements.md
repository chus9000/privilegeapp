# Requirements Document

## Introduction

This document specifies the requirements for transforming the MVP Privilege Spectrum quiz/survey application into a full-featured application. The transformation introduces a landing page with two distinct modes: Free Play (anonymous, no login) and Event Management (authenticated with Google). The system will maintain the existing Firebase Realtime Database backend while adding authentication, improved navigation, and enhanced user experience features.

## Glossary

- **System**: The Privilege Spectrum web application
- **Landing_Page**: The root page (/) that presents mode selection options
- **Free_Play_Mode**: Anonymous quiz participation using a fixed question set
- **Event_Mode**: Authenticated event creation and management with custom question selection
- **Event_Creator**: A user authenticated via Google who creates and manages events
- **Event_Participant**: An anonymous user who participates in an event via link and PIN
- **Question_Bank**: The collection of 35 privilege spectrum questions
- **Event_Dashboard**: The authenticated interface for managing created events
- **Spectrum_Page**: The results visualization showing participant distribution
- **Score_Screen**: The results page showing individual score and ally tips
- **Ally_Tips**: Educational content about being a better ally based on privilege awareness
- **Firebase_RTDB**: Firebase Realtime Database used for data persistence
- **Google_Auth**: Google OAuth authentication for event creators

## Requirements

### Requirement 1: Landing Page and Mode Selection

**User Story:** As a visitor, I want to see a clear landing page with two options, so that I can choose between free play or creating my own event.

#### Acceptance Criteria

1. WHEN a user visits the root URL, THE Landing_Page SHALL display the application branding
2. WHEN a user visits the root URL, THE Landing_Page SHALL display two distinct options: "Free Play" and "Create Your Own Event"
3. WHEN a user clicks "Free Play", THE System SHALL navigate to the free play questions page without requiring authentication
4. WHEN a user clicks "Create Your Own Event", THE System SHALL initiate Google authentication
5. WHEN Google authentication succeeds, THE System SHALL navigate to the Event_Dashboard

### Requirement 2: Free Play Mode

**User Story:** As an anonymous user, I want to take the quiz without logging in, so that I can quickly explore the privilege spectrum concept.

#### Acceptance Criteria

1. WHEN a user enters Free_Play_Mode, THE System SHALL present all enabled questions from the Question_Bank
2. WHEN a user answers all questions in Free_Play_Mode, THE System SHALL calculate their privilege score
3. WHEN a user completes Free_Play_Mode, THE System SHALL display a Score_Screen with their total score
4. WHEN displaying the Score_Screen in Free_Play_Mode, THE System SHALL show personalized Ally_Tips based on the user's score
5. WHEN in Free_Play_Mode, THE System SHALL NOT require user identification or login
6. WHEN a user accesses Free_Play_Mode, THE System SHALL use a special identifier "freeplay" to distinguish it from events
7. WHEN a user completes Free_Play_Mode, THE System SHALL save their anonymous responses to Firebase_RTDB for aggregation
8. WHEN displaying Free_Play_Mode results, THE System SHALL show aggregated statistics comparing the user's score to all other free play participants
9. WHEN displaying Free_Play_Mode results, THE System SHALL show per-question response distribution comparing the user's answers to others

### Requirement 2A: Free Play Aggregated Analytics

**User Story:** As a free play participant, I want to see how my responses compare to others in aggregate, so that I can understand broader patterns without seeing individual participants.

#### Acceptance Criteria

1. WHEN displaying Free_Play_Mode results, THE System SHALL show the user's score percentile compared to all free play participants
2. WHEN displaying Free_Play_Mode results, THE System SHALL show score distribution statistics (mean, median, range)
3. WHEN displaying Free_Play_Mode results, THE System SHALL display a histogram or distribution chart of all free play scores
4. WHEN displaying per-question analytics, THE System SHALL show the percentage of participants who answered "Yes" vs "No" for each question
5. WHEN displaying per-question analytics, THE System SHALL highlight the user's answer for each question
6. WHEN displaying per-question analytics, THE System SHALL order questions by response distribution or by question order
7. WHEN calculating aggregated statistics, THE System SHALL include all free play responses stored in Firebase_RTDB
8. WHEN no other free play responses exist, THE System SHALL display a message indicating the user is the first participant

### Requirement 3: Google Authentication for Event Creators

**User Story:** As an event creator, I want to log in with my Google account, so that I can securely create and manage my events.

#### Acceptance Criteria

1. WHEN a user selects "Create Your Own Event", THE System SHALL initiate Google_Auth flow
2. WHEN Google_Auth succeeds, THE System SHALL store the user's authentication token securely
3. WHEN Google_Auth fails, THE System SHALL display an error message and return to the Landing_Page
4. WHEN a user is authenticated, THE System SHALL maintain their session across page navigations
5. WHEN a user logs out, THE System SHALL clear their authentication token and return to the Landing_Page
6. WHEN an authenticated session expires, THE System SHALL prompt the user to re-authenticate

### Requirement 4: Event Dashboard

**User Story:** As an authenticated event creator, I want to see a dashboard of my events, so that I can manage them and create new ones.

#### Acceptance Criteria

1. WHEN an authenticated user accesses the Event_Dashboard, THE System SHALL display a list of their created events
2. WHEN displaying events, THE System SHALL show event title, creation date, participant count, and access link for each event
3. WHEN an authenticated user clicks "Create New Event", THE System SHALL navigate to the event creation interface
4. WHEN an authenticated user selects an event, THE System SHALL display event details and analytics
5. WHEN the Event_Dashboard loads, THE System SHALL retrieve events from Firebase_RTDB associated with the authenticated user
6. WHEN no events exist, THE Event_Dashboard SHALL display a message encouraging the user to create their first event

### Requirement 5: Event Creation with Question Selection

**User Story:** As an event creator, I want to create events and select which questions to include, so that I can customize the quiz for my audience.

#### Acceptance Criteria

1. WHEN creating an event, THE System SHALL prompt for an event title
2. WHEN creating an event, THE System SHALL display all questions from the Question_Bank with enable/disable toggles
3. WHEN creating an event, THE System SHALL require at least 5 questions to be enabled
4. WHEN an event is created, THE System SHALL generate a unique event ID
5. WHEN an event is created, THE System SHALL generate a 6-digit numeric PIN
6. WHEN an event is created, THE System SHALL save the event configuration to Firebase_RTDB with the creator's user ID
7. WHEN an event is created, THE System SHALL display the shareable link and PIN to the creator
8. WHEN saving event configuration, THE System SHALL store the list of disabled question indices

### Requirement 6: Event Participation via Link and PIN

**User Story:** As an event participant, I want to access an event using a link and PIN, so that I can participate in a customized quiz.

#### Acceptance Criteria

1. WHEN a participant accesses an event link, THE System SHALL display a PIN entry screen
2. WHEN a participant enters the correct PIN, THE System SHALL grant access to the event questions
3. WHEN a participant enters an incorrect PIN, THE System SHALL display an error and allow retry
4. WHEN a participant accesses an event, THE System SHALL load the event's custom question set from Firebase_RTDB
5. WHEN displaying event questions, THE System SHALL only show questions that were enabled by the event creator
6. WHEN a participant completes an event, THE System SHALL save their responses to Firebase_RTDB associated with the event ID

### Requirement 7: Event Results and Spectrum Visualization

**User Story:** As an event participant, I want to see how my score compares to others, so that I can understand my relative privilege position.

#### Acceptance Criteria

1. WHEN a participant completes an event, THE System SHALL display their individual Score_Screen with Ally_Tips
2. WHEN viewing event results, THE System SHALL provide access to the Spectrum_Page
3. WHEN displaying the Spectrum_Page, THE System SHALL show all participants positioned according to their scores
4. WHEN displaying the Spectrum_Page, THE System SHALL use a color-coded spectrum from -25 to +25
5. WHEN displaying the Spectrum_Page, THE System SHALL dynamically adjust the spectrum range based on the event's enabled questions
6. WHEN displaying the Spectrum_Page, THE System SHALL show participant avatars, names, and scores
7. WHEN a participant views the Spectrum_Page, THE System SHALL highlight their position

### Requirement 8: Event Analytics for Creators

**User Story:** As an event creator, I want to view analytics for my events, so that I can understand participation patterns and results distribution.

#### Acceptance Criteria

1. WHEN an event creator views event details, THE System SHALL display total participant count
2. WHEN an event creator views event details, THE System SHALL display the full Spectrum_Page with all participants
3. WHEN an event creator views event details, THE System SHALL display score distribution statistics (mean, median, mode)
4. WHEN an event creator views event details, THE System SHALL show a list of all participants with their scores
5. WHEN displaying analytics, THE System SHALL retrieve real-time data from Firebase_RTDB
6. WHEN analytics data updates, THE System SHALL refresh the display automatically

### Requirement 9: Ally Tips Content

**User Story:** As a quiz participant, I want to receive educational tips about being a better ally, so that I can learn from my privilege awareness.

#### Acceptance Criteria

1. WHEN displaying a Score_Screen, THE System SHALL include Ally_Tips content
2. WHEN a user has a high privilege score (positive), THE Ally_Tips SHALL focus on using privilege to support others
3. WHEN a user has a low privilege score (negative), THE Ally_Tips SHALL focus on self-advocacy and community building
4. WHEN a user has a neutral score (near zero), THE Ally_Tips SHALL focus on awareness and intersectionality
5. THE Ally_Tips SHALL be educational, actionable, and respectful in tone

### Requirement 10: URL Structure and Navigation

**User Story:** As a user, I want clear and logical URLs, so that I can easily navigate and share specific pages.

#### Acceptance Criteria

1. THE System SHALL use "/" for the Landing_Page
2. THE System SHALL use "/app" for the authenticated Event_Dashboard
3. THE System SHALL use "/app/create" for the event creation interface
4. THE System SHALL use "/app/questions.html?id=freeplay" for Free_Play_Mode questions
5. THE System SHALL use "/app/questions.html?id={eventId}" for event participation questions
6. THE System SHALL use "/app/results.html?id=freeplay" for Free_Play_Mode results
7. THE System SHALL use "/app/results.html?id={eventId}" for event results
8. THE System SHALL use "/app/spectrum.html?id={eventId}" for the Spectrum_Page
9. WHEN a user navigates to an authenticated route without authentication, THE System SHALL redirect to the Landing_Page with Google_Auth prompt

### Requirement 11: Data Persistence and Security

**User Story:** As a system administrator, I want data to be securely stored and properly isolated, so that user privacy is protected and data integrity is maintained.

#### Acceptance Criteria

1. WHEN storing event data, THE System SHALL save to Firebase_RTDB under the path "/events/{eventId}"
2. WHEN storing user authentication data, THE System SHALL use Firebase Authentication secure storage
3. WHEN associating events with creators, THE System SHALL store the creator's user ID with each event
4. WHEN a participant submits responses, THE System SHALL store them under "/events/{eventId}/participants/{participantId}"
5. THE System SHALL enforce Firebase security rules that prevent unauthorized access to event data
6. THE System SHALL enforce Firebase security rules that allow event creators to read/write their own events
7. THE System SHALL enforce Firebase security rules that allow participants to write their own responses but not modify others
8. WHEN storing sensitive data, THE System SHALL NOT store personally identifiable information beyond what Google_Auth provides

### Requirement 12: Responsive Design and Accessibility

**User Story:** As a user on any device, I want the application to work well on my screen size, so that I can participate regardless of device.

#### Acceptance Criteria

1. WHEN accessing the application on mobile devices, THE System SHALL display a responsive layout optimized for small screens
2. WHEN accessing the application on tablets, THE System SHALL display a responsive layout optimized for medium screens
3. WHEN accessing the application on desktop, THE System SHALL display a responsive layout optimized for large screens
4. WHEN displaying the Spectrum_Page on mobile, THE System SHALL allow horizontal scrolling and center on the zero point
5. THE System SHALL maintain the existing CSS architecture and styling patterns
6. THE System SHALL ensure all interactive elements are touch-friendly on mobile devices

### Requirement 13: Backward Compatibility

**User Story:** As a system administrator, I want existing event links to continue working, so that previously shared events remain accessible.

#### Acceptance Criteria

1. WHEN a user accesses an old event link, THE System SHALL redirect to the new URL structure if necessary
2. WHEN loading event data, THE System SHALL handle events created before the transformation
3. WHEN an old event lacks disabled questions data, THE System SHALL assume all questions were enabled
4. THE System SHALL maintain compatibility with existing Firebase_RTDB data structures
5. WHEN migrating to the new structure, THE System SHALL preserve all existing event and participant data

### Requirement 14: Session Management and Offline Support

**User Story:** As a participant, I want my progress to be saved locally, so that I don't lose my answers if I close the browser.

#### Acceptance Criteria

1. WHEN a participant answers questions, THE System SHALL save progress to localStorage
2. WHEN a participant returns to an incomplete event, THE System SHALL restore their previous answers
3. WHEN a participant completes an event, THE System SHALL sync their data to Firebase_RTDB
4. WHEN Firebase_RTDB is unavailable, THE System SHALL continue to function using localStorage
5. WHEN Firebase_RTDB becomes available again, THE System SHALL sync any pending data
6. WHEN a participant's session is stored locally, THE System SHALL associate it with the event ID

### Requirement 15: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when errors occur, so that I understand what went wrong and what to do next.

#### Acceptance Criteria

1. WHEN authentication fails, THE System SHALL display a user-friendly error message
2. WHEN network requests fail, THE System SHALL display a retry option
3. WHEN an event is not found, THE System SHALL display a "Event not found" message with the event ID
4. WHEN a PIN is incorrect, THE System SHALL display "Invalid PIN" and clear the input field
5. WHEN Firebase_RTDB operations fail, THE System SHALL log errors to the console for debugging
6. WHEN required fields are empty, THE System SHALL display validation messages
7. WHEN an event creation fails, THE System SHALL preserve the user's input and allow retry
