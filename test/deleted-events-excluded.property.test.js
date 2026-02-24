/**
 * Property-Based Test for Deleted Events Excluded from Count
 * Feature: event-creation-limit
 * 
 * Property 12: Deleted Events Excluded from Count
 * **Validates: Requirements 5.5**
 * 
 * For any user's event count calculation, events that have been deleted from the
 * database should not be included in the count.
 */

import { describe, test, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock Firebase database
let mockDatabase;
let mockAuth;

beforeEach(() => {
  mockDatabase = {
    events: {}
  };
  mockAuth = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Count events by creator ID (simulates Firebase query)
 * Mimics: root.child('events').orderByChild('creatorId').equalTo(auth.uid).once('value').numChildren()
 */
function countEventsByCreator(database, creatorId) {
  return Object.values(database.events).filter(
    event => event && event.creatorId === creatorId
  ).length;
}

/**
 * Simulate Firebase Security Rules evaluation for event creation
 */
function evaluateSecurityRule(auth, eventId, newData, existingData, database) {
  // Special case: freeplay event
  if (eventId === 'freeplay') {
    return { allowed: true, reason: 'freeplay exception' };
  }
  
  // Check authentication
  if (!auth || !auth.uid) {
    return { allowed: false, reason: 'not authenticated' };
  }
  
  // Case 1: New event creation (data doesn't exist)
  if (!existingData) {
    // Count events by this creator (only existing events in database)
    const userEventCount = countEventsByCreator(database, auth.uid);
    
    // Allow if count < 3
    if (userEventCount < 3) {
      return { allowed: true, reason: 'quota available' };
    } else {
      return { allowed: false, reason: 'quota exceeded' };
    }
  }
  
  // Case 2: Updating existing event
  if (existingData && existingData.creatorId === auth.uid) {
    return { allowed: true, reason: 'updating own event' };
  }
  
  return { allowed: false, reason: 'not authorized' };
}

/**
 * Simulate event deletion
 */
function deleteEvent(database, eventId) {
  delete database.events[eventId];
}

/**
 * Generate a random event object
 */
function generateEvent(creatorId, index) {
  return {
    title: `Event ${index}`,
    pin: String(Math.floor(100000 + Math.random() * 900000)),
    creatorId: creatorId,
    createdAt: new Date().toISOString(),
    participants: [],
    disabledQuestions: []
  };
}

describe('Property 12: Deleted Events Excluded from Count', () => {
  test('should not count deleted events in user event count', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial event count (1-5)
        fc.integer({ min: 1, max: 5 }),
        // Generate number of events to delete (1 to all)
        fc.integer({ min: 1, max: 5 }),
        async (userId, initialCount, deleteCount) => {
          // Ensure we don't try to delete more events than exist
          const actualDeleteCount = Math.min(deleteCount, initialCount);
          
          // Setup: Create initial events for user
          mockDatabase.events = {};
          const eventIds = [];
          
          for (let i = 0; i < initialCount; i++) {
            const eventId = `event-${i}`;
            eventIds.push(eventId);
            mockDatabase.events[eventId] = generateEvent(userId, i);
          }
          
          // Verify initial count
          const initialCountResult = countEventsByCreator(mockDatabase, userId);
          if (initialCountResult !== initialCount) {
            return false;
          }
          
          // Action: Delete specified number of events
          for (let i = 0; i < actualDeleteCount; i++) {
            deleteEvent(mockDatabase, eventIds[i]);
          }
          
          // Action: Count events after deletion
          const countAfterDeletion = countEventsByCreator(mockDatabase, userId);
          
          // Property: Count should equal initial count minus deleted count
          // Deleted events should not be included
          return countAfterDeletion === (initialCount - actualDeleteCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should allow creation when deleted events bring count below 3', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial count at or above limit (3-5)
        fc.integer({ min: 3, max: 5 }),
        // Generate how many to delete (at least 1)
        fc.integer({ min: 1, max: 3 }),
        async (userId, initialCount, deleteCount) => {
          // Setup: Create initial events
          mockDatabase.events = {};
          const eventIds = [];
          
          for (let i = 0; i < initialCount; i++) {
            const eventId = `event-${i}`;
            eventIds.push(eventId);
            mockDatabase.events[eventId] = generateEvent(userId, i);
          }
          
          mockAuth = { uid: userId };
          
          // Action: Delete events
          for (let i = 0; i < deleteCount; i++) {
            deleteEvent(mockDatabase, eventIds[i]);
          }
          
          // Calculate remaining count
          const remainingCount = initialCount - deleteCount;
          
          // Action: Attempt to create new event
          const result = evaluateSecurityRule(
            mockAuth,
            'new-event',
            {
              title: 'New Event',
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            },
            null,
            mockDatabase
          );
          
          // Property: Should allow creation iff remaining count < 3
          // Deleted events should not count toward quota
          const expectedAllowed = remainingCount < 3;
          return result.allowed === expectedAllowed;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should not count deleted events even if they existed previously', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate number of events to create and delete (1-3)
        fc.integer({ min: 1, max: 3 }),
        async (userId, cycleCount) => {
          // Setup: Start with empty database
          mockDatabase.events = {};
          mockAuth = { uid: userId };
          
          let currentCount = 0;
          
          // Action: Create and delete events in cycles
          for (let i = 0; i < cycleCount; i++) {
            const eventId = `event-${i}`;
            
            // Create event
            mockDatabase.events[eventId] = generateEvent(userId, i);
            currentCount++;
            
            // Verify it's counted
            const countWithEvent = countEventsByCreator(mockDatabase, userId);
            if (countWithEvent !== currentCount) {
              return false;
            }
            
            // Delete event
            deleteEvent(mockDatabase, eventId);
            currentCount--;
            
            // Verify it's no longer counted
            const countAfterDelete = countEventsByCreator(mockDatabase, userId);
            if (countAfterDelete !== currentCount) {
              return false;
            }
          }
          
          // Property: After all cycles, count should be 0
          // All deleted events should be excluded
          const finalCount = countEventsByCreator(mockDatabase, userId);
          return finalCount === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should only count existing events, not deleted ones, for quota enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate number of events to create (4-6, more than quota)
        fc.integer({ min: 4, max: 6 }),
        // Generate number to keep (0-2, below quota)
        fc.integer({ min: 0, max: 2 }),
        async (userId, totalCreated, keepCount) => {
          // Setup: Simulate scenario where user created many events over time
          // but deleted most of them
          mockDatabase.events = {};
          const eventIds = [];
          
          // Create all events
          for (let i = 0; i < totalCreated; i++) {
            eventIds.push(`event-${i}`);
          }
          
          // Only keep specified number in database (others are "deleted")
          for (let i = 0; i < keepCount; i++) {
            mockDatabase.events[eventIds[i]] = generateEvent(userId, i);
          }
          
          mockAuth = { uid: userId };
          
          // Action: Count events
          const count = countEventsByCreator(mockDatabase, userId);
          
          // Verify count matches only existing events
          if (count !== keepCount) {
            return false;
          }
          
          // Action: Attempt to create new event
          const result = evaluateSecurityRule(
            mockAuth,
            'new-event',
            {
              title: 'New Event',
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            },
            null,
            mockDatabase
          );
          
          // Property: Should allow creation based only on existing events
          // Deleted events should not count toward quota
          const expectedAllowed = keepCount < 3;
          return result.allowed === expectedAllowed;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle partial deletion correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate which events to delete (array of indices)
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 3 })
          .map(arr => [...new Set(arr)]), // Remove duplicates
        async (userId, deleteIndices) => {
          // Setup: Create 5 events
          mockDatabase.events = {};
          const totalEvents = 5;
          
          for (let i = 0; i < totalEvents; i++) {
            mockDatabase.events[`event-${i}`] = generateEvent(userId, i);
          }
          
          // Action: Delete specified events
          deleteIndices.forEach(index => {
            if (index < totalEvents) {
              deleteEvent(mockDatabase, `event-${index}`);
            }
          });
          
          // Calculate expected count
          const validDeleteIndices = deleteIndices.filter(i => i < totalEvents);
          const expectedCount = totalEvents - validDeleteIndices.length;
          
          // Action: Count events
          const actualCount = countEventsByCreator(mockDatabase, userId);
          
          // Property: Count should only include non-deleted events
          return actualCount === expectedCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should not count deleted events from other users', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs
        fc.tuple(
          fc.string({ minLength: 10, maxLength: 30 }),
          fc.string({ minLength: 10, maxLength: 30 })
        ).filter(([uid1, uid2]) => uid1 !== uid2),
        // Generate event counts for each user
        fc.tuple(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 })
        ),
        async ([userId1, userId2], [count1, count2]) => {
          // Setup: Create events for both users
          mockDatabase.events = {};
          
          for (let i = 0; i < count1; i++) {
            mockDatabase.events[`user1-event-${i}`] = generateEvent(userId1, i);
          }
          
          for (let i = 0; i < count2; i++) {
            mockDatabase.events[`user2-event-${i}`] = generateEvent(userId2, i);
          }
          
          // Action: Delete all of user2's events
          for (let i = 0; i < count2; i++) {
            deleteEvent(mockDatabase, `user2-event-${i}`);
          }
          
          // Action: Count events for user1
          const count1After = countEventsByCreator(mockDatabase, userId1);
          
          // Action: Count events for user2
          const count2After = countEventsByCreator(mockDatabase, userId2);
          
          // Property: User1's count should be unchanged, user2's should be 0
          // Deleted events from user2 should not affect user1's count
          return count1After === count1 && count2After === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle deletion of non-existent events gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate number of actual events
        fc.integer({ min: 1, max: 3 }),
        async (userId, actualCount) => {
          // Setup: Create actual events
          mockDatabase.events = {};
          
          for (let i = 0; i < actualCount; i++) {
            mockDatabase.events[`event-${i}`] = generateEvent(userId, i);
          }
          
          // Action: Attempt to delete non-existent events
          deleteEvent(mockDatabase, 'non-existent-1');
          deleteEvent(mockDatabase, 'non-existent-2');
          
          // Action: Count events
          const count = countEventsByCreator(mockDatabase, userId);
          
          // Property: Count should still equal actual count
          // Deleting non-existent events should not affect count
          return count === actualCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should reflect deletion immediately in count', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial count
        fc.integer({ min: 1, max: 5 }),
        // Generate which event to delete
        fc.integer({ min: 0, max: 4 }),
        async (userId, initialCount, deleteIndex) => {
          // Only proceed if deleteIndex is valid
          if (deleteIndex >= initialCount) {
            return true;
          }
          
          // Setup: Create events
          mockDatabase.events = {};
          
          for (let i = 0; i < initialCount; i++) {
            mockDatabase.events[`event-${i}`] = generateEvent(userId, i);
          }
          
          // Count before deletion
          const countBefore = countEventsByCreator(mockDatabase, userId);
          
          // Action: Delete one event
          deleteEvent(mockDatabase, `event-${deleteIndex}`);
          
          // Count immediately after deletion
          const countAfter = countEventsByCreator(mockDatabase, userId);
          
          // Property: Count should decrease by 1 immediately
          // Deleted event should be excluded from count right away
          return countBefore === initialCount && countAfter === initialCount - 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle complete deletion of all events', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial count
        fc.integer({ min: 1, max: 5 }),
        async (userId, initialCount) => {
          // Setup: Create events
          mockDatabase.events = {};
          
          for (let i = 0; i < initialCount; i++) {
            mockDatabase.events[`event-${i}`] = generateEvent(userId, i);
          }
          
          // Action: Delete all events
          for (let i = 0; i < initialCount; i++) {
            deleteEvent(mockDatabase, `event-${i}`);
          }
          
          // Action: Count events
          const count = countEventsByCreator(mockDatabase, userId);
          
          // Property: Count should be 0 after deleting all events
          return count === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should allow creation after deleting all events', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial count (including over quota)
        fc.integer({ min: 3, max: 5 }),
        async (userId) => {
          // Setup: Create events at or above quota
          mockDatabase.events = {};
          
          for (let i = 0; i < 5; i++) {
            mockDatabase.events[`event-${i}`] = generateEvent(userId, i);
          }
          
          mockAuth = { uid: userId };
          
          // Verify creation is blocked
          const resultBefore = evaluateSecurityRule(
            mockAuth,
            'test-event',
            {
              title: 'Test',
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            },
            null,
            mockDatabase
          );
          
          if (resultBefore.allowed) {
            return false;
          }
          
          // Action: Delete all events
          for (let i = 0; i < 5; i++) {
            deleteEvent(mockDatabase, `event-${i}`);
          }
          
          // Action: Attempt to create new event
          const resultAfter = evaluateSecurityRule(
            mockAuth,
            'new-event',
            {
              title: 'New Event',
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            },
            null,
            mockDatabase
          );
          
          // Property: Should allow creation after deleting all events
          // No deleted events should count toward quota
          return resultAfter.allowed === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
