/**
 * Property-Based Test for Creation After Deletion
 * Feature: event-creation-limit
 * 
 * Property 11: Creation After Deletion
 * **Validates: Requirements 5.2**
 * 
 * For any user at the 3-event limit, after deleting one event, the Security Rules
 * should allow creation of a new event.
 */

import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest';
import fc from 'fast-check';

// Mock Firebase database for testing security rules
let mockDatabase;
let mockAuth;

beforeEach(() => {
  // Initialize mock database with events
  mockDatabase = {
    events: {}
  };
  
  // Mock authentication
  mockAuth = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Simulate Firebase Security Rules evaluation for event creation
 * This mimics the actual rule logic from firebase-security-rules.json
 */
function evaluateSecurityRule(auth, eventId, newData, existingData, database) {
  // Rule: "(auth != null && ((!data.exists() && root.child('events').orderByChild('creatorId').equalTo(auth.uid).once('value').numChildren() < 3) || (data.exists() && data.child('creatorId').val() === auth.uid))) || $eventId === 'freeplay'"
  
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
    // Count events by this creator
    const userEventCount = Object.values(database.events).filter(
      event => event && event.creatorId === auth.uid
    ).length;
    
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

describe('Property 11: Creation After Deletion', () => {
  test('should allow creation after deleting one event from limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate which event to delete (0, 1, or 2)
        fc.integer({ min: 0, max: 2 }),
        // Generate new event data
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
        }),
        async (userId, deleteIndex, { eventId, title, pin }) => {
          // Setup: Create user with exactly 3 events (at limit)
          mockDatabase.events = {};
          const eventIds = [];
          
          for (let i = 0; i < 3; i++) {
            const id = `event-${i}`;
            eventIds.push(id);
            mockDatabase.events[id] = generateEvent(userId, i);
          }
          
          mockAuth = { uid: userId };
          
          // Verify user is at limit before deletion
          const beforeDeletionResult = evaluateSecurityRule(
            mockAuth,
            'test-event-before',
            {
              title: 'Test Event',
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            },
            null,
            mockDatabase
          );
          
          // Should be denied before deletion
          if (beforeDeletionResult.allowed) {
            return false;
          }
          
          // Action: Delete one event
          deleteEvent(mockDatabase, eventIds[deleteIndex]);
          
          // Verify count is now 2
          const currentCount = Object.values(mockDatabase.events).filter(
            event => event && event.creatorId === userId
          ).length;
          
          if (currentCount !== 2) {
            return false;
          }
          
          // Action: Attempt to create new event after deletion
          const newEventData = {
            title,
            pin,
            creatorId: userId,
            createdAt: new Date().toISOString()
          };
          
          const afterDeletionResult = evaluateSecurityRule(
            mockAuth,
            eventId,
            newEventData,
            null,
            mockDatabase
          );
          
          // Property: Should allow creation after deletion brings count below 3
          return afterDeletionResult.allowed === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should allow creation after deleting multiple events from limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate how many events to delete (1 or 2)
        fc.integer({ min: 1, max: 2 }),
        // Generate new event data
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
        }),
        async (userId, deleteCount, { eventId, title, pin }) => {
          // Setup: Create user with exactly 3 events (at limit)
          mockDatabase.events = {};
          const eventIds = [];
          
          for (let i = 0; i < 3; i++) {
            const id = `event-${i}`;
            eventIds.push(id);
            mockDatabase.events[id] = generateEvent(userId, i);
          }
          
          mockAuth = { uid: userId };
          
          // Action: Delete specified number of events
          for (let i = 0; i < deleteCount; i++) {
            deleteEvent(mockDatabase, eventIds[i]);
          }
          
          // Verify count decreased correctly
          const currentCount = Object.values(mockDatabase.events).filter(
            event => event && event.creatorId === userId
          ).length;
          
          if (currentCount !== 3 - deleteCount) {
            return false;
          }
          
          // Action: Attempt to create new event
          const newEventData = {
            title,
            pin,
            creatorId: userId,
            createdAt: new Date().toISOString()
          };
          
          const result = evaluateSecurityRule(
            mockAuth,
            eventId,
            newEventData,
            null,
            mockDatabase
          );
          
          // Property: Should allow creation after any deletion from limit
          return result.allowed === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should allow creation after deletion even with other users at limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs
        fc.tuple(
          fc.string({ minLength: 10, maxLength: 30 }),
          fc.string({ minLength: 10, maxLength: 30 })
        ).filter(([uid1, uid2]) => uid1 !== uid2),
        // Generate which event to delete for user1
        fc.integer({ min: 0, max: 2 }),
        async ([userId1, userId2], deleteIndex) => {
          // Setup: Both users at limit (3 events each)
          mockDatabase.events = {};
          const user1EventIds = [];
          
          for (let i = 0; i < 3; i++) {
            const id = `user1-event-${i}`;
            user1EventIds.push(id);
            mockDatabase.events[id] = generateEvent(userId1, i);
          }
          
          for (let i = 0; i < 3; i++) {
            mockDatabase.events[`user2-event-${i}`] = generateEvent(userId2, i);
          }
          
          // Action: User1 deletes one event
          mockAuth = { uid: userId1 };
          deleteEvent(mockDatabase, user1EventIds[deleteIndex]);
          
          // Action: User1 attempts to create new event
          const result1 = evaluateSecurityRule(
            mockAuth,
            'user1-new-event',
            {
              title: 'New Event',
              pin: '123456',
              creatorId: userId1,
              createdAt: new Date().toISOString()
            },
            null,
            mockDatabase
          );
          
          // Action: User2 attempts to create new event (still at limit)
          mockAuth = { uid: userId2 };
          const result2 = evaluateSecurityRule(
            mockAuth,
            'user2-new-event',
            {
              title: 'New Event',
              pin: '123456',
              creatorId: userId2,
              createdAt: new Date().toISOString()
            },
            null,
            mockDatabase
          );
          
          // Property: User1 should be allowed, User2 should be denied
          return result1.allowed === true && result2.allowed === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle deletion and creation cycle correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate number of cycles (1-3)
        fc.integer({ min: 1, max: 3 }),
        async (userId, cycles) => {
          // Setup: Create user with exactly 3 events (at limit)
          mockDatabase.events = {};
          let eventCounter = 0;
          
          for (let i = 0; i < 3; i++) {
            mockDatabase.events[`event-${eventCounter++}`] = generateEvent(userId, i);
          }
          
          mockAuth = { uid: userId };
          
          // Action: Perform multiple delete-create cycles
          for (let cycle = 0; cycle < cycles; cycle++) {
            // Get current event IDs
            const currentEventIds = Object.keys(mockDatabase.events).filter(
              id => mockDatabase.events[id].creatorId === userId
            );
            
            // Should have 3 events at start of each cycle
            if (currentEventIds.length !== 3) {
              return false;
            }
            
            // Delete first event
            deleteEvent(mockDatabase, currentEventIds[0]);
            
            // Should now have 2 events
            const countAfterDelete = Object.values(mockDatabase.events).filter(
              event => event && event.creatorId === userId
            ).length;
            
            if (countAfterDelete !== 2) {
              return false;
            }
            
            // Create new event
            const newEventId = `event-${eventCounter++}`;
            const createResult = evaluateSecurityRule(
              mockAuth,
              newEventId,
              generateEvent(userId, cycle),
              null,
              mockDatabase
            );
            
            // Should be allowed
            if (!createResult.allowed) {
              return false;
            }
            
            // Actually add the event to database
            mockDatabase.events[newEventId] = generateEvent(userId, cycle);
          }
          
          // Property: After all cycles, should still have exactly 3 events
          const finalCount = Object.values(mockDatabase.events).filter(
            event => event && event.creatorId === userId
          ).length;
          
          return finalCount === 3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should allow creation immediately after deletion without delay', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          // Setup: Create user with exactly 3 events
          mockDatabase.events = {};
          const eventIds = ['event-0', 'event-1', 'event-2'];
          
          for (let i = 0; i < 3; i++) {
            mockDatabase.events[eventIds[i]] = generateEvent(userId, i);
          }
          
          mockAuth = { uid: userId };
          
          // Action: Delete and immediately create in same "transaction"
          deleteEvent(mockDatabase, eventIds[0]);
          
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
          
          // Property: Should allow creation immediately after deletion
          return result.allowed === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should not allow creation if deletion brings count to 3 (not below)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          // Setup: Create user with 4 events (hypothetically, if they somehow got there)
          mockDatabase.events = {};
          
          for (let i = 0; i < 4; i++) {
            mockDatabase.events[`event-${i}`] = generateEvent(userId, i);
          }
          
          mockAuth = { uid: userId };
          
          // Action: Delete one event (brings count to 3)
          deleteEvent(mockDatabase, 'event-0');
          
          // Verify count is now 3
          const currentCount = Object.values(mockDatabase.events).filter(
            event => event && event.creatorId === userId
          ).length;
          
          if (currentCount !== 3) {
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
          
          // Property: Should still be denied at exactly 3 events
          return result.allowed === false && result.reason === 'quota exceeded';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle deletion of non-existent event gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          // Setup: Create user with exactly 3 events
          mockDatabase.events = {};
          
          for (let i = 0; i < 3; i++) {
            mockDatabase.events[`event-${i}`] = generateEvent(userId, i);
          }
          
          mockAuth = { uid: userId };
          
          // Action: Attempt to delete non-existent event
          deleteEvent(mockDatabase, 'non-existent-event');
          
          // Count should still be 3
          const currentCount = Object.values(mockDatabase.events).filter(
            event => event && event.creatorId === userId
          ).length;
          
          if (currentCount !== 3) {
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
          
          // Property: Should still be denied since count is still 3
          return result.allowed === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should allow creation after deleting any of the 3 events', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Test deleting each of the 3 events
        fc.integer({ min: 0, max: 2 }),
        async (userId, deleteIndex) => {
          // Setup: Create user with exactly 3 events
          mockDatabase.events = {};
          const eventIds = ['event-0', 'event-1', 'event-2'];
          
          for (let i = 0; i < 3; i++) {
            mockDatabase.events[eventIds[i]] = generateEvent(userId, i);
          }
          
          mockAuth = { uid: userId };
          
          // Action: Delete the specified event
          deleteEvent(mockDatabase, eventIds[deleteIndex]);
          
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
          
          // Property: Should allow creation regardless of which event was deleted
          return result.allowed === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
