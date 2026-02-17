/**
 * Property-Based Tests for Event Dashboard
 * Feature: full-featured-quiz-app
 * 
 * Property 13: Event Creator Association
 * Validates: Requirements 4.1, 4.5
 * 
 * For any authenticated user accessing the dashboard, the displayed events 
 * should be exactly those events where the creatorId field matches the user's ID.
 */

import { describe, test, beforeEach } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the FirebaseAPI code
const firebaseConfigCode = readFileSync(join(process.cwd(), 'firebase-config.js'), 'utf-8');

/**
 * Create a mock FirebaseAPI instance with controlled data
 */
function createMockFirebaseAPI(allEventsData) {
  // Create a context with necessary globals
  const context = {
    console: console,
    fetch: async (url) => {
      // Mock fetch to return our test data
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => allEventsData
      };
    }
  };
  
  // Execute the FirebaseAPI code in the context
  const func = new Function(
    'console', 
    'fetch',
    firebaseConfigCode + '; return window.FirebaseAPI;'
  );
  
  const firebaseAPI = func(console, context.fetch);
  
  return firebaseAPI;
}

/**
 * Generator for event IDs
 * Exclude special JavaScript property names that can cause issues
 */
const eventIdGenerator = fc.string({ minLength: 5, maxLength: 20 })
  .filter(id => {
    // Exclude special JavaScript property names
    const forbidden = ['__proto__', 'constructor', 'prototype', 'hasOwnProperty', 
                       'isPrototypeOf', 'propertyIsEnumerable', 'toString', 
                       'toLocaleString', 'valueOf'];
    return !forbidden.includes(id);
  });

/**
 * Generator for user IDs
 */
const userIdGenerator = fc.string({ minLength: 5, maxLength: 50 });

/**
 * Generator for event data
 */
const eventDataGenerator = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  pin: fc.integer({ min: 100000, max: 999999 }).map(String),
  createdAt: fc.date().map(d => d.toISOString()),
  disabledQuestions: fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 30 })
});

