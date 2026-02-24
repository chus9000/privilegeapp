/**
 * Property-Based Test for Concurrent Creation Atomicity
 * Feature: event-creation-limit
 * 
 * Property 3: Concurrent Creation Atomicity
 * **Validates: Requirements 2.1, 2.2**
 * 
 * For any set of concurrent event creation requests from the same user, each request
 * should be evaluated independently at write time, and the total number of successfully
 * created events should not exceed 3.
 */

import { describe, test, beforeEach, expect } from 'vitest';
import fc from 'fast-check';

// Mock Firebase database for testing concurrent operations
let mockDatabase;

beforeEach(() => {
  mockDatabase = {
    events: {}
  };
});

/**
 * Simulate Firebase Security Rules evaluation for event creation
 * This mimics the actual rule logic with atomic evaluation
 */
function evaluateSecurityRuleAtomic(auth, eventId, newData, database) {
  if (!auth || !auth.uid) {
    return { allowed: false, reason: 'not authenticated' };
  }
  
  // Special case: freeplay event
  if (eventId === 'freeplay') {
    return { allowed: true, reason: 'freeplay exception' };
  }
  
  // Check if event already exists
  if (database.events[eventId]) {
    if (database.events[eventId].creatorId === auth.uid) {
      return { allowed: true, reason: 'updating own event' };
    }
    return { allowed: false, reason: 'not authorized' };
  }
  
  // New event creation - count events atomically
  const userEventCount = Object.values(database.events).filter(
    event => event && event.creatorId === auth.uid
  ).length;
  
  if (userEventCount < 3) {
    return { allowed: true, reason: 'quota available' };
  } else {
    return { allowed: false, reason: 'quota exceeded' };
  }
}

/**
 * Simulate concurrent event creation with atomic rule evaluation
 */
async function simulateConcurrentCreation(auth, eventIds, database) {
  const results = [];
  
  // Process each creation request sequentially (simulating Firebase's atomic processing)
  for (const eventId of eventIds) {
    const newEventData = {
      title: `Event ${eventId}`,
      pin: '123456',
      creatorId: auth.uid,
      createdAt: new Date().toISOString()
    };
    
    // Evaluate security rule atomically
    const evaluation = evaluateSecurityRuleAtomic(auth, eventId, newEventData, database);
    
    if (evaluation.allowed) {
      database.events[eventId] = newEventData;
      results.push({ eventId, success: true, reason: evaluation.reason });
    } else {
      results.push({ eventId, success: false, reason: evaluation.reason });
    }
  }
  
  return results;
}

