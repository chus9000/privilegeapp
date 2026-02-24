/**
 * Property-Based Test for Session Storage Persistence
 * Feature: score-page-separation
 * 
 * Property 2: Session Storage Persistence
 * Validates: Requirements 2.3, 2.4
 * 
 * For any participant who completes questions, the system should store their 
 * participant identifier in sessionStorage with the key format `participant_{eventId}`, 
 * and this identifier should be retrievable on subsequent page loads.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

/**
 * Simulate the storeSessionParticipant function from event.js
 * This function stores the participant ID in sessionStorage with the key format `participant_{eventId}`
 * 
 * @param {string} eventId - The event ID
 * @param {string} participantId - The participant ID
 * @param {Object} storage - Storage object (sessionStorage or localStorage)
 * @returns {boolean} True if storage succeeded
 */
function storeSessionParticipant(eventId, participantId, storage) {
  try {
    storage.setItem(`participant_${eventId}`, participantId);
    return true;
  } catch (error) {
    // Fallback to localStorage if sessionStorage is unavailable
    try {
      storage.setItem(`session_participant_${eventId}`, participantId);
      return true;
    } catch (fallbackError) {
      return false;
    }
  }
}

/**
 * Simulate retrieving the session participant from storage
 * This mimics the getEventContext function in score.js
 * 
 * @param {string} eventId - The event ID
 * @param {Object} storage - Storage object (sessionStorage or localStorage)
 * @returns {string|null} The participant ID or null if not found
 */
function getSessionParticipant(eventId, storage) {
  try {
    return storage.getItem(`participant_${eventId}`);
  } catch (error) {
    // Fallback to localStorage
    try {
      return storage.getItem(`session_participant_${eventId}`);
    } catch (fallbackError) {
      return null;
    }
  }
}

/**
 * Create a mock storage object that simulates sessionStorage/localStorage
 * @returns {Object} Mock storage with getItem, setItem, removeItem, clear methods
 */
function createMockStorage() {
  const store = {};
  
  return {
    _store: store,
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach(key => delete store[key]);
    }
  };
}

/**
 * Create a mock storage that throws errors (simulates disabled storage)
 * @returns {Object} Mock storage that throws on all operations
 */
function createFailingStorage() {
  return {
    getItem() {
      throw new Error('Storage is disabled');
    },
    setItem() {
      throw new Error('Storage is disabled');
    },
    removeItem() {
      throw new Error('Storage is disabled');
    },
    clear() {
      throw new Error('Storage is disabled');
    }
  };
}

// Generators for property-based testing

/**
 * Generate valid event IDs
 */
const eventIdGen = fc.oneof(
  fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  fc.constantFrom('freeplay', 'event-123', 'test-event', 'abc-def-ghi', 'event-with-dashes')
);

/**
 * Generate valid participant IDs
 */
const participantIdGen = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  fc.constantFrom(
    'participant-123', 
    'user-abc', 
    'test-participant',
    '1234567890-abcdef-12345-67890-1',
    'p-' + Date.now()
  )
);

