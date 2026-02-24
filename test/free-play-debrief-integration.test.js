/**
 * Integration tests for Free Play Mode Debrief
 * Feature: personalized-results-debrief
 *
 * Validates: Requirements 12.1, 12.2, 12.3
 *
 * Tests that the debrief renderer integrates correctly with the debrief engine
 * and existing ally tips analytics in free play mode.
 */

import { describe, test, expect } from 'vitest';
import { renderFreePlayDebrief } from '../debrief-renderer.js';
import { categorizePrivilegeScore } from '../debrief-engine.js';
import { categorizeScore } from '../ally-tips.js';

// Shared test questions covering diverse privilege themes and value signs
const testQuestions = [
    { text: 'Can you show affection for your romantic partner in public without fear?', value: 2 },
    { text: 'Have you ever been the only person of your race in a room?', value: -2 },
    { text: 'Were you raised in an area with regular access to a doctor?', value: 1 },
    { text: 'Did your parents work nights and weekends to support your family?', value: -1 },
    { text: 'Can you take a vacation at least once a year?', value: 1 },
    { text: 'Have you ever been bullied for your appearance?', value: -1 },
    { text: 'Do you have access to quality education?', value: 1 },
    { text: 'Have you ever felt unsafe walking home at night?', value: -2 },
    { text: 'Can you easily find a mentor who looks like you?', value: 1 },
    { text: 'Have you ever been denied a loan based on your background?', value: -1 },
];

// Answers where participant answered all questions
const fullAnswers = { '0': 1, '1': 0, '2': 1, '3': 0, '4': 1, '5': 1, '6': 1, '7': 0, '8': 1, '9': 0 };

const SPECTRUM_MIN = -10;
const SPECTRUM_MAX = 10;

