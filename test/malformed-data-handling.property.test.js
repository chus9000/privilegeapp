/**
 * Property-Based Test for Graceful Handling of Malformed Data
 * Feature: event-creation-limit
 * 
 * Property 17: Graceful Handling of Malformed Data
 * **Validates: Requirements 8.3**
 * 
 * For any database state that includes events with missing or invalid creatorId fields,
 * the quota enforcement system should continue to function correctly for new event creation attempts.
 */

import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest';
import fc from 'fast-check';

describe('Property 17: Graceful Handling of Malformed Data', () => {
  let QuotaStateManager;
  let mockFirebaseAPI;

  beforeEach(async () => {
    // Dynamically import QuotaStateManager
    const module = await import('../app/quota-manager.js');
    QuotaStateManager = module.default || module;

    // Mock FirebaseAPI
    mockFirebaseAPI = {
      loadEventsByCreator: vi.fn()
    };

    // Mock window
    global.window = {
      FirebaseAPI: mockFirebaseAPI
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('quota counting should exclude events with missing creatorId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 30 }),
          validEventCount: fc.integer({ min: 0, max: 3 }),
          malformedEventCount: fc.integer({ min: 1, max: 5 })
        }),
        async ({ userId, validEventCount, malformedEventCount }) => {
          // Create valid events with proper creatorId
          const validEvents = Array.from({ length: validEventCount }, (_, i) => ({
            id: `event_${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          // Create malformed events without creatorId
          const malformedEvents = Array.from({ length: malformedEventCount }, (_, i) => ({
            id: `malformed_${i}`,
            title: `Malformed Event ${i}`,
            pin: '654321',
            // Missing creatorId field
            createdAt: new Date().toISOString()
          }));

          // Mix valid and malformed events
          const allEvents = [...validEvents, ...malformedEvents];

          // Mock FirebaseAPI to return mixed data
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(allEvents);

          // Create QuotaStateManager instance
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          quotaManager.state.userId = userId;

          // Get event count
          const count = await quotaManager.getUserEventCount();

          // Property: Count should only include valid events with proper creatorId
          return count === validEventCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('quota counting should exclude events with null/undefined values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 30 }),
          validEventCount: fc.integer({ min: 0, max: 3 }),
          nullEventCount: fc.integer({ min: 1, max: 5 })
        }),
        async ({ userId, validEventCount, nullEventCount }) => {
          // Create valid events
          const validEvents = Array.from({ length: validEventCount }, (_, i) => ({
            id: `event_${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          // Create array with null/undefined entries
          const nullEvents = Array.from({ length: nullEventCount }, () => null);

          // Mix valid and null events
          const allEvents = [...validEvents, ...nullEvents];

          // Mock FirebaseAPI to return mixed data
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(allEvents);

          // Create QuotaStateManager instance
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          quotaManager.state.userId = userId;

          // Get event count
          const count = await quotaManager.getUserEventCount();

          // Property: Count should only include valid non-null events
          return count === validEventCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('quota counting should exclude events with mismatched creatorId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 30 }),
          validEventCount: fc.integer({ min: 0, max: 3 }),
          mismatchedEventCount: fc.integer({ min: 1, max: 5 }),
          otherUserId: fc.string({ minLength: 5, maxLength: 30 })
        }).filter(({ userId, otherUserId }) => userId !== otherUserId),
        async ({ userId, validEventCount, mismatchedEventCount, otherUserId }) => {
          // Create valid events with correct creatorId
          const validEvents = Array.from({ length: validEventCount }, (_, i) => ({
            id: `event_${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          // Create events with different creatorId
          const mismatchedEvents = Array.from({ length: mismatchedEventCount }, (_, i) => ({
            id: `mismatched_${i}`,
            title: `Mismatched Event ${i}`,
            pin: '654321',
            creatorId: otherUserId,
            createdAt: new Date().toISOString()
          }));

          // Mix valid and mismatched events
          const allEvents = [...validEvents, ...mismatchedEvents];

          // Mock FirebaseAPI to return mixed data
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(allEvents);

          // Create QuotaStateManager instance
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          quotaManager.state.userId = userId;

          // Get event count
          const count = await quotaManager.getUserEventCount();

          // Property: Count should only include events with matching creatorId
          return count === validEventCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('quota enforcement should work correctly with mixed valid and malformed data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 30 }),
          validEventCount: fc.integer({ min: 0, max: 3 }),
          malformedEventCount: fc.integer({ min: 0, max: 5 })
        }),
        async ({ userId, validEventCount, malformedEventCount }) => {
          // Create valid events
          const validEvents = Array.from({ length: validEventCount }, (_, i) => ({
            id: `event_${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          // Create malformed events (mix of missing creatorId, null, and mismatched)
          const malformedEvents = Array.from({ length: malformedEventCount }, (_, i) => {
            if (i % 3 === 0) {
              return null; // Null event
            } else if (i % 3 === 1) {
              return { // Missing creatorId
                id: `malformed_${i}`,
                title: `Malformed ${i}`,
                pin: '111111'
              };
            } else {
              return { // Mismatched creatorId
                id: `malformed_${i}`,
                title: `Malformed ${i}`,
                pin: '111111',
                creatorId: 'different_user'
              };
            }
          });

          // Mix valid and malformed events
          const allEvents = [...validEvents, ...malformedEvents];

          // Mock FirebaseAPI to return mixed data
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(allEvents);

          // Create QuotaStateManager instance
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          quotaManager.state.userId = userId;

          // Update state (which calls getUserEventCount internally)
          await quotaManager.updateState();

          // Property 1: Event count should only include valid events
          if (quotaManager.state.eventCount !== validEventCount) {
            return false;
          }

          // Property 2: Remaining quota should be calculated correctly
          const expectedRemaining = Math.max(0, 3 - validEventCount);
          if (quotaManager.state.remainingQuota !== expectedRemaining) {
            return false;
          }

          // Property 3: isAtLimit should be based on valid event count only
          const expectedAtLimit = validEventCount >= 3;
          if (quotaManager.state.isAtLimit !== expectedAtLimit) {
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('quota system should handle empty or null event list gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 30 }),
          eventList: fc.constantFrom(null, undefined, [])
        }),
        async ({ userId, eventList }) => {
          // Mock FirebaseAPI to return null/undefined/empty array
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(eventList);

          // Create QuotaStateManager instance
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          quotaManager.state.userId = userId;

          // Get event count
          const count = await quotaManager.getUserEventCount();

          // Property: Should return 0 for null/undefined/empty arrays
          return count === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remaining quota calculation should be correct regardless of malformed data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 30 }),
          validEventCount: fc.integer({ min: 0, max: 5 }),
          malformedEventCount: fc.integer({ min: 0, max: 10 })
        }),
        async ({ userId, validEventCount, malformedEventCount }) => {
          // Create valid events
          const validEvents = Array.from({ length: validEventCount }, (_, i) => ({
            id: `event_${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          // Create malformed events
          const malformedEvents = Array.from({ length: malformedEventCount }, (_, i) => ({
            id: `malformed_${i}`,
            title: `Malformed ${i}`,
            pin: '111111'
            // Missing creatorId
          }));

          // Mix events
          const allEvents = [...validEvents, ...malformedEvents];

          // Mock FirebaseAPI
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(allEvents);

          // Create QuotaStateManager instance
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          quotaManager.state.userId = userId;

          // Get remaining quota
          await quotaManager.updateState();
          const remaining = quotaManager.getRemainingQuota();

          // Property: Remaining quota should be based only on valid events
          const expectedRemaining = Math.max(0, 3 - validEventCount);
          return remaining === expectedRemaining;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('quota state should be consistent after multiple updates with malformed data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 30 }),
          validEventCount: fc.integer({ min: 0, max: 3 }),
          malformedEventCount: fc.integer({ min: 1, max: 5 })
        }),
        async ({ userId, validEventCount, malformedEventCount }) => {
          // Create mixed events
          const validEvents = Array.from({ length: validEventCount }, (_, i) => ({
            id: `event_${i}`,
            title: `Event ${i}`,
            pin: '123456',
            creatorId: userId,
            createdAt: new Date().toISOString()
          }));

          const malformedEvents = Array.from({ length: malformedEventCount }, (_, i) => ({
            id: `malformed_${i}`,
            title: `Malformed ${i}`,
            pin: '111111'
            // Missing creatorId
          }));

          const allEvents = [...validEvents, ...malformedEvents];

          // Mock FirebaseAPI
          mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(allEvents);

          // Create QuotaStateManager instance
          const quotaManager = new QuotaStateManager();
          quotaManager.firebaseAPI = mockFirebaseAPI;
          quotaManager.state.userId = userId;

          // Update state multiple times
          await quotaManager.updateState();
          const state1 = quotaManager.getState();

          await quotaManager.updateState();
          const state2 = quotaManager.getState();

          // Property: State should be consistent across multiple updates
          return (
            state1.eventCount === state2.eventCount &&
            state1.remainingQuota === state2.remainingQuota &&
            state1.isAtLimit === state2.isAtLimit &&
            state1.eventCount === validEventCount
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
