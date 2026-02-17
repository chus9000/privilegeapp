# Implementation Plan: Full-Featured Quiz Application

## Overview

This implementation plan transforms the MVP Privilege Spectrum application into a full-featured quiz platform with two modes: Free Play (anonymous with aggregated analytics) and Event Management (authenticated with Google). The implementation follows a phased approach, building on the existing codebase while adding authentication, new pages, and enhanced analytics.

## Tasks

- [x] 1. Set up Firebase Authentication and project structure
  - Configure Firebase Authentication with Google OAuth provider
  - Create auth-manager.js module for authentication logic
  - Set up environment variables for Firebase config
  - Update Firebase security rules to support authenticated and anonymous access
  - _Requirements: 3.1, 3.2, 11.2_

- [x] 1.1 Write property test for authentication token storage
  - **Property 12: Authentication State Persistence**
  - **Validates: Requirements 3.2, 3.4**

- [x] 2. Create landing page with mode selection
  - [x] 2.1 Design and implement landing page HTML structure
    - Create index.html with mode selection cards
    - Add "Free Play" and "Create Your Own Event" buttons
    - Reuse existing logo and branding components
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.2 Implement landing page JavaScript logic
    - Create landing.js module
    - Handle "Free Play" button click (navigate to questions.html?id=freeplay)
    - Handle "Create Event" button click (trigger Google sign-in)
    - Check for existing auth session on page load
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [x] 2.3 Style landing page components
    - Add CSS for mode selection cards
    - Ensure responsive design for mobile/tablet/desktop
    - Maintain existing design aesthetic
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 2.4 Write unit tests for landing page navigation
  - Test free play navigation
  - Test auth trigger on create event click
  - _Requirements: 1.3, 1.4_

- [x] 3. Implement authentication manager
  - [x] 3.1 Create AuthManager class
    - Implement initialize() method
    - Implement signInWithGoogle() method
    - Implement signOut() method
    - Implement getCurrentUser() and isAuthenticated() methods
    - Implement onAuthStateChanged() listener
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [x] 3.2 Add authentication error handling
    - Handle popup closed by user
    - Handle network errors
    - Handle invalid credentials
    - Display user-friendly error messages
    - _Requirements: 3.3, 15.1_
  
  - [x] 3.3 Implement session expiration handling
    - Listen for auth state changes
    - Prompt re-authentication on token expiry
    - Redirect to landing page when needed
    - _Requirements: 3.6_

- [x] 3.4 Write property test for session persistence
  - **Property 12: Authentication State Persistence**
  - **Validates: Requirements 3.2, 3.4**

- [x] 3.5 Write unit tests for authentication flows
  - Test successful sign-in
  - Test sign-in cancellation
  - Test sign-in failure
  - Test logout
  - _Requirements: 3.1, 3.3, 3.5_

- [x] 4. Create event dashboard page
  - [x] 4.1 Create dashboard HTML structure
    - Create app/index.html for dashboard
    - Add event list container
    - Add "Create New Event" button
    - Add sign-out button
    - _Requirements: 4.3_
  
  - [x] 4.2 Implement dashboard JavaScript logic
    - Create dashboard.js module
    - Load events by creator ID from Firebase
    - Render events list with title, date, participant count, link
    - Handle "Create New Event" navigation
    - Handle event selection for details view
    - Implement copy link functionality
    - _Requirements: 4.1, 4.2, 4.4, 4.5_
  
  - [x] 4.3 Add empty state handling
    - Display message when no events exist
    - Encourage user to create first event
    - _Requirements: 4.6_
  
  - [x] 4.4 Style dashboard components
    - Add CSS for event cards
    - Style action buttons
    - Ensure responsive layout
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 4.5 Write property test for event creator association
  - **Property 13: Event Creator Association**
  - **Validates: Requirements 4.1, 4.5**

- [x] 4.6 Write property test for event display completeness
  - **Property 14: Event Display Completeness**
  - **Validates: Requirements 4.2, 8.4**

- [x] 4.7 Write unit tests for dashboard functionality
  - Test event loading
  - Test empty state display
  - Test navigation to create event
  - _Requirements: 4.3, 4.6_

- [x] 5. Checkpoint - Ensure authentication and dashboard work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement event creation page
  - [x] 6.1 Create event creation HTML structure
    - Create app/create.html
    - Add event title input field
    - Add question selection modal (reuse existing modal)
    - Add create button
    - _Requirements: 5.1, 5.2_
  
  - [x] 6.2 Implement event creation JavaScript logic
    - Create event-creation.js module
    - Validate event title (required, max 100 chars)
    - Validate minimum 5 questions enabled
    - Generate unique event ID
    - Generate 6-digit PIN
    - Save event to Firebase with creator ID
    - Display created event details (URL and PIN)
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [x] 6.3 Add validation error handling
    - Display error for empty title
    - Display error for too few questions
    - Preserve user input on error
    - _Requirements: 15.6, 15.7_

