/**
 * Property-Based Tests for Event Mode Modal Debrief
 *
 * Feature: personalized-results-debrief, Property 15: Event Mode Modal Debrief
 *
 * For any participant in event mode, the participant modal should contain
 * score meaning debrief matching their category and response analysis.
 *
 * **Validates: Requirements 13.1, 13.2, 13.3**
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { renderModalDebrief } from '../debrief-renderer.js';
import { categorizePrivilegeScore, generateScoreDebrief } from '../debrief-engine.js';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generator for a quiz question with non-zero value (high educational value).
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
 * Generator for a questions array with enough questions for response selection.
 */
function questionsArrayArb(minCount = 5, maxCount = 15) {
    return fc.array(questionArb(), { minLength: minCount, maxLength: maxCount });
}

/**
 * Generator for a valid spectrum range where min < max.
 */
function spectrumRangeArb() {
    return fc.tuple(
        fc.integer({ min: -100, max: -1 }),  // min (always negative)
        fc.integer({ min: 1, max: 100 }),    // max (always positive)
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
        avatar: fc.constantFrom('🐯', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵'),
        score: fc.integer({ min, max }),
        answers: fc.array(fc.constantFrom(0, 1), { minLength: questionsCount, maxLength: questionsCount })
            .map(arr => {
                const obj = {};
                arr.forEach((val, idx) => { obj[String(idx)] = val; });
                return obj;
            }),
        createdAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-12-31') })
            .map(d => d.toISOString()),
    });
}

// ---------------------------------------------------------------------------
// Property 15: Event Mode Modal Debrief
// ---------------------------------------------------------------------------

