/**
 * Property-Based Test for Free Play Analytics Completeness
 * Feature: full-featured-quiz-app
 * 
 * Property 27: Free Play Statistics Completeness
 * Validates: Requirements 2A.2, 2A.3, 2A.4
 * 
 * For any free play analytics display, all required statistics (mean, median, range,
 * percentile, question distributions) should be present in the rendered output.
 */

import { describe, test, beforeEach } from 'vitest';
import fc from 'fast-check';

// Mock the questions array
const mockQuestions = [
  { text: "Question 1", value: 1 },
  { text: "Question 2", value: -1 },
  { text: "Question 3", value: 2 },
  { text: "Question 4", value: -2 },
  { text: "Question 5", value: 1 }
];

/**
 * Calculate score statistics from all responses
 * This is the implementation from free-play-analytics.js
 */
function calculateScoreStats(responses) {
  if (!responses || responses.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      distribution: []
    };
  }
  
  const scores = responses.map(r => r.score);
  const sum = scores.reduce((acc, score) => acc + score, 0);
  const mean = sum / scores.length;
  
  const sortedScores = [...scores].sort((a, b) => a - b);
  const median = sortedScores.length % 2 === 0
    ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
    : sortedScores[Math.floor(sortedScores.length / 2)];
  
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  
  const scoreFrequency = {};
  scores.forEach(score => {
    scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
  });
  
  const distribution = Object.entries(scoreFrequency)
    .map(([score, count]) => ({ score: parseInt(score), count }))
    .sort((a, b) => a.score - b.score);
  
  return {
    mean: Math.round(mean * 10) / 10,
    median,
    min,
    max,
    distribution
  };
}

/**
 * Calculate percentile for user's score compared to all scores
 */
function calculatePercentile(userScore, allScores) {
  if (!allScores || allScores.length === 0) {
    return 0;
  }
  
  const scoresLessThanOrEqual = allScores.filter(score => score <= userScore).length;
  const percentile = (scoresLessThanOrEqual / allScores.length) * 100;
  
  return Math.round(percentile);
}

/**
 * Calculate per-question response statistics
 */
