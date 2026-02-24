# Design Document: Spectrum Page Consolidation

## Overview

This design consolidates the duplicate spectrum visualization pages (spectrum.html and results.html) into a single implementation. The consolidation eliminates approximately 100 lines of duplicate HTML and an entire JavaScript file (spectrum.js), while maintaining full backward compatibility through URL redirection. The consolidated results.html will serve as the single source of truth for spectrum visualization, handling both event mode and free play mode scenarios.

## Architecture

### Current Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  spectrum.html  │         │  results.html   │
│  + spectrum.js  │         │  + results.js   │
└─────────────────┘         │  + free-play-   │
                            │    analytics.js │
                            └─────────────────┘
        ↓                           ↓
    [Duplicate Spectrum Visualization]
```

### Target Architecture

```
┌─────────────────────────────────┐
│       results.html              │
│       + results.js              │
│       + free-play-analytics.js  │
└─────────────────────────────────┘
                ↓
    [Single Spectrum Implementation]
                ↑
    [spectrum.html → redirect]
```

### Consolidation Strategy

1. **Keep results.html as primary**: Results.html already contains the more complete implementation with score display and free-play analytics
2. **Remove spectrum.html and spectrum.js**: These files are redundant
3. **Add redirect mechanism**: Create a minimal spectrum.html that redirects to results.html
4. **Update all references**: Change navigation and documentation to use results.html

## Components and Interfaces

### 1. Redirect Mechanism (spectrum.html)

A minimal HTML file that immediately redirects to results.html while preserving query parameters.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=results.html">
    <script>
        // Immediate JavaScript redirect with query parameter preservation
        window.location.replace('results.html' + window.location.search);
    </script>
    <title>Redirecting...</title>
</head>
<body>
    <p>Redirecting to results page...</p>
</body>
</html>
```

**Interface:**
- Input: URL with query parameters (e.g., `?id=event123`)
- Output: Redirect to `results.html` with same query parameters
- Timing: <100ms redirect time

### 2. Consolidated Results Page (results.html)

The existing results.html already contains all necessary functionality:
- Spectrum visualization container
- Participant modal with score display
- Search functionality
- Real-time updates
- Free play mode support

**No changes needed** - this file already has the complete implementation.

### 3. Results JavaScript (results.js)

Update navigation references from spectrum.html to results.html.

**Current code pattern to find:**
```javascript
// Pattern: navigation to spectrum.html
window.location.href = 'spectrum.html?id=' + eventId;
// or
location.href = 'spectrum.html?id=' + eventId;
```

**Updated pattern:**
```javascript
// Pattern: navigation to results.html
window.location.href = 'results.html?id=' + eventId;
```

### 4. Route Guard (route-guard.js)

Update the public routes list to reflect the consolidation.

**Current implementation:**
```javascript
isPublicAppRoute(path) {
    const publicRoutes = [
        '/app/questions.html',
        '/app/results.html',
        '/app/score.html',
        '/app/spectrum.html'  // Remove this
    ];
    return publicRoutes.some(route => path === route);
}
```

**Updated implementation:**
```javascript
isPublicAppRoute(path) {
    const publicRoutes = [
        '/app/questions.html',
        '/app/results.html',
        '/app/score.html'
        // spectrum.html removed - redirects to results.html
    ];
    return publicRoutes.some(route => path === route);
}
```

### 5. Test Suite Updates

**Test files requiring updates:**
- `test/spectrum-page.unit.test.js` - Update or remove
- `test/route-guard.unit.test.js` - Update public routes assertions
- `test/route-protection.property.test.js` - Update public routes list
- Any integration tests referencing spectrum.html

**Update pattern:**
```javascript
// Before
expect(page.url()).toContain('spectrum.html');

// After
expect(page.url()).toContain('results.html');
```

### 6. Documentation Updates

**Files requiring updates:**
- `README.md` - Update page structure descriptions
- `BUTTON_AUDIT_SUMMARY.md` - Update button navigation references
- `.kiro/specs/full-featured-quiz-app/*` - Update spec references
- Any other documentation mentioning spectrum.html

## Data Models

No new data models required. The consolidation uses existing data structures:

### Event Data Structure (unchanged)
```javascript
{
    id: string,
    title: string,
    participants: Array<Participant>,
    disabledQuestions: Array<number>
}
```

