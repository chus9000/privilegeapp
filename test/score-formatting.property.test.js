/**
 * Property-Based Tests for Score Display Formatting
 * 
 * Feature: personalized-results-debrief, Property 1: Score Display Formatting
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * Property: For any participant score, the rendered results page should display 
 * the score in numeric format with appropriate sign prefix: "+" for positive 
 * scores, "-" for negative scores, and no prefix for zero.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { formatScore } from '../debrief-engine.js';

describe('Property 1: Score Display Formatting', () => {
    test('positive scores should be prefixed with "+"', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 1000 }),
                (score) => {
                    const formatted = formatScore(score);
                    return formatted === `+${score}`;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('negative scores should be prefixed with "-"', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1000, max: -1 }),
                (score) => {
                    const formatted = formatScore(score);
                    return formatted === `${score}` && formatted.startsWith('-');
                }
            ),
            { numRuns: 100 }
        );
    });

    test('zero should display without any prefix', () => {
        const formatted = formatScore(0);
        expect(formatted).toBe('0');
    });

    test('formatted output should always be a string containing the numeric value', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1000, max: 1000 }),
                (score) => {
                    const formatted = formatScore(score);
                    
                    // Must be a string
                    if (typeof formatted !== 'string') return false;
                    
                    // Must contain the absolute value of the score
                    const absStr = Math.abs(score).toString();
                    if (!formatted.includes(absStr)) return false;
                    
                    // Verify correct prefix based on sign
                    if (score > 0) return formatted.startsWith('+');
                    if (score < 0) return formatted.startsWith('-');
                    return formatted === '0';
                }
            ),
            { numRuns: 100 }
        );
    });
});
