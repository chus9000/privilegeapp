/**
 * Property-Based Tests for Free Play Mode Completeness
 *
 * Feature: personalized-results-debrief, Property 13: Free Play Mode Completeness
 *
 * **Validates: Requirements 12.1**
 *
 * Property: For any participant in free play mode, the rendered results page
 * should display all four debrief sections: numeric results, score meaning
 * debrief, response analysis, and ally tips.
 *
 * Since we are testing the renderer output (not the full page), we verify that
 * `renderFreePlayDebrief` produces HTML containing both the score-meaning
 * section and the response-analysis section. The numeric results and ally tips
 * are handled by the existing results page code.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { renderFreePlayDebrief } from '../debrief-renderer.js';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generator for a quiz question with a non-zero value (high educational value).
 */
function questionArb() {
    return fc.record({
        text: fc.string({ minLength: 5, maxLength: 80 }),
        value: fc.oneof(
            fc.integer({ min: 1, max: 3 }),
            fc.integer({ min: -3, max: -1 }),
        ),
    });
}

/**
 * Generator for a set of answered questions with corresponding answers.
 * Returns { questions, answers } where every question has a 0 or 1 answer.
 */
function answeredQuestionsArb(minCount = 5, maxCount = 15) {
    return fc.array(questionArb(), { minLength: minCount, maxLength: maxCount })
        .chain(questions =>
            fc.array(fc.constantFrom(0, 1), {
                minLength: questions.length,
                maxLength: questions.length,
            }).map(answers => ({ questions, answers }))
        );
}

/**
 * Generator for a valid score + spectrum range.
 * Ensures min < max and score is within [min, max].
 */
function scoreAndRangeArb() {
    return fc.tuple(
        fc.integer({ min: -100, max: -1 }),  // min (always negative)
        fc.integer({ min: 1, max: 100 }),    // max (always positive)
    ).chain(([min, max]) =>
        fc.integer({ min, max }).map(score => ({ score, min, max }))
    );
}

// ---------------------------------------------------------------------------
// Property 13: Free Play Mode Completeness
// ---------------------------------------------------------------------------

describe('Property 13: Free Play Mode Completeness', () => {
    test('renderFreePlayDebrief should include both score-meaning and response-analysis sections for any valid input', () => {
        /**
         * Feature: personalized-results-debrief, Property 13: Free Play Mode Completeness
         *
         * For any participant in free play mode, the debrief container should
         * include both the score-meaning section and the response-analysis section.
         *
         * **Validates: Requirements 12.1**
         */
        fc.assert(
            fc.property(
                scoreAndRangeArb(),
                answeredQuestionsArb(5, 15),
                ({ score, min, max }, { questions, answers }) => {
                    const html = renderFreePlayDebrief(score, answers, min, max, questions);

                    // Debrief container must be present
                    expect(html).toContain('class="debrief-container"');

                    // Score meaning section must be present
                    expect(html).toContain('class="debrief-section score-meaning"');

                    // Response analysis section must be present
                    expect(html).toContain('class="debrief-section response-analysis"');
                }
            ),
            { numRuns: 100 }
        );
    });

    test('score-meaning section should appear before response-analysis section', () => {
        /**
         * Feature: personalized-results-debrief, Property 13: Free Play Mode Completeness
         *
         * The score-meaning section should precede the response-analysis section
         * in the rendered output, matching the required section ordering.
         *
         * **Validates: Requirements 12.1**
         */
        fc.assert(
            fc.property(
                scoreAndRangeArb(),
                answeredQuestionsArb(5, 15),
                ({ score, min, max }, { questions, answers }) => {
                    const html = renderFreePlayDebrief(score, answers, min, max, questions);

                    const scoreMeaningIndex = html.indexOf('score-meaning');
                    const responseAnalysisIndex = html.indexOf('response-analysis');

                    // Both must exist
                    expect(scoreMeaningIndex).toBeGreaterThan(-1);
                    expect(responseAnalysisIndex).toBeGreaterThan(-1);

                    // Score meaning must come first
                    expect(scoreMeaningIndex).toBeLessThan(responseAnalysisIndex);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('debrief sections should be present regardless of score category', () => {
        /**
         * Feature: personalized-results-debrief, Property 13: Free Play Mode Completeness
         *
         * Whether the participant scores low, neutral, or high, the debrief
         * container should always include both sections.
         *
         * **Validates: Requirements 12.1**
         */
        fc.assert(
            fc.property(
                fc.constantFrom('low', 'neutral', 'high'),
                answeredQuestionsArb(5, 15),
                (targetCategory, { questions, answers }) => {
                    // Construct a score that falls into the target category
                    const min = -50;
                    const max = 50;
                    const range = max - min;
                    let score;
                    if (targetCategory === 'low') {
                        score = min + range * 0.1; // normalized ~0.1 → low
                    } else if (targetCategory === 'high') {
                        score = min + range * 0.9; // normalized ~0.9 → high
                    } else {
                        score = min + range * 0.5; // normalized 0.5 → neutral
                    }

                    const html = renderFreePlayDebrief(score, answers, min, max, questions);

                    expect(html).toContain('class="debrief-container"');
                    expect(html).toContain('class="debrief-section score-meaning"');
                    expect(html).toContain('class="debrief-section response-analysis"');
                }
            ),
            { numRuns: 100 }
        );
    });
});
