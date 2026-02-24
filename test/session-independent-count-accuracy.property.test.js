/**
 * Property-Based Test for Session-Independent Count Accuracy
 * Feature: event-creation-limit
 * 
 * Property 16: Session-Independent Count Accuracy
 * **Validates: Requirements 7.5**
 * 
 * For any user, the event count should be consistent regardless of whether
 * the user has just logged in, has been logged in for a while, or has logged
 * out and back in.
 */

import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest';
import fc from 'fast-check';

// Import QuotaStateManager
const QuotaStateManager = (await import('../app/quota-manager.js')).default;

describe('Property 16: Session-Independent Count Accuracy', () => {
  let mockFirebaseAPI;

  beforeEach(() => {
    // Mock FirebaseAPI
    mockFirebaseAPI = {
      loadEventsByCreator: vi.fn()
    };
    
    // Make FirebaseAPI available globally
    global.window = { FirebaseAPI: mockFirebaseAPI };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('event count should be consistent across fresh initialization', async () => {
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

          // Simulate first session: fresh login
          const quotaManager1 = new QuotaStateManager();
          quotaManager1.firebaseAPI = mockFirebaseAPI;
          await quotaManager1.initialize(userId);
          const count1 = quotaManager1.state.eventCount;
          quotaManager1.cleanup();

          // Simulate second session: another fresh login (logout/login)
          const quotaManager2 = new QuotaStateManager();
          quotaManager2.firebaseAPI = mockFirebaseAPI;
          await quotaManager2.initialize(userId);
          const count2 = quotaManager2.state.eventCount;
          quotaManager2.cleanup();

          // Simulate third session: yet another fresh login
          const quotaManager3 = new QuotaStateManager();
          quotaManager3.firebaseAPI = mockFirebaseAPI;
          await quotaManager3.initialize(userId);
          const count3 = quotaManager3.state.eventCount;
          quotaManager3.cleanup();

          // Property: All counts should be identical and match actual event count
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

  test('event count should be consistent after cleanup and re-initialization', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate event count from 0 to 5
        fc.integer({ min: 0, max: 5 }),
        async (userId, eventCount) => {
          // Setup: Create mock events
          const mockEvents = Array.from({ length: eventCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);

          // First session: initialize and get count
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          await quotaManager.initialize(userId);
          const countBeforeCleanup = quotaManager.state.eventCount;

          // Simulate logout: cleanup
          quotaManager.cleanup();

          // Simulate login again: re-initialize same instance
          await quotaManager.initialize(userId);
          const countAfterCleanup = quotaManager.state.eventCount;

          // Cleanup
          quotaManager.cleanup();

          // Property: Count should be identical before and after cleanup/re-init
          return countBeforeCleanup === eventCount && 
                 countAfterCleanup === eventCount &&
                 countBeforeCleanup === countAfterCleanup;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event count should not be affected by session duration', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate event count from 0 to 5
        fc.integer({ min: 0, max: 5 }),
        // Generate number of state updates (simulating time passing)
        fc.integer({ min: 1, max: 5 }),
        async (userId, eventCount, numUpdates) => {
          // Setup: Create mock events
          const mockEvents = Array.from({ length: eventCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);

          // Initialize quota manager (fresh login)
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          await quotaManager.initialize(userId);
          const initialCount = quotaManager.state.eventCount;

          // Simulate session being active for a while with multiple updates
          const counts = [];
          for (let i = 0; i < numUpdates; i++) {
            await quotaManager.updateState();
            counts.push(quotaManager.state.eventCount);
          }

          // Cleanup
          quotaManager.cleanup();

          // Property: All counts should be identical regardless of session duration
          const allCountsMatch = counts.every(count => count === eventCount);
          const allCountsMatchInitial = counts.every(count => count === initialCount);

          return initialCount === eventCount && 
                 allCountsMatch && 
                 allCountsMatchInitial;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event count should be consistent across different user sessions', async () => {
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

          // Setup: Create mock events for user2
          const user2Events = Array.from({ length: count2 }, (_, i) => ({
            id: `user2-event-${i}`,
            title: `User2 Event ${i}`,
            pin: '123456',
            creatorId: userId2,
            createdAt: new Date().toISOString()
          }));

          // Simulate user1 session
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(user1Events);
          const quotaManager1 = new QuotaStateManager();
          quotaManager1.firebaseAPI = mockFirebaseAPI;
          await quotaManager1.initialize(userId1);
          const user1Count = quotaManager1.state.eventCount;
          quotaManager1.cleanup();

          // Simulate user2 session (different user logs in)
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(user2Events);
          const quotaManager2 = new QuotaStateManager();
          quotaManager2.firebaseAPI = mockFirebaseAPI;
          await quotaManager2.initialize(userId2);
          const user2Count = quotaManager2.state.eventCount;
          quotaManager2.cleanup();

          // Simulate user1 logs back in
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(user1Events);
          const quotaManager3 = new QuotaStateManager();
          quotaManager3.firebaseAPI = mockFirebaseAPI;
          await quotaManager3.initialize(userId1);
          const user1CountAgain = quotaManager3.state.eventCount;
          quotaManager3.cleanup();

          // Property: Each user's count should be consistent across sessions
          return user1Count === count1 && 
                 user2Count === count2 && 
                 user1CountAgain === count1 &&
                 user1Count === user1CountAgain;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event count should remain accurate after state reset', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial event count
        fc.integer({ min: 0, max: 5 }),
        async (userId, eventCount) => {
          // Setup: Create mock events
          const mockEvents = Array.from({ length: eventCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);

          // Initialize quota manager
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          await quotaManager.initialize(userId);
          const countBeforeReset = quotaManager.state.eventCount;

          // Simulate state reset (like what happens on logout)
          quotaManager.state = {
            userId: null,
            eventCount: 0,
            quotaLimit: 3,
            remainingQuota: 3,
            isAtLimit: false,
            lastUpdated: 0
          };

          // Re-initialize (like what happens on login)
          await quotaManager.initialize(userId);
          const countAfterReset = quotaManager.state.eventCount;

          // Cleanup
          quotaManager.cleanup();

          // Property: Count should be accurate after state reset
          return countBeforeReset === eventCount && 
                 countAfterReset === eventCount &&
                 countBeforeReset === countAfterReset;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('quota state should be independent of previous user sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate event count
        fc.integer({ min: 0, max: 5 }),
        // Generate a different "previous user" ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate previous user's event count
        fc.integer({ min: 0, max: 5 }),
        async (userId, eventCount, prevUserId, prevEventCount) => {
          // Skip if user IDs are the same
          if (userId === prevUserId) return true;

          // Setup: Create mock events for previous user
          const prevUserEvents = Array.from({ length: prevEventCount }, (_, i) => ({
            id: `prev-event-${i}`,
            title: `Prev Event ${i}`,
            pin: '123456',
            creatorId: prevUserId,
            createdAt: new Date().toISOString()
          }));

          // Simulate previous user session
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(prevUserEvents);
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          await quotaManager.initialize(prevUserId);
          const prevCount = quotaManager.state.eventCount;

          // Simulate logout
          quotaManager.cleanup();

          // Setup: Create mock events for current user
          const currentUserEvents = Array.from({ length: eventCount }, (_, i) => ({
            id: `current-event-${i}`,
            title: `Current Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          // Simulate current user login
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(currentUserEvents);
          await quotaManager.initialize(userId);
          const currentCount = quotaManager.state.eventCount;

          // Cleanup
          quotaManager.cleanup();

          // Property: Current user's count should not be affected by previous user
          return prevCount === prevEventCount && 
                 currentCount === eventCount &&
                 quotaManager.state.userId === userId;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remaining quota should be consistent across sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate event count from 0 to 5
        fc.integer({ min: 0, max: 5 }),
        async (userId, eventCount) => {
          // Setup: Create mock events
          const mockEvents = Array.from({ length: eventCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);

          // First session
          const quotaManager1 = new QuotaStateManager();
          quotaManager1.firebaseAPI = mockFirebaseAPI;
          await quotaManager1.initialize(userId);
          const remaining1 = quotaManager1.getRemainingQuota();
          quotaManager1.cleanup();

          // Second session (after logout/login)
          const quotaManager2 = new QuotaStateManager();
          quotaManager2.firebaseAPI = mockFirebaseAPI;
          await quotaManager2.initialize(userId);
          const remaining2 = quotaManager2.getRemainingQuota();
          quotaManager2.cleanup();

          // Expected remaining quota
          const expectedRemaining = Math.max(0, 3 - eventCount);

          // Property: Remaining quota should be consistent across sessions
          return remaining1 === expectedRemaining && 
                 remaining2 === expectedRemaining &&
                 remaining1 === remaining2;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('isAtLimit flag should be consistent across sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate event count from 0 to 5
        fc.integer({ min: 0, max: 5 }),
        async (userId, eventCount) => {
          // Setup: Create mock events
          const mockEvents = Array.from({ length: eventCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);

          // First session
          const quotaManager1 = new QuotaStateManager();
          quotaManager1.firebaseAPI = mockFirebaseAPI;
          await quotaManager1.initialize(userId);
          const isAtLimit1 = quotaManager1.state.isAtLimit;
          quotaManager1.cleanup();

          // Second session (after logout/login)
          const quotaManager2 = new QuotaStateManager();
          quotaManager2.firebaseAPI = mockFirebaseAPI;
          await quotaManager2.initialize(userId);
          const isAtLimit2 = quotaManager2.state.isAtLimit;
          quotaManager2.cleanup();

          // Expected isAtLimit value
          const expectedIsAtLimit = eventCount >= 3;

          // Property: isAtLimit should be consistent across sessions
          return isAtLimit1 === expectedIsAtLimit && 
                 isAtLimit2 === expectedIsAtLimit &&
                 isAtLimit1 === isAtLimit2;
        }
      ),
      { numRuns: 100 }
    );
  });
});
