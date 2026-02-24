# Design Document: Personalized Results Debrief

## Overview

This design enhances the existing results page with four personalized debriefing sections that provide educational, empathetic, and actionable feedback to quiz participants. The enhancement transforms the results experience from a simple score display into a comprehensive learning tool that helps participants understand privilege as a contextual concept.

The design builds upon the existing results page infrastructure, adding three new sections while preserving the current numeric display and ally tips functionality. The solution supports both free play mode and event mode, integrating seamlessly with existing analytics and modal displays.

### Design Goals

- Provide personalized, empathetic feedback based on privilege scores
- Educate participants about the contextual nature of privilege
- Motivate participants to become allies regardless of their privilege level
- Maintain performance and user experience of existing results page
- Support both free play and event modes with consistent functionality

## Architecture

### System Components

The personalized debrief feature consists of four main components integrated into the existing results page:

1. **Score Categorization Engine**: Analyzes participant scores and assigns privilege categories
2. **Debrief Message Generator**: Produces appropriate messaging based on score categories
3. **Response Analyzer**: Selects and analyzes individual quiz responses for educational insights
4. **Debrief Renderer**: Displays all debrief sections with appropriate styling and layout

### Integration Points

The feature integrates with existing systems:

- **Results Page (results.js)**: Main integration point for free play mode
- **Participant Modal**: Integration point for event mode individual results
- **Ally Tips Module (ally-tips.js)**: Reuses categorization logic and extends functionality
- **Free Play Analytics**: Integrates debrief sections with existing analytics display
- **Spectrum Configuration**: Uses dynamic range for score categorization

### Data Flow

```
Participant Score + Answers
    ↓
Score Categorization Engine
    ↓
[Low/Neutral/High Category]
    ↓
Debrief Message Generator ← Response Analyzer
    ↓                           ↓
[Score Debrief]          [Response Analysis]
    ↓                           ↓
Debrief Renderer
    ↓
Results Page Display
```

## Components and Interfaces

### 1. Score Categorization Engine

**Purpose**: Determine privilege category based on participant score and spectrum range.

**Module**: `debrief-engine.js`

**Functions**:

```javascript
/**
 * Categorize a score into privilege levels
 * @param {number} score - Participant's privilege score
 * @param {number} min - Minimum possible score in spectrum
 * @param {number} max - Maximum possible score in spectrum
 * @returns {string} Category: 'low', 'neutral', or 'high'
 */
function categorizePrivilegeScore(score, min, max)

/**
 * Calculate normalized position of score within range
 * @param {number} score - Participant's privilege score
 * @param {number} min - Minimum possible score
 * @param {number} max - Maximum possible score
 * @returns {number} Normalized value between 0 and 1
 */
function normalizeScore(score, min, max)
```

**Algorithm**:

```
normalized = (score - min) / (max - min)

if normalized > 0.6:
    return 'high'
else if normalized < 0.4:
    return 'low'
else:
    return 'neutral'
```

**Rationale**: Uses 40-20-40 split to create three distinct categories with a neutral middle zone. This aligns with the existing ally tips categorization but uses clearer threshold values.

### 2. Debrief Message Generator

**Purpose**: Generate appropriate debrief messages based on privilege category.

**Module**: `debrief-engine.js`

**Functions**:

```javascript
/**
 * Generate score meaning debrief message
 * @param {string} category - Privilege category ('low', 'neutral', 'high')
 * @param {number} score - Participant's score for context
 * @returns {Object} Debrief object with title and message
 */
function generateScoreDebrief(category, score)
```

**Message Templates**:

**Low Privilege**:
- Title: "Your Journey and Resilience"
- Message: Acknowledges challenging starting context, celebrates progress and resilience, validates experiences, emphasizes strength in overcoming obstacles

**Neutral Privilege**:
- Title: "Understanding Your Mixed Experience"
- Message: Explains intersectionality, acknowledges both advantages and challenges, emphasizes contextual nature of privilege, encourages awareness of both aspects

**High Privilege**:
- Title: "Using Your Advantages to Help Others"
- Message: Recognizes easier circumstances, frames advantages as "superpowers", encourages using privilege to support others, emphasizes responsibility without guilt

