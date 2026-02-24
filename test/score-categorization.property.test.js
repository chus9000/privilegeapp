/**
 * Property-Based Tests for Score Categorization
 * 
 * Feature: personalized-results-debrief, Property 2: Score Categorization Algorithm
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 * 
 * Property: For any privilege score and spectrum range (min, max), the categorization 
 * function should return 'high' when the normalized score is greater than 0.6, 'low' 
 * when less than 0.4, and 'neutral' when between 0.4 and 0.6 inclusive.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { categorizePrivilegeScore, normalizeScore } from '../debrief-engine.js';

describe('Property 2: Score Categorization Algorithm', () => {
    test('categorization should match threshold rules for any score and range', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 100 }), // score
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                (score, minOffset, maxOffset) => {
                    const min = minOffset;
                    const max = maxOffset;
                    
                    // Skip invalid ranges
                    if (min >= max) return true;
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const normalized = normalizeScore(score, min, max);
                    
                    // Verify categorization matches the specification
                    if (normalized > 0.6) {
                        return category === 'high';
                    } else if (normalized < 0.4) {
                        return category === 'low';
                    } else {
                        return category === 'neutral';
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('high privilege category should be assigned for normalized scores > 0.6', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max (ensure valid range)
                fc.double({ min: 0.601, max: 1.0, noNaN: true }), // normalized position strictly > 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    
                    return category === 'high';
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('low privilege category should be assigned for normalized scores < 0.4', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max (ensure valid range)
                fc.double({ min: 0.0, max: 0.399, noNaN: true }), // normalized position strictly < 40%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    
                    return category === 'low';
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('neutral category should be assigned for normalized scores between 0.4 and 0.6', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max (ensure valid range)
                fc.double({ min: 0.41, max: 0.59, noNaN: true }),  // normalized position safely within 40%-60% (avoids floating-point boundary issues)
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    
                    return category === 'neutral';
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('categorization should be consistent across symmetric ranges', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 50 }),    // range magnitude
                fc.integer({ min: -50, max: 50 }),  // score
                (rangeMag, score) => {
                    const min = -rangeMag;
                    const max = rangeMag;
                    
                    // Clamp score to valid range
                    const clampedScore = Math.max(min, Math.min(max, score));
                    
                    const category = categorizePrivilegeScore(clampedScore, min, max);
                    const normalized = normalizeScore(clampedScore, min, max);
                    
                    // Verify categorization matches normalized score
                    if (normalized > 0.6) {
                        return category === 'high';
                    } else if (normalized < 0.4) {
                        return category === 'low';
                    } else {
                        return category === 'neutral';
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('categorization should work with asymmetric ranges', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: -1 }), // min
                fc.integer({ min: 1, max: 100 }),   // max
                (min, max) => {
                    // Test boundary scores
                    const lowScore = min;
                    const midScore = min + (max - min) * 0.5;
                    const highScore = max;
                    
                    const lowCategory = categorizePrivilegeScore(lowScore, min, max);
                    const midCategory = categorizePrivilegeScore(midScore, min, max);
                    const highCategory = categorizePrivilegeScore(highScore, min, max);
                    
                    // Verify categories match expected values
                    return lowCategory === 'low' &&
                           midCategory === 'neutral' &&
                           highCategory === 'high';
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('boundary values should be categorized correctly', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max
                (min, max) => {
                    const range = max - min;
                    
                    // Test exact boundary values
                    const lowBoundary = min + (range * 0.4);
                    const highBoundary = min + (range * 0.6);
                    
                    // Just below high threshold (should be neutral)
                    const justBelowHigh = highBoundary - 0.001;
                    const categoryBelowHigh = categorizePrivilegeScore(justBelowHigh, min, max);
                    
                    // Just above low threshold (should be neutral)
                    const justAboveLow = lowBoundary + 0.001;
                    const categoryAboveLow = categorizePrivilegeScore(justAboveLow, min, max);
                    
                    // Just above high threshold (should be high)
                    const justAboveHigh = highBoundary + 0.001;
                    const categoryAboveHigh = categorizePrivilegeScore(justAboveHigh, min, max);
                    
                    // Just below low threshold (should be low)
                    const justBelowLow = lowBoundary - 0.001;
                    const categoryBelowLow = categorizePrivilegeScore(justBelowLow, min, max);
                    
                    return categoryBelowHigh === 'neutral' &&
                           categoryAboveLow === 'neutral' &&
                           categoryAboveHigh === 'high' &&
                           categoryBelowLow === 'low';
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('scores outside range should be clamped and categorized', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max
                fc.integer({ min: -200, max: 200 }), // score (potentially outside range)
                (min, max, score) => {
                    const category = categorizePrivilegeScore(score, min, max);
                    
                    // Should return a valid category
                    return category === 'low' || category === 'neutral' || category === 'high';
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('normalization should always return value between 0 and 1', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 100 }), // score
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                (score, minOffset, maxOffset) => {
                    const min = minOffset;
                    const max = maxOffset;
                    
                    // Skip invalid ranges
                    if (min >= max) return true;
                    
                    const normalized = normalizeScore(score, min, max);
                    
                    // Verify normalized value is between 0 and 1
                    return normalized >= 0 && normalized <= 1;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('equal min and max should return neutral category', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 100 }), // value for both min and max
                fc.integer({ min: -100, max: 100 }), // score
                (value, score) => {
                    const category = categorizePrivilegeScore(score, value, value);
                    
                    // When min equals max, normalized score is 0.5, which should be neutral
                    return category === 'neutral';
                }
            ),
            { numRuns: 100 }
        );
    });
});
