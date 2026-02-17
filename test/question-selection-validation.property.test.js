/**
 * Property-Based Test for Question Selection Validation
 * Feature: full-featured-quiz-app
 * 
 * Property 15: Question Selection Validation
 * Validates: Requirements 5.3
 * 
 * For any event creation attempt, the system should reject the creation 
 * if fewer than 5 questions are enabled.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the event-creation.js code
const eventCreationCode = readFileSync(join(process.cwd(), 'app/event-creation.js'), 'utf-8');

// Load questions data
const questionsCode = readFileSync(join(process.cwd(), 'questions.js'), 'utf-8');

/**
 * Extract the validateEvent function from the event-creation module
 */
function extractValidateEvent() {
  // Extract questions array
  const questionsMatch = questionsCode.match(/const questions = \[([\s\S]*?)\];/);
  if (!questionsMatch) {
    throw new Error('Could not extract questions array');
  }
  
  const questionsArrayCode = `const questions = [${questionsMatch[1]}];`;
  
  // Extract validateEvent function
  const validateEventMatch = eventCreationCode.match(/function validateEvent\([\s\S]*?\n\}/);
  if (!validateEventMatch) {
    throw new Error('Could not extract validateEvent function');
  }
  
  const validateEventCode = validateEventMatch[0];
  
  // Create a function that includes both questions and validateEvent
  const code = `
    ${questionsArrayCode}
    ${validateEventCode}
    return validateEvent;
  `;
  
  const func = new Function(code);
  return func();
}

