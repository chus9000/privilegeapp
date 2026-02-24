/**
 * Property-Based Tests for Section Ordering
 *
 * Feature: personalized-results-debrief
 *
 * **Property 11: Section Ordering**
 *
 * **Validates: Requirements 9.3, 10.1**
 *
 * For any rendered results page, the debrief sections should appear in the
 * following order: numeric results first, score meaning debrief second,
 * response analysis third, and ally tips fourth.
 *
 * Since we are testing the renderer output (not the full page), we verify that
 * `renderFreePlayDebrief` and `renderModalDebrief` produce HTML where
 * score-meaning appears before response-analysis. The numeric results and
 * ally tips are handled by the existing results page code.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { renderFreePlayDebrief, renderModalDebrief } from '../debrief-renderer.js';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generator for a quiz question with a non-zero value (high educational value).
 */
function questionArb() {
    return fc.record({
        text: fc.stringMatching(/^[A-Za-z ]{5,60}\?$/),
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

/**
 * Generator for a realistic participant object with score within the given range
 * and answers as an object with string keys mapping to 0 or 1.
 */
function participantArb(min, max, questionsCount) {
    return fc.record({
        id: fc.stringMatching(/^[a-z0-9]{8}$/),
        name: fc.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+$/),
        score: fc.integer({ min, max }),
        answers: fc.array(fc.constantFrom(0, 1), {
            minLength: questionsCount,
            maxLength: questionsCount,
        }).map(arr => {
            const obj = {};
            arr.forEach((val, idx) => { obj[String(idx)] = val; });
            return obj;
        }),
    });
}

// ---------------------------------------------------------------------------
// Property 11: Section Ordering
// ---------------------------------------------------------------------------

describe('Property 11: Section Ordering', () => {
    test('renderFreePlayDebrief should place score-meaning before response-analysis for any valid input', () => {
        /**
         * Feature: personalized-results-debrief, Property 11: Section Ordering
         *
         * For any rendered results page, the debrief sections should appear in
         * the correct order: score meaning debrief before response analysis.
         *
         * **Validates: Requirements 9.3, 10.1**
         */
        fc.assert(
            fc.property(
                scoreAndRangeArb(),
                answeredQuestionsArb(5, 15),
                ({ score, min, max }, { questions, answers }) => {
                    const html = renderFreePlayDebrief(score, answers, min, max, questions);

                    const scoreMeaningPos = html.indexOf('class="debrief-section score-meaning"');
                    const responseAnalysisPos = html.indexOf('class="debrief-section response-analysis"');

                    // Both sections must exist
                    expect(scoreMeaningPos).toBeGreaterThanOrEqual(0);
                    expect(responseAnalysisPos).toBeGreaterThanOrEqual(0);

                    // Score meaning must come before response analysis
                    expect(scoreMeaningPos).toBeLessThan(responseAnalysisPos);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('renderModalDebrief should place score-meaning before response-analysis for any participant', () => {
        /**
         * Feature: personalized-results-debrief, Property 11: Section Ordering
         *
         * For any participant in event mode, the modal debrief should render
         * score meaning before response analysis.
         *
         * **Validates: Requirements 9.3, 10.1**
         */
        fc.assert(
            fc.property(
                scoreAndRangeArb(),
                answeredQuestionsArb(5, 15),
                ({ score, min, max }, { questions, answers }) => {
                    const participant = {
                        id: 'test1234',
                        name: 'Test User',
                        score,
                        answers: answers.reduce((obj, val, idx) => {
                            obj[String(idx)] = val;
                            return obj;
                        }, {}),
                    };

                    const html = renderModalDebrief(participant, min, max, questions);

                    const scoreMeaningPos = html.indexOf('class="debrief-section score-meaning"');
                    const responseAnalysisPos = html.indexOf('class="debrief-section response-analysis"');

                    // Both sections must exist
                    expect(scoreMeaningPos).toBeGreaterThanOrEqual(0);
                    expect(responseAnalysisPos).toBeGreaterThanOrEqual(0);

                    // Score meaning must come before response analysis
                    expect(scoreMeaningPos).toBeLessThan(responseAnalysisPos);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('section ordering should hold across all score categories in free play mode', () => {
        /**
         * Feature: personalized-results-debrief, Property 11: Section Ordering
         *
         * Regardless of whether the participant scores low, neutral, or high,
         * the section ordering must remain consistent.
         *
         * **Validates: Requirements 9.3, 10.1**
         */
        fc.assert(
            fc.property(
                fc.constantFrom('low', 'neutral', 'high'),
                answeredQuestionsArb(5, 15),
                (targetCategory, { questions, answers }) => {
                    const min = -50;
                    const max = 50;
                    const range = max - min;

                    // Construct a score that falls into the target category
                    let score;
                    if (targetCategory === 'low') {
                        score = min + range * 0.1; // normalized ~0.1 → low
                    } else if (targetCategory === 'high') {
                        score = min + range * 0.9; // normalized ~0.9 → high
                    } else {
                        score = min + range * 0.5; // normalized 0.5 → neutral
                    }

                    const html = renderFreePlayDebrief(score, answers, min, max, questions);

                    const scoreMeaningPos = html.indexOf('class="debrief-section score-meaning"');
                    const responseAnalysisPos = html.indexOf('class="debrief-section response-analysis"');

                    expect(scoreMeaningPos).toBeGreaterThanOrEqual(0);
                    expect(responseAnalysisPos).toBeGreaterThanOrEqual(0);
                    expect(scoreMeaningPos).toBeLessThan(responseAnalysisPos);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('section ordering should hold across all score categories in event mode', () => {
        /**
         * Feature: personalized-results-debrief, Property 11: Section Ordering
         *
         * Regardless of whether the participant scores low, neutral, or high,
         * the section ordering in the modal must remain consistent.
         *
         * **Validates: Requirements 9.3, 10.1**
         */
        fc.assert(
            fc.property(
                fc.constantFrom('low', 'neutral', 'high'),
                answeredQuestionsArb(5, 15),
                (targetCategory, { questions, answers }) => {
                    const min = -50;
                    const max = 50;
                    const range = max - min;

                    let score;
                    if (targetCategory === 'low') {
                        score = min + range * 0.1;
                    } else if (targetCategory === 'high') {
                        score = min + range * 0.9;
                    } else {
                        score = min + range * 0.5;
                    }

                    const participant = {
                        id: 'test1234',
                        name: 'Test User',
                        score,
                        answers: answers.reduce((obj, val, idx) => {
                            obj[String(idx)] = val;
                            return obj;
                        }, {}),
                    };

                    const html = renderModalDebrief(participant, min, max, questions);

                    const scoreMeaningPos = html.indexOf('class="debrief-section score-meaning"');
                    const responseAnalysisPos = html.indexOf('class="debrief-section response-analysis"');

                    expect(scoreMeaningPos).toBeGreaterThanOrEqual(0);
                    expect(responseAnalysisPos).toBeGreaterThanOrEqual(0);
                    expect(scoreMeaningPos).toBeLessThan(responseAnalysisPos);
                }
            ),
            { numRuns: 100 }
        );
    });
});
