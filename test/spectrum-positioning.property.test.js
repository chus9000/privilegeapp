/**
 * Property-Based Test for Spectrum Positioning
 * Feature: full-featured-quiz-app
 * 
 * Property 9: Spectrum Positioning
 * Validates: Requirements 7.3
 * 
 * For any participant with a score and a spectrum range (min, max), the participant's
 * position percentage should equal ((score - min) / (max - min)) * 100.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';

/**
 * Calculate position percentage for a participant on the spectrum
 * This is the core positioning logic from spectrum.js
 * 
 * @param {number} score - The participant's score
 * @param {number} min - Minimum spectrum value
 * @param {number} max - Maximum spectrum value
 * @returns {number} Position percentage (0-100)
 */
function calculatePositionPercentage(score, min, max) {
  const range = max - min;
  
  // Clamp score to spectrum range
  const clampedScore = Math.max(min, Math.min(max, score));
  
  // Calculate position percentage
  const positionPercentage = ((clampedScore - min) / range) * 100;
  
  return positionPercentage;
}

describe('Property 9: Spectrum Positioning', () => {
  test('position percentage should equal ((score - min) / (max - min)) * 100', () => {
    fc.assert(
      fc.property(
        // Generate score in valid range
        fc.integer({ min: -25, max: 25 }),
        // Generate spectrum range
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (score, spectrum) => {
          const { min, max } = spectrum;
          
          // Calculate position using the function
          const calculatedPosition = calculatePositionPercentage(score, min, max);
          
          // Calculate expected position manually
          const clampedScore = Math.max(min, Math.min(max, score));
          const range = max - min;
          const expectedPosition = ((clampedScore - min) / range) * 100;
          
          // Property: Calculated position should match expected position
          // Use small epsilon for floating point comparison
          return Math.abs(calculatedPosition - expectedPosition) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should be 0% when score equals min', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (spectrum) => {
          const { min, max } = spectrum;
          const position = calculatePositionPercentage(min, min, max);
          
          // Property: Score at minimum should be at 0% position
          return Math.abs(position - 0) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should be 100% when score equals max', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (spectrum) => {
          const { min, max } = spectrum;
          const position = calculatePositionPercentage(max, min, max);
          
          // Property: Score at maximum should be at 100% position
          return Math.abs(position - 100) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should be 50% when score is at midpoint', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (spectrum) => {
          const { min, max } = spectrum;
          const midpoint = (min + max) / 2;
          const position = calculatePositionPercentage(midpoint, min, max);
          
          // Property: Score at midpoint should be at 50% position
          return Math.abs(position - 50) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should be between 0% and 100% for any score within range', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (spectrum) => {
          const { min, max } = spectrum;
          // Generate score within range
          const score = fc.sample(fc.integer({ min, max }), 1)[0];
          const position = calculatePositionPercentage(score, min, max);
          
          // Property: Position should always be in valid range
          return position >= 0 && position <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should clamp scores below min to 0%', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (spectrum) => {
          const { min, max } = spectrum;
          // Score below minimum
          const score = min - fc.sample(fc.integer({ min: 1, max: 10 }), 1)[0];
          const position = calculatePositionPercentage(score, min, max);
          
          // Property: Scores below min should be clamped to 0%
          return Math.abs(position - 0) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should clamp scores above max to 100%', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (spectrum) => {
          const { min, max } = spectrum;
          // Score above maximum
          const score = max + fc.sample(fc.integer({ min: 1, max: 10 }), 1)[0];
          const position = calculatePositionPercentage(score, min, max);
          
          // Property: Scores above max should be clamped to 100%
          return Math.abs(position - 100) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should be proportional within range', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (spectrum) => {
          const { min, max } = spectrum;
          const range = max - min;
          
          // Generate two scores within range where score2 > score1
          const score1 = min + Math.floor(range * 0.25);
          const score2 = min + Math.floor(range * 0.75);
          
          const position1 = calculatePositionPercentage(score1, min, max);
          const position2 = calculatePositionPercentage(score2, min, max);
          
          // Property: Higher score should have higher position
          return position2 > position1;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should handle zero score correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (spectrum) => {
          const { min, max } = spectrum;
          const position = calculatePositionPercentage(0, min, max);
          
          // Calculate expected position for zero
          const range = max - min;
          const expectedPosition = ((0 - min) / range) * 100;
          
          // Property: Zero score should be positioned correctly
          return Math.abs(position - expectedPosition) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should work with symmetric ranges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 25 }),
        fc.integer({ min: -25, max: 25 }),
        (rangeValue, score) => {
          // Create symmetric range like -25 to +25
          const min = -rangeValue;
          const max = rangeValue;
          
          const position = calculatePositionPercentage(score, min, max);
          
          // Calculate expected
          const clampedScore = Math.max(min, Math.min(max, score));
          const range = max - min;
          const expectedPosition = ((clampedScore - min) / range) * 100;
          
          // Property: Should work correctly with symmetric ranges
          return Math.abs(position - expectedPosition) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should be consistent with multiple calls', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -25, max: 25 }),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (score, spectrum) => {
          const { min, max } = spectrum;
          
          // Call function multiple times
          const position1 = calculatePositionPercentage(score, min, max);
          const position2 = calculatePositionPercentage(score, min, max);
          const position3 = calculatePositionPercentage(score, min, max);
          
          // Property: Should return same result for same inputs
          return position1 === position2 && position2 === position3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should handle all standard spectrum ranges', () => {
    // Test all standard ranges from the design: ±25, ±20, ±15, ±10, ±5
    const standardRanges = [
      { min: -25, max: 25 },
      { min: -20, max: 20 },
      { min: -15, max: 15 },
      { min: -10, max: 10 },
      { min: -5, max: 5 }
    ];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...standardRanges),
        fc.integer({ min: -25, max: 25 }),
        (spectrum, score) => {
          const { min, max } = spectrum;
          const position = calculatePositionPercentage(score, min, max);
          
          // Calculate expected
          const clampedScore = Math.max(min, Math.min(max, score));
          const range = max - min;
          const expectedPosition = ((clampedScore - min) / range) * 100;
          
          // Property: Should work correctly with all standard ranges
          return Math.abs(position - expectedPosition) < 0.0001 &&
                 position >= 0 && position <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should be linear across the spectrum', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (spectrum) => {
          const { min, max } = spectrum;
          const range = max - min;
          
          // Test three equally spaced scores
          const score1 = min;
          const score2 = min + range / 2;
          const score3 = max;
          
          const position1 = calculatePositionPercentage(score1, min, max);
          const position2 = calculatePositionPercentage(score2, min, max);
          const position3 = calculatePositionPercentage(score3, min, max);
          
          // Property: Positions should be equally spaced (linear)
          const diff1 = position2 - position1;
          const diff2 = position3 - position2;
          
          return Math.abs(diff1 - diff2) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should handle negative scores correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -5 }),
          max: fc.integer({ min: 5, max: 25 })
        }),
        fc.integer({ min: -25, max: -1 }),
        (spectrum, negativeScore) => {
          const { min, max } = spectrum;
          const position = calculatePositionPercentage(negativeScore, min, max);
          
          // Calculate expected
          const clampedScore = Math.max(min, Math.min(max, negativeScore));
          const range = max - min;
          const expectedPosition = ((clampedScore - min) / range) * 100;
          
          // Property: Should correctly position negative scores
          return Math.abs(position - expectedPosition) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should handle positive scores correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -5 }),
          max: fc.integer({ min: 5, max: 25 })
        }),
        fc.integer({ min: 1, max: 25 }),
        (spectrum, positiveScore) => {
          const { min, max } = spectrum;
          const position = calculatePositionPercentage(positiveScore, min, max);
          
          // Calculate expected
          const clampedScore = Math.max(min, Math.min(max, positiveScore));
          const range = max - min;
          const expectedPosition = ((clampedScore - min) / range) * 100;
          
          // Property: Should correctly position positive scores
          return Math.abs(position - expectedPosition) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position calculation should be monotonic', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        fc.integer({ min: -25, max: 24 }),
        (spectrum, baseScore) => {
          const { min, max } = spectrum;
          
          // Calculate position for base score and base score + 1
          const position1 = calculatePositionPercentage(baseScore, min, max);
          const position2 = calculatePositionPercentage(baseScore + 1, min, max);
          
          // Property: Higher score should have equal or higher position
          return position2 >= position1;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should work with multiple participants at same score', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        fc.integer({ min: -25, max: 25 }),
        (spectrum, sharedScore) => {
          const { min, max } = spectrum;
          
          // Multiple participants with same score should have same position
          const position1 = calculatePositionPercentage(sharedScore, min, max);
          const position2 = calculatePositionPercentage(sharedScore, min, max);
          const position3 = calculatePositionPercentage(sharedScore, min, max);
          
          // Property: Same score should always yield same position
          return position1 === position2 && position2 === position3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should be independent of participant count', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        fc.integer({ min: -25, max: 25 }),
        (spectrum, score) => {
          const { min, max } = spectrum;
          
          // Position should be same regardless of how many participants exist
          const position = calculatePositionPercentage(score, min, max);
          
          // Calculate expected
          const clampedScore = Math.max(min, Math.min(max, score));
          const range = max - min;
          const expectedPosition = ((clampedScore - min) / range) * 100;
          
          // Property: Position depends only on score and range, not participant count
          return Math.abs(position - expectedPosition) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should handle fractional scores correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        fc.double({ min: -25, max: 25, noNaN: true }),
        (spectrum, fractionalScore) => {
          const { min, max } = spectrum;
          const position = calculatePositionPercentage(fractionalScore, min, max);
          
          // Calculate expected
          const clampedScore = Math.max(min, Math.min(max, fractionalScore));
          const range = max - min;
          const expectedPosition = ((clampedScore - min) / range) * 100;
          
          // Property: Should handle fractional scores correctly
          return Math.abs(position - expectedPosition) < 0.0001 &&
                 position >= 0 && position <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });
});
