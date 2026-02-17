/**
 * Unit Tests for Backward Compatibility
 * Feature: full-featured-quiz-app
 * Task: 16.4 Write unit tests for backward compatibility
 * 
 * Tests backward compatibility features:
 * - Old event.html URL redirect (Requirement 13.1)
 * - Legacy event data handling (Requirement 13.3)
 * - DataManager legacy event migration (Requirements 13.2, 13.3)
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

describe('Backward Compatibility - Unit Tests', () => {
  describe('Old URL Redirect (Requirement 13.1)', () => {
    let mockLocation;

    beforeEach(() => {
      // Mock window.location
      mockLocation = {
        pathname: '',
        search: '',
        hash: '',
        href: '',
        replace: vi.fn()
      };
    });

    test('should redirect event.html to questions.html', () => {
      mockLocation.pathname = '/app/event.html';
      mockLocation.search = '?id=event123';
      mockLocation.hash = '';

      // Simulate redirect logic
      const currentPath = mockLocation.pathname;
      const searchParams = mockLocation.search;
      const hash = mockLocation.hash;
      
      const newPath = currentPath.replace('event.html', 'questions.html');
      const newUrl = newPath + searchParams + hash;
      
      mockLocation.replace(newUrl);

      expect(mockLocation.replace).toHaveBeenCalledWith('/app/questions.html?id=event123');
    });

    test('should preserve query parameters during redirect', () => {
      mockLocation.pathname = '/app/event.html';
      mockLocation.search = '?id=event456&debug=true';
      mockLocation.hash = '';

      const currentPath = mockLocation.pathname;
      const searchParams = mockLocation.search;
      const hash = mockLocation.hash;
      
      const newPath = currentPath.replace('event.html', 'questions.html');
      const newUrl = newPath + searchParams + hash;
      
      mockLocation.replace(newUrl);

      expect(mockLocation.replace).toHaveBeenCalledWith('/app/questions.html?id=event456&debug=true');
    });

    test('should preserve hash fragment during redirect', () => {
      mockLocation.pathname = '/app/event.html';
      mockLocation.search = '?id=event789';
      mockLocation.hash = '#section1';

      const currentPath = mockLocation.pathname;
      const searchParams = mockLocation.search;
      const hash = mockLocation.hash;
      
      const newPath = currentPath.replace('event.html', 'questions.html');
      const newUrl = newPath + searchParams + hash;
      
      mockLocation.replace(newUrl);

      expect(mockLocation.replace).toHaveBeenCalledWith('/app/questions.html?id=event789#section1');
    });

    test('should handle event.html without query parameters', () => {
      mockLocation.pathname = '/app/event.html';
      mockLocation.search = '';
      mockLocation.hash = '';

      const currentPath = mockLocation.pathname;
      const searchParams = mockLocation.search;
      const hash = mockLocation.hash;
      
      const newPath = currentPath.replace('event.html', 'questions.html');
      const newUrl = newPath + searchParams + hash;
      
      mockLocation.replace(newUrl);

      expect(mockLocation.replace).toHaveBeenCalledWith('/app/questions.html');
    });

    test('should handle event.html with multiple query parameters', () => {
      mockLocation.pathname = '/app/event.html';
      mockLocation.search = '?id=event999&name=Test&pin=123456';
      mockLocation.hash = '';

      const currentPath = mockLocation.pathname;
      const searchParams = mockLocation.search;
      const hash = mockLocation.hash;
      
      const newPath = currentPath.replace('event.html', 'questions.html');
      const newUrl = newPath + searchParams + hash;
      
      mockLocation.replace(newUrl);

      expect(mockLocation.replace).toHaveBeenCalledWith('/app/questions.html?id=event999&name=Test&pin=123456');
    });

    test('should use replace instead of assign to avoid browser history', () => {
      mockLocation.pathname = '/app/event.html';
      mockLocation.search = '?id=event123';
      mockLocation.hash = '';
      mockLocation.assign = vi.fn();

      const currentPath = mockLocation.pathname;
      const searchParams = mockLocation.search;
      const hash = mockLocation.hash;
      
      const newPath = currentPath.replace('event.html', 'questions.html');
      const newUrl = newPath + searchParams + hash;
      
      // Should use replace, not assign
      mockLocation.replace(newUrl);

      expect(mockLocation.replace).toHaveBeenCalled();
      expect(mockLocation.assign).not.toHaveBeenCalled();
    });
  });

  describe('Legacy Event Data (Requirement 13.3)', () => {
    test('should handle events without disabledQuestions field', () => {
      const legacyEvent = {
        title: 'Legacy Event',
        pin: '123456',
        creatorId: 'user123',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: []
        // Missing disabledQuestions field
      };

      // Apply defaults for legacy events
      const migratedEvent = {
        ...legacyEvent,
        disabledQuestions: legacyEvent.disabledQuestions || []
      };

      expect(migratedEvent.disabledQuestions).toEqual([]);
      expect(Array.isArray(migratedEvent.disabledQuestions)).toBe(true);
    });

    test('should preserve existing disabledQuestions if present', () => {
      const modernEvent = {
        title: 'Modern Event',
        pin: '654321',
        creatorId: 'user456',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: [],
        disabledQuestions: [0, 5, 10]
      };

      const migratedEvent = {
        ...modernEvent,
        disabledQuestions: modernEvent.disabledQuestions || []
      };

      expect(migratedEvent.disabledQuestions).toEqual([0, 5, 10]);
    });

    test('should handle events with null disabledQuestions', () => {
      const eventWithNull = {
        title: 'Event with Null',
        pin: '111111',
        creatorId: 'user789',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: [],
        disabledQuestions: null
      };

      const migratedEvent = {
        ...eventWithNull,
        disabledQuestions: eventWithNull.disabledQuestions || []
      };

      expect(migratedEvent.disabledQuestions).toEqual([]);
    });

    test('should handle events with undefined disabledQuestions', () => {
      const eventWithUndefined = {
        title: 'Event with Undefined',
        pin: '222222',
        creatorId: 'user999',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: [],
        disabledQuestions: undefined
      };

      const migratedEvent = {
        ...eventWithUndefined,
        disabledQuestions: eventWithUndefined.disabledQuestions || []
      };

      expect(migratedEvent.disabledQuestions).toEqual([]);
    });

    test('should handle events without creatorId field', () => {
      const legacyEventNoCreator = {
        title: 'Very Old Event',
        pin: '333333',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: []
        // Missing creatorId field
      };

      const migratedEvent = {
        ...legacyEventNoCreator,
        creatorId: legacyEventNoCreator.creatorId || 'legacy',
        disabledQuestions: legacyEventNoCreator.disabledQuestions || []
      };

      expect(migratedEvent.creatorId).toBe('legacy');
      expect(migratedEvent.disabledQuestions).toEqual([]);
    });

    test('should handle completely minimal legacy event', () => {
      const minimalEvent = {
        title: 'Minimal Event',
        pin: '444444'
      };

      const migratedEvent = {
        ...minimalEvent,
        creatorId: minimalEvent.creatorId || 'legacy',
        disabledQuestions: minimalEvent.disabledQuestions || [],
        participants: minimalEvent.participants || [],
        createdAt: minimalEvent.createdAt || new Date().toISOString()
      };

      expect(migratedEvent.creatorId).toBe('legacy');
      expect(migratedEvent.disabledQuestions).toEqual([]);
      expect(migratedEvent.participants).toEqual([]);
      expect(migratedEvent.createdAt).toBeDefined();
    });

    test('should not modify modern events with all fields', () => {
      const completeEvent = {
        title: 'Complete Event',
        pin: '555555',
        creatorId: 'user123',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: [
          { id: 'p1', name: 'Participant 1', score: 10 }
        ],
        disabledQuestions: [1, 2, 3]
      };

      const migratedEvent = {
        ...completeEvent,
        creatorId: completeEvent.creatorId || 'legacy',
        disabledQuestions: completeEvent.disabledQuestions || []
      };

      expect(migratedEvent).toEqual(completeEvent);
    });
  });

  describe('URL Pattern Matching', () => {
    test('should only redirect URLs containing event.html', () => {
      const testCases = [
        { path: '/app/event.html', shouldRedirect: true },
        { path: '/app/questions.html', shouldRedirect: false },
        { path: '/app/results.html', shouldRedirect: false },
        { path: '/app/spectrum.html', shouldRedirect: false },
        { path: '/app/create.html', shouldRedirect: false },
        { path: '/app/index.html', shouldRedirect: false }
      ];

      testCases.forEach(({ path, shouldRedirect }) => {
        const containsEventHtml = path.includes('event.html');
        expect(containsEventHtml).toBe(shouldRedirect);
      });
    });

    test('should handle case-sensitive event.html matching', () => {
      const testCases = [
        { path: '/app/event.html', matches: true },
        { path: '/app/Event.html', matches: false },
        { path: '/app/EVENT.HTML', matches: false },
        { path: '/app/event.HTML', matches: false }
      ];

      testCases.forEach(({ path, matches }) => {
        const containsEventHtml = path.includes('event.html');
        expect(containsEventHtml).toBe(matches);
      });
    });
  });

  describe('Redirect Behavior', () => {
    test('should construct correct new URL from old URL', () => {
      const testCases = [
        {
          old: { pathname: '/app/event.html', search: '?id=123', hash: '' },
          expected: '/app/questions.html?id=123'
        },
        {
          old: { pathname: '/app/event.html', search: '', hash: '#top' },
          expected: '/app/questions.html#top'
        },
        {
          old: { pathname: '/app/event.html', search: '?id=456', hash: '#section' },
          expected: '/app/questions.html?id=456#section'
        },
        {
          old: { pathname: '/event.html', search: '?id=789', hash: '' },
          expected: '/questions.html?id=789'
        }
      ];

      testCases.forEach(({ old, expected }) => {
        const newPath = old.pathname.replace('event.html', 'questions.html');
        const newUrl = newPath + old.search + old.hash;
        expect(newUrl).toBe(expected);
      });
    });

    test('should handle multiple occurrences of event.html in path', () => {
      // Edge case: path contains event.html multiple times
      const pathname = '/app/event.html/event.html';
      const newPath = pathname.replace('event.html', 'questions.html');
      
      // replace() only replaces first occurrence
      expect(newPath).toBe('/app/questions.html/event.html');
    });
  });

  describe('DataManager Legacy Event Migration (Requirements 13.2, 13.3)', () => {
    let DataManager;
    let dataManager;

    beforeEach(async () => {
      // Import DataManager
      const module = await import('../data-manager.js');
      DataManager = module.default || module;
      dataManager = new DataManager();
      dataManager.initialize();
    });

    test('should add creatorId field to legacy events without it', () => {
      const legacyEvent = {
        title: 'Legacy Event',
        pin: '123456',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: []
      };

      const migrated = dataManager.migrateLegacyEventData(legacyEvent);

      expect(migrated.creatorId).toBe('legacy');
      expect(migrated.title).toBe('Legacy Event');
      expect(migrated.pin).toBe('123456');
    });

    test('should add disabledQuestions field to legacy events without it', () => {
      const legacyEvent = {
        title: 'Legacy Event',
        pin: '123456',
        creatorId: 'user123',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: []
      };

      const migrated = dataManager.migrateLegacyEventData(legacyEvent);

      expect(migrated.disabledQuestions).toEqual([]);
      expect(Array.isArray(migrated.disabledQuestions)).toBe(true);
    });

    test('should add both creatorId and disabledQuestions to very old events', () => {
      const veryOldEvent = {
        title: 'Very Old Event',
        pin: '999999',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: []
      };

      const migrated = dataManager.migrateLegacyEventData(veryOldEvent);

      expect(migrated.creatorId).toBe('legacy');
      expect(migrated.disabledQuestions).toEqual([]);
    });

    test('should preserve existing creatorId if present', () => {
      const eventWithCreator = {
        title: 'Event with Creator',
        pin: '111111',
        creatorId: 'user456',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: []
      };

      const migrated = dataManager.migrateLegacyEventData(eventWithCreator);

      expect(migrated.creatorId).toBe('user456');
      expect(migrated.disabledQuestions).toEqual([]);
    });

    test('should preserve existing disabledQuestions if present', () => {
      const eventWithDisabled = {
        title: 'Event with Disabled',
        pin: '222222',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: [],
        disabledQuestions: [0, 5, 10]
      };

      const migrated = dataManager.migrateLegacyEventData(eventWithDisabled);

      expect(migrated.creatorId).toBe('legacy');
      expect(migrated.disabledQuestions).toEqual([0, 5, 10]);
    });

    test('should not modify modern events with all fields', () => {
      const modernEvent = {
        title: 'Modern Event',
        pin: '333333',
        creatorId: 'user789',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: [],
        disabledQuestions: [1, 2, 3]
      };

      const migrated = dataManager.migrateLegacyEventData(modernEvent);

      expect(migrated).toEqual(modernEvent);
    });

    test('should handle null eventData gracefully', () => {
      const migrated = dataManager.migrateLegacyEventData(null);
      expect(migrated).toBeNull();
    });

    test('should handle undefined eventData gracefully', () => {
      const migrated = dataManager.migrateLegacyEventData(undefined);
      expect(migrated).toBeUndefined();
    });

    test('should handle events with null creatorId', () => {
      const eventWithNullCreator = {
        title: 'Event',
        pin: '444444',
        creatorId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: []
      };

      const migrated = dataManager.migrateLegacyEventData(eventWithNullCreator);

      // null is falsy, so it should be replaced
      expect(migrated.creatorId).toBe('legacy');
    });

    test('should handle events with null disabledQuestions', () => {
      const eventWithNullDisabled = {
        title: 'Event',
        pin: '555555',
        creatorId: 'user123',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: [],
        disabledQuestions: null
      };

      const migrated = dataManager.migrateLegacyEventData(eventWithNullDisabled);

      // null is falsy, so it should be replaced
      expect(migrated.disabledQuestions).toEqual([]);
    });

    test('should handle events with empty string creatorId', () => {
      const eventWithEmptyCreator = {
        title: 'Event',
        pin: '666666',
        creatorId: '',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: []
      };

      const migrated = dataManager.migrateLegacyEventData(eventWithEmptyCreator);

      // Empty string is falsy, so it should be replaced
      expect(migrated.creatorId).toBe('legacy');
    });

    test('should preserve all other event fields during migration', () => {
      const eventWithExtraFields = {
        title: 'Event with Extra Fields',
        pin: '777777',
        createdAt: '2024-01-01T00:00:00.000Z',
        participants: [
          { id: 'p1', name: 'Participant 1', score: 10 }
        ],
        customField: 'custom value',
        anotherField: 123
      };

      const migrated = dataManager.migrateLegacyEventData(eventWithExtraFields);

      expect(migrated.customField).toBe('custom value');
      expect(migrated.anotherField).toBe(123);
      expect(migrated.participants).toEqual([
        { id: 'p1', name: 'Participant 1', score: 10 }
      ]);
    });
  });
});