describe('Property 15: Event Mode Modal Debrief', () => {
    test('modal debrief should contain score meaning debrief section for any participant', () => {
        /**
         * Feature: personalized-results-debrief, Property 15: Event Mode Modal Debrief
         *
         * For any participant in event mode, the participant modal should contain
         * score meaning debrief matching their category.
         *
         * **Validates: Requirements 13.1, 13.2**
         */
        fc.assert(
            fc.property(
                spectrumRangeArb(),
                questionsArrayArb(5, 15),
                fc.integer({ min: 5, max: 15 }),
                ([min, max], questions, _seed) => {
                    return fc.assert(
                        fc.property(
                            participantArb(min, max, questions.length),
                            (participant) => {
                                const html = renderModalDebrief(participant, min, max, questions);

                                // Must contain debrief container
                                expect(html).toContain('class="debrief-container"');

                                // Must contain score meaning section (Requirement 13.1)
                                expect(html).toContain('class="debrief-section score-meaning"');
                                expect(html).toContain('<h2>Understanding Your Score</h2>');

                                return true;
                            }
                        ),
                        { numRuns: 5 }
                    ) || true;
                }
            ),
            { numRuns: 20 }
        );
    });

    test('modal debrief score meaning should match participant category', () => {
        /**
         * Feature: personalized-results-debrief, Property 15: Event Mode Modal Debrief
         *
         * For any participant in event mode, the score meaning debrief should
         * match their score category (low/neutral/high).
         *
         * **Validates: Requirements 13.2**
         */
        fc.assert(
            fc.property(
                spectrumRangeArb().chain(([min, max]) =>
                    fc.tuple(
                        fc.constant(min),
                        fc.constant(max),
                        questionsArrayArb(5, 15).chain(questions =>
                            fc.tuple(
                                fc.constant(questions),
                                participantArb(min, max, questions.length),
                            )
                        ),
                    )
                ),
                ([min, max, [questions, participant]]) => {
                    const html = renderModalDebrief(participant, min, max, questions);
                    const category = categorizePrivilegeScore(participant.score, min, max);
                    const debrief = generateScoreDebrief(category, participant.score);

                    // The rendered HTML must contain the category-specific title
                    expect(html).toContain(debrief.title);

                    // The rendered HTML must contain the category-specific message
                    expect(html).toContain(debrief.message);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal debrief should contain response analysis section for any participant', () => {
        /**
         * Feature: personalized-results-debrief, Property 15: Event Mode Modal Debrief
         *
         * For any participant in event mode, the participant modal should contain
         * response analysis.
         *
         * **Validates: Requirements 13.3**
         */
        fc.assert(
            fc.property(
                spectrumRangeArb().chain(([min, max]) =>
                    fc.tuple(
                        fc.constant(min),
                        fc.constant(max),
                        questionsArrayArb(5, 15).chain(questions =>
                            fc.tuple(
                                fc.constant(questions),
                                participantArb(min, max, questions.length),
                            )
                        ),
                    )
                ),
                ([min, max, [questions, participant]]) => {
                    const html = renderModalDebrief(participant, min, max, questions);

                    // Must contain response analysis section (Requirement 13.3)
                    expect(html).toContain('class="debrief-section response-analysis"');
                    expect(html).toContain('<h2>Understanding Privilege in Context</h2>');

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal debrief response analysis should contain response cards with answers and explanations', () => {
        /**
         * Feature: personalized-results-debrief, Property 15: Event Mode Modal Debrief
         *
         * For any participant with answers, the modal response analysis should
         * include response cards with question text, Yes/No answers, and explanations.
         *
         * **Validates: Requirements 13.3**
         */
        fc.assert(
            fc.property(
                spectrumRangeArb().chain(([min, max]) =>
                    fc.tuple(
                        fc.constant(min),
                        fc.constant(max),
                        questionsArrayArb(5, 15).chain(questions =>
                            fc.tuple(
                                fc.constant(questions),
                                participantArb(min, max, questions.length),
                            )
                        ),
                    )
                ),
                ([min, max, [questions, participant]]) => {
                    const html = renderModalDebrief(participant, min, max, questions);

                    // Count response cards
                    const cardCount = (html.match(/class="response-card"/g) || []).length;

                    // Should have between 3 and 5 response cards
                    expect(cardCount).toBeGreaterThanOrEqual(3);
                    expect(cardCount).toBeLessThanOrEqual(5);

                    // Each card should have question text, answer, and explanation
                    const questionTextCount = (html.match(/class="question-text"/g) || []).length;
                    const answerCount = (html.match(/Your answer: (?:Yes|No)/g) || []).length;
                    const explanationCount = (html.match(/class="explanation"/g) || []).length;

                    expect(questionTextCount).toBe(cardCount);
                    expect(answerCount).toBe(cardCount);
                    expect(explanationCount).toBe(cardCount);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal debrief should place score meaning before response analysis', () => {
        /**
         * Feature: personalized-results-debrief, Property 15: Event Mode Modal Debrief
         *
         * For any participant, the score meaning section should appear before
         * the response analysis section in the modal.
         *
         * **Validates: Requirements 13.1, 13.2, 13.3**
         */
        fc.assert(
            fc.property(
                spectrumRangeArb().chain(([min, max]) =>
                    fc.tuple(
                        fc.constant(min),
                        fc.constant(max),
                        questionsArrayArb(5, 15).chain(questions =>
                            fc.tuple(
                                fc.constant(questions),
                                participantArb(min, max, questions.length),
                            )
                        ),
                    )
                ),
                ([min, max, [questions, participant]]) => {
                    const html = renderModalDebrief(participant, min, max, questions);

                    const scoreMeaningPos = html.indexOf('class="debrief-section score-meaning"');
                    const responseAnalysisPos = html.indexOf('class="debrief-section response-analysis"');

                    // Both sections must exist
                    expect(scoreMeaningPos).toBeGreaterThanOrEqual(0);
                    expect(responseAnalysisPos).toBeGreaterThanOrEqual(0);

                    // Score meaning must come before response analysis
                    expect(scoreMeaningPos).toBeLessThan(responseAnalysisPos);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
