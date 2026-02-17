/**
 * Property-Based Tests for Ally Tips Categorization
 * 
 * Feature: full-featured-quiz-app, Property 3: Ally Tips Categorization
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 * 
 * Property: For any privilege score and spectrum range, the displayed ally tips 
 * should match the appropriate category:
 * - High privilege tips for scores > 60% of max
 * - Neutral tips for scores between -40% and +40%
 * - Low privilege tips for scores < -60% of max
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { getTipsForScore, categorizeScore, allyTips } from '../ally-tips.js';

describe('Property 3: Ally Tips Categorization', () => {
    test('categorization should match threshold rules for any score and range', () => {
        fc.assert(
            fc.property(
                // Generate arbitrary scores and ranges
                fc.integer({ min: -100, max: 100 }), // score
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                (score, minOffset, maxOffset) => {
                    const min = minOffset;
                    const max = maxOffset;
                    
                    // Skip invalid ranges
                    if (min >= max) return true;
                    
                    // Clamp score to valid range for testing
                    const clampedScore = Math.max(min, Math.min(max, score));
                    
                    const category = categorizeScore(clampedScore, min, max);
                    const range = max - min;
                    const normalizedScore = (clampedScore - min) / range;
                    
                    // Verify categorization matches the specification
                    if (normalizedScore > 0.6) {
                        return category === 'highPrivilege';
                    } else if (normalizedScore < 0.4) {
                        return category === 'lowPrivilege';
                    } else {
                        return category === 'neutral';
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('getTipsForScore should return correct tips array for any score and range', () => {
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
                    
                    // Clamp score to valid range
                    const clampedScore = Math.max(min, Math.min(max, score));
                    
                    const tips = getTipsForScore(clampedScore, min, max);
                    const category = categorizeScore(clampedScore, min, max);
                    
                    // Verify tips match the category
                    return tips === allyTips[category];
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('high privilege category should be assigned for scores > 60% of range', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max (ensure valid range)
                fc.double({ min: 0.601, max: 1.0, noNaN: true }), // normalized position strictly > 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizeScore(score, min, max);
                    const tips = getTipsForScore(score, min, max);
                    
                    return category === 'highPrivilege' && 
                           tips === allyTips.highPrivilege;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('low privilege category should be assigned for scores < 40% of range', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max (ensure valid range)
                fc.double({ min: 0.0, max: 0.399, noNaN: true }), // normalized position strictly < 40%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizeScore(score, min, max);
                    const tips = getTipsForScore(score, min, max);
                    
                    return category === 'lowPrivilege' && 
                           tips === allyTips.lowPrivilege;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('neutral category should be assigned for scores between 40% and 60% of range', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max (ensure valid range)
                fc.double({ min: 0.401, max: 0.599, noNaN: true }),  // normalized position strictly between 40% and 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizeScore(score, min, max);
                    const tips = getTipsForScore(score, min, max);
                    
                    return category === 'neutral' && 
                           tips === allyTips.neutral;
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
                    
                    const category = categorizeScore(clampedScore, min, max);
                    const tips = getTipsForScore(clampedScore, min, max);
                    
                    // Verify tips match category
                    return tips === allyTips[category];
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
                    
                    const lowCategory = categorizeScore(lowScore, min, max);
                    const midCategory = categorizeScore(midScore, min, max);
                    const highCategory = categorizeScore(highScore, min, max);
                    
                    const lowTips = getTipsForScore(lowScore, min, max);
                    const midTips = getTipsForScore(midScore, min, max);
                    const highTips = getTipsForScore(highScore, min, max);
                    
                    // Verify tips match categories
                    return lowTips === allyTips[lowCategory] &&
                           midTips === allyTips[midCategory] &&
                           highTips === allyTips[highCategory];
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('tips should always be non-empty arrays for any valid input', () => {
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
                    
                    const clampedScore = Math.max(min, Math.min(max, score));
                    const tips = getTipsForScore(clampedScore, min, max);
                    
                    // Verify tips is an array with at least one element
                    return Array.isArray(tips) && tips.length > 0;
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
                    const categoryBelowHigh = categorizeScore(justBelowHigh, min, max);
                    
                    // Just above low threshold (should be neutral)
                    const justAboveLow = lowBoundary + 0.001;
                    const categoryAboveLow = categorizeScore(justAboveLow, min, max);
                    
                    // Just above high threshold (should be high)
                    const justAboveHigh = highBoundary + 0.001;
                    const categoryAboveHigh = categorizeScore(justAboveHigh, min, max);
                    
                    // Just below low threshold (should be low)
                    const justBelowLow = lowBoundary - 0.001;
                    const categoryBelowLow = categorizeScore(justBelowLow, min, max);
                    
                    return categoryBelowHigh === 'neutral' &&
                           categoryAboveLow === 'neutral' &&
                           categoryAboveHigh === 'highPrivilege' &&
                           categoryBelowLow === 'lowPrivilege';
                }
            ),
            { numRuns: 100 }
        );
    });
});
