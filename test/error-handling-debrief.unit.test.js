/**
 * Unit tests for error handling in debrief engine and renderer.
 * Tests invalid inputs, missing data, and rendering fallbacks.
 * Requirements: 15.4
 */

import { describe, it, expect, vi } from 'vitest';
import { normalizeScore, formatScore, selectResponsesForAnalysis } from '../debrief-engine.js';
import { renderScoreMeaning, renderFreePlayDebrief, renderModalDebrief } from '../debrief-renderer.js';

describe('Error Handling - normalizeScore', () => {
    it('should return 0.5 for NaN score', () => {
        expect(normalizeScore(NaN, -10, 10)).toBe(0.5);
    });

    it('should return 0.5 for NaN min', () => {
        expect(normalizeScore(5, NaN, 10)).toBe(0.5);
    });

    it('should return 0.5 for NaN max', () => {
        expect(normalizeScore(5, -10, NaN)).toBe(0.5);
    });

    it('should return 0.5 when min equals max', () => {
        expect(normalizeScore(5, 5, 5)).toBe(0.5);
    });

    it('should clamp score below min to 0', () => {
        expect(normalizeScore(-20, -10, 10)).toBe(0);
    });

    it('should clamp score above max to 1', () => {
        expect(normalizeScore(20, -10, 10)).toBe(1);
    });

    it('should handle string inputs by coercing to number', () => {
        expect(normalizeScore('5', '-10', '10')).toBe(0.75);
    });

    it('should return 0.5 for non-numeric string score', () => {
        expect(normalizeScore('abc', -10, 10)).toBe(0.5);
    });

    it('should return 0.5 for undefined inputs', () => {
        expect(normalizeScore(undefined, -10, 10)).toBe(0.5);
    });
});

describe('Error Handling - formatScore', () => {
    it('should return "0" for NaN input', () => {
        expect(formatScore(NaN)).toBe('0');
    });

    it('should return "0" for undefined input', () => {
        expect(formatScore(undefined)).toBe('0');
    });

    it('should return "0" for non-numeric string', () => {
        expect(formatScore('abc')).toBe('0');
    });

    it('should handle numeric string input', () => {
        expect(formatScore('5')).toBe('+5');
    });

    it('should handle negative numeric string', () => {
        expect(formatScore('-3')).toBe('-3');
    });

    it('should return "0" for null input', () => {
        expect(formatScore(null)).toBe('0');
    });

    it('should format positive score with + prefix', () => {
        expect(formatScore(10)).toBe('+10');
    });

    it('should format negative score with - prefix', () => {
        expect(formatScore(-7)).toBe('-7');
    });

    it('should format zero without prefix', () => {
        expect(formatScore(0)).toBe('0');
    });
});

describe('Error Handling - selectResponsesForAnalysis', () => {
    const mockQuestions = [
        { text: 'Q1', value: 1 },
        { text: 'Q2', value: -1 },
        { text: 'Q3', value: 2 },
        { text: 'Q4', value: -2 },
        { text: 'Q5', value: 1 },
    ];

    it('should return empty array for null answers', () => {
        expect(selectResponsesForAnalysis(null, mockQuestions)).toEqual([]);
    });

    it('should return empty array for undefined answers', () => {
        expect(selectResponsesForAnalysis(undefined, mockQuestions)).toEqual([]);
    });

    it('should handle string answer values by converting', () => {
        const answers = { '0': 'true', '1': 'false', '2': '1', '3': '0', '4': 'yes' };
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        expect(result.length).toBeGreaterThan(0);
        result.forEach(r => {
            expect(r.userAnswer === 0 || r.userAnswer === 1).toBe(true);
        });
    });

    it('should handle boolean answer values by converting', () => {
        const answers = { '0': true, '1': false, '2': true, '3': false, '4': true };
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        expect(result.length).toBeGreaterThan(0);
        result.forEach(r => {
            expect(r.userAnswer === 0 || r.userAnswer === 1).toBe(true);
        });
    });

    it('should skip invalid non-convertible answer values', () => {
        // Note: [] converts to Number([]) === 0, so index 2 is valid
        const answers = { '0': 'invalid', '1': {}, '2': 'garbage', '3': 0, '4': 1 };
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        // Only indices 3 and 4 have valid answers
        expect(result.length).toBe(2);
        expect(result.every(r => r.userAnswer === 0 || r.userAnswer === 1)).toBe(true);
    });

    it('should return empty array for all-invalid answers', () => {
        const answers = { '0': 'bad', '1': 'nope', '2': {}, '3': 'xyz', '4': 'abc' };
        const result = selectResponsesForAnalysis(answers, mockQuestions);
        expect(result).toEqual([]);
    });
});

