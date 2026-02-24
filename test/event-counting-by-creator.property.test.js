/**
 * Property-Based Test for Correct Event Counting by Creator
 * Feature: event-creation-limit
 * 
 * Property 2: Correct Event Counting by Creator
 * **Validates: Requirements 1.3**
 * 
 * For any database state containing events from multiple users, when calculating
 * the event count for a specific user, the count should include only events where
 * the creatorId field matches that user's UID.
 */

import { describe, test, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock Firebase database
let mockDatabase;

beforeEach(() => {
  mockDatabase = {
    events: {}
  };
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

describe('Property 2: Correct Event Counting by Creator', () => {
  test('should count only events with matching creatorId', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a target user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate number of events for target user (0-5)
        fc.integer({ min: 0, max: 5 }),
        // Generate number of other users (0-5)
        fc.integer({ min: 0, max: 5 }),
        // Generate number of events per other user (0-5)
        fc.integer({ min: 0, max: 5 }),
        async (targetUserId, targetUserEventCount, otherUserCount, eventsPerOtherUser) => {
          // Setup: Create events for target user
          mockDatabase.events = {};
          
          for (let i = 0; i < targetUserEventCount; i++) {
            mockDatabase.events[`target-event-${i}`] = generateEvent(targetUserId, i);
          }
          
          // Create events for other users
          for (let u = 0; u < otherUserCount; u++) {
            const otherUserId = `other-user-${u}`;
            for (let i = 0; i < eventsPerOtherUser; i++) {
              mockDatabase.events[`${otherUserId}-event-${i}`] = generateEvent(otherUserId, i);
            }
          }
          
          // Action: Count events for target user
          const count = countEventsByCreator(mockDatabase, targetUserId);
          
          // Property: Count should equal exactly the number of events created for target user
          return count === targetUserEventCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should return zero for user with no events', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a user ID that has no events
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate other users with events
        fc.array(
          fc.record({
            userId: fc.string({ minLength: 10, maxLength: 30 }),
            eventCount: fc.integer({ min: 1, max: 5 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (targetUserId, otherUsers) => {
          // Ensure target user is not in other users list
          const filteredOtherUsers = otherUsers.filter(u => u.userId !== targetUserId);
          
          // Setup: Create events only for other users
          mockDatabase.events = {};
          
          filteredOtherUsers.forEach((user, userIndex) => {
            for (let i = 0; i < user.eventCount; i++) {
              mockDatabase.events[`user-${userIndex}-event-${i}`] = generateEvent(user.userId, i);
            }
          });
          
          // Action: Count events for target user (who has no events)
          const count = countEventsByCreator(mockDatabase, targetUserId);
          
          // Property: Count should be zero
          return count === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle database with mixed creatorId values', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple users with different event counts
        fc.array(
          fc.record({
            userId: fc.string({ minLength: 10, maxLength: 30 }),
            eventCount: fc.integer({ min: 0, max: 5 })
          }),
          { minLength: 2, maxLength: 10 }
        ).filter(users => {
          // Ensure all user IDs are unique
          const uniqueIds = new Set(users.map(u => u.userId));
          return uniqueIds.size === users.length;
        }),
        async (users) => {
          // Setup: Create events for all users
          mockDatabase.events = {};
          
          users.forEach((user, userIndex) => {
            for (let i = 0; i < user.eventCount; i++) {
              mockDatabase.events[`user-${userIndex}-event-${i}`] = generateEvent(user.userId, i);
            }
          });
          
          // Action: Count events for each user and verify
          const allCountsCorrect = users.every(user => {
            const count = countEventsByCreator(mockDatabase, user.userId);
            return count === user.eventCount;
          });
          
          // Property: Each user's count should match their actual event count
          return allCountsCorrect;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should not count events with null or undefined creatorId', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a target user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate number of events for target user
        fc.integer({ min: 1, max: 5 }),
        // Generate number of events with missing creatorId
        fc.integer({ min: 1, max: 5 }),
        async (targetUserId, targetUserEventCount, malformedEventCount) => {
          // Setup: Create events for target user
          mockDatabase.events = {};
          
          for (let i = 0; i < targetUserEventCount; i++) {
            mockDatabase.events[`target-event-${i}`] = generateEvent(targetUserId, i);
          }
          
          // Add events with null/undefined creatorId
          for (let i = 0; i < malformedEventCount; i++) {
            mockDatabase.events[`malformed-event-${i}`] = {
              title: `Malformed Event ${i}`,
              pin: '123456',
              creatorId: i % 2 === 0 ? null : undefined, // Alternate between null and undefined
              createdAt: new Date().toISOString()
            };
          }
          
          // Action: Count events for target user
          const count = countEventsByCreator(mockDatabase, targetUserId);
          
          // Property: Count should only include events with matching creatorId
          // Should not count null/undefined creatorId events
          return count === targetUserEventCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle empty database', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate any user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          // Setup: Empty database
          mockDatabase.events = {};
          
          // Action: Count events for user
          const count = countEventsByCreator(mockDatabase, userId);
          
          // Property: Count should be zero for empty database
          return count === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should count correctly when user has exactly 3 events', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate other users
        fc.array(
          fc.record({
            userId: fc.string({ minLength: 10, maxLength: 30 }),
            eventCount: fc.integer({ min: 0, max: 5 })
          }),
          { maxLength: 5 }
        ),
        async (targetUserId, otherUsers) => {
          // Ensure target user is not in other users list
          const filteredOtherUsers = otherUsers.filter(u => u.userId !== targetUserId);
          
          // Setup: Create exactly 3 events for target user
          mockDatabase.events = {};
          
          for (let i = 0; i < 3; i++) {
            mockDatabase.events[`target-event-${i}`] = generateEvent(targetUserId, i);
          }
          
          // Add events for other users
          filteredOtherUsers.forEach((user, userIndex) => {
            for (let i = 0; i < user.eventCount; i++) {
              mockDatabase.events[`user-${userIndex}-event-${i}`] = generateEvent(user.userId, i);
            }
          });
          
          // Action: Count events for target user
          const count = countEventsByCreator(mockDatabase, targetUserId);
          
          // Property: Count should be exactly 3
          return count === 3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should be case-sensitive when matching creatorId', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a user ID with mixed case
        fc.string({ minLength: 10, maxLength: 30 })
          .filter(s => s.toLowerCase() !== s && s.toUpperCase() !== s), // Has mixed case
        // Generate event count
        fc.integer({ min: 1, max: 5 }),
        async (userId, eventCount) => {
          // Setup: Create events with exact case match
          mockDatabase.events = {};
          
          for (let i = 0; i < eventCount; i++) {
            mockDatabase.events[`event-${i}`] = generateEvent(userId, i);
          }
          
          // Add events with different case
          const differentCaseUserId = userId.toLowerCase();
          mockDatabase.events['different-case-event'] = generateEvent(differentCaseUserId, 0);
          
          // Action: Count events for original userId
          const count = countEventsByCreator(mockDatabase, userId);
          
          // Property: Should only count exact case matches
          return count === eventCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle special characters in creatorId', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user IDs with special characters (Firebase UIDs can have various chars)
        fc.string({ minLength: 10, maxLength: 30 })
          .map(s => s.replace(/[^a-zA-Z0-9_-]/g, '') || 'user123'), // Firebase-safe characters
        // Generate event count
        fc.integer({ min: 1, max: 5 }),
        async (userId, eventCount) => {
          // Setup: Create events for user
          mockDatabase.events = {};
          
          for (let i = 0; i < eventCount; i++) {
            mockDatabase.events[`event-${i}`] = generateEvent(userId, i);
          }
          
          // Action: Count events
          const count = countEventsByCreator(mockDatabase, userId);
          
          // Property: Should count correctly regardless of special characters
          return count === eventCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('counting should be idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate event count
        fc.integer({ min: 0, max: 5 }),
        async (userId, eventCount) => {
          // Setup: Create events for user
          mockDatabase.events = {};
          
          for (let i = 0; i < eventCount; i++) {
            mockDatabase.events[`event-${i}`] = generateEvent(userId, i);
          }
          
          // Action: Count multiple times
          const count1 = countEventsByCreator(mockDatabase, userId);
          const count2 = countEventsByCreator(mockDatabase, userId);
          const count3 = countEventsByCreator(mockDatabase, userId);
          
          // Property: All counts should be identical (idempotent)
          return count1 === count2 && count2 === count3 && count1 === eventCount;
        }
      ),
      { numRuns: 100 }
    );
  });
});
