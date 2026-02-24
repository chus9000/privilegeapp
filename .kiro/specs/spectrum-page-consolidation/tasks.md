# Implementation Plan: Spectrum Page Consolidation

## Overview

This implementation plan consolidates duplicate spectrum visualization pages by keeping results.html as the single source of truth and creating a redirect from spectrum.html. The approach minimizes risk by maintaining backward compatibility while eliminating code duplication. All changes are incremental and testable at each step.

## Tasks

- [x] 1. Create redirect mechanism for backward compatibility
  - Create minimal spectrum.html that redirects to results.html
  - Use both JavaScript redirect and meta refresh for browser compatibility
  - Preserve query parameters during redirect
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 1.1 Write property test for query parameter preservation
  - **Property 1: Query Parameter Preservation on Redirect**
  - **Validates: Requirements 2.1, 2.2**
  - Generate random query strings and verify preservation across redirect
  - Minimum 100 iterations

- [x] 2. Update navigation references in JavaScript files
  - [x] 2.1 Update results.js to remove any references to spectrum.html
    - Search for 'spectrum.html' in results.js
    - Replace with 'results.html'
    - _Requirements: 3.1, 3.2_
  
  - [x] 2.2 Search all JavaScript files for spectrum.html references
    - Use grep to find all references
    - Update each reference to results.html
    - _Requirements: 3.2_
  
  - [x] 2.3 Write unit test for code reference verification
    - Test that no JavaScript files contain 'spectrum.html' references
    - _Requirements: 3.1, 3.2_

- [x] 3. Update route guard configuration
  - [x] 3.1 Modify route-guard.js public routes list
    - Remove '/app/spectrum.html' from publicRoutes array
    - Verify results.html remains in list
    - _Requirements: 4.1, 4.2_
  
  - [x] 3.2 Write unit test for route guard configuration
    - Test that publicRoutes includes results.html
    - Test that publicRoutes does not include spectrum.html
    - Test that unauthenticated access to results.html succeeds
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Checkpoint - Verify navigation and routing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update test suite
  - [x] 5.1 Update spectrum-page.unit.test.js
    - Rename or update to test results.html instead
    - Update all assertions to check results.html
    - _Requirements: 5.1, 5.2_
  
  - [x] 5.2 Update route-guard.unit.test.js
    - Update public routes test assertions
    - Remove spectrum.html from expected public routes
    - _Requirements: 5.3_
  
  - [x] 5.3 Update route-protection.property.test.js
    - Update public routes list in property tests
    - _Requirements: 5.3_
  
  - [x] 5.4 Search and update all test files referencing spectrum.html
    - Use grep to find test files with spectrum.html
    - Update each reference to results.html
    - _Requirements: 5.1, 5.2_
  
  - [x] 5.5 Run full test suite to verify all tests pass
    - Execute all unit tests
    - Execute all property tests
    - Execute all integration tests
    - _Requirements: 5.4_

- [x] 6. Write property tests for functionality preservation
  - [x] 6.1 Write property test for participant positioning
    - **Property 2: Participant Positioning Consistency**
    - **Validates: Requirements 7.1**
    - Generate random participant datasets with varying scores
    - Verify each participant marker positioned correctly
    - Minimum 100 iterations
  
  - [x] 6.2 Write property test for modal interaction
    - **Property 3: Modal Interaction Universality**
    - **Validates: Requirements 7.2**
    - Generate random participant datasets
    - Click each marker and verify modal opens correctly
    - Minimum 100 iterations
  
  - [x] 6.3 Write property test for search filtering
    - **Property 4: Search Filtering Correctness**
    - **Validates: Requirements 7.3**
    - Generate random participant names and search terms
    - Verify filtering works correctly
    - Minimum 100 iterations
  
  - [x] 6.4 Write property test for modal content completeness
    - **Property 5: Modal Content Completeness**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
    - Generate random participant data
    - Verify all modal elements present (avatar, name, debrief, ally tips, score)
    - Minimum 100 iterations

- [x] 7. Update documentation
  - [x] 7.1 Update README.md
    - Replace spectrum.html references with results.html
    - Update page structure descriptions
    - _Requirements: 6.1, 6.2_
  
  - [x] 7.2 Update BUTTON_AUDIT_SUMMARY.md
    - Update button navigation references
    - _Requirements: 6.1_
  
  - [x] 7.3 Update spec files in .kiro/specs/
    - Search for spectrum.html in all spec files
    - Update references to results.html
    - _Requirements: 6.3_
  
  - [x] 7.4 Search all documentation for spectrum.html references
    - Use grep to find all documentation files
    - Update each reference
    - _Requirements: 6.1_

- [x] 8. Verify script loading in results.html
  - [x] 8.1 Confirm results.html loads correct scripts
    - Verify results.js is loaded
    - Verify free-play-analytics.js is loaded
    - Verify spectrum.js is NOT loaded
    - Verify script order matches original results.html
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 8.2 Write unit test for script loading
    - Parse results.html and verify script tags
    - Test correct scripts are present
    - Test spectrum.js is absent
    - Test script order is correct
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. Checkpoint - Verify all functionality preserved
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Verify no remaining references to deleted files
  - [x] 10.1 Search entire codebase for spectrum.html references
    - Use grep across all file types
    - Document any remaining references
    - Update or remove each reference
    - _Requirements: 10.3_
  
  - [x] 10.2 Search entire codebase for spectrum.js references
    - Use grep across all file types
    - Document any remaining references
    - Update or remove each reference
    - _Requirements: 10.3_
  
  - [x] 10.3 Write unit test to verify no references remain
    - Test that codebase contains no spectrum.html references
    - Test that codebase contains no spectrum.js references
    - _Requirements: 10.3_

- [x] 11. Delete obsolete files
  - [x] 11.1 Delete app/spectrum.html (keep redirect version)
    - Verify redirect version is in place
    - Delete original spectrum.html
    - _Requirements: 1.2, 10.1_
  
  - [x] 11.2 Delete app/spectrum.js
    - Verify no remaining references
    - Delete spectrum.js file
    - _Requirements: 1.3, 10.2_
  
  - [x] 11.3 Write unit test for file deletion verification
    - Test that original spectrum.html is deleted
    - Test that spectrum.js is deleted
    - Test that redirect spectrum.html exists
    - _Requirements: 1.2, 1.3, 10.1, 10.2_

- [x] 12. Final checkpoint - Complete verification
  - Run full test suite including all property tests
  - Manually test redirect functionality
  - Verify backward compatibility with old URLs
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- The redirect mechanism ensures backward compatibility for existing bookmarks and links
- All changes are reversible through version control if issues arise
