# Requirements Document

## Introduction

This document specifies the requirements for consolidating duplicate spectrum visualization pages in the Privilege Spectrum application. Currently, the codebase maintains two nearly identical HTML pages (spectrum.html and results.html) that display the same spectrum visualization with minimal differences. This consolidation will eliminate code duplication, simplify maintenance, and ensure consistent behavior across the application while maintaining backward compatibility for existing links and navigation patterns.

## Glossary

- **Spectrum_Page**: The HTML page that displays the privilege spectrum visualization with participant markers
- **Results_Page**: The consolidated HTML page (results.html) that will serve both spectrum and results viewing use cases
- **Navigation_System**: The collection of JavaScript files and HTML elements that handle routing between pages
- **Route_Guard**: The authentication middleware that controls access to protected and public routes
- **Backward_Compatibility**: The ability for existing links to spectrum.html to continue functioning after consolidation
- **Test_Suite**: The collection of automated tests that verify application behavior
- **Documentation**: README files, guides, and spec documents that describe the application

## Requirements

### Requirement 1: Page Consolidation

**User Story:** As a developer, I want to consolidate duplicate spectrum pages into a single implementation, so that the codebase is easier to maintain and less prone to inconsistencies.

#### Acceptance Criteria

1. THE System SHALL use results.html as the single page for displaying spectrum visualizations
2. THE System SHALL remove spectrum.html from the codebase after consolidation
3. THE System SHALL remove spectrum.js from the codebase after consolidation
4. WHEN results.html loads, THE System SHALL display the spectrum visualization with all existing functionality
5. THE Results_Page SHALL support both event mode and free play mode spectrum displays

### Requirement 2: Backward Compatibility

**User Story:** As a user with existing bookmarks or links, I want old spectrum.html URLs to continue working, so that my saved links remain functional.

#### Acceptance Criteria

1. WHEN a user navigates to spectrum.html, THE System SHALL redirect to results.html with the same query parameters
2. WHEN a redirect occurs, THE System SHALL preserve the event ID in the URL
3. THE System SHALL maintain the same visual appearance and functionality after redirection
4. WHEN spectrum.html is accessed, THE System SHALL complete the redirect within 100ms

### Requirement 3: Navigation Updates

**User Story:** As a developer, I want all internal navigation to use the consolidated page, so that the application uses consistent routing patterns.

#### Acceptance Criteria

1. WHEN results.js navigates to the spectrum view, THE System SHALL navigate to results.html instead of spectrum.html
2. WHEN any JavaScript file references spectrum.html, THE System SHALL update the reference to results.html
3. THE Navigation_System SHALL use results.html for all spectrum-related navigation
4. WHEN the header button is clicked, THE System SHALL navigate to the appropriate destination based on context

### Requirement 4: Route Guard Updates

**User Story:** As a system administrator, I want route guards to reflect the consolidated page structure, so that authentication rules remain correct.

#### Acceptance Criteria

1. WHEN Route_Guard checks public routes, THE System SHALL include results.html in the public routes list
2. WHEN Route_Guard checks public routes, THE System SHALL remove spectrum.html from the public routes list
3. THE Route_Guard SHALL allow unauthenticated access to results.html
4. WHEN authentication is required, THE Route_Guard SHALL enforce rules consistently for results.html

### Requirement 5: Test Suite Updates

**User Story:** As a developer, I want all tests to reflect the consolidated page structure, so that the test suite accurately validates application behavior.

#### Acceptance Criteria

1. WHEN tests reference spectrum.html, THE System SHALL update references to results.html
2. WHEN tests verify navigation, THE System SHALL validate navigation to results.html
3. WHEN tests check route guards, THE System SHALL verify results.html is in the public routes list
4. THE Test_Suite SHALL pass all existing test cases after consolidation
5. WHEN spectrum-specific tests exist, THE System SHALL update or remove them as appropriate

### Requirement 6: Documentation Updates

**User Story:** As a developer reading documentation, I want all references to spectrum.html updated, so that documentation accurately reflects the current codebase structure.

#### Acceptance Criteria

1. WHEN Documentation mentions spectrum.html, THE System SHALL update the reference to results.html
2. WHEN README files describe page structure, THE System SHALL reflect the consolidated architecture
3. WHEN spec files reference spectrum.html, THE System SHALL update to reference results.html
4. THE Documentation SHALL accurately describe the single-page spectrum implementation

### Requirement 7: Functionality Preservation

**User Story:** As a user viewing spectrum results, I want all existing features to work exactly as before, so that the consolidation does not disrupt my workflow.

#### Acceptance Criteria

1. WHEN the consolidated page loads, THE System SHALL display participant markers at correct spectrum positions
2. WHEN a user clicks a participant marker, THE System SHALL open the participant details modal
3. WHEN the search functionality is used, THE System SHALL filter participants correctly
4. WHEN real-time updates occur, THE System SHALL refresh participant data automatically
5. WHEN the page is viewed on mobile, THE System SHALL center the spectrum on zero
6. WHEN free play mode is active, THE System SHALL hide the spectrum and show analytics instead

### Requirement 8: Script Loading

**User Story:** As a developer, I want the consolidated page to load only necessary scripts, so that page performance is optimized.

#### Acceptance Criteria

1. WHEN results.html loads, THE System SHALL load results.js
2. WHEN results.html loads, THE System SHALL load free-play-analytics.js
3. WHEN results.html loads, THE System SHALL NOT load spectrum.js
4. THE Results_Page SHALL maintain the same script loading order as the original results.html
5. WHEN scripts are loaded, THE System SHALL ensure all dependencies are available before execution

### Requirement 9: Modal Content Consistency

**User Story:** As a user viewing participant details, I want the modal to display all relevant information, so that I can see complete participant data.

#### Acceptance Criteria

1. WHEN the participant modal opens, THE System SHALL display the participant avatar
2. WHEN the participant modal opens, THE System SHALL display the participant name
3. WHEN the participant modal opens in event mode, THE System SHALL display the participant score
4. WHEN the participant modal opens, THE System SHALL display the debrief section
5. WHEN the participant modal opens, THE System SHALL display the ally tips section

### Requirement 10: File Cleanup

**User Story:** As a developer, I want obsolete files removed from the codebase, so that the repository remains clean and maintainable.

#### Acceptance Criteria

1. WHEN consolidation is complete, THE System SHALL have deleted spectrum.html
2. WHEN consolidation is complete, THE System SHALL have deleted spectrum.js
3. WHEN file cleanup occurs, THE System SHALL verify no remaining references to deleted files exist
4. THE System SHALL maintain all other files in their current locations
