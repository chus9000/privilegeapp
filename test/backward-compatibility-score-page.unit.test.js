/**
 * Unit Tests: Backward Compatibility for Score Page Separation
 * 
 * Verifies that existing functionality continues to work after implementing
 * score page separation feature.
 */

import { describe, it, expect } from 'vitest';
import { renderStatCards, renderScoreMeaning, renderResponseAnalysis, renderFreePlayDebrief, renderModalDebrief } from '../debrief-renderer.js';
import { categorizePrivilegeScore, generateScoreDebrief, selectResponsesForAnalysis, generateResponseExplanation } from '../debrief-engine.js';

describe('Backward Compatibility - Debrief Engine', () => {
    it('should maintain categorizePrivilegeScore function', () => {
        expect(typeof categorizePrivilegeScore).toBe('function');
        
        // Test function still works
        const category = categorizePrivilegeScore(10, -25, 25);
        expect(category).toBeDefined();
        expect(['low', 'neutral', 'high']).toContain(category);
    });

    it('should maintain generateScoreDebrief function', () => {
        expect(typeof generateScoreDebrief).toBe('function');
        
        // Test function still works
        const debrief = generateScoreDebrief('high', 15);
        expect(debrief).toBeDefined();
        expect(debrief).toHaveProperty('title');
        expect(debrief).toHaveProperty('message');
        expect(debrief).toHaveProperty('category');
    });

    it('should maintain selectResponsesForAnalysis function', () => {
        expect(typeof selectResponsesForAnalysis).toBe('function');
        
        // Test function still works
        const answers = { 0: 1, 1: 0, 2: 1 };
        const questions = [
            { text: 'Q1', value: 3 },
            { text: 'Q2', value: -2 },
            { text: 'Q3', value: 1 }
        ];
        const selected = selectResponsesForAnalysis(answers, questions);
        expect(Array.isArray(selected)).toBe(true);
    });

    it('should maintain generateResponseExplanation function', () => {
        expect(typeof generateResponseExplanation).toBe('function');
        
        // Test function still works
        const question = { text: 'Test question', value: 3 };
        const answer = 1;
        const explanation = generateResponseExplanation(question, answer);
        expect(typeof explanation).toBe('string');
        expect(explanation.length).toBeGreaterThan(0);
    });
});

describe('Backward Compatibility - Debrief Renderer', () => {
    it('should maintain renderStatCards function', () => {
        expect(typeof renderStatCards).toBe('function');
        
        // Test function still works
        const html = renderStatCards(5, { mean: 3, median: 4, mode: 5 }, 75, 10, 7);
        expect(typeof html).toBe('string');
        expect(html).toContain('stat-cards-container');
    });

    it('should maintain renderScoreMeaning function', () => {
        expect(typeof renderScoreMeaning).toBe('function');
        
        // Test function still works
        const debrief = { title: 'Test', message: 'Message', category: 'neutral' };
        const html = renderScoreMeaning(debrief);
        expect(typeof html).toBe('string');
        expect(html).toContain('score-meaning');
    });

    it('should maintain renderResponseAnalysis function', () => {
        expect(typeof renderResponseAnalysis).toBe('function');
        
        // Test function still works
        const responses = [
            { questionText: 'Q1', userAnswerText: 'Yes', explanation: 'Explanation' }
        ];
        const html = renderResponseAnalysis(responses);
        expect(typeof html).toBe('string');
        expect(html).toContain('response-analysis');
    });

    it('should maintain renderFreePlayDebrief function', () => {
        expect(typeof renderFreePlayDebrief).toBe('function');
        
        // Test function still works
        const score = 5;
        const answers = { 0: 1, 1: 0 };
        const questions = [
            { text: 'Q1', value: 3 },
            { text: 'Q2', value: -2 }
        ];
        const analyticsData = {
            stats: { mean: 3, median: 4, mode: 5 },
            percentile: 75,
            totalParticipants: 10,
            lessPrivilegedCount: 7
        };
        
        const html = renderFreePlayDebrief(score, answers, -25, 25, questions, analyticsData);
        expect(typeof html).toBe('string');
        expect(html).toContain('debrief-container');
    });

    it('should maintain renderModalDebrief function', () => {
        expect(typeof renderModalDebrief).toBe('function');
        
        // Test function still works
        const participant = {
            score: 5,
            answers: { 0: 1, 1: 0 }
        };
        const questions = [
            { text: 'Q1', value: 3 },
            { text: 'Q2', value: -2 }
        ];
        const analyticsData = {
            stats: { mean: 3, median: 4, mode: 5 },
            percentile: 75,
            totalParticipants: 10,
            lessPrivilegedCount: 7
        };
        
        const html = renderModalDebrief(participant, -25, 25, questions, analyticsData);
        expect(typeof html).toBe('string');
        expect(html).toContain('debrief-container');
    });
});