describe('Integration: Free Play Debrief', () => {
    describe('Requirement 12.1: All four debrief sections appear in correct order', () => {
        test('score meaning section appears before response analysis section', () => {
            const html = renderFreePlayDebrief(5, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            const scoreMeaningIdx = html.indexOf('class="debrief-section score-meaning"');
            const responseAnalysisIdx = html.indexOf('class="debrief-section response-analysis"');

            expect(scoreMeaningIdx).toBeGreaterThan(-1);
            expect(responseAnalysisIdx).toBeGreaterThan(-1);
            expect(scoreMeaningIdx).toBeLessThan(responseAnalysisIdx);
        });

        test('both debrief sections are present inside a debrief-container', () => {
            const html = renderFreePlayDebrief(0, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('class="debrief-container"');
            expect(html).toContain('class="debrief-section score-meaning"');
            expect(html).toContain('class="debrief-section response-analysis"');
        });

        test('each section has an h2 heading', () => {
            const html = renderFreePlayDebrief(5, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('<h2>Understanding Your Score</h2>');
            expect(html).toContain('<h2>Understanding Privilege in Context</h2>');
        });
    });

    describe('Requirement 12.2: Debrief content matches score category', () => {
        test('high score produces high privilege debrief content', () => {
            // score 8 in range -10..10 → normalized = 0.9 → high
            const html = renderFreePlayDebrief(8, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('Using Your Advantages to Help Others');
            expect(html).toContain('superpowers');
        });

        test('low score produces low privilege debrief content', () => {
            // score -8 in range -10..10 → normalized = 0.1 → low
            const html = renderFreePlayDebrief(-8, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('Your Journey and Resilience');
            expect(html).toContain('resilience');
        });

        test('neutral score produces neutral debrief content', () => {
            // score 0 in range -10..10 → normalized = 0.5 → neutral
            const html = renderFreePlayDebrief(0, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('Understanding Your Mixed Experience');
            expect(html).toContain('intersectionality');
        });

        test('boundary score at 0.4 threshold is categorized as neutral', () => {
            // normalized = 0.4 → score = min + 0.4*(max-min) = -10 + 8 = -2
            const html = renderFreePlayDebrief(-2, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('Understanding Your Mixed Experience');
        });

        test('boundary score just above 0.6 threshold is categorized as high', () => {
            // normalized just above 0.6 → score = min + 0.61*(max-min) = -10 + 12.2 = 2.2
            const html = renderFreePlayDebrief(2.2, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('Using Your Advantages to Help Others');
        });
    });

    describe('Requirement 12.3: Response analysis includes actual analyzed responses', () => {
        test('response cards contain question text from the question set', () => {
            const html = renderFreePlayDebrief(5, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            // At least one question text from our set should appear
            const hasQuestionText = testQuestions.some(q => html.includes(q.text));
            expect(hasQuestionText).toBe(true);
        });

        test('response cards include Yes/No answers', () => {
            const html = renderFreePlayDebrief(5, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            const hasYes = html.includes('Your answer: Yes');
            const hasNo = html.includes('Your answer: No');
            expect(hasYes || hasNo).toBe(true);
        });

        test('response cards include non-empty contextual explanations', () => {
            const html = renderFreePlayDebrief(5, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            const explanationMatches = html.match(/<div class="explanation">([\s\S]*?)<\/div>/g) || [];
            expect(explanationMatches.length).toBeGreaterThan(0);

            for (const match of explanationMatches) {
                const content = match
                    .replace(/<div class="explanation">/, '')
                    .replace(/<\/div>/, '')
                    .trim();
                expect(content.length).toBeGreaterThan(0);
            }
        });

        test('produces between 3 and 5 response cards when enough questions answered', () => {
            const html = renderFreePlayDebrief(5, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            const cardCount = (html.match(/class="response-card"/g) || []).length;
            expect(cardCount).toBeGreaterThanOrEqual(3);
            expect(cardCount).toBeLessThanOrEqual(5);
        });
    });

    describe('Debrief integrates with existing analytics (ally tips categorization consistency)', () => {
        /**
         * The debrief engine's categorizePrivilegeScore and ally-tips' categorizeScore
         * use the same 40-20-40 threshold logic. Verify they agree for representative scores.
         */
        const categoryMap = { low: 'lowPrivilege', neutral: 'neutral', high: 'highPrivilege' };

        const representativeScores = [-9, -5, -2, 0, 2, 5, 9];

        representativeScores.forEach(score => {
            test(`score ${score} categorized consistently between debrief engine and ally tips`, () => {
                const debriefCategory = categorizePrivilegeScore(score, SPECTRUM_MIN, SPECTRUM_MAX);
                const allyCategory = categorizeScore(score, SPECTRUM_MIN, SPECTRUM_MAX);

                expect(categoryMap[debriefCategory]).toBe(allyCategory);
            });
        });

        test('debrief category drives correct content while ally tips use equivalent category', () => {
            const score = 8;
            const html = renderFreePlayDebrief(score, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);
            const allyCategory = categorizeScore(score, SPECTRUM_MIN, SPECTRUM_MAX);

            // Debrief should show high-privilege content
            expect(html).toContain('Using Your Advantages to Help Others');
            // Ally tips should also classify as high privilege
            expect(allyCategory).toBe('highPrivilege');
        });
    });

    describe('Edge cases in integration', () => {
        test('handles array-format answers the same as object-format', () => {
            const arrayAnswers = [1, 0, 1, 0, 1, 1, 1, 0, 1, 0];
            const htmlFromArray = renderFreePlayDebrief(5, arrayAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);
            const htmlFromObject = renderFreePlayDebrief(5, fullAnswers, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            // Both should produce the same structural sections
            expect(htmlFromArray).toContain('class="debrief-section score-meaning"');
            expect(htmlFromArray).toContain('class="debrief-section response-analysis"');
            expect(htmlFromObject).toContain('class="debrief-section score-meaning"');
            expect(htmlFromObject).toContain('class="debrief-section response-analysis"');

            // Both should have the same number of response cards
            const arrayCards = (htmlFromArray.match(/class="response-card"/g) || []).length;
            const objectCards = (htmlFromObject.match(/class="response-card"/g) || []).length;
            expect(arrayCards).toBe(objectCards);
        });

        test('works with different spectrum ranges', () => {
            // Wider range
            const html = renderFreePlayDebrief(30, fullAnswers, -50, 50, testQuestions);
            expect(html).toContain('class="debrief-container"');
            expect(html).toContain('class="debrief-section score-meaning"');
            expect(html).toContain('class="debrief-section response-analysis"');
        });
    });
});
