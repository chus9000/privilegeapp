/**
 * Property-Based Test for Quota Enforcement at Creation
 * Feature: event-creation-limit
 * 
 * Property 1: Quota Enforcement at Creation
 * **Validates: Requirements 1.1, 1.2**
 * 
 * For any authenticated user with an existing event count, when attempting to create
 * a new event, the Firebase Security Rules should allow the creation if and only if
 * the current event count is less than 3.
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
 * Validate that creatorId matches authenticated user's UID
 */
function validateCreatorId(auth, newCreatorId, existingData) {
  // Rule: creatorId ".validate": "newData.isString()" and ".write": "!data.exists() && auth != null && newData.val() === auth.uid"
  
  if (!auth || !auth.uid) {
    return false;
  }
  
  if (existingData) {
    // Cannot modify existing creatorId
    return false;
  }
  
  // CreatorId must match authenticated user's UID
  return newCreatorId === auth.uid;
}

describe('Property 1: Quota Enforcement at Creation', () => {
  test('should allow event creation when user has fewer than 3 events', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count from 0 to 2 (below quota)
        fc.integer({ min: 0, max: 2 }),
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate new event data
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
        }),
        async (existingEventCount, userId, { eventId, title, pin }) => {
          // Setup: Create user with existingEventCount events
          mockDatabase.events = {};
          for (let i = 0; i < existingEventCount; i++) {
            mockDatabase.events[`event-${i}`] = {
              title: `Event ${i}`,
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            };
          }
          
          mockAuth = { uid: userId };
          
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
            null, // No existing data (new event)
            mockDatabase
          );
          
          // Property: Should allow creation when count < 3
          return result.allowed === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should deny event creation when user has 3 or more events', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count from 3 to 5 (at or above quota)
        fc.integer({ min: 3, max: 5 }),
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate new event data
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
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
          
          mockAuth = { uid: userId };
          
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
            null, // No existing data (new event)
            mockDatabase
          );
          
          // Property: Should deny creation when count >= 3
          return result.allowed === false && result.reason === 'quota exceeded';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('quota enforcement should be independent for different users', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs
        fc.tuple(
          fc.string({ minLength: 10, maxLength: 30 }),
          fc.string({ minLength: 10, maxLength: 30 })
        ).filter(([uid1, uid2]) => uid1 !== uid2),
        // Generate event counts for each user
        fc.tuple(
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 })
        ),
        async ([userId1, userId2], [count1, count2]) => {
          // Setup: Create events for both users
          mockDatabase.events = {};
          
          for (let i = 0; i < count1; i++) {
            mockDatabase.events[`user1-event-${i}`] = {
              title: `User1 Event ${i}`,
              pin: '123456',
              creatorId: userId1,
              createdAt: new Date().toISOString()
            };
          }
          
          for (let i = 0; i < count2; i++) {
            mockDatabase.events[`user2-event-${i}`] = {
              title: `User2 Event ${i}`,
              pin: '123456',
              creatorId: userId2,
              createdAt: new Date().toISOString()
            };
          }
          
          // Test user1's ability to create
          mockAuth = { uid: userId1 };
          const result1 = evaluateSecurityRule(
            mockAuth,
            'new-event-1',
            { title: 'New Event', pin: '123456', creatorId: userId1 },
            null,
            mockDatabase
          );
          
          // Test user2's ability to create
          mockAuth = { uid: userId2 };
          const result2 = evaluateSecurityRule(
            mockAuth,
            'new-event-2',
            { title: 'New Event', pin: '123456', creatorId: userId2 },
            null,
            mockDatabase
          );
          
          // Property: Each user's quota should be independent
          const expected1 = count1 < 3;
          const expected2 = count2 < 3;
          
          return result1.allowed === expected1 && result2.allowed === expected2;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should allow updating existing events regardless of quota', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count from 0 to 5 (including over quota)
        fc.integer({ min: 0, max: 5 }),
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate event to update
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0)
        }),
        async (existingEventCount, userId, { eventId, title }) => {
          // Setup: Create user with existingEventCount events
          mockDatabase.events = {};
          for (let i = 0; i < existingEventCount; i++) {
            mockDatabase.events[`event-${i}`] = {
              title: `Event ${i}`,
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            };
          }
          
          // Add the event to be updated
          const existingEventData = {
            title: 'Original Title',
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          };
          mockDatabase.events[eventId] = existingEventData;
          
          mockAuth = { uid: userId };
          
          // Action: Attempt to update existing event
          const updatedEventData = {
            ...existingEventData,
            title // Updated title
          };
          
          const result = evaluateSecurityRule(
            mockAuth,
            eventId,
            updatedEventData,
            existingEventData, // Existing data present
            mockDatabase
          );
          
          // Property: Should allow update regardless of quota
          return result.allowed === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should enforce quota at exactly 3 events boundary', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          // Setup: Create user with exactly 3 events
          mockDatabase.events = {};
          for (let i = 0; i < 3; i++) {
            mockDatabase.events[`event-${i}`] = {
              title: `Event ${i}`,
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            };
          }
          
          mockAuth = { uid: userId };
          
          // Action: Attempt to create 4th event
          const result = evaluateSecurityRule(
            mockAuth,
            'event-4',
            {
              title: 'Fourth Event',
              pin: '123456',
              creatorId: userId,
              createdAt: new Date().toISOString()
            },
            null,
            mockDatabase
          );
          
          // Property: Should deny at exactly 3 events
          return result.allowed === false && result.reason === 'quota exceeded';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('freeplay event should bypass quota enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count from 0 to 5 (including over quota)
        fc.integer({ min: 0, max: 5 }),
        // Generate user ID (or null for unauthenticated)
        fc.option(fc.string({ minLength: 10, maxLength: 30 }), { nil: null }),
        async (existingEventCount, userId) => {
          // Setup: Create user with existingEventCount events
          mockDatabase.events = {};
          if (userId) {
            for (let i = 0; i < existingEventCount; i++) {
              mockDatabase.events[`event-${i}`] = {
                title: `Event ${i}`,
                pin: '123456',
                creatorId: userId,
                createdAt: new Date().toISOString()
              };
            }
          }
          
          mockAuth = userId ? { uid: userId } : null;
          
          // Action: Attempt to write to freeplay event
          const result = evaluateSecurityRule(
            mockAuth,
            'freeplay', // Special freeplay event ID
            {
              title: 'Freeplay',
              pin: '000000'
            },
            null,
            mockDatabase
          );
          
          // Property: Freeplay should always be allowed
          return result.allowed === true && result.reason === 'freeplay exception';
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 15: Creator Field Validation', () => {
  test('should validate creatorId matches authenticated user UID', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          mockAuth = { uid: userId };
          
          // Action: Validate creatorId that matches auth.uid
          const isValid = validateCreatorId(mockAuth, userId, null);
          
          // Property: Should be valid when creatorId matches auth.uid
          return isValid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should reject creatorId that does not match authenticated user', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs
        fc.tuple(
          fc.string({ minLength: 10, maxLength: 30 }),
          fc.string({ minLength: 10, maxLength: 30 })
        ).filter(([uid1, uid2]) => uid1 !== uid2),
        async ([authUserId, creatorId]) => {
          mockAuth = { uid: authUserId };
          
          // Action: Validate creatorId that doesn't match auth.uid
          const isValid = validateCreatorId(mockAuth, creatorId, null);
          
          // Property: Should be invalid when creatorId doesn't match auth.uid
          return isValid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should prevent modifying existing creatorId', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          mockAuth = { uid: userId };
          
          // Existing data present
          const existingData = {
            creatorId: userId,
            title: 'Existing Event'
          };
          
          // Action: Attempt to modify creatorId
          const isValid = validateCreatorId(mockAuth, userId, existingData);
          
          // Property: Should be invalid when data already exists
          return isValid === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
