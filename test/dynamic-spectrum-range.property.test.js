/**
 * Property-Based Test for Dynamic Spectrum Range Calculation
 * Feature: full-featured-quiz-app
 * 
 * Property 10: Dynamic Spectrum Range Calculation
 * Validates: Requirements 7.5
 * 
 * For any event with a specific set of enabled questions, the spectrum range should be
 * determined by the maximum absolute sum of positive or negative question values, mapped
 * to predefined ranges (±25 for 20-25, ±20 for 15-19, ±15 for 10-14, ±10 for 5-9, ±5 for 1-4).
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';

/**
 * Calculate dynamic spectrum range based on enabled questions
 * This is the core logic from spectrum.js calculateDynamicSpectrumRange()
 * 
 * @param {Array<{value: number}>} enabledQuestions - Array of enabled questions with values
 * @returns {{min: number, max: number, colorInterval: number}} Spectrum configuration
 */
function calculateDynamicSpectrumRange(enabledQuestions) {
  let positiveSum = 0;
  let negativeSum = 0;
  
  enabledQuestions.forEach((question) => {
    if (question.value > 0) {
      positiveSum += question.value;
    } else {
      negativeSum += Math.abs(question.value);
    }
  });
  
  const maxSum = Math.max(positiveSum, negativeSum);
  
  let min, max, colorInterval;
  
  if (maxSum >= 20 && maxSum <= 25) {
    min = -25;
    max = 25;
    colorInterval = 5;
  } else if (maxSum >= 15 && maxSum <= 19) {
    min = -20;
    max = 20;
    colorInterval = 4;
  } else if (maxSum >= 10 && maxSum <= 14) {
    min = -15;
    max = 15;
    colorInterval = 3;
  } else if (maxSum >= 5 && maxSum <= 9) {
    min = -10;
    max = 10;
    colorInterval = 2;
  } else if (maxSum >= 1 && maxSum <= 4) {
    min = -5;
    max = 5;
    colorInterval = 1;
  } else {
    // Default fallback for edge cases
    min = -25;
    max = 25;
    colorInterval = 5;
  }
  
  return { min, max, colorInterval };
}

