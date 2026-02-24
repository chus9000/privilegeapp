# Implementation Plan: Score Page Separation

## Overview

This implementation separates personalized debrief content from group results by creating a dedicated score.html page. The approach involves creating new files (score.html, score.js), updating existing navigation flows (event.js, results.js), implementing session-based access control, and modifying the results page modal to show only statistics. The implementation reuses existing debrief-engine.js and debrief-renderer.js modules to maintain consistency.

## Tasks

- [ ] 1. Create score page structure and basic layout
  - [x] 1.1 Create score.html with header, content area, and navigation buttons
    - Create /app/score.html file with semantic HTML structure
    - Include header with logo and title "Your Personal Results"
    - Add debrief container div with id="debriefContainer"
    - Add ally tips container div with id="allyTipsContainer"
    - Add navigation buttons: "View Group Results" and "View Detailed Analysis"
    - Include standard footer
    - Link to styles.css, firebase-config.js, questions.js, free-play-analytics.js, ally-tips.js
    - Add script tag for score.js as ES module
    - _Requirements: 1.1, 1.5_
  
  - [x] 1.2 Add CSS styling for score page layout
    - Add .score-layout, .score-header, .score-content, .score-actions classes to styles.css
    - Ensure responsive design for mobile and desktop
    - Reuse existing .debrief-container and .stat-cards-container styles
    - _Requirements: 1.3_

- [ ] 2. Implement score page JavaScript logic
  - [x] 2.1 Create score.js with core functions
    - Create /app/score.js file as ES module
    - Implement getEventContext() to extract eventId and participantId from URL and sessionStorage
    - Implement validateAccess() to check if user is session participant
    - Implement redirectToResults() helper function
    - Implement loadParticipantData() to fetch from Firebase
    - Implement getSpectrumConfig() to fetch spectrum range
    - Implement getAnalyticsData() to calculate stats for stat cards
    - _Requirements: 2.1, 2.2, 2.5, 7.1_
  
  - [x] 2.2 Write property test for session participant access validation
    - **Property 1: Session Participant Access Validation**
    - **Validates: Requirements 2.1, 2.2**
  
  - [x] 2.3 Implement debrief rendering on score page
    - Import renderFreePlayDebrief from debrief-renderer.js
    - Call renderFreePlayDebrief with participant data and analytics
    - Render ally tips using getTipsForScore and renderTips
    - Handle rendering errors gracefully with try-catch
    - _Requirements: 1.3, 1.4, 7.2, 7.3_
  
  - [x] 2.4 Write property test for data retrieval consistency
    - **Property 7: Data Retrieval Consistency**
    - **Validates: Requirements 7.1, 7.2**
  
  - [x] 2.5 Setup navigation button handlers
    - Add click handlers for "View Group Results" button → results.html
    - Add click handler for "View Detailed Analysis" button → detailed-results.html
    - Preserve event ID in navigation URLs
    - _Requirements: 4.2, 4.3_
  
  - [x] 2.6 Write property test for event ID preservation
    - **Property 6: Event ID Preservation in Navigation**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**
  
  - [x] 2.7 Implement error handling for score page
    - Handle missing participant data with error message
    - Handle debrief rendering failures gracefully
    - Handle missing analytics data (free play mode)
    - Log errors without breaking page
    - _Requirements: 7.4, 7.5_
  
  - [x] 2.8 Write unit tests for error handling
    - Test error message display when data loading fails
    - Test graceful degradation when analytics unavailable
    - Test error logging behavior

- [ ] 3. Update event.js to redirect to score page
  - [x] 3.1 Implement session participant storage
    - Create storeSessionParticipant() function
    - Store participant ID in sessionStorage with key format `participant_{eventId}`
    - Call after participant is created/loaded
    - _Requirements: 2.3, 2.4_
  
  - [x] 3.2 Write property test for session storage persistence
    - **Property 2: Session Storage Persistence**
    - **Validates: Requirements 2.3, 2.4**
  
  - [x] 3.3 Update results link to point to score.html
    - Modify updateResultsLink() or equivalent function
    - Change href from results.html to score.html
    - Preserve event ID query parameter
    - _Requirements: 1.2, 4.1_
  
  - [x] 3.4 Write unit tests for redirect behavior
    - Test resultsLink href points to score.html with correct event ID
    - Test session participant ID is stored after completion