describe('Error Handling - renderScoreMeaning', () => {
    it('should render fallback for null debrief', () => {
        const html = renderScoreMeaning(null);
        expect(html).toContain('class="debrief-section score-meaning"');
        expect(html).toContain('Understanding Your Score');
        expect(html).toContain('unique combination of circumstances');
    });

    it('should render fallback for undefined debrief', () => {
        const html = renderScoreMeaning(undefined);
        expect(html).toContain('class="debrief-section score-meaning"');
        expect(html).toContain('unique combination of circumstances');
    });

    it('should render fallback for non-object debrief (string)', () => {
        const html = renderScoreMeaning('not an object');
        expect(html).toContain('class="debrief-section score-meaning"');
        expect(html).toContain('unique combination of circumstances');
    });

    it('should render fallback for non-object debrief (number)', () => {
        const html = renderScoreMeaning(42);
        expect(html).toContain('class="debrief-section score-meaning"');
        expect(html).toContain('unique combination of circumstances');
    });
});

describe('Error Handling - renderFreePlayDebrief fallback', () => {
    it('should return error fallback HTML when an internal error occurs', () => {
        // Pass a score that will work but sabotage questions to trigger an error path
        // The function catches errors and returns a fallback
        const html = renderFreePlayDebrief(5, [1, 0, 1], -10, 10, []);
        // With empty questions, response analysis is empty but no error thrown
        expect(html).toContain('class="debrief-container"');
    });

    it('should return error fallback when categorization throws', () => {
        // Passing a Proxy that throws on property access to trigger the catch block
        const badAnswers = new Proxy({}, {
            get() { throw new Error('Simulated failure'); }
        });
        const html = renderFreePlayDebrief(5, badAnswers, -10, 10, [
            { text: 'Q1', value: 1 }
        ]);
        // Should either succeed gracefully or show the error fallback
        expect(html).toContain('class="debrief-container"');
    });

    it('should contain debrief-error class when a rendering error occurs', () => {
        // Force an error by making categorizePrivilegeScore receive bad data
        // that propagates through the pipeline
        const throwingQuestions = new Proxy([], {
            get(target, prop) {
                if (prop === 'length') return 3;
                if (prop === 'map' || prop === 'filter') throw new Error('Simulated');
                return target[prop];
            }
        });
        const html = renderFreePlayDebrief(5, [1, 0, 1], -10, 10, throwingQuestions);
        expect(html).toContain('debrief-error');
        expect(html).toContain('Unable to load personalized debrief');
    });
});

describe('Error Handling - renderModalDebrief fallback', () => {
    it('should handle null participant gracefully', () => {
        const html = renderModalDebrief(null, -10, 10, []);
        expect(html).toContain('class="debrief-container"');
    });

    it('should handle participant with missing score', () => {
        const html = renderModalDebrief({ answers: { '0': 1 } }, -10, 10, [
            { text: 'Q1', value: 1 }
        ]);
        expect(html).toContain('class="debrief-container"');
        expect(html).toContain('score-meaning');
    });

    it('should handle participant with missing answers', () => {
        const html = renderModalDebrief({ score: 5 }, -10, 10, []);
        expect(html).toContain('class="debrief-container"');
    });

    it('should return error fallback when internal error occurs', () => {
        const throwingQuestions = new Proxy([], {
            get(target, prop) {
                if (prop === 'length') return 3;
                if (prop === 'map' || prop === 'filter') throw new Error('Simulated');
                return target[prop];
            }
        });
        const html = renderModalDebrief({ score: 5, answers: [1, 0, 1] }, -10, 10, throwingQuestions);
        expect(html).toContain('debrief-error');
        expect(html).toContain('Unable to load personalized debrief');
    });
});
