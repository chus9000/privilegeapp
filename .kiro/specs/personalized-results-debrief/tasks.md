# Implementation Plan: Personalized Results Debrief

## Overview

This implementation plan breaks down the personalized results debrief feature into discrete coding tasks. The feature adds three new sections to the existing results page: score meaning debrief, individual response analysis, and maintains the existing ally tips. The implementation follows a modular approach with `debrief-engine.js` for core logic and `debrief-renderer.js` for display, integrating with the existing results page, free play analytics, and event mode modal.

## Tasks

- [x] 1. Create debrief engine module with core logic
  - [x] 1.1 Implement score categorization function
    - Create `debrief-engine.js` module
    - Implement `categorizePrivilegeScore(score, min, max)` function
    - Implement `normalizeScore(score, min, max)` helper function
    - Use 40-20-40 split for low/neutral/high categories
    - Handle edge case where min equals max (return 0.5 normalized)
    - Clamp score to valid range before normalization
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.2 Write property test for score categorization
    - **Property 2: Score Categorization Algorithm**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

  - [x] 1.3 Implement debrief message generator
    - Create `generateScoreDebrief(category, score)` function
    - Define message templates for low, neutral, and high privilege categories
    - Low: acknowledge challenges, celebrate resilience, encouraging tone
    - Neutral: explain intersectionality, acknowledge mixed status, balanced tone
    - High: recognize advantages, frame as "superpowers", encourage helping others
    - Return object with title, message, and category properties
    - Include fallback for invalid category input
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

  - [x] 1.4 Write property tests for debrief message content
    - **Property 3: Low Privilege Debrief Content**
    - **Property 4: High Privilege Debrief Content**
    - **Property 5: Neutral Privilege Debrief Content**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4**

  - [x] 1.5 Implement response selection algorithm
    - Create `selectResponsesForAnalysis(answers, questions, count)` function
    - Handle both array and object answer formats
    - Filter to answered questions with high educational value (|value| >= 1)
    - Balance selection between positive and negative value questions
    - Select 4 questions by default, return between 3-5
    - Sort selected responses by question index for consistent ordering
    - Return empty array for missing or invalid inputs
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.6 Write property tests for response selection
    - **Property 8: Response Selection Balance**
    - **Property 9: Response Selection Count**
    - **Validates: Requirements 7.3, 7.4**

  - [x] 1.7 Implement response explanation generator
    - Create `generateResponseExplanation(question, answer)` function in `debrief-engine.js`
    - Generate contextual explanations based on question content and answer value
    - Include what the answer reveals about privilege in that context
    - Explain how this aspect of privilege can change across situations
    - Connect to being an ally and understanding others' experiences
    - _Requirements: 6.3, 8.1, 8.2, 8.3, 8.4_

- [x] 2. Checkpoint - Verify debrief engine
  - Ensure all debrief engine tests pass, ask the user if questions arise.