- [x] 4. Checkpoint - Verify score page loads correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Update results.js modal to show stats only
  - [x] 5.1 Modify showParticipantModal to render only stat cards
    - Remove full debrief rendering (score meaning, response analysis)
    - Keep only renderStatCards call
    - Calculate analytics data (mean, median, mode, percentile)
    - Render stat cards in modalDebrief element
    - Keep ally tips rendering
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 5.2 Write property test for modal content restriction
    - **Property 4: Modal Content Restriction**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  
  - [x] 5.3 Add conditional "View My Full Results" button
    - Check if clicked participant is session participant
    - Get session participant ID from sessionStorage
    - If match, add button to navigate to score.html
    - If no match, do not add button
    - _Requirements: 3.4, 3.5_
  
  - [x] 5.4 Write property test for conditional score page navigation
    - **Property 5: Conditional Score Page Navigation**
    - **Validates: Requirements 3.4, 3.5**
  
  - [x] 5.5 Write unit tests for modal rendering
    - Test modal shows stat cards but not full debrief sections
    - Test "View My Full Results" button appears for session participant
    - Test button does not appear for non-session participants

- [ ] 6. Update debrief-renderer.js exports
  - [x] 6.1 Ensure renderStatCards is exported
    - Verify renderStatCards function has export keyword
    - Test import in score.js and results.js
    - _Requirements: 1.4_
  
  - [x] 6.2 Write property test for debrief content consistency
    - **Property 8: Debrief Content Consistency**
    - **Validates: Requirements 7.3**

- [ ] 7. Update route-guard.js for score page
  - [x] 7.1 Add score.html to public routes list
    - Modify isPublicAppRoute() function
    - Add '/app/score.html' to publicRoutes array
    - _Requirements: 8.1_
  
  - [x] 7.2 Write property test for route protection preservation
    - **Property 9: Route Protection Preservation**
    - **Validates: Requirements 5.5**
  
  - [x] 7.3 Write unit tests for route classification
    - Test score.html is classified as public route
    - Test authenticated routes still require authentication

- [ ] 8. Handle free play mode on score page
  - [x] 8.1 Update score.js to handle free play mode
    - Check if eventId === 'freeplay'
    - Handle absence of group comparison data
    - Display appropriate messaging when analytics unavailable
    - Ensure navigation buttons work in free play mode
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 8.2 Write unit tests for free play mode
    - Test redirect to score.html?id=freeplay after completion
    - Test debrief renders without analytics data
    - Test navigation works in free play mode

- [ ] 9. Integration testing and validation
  - [x] 9.1 Write integration test for complete question flow
    - Test completing questions redirects to score.html
    - Test session participant ID is stored
    - Test debrief renders correctly on score page
  
  - [x] 9.2 Write integration test for navigation flow
    - Test navigation from score.html to results.html
    - Test clicking own avatar opens modal with back button
    - Test returning to score.html preserves event ID
  
  - [x] 9.3 Write integration test for unauthorized access flow
    - Test accessing score.html without session participant
    - Test redirect to results.html occurs
    - Test error logging behavior
  
  - [x] 9.4 Write property test for session participant data isolation
    - **Property 3: Session Participant Data Isolation**
    - **Validates: Requirements 2.5**

- [ ] 10. Verify backward compatibility
  - [x] 10.1 Write unit tests for existing functionality
    - Test results page spectrum visualization still works
    - Test detailed results page navigation still works
    - Test debrief-engine.js functions unchanged
    - Test debrief-renderer.js functions unchanged
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Use fast-check library for property-based testing in JavaScript
