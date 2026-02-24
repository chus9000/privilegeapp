/**
 * Property-Based Test for Real-Time Quota Updates
 * Feature: event-creation-limit
 * 
 * Property 6: Real-Time Quota Updates
 * **Validates: Requirements 3.3**
 * 
 * For any change to a user's event count (creation or deletion), the Client UI
 * should update the displayed quota to reflect the new count.
 */

import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest';
import fc from 'fast-check';

// Import QuotaStateManager
const QuotaStateManager = (await import('../app/quota-manager.js')).default;

describe('Property 6: Real-Time Quota Updates', () => {
  let quotaManager;
  let mockFirebaseAPI;
  let mockFirebase;
  let mockEventsRef;
  let mockQuery;
  let valueListeners;

  beforeEach(() => {
    quotaManager = new QuotaStateManager();
    valueListeners = [];
    
    // Mock Firebase real-time database
    mockQuery = {
      on: vi.fn((eventType, callback) => {
        if (eventType === 'value') {
          valueListeners.push(callback);
        }
        return callback;
      }),
      off: vi.fn()
    };

    mockEventsRef = {
      orderByChild: vi.fn(() => ({
        equalTo: vi.fn(() => mockQuery)
      }))
    };

    mockFirebase = {
      database: vi.fn(() => ({
        ref: vi.fn(() => mockEventsRef)
      }))
    };

    // Mock FirebaseAPI
    mockFirebaseAPI = {
      loadEventsByCreator: vi.fn()
    };
    
    // Make Firebase and FirebaseAPI available globally
    global.firebase = mockFirebase;
    global.window = { FirebaseAPI: mockFirebaseAPI };
    quotaManager.firebaseAPI = mockFirebaseAPI;
  });

  afterEach(() => {
    if (quotaManager) {
      quotaManager.cleanup();
    }
    valueListeners = [];
    vi.restoreAllMocks();
  });

  /**
   * Helper function to simulate Firebase snapshot
   */
  function createMockSnapshot(eventCount) {
    return {
      numChildren: () => eventCount,
      val: () => {
        const events = {};
        for (let i = 0; i < eventCount; i++) {
          events[`event-${i}`] = {
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: 'test-user',
            createdAt: new Date().toISOString()
          };
        }
        return events;
      }
    };
  }

  /**
   * Helper function to trigger real-time update
   */
  function triggerRealtimeUpdate(eventCount) {
    const snapshot = createMockSnapshot(eventCount);
    valueListeners.forEach(listener => listener(snapshot));
  }

  test('quota state should update when event count changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial event count
        fc.integer({ min: 0, max: 5 }),
        // Generate new event count (after change)
        fc.integer({ min: 0, max: 5 }),
        async (userId, initialCount, newCount) => {
          // Skip if counts are the same (no change)
          if (initialCount === newCount) return true;

          // Setup: Initialize with initial count
          const initialEvents = Array.from({ length: initialCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId
          }));
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(initialEvents);

          await quotaManager.initialize(userId);

          // Verify initial state
          const initialState = quotaManager.getState();
          if (initialState.eventCount !== initialCount) return false;

          // Action: Simulate real-time update with new count
          triggerRealtimeUpdate(newCount);

          // Property: State should reflect new count
          const updatedState = quotaManager.getState();
          return updatedState.eventCount === newCount &&
                 updatedState.remainingQuota === Math.max(0, 3 - newCount) &&
                 updatedState.isAtLimit === (newCount >= 3);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('subscribers should be notified when event count changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial and new event counts
        fc.tuple(
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 })
        ).filter(([initial, updated]) => initial !== updated),
        async (userId, [initialCount, newCount]) => {
          // Setup: Initialize with initial count
          const initialEvents = Array.from({ length: initialCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId
          }));
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(initialEvents);

          await quotaManager.initialize(userId);

          // Setup: Add subscriber
          let notificationCount = 0;
          let lastNotifiedState = null;
          quotaManager.subscribe((state) => {
            notificationCount++;
            lastNotifiedState = state;
          });

          const initialNotifications = notificationCount;

          // Action: Simulate real-time update
          triggerRealtimeUpdate(newCount);

          // Property: Subscriber should be notified with new state
          return notificationCount > initialNotifications &&
                 lastNotifiedState !== null &&
                 lastNotifiedState.eventCount === newCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remaining quota should update correctly on event creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial count (must be less than 3 to allow creation)
        fc.integer({ min: 0, max: 2 }),
        async (userId, initialCount) => {
          // Setup: Initialize with initial count
          const initialEvents = Array.from({ length: initialCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId
          }));
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(initialEvents);

          await quotaManager.initialize(userId);

          const initialRemaining = quotaManager.getRemainingQuota();

          // Action: Simulate event creation (count increases by 1)
          const newCount = initialCount + 1;
          triggerRealtimeUpdate(newCount);

          // Property: Remaining quota should decrease by 1
          const newRemaining = quotaManager.getRemainingQuota();
          return newRemaining === initialRemaining - 1 &&
                 newRemaining === Math.max(0, 3 - newCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remaining quota should update correctly on event deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial count (must be at least 1 to allow deletion)
        fc.integer({ min: 1, max: 5 }),
        async (userId, initialCount) => {
          // Setup: Initialize with initial count
          const initialEvents = Array.from({ length: initialCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId
          }));
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(initialEvents);

          await quotaManager.initialize(userId);

          const initialRemaining = quotaManager.getRemainingQuota();

          // Action: Simulate event deletion (count decreases by 1)
          const newCount = initialCount - 1;
          triggerRealtimeUpdate(newCount);

          // Property: Remaining quota should be correctly calculated after deletion
          const newRemaining = quotaManager.getRemainingQuota();
          const expectedRemaining = Math.max(0, 3 - newCount);
          
          // When initial count is <= 3, remaining should increase by 1
          // When initial count is > 3, remaining should still be calculated correctly
          if (initialCount <= 3) {
            return newRemaining === initialRemaining + 1 &&
                   newRemaining === expectedRemaining;
          } else {
            // When starting above quota, just verify correct calculation
            return newRemaining === expectedRemaining;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('isAtLimit flag should update when crossing quota threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate count transition that crosses threshold
        fc.constantFrom(
          [2, 3], // Below limit to at limit
          [3, 2], // At limit to below limit
          [1, 3], // Below limit to at limit (jump)
          [3, 0]  // At limit to below limit (jump)
        ),
        async (userId, [initialCount, newCount]) => {
          // Setup: Initialize with initial count
          const initialEvents = Array.from({ length: initialCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId
          }));
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(initialEvents);

          await quotaManager.initialize(userId);

          const initialIsAtLimit = quotaManager.getState().isAtLimit;

          // Action: Simulate count change
          triggerRealtimeUpdate(newCount);

          // Property: isAtLimit should reflect new count
          const newIsAtLimit = quotaManager.getState().isAtLimit;
          const expectedIsAtLimit = newCount >= 3;
          
          return newIsAtLimit === expectedIsAtLimit &&
                 initialIsAtLimit !== newIsAtLimit; // Should have changed
        }
      ),
      { numRuns: 100 }
    );
  });

  test('multiple subscribers should all receive updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate number of subscribers
        fc.integer({ min: 1, max: 5 }),
        // Generate count change
        fc.tuple(
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 })
        ).filter(([initial, updated]) => initial !== updated),
        async (userId, numSubscribers, [initialCount, newCount]) => {
          // Setup: Initialize with initial count
          const initialEvents = Array.from({ length: initialCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId
          }));
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(initialEvents);

          await quotaManager.initialize(userId);

          // Setup: Add multiple subscribers
          const subscribers = Array.from({ length: numSubscribers }, () => {
            let notified = false;
            let receivedState = null;
            const callback = (state) => {
              notified = true;
              receivedState = state;
            };
            quotaManager.subscribe(callback);
            return { notified: () => notified, state: () => receivedState };
          });

          // Action: Simulate real-time update
          triggerRealtimeUpdate(newCount);

          // Property: All subscribers should be notified with correct state
          return subscribers.every(sub => 
            sub.notified() && 
            sub.state() !== null &&
            sub.state().eventCount === newCount
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('quota updates should be immediate (synchronous notification)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate count change
        fc.tuple(
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 })
        ).filter(([initial, updated]) => initial !== updated),
        async (userId, [initialCount, newCount]) => {
          // Setup: Initialize with initial count
          const initialEvents = Array.from({ length: initialCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId
          }));
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(initialEvents);

          await quotaManager.initialize(userId);

          // Setup: Track notification timing
          let notificationReceived = false;
          quotaManager.subscribe(() => {
            notificationReceived = true;
          });

          // Action: Trigger update
          triggerRealtimeUpdate(newCount);

          // Property: Notification should be immediate (synchronous)
          // State should be updated immediately after trigger
          const currentState = quotaManager.getState();
          return notificationReceived && currentState.eventCount === newCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('lastUpdated timestamp should change on real-time updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate count change
        fc.tuple(
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 })
        ).filter(([initial, updated]) => initial !== updated),
        async (userId, [initialCount, newCount]) => {
          // Setup: Initialize with initial count
          const initialEvents = Array.from({ length: initialCount }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId
          }));
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(initialEvents);

          await quotaManager.initialize(userId);

          const initialTimestamp = quotaManager.getState().lastUpdated;

          // Wait a small amount to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 10));

          // Action: Trigger update
          triggerRealtimeUpdate(newCount);

          // Property: Timestamp should be updated
          const newTimestamp = quotaManager.getState().lastUpdated;
          return newTimestamp > initialTimestamp;
        }
      ),
      { numRuns: 50 } // Fewer runs due to setTimeout
    );
  });

  test('real-time listener should handle rapid successive updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate sequence of event counts
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 2, maxLength: 5 }),
        async (userId, countSequence) => {
          // Setup: Initialize with first count
          const initialEvents = Array.from({ length: countSequence[0] }, (_, i) => ({
            id: `event-${i}`,
            title: `Event ${i}`,
            creatorId: userId
          }));
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(initialEvents);

          await quotaManager.initialize(userId);

          // Action: Trigger rapid successive updates
          for (const count of countSequence.slice(1)) {
            triggerRealtimeUpdate(count);
          }

          // Property: Final state should match last count in sequence
          const finalCount = countSequence[countSequence.length - 1];
          const finalState = quotaManager.getState();
          return finalState.eventCount === finalCount &&
                 finalState.remainingQuota === Math.max(0, 3 - finalCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('quota state should remain consistent after multiple updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate sequence of event counts
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 10 }),
        async (userId, countSequence) => {
          // Setup: Initialize
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue([]);
          await quotaManager.initialize(userId);

          // Action: Apply all updates
          for (const count of countSequence) {
            triggerRealtimeUpdate(count);
          }

          // Property: State should be internally consistent
          const state = quotaManager.getState();
          const expectedRemaining = Math.max(0, 3 - state.eventCount);
          const expectedIsAtLimit = state.eventCount >= 3;

          return state.remainingQuota === expectedRemaining &&
                 state.isAtLimit === expectedIsAtLimit &&
                 state.quotaLimit === 3 &&
                 state.userId === userId;
        }
      ),
      { numRuns: 100 }
    );
  });
});