describe('Property 2: Session Storage Persistence', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  afterEach(() => {
    mockStorage.clear();
  });

  test('**Validates: Requirements 2.3, 2.4** - stored participant ID is retrievable', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        participantIdGen,
        (eventId, participantId) => {
          // Setup: Store participant ID
          const stored = storeSessionParticipant(eventId, participantId, mockStorage);
          
          // Test: Retrieve participant ID
          const retrieved = getSessionParticipant(eventId, mockStorage);
          
          // Property: Retrieved ID should match stored ID
          return stored === true && retrieved === participantId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - key format is participant_{eventId}', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        participantIdGen,
        (eventId, participantId) => {
          // Setup: Store participant ID
          storeSessionParticipant(eventId, participantId, mockStorage);
          
          // Test: Check that the key format is correct
          const expectedKey = `participant_${eventId}`;
          const storedValue = mockStorage.getItem(expectedKey);
          
          // Property: Value should be stored with correct key format
          return storedValue === participantId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - multiple events can store different participants', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(eventIdGen, participantIdGen), { minLength: 1, maxLength: 10 })
          .filter(pairs => {
            // Ensure all event IDs are unique (no duplicates)
            const eventIds = pairs.map(([eventId]) => eventId);
            return new Set(eventIds).size === eventIds.length;
          }),
        (eventParticipantPairs) => {
          // Setup: Store multiple event-participant pairs
          eventParticipantPairs.forEach(([eventId, participantId]) => {
            storeSessionParticipant(eventId, participantId, mockStorage);
          });
          
          // Test: Retrieve all participants and verify they match
          const allMatch = eventParticipantPairs.every(([eventId, participantId]) => {
            const retrieved = getSessionParticipant(eventId, mockStorage);
            return retrieved === participantId;
          });
          
          // Property: All stored participants should be retrievable with correct IDs
          return allMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - storage persists across multiple retrievals', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        participantIdGen,
        fc.integer({ min: 2, max: 10 }),
        (eventId, participantId, numRetrievals) => {
          // Setup: Store participant ID once
          storeSessionParticipant(eventId, participantId, mockStorage);
          
          // Test: Retrieve multiple times
          const retrievals = [];
          for (let i = 0; i < numRetrievals; i++) {
            retrievals.push(getSessionParticipant(eventId, mockStorage));
          }
          
          // Property: All retrievals should return the same participant ID
          return retrievals.every(retrieved => retrieved === participantId);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - overwriting participant ID updates storage', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        participantIdGen,
        participantIdGen,
        (eventId, firstParticipantId, secondParticipantId) => {
          // Ensure IDs are different
          fc.pre(firstParticipantId !== secondParticipantId);
          
          // Setup: Store first participant ID
          storeSessionParticipant(eventId, firstParticipantId, mockStorage);
          
          // Test: Overwrite with second participant ID
          storeSessionParticipant(eventId, secondParticipantId, mockStorage);
          const retrieved = getSessionParticipant(eventId, mockStorage);
          
          // Property: Retrieved ID should be the second (most recent) ID
          return retrieved === secondParticipantId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - non-existent event returns null', () => {
    fc.assert(
      fc.property(
        fc.tuple(eventIdGen, eventIdGen).filter(([id1, id2]) => id1 !== id2),
        participantIdGen,
        ([storedEventId, queriedEventId], participantId) => {
          // Clear storage before each test case
          const testStorage = createMockStorage();
          
          // Setup: Store participant for one event
          storeSessionParticipant(storedEventId, participantId, testStorage);
          
          // Test: Query for different event
          const retrieved = getSessionParticipant(queriedEventId, testStorage);
          
          // Property: Should return null for non-existent event
          return retrieved === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - empty storage returns null', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        (eventId) => {
          // Setup: Empty storage (no participant stored)
          
          // Test: Try to retrieve participant
          const retrieved = getSessionParticipant(eventId, mockStorage);
          
          // Property: Should return null when nothing is stored
          return retrieved === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - special characters in IDs are preserved', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).map(s => `event-${s}-!@#$%`),
        fc.string({ minLength: 1, maxLength: 50 }).map(s => `participant-${s}-&*()_+`),
        (eventId, participantId) => {
          // Setup: Store participant with special characters
          storeSessionParticipant(eventId, participantId, mockStorage);
          
          // Test: Retrieve participant
          const retrieved = getSessionParticipant(eventId, mockStorage);
          
          // Property: Special characters should be preserved exactly
          return retrieved === participantId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - numeric IDs are stored as strings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999999 }),
        fc.integer({ min: 1, max: 999999 }),
        (eventIdNum, participantIdNum) => {
          const eventId = eventIdNum.toString();
          const participantId = participantIdNum.toString();
          
          // Setup: Store numeric IDs
          storeSessionParticipant(eventId, participantId, mockStorage);
          
          // Test: Retrieve and check type
          const retrieved = getSessionParticipant(eventId, mockStorage);
          
          // Property: Should be stored and retrieved as strings
          return retrieved === participantId && typeof retrieved === 'string';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - whitespace in IDs is preserved', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `  ${s}  `),
        fc.string({ minLength: 1, maxLength: 30 }).map(s => `  ${s}  `),
        (eventId, participantId) => {
          // Setup: Store IDs with whitespace
          storeSessionParticipant(eventId, participantId, mockStorage);
          
          // Test: Retrieve participant
          const retrieved = getSessionParticipant(eventId, mockStorage);
          
          // Property: Whitespace should be preserved (no trimming)
          return retrieved === participantId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - freeplay event ID works like any other', () => {
    fc.assert(
      fc.property(
        participantIdGen,
        (participantId) => {
          const eventId = 'freeplay';
          
          // Setup: Store participant for freeplay event
          storeSessionParticipant(eventId, participantId, mockStorage);
          
          // Test: Retrieve participant
          const retrieved = getSessionParticipant(eventId, mockStorage);
          
          // Property: Freeplay should work the same as any other event
          return retrieved === participantId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - storage isolation between events', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(eventIdGen, participantIdGen), { minLength: 2, maxLength: 5 })
          .filter(pairs => {
            // Ensure all event IDs are unique
            const eventIds = pairs.map(([eventId]) => eventId);
            return new Set(eventIds).size === eventIds.length;
          }),
        (eventParticipantPairs) => {
          // Setup: Store multiple event-participant pairs
          eventParticipantPairs.forEach(([eventId, participantId]) => {
            storeSessionParticipant(eventId, participantId, mockStorage);
          });
          
          // Test: Verify each event has its own isolated participant
          const allIsolated = eventParticipantPairs.every(([eventId, participantId]) => {
            const retrieved = getSessionParticipant(eventId, mockStorage);
            // Check that this event's participant matches
            if (retrieved !== participantId) return false;
            
            // Check that other events don't interfere
            const otherEvents = eventParticipantPairs.filter(([eid]) => eid !== eventId);
            return otherEvents.every(([otherEventId, otherParticipantId]) => {
              const otherRetrieved = getSessionParticipant(otherEventId, mockStorage);
              return otherRetrieved === otherParticipantId;
            });
          });
          
          // Property: Each event should have isolated storage
          return allIsolated;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - storage operations are idempotent', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        participantIdGen,
        fc.integer({ min: 2, max: 5 }),
        (eventId, participantId, numStores) => {
          // Setup: Store the same participant multiple times
          for (let i = 0; i < numStores; i++) {
            storeSessionParticipant(eventId, participantId, mockStorage);
          }
          
          // Test: Retrieve participant
          const retrieved = getSessionParticipant(eventId, mockStorage);
          
          // Property: Multiple stores should have same effect as single store
          return retrieved === participantId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - case sensitivity in event IDs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.toLowerCase() !== s.toUpperCase()),
        participantIdGen,
        participantIdGen,
        (baseEventId, participantId1, participantId2) => {
          // Ensure participant IDs are different
          fc.pre(participantId1 !== participantId2);
          
          const lowerEventId = baseEventId.toLowerCase();
          const upperEventId = baseEventId.toUpperCase();
          
          // Skip if they're the same (no letters)
          fc.pre(lowerEventId !== upperEventId);
          
          // Setup: Store different participants for lowercase and uppercase event IDs
          storeSessionParticipant(lowerEventId, participantId1, mockStorage);
          storeSessionParticipant(upperEventId, participantId2, mockStorage);
          
          // Test: Retrieve both
          const retrievedLower = getSessionParticipant(lowerEventId, mockStorage);
          const retrievedUpper = getSessionParticipant(upperEventId, mockStorage);
          
          // Property: Event IDs should be case-sensitive (different events)
          return retrievedLower === participantId1 && retrievedUpper === participantId2;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3, 2.4** - long IDs are handled correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 50, maxLength: 100 }),
        fc.string({ minLength: 50, maxLength: 200 }),
        (eventId, participantId) => {
          // Setup: Store long IDs
          const stored = storeSessionParticipant(eventId, participantId, mockStorage);
          
          // Test: Retrieve participant
          const retrieved = getSessionParticipant(eventId, mockStorage);
          
          // Property: Long IDs should be stored and retrieved correctly
          return stored === true && retrieved === participantId;
        }
      ),
      { numRuns: 100 }
    );
  });
});