### Participant Data Structure (unchanged)
```javascript
{
    id: string,
    name: string,
    avatar: string,
    score: number,
    answers: Array<number> | Object<number, number>
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Query Parameter Preservation on Redirect

*For any* URL query string, when navigating to spectrum.html with that query string, the redirect to results.html should preserve the exact same query string.

**Validates: Requirements 2.1, 2.2**

### Property 2: Participant Positioning Consistency

*For any* set of participant data with valid scores, when the consolidated results page renders the spectrum, each participant marker should be positioned at the correct location corresponding to their score within the dynamic spectrum range.

**Validates: Requirements 7.1**

### Property 3: Modal Interaction Universality

*For any* participant marker displayed on the spectrum, when a user clicks that marker, the system should open the participant details modal with that participant's information.

**Validates: Requirements 7.2**

### Property 4: Search Filtering Correctness

*For any* search term entered by the user, the system should filter the displayed participants such that only participants whose names contain the search term (case-insensitive) remain visible.

**Validates: Requirements 7.3**

### Property 5: Modal Content Completeness

*For any* participant, when their modal is opened, the modal should display all required elements: avatar, name, debrief section, ally tips section, and (in event mode only) score.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

## Error Handling

### Redirect Failures

**Scenario:** spectrum.html redirect mechanism fails
- **Handling:** Fallback meta refresh tag ensures redirect occurs even if JavaScript fails
- **User Experience:** User sees brief "Redirecting..." message before automatic redirect
- **Logging:** No logging needed for successful redirects; browser handles failures naturally

### Missing Query Parameters

**Scenario:** User navigates to results.html without event ID
- **Handling:** Existing error handling in results.js displays "Event not found" message
- **User Experience:** Clear error message with event ID information
- **Logging:** Console logs include debug information about missing parameters

### File Not Found

**Scenario:** User attempts to access deleted spectrum.js
- **Handling:** Browser 404 error; no application impact since file is no longer referenced
- **User Experience:** No user-facing impact; redirect prevents access to deleted files
- **Logging:** Server logs will show 404 if direct access attempted

### Test Failures

**Scenario:** Tests fail after consolidation
- **Handling:** CI/CD pipeline blocks deployment until tests pass
- **User Experience:** No user impact; changes not deployed until validated
- **Logging:** Test runner provides detailed failure information

## Testing Strategy

This consolidation requires both unit tests and integration tests to verify correctness. The testing approach balances specific examples (unit tests) with comprehensive coverage (property tests).

### Unit Testing

Unit tests will focus on:
- **File existence verification**: Confirm spectrum.html and spectrum.js are deleted
- **Code reference checks**: Verify no remaining references to deleted files
- **Route guard configuration**: Validate public routes list is correct
- **Script loading**: Confirm results.html loads correct scripts in correct order
- **Mode-specific behavior**: Test free play mode hides spectrum correctly
- **Mobile centering**: Verify spectrum centers on zero for mobile viewports

### Property-Based Testing

Property tests will verify universal behaviors across all inputs:

**Property Test 1: Query Parameter Preservation**
- Generate random query strings with various parameters
- Navigate to spectrum.html with each query string
- Verify redirect to results.html preserves exact query string
- Minimum 100 iterations
- Tag: **Feature: spectrum-page-consolidation, Property 1: Query parameter preservation on redirect**

**Property Test 2: Participant Positioning**
- Generate random participant datasets with varying scores
- Render spectrum with each dataset
- Verify each participant marker position matches their score
- Minimum 100 iterations
- Tag: **Feature: spectrum-page-consolidation, Property 2: Participant positioning consistency**

**Property Test 3: Modal Interaction**
- Generate random participant datasets
- Click each participant marker
- Verify modal opens with correct participant data
- Minimum 100 iterations
- Tag: **Feature: spectrum-page-consolidation, Property 3: Modal interaction universality**

**Property Test 4: Search Filtering**
- Generate random participant names and search terms
- Apply each search term
- Verify only matching participants remain visible
- Minimum 100 iterations
- Tag: **Feature: spectrum-page-consolidation, Property 4: Search filtering correctness**

**Property Test 5: Modal Content**
- Generate random participant data
- Open modal for each participant
- Verify all required elements present (avatar, name, debrief, ally tips, score in event mode)
- Minimum 100 iterations
- Tag: **Feature: spectrum-page-consolidation, Property 5: Modal content completeness**

### Integration Testing

Integration tests will verify:
- End-to-end navigation flow from dashboard to results page
- Real-time updates continue working after consolidation
- Authentication flow with route guards
- Cross-browser compatibility of redirect mechanism

### Test Configuration

**Property-Based Testing Library:** fast-check (JavaScript/TypeScript)
- Mature library with excellent TypeScript support
- Integrates well with existing test infrastructure
- Provides shrinking for minimal failing examples

**Test Execution:**
- All property tests run with minimum 100 iterations
- Each test tagged with feature name and property reference
- Tests run in CI/CD pipeline before deployment
- Coverage reports track property test execution

### Backward Compatibility Testing

Specific tests for backward compatibility:
- Verify old bookmarks to spectrum.html still work
- Test query parameter preservation across redirect
- Validate no broken links in documentation
- Confirm all navigation paths lead to correct destination

## Implementation Notes

### Migration Sequence

1. **Phase 1: Create redirect** - Add minimal spectrum.html redirect file
2. **Phase 2: Update references** - Change all code references to results.html
3. **Phase 3: Update tests** - Modify test suite for new structure
4. **Phase 4: Update documentation** - Change all documentation references
5. **Phase 5: Verify** - Run full test suite and manual verification
6. **Phase 6: Deploy** - Deploy changes with redirect in place

### Rollback Strategy

If issues arise:
1. Restore original spectrum.html and spectrum.js from version control
2. Revert navigation changes in results.js
3. Restore route guard configuration
4. Redeploy previous version

### Performance Considerations

- Redirect adds <100ms latency (acceptable for backward compatibility)
- No performance impact on results.html (already optimized)
- Reduced bundle size from removing duplicate code
- Faster page loads from fewer HTTP requests

### Browser Compatibility

Redirect mechanism uses two approaches for maximum compatibility:
1. JavaScript `window.location.replace()` - Works in all modern browsers
2. Meta refresh tag - Fallback for browsers with JavaScript disabled
3. Both preserve query parameters correctly

### Accessibility

No accessibility impact:
- Screen readers handle redirects transparently
- Keyboard navigation unchanged
- ARIA labels and roles preserved in consolidated page
- Focus management remains consistent