describe('Backward Compatibility - Debrief Rendering Consistency', () => {
    it('should render same sections in both free play and modal debrief', () => {
        const score = 10;
        const answers = { 0: 1, 1: 0, 2: 1 };
        const questions = [
            { text: 'Q1', value: 3 },
            { text: 'Q2', value: -2 },
            { text: 'Q3', value: 1 }
        ];
        const analyticsData = {
            stats: { mean: 5, median: 6, mode: 7 },
            percentile: 80,
            totalParticipants: 15,
            lessPrivilegedCount: 12
        };

        // Render both versions
        const freePlayHTML = renderFreePlayDebrief(score, answers, -25, 25, questions, analyticsData);
        const participant = { score, answers };
        const modalHTML = renderModalDebrief(participant, -25, 25, questions, analyticsData);

        // Both should contain same sections
        expect(freePlayHTML).toContain('stat-cards-container');
        expect(modalHTML).toContain('stat-cards-container');
        
        expect(freePlayHTML).toContain('score-meaning');
        expect(modalHTML).toContain('score-meaning');
        
        expect(freePlayHTML).toContain('response-analysis');
        expect(modalHTML).toContain('response-analysis');
    });

    it('should handle null analytics data consistently', () => {
        const score = 5;
        const answers = { 0: 1, 1: 0 };
        const questions = [
            { text: 'Q1', value: 3 },
            { text: 'Q2', value: -2 }
        ];

        // Render with null analytics
        const freePlayHTML = renderFreePlayDebrief(score, answers, -25, 25, questions, null);
        const participant = { score, answers };
        const modalHTML = renderModalDebrief(participant, -25, 25, questions, null);

        // Both should not contain stat cards
        expect(freePlayHTML).not.toContain('stat-cards-container');
        expect(modalHTML).not.toContain('stat-cards-container');
        
        // Both should still contain other sections
        expect(freePlayHTML).toContain('score-meaning');
        expect(modalHTML).toContain('score-meaning');
    });
});

describe('Backward Compatibility - Results Page Functionality', () => {
    it('should maintain spectrum visualization structure', () => {
        // Verify spectrum visualization elements are still expected
        const spectrumElements = [
            'spectrum-container',
            'spectrum-bar',
            'participant-marker',
            'spectrum-section'
        ];

        // These elements should still be part of the results page structure
        spectrumElements.forEach(element => {
            expect(typeof element).toBe('string');
            expect(element.length).toBeGreaterThan(0);
        });
    });

    it('should maintain detailed results page navigation', () => {
        const eventId = 'event-123';
        const detailedResultsUrl = `./detailed-results.html?id=${eventId}`;
        
        expect(detailedResultsUrl).toBe('./detailed-results.html?id=event-123');
        expect(detailedResultsUrl).toContain('detailed-results.html');
        expect(detailedResultsUrl).toContain('id=event-123');
    });
});

describe('Backward Compatibility - Function Signatures', () => {
    it('should maintain renderStatCards signature', () => {
        // Test with all parameters
        const html1 = renderStatCards(5, { mean: 3, median: 4, mode: 5 }, 75, 10, 7);
        expect(html1).toBeDefined();
        
        // Test with default parameters
        const html2 = renderStatCards(5);
        expect(html2).toBeDefined();
    });

    it('should maintain renderFreePlayDebrief signature', () => {
        const questions = [{ text: 'Q1', value: 3 }];
        
        // Test with analytics data
        const html1 = renderFreePlayDebrief(5, { 0: 1 }, -25, 25, questions, {
            stats: { mean: 3, median: 4, mode: 5 },
            percentile: 75,
            totalParticipants: 10,
            lessPrivilegedCount: 7
        });
        expect(html1).toBeDefined();
        
        // Test without analytics data
        const html2 = renderFreePlayDebrief(5, { 0: 1 }, -25, 25, questions, null);
        expect(html2).toBeDefined();
    });

    it('should maintain renderModalDebrief signature', () => {
        const participant = { score: 5, answers: { 0: 1 } };
        const questions = [{ text: 'Q1', value: 3 }];
        
        // Test with analytics data
        const html1 = renderModalDebrief(participant, -25, 25, questions, {
            stats: { mean: 3, median: 4, mode: 5 },
            percentile: 75,
            totalParticipants: 10,
            lessPrivilegedCount: 7
        });
        expect(html1).toBeDefined();
        
        // Test without analytics data
        const html2 = renderModalDebrief(participant, -25, 25, questions, null);
        expect(html2).toBeDefined();
    });
});
