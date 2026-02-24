/**
 * Property-Based Tests for Response Selection
 * 
 * Feature: personalized-results-debrief
 * 
 * **Property 8: Response Selection Balance**
 * **Property 9: Response Selection Count**
 * 
 * **Validates: Requirements 7.3, 7.4**
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { selectResponsesForAnalysis } from '../debrief-engine.js';

/**
 * Generator for a question with a specified value sign.
 * @param {'positive'|'negative'} sign
 */
function questionArb(sign) {
    const valueArb = sign === 'positive'
        ? fc.integer({ min: 1, max: 3 })
        : fc.integer({ min: -3, max: -1 });
    return fc.record({
        text: fc.string({ minLength: 1, maxLength: 40 }),
        value: valueArb,
    });
}

/**
 * Generator that produces a question set guaranteed to contain
 * at least `minPos` positive-value and `minNeg` negative-value questions,
 * with answers for every question (all answered 0 or 1).
 */
function questionsWithBothSignsArb(minPos = 2, minNeg = 2, extraMax = 6) {
    return fc.tuple(
        fc.array(questionArb('positive'), { minLength: minPos, maxLength: minPos + extraMax }),
        fc.array(questionArb('negative'), { minLength: minNeg, maxLength: minNeg + extraMax }),
    ).chain(([positiveQs, negativeQs]) => {
        // Shuffle the combined questions so order is arbitrary
        const allQuestions = [...positiveQs, ...negativeQs];
        return fc.shuffledSubarray(allQuestions, { minLength: allQuestions.length, maxLength: allQuestions.length })
            .map(questions => {
                // Generate an answer (0 or 1) for every question
                const answers = questions.map(() => Math.random() < 0.5 ? 0 : 1);
                return { questions, answers };
            });
    });
}

/**
 * Generator for a general set of questions (at least `minCount` high-value)
 * with answers for all of them.
 */
function answeredQuestionsArb(minCount = 3, maxCount = 20) {
    return fc.array(
        fc.record({
            text: fc.string({ minLength: 1, maxLength: 40 }),
            value: fc.oneof(
                fc.integer({ min: 1, max: 3 }),
                fc.integer({ min: -3, max: -1 }),
            ),
        }),
        { minLength: minCount, maxLength: maxCount }
    ).map(questions => {
        const answers = questions.map(() => Math.random() < 0.5 ? 0 : 1);
        return { questions, answers };
    });
}

describe('Property 8: Response Selection Balance', () => {
    test('selected responses should include at least one positive-value and one negative-value question when both types are available in the pool', () => {
        /**
         * Feature: personalized-results-debrief, Property 8: Response Selection Balance
         * 
         * For any set of participant answers that includes both positive-value and
         * negative-value questions, the selected responses for analysis should include
         * at least one of each type when possible.
         * 
         * **Validates: Requirements 7.3**
         */
        fc.assert(
            fc.property(
                questionsWithBothSignsArb(2, 2, 6),
                ({ questions, answers }) => {
                    const result = selectResponsesForAnalysis(answers, questions);

                    // If the function returned nothing (edge case), skip
                    if (result.length === 0) return true;

                    // Determine how many positive/negative value questions exist
                    // in the high-value pool (|value| >= 1) that were answered
                    const answeredHighValue = questions
                        .map((q, i) => ({ ...q, idx: i, answer: answers[i] }))
                        .filter(q => (q.answer === 0 || q.answer === 1) && Math.abs(q.value) >= 1);

                    const poolPositive = answeredHighValue.filter(q => q.value > 0);
                    const poolNegative = answeredHighValue.filter(q => q.value < 0);

                    // Only assert balance when both types exist in the pool
                    if (poolPositive.length > 0 && poolNegative.length > 0) {
                        const hasPositive = result.some(r => r.questionValue > 0);
                        const hasNegative = result.some(r => r.questionValue < 0);
                        return hasPositive && hasNegative;
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('balance should hold regardless of the requested count (3 to 5)', () => {
        /**
         * Feature: personalized-results-debrief, Property 8: Response Selection Balance
         * 
         * **Validates: Requirements 7.3**
         */
        fc.assert(
            fc.property(
                questionsWithBothSignsArb(3, 3, 4),
                fc.integer({ min: 3, max: 5 }),
                ({ questions, answers }, count) => {
                    const result = selectResponsesForAnalysis(answers, questions, count);

                    if (result.length === 0) return true;

                    const answeredHighValue = questions
                        .map((q, i) => ({ ...q, idx: i, answer: answers[i] }))
                        .filter(q => (q.answer === 0 || q.answer === 1) && Math.abs(q.value) >= 1);

                    const poolPositive = answeredHighValue.filter(q => q.value > 0);
                    const poolNegative = answeredHighValue.filter(q => q.value < 0);

                    if (poolPositive.length > 0 && poolNegative.length > 0) {
                        const hasPositive = result.some(r => r.questionValue > 0);
                        const hasNegative = result.some(r => r.questionValue < 0);
                        return hasPositive && hasNegative;
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Property 9: Response Selection Count', () => {
    test('number of selected responses should be between 3 and 5 inclusive when enough questions are available', () => {
        /**
         * Feature: personalized-results-debrief, Property 9: Response Selection Count
         * 
         * For any participant, the number of responses selected for analysis should
         * be between 3 and 5 inclusive.
         * 
         * **Validates: Requirements 7.4**
         */
        fc.assert(
            fc.property(
                answeredQuestionsArb(6, 20),
                ({ questions, answers }) => {
                    const result = selectResponsesForAnalysis(answers, questions);

                    // With at least 6 high-value answered questions, the result
                    // should always be within the 3-5 range
                    return result.length >= 3 && result.length <= 5;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('count should respect the explicit count parameter clamped to 3-5', () => {
        /**
         * Feature: personalized-results-debrief, Property 9: Response Selection Count
         * 
         * **Validates: Requirements 7.4**
         */
        fc.assert(
            fc.property(
                answeredQuestionsArb(6, 20),
                fc.integer({ min: 1, max: 10 }),
                ({ questions, answers }, requestedCount) => {
                    const result = selectResponsesForAnalysis(answers, questions, requestedCount);

                    const expectedCount = Math.max(3, Math.min(5, requestedCount));

                    // With plenty of questions, the result length should match
                    // the clamped count exactly
                    return result.length === expectedCount;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('result should never exceed 5 responses regardless of input size', () => {
        /**
         * Feature: personalized-results-debrief, Property 9: Response Selection Count
         * 
         * **Validates: Requirements 7.4**
         */
        fc.assert(
            fc.property(
                answeredQuestionsArb(3, 30),
                fc.integer({ min: 1, max: 100 }),
                ({ questions, answers }, requestedCount) => {
                    const result = selectResponsesForAnalysis(answers, questions, requestedCount);

                    return result.length <= 5;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('default count should select exactly 4 responses when enough questions exist', () => {
        /**
         * Feature: personalized-results-debrief, Property 9: Response Selection Count
         * 
         * **Validates: Requirements 7.4**
         */
        fc.assert(
            fc.property(
                answeredQuestionsArb(6, 20),
                ({ questions, answers }) => {
                    // No count argument — defaults to 4
                    const result = selectResponsesForAnalysis(answers, questions);

                    return result.length === 4;
                }
            ),
            { numRuns: 100 }
        );
    });
});
