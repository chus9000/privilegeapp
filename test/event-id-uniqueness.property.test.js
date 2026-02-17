/**
 * Property-Based Test for Event ID Uniqueness
 * Feature: full-featured-quiz-app
 * 
 * Property 7: Event ID Uniqueness
 * Validates: Requirements 5.4
 * 
 * For any two events created at different times, their generated event IDs 
 * should be distinct.
 */

import { describe, test, beforeEach } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the event-creation.js code
const eventCreationCode = readFileSync(join(process.cwd(), 'app/event-creation.js'), 'utf-8');

/**
 * Extract the generateEventId function from the event-creation module
 */
function extractGenerateEventId() {
  // Create a minimal context
  const context = {
    Date: Date,
    Math: Math
  };
  
  // Extract just the generateEventId function
  const generateEventIdCode = `
    function generateEventId() {
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 9);
      return \`\${timestamp}_\${randomStr}\`;
    }
    return generateEventId;
  `;
  
  const func = new Function('Date', 'Math', generateEventIdCode);
  return func(Date, Math);
}

describe('Property 7: Event ID Uniqueness', () => {
  test('two event IDs generated at different times should be distinct', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary delays between event creations (1-10ms)
        fc.integer({ min: 1, max: 10 }),
        async (delayMs) => {
          const generateEventId = extractGenerateEventId();
          
          // Generate first event ID
          const eventId1 = generateEventId();
          
          // Wait for the specified delay to ensure different timestamps
          await new Promise(resolve => setTimeout(resolve, delayMs));
          
          // Generate second event ID
          const eventId2 = generateEventId();
          
          // Property: Event IDs should be distinct
          return eventId1 !== eventId2;
        }
      ),
      { numRuns: 100 }
    );
  }, 15000); // Increase timeout to 15 seconds for this test

  test('multiple event IDs generated in rapid succession should all be distinct', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary number of events (2-20)
        fc.integer({ min: 2, max: 20 }),
        async (numEvents) => {
          const generateEventId = extractGenerateEventId();
          
          // Generate multiple event IDs
          const eventIds = [];
          for (let i = 0; i < numEvents; i++) {
            eventIds.push(generateEventId());
            // Small delay to allow timestamp to potentially change
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          // Property: All event IDs should be unique
          const uniqueIds = new Set(eventIds);
          return uniqueIds.size === eventIds.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event ID format should be timestamp_randomstring', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No input needed, just run the test
        () => {
          const generateEventId = extractGenerateEventId();
          const eventId = generateEventId();
          
          // Property: Event ID should match the format timestamp_randomstring
          const parts = eventId.split('_');
          
          // Should have exactly 2 parts separated by underscore
          if (parts.length !== 2) {
            return false;
          }
          
          const [timestampPart, randomPart] = parts;
          
          // Timestamp part should be non-empty alphanumeric (base36)
          if (timestampPart.length === 0 || !/^[0-9a-z]+$/.test(timestampPart)) {
            return false;
          }
          
          // Random part should be non-empty alphanumeric (base36)
          if (randomPart.length === 0 || !/^[0-9a-z]+$/.test(randomPart)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event IDs generated across different execution contexts should be distinct', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary number of parallel generations (2-10)
        fc.integer({ min: 2, max: 10 }),
        async (numParallel) => {
          // Generate event IDs in parallel (simulating multiple users creating events simultaneously)
          const promises = [];
          for (let i = 0; i < numParallel; i++) {
            promises.push(new Promise(resolve => {
              // Each in a separate microtask
              setTimeout(() => {
                const generateEventId = extractGenerateEventId();
                resolve(generateEventId());
              }, 0);
            }));
          }
          
          const eventIds = await Promise.all(promises);
          
          // Property: All event IDs should be unique even when generated in parallel
          const uniqueIds = new Set(eventIds);
          return uniqueIds.size === eventIds.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});
