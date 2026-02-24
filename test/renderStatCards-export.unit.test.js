/**
 * Unit Test: renderStatCards Export Verification
 * 
 * Verifies that renderStatCards is properly exported from debrief-renderer.js
 * and can be imported in both score.js and results.js contexts.
 */

import { describe, it, expect } from 'vitest';
import { renderStatCards } from '../debrief-renderer.js';

describe('renderStatCards Export', () => {
    it('should be exported from debrief-renderer.js', () => {
        expect(renderStatCards).toBeDefined();
        expect(typeof renderStatCards).toBe('function');
    });

    it('should accept correct parameters', () => {
        const userScore = 5;
        const stats = { mean: 3, median: 4, mode: 5 };
        const percentile = 75;
        const totalParticipants = 10;
        const lessPrivilegedCount = 7;

        const result = renderStatCards(userScore, stats, percentile, totalParticipants, lessPrivilegedCount);

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('should render stat cards HTML with correct structure', () => {
        const userScore = 5;
        const stats = { mean: 3, median: 4, mode: 5 };
        const percentile = 75;
        const totalParticipants = 10;
        const lessPrivilegedCount = 7;

        const html = renderStatCards(userScore, stats, percentile, totalParticipants, lessPrivilegedCount);

        // Verify HTML contains expected elements
        expect(html).toContain('stat-cards-container');
        expect(html).toContain('stat-card');
        expect(html).toContain('TOTAL SCORE');
        expect(html).toContain('VS. OTHERS');
        expect(html).toContain('VS. MODE');
        expect(html).toContain('VS. MEDIAN');
    });

    it('should handle default parameters', () => {
        const userScore = 5;

        // Call with only required parameter
        const html = renderStatCards(userScore);

        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
        expect(html).toContain('stat-cards-container');
    });

    it('should format score with correct sign', () => {
        // Positive score
        const html1 = renderStatCards(5, { mean: 3, median: 4, mode: 5 }, 75, 10, 7);
        expect(html1).toContain('+5');

        // Negative score
        const html2 = renderStatCards(-5, { mean: -3, median: -4, mode: -5 }, 25, 10, 3);
        expect(html2).toContain('-5');

        // Zero score
        const html3 = renderStatCards(0, { mean: 0, median: 0, mode: 0 }, 50, 10, 5);
        expect(html3).toContain('0');
    });

    it('should calculate differences correctly', () => {
        const userScore = 10;
        const stats = { mean: 5, median: 7, mode: 8 };

        const html = renderStatCards(userScore, stats, 80, 10, 8);

        // VS. MODE: 10 - 8 = +2
        expect(html).toContain('+2 points');

        // VS. MEDIAN: 10 - 7 = +3
        expect(html).toContain('+3 points');
    });

    it('should display participant comparison correctly', () => {
        const userScore = 10;
        const stats = { mean: 5, median: 7, mode: 8 };
        const totalParticipants = 10;
        const lessPrivilegedCount = 7;

        const html = renderStatCards(userScore, stats, 70, totalParticipants, lessPrivilegedCount);

        expect(html).toContain('7/10');
        expect(html).toContain('participants');
        expect(html).toContain('are less privileged than you');
    });

    it('should handle first participant case', () => {
        const userScore = 5;
        const stats = { mean: 5, median: 5, mode: 5 };
        const totalParticipants = 1;
        const lessPrivilegedCount = 0;

        const html = renderStatCards(userScore, stats, 0, totalParticipants, lessPrivilegedCount);

        expect(html).toContain('0/1');
        expect(html).toContain('you are the first participant');
    });
});