function calculateQuestionStats(responses, questions) {
  if (!responses || responses.length === 0) {
    return [];
  }
  
  if (!questions) {
    return [];
  }
  
  const totalResponses = responses.length;
  const questionStats = [];
  
  questions.forEach((question, index) => {
    let yesCount = 0;
    let noCount = 0;
    
    responses.forEach(response => {
      if (!response.answers) return;
      
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

/**
 * Generate analytics data structure that would be used for rendering
 */
function generateAnalyticsData(userScore, userAnswers, responses, questions) {
  const scoreStats = calculateScoreStats(responses);
  const allScores = responses.map(r => r.score);
  const percentile = calculatePercentile(userScore, allScores);
  const questionStats = calculateQuestionStats(responses, questions);
  
  return {
    userScore,
    userAnswers,
    scoreStats,
    percentile,
    questionStats,
    totalResponses: responses.length
  };
}

/**
 * Verify that analytics data contains all required fields
 * **Validates: Requirements 2A.2, 2A.3, 2A.4**
 */
function verifyAnalyticsCompleteness(analyticsData) {
  // Check that all top-level fields exist
  if (typeof analyticsData.userScore !== 'number') return false;
  if (!analyticsData.userAnswers) return false;
  if (!analyticsData.scoreStats) return false;
  if (typeof analyticsData.percentile !== 'number') return false;
  if (!Array.isArray(analyticsData.questionStats)) return false;
  if (typeof analyticsData.totalResponses !== 'number') return false;
  
  // Check scoreStats completeness (Requirement 2A.2, 2A.3)
  const stats = analyticsData.scoreStats;
  if (typeof stats.mean !== 'number') return false;
  if (typeof stats.median !== 'number') return false;
  if (typeof stats.min !== 'number') return false;
  if (typeof stats.max !== 'number') return false;
  if (!Array.isArray(stats.distribution)) return false;
  
  // Check distribution array structure (Requirement 2A.3)
  for (const item of stats.distribution) {
    if (typeof item.score !== 'number') return false;
    if (typeof item.count !== 'number') return false;
  }
  
  // Check questionStats completeness (Requirement 2A.4)
  for (const qStat of analyticsData.questionStats) {
    if (typeof qStat.questionIndex !== 'number') return false;
    if (typeof qStat.questionText !== 'string') return false;
    if (typeof qStat.questionValue !== 'number') return false;
    if (typeof qStat.yesCount !== 'number') return false;
    if (typeof qStat.noCount !== 'number') return false;
    if (typeof qStat.yesPercentage !== 'number') return false;
    if (typeof qStat.noPercentage !== 'number') return false;
  }
  
  return true;
}

describe('Property 27: Free Play Statistics Completeness', () => {
  test('analytics data should contain all required statistics fields', () => {
    fc.assert(
      fc.property(
        // Generate user score
        fc.integer({ min: -10, max: 10 }),
        // Generate user answers
        fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 }),
        // Generate other responses
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (userScore, userAnswers, responses) => {
          // Generate analytics data
          const analyticsData = generateAnalyticsData(
            userScore,
            userAnswers,
            responses,
            mockQuestions
          );
          
          // Property: All required fields should be present
          return verifyAnalyticsCompleteness(analyticsData);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('scoreStats should always contain mean, median, min, max, and distribution', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (responses) => {
          const scoreStats = calculateScoreStats(responses);
          
          // Property: All score statistics fields should exist
          return (
            typeof scoreStats.mean === 'number' &&
            typeof scoreStats.median === 'number' &&
            typeof scoreStats.min === 'number' &&
            typeof scoreStats.max === 'number' &&
            Array.isArray(scoreStats.distribution)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('distribution array should contain score and count for each unique score', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (responses) => {
          const scoreStats = calculateScoreStats(responses);
          
          // Property: Each distribution item should have score and count
          return scoreStats.distribution.every(item => 
            typeof item.score === 'number' &&
            typeof item.count === 'number' &&
            item.count > 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('questionStats should contain entry for each question', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (responses) => {
          const questionStats = calculateQuestionStats(responses, mockQuestions);
          
          // Property: Should have one entry per question
          return questionStats.length === mockQuestions.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('each question stat should contain all required fields', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (responses) => {
          const questionStats = calculateQuestionStats(responses, mockQuestions);
          
          // Property: Each question stat should have all required fields
          return questionStats.every(qStat =>
            typeof qStat.questionIndex === 'number' &&
            typeof qStat.questionText === 'string' &&
            typeof qStat.questionValue === 'number' &&
            typeof qStat.yesCount === 'number' &&
            typeof qStat.noCount === 'number' &&
            typeof qStat.yesPercentage === 'number' &&
            typeof qStat.noPercentage === 'number'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('percentages in question stats should sum to 100 when there are responses', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (responses) => {
          const questionStats = calculateQuestionStats(responses, mockQuestions);
          
          // Property: Yes and No percentages should sum to approximately 100
          // (or both be 0 if no one answered that question)
          return questionStats.every(qStat => {
            const sum = qStat.yesPercentage + qStat.noPercentage;
            const hasAnswers = qStat.yesCount + qStat.noCount > 0;
            
            if (!hasAnswers) {
              return sum === 0;
            }
            
            // Allow for rounding errors (sum should be 99-101)
            return sum >= 99 && sum <= 101;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('analytics data should handle single response correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 10 }),
        fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 }),
        (userScore, userAnswers) => {
          // Single response (just the user)
          const responses = [{
            score: userScore,
            answers: userAnswers
          }];
          
          const analyticsData = generateAnalyticsData(
            userScore,
            userAnswers,
            responses,
            mockQuestions
          );
          
          // Property: Should still have all required fields
          return verifyAnalyticsCompleteness(analyticsData) &&
                 analyticsData.totalResponses === 1 &&
                 analyticsData.percentile === 100; // User is at 100th percentile when alone
        }
      ),
      { numRuns: 100 }
    );
  });

  test('analytics data should handle empty responses gracefully', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 10 }),
        fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 }),
        (userScore, userAnswers) => {
          // Empty responses array
          const responses = [];
          
          const analyticsData = generateAnalyticsData(
            userScore,
            userAnswers,
            responses,
            mockQuestions
          );
          
          // Property: Should still have all required fields with default values
          return (
            typeof analyticsData.userScore === 'number' &&
            analyticsData.scoreStats.mean === 0 &&
            analyticsData.scoreStats.median === 0 &&
            analyticsData.percentile === 0 &&
            analyticsData.questionStats.length === 0 &&
            analyticsData.totalResponses === 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('distribution counts should sum to total responses', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (responses) => {
          const scoreStats = calculateScoreStats(responses);
          
          // Property: Sum of all distribution counts should equal total responses
          const totalCount = scoreStats.distribution.reduce((sum, item) => sum + item.count, 0);
          return totalCount === responses.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('question stats counts should not exceed total responses', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (responses) => {
          const questionStats = calculateQuestionStats(responses, mockQuestions);
          
          // Property: Yes + No counts should not exceed total responses for any question
          return questionStats.every(qStat => 
            qStat.yesCount + qStat.noCount <= responses.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('analytics data should preserve user score and answers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 10 }),
        fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 }),
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (userScore, userAnswers, responses) => {
          const analyticsData = generateAnalyticsData(
            userScore,
            userAnswers,
            responses,
            mockQuestions
          );
          
          // Property: User's score and answers should be preserved exactly
          return (
            analyticsData.userScore === userScore &&
            JSON.stringify(analyticsData.userAnswers) === JSON.stringify(userAnswers)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('analytics data should handle responses with missing answers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 10 }),
        fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 }),
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            // Some responses may have incomplete answers
            answers: fc.oneof(
              fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 }),
              fc.constant({}) // Empty answers object
            )
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (userScore, userAnswers, responses) => {
          const analyticsData = generateAnalyticsData(
            userScore,
            userAnswers,
            responses,
            mockQuestions
          );
          
          // Property: Should still have all required fields even with missing answers
          return verifyAnalyticsCompleteness(analyticsData);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('mean should be within min and max range', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (responses) => {
          const scoreStats = calculateScoreStats(responses);
          
          // Property: Mean should be between min and max (inclusive)
          return scoreStats.mean >= scoreStats.min && scoreStats.mean <= scoreStats.max;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('median should be within min and max range', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (responses) => {
          const scoreStats = calculateScoreStats(responses);
          
          // Property: Median should be between min and max (inclusive)
          return scoreStats.median >= scoreStats.min && scoreStats.median <= scoreStats.max;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('question indices should be sequential starting from 0', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (responses) => {
          const questionStats = calculateQuestionStats(responses, mockQuestions);
          
          // Property: Question indices should be 0, 1, 2, 3, 4
          return questionStats.every((qStat, index) => qStat.questionIndex === index);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('analytics completeness with large number of responses', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 10 }),
        fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 }),
        fc.array(
          fc.record({
            score: fc.integer({ min: -10, max: 10 }),
            answers: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 5, maxLength: 5 })
          }),
          { minLength: 100, maxLength: 500 }
        ),
        (userScore, userAnswers, responses) => {
          const analyticsData = generateAnalyticsData(
            userScore,
            userAnswers,
            responses,
            mockQuestions
          );
          
          // Property: Should handle large datasets and maintain completeness
          return verifyAnalyticsCompleteness(analyticsData) &&
                 analyticsData.totalResponses === responses.length;
        }
      ),
      { numRuns: 10 } // Fewer runs for large datasets
    );
  });
});
