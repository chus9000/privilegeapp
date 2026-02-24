/**
 * Property-Based Tests for Ally Tips Integration
 * 
 * Feature: personalized-results-debrief, Property 10: Ally Tips Integration
 * 
 * **Validates: Requirements 9.1, 9.2**
 * 
 * Property: For any participant, the rendered results page should display the ally tips
 * section with tips matching their score category. Since ally tips are rendered separately
 * by the existing code (not by the debrief renderer), this property test verifies that
 * the debrief engine's categorizePrivilegeScore produces categories that are consistent
 * with the ally tips module's categorizeScore. This ensures the debrief and ally tips
 * will always agree on the participant's category.
 * 
 * Category mapping: low → lowPrivilege, neutral → neutral, high → highPrivilege
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { categorizePrivilegeScore } from '../debrief-engine.js';
import { categorizeScore } from '../ally-tips.js';

/**
 * Maps debrief-engine categories to ally-tips categories.
 * debrief-engine uses: 'low', 'neutral', 'high'
 * ally-tips uses: 'lowPrivilege', 'neutral', 'highPrivilege'
 */
const debriefToAllyCategory = {
    low: 'lowPrivilege',
    neutral: 'neutral',
    high: 'highPrivilege'
};

describe('Property 10: Ally Tips Integration', () => {
    test('categorizePrivilegeScore and categorizeScore should agree on category for any score and range', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 100 }), // score
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                (score, min, max) => {
                    // Skip invalid ranges
                    if (min >= max) return true;

                    const debriefCategory = categorizePrivilegeScore(score, min, max);
                    const allyCategory = categorizeScore(score, min, max);

                    // The debrief category, when mapped, must match the ally tips category
                    return debriefToAllyCategory[debriefCategory] === allyCategory;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('categories should be consistent for scores at exact boundary thresholds', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max (ensure valid range)
                (min, max) => {
                    const range = max - min;

                    // Test at the 40% and 60% boundaries
                    const at40 = min + range * 0.4;
                    const at60 = min + range * 0.6;

                    const debrief40 = categorizePrivilegeScore(at40, min, max);
                    const ally40 = categorizeScore(at40, min, max);

                    const debrief60 = categorizePrivilegeScore(at60, min, max);
                    const ally60 = categorizeScore(at60, min, max);

                    return debriefToAllyCategory[debrief40] === ally40 &&
                           debriefToAllyCategory[debrief60] === ally60;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('categories should be consistent across symmetric ranges', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 50 }),    // range magnitude
                fc.integer({ min: -50, max: 50 }),  // score
                (rangeMag, score) => {
                    const min = -rangeMag;
                    const max = rangeMag;

                    const debriefCategory = categorizePrivilegeScore(score, min, max);
                    const allyCategory = categorizeScore(score, min, max);

                    return debriefToAllyCategory[debriefCategory] === allyCategory;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('categories should be consistent for scores outside the valid range (clamped)', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max
                fc.integer({ min: -200, max: 200 }), // score (potentially out of range)
                (min, max, score) => {
                    const debriefCategory = categorizePrivilegeScore(score, min, max);
                    const allyCategory = categorizeScore(score, min, max);

                    return debriefToAllyCategory[debriefCategory] === allyCategory;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('categories should be consistent for fractional scores', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -50, max: 50 }),  // min
                fc.integer({ min: 51, max: 100 }),  // max
                fc.double({ min: 0, max: 1, noNaN: true }), // normalized position
                (min, max, normalizedPosition) => {
                    const score = min + (max - min) * normalizedPosition;

                    const debriefCategory = categorizePrivilegeScore(score, min, max);
                    const allyCategory = categorizeScore(score, min, max);

                    return debriefToAllyCategory[debriefCategory] === allyCategory;
                }
            ),
            { numRuns: 100 }
        );
    });
});
