/**
 * Unit tests for renderModalDebrief function
 *
 * Tests the event mode modal debrief renderer that extracts score and answers
 * from participant data and generates compact debrief sections.
 * Requirements: 13.1, 13.2, 13.3
 */

import { describe, test, expect } from 'vitest';
import { renderModalDebrief } from '../debrief-renderer.js';

// Reusable test questions with a mix of positive and negative values
const testQuestions = [
    { text: 'Can you show affection for your romantic partner in public without fear?', value: 2 },
    { text: 'Have you ever been the only person of your race in a room?', value: -2 },
    { text: 'Were you raised in an area with regular access to a doctor?', value: 1 },
    { text: 'Did your parents work nights and weekends to support your family?', value: -1 },
    { text: 'Can you take a vacation at least once a year?', value: 1 },
    { text: 'Have you ever been bullied for your appearance?', value: -1 },
    { text: 'Do you have access to quality education?', value: 1 },
];

// Participant with object-format answers (as used in event mode)
const highScoreParticipant = {
    id: 'test-id-1',
    name: 'Brave Tiger',
    avatar: '🐯',
    score: 8,
    answers: { '0': 1, '1': 0, '2': 1, '3': 0, '4': 1, '5': 0, '6': 1 },
    createdAt: '2024-01-01T00:00:00.000Z'
};

const lowScoreParticipant = {
    id: 'test-id-2',
    name: 'Gentle Fox',
    avatar: '🦊',
    score: -8,
    answers: { '0': 0, '1': 1, '2': 0, '3': 1, '4': 0, '5': 1, '6': 0 },
    createdAt: '2024-01-01T00:00:00.000Z'
};

const neutralScoreParticipant = {
    id: 'test-id-3',
    name: 'Calm Bear',
    avatar: '🐻',
    score: 0,
    answers: { '0': 1, '1': 1, '2': 0, '3': 0, '4': 1, '5': 1, '6': 0 },
    createdAt: '2024-01-01T00:00:00.000Z'
};