**Design Considerations**:
- All messages avoid guilt, shame, or victimization language
- Messages are educational and empowering
- Tone is empathetic and non-judgmental
- Length is concise (2-4 sentences) for readability

### 3. Response Analyzer

**Purpose**: Select and analyze individual quiz responses to demonstrate contextual privilege.

**Module**: `debrief-engine.js`

**Functions**:

```javascript
/**
 * Select responses for analysis
 * @param {Object} answers - Participant's answers (array or object)
 * @param {Array} questions - All quiz questions
 * @param {number} count - Number of responses to analyze (default: 4)
 * @returns {Array} Selected questions with analysis
 */
function selectResponsesForAnalysis(answers, questions, count = 4)

/**
 * Generate contextual explanation for a response
 * @param {Object} question - Question object
 * @param {number} answer - Participant's answer (0 or 1)
 * @returns {string} Contextual explanation
 */
function generateResponseExplanation(question, answer)
```

**Selection Algorithm**:

```
1. Filter questions to those answered by participant
2. Prioritize questions with high absolute values (|value| >= 1)
3. Balance selection between positive and negative value questions
4. Include diverse question topics (economic, social, identity, etc.)
5. Select 4 questions total
6. Sort by question index for consistent ordering
```

**Explanation Generation**:

Each explanation includes:
- What the answer reveals about privilege in that context
- How this aspect of privilege can change
- Why this matters for understanding others' experiences
- Connection to being an ally

**Example**:

Question: "Can you show affection for your romantic partner in public without fear?"
Answer: Yes (privilege)
Explanation: "Being able to express affection publicly is a privilege many LGBTQ+ individuals don't have in all contexts. This privilege can change based on location, community, and laws. Understanding this helps you support those who face discrimination."

### 4. Debrief Renderer

**Purpose**: Display all debrief sections with appropriate styling and layout.

**Module**: `debrief-renderer.js`

**Functions**:

```javascript
/**
 * Render complete debrief UI for free play mode
 * @param {number} score - Participant's score
 * @param {Object} answers - Participant's answers
 * @param {number} min - Spectrum minimum
 * @param {number} max - Spectrum maximum
 * @returns {string} HTML string for debrief sections
 */
function renderFreePlayDebrief(score, answers, min, max)

/**
 * Render debrief UI for event mode modal
 * @param {Object} participant - Participant data
 * @param {number} min - Spectrum minimum
 * @param {number} max - Spectrum maximum
 * @returns {string} HTML string for modal debrief
 */
function renderModalDebrief(participant, min, max)

/**
 * Render score meaning section
 * @param {Object} debrief - Debrief object from generator
 * @returns {string} HTML string
 */
function renderScoreMeaning(debrief)

/**
 * Render response analysis section
 * @param {Array} analyzedResponses - Array of analyzed responses
 * @returns {string} HTML string
 */
function renderResponseAnalysis(analyzedResponses)
```

**HTML Structure**:

```html
<div class="debrief-container">
    <!-- Section 1: Numeric Results (existing) -->
    <div class="score-display">
        <div class="user-score-large">Your Score: +15</div>
    </div>
    
    <!-- Section 2: Score Meaning Debrief (new) -->
    <div class="debrief-section score-meaning">
        <h2>Understanding Your Score</h2>
        <div class="debrief-content">
            <h3>[Category-specific title]</h3>
            <p>[Category-specific message]</p>
        </div>
    </div>
    
    <!-- Section 3: Response Analysis (new) -->
    <div class="debrief-section response-analysis">
        <h2>Understanding Privilege in Context</h2>
        <div class="response-cards">
            <div class="response-card">
                <div class="question-text">[Question]</div>
                <div class="your-answer">Your answer: [Yes/No]</div>
                <div class="explanation">[Contextual explanation]</div>
            </div>
            <!-- Repeat for each analyzed response -->
        </div>
    </div>
    
    <!-- Section 4: Ally Tips (existing, maintained) -->
    <div class="debrief-section ally-tips">
        [Existing ally tips HTML]
    </div>
</div>
```

**CSS Classes**:

