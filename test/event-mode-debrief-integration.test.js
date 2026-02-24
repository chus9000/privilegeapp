/**
 * Integration tests for Event Mode Modal Debrief
 * Feature: personalized-results-debrief
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 *
 * Tests that the renderModalDebrief function integrates correctly with the
 * debrief engine and produces output consistent with ally tips categorization.
 */

import { describe, test, expect } from 'vitest';
import { renderModalDebrief } from '../debrief-renderer.js';
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

const SPECTRUM_MIN = -10;
const SPECTRUM_MAX = 10;

// Participants representing each category
const highScoreParticipant = {
    id: 'p-high',
    name: 'Brave Tiger',
    avatar: '🐯',
    score: 8,
    answers: { '0': 1, '1': 0, '2': 1, '3': 0, '4': 1, '5': 0, '6': 1, '7': 0, '8': 1, '9': 0 },
};

const lowScoreParticipant = {
    id: 'p-low',
    name: 'Gentle Fox',
    avatar: '🦊',
    score: -8,
    answers: { '0': 0, '1': 1, '2': 0, '3': 1, '4': 0, '5': 1, '6': 0, '7': 1, '8': 0, '9': 1 },
};

const neutralScoreParticipant = {
    id: 'p-neutral',
    name: 'Calm Bear',
    avatar: '🐻',
    score: 0,
    answers: { '0': 1, '1': 1, '2': 0, '3': 0, '4': 1, '5': 1, '6': 0, '7': 0, '8': 1, '9': 0 },
};