- [x] 3. Create debrief renderer module
  - [x] 3.1 Implement score meaning section renderer
    - Create `debrief-renderer.js` module
    - Implement `renderScoreMeaning(debrief)` function
    - Return HTML string with `.debrief-section.score-meaning` container
    - Include h2 heading, category-specific title (h3), and message paragraph
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 3.2 Implement response analysis section renderer
    - Implement `renderResponseAnalysis(analyzedResponses)` function
    - Create `.response-card` HTML for each analyzed response
    - Include question text, user answer (Yes/No), and contextual explanation
    - Wrap in `.debrief-section.response-analysis` container with h2 heading
    - _Requirements: 6.1, 6.2, 6.3, 10.1, 10.3_

  - [x] 3.3 Write property tests for section rendering
    - **Property 6: Response Analysis Presence**
    - **Property 7: Response Analysis Completeness**
    - **Property 12: Section Headings**
    - **Validates: Requirements 6.1, 6.2, 6.3, 10.3**

  - [x] 3.4 Implement free play mode debrief renderer
    - Implement `renderFreePlayDebrief(score, answers, min, max)` function
    - Orchestrate debrief engine calls: categorize score, generate debrief, select responses, generate explanations
    - Assemble all sections in correct order: score meaning, response analysis
    - Return complete HTML string
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 3.5 Implement event mode modal debrief renderer
    - Implement `renderModalDebrief(participant, min, max)` function
    - Extract score and answers from participant data
    - Generate debrief sections for compact modal display
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 4. Integrate debrief into free play mode
  - [x] 4.1 Modify free play analytics to include debrief sections
    - Import debrief-renderer module into `free-play-analytics.js`
    - Call `renderFreePlayDebrief()` to generate debrief HTML
    - Insert debrief sections between score display and ally tips
    - Maintain existing analytics sections and functionality
    - _Requirements: 12.1, 12.4, 10.1_

  - [x] 4.2 Write property test for free play completeness
    - **Property 13: Free Play Mode Completeness**
    - **Validates: Requirements 12.1**

  - [x] 4.3 Write integration tests for free play mode
    - Test all four sections appear in correct order
    - Test debrief integrates with existing analytics
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 5. Integrate debrief into event mode
  - [x] 5.1 Modify showParticipantModal to include debrief
    - Import debrief-renderer module into event mode code
    - Call `renderModalDebrief()` to generate modal debrief HTML
    - Insert debrief sections after statistics and before ally tips in modal
    - Maintain existing modal functionality (close, spectrum view, etc.)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 5.2 Write property test for event mode debrief
    - **Property 15: Event Mode Modal Debrief**
    - **Validates: Requirements 13.1, 13.2, 13.3**

  - [x] 5.3 Write integration tests for event mode modal
    - Test modal displays debrief sections
    - Test debrief matches participant's category
    - Test existing modal functionality preserved
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 6. Checkpoint - Verify integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add score display formatting
  - [x] 7.1 Update score display formatting in free play and event modes
    - Ensure positive scores display with "+" prefix
    - Ensure negative scores display with "-" prefix
    - Ensure zero displays without prefix
    - Maintain existing score display styling and positioning
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 7.2 Write property test for score formatting
    - **Property 1: Score Display Formatting**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 8. Add CSS styling for debrief sections
  - [x] 8.1 Create debrief section styles
    - Add styles to `styles.css`
    - Style `.debrief-container`, `.debrief-section`, `.score-meaning`, `.response-analysis`
    - Style `.response-card`, `.question-text`, `.your-answer`, `.explanation`
    - Add category-specific visual distinction (subtle color coding or icons for low/neutral/high)
    - Ensure responsive design for mobile, tablet, and desktop
    - Maintain readability across all screen sizes
    - Maintain accessibility (sufficient color contrast)
    - _Requirements: 10.2, 14.1, 14.2, 14.3, 14.4_

- [x] 9. Implement error handling
  - [x] 9.1 Add error handling to debrief engine and renderer
    - Handle invalid scores (clamp to range, log warning)
    - Handle missing answer data (skip response analysis, show other sections)
    - Handle invalid answer format (attempt conversion, fallback gracefully)
    - Handle missing question data (skip response analysis with warning)
    - Catch rendering errors and display fallback messages
    - Preserve existing results page functionality on any error
    - Log errors with stack traces for debugging
    - _Requirements: 15.4_

  - [x] 9.2 Write unit tests for error handling
    - Test invalid score handling (out of range, NaN)
    - Test missing answer data
    - Test invalid answer format
    - Test rendering errors with fallback
    - _Requirements: 15.4_

- [x] 10. Verify section ordering, ally tips integration, and mode consistency
  - [x] 10.1 Write property test for section ordering
    - **Property 11: Section Ordering**
    - **Validates: Requirements 9.3, 10.1**

  - [x] 10.2 Write property test for ally tips integration
    - **Property 10: Ally Tips Integration**
    - **Validates: Requirements 9.1, 9.2**

  - [x] 10.3 Write property test for mode consistency
    - **Property 14: Mode Consistency**
    - **Validates: Requirements 12.2**

- [x] 11. Final checkpoint
  - Run all property-based tests (verify all 15 properties pass with 100+ iterations)
  - Run all unit and integration tests
  - Verify existing tests still pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- The implementation uses JavaScript with ES modules
- fast-check library is used for property-based testing
- Vitest is used as the test runner