- [x] 6.4 Write property test for event ID uniqueness
  - **Property 7: Event ID Uniqueness**
  - **Validates: Requirements 5.4**

- [x] 6.5 Write property test for PIN format
  - **Property 8: PIN Format Validation**
  - **Validates: Requirements 5.5**

- [x] 6.6 Write property test for event data persistence
  - **Property 4: Event Data Persistence**
  - **Validates: Requirements 5.6, 5.8, 11.1, 11.3**

- [x] 6.7 Write property test for question selection validation
  - **Property 15: Question Selection Validation**
  - **Validates: Requirements 5.3**

- [x] 6.8 Write unit tests for event creation
  - Test valid event creation
  - Test validation errors
  - Test event details display
  - _Requirements: 5.1, 5.7, 15.6_

- [x] 7. Update free play mode with analytics
  - [x] 7.1 Modify questions.html to detect free play mode
    - Check for id=freeplay in URL
    - Skip PIN entry for free play
    - Generate anonymous participant (no name/avatar needed)
    - _Requirements: 2.5, 2.6, 2.7_
  
  - [x] 7.2 Implement free play response saving
    - Save anonymous responses to Firebase at /events/freeplay/participants/
    - Store only score and answers (no name/avatar)
    - Handle Firebase save errors gracefully
    - _Requirements: 2.7_
  
  - [x] 7.3 Create free play analytics component
    - Create free-play-analytics.js module
    - Implement loadFreePlayResponses() method
    - Implement calculateScoreStats() method
    - Implement calculatePercentile() method
    - Implement calculateQuestionStats() method
    - _Requirements: 2.8, 2.9, 2A.1, 2A.2, 2A.4_
  
  - [x] 7.4 Implement analytics UI rendering
    - Add score comparison section (percentile, mean, median, range)
    - Add score distribution histogram
    - Add question-by-question comparison
    - Highlight user's score and answers
    - Handle empty state (first participant)
    - _Requirements: 2A.1, 2A.2, 2A.3, 2A.4, 2A.5, 2A.6, 2A.8_
  
  - [x] 7.5 Update results.html for free play mode
    - Detect free play mode (id=freeplay)
    - Display ally tips
    - Display aggregated analytics instead of spectrum link
    - _Requirements: 2.3, 2.4, 2.8, 2.9_

- [x] 7.6 Write property test for free play response persistence
  - **Property 28: Free Play Response Persistence**
  - **Validates: Requirements 2.7**

- [x] 7.7 Write property test for score percentile calculation
  - **Property 25: Free Play Score Percentile Calculation**
  - **Validates: Requirements 2A.1**

- [x] 7.8 Write property test for question response distribution
  - **Property 26: Question Response Distribution**
  - **Validates: Requirements 2A.4**

- [x] 7.9 Write property test for analytics completeness
  - **Property 27: Free Play Statistics Completeness**
  - **Validates: Requirements 2A.2, 2A.3, 2A.4**

- [x] 7.10 Write unit tests for free play analytics
  - Test empty state display
  - Test histogram rendering
  - Test question comparison rendering
  - _Requirements: 2A.8_

- [x] 8. Checkpoint - Ensure free play mode works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update event participation flow
  - [x] 9.1 Add authentication check to event.js
    - Verify event exists in Firebase
    - Display PIN entry screen
    - Verify PIN before granting access
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 9.2 Implement question filtering for events
    - Load event's disabled questions from Firebase
    - Filter question bank to show only enabled questions
    - _Requirements: 6.5_
  
  - [x] 9.3 Update participant data saving
    - Save participant responses to Firebase
    - Associate with event ID
    - Handle save errors with retry
    - _Requirements: 6.6_

- [x] 9.4 Write property test for PIN verification
  - **Property 6: PIN Verification**
  - **Validates: Requirements 6.2**

- [x] 9.5 Write property test for question filtering
  - **Property 2: Question Filtering Correctness**
  - **Validates: Requirements 2.1, 6.5**

- [x] 9.6 Write property test for participant data persistence
  - **Property 5: Participant Data Persistence**
  - **Validates: Requirements 6.6, 11.4, 14.3**

