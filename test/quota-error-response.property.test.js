/**
 * Property-Based Test for Quota Error Response
 * Feature: event-creation-limit
 * 
 * Property 4: Quota Error Response
 * **Validates: Requirements 2.4**
 * 
 * For any event creation attempt that is rejected due to quota limits, the Firebase
 * Security Rules should return a permission denied error.
 */

import { describe, test, beforeEach, expect } from 'vitest';
import fc from 'fast-check';

// Mock Firebase database for testing
let mockDatabase;

beforeEach(() => {
  mockDatabase = {
    events: {}
  };
});

/**
 * Generate safe event IDs that won't conflict with Object prototype
 */
const safeEventIdArbitrary = fc.uuid().map(uuid => `event-${uuid}`);

/**
 * Simulate Firebase Security Rules evaluation for event creation
 * Returns both the evaluation result and the error type
 */
function evaluateSecurityRuleWithError(auth, eventId, newData, database) {
  if (!auth || !auth.uid) {
    return { 
      allowed: false, 
      error: { code: 'PERMISSION_DENIED', message: 'Permission denied' },
      reason: 'not authenticated' 
    };
  }
  
  // Special case: freeplay event
  if (eventId === 'freeplay') {
    return { allowed: true, error: null, reason: 'freeplay exception' };
  }
  
  // Check if event already exists
  if (database.events[eventId]) {
    if (database.events[eventId].creatorId === auth.uid) {
      return { allowed: true, error: null, reason: 'updating own event' };
    }
    return { 
      allowed: false, 
      error: { code: 'PERMISSION_DENIED', message: 'Permission denied' },
      reason: 'not authorized' 
    };
  }
  
  // New event creation - count events atomically
  const userEventCount = Object.values(database.events).filter(
    event => event && event.creatorId === auth.uid
  ).length;
  
  if (userEventCount < 3) {
    return { allowed: true, error: null, reason: 'quota available' };
  } else {
    return { 
      allowed: false, 
      error: { code: 'PERMISSION_DENIED', message: 'Permission denied' },
      reason: 'quota exceeded' 
    };
  }
}

