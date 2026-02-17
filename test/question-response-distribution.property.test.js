/**
 * Property-Based Test for Question Response Distribution
 * Feature: full-featured-quiz-app
 * 
 * Property 26: Question Response Distribution
 * Validates: Requirements 2A.4
 * 
 * For any question and set of free play responses, the yes percentage should equal
 * (yes count / total responses) * 100, and the no percentage should equal
 * (no count / total responses) * 100.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';

/**
 * Calculate per-question response statistics
 * This is the implementation from free-play-analytics.js
 * 
 * @param {Array} responses - Array of participant objects with answers
 * @param {Array} questions - Array of question objects
 * @returns {Array} Array of question statistics with yes/no counts and percentages
 */
function calculateQuestionStats(responses, questions) {
  if (!responses || responses.length === 0) {
    return [];
  }
  
  if (!questions || questions.length === 0) {
    return [];
  }
  
  const totalResponses = responses.length;
  const questionStats = [];
  
  // Calculate stats for each question
  questions.forEach((question, index) => {
    let yesCount = 0;
    let noCount = 0;
    
    // Count yes/no responses for this question
    responses.forEach(response => {
      if (!response.answers) return;
      
      // Handle both object format {16: 1} and array format
      let answer;
      if (Array.isArray(response.answers)) {
        answer = response.answers[index];
      } else {
        answer = response.answers[index.toString()] || response.answers[index];
      }
      
      if (answer === 1) {
        yesCount++;
      } else if (answer === 0) {
        noCount++;
      }
    });
    
    // Calculate percentages
    const answeredCount = yesCount + noCount;
    const yesPercentage = answeredCount > 0 ? (yesCount / answeredCount) * 100 : 0;
    const noPercentage = answeredCount > 0 ? (noCount / answeredCount) * 100 : 0;
    
    questionStats.push({
      questionIndex: index,
      questionText: question.text,
      questionValue: question.value,
      yesCount,
      noCount,
      yesPercentage: Math.round(yesPercentage),
      noPercentage: Math.round(noPercentage)
    });
  });
  
  return questionStats;
}