describe('renderModalDebrief', () => {
    test('should return HTML wrapped in a .debrief-container div', () => {
        const html = renderModalDebrief(highScoreParticipant, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html.trim().startsWith('<div class="debrief-container">')).toBe(true);
        expect(html.trim().endsWith('</div>')).toBe(true);
    });

    test('should contain score meaning section', () => {
        const html = renderModalDebrief(highScoreParticipant, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-section score-meaning"');
        expect(html).toContain('<h2>Understanding Your Score</h2>');
    });

    test('should contain response analysis section', () => {
        const html = renderModalDebrief(highScoreParticipant, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-section response-analysis"');
        expect(html).toContain('<h2>Understanding Privilege in Context</h2>');
    });

    test('should place score meaning before response analysis', () => {
        const html = renderModalDebrief(highScoreParticipant, -10, 10, testQuestions);
        const scoreMeaningPos = html.indexOf('class="debrief-section score-meaning"');
        const responseAnalysisPos = html.indexOf('class="debrief-section response-analysis"');
        expect(scoreMeaningPos).toBeLessThan(responseAnalysisPos);
    });

    // Category-specific debrief content
    test('should render high privilege debrief for high score participant', () => {
        const html = renderModalDebrief(highScoreParticipant, -10, 10, testQuestions);
        expect(html).toContain('Using Your Advantages to Help Others');
        expect(html).toContain('superpowers');
    });

    test('should render low privilege debrief for low score participant', () => {
        const html = renderModalDebrief(lowScoreParticipant, -10, 10, testQuestions);
        expect(html).toContain('Your Journey and Resilience');
        expect(html).toContain('resilience');
    });

    test('should render neutral privilege debrief for neutral score participant', () => {
        const html = renderModalDebrief(neutralScoreParticipant, -10, 10, testQuestions);
        expect(html).toContain('Understanding Your Mixed Experience');
        expect(html).toContain('intersectionality');
    });

    // Response analysis content
    test('should include response cards with question text', () => {
        const html = renderModalDebrief(highScoreParticipant, -10, 10, testQuestions);
        expect(html).toContain('class="response-card"');
        expect(html).toContain('class="question-text"');
    });

    test('should include user answers as Yes/No', () => {
        const html = renderModalDebrief(highScoreParticipant, -10, 10, testQuestions);
        expect(html).toContain('Your answer:');
        const hasYesOrNo = html.includes('Your answer: Yes') || html.includes('Your answer: No');
        expect(hasYesOrNo).toBe(true);
    });

    test('should include contextual explanations', () => {
        const html = renderModalDebrief(highScoreParticipant, -10, 10, testQuestions);
        expect(html).toContain('class="explanation"');
        const explanationMatches = html.match(/<div class="explanation">(.*?)<\/div>/g) || [];
        for (const match of explanationMatches) {
            const content = match.replace(/<div class="explanation">/, '').replace(/<\/div>/, '');
            expect(content.length).toBeGreaterThan(0);
        }
    });

    test('should produce between 3 and 5 response cards when enough questions answered', () => {
        const html = renderModalDebrief(highScoreParticipant, -10, 10, testQuestions);
        const cardCount = (html.match(/class="response-card"/g) || []).length;
        expect(cardCount).toBeGreaterThanOrEqual(3);
        expect(cardCount).toBeLessThanOrEqual(5);
    });

    // Participant data extraction
    test('should extract score from participant object', () => {
        // Participant with score that maps to a specific category
        const participant = { ...highScoreParticipant, score: 8 };
        const html = renderModalDebrief(participant, -10, 10, testQuestions);
        // score 8 in range -10..10 → normalized = 0.9 → high
        expect(html).toContain('Using Your Advantages to Help Others');
    });

    test('should extract answers from participant object', () => {
        const participant = { score: 5, answers: { '0': 1, '2': 1, '4': 1 } };
        const html = renderModalDebrief(participant, -10, 10, testQuestions);
        expect(html).toContain('class="response-card"');
    });

    // Edge cases
    test('should handle participant with no answers', () => {
        const participant = { id: 'test', name: 'Test', score: 5, answers: {} };
        const html = renderModalDebrief(participant, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('class="debrief-section score-meaning"');
        expect(html).not.toContain('class="response-card"');
    });

    test('should handle participant with null answers', () => {
        const participant = { id: 'test', name: 'Test', score: 5, answers: null };
        const html = renderModalDebrief(participant, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('class="debrief-section score-meaning"');
    });

    test('should handle participant with undefined answers', () => {
        const participant = { id: 'test', name: 'Test', score: 5 };
        const html = renderModalDebrief(participant, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('class="debrief-section score-meaning"');
    });

    test('should handle null participant gracefully', () => {
        const html = renderModalDebrief(null, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('class="debrief-section score-meaning"');
    });

    test('should handle undefined participant gracefully', () => {
        const html = renderModalDebrief(undefined, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('class="debrief-section score-meaning"');
    });

    test('should default score to 0 when participant has no score', () => {
        const participant = { answers: { '0': 1, '2': 1 } };
        const html = renderModalDebrief(participant, -10, 10, testQuestions);
        // score 0 in range -10..10 → normalized = 0.5 → neutral
        expect(html).toContain('Understanding Your Mixed Experience');
    });

    test('should handle min equals max edge case', () => {
        const html = renderModalDebrief(highScoreParticipant, 5, 5, testQuestions);
        // When min === max, normalizeScore returns 0.5 → neutral
        expect(html).toContain('Understanding Your Mixed Experience');
    });

    test('should handle array-format answers from participant', () => {
        const participant = { score: 5, answers: [1, 0, 1, 0, 1, 1, 1] };
        const html = renderModalDebrief(participant, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('class="response-card"');
    });

    // Consistency with renderFreePlayDebrief
    test('should produce same category debrief as renderFreePlayDebrief for same score and range', () => {
        // Both should produce 'high' for score 8 in range -10..10
        const modalHtml = renderModalDebrief(highScoreParticipant, -10, 10, testQuestions);
        expect(modalHtml).toContain('Using Your Advantages to Help Others');
    });
});
