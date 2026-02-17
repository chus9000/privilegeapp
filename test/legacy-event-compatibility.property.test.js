/**
 * Property-Based Test for Legacy Event Compatibility
 * Feature: full-featured-quiz-app
 * 
 * Property 18: Legacy Event Compatibility
 * **Validates: Requirements 13.2, 13.3**
 * 
 * For any event loaded from Firebase that lacks a `disabledQuestions` field or `creatorId` field,
 * the system should treat it as having default values:
 * - Missing creatorId gets 'legacy' default
 * - Missing disabledQuestions gets empty array default (all questions enabled)
 */

import { describe, test, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Import DataManager class
let DataManager;

beforeEach(async () => {
  // Dynamically import DataManager
  const module = await import('../data-manager.js');
  DataManager = module.default || module;
  
  // Mock localStorage
  global.localStorage = {
    storage: {},
    getItem(key) {
      return this.storage[key] || null;
    },
    setItem(key, value) {
      this.storage[key] = value;
    },
    removeItem(key) {
      delete this.storage[key];
    },
    clear() {
      this.storage = {};
    }
  };
  
  // Mock window
  global.window = {
    addEventListener: vi.fn(),
    FirebaseAPI: null
  };
  
  // Mock document
  global.document = {
    readyState: 'complete',
    addEventListener: vi.fn()
  };
  
  // Mock navigator
  global.navigator = {
    onLine: true
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  if (global.localStorage) {
    global.localStorage.clear();
  }
});

describe('Property 18: Legacy Event Compatibility', () => {
  test('events without creatorId should get "legacy" default', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event data without creatorId
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
          disabledQuestions: fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 30 }),
          createdAt: fc.date().map(d => d.toISOString()),
          participants: fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              score: fc.integer({ min: -25, max: 25 })
            }),
            { maxLength: 5 }
          )
        }),
        async (legacyEventData) => {
          // Create DataManager instance
          const dataManager = new DataManager();
          dataManager.initialize();
          
          // Ensure the event data does NOT have creatorId
          const eventWithoutCreatorId = { ...legacyEventData };
          delete eventWithoutCreatorId.creatorId;
          
          // Verify it doesn't have creatorId
          if ('creatorId' in eventWithoutCreatorId) {
            return false;
          }
          
          // Migrate the legacy event data
          const migratedEvent = dataManager.migrateLegacyEventData(eventWithoutCreatorId);
          
          // Property 1: Migrated event should have creatorId field
          if (!('creatorId' in migratedEvent)) {
            return false;
          }
          
          // Property 2: creatorId should be 'legacy'
          if (migratedEvent.creatorId !== 'legacy') {
            return false;
          }
          
          // Property 3: All other fields should be preserved
          if (migratedEvent.title !== legacyEventData.title) {
            return false;
          }
          
          if (migratedEvent.pin !== legacyEventData.pin) {
            return false;
          }
          
          if (migratedEvent.createdAt !== legacyEventData.createdAt) {
            return false;
          }
          
          // Property 4: disabledQuestions should be preserved if it exists
          const migratedDisabled = [...migratedEvent.disabledQuestions].sort();
          const originalDisabled = [...legacyEventData.disabledQuestions].sort();
          if (JSON.stringify(migratedDisabled) !== JSON.stringify(originalDisabled)) {
            return false;
          }
          
          // Property 5: participants should be preserved
          if (migratedEvent.participants.length !== legacyEventData.participants.length) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('events without disabledQuestions should get empty array default', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event data without disabledQuestions
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
          creatorId: fc.string({ minLength: 5, maxLength: 30 }),
          createdAt: fc.date().map(d => d.toISOString()),
          participants: fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              score: fc.integer({ min: -25, max: 25 })
            }),
            { maxLength: 5 }
          )
        }),
        async (legacyEventData) => {
          // Create DataManager instance
          const dataManager = new DataManager();
          dataManager.initialize();
          
          // Ensure the event data does NOT have disabledQuestions
          const eventWithoutDisabledQuestions = { ...legacyEventData };
          delete eventWithoutDisabledQuestions.disabledQuestions;
          
          // Verify it doesn't have disabledQuestions
          if ('disabledQuestions' in eventWithoutDisabledQuestions) {
            return false;
          }
          
          // Migrate the legacy event data
          const migratedEvent = dataManager.migrateLegacyEventData(eventWithoutDisabledQuestions);
          
          // Property 1: Migrated event should have disabledQuestions field
          if (!('disabledQuestions' in migratedEvent)) {
            return false;
          }
          
          // Property 2: disabledQuestions should be an empty array
          if (!Array.isArray(migratedEvent.disabledQuestions)) {
            return false;
          }
          
          if (migratedEvent.disabledQuestions.length !== 0) {
            return false;
          }
          
          // Property 3: All other fields should be preserved
          if (migratedEvent.title !== legacyEventData.title) {
            return false;
          }
          
          if (migratedEvent.pin !== legacyEventData.pin) {
            return false;
          }
          
          if (migratedEvent.creatorId !== legacyEventData.creatorId) {
            return false;
          }
          
          if (migratedEvent.createdAt !== legacyEventData.createdAt) {
            return false;
          }
          
          // Property 4: participants should be preserved
          if (migratedEvent.participants.length !== legacyEventData.participants.length) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('events missing both creatorId and disabledQuestions should get both defaults', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate minimal legacy event data
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
          createdAt: fc.date().map(d => d.toISOString()),
          participants: fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              score: fc.integer({ min: -25, max: 25 })
            }),
            { maxLength: 5 }
          )
        }),
        async (legacyEventData) => {
          // Create DataManager instance
          const dataManager = new DataManager();
          dataManager.initialize();
          
          // Ensure the event data has neither field
          const minimalLegacyEvent = { ...legacyEventData };
          delete minimalLegacyEvent.creatorId;
          delete minimalLegacyEvent.disabledQuestions;
          
          // Verify neither field exists
          if ('creatorId' in minimalLegacyEvent || 'disabledQuestions' in minimalLegacyEvent) {
            return false;
          }
          
          // Migrate the legacy event data
          const migratedEvent = dataManager.migrateLegacyEventData(minimalLegacyEvent);
          
          // Property 1: Should have creatorId = 'legacy'
          if (migratedEvent.creatorId !== 'legacy') {
            return false;
          }
          
          // Property 2: Should have disabledQuestions = []
          if (!Array.isArray(migratedEvent.disabledQuestions) || 
              migratedEvent.disabledQuestions.length !== 0) {
            return false;
          }
          
          // Property 3: All original fields should be preserved
          if (migratedEvent.title !== legacyEventData.title ||
              migratedEvent.pin !== legacyEventData.pin ||
              migratedEvent.createdAt !== legacyEventData.createdAt) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('events with existing creatorId and disabledQuestions should not be modified', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate complete event data
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
          creatorId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s !== 'legacy'), // Ensure it's not 'legacy'
          disabledQuestions: fc.array(fc.integer({ min: 0, max: 34 }), { minLength: 1, maxLength: 30 }),
          createdAt: fc.date().map(d => d.toISOString()),
          participants: fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              score: fc.integer({ min: -25, max: 25 })
            }),
            { maxLength: 5 }
          )
        }),
        async (modernEventData) => {
          // Create DataManager instance
          const dataManager = new DataManager();
          dataManager.initialize();
          
          // Store original values
          const originalCreatorId = modernEventData.creatorId;
          const originalDisabledQuestions = [...modernEventData.disabledQuestions];
          
          // Migrate the event data (should not change anything)
          const migratedEvent = dataManager.migrateLegacyEventData(modernEventData);
          
          // Property 1: creatorId should remain unchanged
          if (migratedEvent.creatorId !== originalCreatorId) {
            return false;
          }
          
          // Property 2: disabledQuestions should remain unchanged
          const migratedDisabled = [...migratedEvent.disabledQuestions].sort();
          const originalDisabled = [...originalDisabledQuestions].sort();
          if (JSON.stringify(migratedDisabled) !== JSON.stringify(originalDisabled)) {
            return false;
          }
          
          // Property 3: All other fields should be preserved
          if (migratedEvent.title !== modernEventData.title ||
              migratedEvent.pin !== modernEventData.pin ||
              migratedEvent.createdAt !== modernEventData.createdAt) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('migration should be idempotent - migrating twice produces same result', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event data that may or may not have the fields
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
          creatorId: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: undefined }),
          disabledQuestions: fc.option(
            fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 30 }),
            { nil: undefined }
          ),
          createdAt: fc.date().map(d => d.toISOString())
        }),
        async (eventData) => {
          // Create DataManager instance
          const dataManager = new DataManager();
          dataManager.initialize();
          
          // Remove undefined fields to simulate legacy data
          const cleanedEvent = Object.fromEntries(
            Object.entries(eventData).filter(([_, v]) => v !== undefined)
          );
          
          // Migrate once
          const migratedOnce = dataManager.migrateLegacyEventData(cleanedEvent);
          
          // Migrate again
          const migratedTwice = dataManager.migrateLegacyEventData(migratedOnce);
          
          // Property: Both migrations should produce identical results
          if (migratedOnce.creatorId !== migratedTwice.creatorId) {
            return false;
          }
          
          const disabledOnce = [...migratedOnce.disabledQuestions].sort();
          const disabledTwice = [...migratedTwice.disabledQuestions].sort();
          if (JSON.stringify(disabledOnce) !== JSON.stringify(disabledTwice)) {
            return false;
          }
          
          if (migratedOnce.title !== migratedTwice.title ||
              migratedOnce.pin !== migratedTwice.pin ||
              migratedOnce.createdAt !== migratedTwice.createdAt) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('null or undefined event data should be handled gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(null, undefined),
        async (invalidData) => {
          // Create DataManager instance
          const dataManager = new DataManager();
          dataManager.initialize();
          
          // Migrate null/undefined data
          const result = dataManager.migrateLegacyEventData(invalidData);
          
          // Property: Should return the input unchanged (null/undefined)
          return result === invalidData;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loadEvent should automatically migrate legacy events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
          createdAt: fc.date().map(d => d.toISOString()),
          participants: fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              score: fc.integer({ min: -25, max: 25 })
            }),
            { maxLength: 3 }
          )
        }),
        async ({ eventId, ...legacyEventData }) => {
          // Create DataManager instance
          const dataManager = new DataManager();
          dataManager.initialize();
          
          // Store legacy event in localStorage (without creatorId and disabledQuestions)
          const legacyEvent = { ...legacyEventData };
          delete legacyEvent.creatorId;
          delete legacyEvent.disabledQuestions;
          
          dataManager.saveToLocalStorage(`event_${eventId}`, legacyEvent);
          
          // Load the event (should trigger migration)
          const loadedEvent = await dataManager.loadEvent(eventId);
          
          // Property 1: Loaded event should not be null
          if (!loadedEvent) {
            return false;
          }
          
          // Property 2: Should have creatorId = 'legacy'
          if (loadedEvent.creatorId !== 'legacy') {
            return false;
          }
          
          // Property 3: Should have disabledQuestions = []
          if (!Array.isArray(loadedEvent.disabledQuestions) || 
              loadedEvent.disabledQuestions.length !== 0) {
            return false;
          }
          
          // Property 4: Original fields should be preserved
          if (loadedEvent.title !== legacyEventData.title ||
              loadedEvent.pin !== legacyEventData.pin ||
              loadedEvent.createdAt !== legacyEventData.createdAt) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loadEventsByCreator should migrate all legacy events in the list', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 30 }),
          events: fc.array(
            fc.record({
              title: fc.string({ minLength: 1, maxLength: 100 })
                .filter(s => s.trim().length > 0),
              pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
              createdAt: fc.date().map(d => d.toISOString())
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async ({ userId, events }) => {
          // Create DataManager instance
          const dataManager = new DataManager();
          dataManager.initialize();
          
          // Store legacy events (without creatorId and disabledQuestions)
          const legacyEvents = events.map(event => {
            const legacy = { ...event };
            delete legacy.creatorId;
            delete legacy.disabledQuestions;
            return legacy;
          });
          
          dataManager.saveToLocalStorage(`events_${userId}`, legacyEvents);
          
          // Load events by creator (should trigger migration for all)
          const loadedEvents = await dataManager.loadEventsByCreator(userId);
          
          // Property 1: Should load all events
          if (loadedEvents.length !== events.length) {
            return false;
          }
          
          // Property 2: All events should have creatorId = 'legacy'
          for (const event of loadedEvents) {
            if (event.creatorId !== 'legacy') {
              return false;
            }
          }
          
          // Property 3: All events should have disabledQuestions = []
          for (const event of loadedEvents) {
            if (!Array.isArray(event.disabledQuestions) || 
                event.disabledQuestions.length !== 0) {
              return false;
            }
          }
          
          // Property 4: Original fields should be preserved for all events
          for (let i = 0; i < events.length; i++) {
            if (loadedEvents[i].title !== events[i].title ||
                loadedEvents[i].pin !== events[i].pin ||
                loadedEvents[i].createdAt !== events[i].createdAt) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
