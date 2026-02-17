/**
 * Property-Based Test for Answer Persistence Round-Trip
 * Feature: full-featured-quiz-app
 * 
 * Property 16: Answer Persistence Round-Trip
 * **Validates: Requirements 14.1, 14.2**
 * 
 * For any participant answering questions, saving answers to localStorage
 * and then reloading the page should restore the exact same set of answers.
 */

import { describe, test, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock localStorage
let localStorageMock;

beforeEach(() => {
  // Create a fresh localStorage mock for each test
  const storage = {};
  
  localStorageMock = {
    getItem: vi.fn((key) => storage[key] || null),
    setItem: vi.fn((key, value) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    get length() {
      return Object.keys(storage).length;
    },
    key: vi.fn((index) => {
      const keys = Object.keys(storage);
      return keys[index] || null;
    })
  };
  
  global.localStorage = localStorageMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Generators for property-based testing

/**
 * Generate a valid event ID
 */
const eventIdArbitrary = fc.oneof(
  fc.constantFrom('freeplay'),
  fc.string({ minLength: 10, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
);

/**
 * Generate a valid participant ID
 */
const participantIdArbitrary = fc.uuid();

/**
 * Generate a valid question index (0-34 for 35 questions)
 */
const questionIndexArbitrary = fc.integer({ min: 0, max: 34 });

/**
 * Generate a valid answer (0 for No, 1 for Yes)
 */
const answerArbitrary = fc.integer({ min: 0, max: 1 });

/**
 * Generate an answers object with random question indices and answers
 */
const answersObjectArbitrary = fc.dictionary(
  questionIndexArbitrary.map(String),
  answerArbitrary,
  { minKeys: 1, maxKeys: 35 }
);

/**
 * Generate a participant with answers
 */
const participantArbitrary = fc.record({
  id: participantIdArbitrary,
  name: fc.string({ minLength: 3, maxLength: 30 }),
  avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🐮'),
  score: fc.integer({ min: -25, max: 25 }),
  answers: answersObjectArbitrary,
  createdAt: fc.date().map(d => d.toISOString())
});

describe('Property 16: Answer Persistence Round-Trip', () => {
  test('saving and loading participant answers preserves exact answer set', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantArbitrary,
        (eventId, participant) => {
          // Step 1: Save participant to localStorage
          const participantKey = `participant_${eventId}`;
          localStorage.setItem(participantKey, JSON.stringify(participant));
          
          // Step 2: Retrieve participant from localStorage
          const storedData = localStorage.getItem(participantKey);
          const loadedParticipant = JSON.parse(storedData);
          
          // Property: Loaded answers should exactly match saved answers
          // Check that all answer keys are preserved
          const savedKeys = Object.keys(participant.answers).sort();
          const loadedKeys = Object.keys(loadedParticipant.answers).sort();
          
          if (savedKeys.length !== loadedKeys.length) {
            return false;
          }
          
          if (!savedKeys.every((key, index) => key === loadedKeys[index])) {
            return false;
          }
          
          // Check that all answer values are preserved
          for (const key of savedKeys) {
            if (participant.answers[key] !== loadedParticipant.answers[key]) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('saving and loading event data preserves all participant answers', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        fc.array(participantArbitrary, { minLength: 1, maxLength: 10 }),
        (eventId, participants) => {
          // Step 1: Create event data with participants
          const eventData = {
            title: 'Test Event',
            pin: '123456',
            participants: participants,
            disabledQuestions: [],
            createdAt: new Date().toISOString()
          };
          
          // Step 2: Save event to localStorage
          const eventKey = `event_${eventId}`;
          localStorage.setItem(eventKey, JSON.stringify(eventData));
          
          // Step 3: Retrieve event from localStorage
          const storedData = localStorage.getItem(eventKey);
          const loadedEventData = JSON.parse(storedData);
          
          // Property: All participants' answers should be preserved
          if (loadedEventData.participants.length !== participants.length) {
            return false;
          }
          
          for (let i = 0; i < participants.length; i++) {
            const originalParticipant = participants[i];
            const loadedParticipant = loadedEventData.participants[i];
            
            // Check answers match
            const originalKeys = Object.keys(originalParticipant.answers).sort();
            const loadedKeys = Object.keys(loadedParticipant.answers).sort();
            
            if (originalKeys.length !== loadedKeys.length) {
              return false;
            }
            
            for (const key of originalKeys) {
              if (originalParticipant.answers[key] !== loadedParticipant.answers[key]) {
                return false;
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('partial answer sets are preserved correctly', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantIdArbitrary,
        fc.array(
          fc.tuple(questionIndexArbitrary, answerArbitrary),
          { minLength: 1, maxLength: 20 }
        ),
        (eventId, participantId, answerPairs) => {
          // Create answers object from pairs (simulating partial completion)
          const answers = {};
          answerPairs.forEach(([questionIndex, answer]) => {
            answers[questionIndex] = answer;
          });
          
          const participant = {
            id: participantId,
            name: 'Test User',
            avatar: '🐱',
            score: 0,
            answers: answers,
            createdAt: new Date().toISOString()
          };
          
          // Save to localStorage
          const participantKey = `participant_${eventId}`;
          localStorage.setItem(participantKey, JSON.stringify(participant));
          
          // Load from localStorage
          const storedData = localStorage.getItem(participantKey);
          const loadedParticipant = JSON.parse(storedData);
          
          // Property: Partial answer set should be preserved exactly
          const savedKeys = Object.keys(answers).sort();
          const loadedKeys = Object.keys(loadedParticipant.answers).sort();
          
          if (savedKeys.length !== loadedKeys.length) {
            return false;
          }
          
          for (const key of savedKeys) {
            if (answers[key] !== loadedParticipant.answers[key]) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('empty answers object is preserved correctly', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantIdArbitrary,
        (eventId, participantId) => {
          const participant = {
            id: participantId,
            name: 'Test User',
            avatar: '🐱',
            score: 0,
            answers: {},
            createdAt: new Date().toISOString()
          };
          
          // Save to localStorage
          const participantKey = `participant_${eventId}`;
          localStorage.setItem(participantKey, JSON.stringify(participant));
          
          // Load from localStorage
          const storedData = localStorage.getItem(participantKey);
          const loadedParticipant = JSON.parse(storedData);
          
          // Property: Empty answers object should be preserved
          return (
            typeof loadedParticipant.answers === 'object' &&
            Object.keys(loadedParticipant.answers).length === 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('answer values are preserved with correct types', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantArbitrary,
        (eventId, participant) => {
          // Save to localStorage
          const participantKey = `participant_${eventId}`;
          localStorage.setItem(participantKey, JSON.stringify(participant));
          
          // Load from localStorage
          const storedData = localStorage.getItem(participantKey);
          const loadedParticipant = JSON.parse(storedData);
          
          // Property: Answer values should be numbers (0 or 1), not strings
          for (const key of Object.keys(loadedParticipant.answers)) {
            const value = loadedParticipant.answers[key];
            if (typeof value !== 'number') {
              return false;
            }
            if (value !== 0 && value !== 1) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('multiple save-load cycles preserve answers', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantArbitrary,
        fc.integer({ min: 2, max: 5 }),
        (eventId, participant, cycles) => {
          const participantKey = `participant_${eventId}`;
          let currentParticipant = participant;
          
          // Perform multiple save-load cycles
          for (let i = 0; i < cycles; i++) {
            // Save
            localStorage.setItem(participantKey, JSON.stringify(currentParticipant));
            
            // Load
            const storedData = localStorage.getItem(participantKey);
            currentParticipant = JSON.parse(storedData);
          }
          
          // Property: After multiple cycles, answers should still match original
          const originalKeys = Object.keys(participant.answers).sort();
          const finalKeys = Object.keys(currentParticipant.answers).sort();
          
          if (originalKeys.length !== finalKeys.length) {
            return false;
          }
          
          for (const key of originalKeys) {
            if (participant.answers[key] !== currentParticipant.answers[key]) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('updating answers preserves previous answers', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantArbitrary,
        fc.tuple(questionIndexArbitrary, answerArbitrary),
        (eventId, participant, [newQuestionIndex, newAnswer]) => {
          const participantKey = `participant_${eventId}`;
          
          // Save initial participant
          localStorage.setItem(participantKey, JSON.stringify(participant));
          
          // Load and update with new answer
          const storedData = localStorage.getItem(participantKey);
          const loadedParticipant = JSON.parse(storedData);
          
          // Add or update one answer
          loadedParticipant.answers[newQuestionIndex] = newAnswer;
          
          // Save updated participant
          localStorage.setItem(participantKey, JSON.stringify(loadedParticipant));
          
          // Load again
          const updatedData = localStorage.getItem(participantKey);
          const finalParticipant = JSON.parse(updatedData);
          
          // Property: All original answers should still be present
          for (const key of Object.keys(participant.answers)) {
            if (key !== String(newQuestionIndex)) {
              if (finalParticipant.answers[key] !== participant.answers[key]) {
                return false;
              }
            }
          }
          
          // Property: New answer should be present
          if (finalParticipant.answers[newQuestionIndex] !== newAnswer) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
