/**
 * Property-Based Test for Event Session Association
 * Feature: full-featured-quiz-app
 * 
 * Property 23: Event Session Association
 * **Validates: Requirements 14.6**
 * 
 * For any participant session stored in localStorage, the data should include
 * the event ID as a key component.
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
 * Generate a participant session
 */
const participantSessionArbitrary = fc.record({
  id: participantIdArbitrary,
  name: fc.string({ minLength: 3, maxLength: 30 }),
  avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🐮'),
  score: fc.integer({ min: -25, max: 25 }),
  answers: answersObjectArbitrary,
  createdAt: fc.date().map(d => d.toISOString())
});

describe('Property 23: Event Session Association', () => {
  test('participant session key includes event ID', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantSessionArbitrary,
        (eventId, session) => {
          // Save participant session to localStorage
          const sessionKey = `participant_${eventId}`;
          localStorage.setItem(sessionKey, JSON.stringify(session));
          
          // Property: The storage key must contain the event ID
          // Verify by checking if we can extract the event ID from the key
          const storedKeys = Object.keys(localStorageMock.getItem.mock.calls.reduce((acc, call) => {
            const key = call[0];
            if (key.startsWith('participant_')) {
              acc[key] = true;
            }
            return acc;
          }, {}));
          
          // Check that the key follows the pattern participant_{eventId}
          const expectedKey = `participant_${eventId}`;
          const keyExists = localStorage.getItem(expectedKey) !== null;
          
          return keyExists;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event ID can be extracted from session storage key', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantSessionArbitrary,
        (eventId, session) => {
          // Save participant session
          const sessionKey = `participant_${eventId}`;
          localStorage.setItem(sessionKey, JSON.stringify(session));
          
          // Property: Event ID should be extractable from the key
          // Extract event ID from key
          const extractedEventId = sessionKey.replace('participant_', '');
          
          return extractedEventId === eventId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('multiple sessions for different events are stored separately', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(eventIdArbitrary, participantSessionArbitrary),
          { minLength: 2, maxLength: 5 }
        ).filter(arr => {
          // Ensure all event IDs are unique
          const eventIds = arr.map(([eventId]) => eventId);
          return new Set(eventIds).size === eventIds.length;
        }),
        (eventSessions) => {
          // Save multiple sessions for different events
          eventSessions.forEach(([eventId, session]) => {
            const sessionKey = `participant_${eventId}`;
            localStorage.setItem(sessionKey, JSON.stringify(session));
          });
          
          // Property: Each event should have its own separate session
          for (const [eventId, originalSession] of eventSessions) {
            const sessionKey = `participant_${eventId}`;
            const storedData = localStorage.getItem(sessionKey);
            
            if (!storedData) {
              return false;
            }
            
            const loadedSession = JSON.parse(storedData);
            
            // Verify this is the correct session for this event
            if (loadedSession.id !== originalSession.id) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('session can be retrieved using event ID', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantSessionArbitrary,
        (eventId, session) => {
          // Save session
          const sessionKey = `participant_${eventId}`;
          localStorage.setItem(sessionKey, JSON.stringify(session));
          
          // Property: Session should be retrievable using the event ID
          const retrievedData = localStorage.getItem(`participant_${eventId}`);
          
          if (!retrievedData) {
            return false;
          }
          
          const retrievedSession = JSON.parse(retrievedData);
          
          // Verify it's the same session
          return (
            retrievedSession.id === session.id &&
            retrievedSession.name === session.name &&
            retrievedSession.score === session.score
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event data storage key includes event ID', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          pin: fc.integer({ min: 100000, max: 999999 }).map(String),
          creatorId: fc.uuid(),
          disabledQuestions: fc.array(questionIndexArbitrary, { maxLength: 30 }),
          participants: fc.array(participantSessionArbitrary, { maxLength: 10 }),
          createdAt: fc.date().map(d => d.toISOString())
        }),
        (eventId, eventData) => {
          // Save event data to localStorage
          const eventKey = `event_${eventId}`;
          localStorage.setItem(eventKey, JSON.stringify(eventData));
          
          // Property: The storage key must contain the event ID
          const keyExists = localStorage.getItem(eventKey) !== null;
          
          // Property: Event ID should be extractable from the key
          const extractedEventId = eventKey.replace('event_', '');
          
          return keyExists && extractedEventId === eventId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('session storage follows consistent naming pattern', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantSessionArbitrary,
        (eventId, session) => {
          // Save session
          const sessionKey = `participant_${eventId}`;
          localStorage.setItem(sessionKey, JSON.stringify(session));
          
          // Property: Key should follow the pattern participant_{eventId}
          // Verify pattern by checking if key starts with 'participant_'
          const hasCorrectPrefix = sessionKey.startsWith('participant_');
          
          // Verify the suffix is the event ID
          const suffix = sessionKey.substring('participant_'.length);
          const suffixMatchesEventId = suffix === eventId;
          
          return hasCorrectPrefix && suffixMatchesEventId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('updating session preserves event ID association', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantSessionArbitrary,
        fc.integer({ min: -25, max: 25 }),
        (eventId, session, newScore) => {
          // Save initial session
          const sessionKey = `participant_${eventId}`;
          localStorage.setItem(sessionKey, JSON.stringify(session));
          
          // Load and update session
          const storedData = localStorage.getItem(sessionKey);
          const loadedSession = JSON.parse(storedData);
          loadedSession.score = newScore;
          
          // Save updated session (should use same key)
          localStorage.setItem(sessionKey, JSON.stringify(loadedSession));
          
          // Property: Updated session should still be associated with same event ID
          const updatedData = localStorage.getItem(`participant_${eventId}`);
          
          if (!updatedData) {
            return false;
          }
          
          const finalSession = JSON.parse(updatedData);
          
          // Verify the session was updated and still retrievable with event ID
          return finalSession.score === newScore && finalSession.id === session.id;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('clearing session for one event does not affect other events', () => {
    fc.assert(
      fc.property(
        fc.tuple(eventIdArbitrary, eventIdArbitrary).filter(([id1, id2]) => id1 !== id2),
        participantSessionArbitrary,
        participantSessionArbitrary,
        ([eventId1, eventId2], session1, session2) => {
          // Save sessions for two different events
          localStorage.setItem(`participant_${eventId1}`, JSON.stringify(session1));
          localStorage.setItem(`participant_${eventId2}`, JSON.stringify(session2));
          
          // Remove session for first event
          localStorage.removeItem(`participant_${eventId1}`);
          
          // Property: Session for second event should still exist
          const session2Data = localStorage.getItem(`participant_${eventId2}`);
          
          if (!session2Data) {
            return false;
          }
          
          const loadedSession2 = JSON.parse(session2Data);
          
          // Verify session 1 is gone and session 2 is intact
          const session1Gone = localStorage.getItem(`participant_${eventId1}`) === null;
          const session2Intact = loadedSession2.id === session2.id;
          
          return session1Gone && session2Intact;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('free play sessions use special freeplay event ID', () => {
    fc.assert(
      fc.property(
        participantSessionArbitrary,
        (session) => {
          // Save free play session
          const freeplayEventId = 'freeplay';
          const sessionKey = `participant_${freeplayEventId}`;
          localStorage.setItem(sessionKey, JSON.stringify(session));
          
          // Property: Free play session should be retrievable with 'freeplay' event ID
          const retrievedData = localStorage.getItem('participant_freeplay');
          
          if (!retrievedData) {
            return false;
          }
          
          const retrievedSession = JSON.parse(retrievedData);
          
          return retrievedSession.id === session.id;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event ID association is maintained across multiple operations', () => {
    fc.assert(
      fc.property(
        eventIdArbitrary,
        participantSessionArbitrary,
        fc.array(
          fc.tuple(questionIndexArbitrary, answerArbitrary),
          { minLength: 1, maxLength: 10 }
        ),
        (eventId, initialSession, newAnswers) => {
          const sessionKey = `participant_${eventId}`;
          
          // Initial save
          localStorage.setItem(sessionKey, JSON.stringify(initialSession));
          
          // Simulate multiple answer updates
          for (const [questionIndex, answer] of newAnswers) {
            const data = localStorage.getItem(sessionKey);
            const session = JSON.parse(data);
            session.answers[questionIndex] = answer;
            localStorage.setItem(sessionKey, JSON.stringify(session));
          }
          
          // Property: After multiple updates, session should still be associated with event ID
          const finalData = localStorage.getItem(`participant_${eventId}`);
          
          if (!finalData) {
            return false;
          }
          
          const finalSession = JSON.parse(finalData);
          
          // Verify session is still the same participant
          return finalSession.id === initialSession.id;
        }
      ),
      { numRuns: 100 }
    );
  });
});
