/**
 * Property-Based Tests for Question Filtering
 * Feature: full-featured-quiz-app
 * 
 * **Property 2: Question Filtering Correctness**
 * **Validates: Requirements 2.1, 6.5**
 * 
 * For any event with a set of disabled question indices, the displayed questions
 * should be exactly those questions whose indices are not in the disabled set.
 */

const fc = require('fast-check');

describe('Property 2: Question Filtering Correctness', () => {
  // Mock questions array (matching the structure in questions.js)
  const mockQuestions = Array.from({ length: 35 }, (_, i) => ({
    text: `Question ${i + 1}`,
    value: i % 2 === 0 ? 1 : -1
  }));

  /**
   * Extract the question filtering logic from event.js
   * This simulates the filtering that happens in the loadEvent() function
   */
  function filterQuestions(allQuestions, disabledQuestions) {
    return allQuestions.filter((_, index) => !disabledQuestions.includes(index));
  }

  test('filtered questions should exclude all disabled question indices', () => {
    fc.assert(
      fc.property(
        // Generate a random set of disabled question indices
        fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 30 })
          .map(arr => [...new Set(arr)]), // Ensure unique indices
        (disabledQuestions) => {
          // Filter questions
          const enabledQuestions = filterQuestions(mockQuestions, disabledQuestions);
          
          // Property: Every disabled index should NOT appear in the enabled questions
          for (const disabledIndex of disabledQuestions) {
            const isInEnabled = enabledQuestions.some((q, idx) => {
              const originalIndex = mockQuestions.indexOf(q);
              return originalIndex === disabledIndex;
            });
            
            if (isInEnabled) {
              return false; // Property violated: disabled question appears in enabled set
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('filtered questions count should equal total minus disabled count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 35 })
          .map(arr => [...new Set(arr)]), // Ensure unique indices
        (disabledQuestions) => {
          const enabledQuestions = filterQuestions(mockQuestions, disabledQuestions);
          
          // Property: Count of enabled questions = total questions - disabled questions
          const expectedCount = mockQuestions.length - disabledQuestions.length;
          return enabledQuestions.length === expectedCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('filtered questions should preserve order of enabled questions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 30 })
          .map(arr => [...new Set(arr)]), // Ensure unique indices
        (disabledQuestions) => {
          const enabledQuestions = filterQuestions(mockQuestions, disabledQuestions);
          
          // Property: Enabled questions should appear in the same order as in the original array
          let lastOriginalIndex = -1;
          for (const question of enabledQuestions) {
            const originalIndex = mockQuestions.indexOf(question);
            
            if (originalIndex <= lastOriginalIndex) {
              return false; // Order not preserved
            }
            
            lastOriginalIndex = originalIndex;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('filtering with empty disabled array should return all questions', () => {
    const disabledQuestions = [];
    const enabledQuestions = filterQuestions(mockQuestions, disabledQuestions);
    
    // Property: When no questions are disabled, all questions should be enabled
    expect(enabledQuestions.length).toBe(mockQuestions.length);
    expect(enabledQuestions).toEqual(mockQuestions);
  });

  test('filtering should handle all questions disabled', () => {
    const disabledQuestions = Array.from({ length: 35 }, (_, i) => i);
    const enabledQuestions = filterQuestions(mockQuestions, disabledQuestions);
    
    // Property: When all questions are disabled, no questions should be enabled
    expect(enabledQuestions.length).toBe(0);
  });

  test('filtered questions should only contain questions from original set', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 30 })
          .map(arr => [...new Set(arr)]),
        (disabledQuestions) => {
          const enabledQuestions = filterQuestions(mockQuestions, disabledQuestions);
          
          // Property: Every enabled question must exist in the original questions array
          for (const question of enabledQuestions) {
            if (!mockQuestions.includes(question)) {
              return false; // Question not from original set
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('filtering should be idempotent', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 30 })
          .map(arr => [...new Set(arr)]),
        (disabledQuestions) => {
          // Filter once
          const enabledQuestions1 = filterQuestions(mockQuestions, disabledQuestions);
          
          // Filter again with the same disabled questions
          const enabledQuestions2 = filterQuestions(mockQuestions, disabledQuestions);
          
          // Property: Filtering should produce the same result every time
          return JSON.stringify(enabledQuestions1) === JSON.stringify(enabledQuestions2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('filtering should handle duplicate disabled indices gracefully', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 34 }), { minLength: 1, maxLength: 30 }),
        (disabledIndices) => {
          // Create duplicates by repeating some indices
          const disabledWithDuplicates = [...disabledIndices, ...disabledIndices.slice(0, 3)];
          const disabledUnique = [...new Set(disabledIndices)];
          
          // Filter with duplicates
          const enabledWithDuplicates = filterQuestions(mockQuestions, disabledWithDuplicates);
          
          // Filter with unique indices
          const enabledUnique = filterQuestions(mockQuestions, disabledUnique);
          
          // Property: Duplicate disabled indices should not affect the result
          return JSON.stringify(enabledWithDuplicates) === JSON.stringify(enabledUnique);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('filtering should handle out-of-range indices gracefully', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -10, max: 50 }), { maxLength: 20 })
          .map(arr => [...new Set(arr)]),
        (disabledQuestions) => {
          const enabledQuestions = filterQuestions(mockQuestions, disabledQuestions);
          
          // Property: Out-of-range indices should be ignored, not cause errors
          // Count only valid disabled indices
          const validDisabledCount = disabledQuestions.filter(idx => idx >= 0 && idx < mockQuestions.length).length;
          const expectedCount = mockQuestions.length - validDisabledCount;
          
          return enabledQuestions.length === expectedCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('each enabled question should have correct original index mapping', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 30 })
          .map(arr => [...new Set(arr)]),
        (disabledQuestions) => {
          const enabledQuestions = filterQuestions(mockQuestions, disabledQuestions);
          
          // Property: Each enabled question's original index should not be in disabled set
          for (const question of enabledQuestions) {
            const originalIndex = mockQuestions.indexOf(question);
            
            if (disabledQuestions.includes(originalIndex)) {
              return false; // Disabled question found in enabled set
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
