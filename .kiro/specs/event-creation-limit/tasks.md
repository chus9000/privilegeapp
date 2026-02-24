# Implementation Plan: Event Creation Limit

## Overview

This implementation plan breaks down the event creation limit feature into discrete coding tasks. The approach prioritizes server-side security enforcement first, followed by client-side UI enhancements. Each task builds incrementally, with testing integrated throughout to validate correctness early.

## Tasks

- [x] 1. Update Firebase Security Rules for quota enforcement
  - Modify `firebase-security-rules.json` to add quota validation logic
  - Add rule to count events by creatorId before allowing new event creation
  - Ensure rule allows creation only when count < 3
  - Validate that creatorId matches authenticated user's UID
  - Preserve existing event update permissions
  - Add comments explaining quota logic and future extensibility
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.2, 7.4, 11.5_

- [x] 1.1 Write property test for quota enforcement at creation
  - **Property 1: Quota Enforcement at Creation**
  - **Validates: Requirements 1.1, 1.2**

- [x] 1.2 Write property test for correct event counting by creator
  - **Property 2: Correct Event Counting by Creator**
  - **Validates: Requirements 1.3**

- [x] 1.3 Write property test for creator field validation
  - **Property 15: Creator Field Validation**
  - **Validates: Requirements 7.2**

- [x] 1.4 Write unit test for unauthenticated access rejection
  - Test that unauthenticated users cannot create events
  - _Requirements: 1.5_

- [x] 2. Configure Firebase database index for creatorId
  - Add index configuration for events.creatorId in Firebase console or firebase.json
  - Deploy index to Firebase
  - Verify index is active and queries are optimized
  - _Requirements: 9.2, 9.3, 9.4_

- [x] 3. Create QuotaStateManager class for client-side quota tracking
  - Create new file `app/quota-manager.js`
  - Implement QuotaStateManager class with state management
  - Add methods: initialize(), getUserEventCount(), getRemainingQuota(), updateState()
  - Implement real-time listener setup for quota changes
  - Add subscriber pattern for UI components to listen to quota updates
  - Include cleanup method for removing listeners
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.5_

- [x] 3.1 Write property test for remaining quota calculation
  - **Property 5: Remaining Quota Calculation**
  - **Validates: Requirements 3.2**

- [x] 3.2 Write property test for event count query accuracy
  - **Property 7: Event Count Query Accuracy**
  - **Validates: Requirements 3.4**

- [x] 3.3 Write property test for real-time quota updates
  - **Property 6: Real-Time Quota Updates**
  - **Validates: Requirements 3.3**

- [x] 3.4 Write property test for session-independent count accuracy
  - **Property 16: Session-Independent Count Accuracy**
  - **Validates: Requirements 7.5**

- [x] 4. Add quota display to event creation page
  - Modify `app/event-creation.js` to integrate QuotaStateManager
  - Add HTML elements to `app/create.html` for quota display
  - Display current event count and remaining quota
  - Update display in real-time when quota changes
  - Show clear message when quota is exhausted
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 4.1 Write unit test for quota display rendering
  - Test that quota display shows correct numbers
  - Test that exhausted quota shows appropriate message
  - _Requirements: 3.1, 3.5_

- [x] 5. Implement create button state management
  - Modify `app/event-creation.js` to control button state based on quota
  - Disable button when event count >= 3
  - Enable button when event count < 3
  - Add tooltip explaining why button is disabled
  - Update button state in real-time as quota changes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.1 Write property test for button state based on quota
  - **Property 8: Button State Based on Quota**
  - **Validates: Requirements 4.1, 4.2**

- [x] 5.2 Write property test for button state reactivity
  - **Property 9: Button State Reactivity**
  - **Validates: Requirements 4.4**

- [x] 5.3 Write unit test for disabled button tooltip
  - Test that disabled button shows explanatory tooltip
  - _Requirements: 4.3_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement quota error handling in event creation
  - Modify `app/event-creation.js` handleFormSubmit to catch quota errors
  - Add error classification logic to distinguish quota vs other permission errors
  - Implement showQuotaError() function with user-friendly messaging
  - Include current event count in error message
  - Suggest deleting old events to free quota
  - Ensure UI remains functional after error
  - Add error logging for debugging
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7.1 Write property test for quota error classification
  - **Property 13: Quota Error Classification**
  - **Validates: Requirements 6.2**

- [x] 7.2 Write property test for UI state after error
  - **Property 14: UI State After Error**
  - **Validates: Requirements 6.5**

- [x] 7.3 Write unit test for quota error message content
  - Test that error message includes event count and suggestions
  - _Requirements: 6.1, 6.3_

