/**
 * Property-Based Tests for Section Rendering
 * 
 * Feature: personalized-results-debrief
 * 
 * **Property 6: Response Analysis Presence**
 * **Property 7: Response Analysis Completeness**
 * **Property 12: Section Headings**
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3, 10.3**
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { renderScoreMeaning, renderResponseAnalysis } from '../debrief-renderer.js';
import {
    categorizePrivilegeScore,
    generateScoreDebrief,
    selectResponsesForAnalysis,
    generateResponseExplanation,
} from '../debrief-engine.js';

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
 * Generator for a set of answered questions (at least `minCount`).
 * Returns { questions, answers } where every question has a 0 or 1 answer.
 */
function answeredQuestionsArb(minCount = 4, maxCount = 15) {
    return fc.array(questionArb(), { minLength: minCount, maxLength: maxCount })
        .map(questions => {
            const answers = questions.map(() => (Math.random() < 0.5 ? 0 : 1));
            return { questions, answers };
        });
}

/**
 * Generator for a valid score + spectrum range.
 * Ensures min < max and score is within [min, max].
 */
function scoreAndRangeArb() {
    return fc.tuple(
        fc.integer({ min: -100, max: -1 }),  // min
        fc.integer({ min: 1, max: 100 }),    // max
    ).chain(([min, max]) =>
        fc.integer({ min, max }).map(score => ({ score, min, max }))
    );
}

/**
 * Build analyzed responses from questions and answers using the real engine,
 * mirroring what the renderer would receive in production.
 */
function buildAnalyzedResponses(questions, answers) {
    const selected = selectResponsesForAnalysis(answers, questions);
    return selected.map(item => ({
        ...item,
        userAnswerText: item.userAnswer === 1 ? 'Yes' : 'No',
        explanation: generateResponseExplanation(
            { text: item.questionText, value: item.questionValue },
            item.userAnswer,
        ),
    }));
}

// ---------------------------------------------------------------------------
// Property 6: Response Analysis Presence
// ---------------------------------------------------------------------------

describe('Property 6: Response Analysis Presence', () => {
    test('response analysis section should be present for any participant regardless of score category', () => {
        /**
         * Feature: personalized-results-debrief, Property 6: Response Analysis Presence
         *
         * For any participant regardless of score category, the rendered results
         * page should contain a response analysis section.
         *
         * **Validates: Requirements 6.1**
         */
        fc.assert(
            fc.property(
                scoreAndRangeArb(),
                answeredQuestionsArb(4, 15),
                ({ score, min, max }, { questions, answers }) => {
                    // Determine category — should not matter for presence
                    const category = categorizePrivilegeScore(score, min, max);
                    expect(['low', 'neutral', 'high']).toContain(category);

                    const analyzed = buildAnalyzedResponses(questions, answers);
                    const html = renderResponseAnalysis(analyzed);

                    // The response-analysis section must exist
                    expect(html).toContain('class="debrief-section response-analysis"');
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('response analysis section should be present even with empty responses', () => {
        /**
         * Feature: personalized-results-debrief, Property 6: Response Analysis Presence
         *
         * **Validates: Requirements 6.1**
         */
        fc.assert(
            fc.property(
                fc.constantFrom('low', 'neutral', 'high'),
                (category) => {
                    // Even with no analyzed responses, the section container should render
                    const html = renderResponseAnalysis([]);

                    expect(html).toContain('class="debrief-section response-analysis"');
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 7: Response Analysis Completeness
// ---------------------------------------------------------------------------

describe('Property 7: Response Analysis Completeness', () => {
    test('response analysis should include question text, answer, and explanation for each selected question', () => {
        /**
         * Feature: personalized-results-debrief, Property 7: Response Analysis Completeness
         *
         * For any participant with answers, the response analysis should include
         * selected questions, the participant's answers, and contextual explanations
         * for each selected question.
         *
         * **Validates: Requirements 6.2, 6.3**
         */
        fc.assert(
            fc.property(
                answeredQuestionsArb(4, 15),
                ({ questions, answers }) => {
                    const analyzed = buildAnalyzedResponses(questions, answers);

                    // Skip if selection returned nothing (degenerate input)
                    if (analyzed.length === 0) return true;

                    const html = renderResponseAnalysis(analyzed);

                    for (const response of analyzed) {
                        // Question text present
                        expect(html).toContain(response.questionText);

                        // Answer present (Yes or No)
                        const expectedAnswer = `Your answer: ${response.userAnswerText}`;
                        expect(html).toContain(expectedAnswer);

                        // Explanation present
                        expect(html).toContain(response.explanation);
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('each analyzed response should have its own response-card element', () => {
        /**
         * Feature: personalized-results-debrief, Property 7: Response Analysis Completeness
         *
         * **Validates: Requirements 6.2, 6.3**
         */
        fc.assert(
            fc.property(
                answeredQuestionsArb(4, 15),
                ({ questions, answers }) => {
                    const analyzed = buildAnalyzedResponses(questions, answers);
                    if (analyzed.length === 0) return true;

                    const html = renderResponseAnalysis(analyzed);

                    const cardCount = (html.match(/class="response-card"/g) || []).length;
                    return cardCount === analyzed.length;
                }
            ),
            { numRuns: 100 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 12: Section Headings
// ---------------------------------------------------------------------------

describe('Property 12: Section Headings', () => {
    test('score meaning section should have heading elements (h2 or h3)', () => {
        /**
         * Feature: personalized-results-debrief, Property 12: Section Headings
         *
         * For any rendered results page, each debrief section should have a
         * heading element (h2 or h3).
         *
         * **Validates: Requirements 10.3**
         */
        fc.assert(
            fc.property(
                fc.constantFrom('low', 'neutral', 'high'),
                fc.integer({ min: -50, max: 50 }),
                (category, score) => {
                    const debrief = generateScoreDebrief(category, score);
                    const html = renderScoreMeaning(debrief);

                    // Must contain at least one h2 or h3
                    const hasH2 = /<h2[^>]*>/.test(html);
                    const hasH3 = /<h3[^>]*>/.test(html);
                    return hasH2 || hasH3;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('response analysis section should have a heading element (h2 or h3)', () => {
        /**
         * Feature: personalized-results-debrief, Property 12: Section Headings
         *
         * **Validates: Requirements 10.3**
         */
        fc.assert(
            fc.property(
                answeredQuestionsArb(4, 15),
                ({ questions, answers }) => {
                    const analyzed = buildAnalyzedResponses(questions, answers);
                    const html = renderResponseAnalysis(analyzed);

                    const hasH2 = /<h2[^>]*>/.test(html);
                    const hasH3 = /<h3[^>]*>/.test(html);
                    return hasH2 || hasH3;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('score meaning section should have both h2 and h3 headings', () => {
        /**
         * Feature: personalized-results-debrief, Property 12: Section Headings
         *
         * **Validates: Requirements 10.3**
         */
        fc.assert(
            fc.property(
                fc.constantFrom('low', 'neutral', 'high'),
                fc.integer({ min: -50, max: 50 }),
                (category, score) => {
                    const debrief = generateScoreDebrief(category, score);
                    const html = renderScoreMeaning(debrief);

                    // Score meaning has an h2 ("Understanding Your Score") and h3 (category title)
                    const hasH2 = /<h2[^>]*>/.test(html);
                    const hasH3 = /<h3[^>]*>/.test(html);
                    return hasH2 && hasH3;
                }
            ),
            { numRuns: 100 }
        );
    });
});