describe('Property 4: Quota Error Response', () => {
  test('rejected quota requests return PERMISSION_DENIED error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count at or above quota (3-5)
        fc.integer({ min: 3, max: 5 }),
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate new event data
        fc.record({
          eventId: safeEventIdArbitrary,
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
        }),
        async (existingEventCount, userId, { eventId, title, pin }) => {
          // Setup: Create user with existingEventCount events (>= 3)
          mockDatabase.events = {};
          for (let i = 0; i < existingEventCount; i++) {
            mockDatabase.events[`event-${i}`] = {
              title: `Event ${i}`,
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            };
          }
          
          const auth = { uid: userId };
          
          // Action: Attempt to create new event
          const newEventData = {
            title,
            pin,
            creatorId: userId,
            createdAt: new Date().toISOString()
          };
          
          const result = evaluateSecurityRuleWithError(
            auth,
            eventId,
            newEventData,
            mockDatabase
          );
          
          // Property: Should return PERMISSION_DENIED error
          return result.allowed === false && 
                 result.error !== null &&
                 result.error.code === 'PERMISSION_DENIED' &&
                 result.reason === 'quota exceeded';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('successful quota requests do not return errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count below quota (0-2)
        fc.integer({ min: 0, max: 2 }),
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate new event data
        fc.record({
          eventId: safeEventIdArbitrary,
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
        }),
        async (existingEventCount, userId, { eventId, title, pin }) => {
          // Setup: Create user with existingEventCount events (< 3)
          mockDatabase.events = {};
          for (let i = 0; i < existingEventCount; i++) {
            mockDatabase.events[`event-${i}`] = {
              title: `Event ${i}`,
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            };
          }
          
          const auth = { uid: userId };
          
          // Action: Attempt to create new event
          const newEventData = {
            title,
            pin,
            creatorId: userId,
            createdAt: new Date().toISOString()
          };
          
          const result = evaluateSecurityRuleWithError(
            auth,
            eventId,
            newEventData,
            mockDatabase
          );
          
          // Property: Should succeed without error
          return result.allowed === true && result.error === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('error response is consistent across all quota rejections', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate multiple event IDs to attempt
        fc.array(safeEventIdArbitrary, { minLength: 1, maxLength: 10 }),
        async (userId, eventIds) => {
          // Setup: User with 3 events (at quota)
          mockDatabase.events = {
            'event-1': { title: 'Event 1', pin: '123456', creatorId: userId, createdAt: new Date().toISOString() },
            'event-2': { title: 'Event 2', pin: '123456', creatorId: userId, createdAt: new Date().toISOString() },
            'event-3': { title: 'Event 3', pin: '123456', creatorId: userId, createdAt: new Date().toISOString() }
          };
          
          const auth = { uid: userId };
          
          // Action: Attempt to create multiple events
          const results = eventIds.map(eventId => {
            return evaluateSecurityRuleWithError(
              auth,
              eventId,
              { title: 'New Event', pin: '123456', creatorId: userId },
              mockDatabase
            );
          });
          
          // Property: All rejections should have consistent error response
          const allRejected = results.every(r => r.allowed === false);
          const allHaveError = results.every(r => r.error !== null);
          const allPermissionDenied = results.every(r => r.error.code === 'PERMISSION_DENIED');
          const allQuotaExceeded = results.every(r => r.reason === 'quota exceeded');
          
          return allRejected && allHaveError && allPermissionDenied && allQuotaExceeded;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('error response distinguishes quota from other permission errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs
        fc.tuple(
          fc.string({ minLength: 10, maxLength: 30 }),
          fc.string({ minLength: 10, maxLength: 30 })
        ).filter(([uid1, uid2]) => uid1 !== uid2),
        async ([userId1, userId2]) => {
          // Setup: User1 with 3 events, User2 with 0 events
          mockDatabase.events = {
            'event-1': { title: 'Event 1', pin: '123456', creatorId: userId1, createdAt: new Date().toISOString() },
            'event-2': { title: 'Event 2', pin: '123456', creatorId: userId1, createdAt: new Date().toISOString() },
            'event-3': { title: 'Event 3', pin: '123456', creatorId: userId1, createdAt: new Date().toISOString() }
          };
          
          // Test 1: User1 attempts to create (quota exceeded)
          const auth1 = { uid: userId1 };
          const result1 = evaluateSecurityRuleWithError(
            auth1,
            'new-event',
            { title: 'New Event', pin: '123456', creatorId: userId1 },
            mockDatabase
          );
          
          // Test 2: User2 attempts to update User1's event (not authorized)
          const auth2 = { uid: userId2 };
          const result2 = evaluateSecurityRuleWithError(
            auth2,
            'event-1',
            { title: 'Updated Event', pin: '123456', creatorId: userId1 },
            mockDatabase
          );
          
          // Property: Both return PERMISSION_DENIED but with different reasons
          const bothDenied = result1.allowed === false && result2.allowed === false;
          const bothHaveError = result1.error !== null && result2.error !== null;
          const bothPermissionDenied = result1.error.code === 'PERMISSION_DENIED' && 
                                       result2.error.code === 'PERMISSION_DENIED';
          const differentReasons = result1.reason === 'quota exceeded' && 
                                   result2.reason === 'not authorized';
          
          return bothDenied && bothHaveError && bothPermissionDenied && differentReasons;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('unauthenticated requests return PERMISSION_DENIED', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event ID
        safeEventIdArbitrary,
        async (eventId) => {
          // Setup: Empty database
          mockDatabase.events = {};
          
          // Action: Attempt to create event without authentication
          const result = evaluateSecurityRuleWithError(
            null, // No auth
            eventId,
            { title: 'New Event', pin: '123456', creatorId: 'some-user' },
            mockDatabase
          );
          
          // Property: Should return PERMISSION_DENIED
          return result.allowed === false && 
                 result.error !== null &&
                 result.error.code === 'PERMISSION_DENIED' &&
                 result.reason === 'not authenticated';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('error response includes message field', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          // Setup: User with 3 events
          mockDatabase.events = {
            'event-1': { title: 'Event 1', pin: '123456', creatorId: userId, createdAt: new Date().toISOString() },
            'event-2': { title: 'Event 2', pin: '123456', creatorId: userId, createdAt: new Date().toISOString() },
            'event-3': { title: 'Event 3', pin: '123456', creatorId: userId, createdAt: new Date().toISOString() }
          };
          
          const auth = { uid: userId };
          
          // Action: Attempt to create event
          const result = evaluateSecurityRuleWithError(
            auth,
            'event-4',
            { title: 'Event 4', pin: '123456', creatorId: userId },
            mockDatabase
          );
          
          // Property: Error should include message field
          return result.allowed === false && 
                 result.error !== null &&
                 result.error.code === 'PERMISSION_DENIED' &&
                 result.error.message !== undefined &&
                 typeof result.error.message === 'string' &&
                 result.error.message.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('quota boundary exactly at 3 returns error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          // Setup: User with exactly 3 events
          mockDatabase.events = {
            'event-1': { title: 'Event 1', pin: '123456', creatorId: userId, createdAt: new Date().toISOString() },
            'event-2': { title: 'Event 2', pin: '123456', creatorId: userId, createdAt: new Date().toISOString() },
            'event-3': { title: 'Event 3', pin: '123456', creatorId: userId, createdAt: new Date().toISOString() }
          };
          
          const auth = { uid: userId };
          
          // Action: Attempt to create 4th event
          const result = evaluateSecurityRuleWithError(
            auth,
            'event-4',
            { title: 'Event 4', pin: '123456', creatorId: userId },
            mockDatabase
          );
          
          // Property: Should return PERMISSION_DENIED at boundary
          return result.allowed === false && 
                 result.error !== null &&
                 result.error.code === 'PERMISSION_DENIED' &&
                 result.reason === 'quota exceeded';
        }
      ),
      { numRuns: 100 }
    );
  });
});
