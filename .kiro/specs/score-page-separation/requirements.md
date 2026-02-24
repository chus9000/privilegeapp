# Requirements Document

## Introduction

This feature restructures the information architecture of the quiz application to separate personalized debrief content from group results. Currently, when participants complete questions, they are redirected to results.html where a modal displays their personalized debrief. This change creates a dedicated score.html page for personalized results, making the debrief private to each participant while maintaining group results visibility on results.html.

## Glossary

- **Score_Page**: A new dedicated page (score.html) that displays personalized debrief content for a participant
- **Results_Page**: The existing page (results.html) that displays group results with participant spectrum visualization
- **Debrief**: Personalized analysis of a participant's quiz responses including score meaning, response analysis, and ally tips
- **Participant_Modal**: A modal dialog on the Results_Page that displays participant information when their avatar is clicked
- **Session_Participant**: The specific participant who answered the questions in the current browser session
- **Route_Guard**: The access control system that manages authentication and authorization for protected routes
- **Detailed_Results_Page**: The existing page (detailed-results.html) that shows comprehensive analytics and question-by-question breakdown

## Requirements

### Requirement 1: Create Dedicated Score Page

**User Story:** As a participant who just completed the quiz, I want to see my personalized debrief on a dedicated page, so that I can review my results privately before viewing group results.

#### Acceptance Criteria

1. THE System SHALL create a new score.html page in the /app directory
2. WHEN a participant completes the questions, THE System SHALL redirect to score.html instead of results.html
3. THE Score_Page SHALL display the complete personalized debrief including score meaning, response analysis, and ally tips
4. THE Score_Page SHALL reuse existing debrief-engine.js and debrief-renderer.js functionality
5. THE Score_Page SHALL include navigation buttons to access Results_Page and Detailed_Results_Page

### Requirement 2: Implement Score Page Access Control

**User Story:** As a participant, I want my personalized debrief to be private, so that only I can access my score page and others cannot view my personal results.

#### Acceptance Criteria

1. WHEN a participant accesses score.html, THE Route_Guard SHALL verify they are the Session_Participant for that event
2. IF a user attempts to access score.html via direct URL without being the Session_Participant, THEN THE System SHALL redirect them to the appropriate page
3. THE System SHALL store session participant identification in sessionStorage or localStorage
4. WHEN a participant completes questions, THE System SHALL store their participant identifier for score page access validation
5. THE Score_Page SHALL only display debrief data for the authenticated Session_Participant

### Requirement 3: Update Results Page Modal Behavior

**User Story:** As a participant viewing group results, I want to see summary statistics when clicking on avatars, so that I can understand how others scored without viewing their private debrief.

#### Acceptance Criteria

1. WHEN a user clicks a participant avatar on Results_Page, THE Participant_Modal SHALL display only statistical information
2. THE Participant_Modal SHALL NOT display the full debrief content (score meaning and response analysis)
3. THE Participant_Modal SHALL display participant name, avatar, score, and comparative statistics
4. WHEN the Session_Participant clicks their own avatar, THE Participant_Modal SHALL include a button to navigate to Score_Page
5. WHEN a non-session participant avatar is clicked, THE Participant_Modal SHALL NOT include a Score_Page navigation button

### Requirement 4: Update Navigation Flow

**User Story:** As a participant, I want clear navigation between my score page and group results, so that I can easily move between viewing my personal results and comparing with others.

#### Acceptance Criteria

1. WHEN questions are completed, THE System SHALL redirect to score.html with the event ID as a query parameter
2. THE Score_Page SHALL include a button to navigate to results.html with the same event ID
3. THE Score_Page SHALL include a button to navigate to detailed-results.html with the same event ID
4. WHEN on Results_Page, THE Session_Participant SHALL be able to return to Score_Page via their avatar modal
5. THE System SHALL preserve event ID across all navigation transitions

### Requirement 5: Maintain Backward Compatibility

**User Story:** As a system administrator, I want existing functionality to continue working, so that the restructuring does not break current features.

#### Acceptance Criteria

1. THE System SHALL maintain all existing debrief-engine.js functions without modification
2. THE System SHALL maintain all existing debrief-renderer.js functions without modification
3. THE Results_Page SHALL continue to display the participant spectrum visualization
4. THE Detailed_Results_Page SHALL continue to function with existing navigation
5. THE System SHALL maintain existing route protection for authenticated routes

### Requirement 6: Handle Free Play Mode

**User Story:** As a user in free play mode, I want to see my personalized results, so that I can understand my privilege score even without joining an event.

#### Acceptance Criteria

1. WHEN a participant completes questions in free play mode, THE System SHALL redirect to score.html with id=freeplay
2. THE Score_Page SHALL display personalized debrief for free play participants
3. THE Score_Page SHALL provide navigation to results.html for free play mode
4. WHEN in free play mode on Score_Page, THE System SHALL handle the absence of group comparison data gracefully
5. THE Score_Page SHALL display appropriate messaging when comparative statistics are unavailable in free play mode

### Requirement 7: Preserve Debrief Data Integrity

**User Story:** As a participant, I want my debrief to accurately reflect my responses, so that the personalized analysis is meaningful and correct.

#### Acceptance Criteria

1. WHEN Score_Page loads, THE System SHALL retrieve participant answers from the data layer
2. THE System SHALL pass participant score, answers, and spectrum range to debrief rendering functions
3. THE Score_Page SHALL display the same debrief content that was previously shown in the Results_Page modal
4. WHEN debrief data is unavailable, THE System SHALL display an appropriate error message
5. THE System SHALL log errors when debrief rendering fails without breaking the page

### Requirement 8: Update Route Guard Configuration

**User Story:** As a system architect, I want score.html to have appropriate access control, so that the page is accessible to participants but protected from unauthorized access.

#### Acceptance Criteria

1. THE Route_Guard SHALL classify score.html as a public route (accessible without authentication)
2. THE Route_Guard SHALL enforce session-based access control for Score_Page content
3. WHEN Route_Guard evaluates score.html, THE System SHALL allow page load but validate session participant status
4. THE Score_Page SHALL implement client-side access validation separate from authentication
5. WHEN session validation fails on Score_Page, THE System SHALL redirect to an appropriate fallback page