describe('Property 13: Event Creator Association', () => {
  test('loadEventsByCreator returns only events with matching creatorId', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a target user ID
        userIdGenerator,
        // Generate other user IDs (different from target)
        fc.array(userIdGenerator, { minLength: 0, maxLength: 5 }),
        // Generate events for target user
        fc.array(
          fc.tuple(eventIdGenerator, eventDataGenerator),
          { minLength: 0, maxLength: 10 }
        ),
        // Generate events for other users
        fc.array(
          fc.tuple(eventIdGenerator, eventDataGenerator, userIdGenerator),
          { minLength: 0, maxLength: 10 }
        ),
        async (targetUserId, otherUserIds, targetUserEvents, otherUserEvents) => {
          // Build the complete events object for Firebase
          const allEventsData = {};
          
          // Add target user's events
          for (const [eventId, eventData] of targetUserEvents) {
            allEventsData[eventId] = {
              ...eventData,
              creatorId: targetUserId
            };
          }
          
          // Add other users' events (ensure they don't have the target user ID)
          for (const [eventId, eventData, creatorId] of otherUserEvents) {
            // Skip if this would create a duplicate event ID
            if (allEventsData[eventId]) {
              continue;
            }
            
            // Ensure the creator ID is different from target
            const actualCreatorId = creatorId === targetUserId 
              ? creatorId + '_different' 
              : creatorId;
            
            allEventsData[eventId] = {
              ...eventData,
              creatorId: actualCreatorId
            };
          }
          
          // Create mock FirebaseAPI with this data
          const firebaseAPI = createMockFirebaseAPI(allEventsData);
          
          // Call loadEventsByCreator
          const result = await firebaseAPI.loadEventsByCreator(targetUserId);
          
          // Property: All returned events should have creatorId === targetUserId
          const allHaveCorrectCreator = result.every(event => 
            event.creatorId === targetUserId
          );
          
          // Property: The count should match the number of target user events
          const expectedCount = targetUserEvents.length;
          const actualCount = result.length;
          
          // Property: All target user events should be in the result
          const allTargetEventsIncluded = targetUserEvents.every(([eventId]) => 
            result.some(event => event.id === eventId)
          );
          
          // Property: No events from other users should be in the result
          const noOtherUserEvents = otherUserEvents.every(([eventId, , creatorId]) => {
            // If this event has a different creator, it should not be in results
            const actualCreatorId = creatorId === targetUserId 
              ? creatorId + '_different' 
              : creatorId;
            
            if (actualCreatorId !== targetUserId) {
              return !result.some(event => event.id === eventId);
            }
            return true;
          });
          
          return allHaveCorrectCreator && 
                 actualCount === expectedCount && 
                 allTargetEventsIncluded &&
                 noOtherUserEvents;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loadEventsByCreator returns empty array when user has no events', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a target user ID
        userIdGenerator,
        // Generate events for other users only
        fc.array(
          fc.tuple(eventIdGenerator, eventDataGenerator, userIdGenerator),
          { minLength: 1, maxLength: 10 }
        ),
        async (targetUserId, otherUserEvents) => {
          // Build events object with only other users' events
          const allEventsData = {};
          
          for (const [eventId, eventData, creatorId] of otherUserEvents) {
            // Ensure the creator ID is different from target
            const actualCreatorId = creatorId === targetUserId 
              ? creatorId + '_different' 
              : creatorId;
            
            allEventsData[eventId] = {
              ...eventData,
              creatorId: actualCreatorId
            };
          }
          
          // Create mock FirebaseAPI
          const firebaseAPI = createMockFirebaseAPI(allEventsData);
          
          // Call loadEventsByCreator
          const result = await firebaseAPI.loadEventsByCreator(targetUserId);
          
          // Property: Should return empty array when user has no events
          return Array.isArray(result) && result.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loadEventsByCreator returns empty array when no events exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdGenerator,
        async (targetUserId) => {
          // Create mock FirebaseAPI with no events
          const firebaseAPI = createMockFirebaseAPI(null);
          
          // Call loadEventsByCreator
          const result = await firebaseAPI.loadEventsByCreator(targetUserId);
          
          // Property: Should return empty array when no events exist
          return Array.isArray(result) && result.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loadEventsByCreator preserves event data structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdGenerator,
        fc.array(
          fc.tuple(eventIdGenerator, eventDataGenerator),
          { minLength: 1, maxLength: 5 }
        ),
        async (targetUserId, targetUserEvents) => {
          // Build events object
          const allEventsData = {};
          
          for (const [eventId, eventData] of targetUserEvents) {
            allEventsData[eventId] = {
              ...eventData,
              creatorId: targetUserId
            };
          }
          
          // Create mock FirebaseAPI
          const firebaseAPI = createMockFirebaseAPI(allEventsData);
          
          // Call loadEventsByCreator
          const result = await firebaseAPI.loadEventsByCreator(targetUserId);
          
          // Property: Each returned event should have all original fields plus id
          const allEventsHaveCorrectStructure = result.every(event => {
            return event.id !== undefined &&
                   event.title !== undefined &&
                   event.pin !== undefined &&
                   event.createdAt !== undefined &&
                   event.disabledQuestions !== undefined &&
                   event.creatorId === targetUserId;
          });
          
          // Property: Event data should match original data
          const allDataMatches = targetUserEvents.every(([eventId, eventData]) => {
            const resultEvent = result.find(e => e.id === eventId);
            if (!resultEvent) return false;
            
            return resultEvent.title === eventData.title &&
                   resultEvent.pin === eventData.pin &&
                   resultEvent.createdAt === eventData.createdAt &&
                   JSON.stringify(resultEvent.disabledQuestions) === JSON.stringify(eventData.disabledQuestions);
          });
          
          return allEventsHaveCorrectStructure && allDataMatches;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loadEventsByCreator handles multiple users with same event titles', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdGenerator,
        fc.array(userIdGenerator, { minLength: 1, maxLength: 3 }),
        fc.string({ minLength: 1, maxLength: 50 }), // Shared title
        fc.array(eventIdGenerator, { minLength: 2, maxLength: 5 }),
        async (targetUserId, otherUserIds, sharedTitle, eventIds) => {
          // Create events with same title but different creators
          const allEventsData = {};
          
          // Add one event for target user
          if (eventIds.length > 0) {
            allEventsData[eventIds[0]] = {
              title: sharedTitle,
              pin: '123456',
              createdAt: new Date().toISOString(),
              disabledQuestions: [],
              creatorId: targetUserId
            };
          }
          
          // Add events for other users with same title
          for (let i = 1; i < eventIds.length && i - 1 < otherUserIds.length; i++) {
            const otherUserId = otherUserIds[i - 1] === targetUserId 
              ? otherUserIds[i - 1] + '_different'
              : otherUserIds[i - 1];
            
            allEventsData[eventIds[i]] = {
              title: sharedTitle,
              pin: '654321',
              createdAt: new Date().toISOString(),
              disabledQuestions: [],
              creatorId: otherUserId
            };
          }
          
          // Create mock FirebaseAPI
          const firebaseAPI = createMockFirebaseAPI(allEventsData);
          
          // Call loadEventsByCreator
          const result = await firebaseAPI.loadEventsByCreator(targetUserId);
          
          // Property: Should return only the target user's event, even with same title
          const correctCount = result.length === 1;
          const correctCreator = result.every(e => e.creatorId === targetUserId);
          const correctEventId = result.length > 0 ? result[0].id === eventIds[0] : true;
          
          return correctCount && correctCreator && correctEventId;
        }
      ),
      { numRuns: 100 }
    );
  });
});
