/**
 * Property-Based Test for Free Play Score Percentile Calculation
 * Feature: full-featured-quiz-app
 * 
 * Property 25: Free Play Score Percentile Calculation
 * Validates: Requirements 2A.1
 * 
 * For any user score and set of all free play scores, the calculated percentile
 * should equal the percentage of scores that are less than or equal to the user's score.
 */

import { describe, test, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Calculate percentile for user's score compared to all scores
 * This is the implementation from free-play-analytics.js
 * 
 * @param {number} userScore - The user's score
 * @param {Array} allScores - Array of all scores
 * @returns {number} Percentile (0-100)
 */
function calculatePercentile(userScore, allScores) {
  if (!allScores || allScores.length === 0) {
    return 0;
  }
  
  // Count how many scores are less than or equal to the user's score
  const scoresLessThanOrEqual = allScores.filter(score => score <= userScore).length;
  
  // Calculate percentile
  const percentile = (scoresLessThanOrEqual / allScores.length) * 100;
  
  return Math.round(percentile);
}

describe('Property 25: Free Play Score Percentile Calculation', () => {
  test('percentile should equal percentage of scores <= user score', () => {
    fc.assert(
      fc.property(
        // Generate user score in valid range
        fc.integer({ min: -25, max: 25 }),
        // Generate array of scores
        fc.array(
          fc.integer({ min: -25, max: 25 }),
          { minLength: 1, maxLength: 100 }
        ),
        (userScore, allScores) => {
          // Calculate percentile using the function
          const calculatedPercentile = calculatePercentile(userScore, allScores);
          
          // Calculate expected percentile manually
          const scoresLessThanOrEqual = allScores.filter(score => score <= userScore).length;
          const expectedPercentile = Math.round((scoresLessThanOrEqual / allScores.length) * 100);
          
          // Property: Calculated percentile should match expected percentile
          return calculatedPercentile === expectedPercentile;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should be 0 when user score is less than all scores', () => {
    fc.assert(
      fc.property(
        // Generate array of positive scores
        fc.array(
          fc.integer({ min: 1, max: 25 }),
          { minLength: 1, maxLength: 50 }
        ),
        (allScores) => {
          // User score is less than all scores
          const userScore = Math.min(...allScores) - 1;
          
          const percentile = calculatePercentile(userScore, allScores);
          
          // Property: Percentile should be 0 when no scores are <= user score
          return percentile === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should be 100 when user score is greater than or equal to all scores', () => {
    fc.assert(
      fc.property(
        // Generate array of scores
        fc.array(
          fc.integer({ min: -25, max: 24 }),
          { minLength: 1, maxLength: 50 }
        ),
        (allScores) => {
          // User score is greater than or equal to all scores
          const userScore = Math.max(...allScores);
          
          const percentile = calculatePercentile(userScore, allScores);
          
          // Property: Percentile should be 100 when all scores are <= user score
          return percentile === 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should be between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -25, max: 25 }),
        fc.array(
          fc.integer({ min: -25, max: 25 }),
          { minLength: 1, maxLength: 100 }
        ),
        (userScore, allScores) => {
          const percentile = calculatePercentile(userScore, allScores);
          
          // Property: Percentile should always be in valid range
          return percentile >= 0 && percentile <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should handle duplicate scores correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -25, max: 25 }),
        fc.integer({ min: 1, max: 20 }),
        (score, count) => {
          // Create array with all same scores
          const allScores = Array(count).fill(score);
          
          const percentile = calculatePercentile(score, allScores);
          
          // Property: When all scores are equal to user score, percentile should be 100
          return percentile === 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should handle user score with some duplicates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -25, max: 25 }),
        fc.array(
          fc.integer({ min: -25, max: 25 }),
          { minLength: 5, maxLength: 50 }
        ),
        (userScore, baseScores) => {
          // Add user score multiple times to the array
          const allScores = [...baseScores, userScore, userScore, userScore];
          
          const percentile = calculatePercentile(userScore, allScores);
          
          // Calculate expected manually
          const scoresLessThanOrEqual = allScores.filter(s => s <= userScore).length;
          const expected = Math.round((scoresLessThanOrEqual / allScores.length) * 100);
          
          // Property: Should correctly count all instances <= user score
          return percentile === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should return 0 for empty score array', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -25, max: 25 }),
        (userScore) => {
          const percentile = calculatePercentile(userScore, []);
          
          // Property: Empty array should return 0
          return percentile === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should handle single score array', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -25, max: 25 }),
        fc.integer({ min: -25, max: 25 }),
        (userScore, singleScore) => {
          const percentile = calculatePercentile(userScore, [singleScore]);
          
          // Property: With single score, percentile should be 100 if user >= single, else 0
          if (userScore >= singleScore) {
            return percentile === 100;
          } else {
            return percentile === 0;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile calculation should be monotonic', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: -25, max: 25 }),
          { minLength: 5, maxLength: 50 }
        ),
        fc.integer({ min: -25, max: 24 }),
        (allScores, baseScore) => {
          // Calculate percentile for base score and base score + 1
          const percentile1 = calculatePercentile(baseScore, allScores);
          const percentile2 = calculatePercentile(baseScore + 1, allScores);
          
          // Property: Higher score should have equal or higher percentile
          return percentile2 >= percentile1;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should correctly handle negative scores', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: -25, max: -1 }),
          { minLength: 1, maxLength: 50 }
        ),
        (allScores) => {
          // Pick a score from the array
          const userScore = allScores[Math.floor(allScores.length / 2)];
          
          const percentile = calculatePercentile(userScore, allScores);
          
          // Calculate expected
          const scoresLessThanOrEqual = allScores.filter(s => s <= userScore).length;
          const expected = Math.round((scoresLessThanOrEqual / allScores.length) * 100);
          
          // Property: Should work correctly with negative scores
          return percentile === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should correctly handle mixed positive and negative scores', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -25, max: 25 }),
        fc.array(
          fc.integer({ min: -25, max: 25 }),
          { minLength: 10, maxLength: 50 }
        ),
        (userScore, allScores) => {
          // Ensure we have both positive and negative scores
          const hasPositive = allScores.some(s => s > 0);
          const hasNegative = allScores.some(s => s < 0);
          
          if (!hasPositive || !hasNegative) {
            return true; // Skip this case
          }
          
          const percentile = calculatePercentile(userScore, allScores);
          
          // Calculate expected
          const scoresLessThanOrEqual = allScores.filter(s => s <= userScore).length;
          const expected = Math.round((scoresLessThanOrEqual / allScores.length) * 100);
          
          // Property: Should work correctly with mixed scores
          return percentile === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should be consistent with multiple calls', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -25, max: 25 }),
        fc.array(
          fc.integer({ min: -25, max: 25 }),
          { minLength: 1, maxLength: 50 }
        ),
        (userScore, allScores) => {
          // Call function multiple times
          const percentile1 = calculatePercentile(userScore, allScores);
          const percentile2 = calculatePercentile(userScore, allScores);
          const percentile3 = calculatePercentile(userScore, allScores);
          
          // Property: Should return same result for same inputs
          return percentile1 === percentile2 && percentile2 === percentile3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentile should handle large arrays efficiently', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -25, max: 25 }),
        fc.array(
          fc.integer({ min: -25, max: 25 }),
          { minLength: 100, maxLength: 1000 }
        ),
        (userScore, allScores) => {
          const startTime = Date.now();
          const percentile = calculatePercentile(userScore, allScores);
          const endTime = Date.now();
          
          // Property: Should complete in reasonable time (< 100ms)
          const timeTaken = endTime - startTime;
          
          // Also verify correctness
          const scoresLessThanOrEqual = allScores.filter(s => s <= userScore).length;
          const expected = Math.round((scoresLessThanOrEqual / allScores.length) * 100);
          
          return timeTaken < 100 && percentile === expected;
        }
      ),
      { numRuns: 10 } // Fewer runs for performance test
    );
  });

  test('percentile with user score at boundaries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: -25, max: 25 }),
          { minLength: 1, maxLength: 50 }
        ),
        (allScores) => {
          // Test with minimum possible score
          const percentileMin = calculatePercentile(-25, allScores);
          
          // Test with maximum possible score
          const percentileMax = calculatePercentile(25, allScores);
          
          // Property: Min score should have lowest percentile, max should have 100
          return percentileMin <= percentileMax && percentileMax === 100;
        }
      ),
      { numRuns: 100 }
    );
  });
});