describe('Property 3: Concurrent Creation Atomicity', () => {
  test('total successfully created events never exceeds 3 regardless of concurrent attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial event count (0-3)
        fc.integer({ min: 0, max: 3 }),
        // Generate number of concurrent attempts (1-20)
        fc.integer({ min: 1, max: 20 }),
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (initialCount, attemptCount, userId) => {
          // Setup: Create user with initialCount events
          mockDatabase.events = {};
          for (let i = 0; i < initialCount; i++) {
            mockDatabase.events[`event-${i}`] = {
              title: `Event ${i}`,
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            };
          }
          
          const auth = { uid: userId };
          
          // Action: Simulate concurrent creation attempts
          const eventIds = Array.from({ length: attemptCount }, (_, i) => `new-event-${i}`);
          const results = await simulateConcurrentCreation(auth, eventIds, mockDatabase);
          
          // Property: Total events should never exceed 3
          const totalEvents = Object.values(mockDatabase.events).filter(
            e => e.creatorId === userId
          ).length;
          
          // Verify that the number of successful creations is correct
          const expectedSuccesses = Math.min(attemptCount, Math.max(0, 3 - initialCount));
          const actualSuccesses = results.filter(r => r.success).length;
          
          return totalEvents <= 3 && 
                 totalEvents === (initialCount + actualSuccesses) &&
                 actualSuccesses === expectedSuccesses;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('each request is evaluated independently at write time', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial event count (0-2, below quota)
        fc.integer({ min: 0, max: 2 }),
        // Generate number of concurrent attempts (2-10)
        fc.integer({ min: 2, max: 10 }),
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (initialCount, attemptCount, userId) => {
          // Setup: Create user with initialCount events
          mockDatabase.events = {};
          for (let i = 0; i < initialCount; i++) {
            mockDatabase.events[`event-${i}`] = {
              title: `Event ${i}`,
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            };
          }
          
          const auth = { uid: userId };
          
          // Action: Simulate concurrent creation attempts
          const eventIds = Array.from({ length: attemptCount }, (_, i) => `new-event-${i}`);
          const results = await simulateConcurrentCreation(auth, eventIds, mockDatabase);
          
          // Property: Requests should succeed until quota is reached, then fail
          const successCount = results.filter(r => r.success).length;
          const failCount = results.filter(r => !r.success).length;
          
          const expectedSuccesses = Math.min(attemptCount, 3 - initialCount);
          const expectedFailures = Math.max(0, attemptCount - expectedSuccesses);
          
          // Verify the split between success and failure
          return successCount === expectedSuccesses && 
                 failCount === expectedFailures &&
                 // Verify all failures are due to quota
                 results.filter(r => !r.success).every(r => r.reason === 'quota exceeded');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('concurrent requests from different users are independent', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs
        fc.tuple(
          fc.string({ minLength: 10, maxLength: 30 }),
          fc.string({ minLength: 10, maxLength: 30 })
        ).filter(([uid1, uid2]) => uid1 !== uid2),
        // Generate initial counts for each user
        fc.tuple(
          fc.integer({ min: 0, max: 3 }),
          fc.integer({ min: 0, max: 3 })
        ),
        // Generate attempt counts for each user
        fc.tuple(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 })
        ),
        async ([userId1, userId2], [initialCount1, initialCount2], [attemptCount1, attemptCount2]) => {
          // Setup: Create events for both users
          mockDatabase.events = {};
          
          for (let i = 0; i < initialCount1; i++) {
            mockDatabase.events[`user1-event-${i}`] = {
              title: `User1 Event ${i}`,
              pin: '123456',
              creatorId: userId1,
              createdAt: new Date().toISOString()
            };
          }
          
          for (let i = 0; i < initialCount2; i++) {
            mockDatabase.events[`user2-event-${i}`] = {
              title: `User2 Event ${i}`,
              pin: '123456',
              creatorId: userId2,
              createdAt: new Date().toISOString()
            };
          }
          
          // Action: Both users attempt concurrent creation
          const auth1 = { uid: userId1 };
          const auth2 = { uid: userId2 };
          
          const eventIds1 = Array.from({ length: attemptCount1 }, (_, i) => `user1-new-${i}`);
          const eventIds2 = Array.from({ length: attemptCount2 }, (_, i) => `user2-new-${i}`);
          
          await simulateConcurrentCreation(auth1, eventIds1, mockDatabase);
          await simulateConcurrentCreation(auth2, eventIds2, mockDatabase);
          
          // Property: Each user's quota should be independent
          const user1Events = Object.values(mockDatabase.events).filter(
            e => e.creatorId === userId1
          ).length;
          const user2Events = Object.values(mockDatabase.events).filter(
            e => e.creatorId === userId2
          ).length;
          
          return user1Events <= 3 && user2Events <= 3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('atomicity prevents race conditions at quota boundary', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate number of concurrent attempts at boundary (2-10)
        fc.integer({ min: 2, max: 10 }),
        async (userId, attemptCount) => {
          // Setup: User with exactly 2 events (one below quota)
          mockDatabase.events = {
            'event-1': {
              title: 'Event 1',
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            },
            'event-2': {
              title: 'Event 2',
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            }
          };
          
          const auth = { uid: userId };
          
          // Action: Simulate concurrent creation attempts at boundary
          const eventIds = Array.from({ length: attemptCount }, (_, i) => `boundary-event-${i}`);
          const results = await simulateConcurrentCreation(auth, eventIds, mockDatabase);
          
          // Property: Exactly 1 should succeed, rest should fail
          const successCount = results.filter(r => r.success).length;
          const totalEvents = Object.values(mockDatabase.events).filter(
            e => e.creatorId === userId
          ).length;
          
          return successCount === 1 && totalEvents === 3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('no partial writes occur - database remains consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial event count
        fc.integer({ min: 0, max: 3 }),
        // Generate concurrent attempts
        fc.integer({ min: 1, max: 15 }),
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (initialCount, attemptCount, userId) => {
          // Setup
          mockDatabase.events = {};
          for (let i = 0; i < initialCount; i++) {
            mockDatabase.events[`event-${i}`] = {
              title: `Event ${i}`,
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            };
          }
          
          const auth = { uid: userId };
          
          // Action
          const eventIds = Array.from({ length: attemptCount }, (_, i) => `new-event-${i}`);
          const results = await simulateConcurrentCreation(auth, eventIds, mockDatabase);
          
          // Property: Database consistency
          // 1. All successful events are in database
          const successfulEventIds = results.filter(r => r.success).map(r => r.eventId);
          const allSuccessfulInDb = successfulEventIds.every(id => mockDatabase.events[id] !== undefined);
          
          // 2. All failed events are NOT in database
          const failedEventIds = results.filter(r => !r.success).map(r => r.eventId);
          const noFailedInDb = failedEventIds.every(id => mockDatabase.events[id] === undefined);
          
          // 3. Total count is consistent
          const totalEvents = Object.values(mockDatabase.events).filter(
            e => e.creatorId === userId
          ).length;
          const expectedTotal = Math.min(3, initialCount + successfulEventIds.length);
          
          return allSuccessfulInDb && noFailedInDb && totalEvents === expectedTotal;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('requests arriving after quota is reached are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate number of attempts beyond quota (4-15)
        fc.integer({ min: 4, max: 15 }),
        async (userId, totalAttempts) => {
          // Setup: User with 0 events
          mockDatabase.events = {};
          const auth = { uid: userId };
          
          // Action: Attempt to create more than 3 events
          const eventIds = Array.from({ length: totalAttempts }, (_, i) => `event-${i}`);
          const results = await simulateConcurrentCreation(auth, eventIds, mockDatabase);
          
          // Property: First 3 succeed, rest fail
          const successCount = results.filter(r => r.success).length;
          const failCount = results.filter(r => !r.success).length;
          
          // Verify the first 3 succeeded
          const firstThreeResults = results.slice(0, 3);
          const allFirstThreeSucceeded = firstThreeResults.every(r => r.success);
          
          // Verify remaining failed
          const remainingResults = results.slice(3);
          const allRemainingFailed = remainingResults.every(r => !r.success && r.reason === 'quota exceeded');
          
          return successCount === 3 && 
                 failCount === (totalAttempts - 3) &&
                 allFirstThreeSucceeded &&
                 allRemainingFailed;
        }
      ),
      { numRuns: 100 }
    );
  });
});
