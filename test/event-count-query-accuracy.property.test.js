/**
 * Property-Based Test for Event Count Query Accuracy
 * Feature: event-creation-limit
 * 
 * Property 7: Event Count Query Accuracy
 * **Validates: Requirements 3.4**
 * 
 * For any user with events in the database, querying events where creatorId
 * matches the user's UID should return exactly the events created by that user.
 */

import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest';
import fc from 'fast-check';

// Import QuotaStateManager
const QuotaStateManager = (await import('../app/quota-manager.js')).default;

describe('Property 7: Event Count Query Accuracy', () => {
  let quotaManager;
  let mockFirebaseAPI;

  beforeEach(() => {
    quotaManager = new QuotaStateManager();
    
    // Mock FirebaseAPI
    mockFirebaseAPI = {
      loadEventsByCreator: vi.fn()
    };
    
    // Make FirebaseAPI available globally
    global.window = { FirebaseAPI: mockFirebaseAPI };
    quotaManager.firebaseAPI = mockFirebaseAPI;
  });

  afterEach(() => {
    if (quotaManager) {
      quotaManager.cleanup();
    }
    vi.restoreAllMocks();
  });

  test('getUserEventCount should return exact count of events for a user', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate event count from 0 to 5
        fc.integer({ min: 0, max: 5 }),
        async (userId, eventCount) => {
          // Setup: Create mock events for the user
          const mockEvents = Array.from({ length: eventCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);
          quotaManager.state.userId = userId;

          // Action: Get user event count
          const count = await quotaManager.getUserEventCount();

          // Property: Count should equal number of events
          return count === eventCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('getUserEventCount should only count events for the specific user', async () => {
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
          // Setup: Create mock events for user1
          const user1Events = Array.from({ length: count1 }, (_, i) => ({
            id: `user1-event-${i}`,
            title: `User1 Event ${i}`,
            pin: '123456',
            creatorId: userId1,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(user1Events);
          quotaManager.state.userId = userId1;

          // Action: Get event count for user1
          const user1Count = await quotaManager.getUserEventCount();

          // Setup: Create mock events for user2
          const user2Events = Array.from({ length: count2 }, (_, i) => ({
            id: `user2-event-${i}`,
            title: `User2 Event ${i}`,
            pin: '123456',
            creatorId: userId2,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(user2Events);
          quotaManager.state.userId = userId2;

          // Action: Get event count for user2
          const user2Count = await quotaManager.getUserEventCount();

          // Property: Each user's count should match their event count
          return user1Count === count1 && user2Count === count2;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('getUserEventCount should return 0 for users with no events', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          // Setup: No events for this user
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue([]);
          quotaManager.state.userId = userId;

          // Action: Get user event count
          const count = await quotaManager.getUserEventCount();

          // Property: Count should be 0
          return count === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('getUserEventCount should handle null/undefined responses gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate null or undefined response
        fc.constantFrom(null, undefined),
        async (userId, nullishValue) => {
          // Setup: API returns null or undefined
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(nullishValue);
          quotaManager.state.userId = userId;

          // Action: Get user event count
          const count = await quotaManager.getUserEventCount();

          // Property: Count should be 0 (graceful handling)
          return count === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('getUserEventCount should return 0 when userId is not set', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count (doesn't matter, should return 0)
        fc.integer({ min: 0, max: 5 }),
        async (eventCount) => {
          // Setup: No userId set
          quotaManager.state.userId = null;
          
          const mockEvents = Array.from({ length: eventCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: 'some-user',
            createdAt: new Date().toISOString()
          }));
          
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);

          // Action: Get user event count
          const count = await quotaManager.getUserEventCount();

          // Property: Count should be 0 when no userId
          return count === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('getUserEventCount should handle API errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate error message
        fc.string({ minLength: 5, maxLength: 50 }),
        async (userId, errorMessage) => {
          // Setup: API throws error
          mockFirebaseAPI.loadEventsByCreator.mockRejectedValue(
            new Error(errorMessage)
          );
          quotaManager.state.userId = userId;

          // Action: Get user event count
          const count = await quotaManager.getUserEventCount();

          // Property: Count should be 0 on error (graceful handling)
          return count === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('query should be consistent across multiple calls for same user', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate event count
        fc.integer({ min: 0, max: 5 }),
        async (userId, eventCount) => {
          // Setup: Create mock events
          const mockEvents = Array.from({ length: eventCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);
          quotaManager.state.userId = userId;

          // Action: Get count multiple times
          const count1 = await quotaManager.getUserEventCount();
          const count2 = await quotaManager.getUserEventCount();
          const count3 = await quotaManager.getUserEventCount();

          // Property: All counts should be identical
          return count1 === eventCount && 
                 count2 === eventCount && 
                 count3 === eventCount &&
                 count1 === count2 && 
                 count2 === count3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('updateState should correctly fetch and store event count', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate event count
        fc.integer({ min: 0, max: 5 }),
        async (userId, eventCount) => {
          // Setup: Create mock events
          const mockEvents = Array.from({ length: eventCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);

          // Action: Update state
          await quotaManager.initialize(userId);

          // Property: State should reflect correct event count
          return quotaManager.state.eventCount === eventCount &&
                 quotaManager.state.userId === userId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event count should match array length from API response', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate array of events
        fc.array(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 20 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (userId, events) => {
          // Setup: Add creatorId to all events
          const mockEvents = events.map(event => ({
            ...event,
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);
          quotaManager.state.userId = userId;

          // Action: Get user event count
          const count = await quotaManager.getUserEventCount();

          // Property: Count should equal array length
          return count === mockEvents.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});