describe('Integration: Event Mode Modal Debrief', () => {
    describe('Requirement 13.1: Modal displays debrief sections', () => {
        test('modal debrief contains both score meaning and response analysis sections', () => {
            const html = renderModalDebrief(highScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('class="debrief-section score-meaning"');
            expect(html).toContain('class="debrief-section response-analysis"');
        });

        test('score meaning section appears before response analysis section', () => {
            const html = renderModalDebrief(highScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            const scoreMeaningIdx = html.indexOf('class="debrief-section score-meaning"');
            const responseAnalysisIdx = html.indexOf('class="debrief-section response-analysis"');

            expect(scoreMeaningIdx).toBeGreaterThan(-1);
            expect(responseAnalysisIdx).toBeGreaterThan(-1);
            expect(scoreMeaningIdx).toBeLessThan(responseAnalysisIdx);
        });

        test('each section has an h2 heading', () => {
            const html = renderModalDebrief(neutralScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('<h2>Understanding Your Score</h2>');
            expect(html).toContain('<h2>Understanding Privilege in Context</h2>');
        });

        test('sections are wrapped in a debrief-container', () => {
            const html = renderModalDebrief(lowScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('class="debrief-container"');
        });
    });

    describe('Requirement 13.2: Debrief matches participant score category', () => {
        test('high score participant receives high privilege debrief', () => {
            const html = renderModalDebrief(highScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('Using Your Advantages to Help Others');
            expect(html).toContain('superpowers');
        });

        test('low score participant receives low privilege debrief', () => {
            const html = renderModalDebrief(lowScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('Your Journey and Resilience');
            expect(html).toContain('resilience');
        });

        test('neutral score participant receives neutral debrief', () => {
            const html = renderModalDebrief(neutralScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('Understanding Your Mixed Experience');
            expect(html).toContain('intersectionality');
        });

        test('boundary score at normalized 0.4 is categorized as neutral', () => {
            // normalized = 0.4 → score = -10 + 0.4 * 20 = -2
            const participant = { ...neutralScoreParticipant, score: -2 };
            const html = renderModalDebrief(participant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('Understanding Your Mixed Experience');
        });

        test('boundary score just above normalized 0.6 is categorized as high', () => {
            // normalized ≈ 0.61 → score = -10 + 0.61 * 20 = 2.2
            const participant = { ...highScoreParticipant, score: 2.2 };
            const html = renderModalDebrief(participant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('Using Your Advantages to Help Others');
        });
    });

    describe('Requirement 13.3: Response analysis includes actual analyzed responses', () => {
        test('response cards contain question text from the question set', () => {
            const html = renderModalDebrief(highScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            const hasQuestionText = testQuestions.some(q => html.includes(q.text));
            expect(hasQuestionText).toBe(true);
        });

        test('response cards include Yes/No answers', () => {
            const html = renderModalDebrief(highScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            const hasYes = html.includes('Your answer: Yes');
            const hasNo = html.includes('Your answer: No');
            expect(hasYes || hasNo).toBe(true);
        });

        test('response cards include non-empty contextual explanations', () => {
            const html = renderModalDebrief(lowScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

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
            const html = renderModalDebrief(highScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            const cardCount = (html.match(/class="response-card"/g) || []).length;
            expect(cardCount).toBeGreaterThanOrEqual(3);
            expect(cardCount).toBeLessThanOrEqual(5);
        });
    });

    describe('Requirement 13.4: Categorization consistent with ally tips', () => {
        const categoryMap = { low: 'lowPrivilege', neutral: 'neutral', high: 'highPrivilege' };

        const representativeScores = [-9, -5, -2, 0, 2, 5, 9];

        representativeScores.forEach(score => {
            test(`score ${score} categorized consistently between debrief engine and ally tips`, () => {
                const debriefCategory = categorizePrivilegeScore(score, SPECTRUM_MIN, SPECTRUM_MAX);
                const allyCategory = categorizeScore(score, SPECTRUM_MIN, SPECTRUM_MAX);

                expect(categoryMap[debriefCategory]).toBe(allyCategory);
            });
        });

        test('modal debrief category matches ally tips category for high score participant', () => {
            const html = renderModalDebrief(highScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);
            const allyCategory = categorizeScore(highScoreParticipant.score, SPECTRUM_MIN, SPECTRUM_MAX);

            expect(html).toContain('Using Your Advantages to Help Others');
            expect(allyCategory).toBe('highPrivilege');
        });

        test('modal debrief category matches ally tips category for low score participant', () => {
            const html = renderModalDebrief(lowScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);
            const allyCategory = categorizeScore(lowScoreParticipant.score, SPECTRUM_MIN, SPECTRUM_MAX);

            expect(html).toContain('Your Journey and Resilience');
            expect(allyCategory).toBe('lowPrivilege');
        });

        test('modal debrief category matches ally tips category for neutral score participant', () => {
            const html = renderModalDebrief(neutralScoreParticipant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);
            const allyCategory = categorizeScore(neutralScoreParticipant.score, SPECTRUM_MIN, SPECTRUM_MAX);

            expect(html).toContain('Understanding Your Mixed Experience');
            expect(allyCategory).toBe('neutral');
        });
    });

    describe('Existing modal functionality preserved', () => {
        test('handles participant with array-format answers', () => {
            const participant = { score: 5, answers: [1, 0, 1, 0, 1, 1, 1, 0, 1, 0] };
            const html = renderModalDebrief(participant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('class="debrief-container"');
            expect(html).toContain('class="debrief-section score-meaning"');
            expect(html).toContain('class="response-card"');
        });

        test('handles participant with no answers gracefully', () => {
            const participant = { id: 'empty', name: 'Empty', score: 3, answers: {} };
            const html = renderModalDebrief(participant, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('class="debrief-container"');
            expect(html).toContain('class="debrief-section score-meaning"');
            // No response cards expected when no answers
            expect(html).not.toContain('class="response-card"');
        });

        test('handles null participant without crashing', () => {
            const html = renderModalDebrief(null, SPECTRUM_MIN, SPECTRUM_MAX, testQuestions);

            expect(html).toContain('class="debrief-container"');
            expect(html).toContain('class="debrief-section score-meaning"');
        });

        test('works with different spectrum ranges', () => {
            const html = renderModalDebrief(
                { ...highScoreParticipant, score: 30 },
                -50, 50,
                testQuestions
            );

            expect(html).toContain('class="debrief-container"');
            expect(html).toContain('class="debrief-section score-meaning"');
            expect(html).toContain('class="debrief-section response-analysis"');
        });
    });
});