describe('Property 15: Question Selection Validation', () => {
  test('should reject event creation when fewer than 5 questions are enabled', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // Valid title
        fc.integer({ min: 0, max: 30 }), // Number of questions to disable (0-30 means 35-5 enabled)
        (title, numToDisable) => {
          const validateEvent = extractValidateEvent();
          
          // Total questions is 35
          const totalQuestions = 35;
          
          // Calculate how many questions will be enabled
          const enabledQuestions = totalQuestions - numToDisable;
          
          // Create disabled questions array
          const disabledQuestions = Array.from({ length: numToDisable }, (_, i) => i);
          
          // Validate the event
          const result = validateEvent(title, disabledQuestions);
          
          // Property: If fewer than 5 questions are enabled, validation should fail
          if (enabledQuestions < 5) {
            // Should be invalid
            if (result.isValid) {
              console.log(`FAILED: Expected invalid for ${enabledQuestions} enabled questions, but got valid`);
              return false;
            }
            
            // Should have an error about questions
            const hasQuestionError = result.errors.some(err => err.field === 'questions');
            if (!hasQuestionError) {
              console.log(`FAILED: Expected question error for ${enabledQuestions} enabled questions`);
              return false;
            }
            
            return true;
          } else {
            // If 5 or more questions are enabled, validation should pass (assuming valid title)
            // Note: Title validation is separate, so we only check question validation here
            const hasQuestionError = result.errors.some(err => err.field === 'questions');
            
            // Should NOT have a question error
            if (hasQuestionError) {
              console.log(`FAILED: Unexpected question error for ${enabledQuestions} enabled questions`);
              return false;
            }
            
            return true;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should accept event creation when exactly 5 questions are enabled', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // Valid title
        () => {
          const validateEvent = extractValidateEvent();
          
          // Disable 30 questions (35 - 30 = 5 enabled)
          const disabledQuestions = Array.from({ length: 30 }, (_, i) => i);
          const title = 'Test Event';
          
          const result = validateEvent(title, disabledQuestions);
          
          // Property: Should NOT have a question error when exactly 5 questions are enabled
          const hasQuestionError = result.errors.some(err => err.field === 'questions');
          return !hasQuestionError;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should reject event creation when 4 or fewer questions are enabled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 31, max: 35 }), // Disable 31-35 questions (4-0 enabled)
        (numToDisable) => {
          const validateEvent = extractValidateEvent();
          
          // Create disabled questions array
          const disabledQuestions = Array.from({ length: numToDisable }, (_, i) => i);
          const title = 'Test Event';
          
          const result = validateEvent(title, disabledQuestions);
          
          // Property: Should be invalid and have a question error
          if (result.isValid) {
            console.log(`FAILED: Expected invalid for ${35 - numToDisable} enabled questions`);
            return false;
          }
          
          const hasQuestionError = result.errors.some(err => err.field === 'questions');
          if (!hasQuestionError) {
            console.log(`FAILED: Expected question error for ${35 - numToDisable} enabled questions`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should accept event creation when more than 5 questions are enabled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 29 }), // Disable 0-29 questions (35-6 enabled)
        (numToDisable) => {
          const validateEvent = extractValidateEvent();
          
          // Create disabled questions array
          const disabledQuestions = Array.from({ length: numToDisable }, (_, i) => i);
          const title = 'Test Event';
          
          const result = validateEvent(title, disabledQuestions);
          
          // Property: Should NOT have a question error when more than 5 questions are enabled
          const hasQuestionError = result.errors.some(err => err.field === 'questions');
          
          if (hasQuestionError) {
            console.log(`FAILED: Unexpected question error for ${35 - numToDisable} enabled questions`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should validate question count regardless of which questions are disabled', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 34 }), { minLength: 0, maxLength: 35 })
          .map(arr => [...new Set(arr)]), // Ensure unique indices
        (disabledQuestions) => {
          const validateEvent = extractValidateEvent();
          
          const totalQuestions = 35;
          const enabledQuestions = totalQuestions - disabledQuestions.length;
          const title = 'Test Event';
          
          const result = validateEvent(title, disabledQuestions);
          
          // Property: Validation should depend only on the count, not which questions are disabled
          const hasQuestionError = result.errors.some(err => err.field === 'questions');
          
          if (enabledQuestions < 5) {
            // Should have question error
            return !result.isValid && hasQuestionError;
          } else {
            // Should NOT have question error
            return !hasQuestionError;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should include enabled question count in error message', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 31, max: 35 }), // Disable 31-35 questions (4-0 enabled)
        (numToDisable) => {
          const validateEvent = extractValidateEvent();
          
          const disabledQuestions = Array.from({ length: numToDisable }, (_, i) => i);
          const title = 'Test Event';
          const enabledQuestions = 35 - numToDisable;
          
          const result = validateEvent(title, disabledQuestions);
          
          // Property: Error message should include the actual count of enabled questions
          const questionError = result.errors.find(err => err.field === 'questions');
          
          if (!questionError) {
            console.log('FAILED: Expected question error');
            return false;
          }
          
          // Check if the error message contains the enabled question count
          const containsCount = questionError.message.includes(enabledQuestions.toString());
          
          if (!containsCount) {
            console.log(`FAILED: Error message should contain enabled count ${enabledQuestions}: ${questionError.message}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle edge case of all questions disabled', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const validateEvent = extractValidateEvent();
          
          // Disable all 35 questions
          const disabledQuestions = Array.from({ length: 35 }, (_, i) => i);
          const title = 'Test Event';
          
          const result = validateEvent(title, disabledQuestions);
          
          // Property: Should be invalid with question error
          if (result.isValid) {
            console.log('FAILED: Expected invalid when all questions disabled');
            return false;
          }
          
          const hasQuestionError = result.errors.some(err => err.field === 'questions');
          if (!hasQuestionError) {
            console.log('FAILED: Expected question error when all questions disabled');
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle edge case of no questions disabled', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const validateEvent = extractValidateEvent();
          
          // Disable no questions (all 35 enabled)
          const disabledQuestions = [];
          const title = 'Test Event';
          
          const result = validateEvent(title, disabledQuestions);
          
          // Property: Should NOT have question error when all questions enabled
          const hasQuestionError = result.errors.some(err => err.field === 'questions');
          
          if (hasQuestionError) {
            console.log('FAILED: Unexpected question error when all questions enabled');
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