- [x] 9.7 Write unit tests for event participation
  - Test PIN entry screen display
  - Test correct PIN access
  - Test incorrect PIN error
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 10. Create dedicated spectrum page
  - [x] 10.1 Create spectrum.html page
    - Create app/spectrum.html
    - Add spectrum visualization container
    - Add search functionality
    - Add back to results button
    - _Requirements: 7.2_
  
  - [x] 10.2 Move spectrum logic to spectrum.js
    - Extract spectrum rendering from results.js
    - Implement dynamic range calculation
    - Implement participant positioning
    - Implement real-time updates
    - _Requirements: 7.3, 7.4, 7.5, 7.6_
  
  - [x] 10.3 Add current participant highlighting
    - Identify current participant from localStorage
    - Apply visual highlight to their position
    - _Requirements: 7.7_
  
  - [x] 10.4 Update results.html to link to spectrum
    - Add "View Spectrum" button for events
    - Link to /app/spectrum.html?id={eventId}
    - _Requirements: 7.2_

- [x] 10.5 Write property test for spectrum positioning
  - **Property 9: Spectrum Positioning**
  - **Validates: Requirements 7.3**

- [x] 10.6 Write property test for dynamic spectrum range
  - **Property 10: Dynamic Spectrum Range Calculation**
  - **Validates: Requirements 7.5**

- [x] 10.7 Write property test for participant display completeness
  - **Property 22: Participant Display Completeness**
  - **Validates: Requirements 7.6**

- [x] 10.8 Write unit tests for spectrum page
  - Test spectrum rendering
  - Test participant highlighting
  - Test mobile scrolling and centering
  - _Requirements: 7.7, 12.4_

- [x] 11. Implement event analytics for creators
  - [x] 11.1 Create event details view in dashboard
    - Add event details modal or page
    - Display participant count
    - Display score statistics (mean, median, mode)
    - Display participant list with scores
    - Add link to spectrum page
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 11.2 Implement real-time analytics updates
    - Set up Firebase real-time listener for event data
    - Update analytics display when participants join
    - _Requirements: 8.5, 8.6_

- [x] 11.3 Write property test for real-time updates
  - **Property 21: Real-Time Data Updates**
  - **Validates: Requirements 8.6**

- [x] 11.4 Write unit tests for event analytics
  - Test statistics calculation
  - Test participant list display
  - Test real-time updates
  - _Requirements: 8.1, 8.3, 8.4_

- [x] 12. Implement ally tips component
  - [x] 12.1 Create ally-tips.js module
    - Define tip categories (high, neutral, low privilege)
    - Implement getTipsForScore() method
    - Implement categorizeScore() method
    - _Requirements: 9.2, 9.3, 9.4_
  
  - [x] 12.2 Add ally tips to results pages
    - Display tips on free play results
    - Display tips on event results
    - Render tips based on score category
    - _Requirements: 2.4, 9.1_

- [x] 12.3 Write property test for ally tips categorization
  - **Property 3: Ally Tips Categorization**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [x] 13. Implement route protection and URL structure
  - [x] 13.1 Create route guard utility
    - Check authentication for protected routes
    - Redirect to landing page if not authenticated
    - _Requirements: 10.9_
  
  - [x] 13.2 Update all page URLs to match specification
    - Verify / for landing page
    - Verify /app for dashboard
    - Verify /app/create for event creation
    - Verify /app/questions.html?id=freeplay for free play
    - Verify /app/questions.html?id={eventId} for events
    - Verify /app/results.html?id=freeplay for free play results
    - Verify /app/results.html?id={eventId} for event results
    - Verify /app/spectrum.html?id={eventId} for spectrum
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 13.3 Write property test for route protection
  - **Property 17: Unauthenticated Route Protection**
  - **Validates: Requirements 10.9**

- [x] 13.4 Write property test for event URL structure
  - **Property 11: Event URL Structure**
  - **Validates: Requirements 10.5, 10.7, 10.8**

- [x] 13.5 Write unit tests for URL routing
  - Test landing page route
  - Test dashboard route with/without auth
  - Test create route with/without auth
  - _Requirements: 10.1, 10.2, 10.3, 10.9_

- [x] 14. Implement data manager with offline support
  - [x] 14.1 Create data-manager.js module
    - Implement saveEvent() method
    - Implement loadEvent() method
    - Implement updateParticipant() method
    - Implement loadEventsByCreator() method
    - Implement deleteEvent() method
    - _Requirements: 11.1, 11.3, 11.4_
  
  - [x] 14.2 Add localStorage fallback
    - Save to localStorage on all operations
    - Load from localStorage when Firebase unavailable
    - Implement sync queue for offline operations
    - _Requirements: 14.1, 14.2, 14.4_
  
  - [x] 14.3 Implement offline-to-online sync
    - Detect network reconnection
    - Sync pending operations to Firebase
    - _Requirements: 14.5_

