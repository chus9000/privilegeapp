/**
 * Unit tests for renderFreePlayDebrief function
 *
 * Tests the orchestration of debrief engine calls and correct HTML assembly.
 * Requirements: 12.1, 12.2, 12.3
 */

import { describe, test, expect } from 'vitest';
import { renderFreePlayDebrief } from '../debrief-renderer.js';

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

// Answers where participant answered all questions (mix of yes/no)
const testAnswers = { '0': 1, '1': 0, '2': 1, '3': 0, '4': 1, '5': 1, '6': 1 };

describe('renderFreePlayDebrief', () => {
    test('should return HTML wrapped in a .debrief-container div', () => {
        const html = renderFreePlayDebrief(5, testAnswers, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html.trim().startsWith('<div class="debrief-container">')).toBe(true);
        expect(html.trim().endsWith('</div>')).toBe(true);
    });

    test('should contain score meaning section', () => {
        const html = renderFreePlayDebrief(5, testAnswers, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-section score-meaning"');
        expect(html).toContain('<h2>Understanding Your Score</h2>');
    });

    test('should contain response analysis section', () => {
        const html = renderFreePlayDebrief(5, testAnswers, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-section response-analysis"');
        expect(html).toContain('<h2>Understanding Privilege in Context</h2>');
    });

    test('should place score meaning before response analysis', () => {
        const html = renderFreePlayDebrief(5, testAnswers, -10, 10, testQuestions);
        const scoreMeaningPos = html.indexOf('class="debrief-section score-meaning"');
        const responseAnalysisPos = html.indexOf('class="debrief-section response-analysis"');
        expect(scoreMeaningPos).toBeLessThan(responseAnalysisPos);
    });

    // Category-specific debrief content tests
    test('should render high privilege debrief for high scores', () => {
        // score 8 in range -10..10 → normalized = 0.9 → high
        const html = renderFreePlayDebrief(8, testAnswers, -10, 10, testQuestions);
        expect(html).toContain('Using Your Advantages to Help Others');
        expect(html).toContain('superpowers');
    });

    test('should render low privilege debrief for low scores', () => {
        // score -8 in range -10..10 → normalized = 0.1 → low
        const html = renderFreePlayDebrief(-8, testAnswers, -10, 10, testQuestions);
        expect(html).toContain('Your Journey and Resilience');
        expect(html).toContain('resilience');
    });

    test('should render neutral privilege debrief for mid-range scores', () => {
        // score 0 in range -10..10 → normalized = 0.5 → neutral
        const html = renderFreePlayDebrief(0, testAnswers, -10, 10, testQuestions);
        expect(html).toContain('Understanding Your Mixed Experience');
        expect(html).toContain('intersectionality');
    });

    // Response analysis content tests
    test('should include response cards with question text', () => {
        const html = renderFreePlayDebrief(5, testAnswers, -10, 10, testQuestions);
        expect(html).toContain('class="response-card"');
        expect(html).toContain('class="question-text"');
    });

    test('should include user answers as Yes/No', () => {
        const html = renderFreePlayDebrief(5, testAnswers, -10, 10, testQuestions);
        expect(html).toContain('Your answer:');
        // Should contain at least one Yes or No
        const hasYesOrNo = html.includes('Your answer: Yes') || html.includes('Your answer: No');
        expect(hasYesOrNo).toBe(true);
    });

    test('should include contextual explanations', () => {
        const html = renderFreePlayDebrief(5, testAnswers, -10, 10, testQuestions);
        expect(html).toContain('class="explanation"');
        // Explanations should not be empty — they come from generateResponseExplanation
        const explanationMatches = html.match(/<div class="explanation">(.*?)<\/div>/g) || [];
        for (const match of explanationMatches) {
            const content = match.replace(/<div class="explanation">/, '').replace(/<\/div>/, '');
            expect(content.length).toBeGreaterThan(0);
        }
    });

    // Edge cases
    test('should handle empty answers gracefully', () => {
        const html = renderFreePlayDebrief(5, {}, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('class="debrief-section score-meaning"');
        expect(html).toContain('class="debrief-section response-analysis"');
        // No response cards when no answers
        expect(html).not.toContain('class="response-card"');
    });

    test('should handle null answers gracefully', () => {
        const html = renderFreePlayDebrief(5, null, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('class="debrief-section score-meaning"');
    });

    test('should handle empty questions array', () => {
        const html = renderFreePlayDebrief(5, testAnswers, -10, 10, []);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('class="debrief-section score-meaning"');
        expect(html).not.toContain('class="response-card"');
    });

    test('should handle array-format answers', () => {
        const arrayAnswers = [1, 0, 1, 0, 1, 1, 1];
        const html = renderFreePlayDebrief(5, arrayAnswers, -10, 10, testQuestions);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('class="response-card"');
    });

    test('should use same categorization logic as debrief engine', () => {
        // Boundary test: normalized = 0.4 → neutral
        // score = min + 0.4 * (max - min) = -10 + 0.4 * 20 = -2
        const html = renderFreePlayDebrief(-2, testAnswers, -10, 10, testQuestions);
        expect(html).toContain('Understanding Your Mixed Experience');
    });

    test('should handle min equals max edge case', () => {
        // When min === max, normalizeScore returns 0.5 → neutral
        const html = renderFreePlayDebrief(5, testAnswers, 5, 5, testQuestions);
        expect(html).toContain('Understanding Your Mixed Experience');
    });

    test('should produce between 3 and 5 response cards when enough questions answered', () => {
        const html = renderFreePlayDebrief(5, testAnswers, -10, 10, testQuestions);
        const cardCount = (html.match(/class="response-card"/g) || []).length;
        expect(cardCount).toBeGreaterThanOrEqual(3);
        expect(cardCount).toBeLessThanOrEqual(5);
    });
});