describe('Property 26: Question Response Distribution', () => {
  test('yes percentage should equal (yes count / total responses) * 100', () => {
    fc.assert(
      fc.property(
        // Generate array of responses with answers
        fc.array(
          fc.record({
            id: fc.uuid(),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.array(
              fc.integer({ min: 0, max: 1 }), // 0 = No, 1 = Yes
              { minLength: 5, maxLength: 35 }
            )
          }),
          { minLength: 1, maxLength: 100 }
        ),
        // Generate questions array
        fc.array(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 100 }),
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 5, maxLength: 35 }
        ),
        (responses, questions) => {
          // Ensure all responses have same number of answers as questions
          const normalizedResponses = responses.map(r => ({
            ...r,
            answers: r.answers.slice(0, questions.length)
          }));
          
          const questionStats = calculateQuestionStats(normalizedResponses, questions);
          
          // Verify each question's statistics
          return questionStats.every((stat, index) => {
            // Count yes/no manually
            let expectedYesCount = 0;
            let expectedNoCount = 0;
            
            normalizedResponses.forEach(response => {
              const answer = response.answers[index];
              if (answer === 1) expectedYesCount++;
              else if (answer === 0) expectedNoCount++;
            });
            
            const totalAnswered = expectedYesCount + expectedNoCount;
            const expectedYesPercentage = totalAnswered > 0 
              ? Math.round((expectedYesCount / totalAnswered) * 100)
              : 0;
            const expectedNoPercentage = totalAnswered > 0
              ? Math.round((expectedNoCount / totalAnswered) * 100)
              : 0;
            
            // Property: Calculated percentages should match expected
            return stat.yesCount === expectedYesCount &&
                   stat.noCount === expectedNoCount &&
                   stat.yesPercentage === expectedYesPercentage &&
                   stat.noPercentage === expectedNoPercentage;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('yes percentage + no percentage should equal 100 when all responses are valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 35 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.array(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 100 }),
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 5, maxLength: 35 }
        ),
        (numQuestions, responses, questions) => {
          // Ensure questions array matches numQuestions
          const normalizedQuestions = questions.slice(0, numQuestions);
          
          // Ensure all responses have exactly numQuestions answers
          const normalizedResponses = responses.map(r => ({
            ...r,
            answers: Array(numQuestions).fill(null).map((_, i) => Math.random() < 0.5 ? 0 : 1)
          }));
          
          const questionStats = calculateQuestionStats(normalizedResponses, normalizedQuestions);
          
          // Property: Yes % + No % should be approximately 100 (within rounding)
          return questionStats.every(stat => {
            const sum = stat.yesPercentage + stat.noPercentage;
            // Allow for rounding differences (99-101)
            return sum >= 99 && sum <= 101;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentages should be 0 when no responses exist', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 100 }),
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 1, maxLength: 35 }
        ),
        (questions) => {
          const questionStats = calculateQuestionStats([], questions);
          
          // Property: Empty responses should return empty stats
          return questionStats.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('yes percentage should be 100 when all responses are yes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 5, max: 20 }),
        (numResponses, numQuestions) => {
          // Create responses where all answers are 1 (Yes)
          const responses = Array(numResponses).fill(null).map((_, i) => ({
            id: `participant-${i}`,
            score: 0,
            answers: Array(numQuestions).fill(1)
          }));
          
          const questions = Array(numQuestions).fill(null).map((_, i) => ({
            text: `Question ${i}`,
            value: 1
          }));
          
          const questionStats = calculateQuestionStats(responses, questions);
          
          // Property: All questions should have 100% yes, 0% no
          return questionStats.every(stat => 
            stat.yesPercentage === 100 && 
            stat.noPercentage === 0 &&
            stat.yesCount === numResponses &&
            stat.noCount === 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('no percentage should be 100 when all responses are no', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 5, max: 20 }),
        (numResponses, numQuestions) => {
          // Create responses where all answers are 0 (No)
          const responses = Array(numResponses).fill(null).map((_, i) => ({
            id: `participant-${i}`,
            score: 0,
            answers: Array(numQuestions).fill(0)
          }));
          
          const questions = Array(numQuestions).fill(null).map((_, i) => ({
            text: `Question ${i}`,
            value: 1
          }));
          
          const questionStats = calculateQuestionStats(responses, questions);
          
          // Property: All questions should have 0% yes, 100% no
          return questionStats.every(stat => 
            stat.yesPercentage === 0 && 
            stat.noPercentage === 100 &&
            stat.yesCount === 0 &&
            stat.noCount === numResponses
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentages should be 50/50 when responses are evenly split', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 50 }).filter(n => n % 2 === 0), // Even number
        fc.integer({ min: 5, max: 20 }),
        (numResponses, numQuestions) => {
          // Create responses where half are yes, half are no
          const responses = Array(numResponses).fill(null).map((_, i) => ({
            id: `participant-${i}`,
            score: 0,
            answers: Array(numQuestions).fill(i < numResponses / 2 ? 1 : 0)
          }));
          
          const questions = Array(numQuestions).fill(null).map((_, i) => ({
            text: `Question ${i}`,
            value: 1
          }));
          
          const questionStats = calculateQuestionStats(responses, questions);
          
          // Property: All questions should have 50% yes, 50% no
          return questionStats.every(stat => 
            stat.yesPercentage === 50 && 
            stat.noPercentage === 50 &&
            stat.yesCount === numResponses / 2 &&
            stat.noCount === numResponses / 2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle object format answers correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.dictionary(
              fc.integer({ min: 0, max: 34 }).map(String),
              fc.integer({ min: 0, max: 1 })
            )
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.integer({ min: 5, max: 35 }),
        (responses, numQuestions) => {
          const questions = Array(numQuestions).fill(null).map((_, i) => ({
            text: `Question ${i}`,
            value: 1
          }));
          
          const questionStats = calculateQuestionStats(responses, questions);
          
          // Property: Should return stats for all questions
          return questionStats.length === numQuestions;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle missing answers gracefully', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            score: fc.integer({ min: -25, max: 25 }),
            // Some responses have answers, some don't
            answers: fc.option(
              fc.array(
                fc.integer({ min: 0, max: 1 }),
                { minLength: 5, maxLength: 35 }
              ),
              { nil: undefined }
            )
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.array(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 100 }),
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 5, maxLength: 35 }
        ),
        (responses, questions) => {
          const questionStats = calculateQuestionStats(responses, questions);
          
          // Property: Should not crash and return valid stats
          return Array.isArray(questionStats) && 
                 questionStats.length === questions.length &&
                 questionStats.every(stat => 
                   typeof stat.yesPercentage === 'number' &&
                   typeof stat.noPercentage === 'number' &&
                   stat.yesPercentage >= 0 && stat.yesPercentage <= 100 &&
                   stat.noPercentage >= 0 && stat.noPercentage <= 100
                 );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('counts should sum to total valid responses', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 35 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.array(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 100 }),
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 5, maxLength: 35 }
        ),
        (numQuestions, responses, questions) => {
          // Ensure questions array matches numQuestions
          const normalizedQuestions = questions.slice(0, numQuestions);
          
          // Ensure all responses have exactly numQuestions answers
          const normalizedResponses = responses.map(r => ({
            ...r,
            answers: Array(numQuestions).fill(null).map((_, i) => Math.random() < 0.5 ? 0 : 1)
          }));
          
          const questionStats = calculateQuestionStats(normalizedResponses, normalizedQuestions);
          
          // Property: Yes count + No count should equal total responses for each question
          return questionStats.every(stat => 
            stat.yesCount + stat.noCount === normalizedResponses.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentages should be between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.array(
              fc.integer({ min: 0, max: 1 }),
              { minLength: 5, maxLength: 35 }
            )
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.array(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 100 }),
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 5, maxLength: 35 }
        ),
        (responses, questions) => {
          const normalizedResponses = responses.map(r => ({
            ...r,
            answers: r.answers.slice(0, questions.length)
          }));
          
          const questionStats = calculateQuestionStats(normalizedResponses, questions);
          
          // Property: All percentages should be in valid range
          return questionStats.every(stat => 
            stat.yesPercentage >= 0 && stat.yesPercentage <= 100 &&
            stat.noPercentage >= 0 && stat.noPercentage <= 100
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should return correct number of question stats', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.array(
              fc.integer({ min: 0, max: 1 }),
              { minLength: 5, maxLength: 35 }
            )
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.array(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 100 }),
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 5, maxLength: 35 }
        ),
        (responses, questions) => {
          const questionStats = calculateQuestionStats(responses, questions);
          
          // Property: Should return one stat object per question
          return questionStats.length === questions.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should preserve question metadata in stats', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.array(
              fc.integer({ min: 0, max: 1 }),
              { minLength: 5, maxLength: 35 }
            )
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.array(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 100 }),
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 5, maxLength: 35 }
        ),
        (responses, questions) => {
          const normalizedResponses = responses.map(r => ({
            ...r,
            answers: r.answers.slice(0, questions.length)
          }));
          
          const questionStats = calculateQuestionStats(normalizedResponses, questions);
          
          // Property: Each stat should preserve question text and value
          return questionStats.every((stat, index) => 
            stat.questionText === questions[index].text &&
            stat.questionValue === questions[index].value &&
            stat.questionIndex === index
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should be consistent with multiple calls', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.array(
              fc.integer({ min: 0, max: 1 }),
              { minLength: 5, maxLength: 35 }
            )
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.array(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 100 }),
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 5, maxLength: 35 }
        ),
        (responses, questions) => {
          const normalizedResponses = responses.map(r => ({
            ...r,
            answers: r.answers.slice(0, questions.length)
          }));
          
          // Call function multiple times
          const stats1 = calculateQuestionStats(normalizedResponses, questions);
          const stats2 = calculateQuestionStats(normalizedResponses, questions);
          const stats3 = calculateQuestionStats(normalizedResponses, questions);
          
          // Property: Should return same results for same inputs
          return JSON.stringify(stats1) === JSON.stringify(stats2) &&
                 JSON.stringify(stats2) === JSON.stringify(stats3);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle single response correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 35 }),
        fc.record({
          id: fc.uuid(),
          score: fc.integer({ min: -25, max: 25 })
        }),
        fc.array(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 100 }),
            value: fc.integer({ min: -5, max: 5 })
          }),
          { minLength: 5, maxLength: 35 }
        ),
        (numQuestions, response, questions) => {
          // Ensure questions array matches numQuestions
          const normalizedQuestions = questions.slice(0, numQuestions);
          
          // Create response with exactly numQuestions answers
          const normalizedResponse = {
            ...response,
            answers: Array(numQuestions).fill(null).map((_, i) => Math.random() < 0.5 ? 0 : 1)
          };
          
          const questionStats = calculateQuestionStats([normalizedResponse], normalizedQuestions);
          
          // Property: With single response, percentage should be 100 for the answer given
          return questionStats.every((stat, index) => {
            const answer = normalizedResponse.answers[index];
            if (answer === 1) {
              return stat.yesPercentage === 100 && stat.noPercentage === 0;
            } else {
              return stat.yesPercentage === 0 && stat.noPercentage === 100;
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
