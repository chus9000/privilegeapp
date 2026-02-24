/**
 * Property-Based Tests for Mode Consistency
 * 
 * Feature: personalized-results-debrief, Property 14: Mode Consistency
 * 
 * **Validates: Requirements 12.2**
 * 
 * Property: For any given score and spectrum range, the score categorization should
 * produce the same category regardless of whether the participant is in free play
 * mode or event mode. Both renderFreePlayDebrief and renderModalDebrief use
 * categorizePrivilegeScore internally, so the category should always match.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { renderFreePlayDebrief, renderModalDebrief } from '../debrief-renderer.js';
import { categorizePrivilegeScore, generateScoreDebrief } from '../debrief-engine.js';

/**
 * Generate a valid questions array with the given count.
 * Each question has text and a value of +1 or -1.
 */
function makeQuestions(count) {
    const qs = [];
    for (let i = 0; i < count; i++) {
        qs.push({
            text: `Question ${i + 1}: Do you have privilege in area ${i + 1}?`,
            value: i % 2 === 0 ? 1 : -1
        });
    }
    return qs;
}

/**
 * Generate answers (as an object keyed by index) for the given question count.
 * Alternates between 0 and 1.
 */
function makeAnswers(count) {
    const answers = {};
    for (let i = 0; i < count; i++) {
        answers[i] = i % 2 === 0 ? 1 : 0;
    }
    return answers;
}

/**
 * Extract the score-meaning section's h3 title from rendered HTML.
 * This title is category-specific (e.g. "Your Journey and Resilience" for low).
 */
function extractScoreMeaningTitle(html) {
    const match = html.match(/<div class="debrief-section score-meaning">[\s\S]*?<h3>([\s\S]*?)<\/h3>/);
    return match ? match[1].trim() : null;
}

/**
 * Extract the score-meaning section's message paragraph from rendered HTML.
 */
function extractScoreMeaningMessage(html) {
    const match = html.match(/<div class="debrief-section score-meaning">[\s\S]*?<p>([\s\S]*?)<\/p>/);
    return match ? match[1].trim() : null;
}

describe('Property 14: Mode Consistency', () => {
    const questionsArr = makeQuestions(10);
    const answers = makeAnswers(10);

    test('free play and event mode should produce the same category-specific debrief for any score and range', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 100 }),  // score
                fc.integer({ min: -100, max: -1 }),   // min
                fc.integer({ min: 1, max: 100 }),     // max
                (score, min, max) => {
                    // Both modes should use the same categorization
                    const freePlayHtml = renderFreePlayDebrief(score, answers, min, max, questionsArr);
                    const modalHtml = renderModalDebrief(
                        { score, answers },
                        min, max, questionsArr
                    );

                    // Extract category-specific titles from both outputs
                    const freePlayTitle = extractScoreMeaningTitle(freePlayHtml);
                    const modalTitle = extractScoreMeaningTitle(modalHtml);

                    // Extract category-specific messages from both outputs
                    const freePlayMessage = extractScoreMeaningMessage(freePlayHtml);
                    const modalMessage = extractScoreMeaningMessage(modalHtml);

                    // The category-specific content must match between modes
                    return freePlayTitle === modalTitle && freePlayMessage === modalMessage;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('both modes should produce the same category as direct categorizePrivilegeScore call', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 100 }),  // score
                fc.integer({ min: -100, max: -1 }),   // min
                fc.integer({ min: 1, max: 100 }),     // max
                (score, min, max) => {
                    // Get the expected category and debrief directly
                    const expectedCategory = categorizePrivilegeScore(score, min, max);
                    const expectedDebrief = generateScoreDebrief(expectedCategory, score);

                    // Render via both modes
                    const freePlayHtml = renderFreePlayDebrief(score, answers, min, max, questionsArr);
                    const modalHtml = renderModalDebrief(
                        { score, answers },
                        min, max, questionsArr
                    );

                    // Both should contain the expected category-specific title
                    const freePlayTitle = extractScoreMeaningTitle(freePlayHtml);
                    const modalTitle = extractScoreMeaningTitle(modalHtml);

                    return freePlayTitle === expectedDebrief.title &&
                           modalTitle === expectedDebrief.title;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('both modes should contain the same structural sections for any score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),   // score
                fc.integer({ min: -50, max: -1 }),   // min
                fc.integer({ min: 1, max: 50 }),     // max
                (score, min, max) => {
                    const freePlayHtml = renderFreePlayDebrief(score, answers, min, max, questionsArr);
                    const modalHtml = renderModalDebrief(
                        { score, answers },
                        min, max, questionsArr
                    );

                    // Both should have score-meaning and response-analysis sections
                    const freePlayHasScoreMeaning = freePlayHtml.includes('score-meaning');
                    const freePlayHasResponseAnalysis = freePlayHtml.includes('response-analysis');
                    const modalHasScoreMeaning = modalHtml.includes('score-meaning');
                    const modalHasResponseAnalysis = modalHtml.includes('response-analysis');

                    return freePlayHasScoreMeaning === modalHasScoreMeaning &&
                           freePlayHasResponseAnalysis === modalHasResponseAnalysis;
                }
            ),
            { numRuns: 100 }
        );
    });
});