```css
.debrief-container { /* Main container */ }
.debrief-section { /* Individual section styling */ }
.score-meaning { /* Score debrief specific styles */ }
.response-analysis { /* Response analysis specific styles */ }
.response-card { /* Individual response card */ }
.question-text { /* Question display */ }
.your-answer { /* Answer display */ }
.explanation { /* Explanation text */ }
```

## Data Models

### Debrief Configuration

```javascript
{
    category: 'low' | 'neutral' | 'high',
    score: number,
    normalizedScore: number,  // 0 to 1
    min: number,
    max: number
}
```

### Debrief Message

```javascript
{
    title: string,
    message: string,
    category: 'low' | 'neutral' | 'high'
}
```

### Analyzed Response

```javascript
{
    questionIndex: number,
    questionText: string,
    questionValue: number,
    userAnswer: 0 | 1,
    userAnswerText: 'Yes' | 'No',
    explanation: string,
    privilegeType: 'economic' | 'social' | 'identity' | 'safety' | 'access'
}
```

### Debrief Render Data

```javascript
{
    scoreDebrief: DebriefMessage,
    analyzedResponses: Array<AnalyzedResponse>,
    allyTips: Array<string>,
    category: 'low' | 'neutral' | 'high'
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Score Display Formatting

*For any* participant score, the rendered results page should display the score in numeric format with appropriate sign prefix: "+" for positive scores, "-" for negative scores, and no prefix for zero.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Score Categorization Algorithm

*For any* privilege score and spectrum range (min, max), the categorization function should return 'high' when the normalized score is greater than 0.6, 'low' when less than 0.4, and 'neutral' when between 0.4 and 0.6 inclusive.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 3: Low Privilege Debrief Content

*For any* score categorized as low privilege, the generated debrief message should acknowledge challenging contexts and celebrate resilience.

**Validates: Requirements 2.1, 2.2**

### Property 4: High Privilege Debrief Content

*For any* score categorized as high privilege, the generated debrief message should recognize advantages, use empowering language, and encourage helping others.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Neutral Privilege Debrief Content

*For any* score categorized as neutral, the generated debrief message should acknowledge mixed privilege status, explain intersectionality, and encourage recognition of both advantages and challenges.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: Response Analysis Presence

*For any* participant regardless of score category, the rendered results page should contain a response analysis section.

**Validates: Requirements 6.1**

### Property 7: Response Analysis Completeness

*For any* participant with answers, the response analysis should include selected questions, the participant's answers, and contextual explanations for each selected question.

**Validates: Requirements 6.2, 6.3**

### Property 8: Response Selection Balance

*For any* set of participant answers that includes both positive-value and negative-value questions, the selected responses for analysis should include at least one of each type when possible.

**Validates: Requirements 7.3**

### Property 9: Response Selection Count

*For any* participant, the number of responses selected for analysis should be between 3 and 5 inclusive.

**Validates: Requirements 7.4**

### Property 10: Ally Tips Integration

*For any* participant, the rendered results page should display the ally tips section with tips matching their score category.

**Validates: Requirements 9.1, 9.2**

### Property 11: Section Ordering

*For any* rendered results page, the debrief sections should appear in the following order: numeric results first, score meaning debrief second, response analysis third, and ally tips fourth.

**Validates: Requirements 9.3, 10.1**

### Property 12: Section Headings

*For any* rendered results page, each debrief section should have a heading element (h2 or h3).

**Validates: Requirements 10.3**

### Property 13: Free Play Mode Completeness

*For any* participant in free play mode, the rendered results page should display all four debrief sections: numeric results, score meaning debrief, response analysis, and ally tips.

**Validates: Requirements 12.1**

### Property 14: Mode Consistency

*For any* given score and spectrum range, the score categorization should produce the same category regardless of whether the participant is in free play mode or event mode.

**Validates: Requirements 12.2**

### Property 15: Event Mode Modal Debrief

*For any* participant in event mode, the participant modal should contain score meaning debrief matching their category and response analysis.

**Validates: Requirements 13.1, 13.2, 13.3**

## Error Handling

### Invalid Score Handling

**Scenario**: Score is outside the spectrum range (score < min or score > max)

**Handling**: 
- Clamp score to the valid range before categorization
- Log warning about out-of-range score
- Proceed with clamped value for all calculations

**Rationale**: Prevents categorization errors while maintaining system stability.

### Missing Answer Data

**Scenario**: Participant has no answers or answers object is null/undefined

**Handling**:
- Skip response analysis section
- Display only numeric results, score debrief, and ally tips
- Log warning about missing answer data

**Rationale**: Allows partial functionality when data is incomplete.

### Invalid Answer Format

**Scenario**: Answers are in unexpected format (not array or object)

**Handling**:
- Attempt to convert to expected format
- If conversion fails, skip response analysis
- Log error with details about invalid format

**Rationale**: Graceful degradation when data format is unexpected.

### Question Data Unavailable

**Scenario**: Questions array is not loaded or undefined

**Handling**:
- Skip response analysis section
- Display warning message in place of response analysis
- Continue with other debrief sections

**Rationale**: Maintains core functionality when external dependencies fail.

### Rendering Errors

**Scenario**: Error occurs during HTML generation or DOM manipulation

**Handling**:
- Catch and log error with stack trace
- Display fallback message to user
- Preserve existing results page functionality

**Rationale**: Prevents complete page failure due to debrief feature errors.

### Performance Degradation

**Scenario**: Debrief generation takes longer than expected

**Handling**:
- Set timeout for debrief generation (1 second)
- If timeout exceeded, display simplified debrief
- Log performance warning

**Rationale**: Ensures responsive user experience even with performance issues.

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of score categorization (boundary values: 0.4, 0.6)
- Specific debrief message content for each category
- Edge cases (empty answers, missing data)
- Integration with existing results page components
- Modal rendering in event mode
- Free play mode integration

**Property-Based Tests** focus on:
- Score categorization across all possible scores and ranges
- Debrief generation for all score categories
- Response selection algorithm across various answer sets
- Section ordering and completeness across all participants
- Formatting consistency across all score values

### Property-Based Testing Configuration

**Library**: fast-check (JavaScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property reference
- Tag format: `Feature: personalized-results-debrief, Property N: [property text]`

**Example Test Structure**:

```javascript
// Feature: personalized-results-debrief, Property 2: Score Categorization Algorithm
fc.assert(
  fc.property(
    fc.integer({ min: -50, max: 50 }), // score
    fc.integer({ min: -50, max: -10 }), // min
    fc.integer({ min: 10, max: 50 }), // max
    (score, min, max) => {
      if (min >= max) return true; // skip invalid ranges
      
      const category = categorizePrivilegeScore(score, min, max);
      const normalized = (score - min) / (max - min);
      
      if (normalized > 0.6) {
        return category === 'high';
      } else if (normalized < 0.4) {
        return category === 'low';
      } else {
        return category === 'neutral';
      }
    }
  ),
  { numRuns: 100 }
);
```

### Test Coverage Goals

- 100% coverage of categorization logic
- 100% coverage of debrief message generation
- 100% coverage of response selection algorithm
- 90%+ coverage of rendering functions
- All error handling paths tested

### Integration Testing

**Free Play Mode Integration**:
- Test debrief sections appear in correct order
- Test integration with existing analytics
- Test share functionality still works
- Test first participant state includes debrief

**Event Mode Integration**:
- Test modal displays debrief sections
- Test debrief appears for current participant
- Test existing modal functionality preserved
- Test spectrum view still accessible

**Cross-Browser Testing**:
- Test on Chrome, Firefox, Safari, Edge
- Test on mobile browsers (iOS Safari, Chrome Mobile)
- Verify responsive layout on all devices

### Performance Testing

**Benchmarks**:
- Score categorization: < 1ms
- Debrief message generation: < 5ms
- Response selection: < 10ms
- Full debrief rendering: < 50ms
- Total page load impact: < 100ms

**Load Testing**:
- Test with 100+ participant events
- Test with maximum question set (35 questions)
- Test with various answer formats
- Verify no memory leaks

### Accessibility Testing

**Requirements**:
- All debrief sections keyboard navigable
- Screen reader compatible
- Sufficient color contrast (WCAG AA)
- Semantic HTML structure
- ARIA labels where appropriate

**Note**: While we implement accessibility best practices, full WCAG compliance requires manual testing with assistive technologies and expert review.