- [x] 7.4 Write unit test for error logging
  - Test that quota errors are logged with appropriate context
  - _Requirements: 6.4_

- [x] 8. Add quota banner component to dashboard
  - Create banner HTML structure in `app/dashboard.html`
  - Add CSS styling for banner in `styles.css`
  - Implement banner visibility logic in `app/dashboard.js`
  - Show banner when event count >= 3
  - Hide banner when event count < 3
  - Include message about 3-event limit
  - Include message about upcoming licensing plans
  - Add dismiss button functionality
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 8.1 Write property test for banner visibility at limit
  - **Property 18: Banner Visibility at Limit**
  - **Validates: Requirements 10.1, 10.4**

- [x] 8.2 Write property test for banner hidden below limit
  - **Property 19: Banner Hidden Below Limit**
  - **Validates: Requirements 10.5**

- [x] 8.3 Write unit test for banner content
  - Test that banner includes limit message and licensing message
  - _Requirements: 10.2, 10.3_

- [x] 9. Integrate quota tracking with event deletion
  - Modify `app/dashboard.js` confirmDelete() to trigger quota updates
  - Ensure quota display updates after deletion
  - Verify button state updates after deletion
  - Verify banner visibility updates after deletion
  - Test that deletion at limit re-enables creation
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 9.1 Write property test for deletion decreases count
  - **Property 10: Deletion Decreases Count**
  - **Validates: Requirements 5.1**

- [x] 9.2 Write property test for creation after deletion
  - **Property 11: Creation After Deletion**
  - **Validates: Requirements 5.2**

- [x] 9.3 Write property test for deleted events excluded from count
  - **Property 12: Deleted Events Excluded from Count**
  - **Validates: Requirements 5.5**

- [x] 10. Add quota display to dashboard page
  - Modify `app/dashboard.js` to integrate QuotaStateManager
  - Add HTML elements to `app/dashboard.html` for quota display
  - Display quota information in dashboard header or prominent location
  - Update display in real-time when events are created or deleted
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 10.1 Write unit test for dashboard quota display
  - Test that dashboard shows correct quota information
  - _Requirements: 3.1, 3.2_

- [x] 11. Implement concurrent creation protection testing
  - Write integration test simulating concurrent event creation attempts
  - Verify that only allowed number of events are created
  - Test race condition handling
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 11.1 Write property test for concurrent creation atomicity
  - **Property 3: Concurrent Creation Atomicity**
  - **Validates: Requirements 2.1, 2.2**

- [x] 11.2 Write property test for quota error response
  - **Property 4: Quota Error Response**
  - **Validates: Requirements 2.4**

- [x] 12. Add graceful handling for malformed data
  - Modify quota counting logic to handle events with missing creatorId
  - Add validation to skip malformed events in count
  - Ensure quota enforcement continues to work with mixed data
  - Add logging for malformed data detection
  - _Requirements: 8.3_

- [x] 12.1 Write property test for graceful handling of malformed data
  - **Property 17: Graceful Handling of Malformed Data**
  - **Validates: Requirements 8.3**

- [x] 13. Add accessibility features
  - Add ARIA labels to quota display elements
  - Add ARIA labels to create button with disabled state
  - Add role="status" to quota messages
  - Add role="alert" to quota banner
  - Ensure keyboard navigation works for all quota-related UI
  - Test with screen reader
  - _Requirements: General accessibility compliance_

- [x] 13.1 Write unit test for ARIA attributes
  - Test that quota UI elements have appropriate ARIA labels
  - Test that button has aria-disabled attribute when disabled

- [x] 14. Add configuration for future extensibility
  - Create `config/quota-config.js` with quota constants
  - Document how to modify quota limit
  - Add comments in Security Rules explaining tiered licensing extension
  - Document migration path for per-user quotas
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 14.1 Write unit test for configuration loading
  - Test that quota config is loaded correctly
  - Test that default values are used when config is missing

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Integration testing and end-to-end validation
  - Test complete event creation flow with quota enforcement
  - Test quota limit flow (create 3 events, attempt 4th, delete 1, create again)
  - Test concurrent creation from multiple browser tabs
  - Test quota display updates across dashboard and creation page
  - Test banner appearance and dismissal
  - Test error handling for all quota scenarios
  - Verify Security Rules enforcement in Firebase console
  - _Requirements: All requirements_

- [x] 16.1 Write integration test for full creation flow
  - Test user creating events from 0 to 3 and hitting limit

- [x] 16.2 Write integration test for quota limit flow
  - Test creating 3 events, deletion, and creation again

- [x] 16.3 Write integration test for concurrent creation
  - Test multiple simultaneous creation attempts

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Security Rules testing should use Firebase emulator for local testing
- All quota-related UI should be accessible and keyboard-navigable
