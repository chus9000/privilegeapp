/**
 * Property-Based Test for Remaining Quota Calculation
 * Feature: event-creation-limit
 * 
 * Property 5: Remaining Quota Calculation
 * **Validates: Requirements 3.2**
 * 
 * For any event count value between 0 and 3, the displayed remaining quota
 * should equal 3 minus the event count.
 */

import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import fc from 'fast-check';

// Import QuotaStateManager
const QuotaStateManager = (await import('../app/quota-manager.js')).default;

describe('Property 5: Remaining Quota Calculation', () => {
  let quotaManager;

  beforeEach(() => {
    quotaManager = new QuotaStateManager();
  });

  afterEach(() => {
    if (quotaManager) {
      quotaManager.cleanup();
    }
  });

  test('remaining quota should equal 3 minus event count for valid counts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count from 0 to 3 (valid range)
        fc.integer({ min: 0, max: 3 }),
        async (eventCount) => {
          // Setup: Set quota manager state with given event count
          quotaManager.state = {
            userId: 'test-user',
            eventCount,
            quotaLimit: 3,
            remainingQuota: 0, // Will be calculated
            isAtLimit: false,
            lastUpdated: Date.now()
          };

          // Action: Calculate remaining quota
          const remainingQuota = quotaManager.getRemainingQuota();

          // Property: Remaining quota should equal 3 - eventCount
          const expectedRemaining = 3 - eventCount;
          return remainingQuota === expectedRemaining;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remaining quota should never be negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count from 0 to 10 (including over quota)
        fc.integer({ min: 0, max: 10 }),
        async (eventCount) => {
          // Setup: Set quota manager state with given event count
          quotaManager.state = {
            userId: 'test-user',
            eventCount,
            quotaLimit: 3,
            remainingQuota: 0,
            isAtLimit: false,
            lastUpdated: Date.now()
          };

          // Action: Calculate remaining quota
          const remainingQuota = quotaManager.getRemainingQuota();

          // Property: Remaining quota should never be negative
          return remainingQuota >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remaining quota should be 0 when at or above limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count from 3 to 10 (at or above quota)
        fc.integer({ min: 3, max: 10 }),
        async (eventCount) => {
          // Setup: Set quota manager state with given event count
          quotaManager.state = {
            userId: 'test-user',
            eventCount,
            quotaLimit: 3,
            remainingQuota: 0,
            isAtLimit: false,
            lastUpdated: Date.now()
          };

          // Action: Calculate remaining quota
          const remainingQuota = quotaManager.getRemainingQuota();

          // Property: Remaining quota should be 0 when count >= 3
          return remainingQuota === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remaining quota should equal quota limit when event count is 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate quota limit (currently always 3, but test for extensibility)
        fc.constant(3),
        async (quotaLimit) => {
          // Setup: Set quota manager state with 0 events
          quotaManager.state = {
            userId: 'test-user',
            eventCount: 0,
            quotaLimit,
            remainingQuota: 0,
            isAtLimit: false,
            lastUpdated: Date.now()
          };

          // Action: Calculate remaining quota
          const remainingQuota = quotaManager.getRemainingQuota();

          // Property: Remaining quota should equal quota limit when count is 0
          return remainingQuota === quotaLimit;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remaining quota calculation should be consistent with state', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count from 0 to 5
        fc.integer({ min: 0, max: 5 }),
        async (eventCount) => {
          // Setup: Update state using updateState method (simulated)
          quotaManager.state = {
            userId: 'test-user',
            eventCount,
            quotaLimit: 3,
            remainingQuota: Math.max(0, 3 - eventCount),
            isAtLimit: eventCount >= 3,
            lastUpdated: Date.now()
          };

          // Action: Get remaining quota from method
          const calculatedRemaining = quotaManager.getRemainingQuota();
          
          // Get remaining quota from state
          const stateRemaining = quotaManager.state.remainingQuota;

          // Property: Calculated remaining should match state remaining
          return calculatedRemaining === stateRemaining;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remaining quota should decrease as event count increases', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two event counts where second is greater
        fc.tuple(
          fc.integer({ min: 0, max: 2 }),
          fc.integer({ min: 1, max: 3 })
        ).filter(([count1, count2]) => count1 < count2),
        async ([lowerCount, higherCount]) => {
          // Setup: Calculate remaining for lower count
          quotaManager.state = {
            userId: 'test-user',
            eventCount: lowerCount,
            quotaLimit: 3,
            remainingQuota: 0,
            isAtLimit: false,
            lastUpdated: Date.now()
          };
          const remainingAtLower = quotaManager.getRemainingQuota();

          // Setup: Calculate remaining for higher count
          quotaManager.state = {
            userId: 'test-user',
            eventCount: higherCount,
            quotaLimit: 3,
            remainingQuota: 0,
            isAtLimit: false,
            lastUpdated: Date.now()
          };
          const remainingAtHigher = quotaManager.getRemainingQuota();

          // Property: Remaining should decrease as count increases
          return remainingAtLower > remainingAtHigher;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remaining quota should be exactly 3 for new users', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (userId) => {
          // Setup: New user with 0 events
          quotaManager.state = {
            userId,
            eventCount: 0,
            quotaLimit: 3,
            remainingQuota: 0,
            isAtLimit: false,
            lastUpdated: Date.now()
          };

          // Action: Calculate remaining quota
          const remainingQuota = quotaManager.getRemainingQuota();

          // Property: New users should have exactly 3 remaining
          return remainingQuota === 3;
        }
      ),
      { numRuns: 100 }
    );
  });
});