- [x] 14.4 Write property test for answer persistence round-trip
  - **Property 16: Answer Persistence Round-Trip**
  - **Validates: Requirements 14.1, 14.2**

- [x] 14.5 Write property test for session association
  - **Property 23: Event Session Association**
  - **Validates: Requirements 14.6**

- [x] 14.6 Write unit tests for offline support
  - Test localStorage fallback
  - Test sync on reconnection
  - _Requirements: 14.4, 14.5_

- [x] 15. Checkpoint - Ensure all core features work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement backward compatibility
  - [x] 16.1 Add URL redirect for old event.html links
    - Detect event.html in URL
    - Redirect to questions.html with same parameters
    - _Requirements: 13.1_
  
  - [x] 16.2 Handle legacy event data
    - Check for missing creatorId field
    - Check for missing disabledQuestions field
    - Apply defaults for legacy events
    - _Requirements: 13.2, 13.3_

- [x] 16.3 Write property test for legacy event compatibility
  - **Property 18: Legacy Event Compatibility**
  - **Validates: Requirements 13.2, 13.3**

- [x] 16.4 Write unit tests for backward compatibility
  - Test old URL redirect
  - Test legacy event loading
  - _Requirements: 13.1, 13.3_

- [x] 17. Implement comprehensive error handling
  - [x] 17.1 Add error handling to all Firebase operations
    - Wrap all Firebase calls in try-catch
    - Log errors to console with context
    - Display user-friendly error messages
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [x] 17.2 Implement retry logic for network failures
    - Add exponential backoff for retries
    - Display retry option to user
    - _Requirements: 15.2_
  
  - [x] 17.3 Add form validation error messages
    - Validate all required fields
    - Display inline validation messages
    - _Requirements: 15.6_

- [x] 17.4 Write property test for error logging
  - **Property 20: Firebase Error Logging**
  - **Validates: Requirements 15.5**

- [x] 17.5 Write property test for error message display
  - **Property 19: Error Message Display**
  - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.6**

- [x] 17.6 Write unit tests for error handling
  - Test authentication error display
  - Test network error retry
  - Test event not found error
  - Test PIN error display
  - Test validation error display
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.6_

- [x] 18. Update Firebase security rules
  - Create security rules file
  - Allow public read for events
  - Allow authenticated write for event creation (creator only)
  - Allow public write for participants
  - Allow authenticated read/write for users collection (own data only)
  - Test security rules with Firebase emulator
  - _Requirements: 11.5, 11.6, 11.7_

- [x] 19. Polish UI and responsive design
  - [x] 19.1 Review and update CSS for all new pages
    - Ensure consistent styling across all pages
    - Maintain existing design aesthetic
    - Add smooth transitions and animations
    - _Requirements: 12.5_
  
  - [x] 19.2 Test responsive layouts on all devices
    - Test on mobile (320px - 767px)
    - Test on tablet (768px - 1023px)
    - Test on desktop (1024px+)
    - Verify spectrum scrolling on mobile
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 19.3 Ensure touch-friendly interactions
    - Verify button sizes (min 44x44px)
    - Test all interactive elements on touch devices
    - _Requirements: 12.6_

- [x] 20. Final testing and integration
  - [x] 20.1 Run all unit tests
    - Verify all unit tests pass
    - Check code coverage (aim for 80%+)
  
  - [x] 20.2 Run all property tests
    - Verify all property tests pass (100 iterations each)
    - Review any failures
  
  - [x] 20.3 Perform end-to-end testing
    - Test complete free play flow
    - Test complete event creation and participation flow
    - Test dashboard and analytics
    - Test on multiple browsers
  
  - [x] 20.4 Test with Firebase emulator
    - Verify all Firebase operations work correctly
    - Test security rules
    - Test offline support

- [x] 21. Final checkpoint - Ensure everything works
  - Ensure all tests pass, ask the user if questions arise.

- [~] 22. Documentation and deployment
  - Update README with new features and setup instructions
  - Document environment variables needed
  - Document Firebase setup steps
  - Create deployment guide
  - Deploy to production (GitHub Pages or Firebase Hosting)

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (100 iterations each)
- Unit tests validate specific examples and edge cases
- The implementation builds on the existing codebase, preserving working functionality
- Firebase Realtime Database is used for all data persistence
- Firebase Authentication handles Google OAuth and session management
- All new JavaScript modules follow the existing code style and patterns