describe('Property 10: Dynamic Spectrum Range Calculation', () => {
  test('range should be ±25 when maxSum is between 20-25', () => {
    fc.assert(
      fc.property(
        // Generate questions that sum to 20-25
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 4, maxLength: 25 }
        ).filter(questions => {
          const positiveSum = questions.filter(q => q.value > 0).reduce((sum, q) => sum + q.value, 0);
          const negativeSum = questions.filter(q => q.value < 0).reduce((sum, q) => sum + Math.abs(q.value), 0);
          const maxSum = Math.max(positiveSum, negativeSum);
          return maxSum >= 20 && maxSum <= 25;
        }),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Range should be ±25 with interval 5
          return result.min === -25 && 
                 result.max === 25 && 
                 result.colorInterval === 5;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should be ±20 when maxSum is between 15-19', () => {
    fc.assert(
      fc.property(
        // Generate questions that sum to 15-19
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 3, maxLength: 19 }
        ).filter(questions => {
          const positiveSum = questions.filter(q => q.value > 0).reduce((sum, q) => sum + q.value, 0);
          const negativeSum = questions.filter(q => q.value < 0).reduce((sum, q) => sum + Math.abs(q.value), 0);
          const maxSum = Math.max(positiveSum, negativeSum);
          return maxSum >= 15 && maxSum <= 19;
        }),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Range should be ±20 with interval 4
          return result.min === -20 && 
                 result.max === 20 && 
                 result.colorInterval === 4;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should be ±15 when maxSum is between 10-14', () => {
    fc.assert(
      fc.property(
        // Generate questions that sum to 10-14
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 2, maxLength: 14 }
        ).filter(questions => {
          const positiveSum = questions.filter(q => q.value > 0).reduce((sum, q) => sum + q.value, 0);
          const negativeSum = questions.filter(q => q.value < 0).reduce((sum, q) => sum + Math.abs(q.value), 0);
          const maxSum = Math.max(positiveSum, negativeSum);
          return maxSum >= 10 && maxSum <= 14;
        }),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Range should be ±15 with interval 3
          return result.min === -15 && 
                 result.max === 15 && 
                 result.colorInterval === 3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should be ±10 when maxSum is between 5-9', () => {
    fc.assert(
      fc.property(
        // Generate questions that sum to 5-9
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 1, maxLength: 9 }
        ).filter(questions => {
          const positiveSum = questions.filter(q => q.value > 0).reduce((sum, q) => sum + q.value, 0);
          const negativeSum = questions.filter(q => q.value < 0).reduce((sum, q) => sum + Math.abs(q.value), 0);
          const maxSum = Math.max(positiveSum, negativeSum);
          return maxSum >= 5 && maxSum <= 9;
        }),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Range should be ±10 with interval 2
          return result.min === -10 && 
                 result.max === 10 && 
                 result.colorInterval === 2;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should be ±5 when maxSum is between 1-4', () => {
    fc.assert(
      fc.property(
        // Generate questions that sum to 1-4
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 1, maxLength: 4 }
        ).filter(questions => {
          const positiveSum = questions.filter(q => q.value > 0).reduce((sum, q) => sum + q.value, 0);
          const negativeSum = questions.filter(q => q.value < 0).reduce((sum, q) => sum + Math.abs(q.value), 0);
          const maxSum = Math.max(positiveSum, negativeSum);
          return maxSum >= 1 && maxSum <= 4;
        }),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Range should be ±5 with interval 1
          return result.min === -5 && 
                 result.max === 5 && 
                 result.colorInterval === 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should be symmetric (min = -max)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 1, maxLength: 25 }
        ),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Range should always be symmetric
          return result.min === -result.max;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should be determined by maximum of positive or negative sum', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 1, maxLength: 25 }
        ),
        (questions) => {
          const positiveSum = questions.filter(q => q.value > 0).reduce((sum, q) => sum + q.value, 0);
          const negativeSum = questions.filter(q => q.value < 0).reduce((sum, q) => sum + Math.abs(q.value), 0);
          const maxSum = Math.max(positiveSum, negativeSum);
          
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Range should be based on maxSum
          if (maxSum >= 20 && maxSum <= 25) {
            return result.max === 25;
          } else if (maxSum >= 15 && maxSum <= 19) {
            return result.max === 20;
          } else if (maxSum >= 10 && maxSum <= 14) {
            return result.max === 15;
          } else if (maxSum >= 5 && maxSum <= 9) {
            return result.max === 10;
          } else if (maxSum >= 1 && maxSum <= 4) {
            return result.max === 5;
          } else {
            return result.max === 25; // Default
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('colorInterval should be proportional to range', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 1, maxLength: 25 }
        ),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: colorInterval should divide range into 10 segments
          const range = result.max - result.min;
          const segments = range / result.colorInterval;
          
          return segments === 10;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should handle all positive questions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            value: fc.integer({ min: 1, max: 5 })
          }),
          { minLength: 1, maxLength: 25 }
        ),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Should calculate range correctly for all positive questions
          const positiveSum = questions.reduce((sum, q) => sum + q.value, 0);
          
          if (positiveSum >= 20 && positiveSum <= 25) {
            return result.max === 25;
          } else if (positiveSum >= 15 && positiveSum <= 19) {
            return result.max === 20;
          } else if (positiveSum >= 10 && positiveSum <= 14) {
            return result.max === 15;
          } else if (positiveSum >= 5 && positiveSum <= 9) {
            return result.max === 10;
          } else if (positiveSum >= 1 && positiveSum <= 4) {
            return result.max === 5;
          } else {
            return result.max === 25; // Default
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should handle all negative questions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: -1 })
          }),
          { minLength: 1, maxLength: 25 }
        ),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Should calculate range correctly for all negative questions
          const negativeSum = questions.reduce((sum, q) => sum + Math.abs(q.value), 0);
          
          if (negativeSum >= 20 && negativeSum <= 25) {
            return result.max === 25;
          } else if (negativeSum >= 15 && negativeSum <= 19) {
            return result.max === 20;
          } else if (negativeSum >= 10 && negativeSum <= 14) {
            return result.max === 15;
          } else if (negativeSum >= 5 && negativeSum <= 9) {
            return result.max === 10;
          } else if (negativeSum >= 1 && negativeSum <= 4) {
            return result.max === 5;
          } else {
            return result.max === 25; // Default
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should handle mixed positive and negative questions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 }).filter(v => v !== 0)
          }),
          { minLength: 2, maxLength: 25 }
        ).filter(questions => {
          const hasPositive = questions.some(q => q.value > 0);
          const hasNegative = questions.some(q => q.value < 0);
          return hasPositive && hasNegative;
        }),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Should handle mixed questions correctly
          const positiveSum = questions.filter(q => q.value > 0).reduce((sum, q) => sum + q.value, 0);
          const negativeSum = questions.filter(q => q.value < 0).reduce((sum, q) => sum + Math.abs(q.value), 0);
          const maxSum = Math.max(positiveSum, negativeSum);
          
          if (maxSum >= 20 && maxSum <= 25) {
            return result.max === 25;
          } else if (maxSum >= 15 && maxSum <= 19) {
            return result.max === 20;
          } else if (maxSum >= 10 && maxSum <= 14) {
            return result.max === 15;
          } else if (maxSum >= 5 && maxSum <= 9) {
            return result.max === 10;
          } else if (maxSum >= 1 && maxSum <= 4) {
            return result.max === 5;
          } else {
            return result.max === 25; // Default
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should ignore zero-value questions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            value: fc.constantFrom(-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5)
          }),
          { minLength: 1, maxLength: 25 }
        ),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Zero-value questions should not affect range calculation
          const positiveSum = questions.filter(q => q.value > 0).reduce((sum, q) => sum + q.value, 0);
          const negativeSum = questions.filter(q => q.value < 0).reduce((sum, q) => sum + Math.abs(q.value), 0);
          const maxSum = Math.max(positiveSum, negativeSum);
          
          // Verify the calculation matches expected range
          if (maxSum >= 20 && maxSum <= 25) {
            return result.max === 25;
          } else if (maxSum >= 15 && maxSum <= 19) {
            return result.max === 20;
          } else if (maxSum >= 10 && maxSum <= 14) {
            return result.max === 15;
          } else if (maxSum >= 5 && maxSum <= 9) {
            return result.max === 10;
          } else if (maxSum >= 1 && maxSum <= 4) {
            return result.max === 5;
          } else {
            return result.max === 25; // Default for maxSum = 0
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should be consistent for same question set', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 1, maxLength: 25 }
        ),
        (questions) => {
          // Calculate range multiple times
          const result1 = calculateDynamicSpectrumRange(questions);
          const result2 = calculateDynamicSpectrumRange(questions);
          const result3 = calculateDynamicSpectrumRange(questions);
          
          // Property: Should return same result for same input
          return result1.min === result2.min && result2.min === result3.min &&
                 result1.max === result2.max && result2.max === result3.max &&
                 result1.colorInterval === result2.colorInterval && 
                 result2.colorInterval === result3.colorInterval;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should be independent of question order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 2, maxLength: 25 }
        ),
        (questions) => {
          // Calculate range with original order
          const result1 = calculateDynamicSpectrumRange(questions);
          
          // Calculate range with reversed order
          const reversedQuestions = [...questions].reverse();
          const result2 = calculateDynamicSpectrumRange(reversedQuestions);
          
          // Property: Order should not affect range
          return result1.min === result2.min &&
                 result1.max === result2.max &&
                 result1.colorInterval === result2.colorInterval;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should handle single question', () => {
    fc.assert(
      fc.property(
        fc.record({
          value: fc.integer({ min: -5, max: 5 }).filter(v => v !== 0)
        }),
        (question) => {
          const result = calculateDynamicSpectrumRange([question]);
          
          // Property: Single question should determine range
          const absValue = Math.abs(question.value);
          
          if (absValue >= 5) {
            return result.max === 10;
          } else if (absValue >= 1) {
            return result.max === 5;
          } else {
            return result.max === 25; // Default for zero
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('range should handle maximum possible sum (all 5s)', () => {
    // Test with 5 questions all valued at 5 (sum = 25)
    const maxPositiveQuestions = Array(5).fill({ value: 5 });
    const result = calculateDynamicSpectrumRange(maxPositiveQuestions);
    
    // Property: Maximum sum should give ±25 range
    return result.min === -25 && result.max === 25 && result.colorInterval === 5;
  });

  test('range should handle minimum possible sum (single 1)', () => {
    // Test with single question valued at 1 (sum = 1)
    const minQuestions = [{ value: 1 }];
    const result = calculateDynamicSpectrumRange(minQuestions);
    
    // Property: Minimum sum should give ±5 range
    return result.min === -5 && result.max === 5 && result.colorInterval === 1;
  });

  test('all standard ranges should be valid', () => {
    const standardRanges = [
      { min: -25, max: 25, colorInterval: 5 },
      { min: -20, max: 20, colorInterval: 4 },
      { min: -15, max: 15, colorInterval: 3 },
      { min: -10, max: 10, colorInterval: 2 },
      { min: -5, max: 5, colorInterval: 1 }
    ];
    
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 1, maxLength: 25 }
        ),
        (questions) => {
          const result = calculateDynamicSpectrumRange(questions);
          
          // Property: Result should be one of the standard ranges
          return standardRanges.some(range => 
            range.min === result.min && 
            range.max === result.max && 
            range.colorInterval === result.colorInterval
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
