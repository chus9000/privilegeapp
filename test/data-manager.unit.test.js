/**
 * Unit Tests for Data Manager
 * Tests data operations with Firebase and localStorage fallback
 * Requirements: 11.1, 11.3, 11.4, 14.1, 14.2
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Data Manager Unit Tests', () => {
  let window;
  let document;
  let localStorage;
  let dataManager;
  let mockFirebaseAPI;

  beforeEach(async () => {
    // Create a fresh DOM for each test
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost'
    });
    window = dom.window;
    document = window.document;
    
    // Mock localStorage
    localStorage = {
      data: {},
      getItem(key) {
        return this.data[key] || null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
      removeItem(key) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      }
    };
    
    global.window = window;
    global.document = document;
    global.localStorage = localStorage;
    
    // Override window.localStorage using Object.defineProperty
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      writable: true,
      configurable: true
    });
    
    // Mock FirebaseAPI
    mockFirebaseAPI = {
      saveEvent: vi.fn(),
      loadEvent: vi.fn(),
      updateParticipant: vi.fn(),
      loadEventsByCreator: vi.fn(),
      deleteEvent: vi.fn()
    };
    window.FirebaseAPI = mockFirebaseAPI;
    
    // Import and initialize DataManager
    const DataManagerModule = await import('../data-manager.js');
    const DataManager = DataManagerModule.default || DataManagerModule;
    dataManager = new DataManager();
    dataManager.initialize();
  });

  describe('Initialization (Requirement 11.1)', () => {
    test('initializes with FirebaseAPI when available', () => {
      expect(dataManager.initialized).toBe(true);
      expect(dataManager.firebaseAPI).toBe(mockFirebaseAPI);
    });

    test('initializes without FirebaseAPI when not available', async () => {
      // Remove FirebaseAPI
      delete window.FirebaseAPI;
      
      const DataManagerModule = await import('../data-manager.js');
      const DataManager = DataManagerModule.default || DataManagerModule;
      const dm = new DataManager();
      dm.initialize();
      
      expect(dm.initialized).toBe(true);
      expect(dm.firebaseAPI).toBeNull();
    });
  });

  describe('saveEvent Method (Requirements 11.1, 11.3)', () => {
    test('saves event to Firebase and localStorage', async () => {
      const eventId = 'test_event_123';
      const eventData = {
        title: 'Test Event',
        pin: '123456',
        creatorId: 'user_123',
        disabledQuestions: [0, 5],
        participants: [],
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockFirebaseAPI.saveEvent.mockResolvedValue(true);

      const result = await dataManager.saveEvent(eventId, eventData);

      expect(result).toBe(true);
      expect(mockFirebaseAPI.saveEvent).toHaveBeenCalledWith(eventId, eventData);
      
      // Check localStorage
      const stored = JSON.parse(localStorage.getItem('event_test_event_123'));
      expect(stored).toEqual(eventData);
    });

    test('returns false for invalid parameters', async () => {
      const result1 = await dataManager.saveEvent(null, {});
      const result2 = await dataManager.saveEvent('event_123', null);
      const result3 = await dataManager.saveEvent('event_123', { pin: '123456' }); // Missing title

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    test('uses localStorage fallback when Firebase fails', async () => {
      const eventId = 'test_event_456';
      const eventData = {
        title: 'Test Event',
        pin: '654321',
        creatorId: 'user_456',
        disabledQuestions: [],
        participants: [],
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockFirebaseAPI.saveEvent.mockResolvedValue(false);

      const result = await dataManager.saveEvent(eventId, eventData);

      expect(result).toBe(true); // Still returns true because localStorage succeeded
      
      // Check localStorage
      const stored = JSON.parse(localStorage.getItem('event_test_event_456'));
      expect(stored).toEqual(eventData);
    });

    test('handles Firebase errors gracefully', async () => {
      const eventId = 'test_event_789';
      const eventData = {
        title: 'Test Event',
        pin: '789012',
        creatorId: 'user_789',
        disabledQuestions: [],
        participants: [],
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockFirebaseAPI.saveEvent.mockRejectedValue(new Error('Network error'));

      const result = await dataManager.saveEvent(eventId, eventData);

      expect(result).toBe(true); // Still returns true because localStorage succeeded
      
      // Check localStorage
      const stored = JSON.parse(localStorage.getItem('event_test_event_789'));
      expect(stored).toEqual(eventData);
    });
  });

  describe('loadEvent Method (Requirement 11.1)', () => {
    test('loads event from Firebase', async () => {
      const eventId = 'test_event_123';
      const eventData = {
        title: 'Test Event',
        pin: '123456',
        participants: [],
        disabledQuestions: []
      };

      mockFirebaseAPI.loadEvent.mockResolvedValue(eventData);

      const result = await dataManager.loadEvent(eventId);

      expect(result).toEqual(eventData);
      expect(mockFirebaseAPI.loadEvent).toHaveBeenCalledWith(eventId);
      
      // Should cache in localStorage
      const cached = JSON.parse(localStorage.getItem('event_test_event_123'));
      expect(cached).toEqual(eventData);
    });

    test('falls back to localStorage when Firebase fails', async () => {
      const eventId = 'test_event_456';
      const eventData = {
        title: 'Cached Event',
        pin: '654321',
        participants: [],
        disabledQuestions: []
      };

      // Pre-populate localStorage
      localStorage.setItem('event_test_event_456', JSON.stringify(eventData));

      mockFirebaseAPI.loadEvent.mockResolvedValue(null);

      const result = await dataManager.loadEvent(eventId);

      // Migration adds creatorId if missing
      expect(result).toEqual({
        ...eventData,
        creatorId: 'legacy'
      });
    });

    test('returns null when event not found', async () => {
      mockFirebaseAPI.loadEvent.mockResolvedValue(null);

      const result = await dataManager.loadEvent('nonexistent_event');

      expect(result).toBeNull();
    });

    test('returns null for invalid eventId', async () => {
      const result = await dataManager.loadEvent(null);

      expect(result).toBeNull();
    });
  });

  describe('updateParticipant Method (Requirements 11.4, 14.3)', () => {
    test('updates participant in Firebase and localStorage', async () => {
      const eventId = 'test_event_123';
      const participant = {
        id: 'participant_1',
        name: 'Alice',
        avatar: '🐱',
        score: 10,
        answers: { 0: 1, 1: 0 },
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      // Pre-populate event data
      const eventData = {
        title: 'Test Event',
        pin: '123456',
        participants: [],
        disabledQuestions: []
      };
      localStorage.setItem('event_test_event_123', JSON.stringify(eventData));
      mockFirebaseAPI.loadEvent.mockResolvedValue(eventData);
      mockFirebaseAPI.updateParticipant.mockResolvedValue(true);

      const result = await dataManager.updateParticipant(eventId, participant);

      expect(result).toBe(true);
      expect(mockFirebaseAPI.updateParticipant).toHaveBeenCalledWith(eventId, participant);
      
      // Check localStorage was updated
      const stored = JSON.parse(localStorage.getItem('event_test_event_123'));
      expect(stored.participants).toHaveLength(1);
      expect(stored.participants[0]).toEqual(participant);
    });

    test('adds new participant when not existing', async () => {
      const eventId = 'test_event_123';
      const participant1 = {
        id: 'participant_1',
        name: 'Alice',
        avatar: '🐱',
        score: 10,
        answers: {},
        createdAt: '2024-01-01T00:00:00.000Z'
      };
      const participant2 = {
        id: 'participant_2',
        name: 'Bob',
        avatar: '🐶',
        score: 15,
        answers: {},
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      // Pre-populate with one participant
      const eventData = {
        title: 'Test Event',
        pin: '123456',
        participants: [participant1],
        disabledQuestions: []
      };
      localStorage.setItem('event_test_event_123', JSON.stringify(eventData));
      mockFirebaseAPI.loadEvent.mockResolvedValue(eventData);
      mockFirebaseAPI.updateParticipant.mockResolvedValue(true);

      const result = await dataManager.updateParticipant(eventId, participant2);

      expect(result).toBe(true);
      
      // Check localStorage has both participants
      const stored = JSON.parse(localStorage.getItem('event_test_event_123'));
      expect(stored.participants).toHaveLength(2);
      expect(stored.participants[1]).toEqual(participant2);
    });

    test('updates existing participant', async () => {
      const eventId = 'test_event_123';
      const participant = {
        id: 'participant_1',
        name: 'Alice',
        avatar: '🐱',
        score: 10,
        answers: {},
        createdAt: '2024-01-01T00:00:00.000Z'
      };
      const updatedParticipant = {
        ...participant,
        score: 20,
        answers: { 0: 1, 1: 1 }
      };

      // Pre-populate with participant
      const eventData = {
        title: 'Test Event',
        pin: '123456',
        participants: [participant],
        disabledQuestions: []
      };
      localStorage.setItem('event_test_event_123', JSON.stringify(eventData));
      mockFirebaseAPI.loadEvent.mockResolvedValue(eventData);
      mockFirebaseAPI.updateParticipant.mockResolvedValue(true);

      const result = await dataManager.updateParticipant(eventId, updatedParticipant);

      expect(result).toBe(true);
      
      // Check localStorage was updated
      const stored = JSON.parse(localStorage.getItem('event_test_event_123'));
      expect(stored.participants).toHaveLength(1);
      expect(stored.participants[0].score).toBe(20);
    });

    test('returns false for invalid parameters', async () => {
      const result1 = await dataManager.updateParticipant(null, {});
      const result2 = await dataManager.updateParticipant('event_123', null);
      const result3 = await dataManager.updateParticipant('event_123', { name: 'Alice' }); // Missing id

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });
  });

  describe('loadEventsByCreator Method (Requirements 4.1, 4.5)', () => {
    test('loads events from Firebase', async () => {
      const userId = 'user_123';
      const events = [
        {
          id: 'event_1',
          title: 'Event 1',
          creatorId: 'user_123',
          participants: []
        },
        {
          id: 'event_2',
          title: 'Event 2',
          creatorId: 'user_123',
          participants: []
        }
      ];

      mockFirebaseAPI.loadEventsByCreator.mockResolvedValue(events);

      const result = await dataManager.loadEventsByCreator(userId);

      expect(result).toEqual(events);
      expect(mockFirebaseAPI.loadEventsByCreator).toHaveBeenCalledWith(userId);
      
      // Should cache in localStorage
      const cached = JSON.parse(localStorage.getItem('events_user_123'));
      expect(cached).toEqual(events);
    });

    test('falls back to localStorage when Firebase fails', async () => {
      const userId = 'user_456';
      const events = [
        {
          id: 'event_3',
          title: 'Cached Event',
          creatorId: 'user_456',
          participants: []
        }
      ];

      // Pre-populate localStorage
      localStorage.setItem('events_user_456', JSON.stringify(events));

      mockFirebaseAPI.loadEventsByCreator.mockResolvedValue([]);

      const result = await dataManager.loadEventsByCreator(userId);

      // Migration adds disabledQuestions if missing
      expect(result).toEqual([
        {
          ...events[0],
          disabledQuestions: []
        }
      ]);
    });

    test('returns empty array when no events found', async () => {
      mockFirebaseAPI.loadEventsByCreator.mockResolvedValue([]);

      const result = await dataManager.loadEventsByCreator('user_789');

      expect(result).toEqual([]);
    });

    test('returns empty array for invalid userId', async () => {
      const result = await dataManager.loadEventsByCreator(null);

      expect(result).toEqual([]);
    });
  });

  describe('deleteEvent Method (Requirement 11.3)', () => {
    test('deletes event from Firebase and localStorage', async () => {
      const eventId = 'test_event_123';
      
      // Pre-populate localStorage
      localStorage.setItem('event_test_event_123', JSON.stringify({ title: 'Test' }));

      mockFirebaseAPI.deleteEvent.mockResolvedValue(true);

      const result = await dataManager.deleteEvent(eventId);

      expect(result).toBe(true);
      expect(mockFirebaseAPI.deleteEvent).toHaveBeenCalledWith(eventId);
      expect(localStorage.getItem('event_test_event_123')).toBeNull();
    });

    test('deletes from localStorage even if Firebase fails', async () => {
      const eventId = 'test_event_456';
      
      // Pre-populate localStorage
      localStorage.setItem('event_test_event_456', JSON.stringify({ title: 'Test' }));

      mockFirebaseAPI.deleteEvent.mockResolvedValue(false);

      const result = await dataManager.deleteEvent(eventId);

      expect(result).toBe(true); // Still returns true because localStorage deletion succeeded
      expect(localStorage.getItem('event_test_event_456')).toBeNull();
    });

    test('returns false for invalid eventId', async () => {
      const result = await dataManager.deleteEvent(null);

      expect(result).toBe(false);
    });
  });

  describe('localStorage Operations (Requirements 14.1, 14.2)', () => {
    test('saveToLocalStorage stores data correctly', () => {
      const data = { title: 'Test', value: 123 };
      
      dataManager.saveToLocalStorage('test_key', data);
      
      const stored = localStorage.getItem('test_key');
      expect(JSON.parse(stored)).toEqual(data);
    });

    test('loadFromLocalStorage retrieves data correctly', () => {
      const data = { title: 'Test', value: 456 };
      localStorage.setItem('test_key', JSON.stringify(data));
      
      const loaded = dataManager.loadFromLocalStorage('test_key');
      
      expect(loaded).toEqual(data);
    });

    test('loadFromLocalStorage returns null for non-existent key', () => {
      const loaded = dataManager.loadFromLocalStorage('nonexistent_key');
      
      expect(loaded).toBeNull();
    });

    test('loadFromLocalStorage handles invalid JSON gracefully', () => {
      localStorage.setItem('invalid_key', 'not valid json{');
      
      const loaded = dataManager.loadFromLocalStorage('invalid_key');
      
      expect(loaded).toBeNull();
    });
  });

  describe('syncToFirebase Method (Requirement 14.5)', () => {
    test('syncs localStorage data to Firebase', async () => {
      const eventId = 'test_event_123';
      const eventData = {
        title: 'Test Event',
        pin: '123456',
        participants: [],
        disabledQuestions: []
      };

      // Pre-populate localStorage
      localStorage.setItem('event_test_event_123', JSON.stringify(eventData));

      mockFirebaseAPI.saveEvent.mockResolvedValue(true);

      const result = await dataManager.syncToFirebase(eventId);

      expect(result).toBe(true);
      expect(mockFirebaseAPI.saveEvent).toHaveBeenCalledWith(eventId, eventData);
    });

    test('returns false when no local data exists', async () => {
      const result = await dataManager.syncToFirebase('nonexistent_event');

      expect(result).toBe(false);
    });

    test('returns false when Firebase is not available', async () => {
      const eventId = 'test_event_456';
      const eventData = { title: 'Test' };
      
      localStorage.setItem('event_test_event_456', JSON.stringify(eventData));
      
      // Remove FirebaseAPI
      dataManager.firebaseAPI = null;

      const result = await dataManager.syncToFirebase(eventId);

      expect(result).toBe(false);
    });
  });

  describe('Sync Queue Operations (Requirements 14.2, 14.4)', () => {
    test('adds operations to sync queue when offline', async () => {
      // Simulate offline state
      dataManager.isOnline = false;

      const eventId = 'test_event_offline';
      const eventData = {
        title: 'Offline Event',
        pin: '123456',
        creatorId: 'user_123',
        disabledQuestions: [],
        participants: [],
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      await dataManager.saveEvent(eventId, eventData);

      const status = dataManager.getSyncQueueStatus();
      expect(status.queueLength).toBeGreaterThan(0);
      expect(status.isOnline).toBe(false);
      expect(status.operations[0].type).toBe('saveEvent');
      expect(status.operations[0].eventId).toBe(eventId);
    });

    test('processes sync queue when coming back online', async () => {
      // Start offline
      dataManager.isOnline = false;
      dataManager.syncQueue = [];

      const eventId = 'test_event_sync';
      const eventData = {
        title: 'Sync Event',
        pin: '654321',
        creatorId: 'user_456',
        disabledQuestions: [],
        participants: [],
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      // Queue an operation
      await dataManager.saveEvent(eventId, eventData);
      expect(dataManager.syncQueue.length).toBe(1);

      // Mock Firebase success
      mockFirebaseAPI.saveEvent.mockResolvedValue(true);

      // Come back online and process queue
      dataManager.isOnline = true;
      await dataManager.processSyncQueue();

      // Queue should be empty after successful sync
      expect(dataManager.syncQueue.length).toBe(0);
      expect(mockFirebaseAPI.saveEvent).toHaveBeenCalledWith(eventId, eventData);
    });

    test('retains failed operations in sync queue', async () => {
      dataManager.isOnline = true;
      dataManager.syncQueue = [];

      const eventId = 'test_event_fail';
      const eventData = {
        title: 'Fail Event',
        pin: '111111',
        creatorId: 'user_789',
        disabledQuestions: [],
        participants: [],
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      // Add to queue manually
      dataManager.addToSyncQueue({
        type: 'saveEvent',
        eventId,
        data: eventData
      });

      // Mock Firebase failure
      mockFirebaseAPI.saveEvent.mockResolvedValue(false);

      await dataManager.processSyncQueue();

      // Failed operation should remain in queue
      expect(dataManager.syncQueue.length).toBe(1);
      expect(dataManager.syncQueue[0].eventId).toBe(eventId);
    });

    test('getSyncQueueStatus returns correct information', () => {
      dataManager.syncQueue = [
        {
          type: 'saveEvent',
          eventId: 'event_1',
          data: {},
          timestamp: Date.now()
        },
        {
          type: 'updateParticipant',
          eventId: 'event_2',
          data: {},
          timestamp: Date.now()
        }
      ];
      dataManager.isOnline = true;
      dataManager.isSyncing = false;

      const status = dataManager.getSyncQueueStatus();

      expect(status.queueLength).toBe(2);
      expect(status.isOnline).toBe(true);
      expect(status.isSyncing).toBe(false);
      expect(status.operations).toHaveLength(2);
      expect(status.operations[0].type).toBe('saveEvent');
      expect(status.operations[1].type).toBe('updateParticipant');
    });

    test('manualSync triggers queue processing', async () => {
      dataManager.syncQueue = [
        {
          type: 'saveEvent',
          eventId: 'event_manual',
          data: {
            title: 'Manual Sync',
            pin: '999999',
            creatorId: 'user_manual',
            disabledQuestions: [],
            participants: [],
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          timestamp: Date.now()
        }
      ];

      mockFirebaseAPI.saveEvent.mockResolvedValue(true);

      await dataManager.manualSync();

      expect(dataManager.syncQueue.length).toBe(0);
      expect(mockFirebaseAPI.saveEvent).toHaveBeenCalled();
    });

    test('sync queue persists to localStorage', () => {
      const operation = {
        type: 'saveEvent',
        eventId: 'event_persist',
        data: { title: 'Persist Test' }
      };

      dataManager.addToSyncQueue(operation);

      const stored = localStorage.getItem('syncQueue');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('saveEvent');
      expect(parsed[0].eventId).toBe('event_persist');
    });

    test('sync queue loads from localStorage on initialization', async () => {
      // Pre-populate localStorage with a queue
      const queue = [
        {
          type: 'saveEvent',
          eventId: 'event_loaded',
          data: { title: 'Loaded Event' },
          timestamp: Date.now()
        }
      ];
      localStorage.setItem('syncQueue', JSON.stringify(queue));

      // Create new instance
      const DataManagerModule = await import('../data-manager.js');
      const DataManager = DataManagerModule.default || DataManagerModule;
      const newDM = new DataManager();
      newDM.firebaseAPI = mockFirebaseAPI;
      newDM.isOnline = false; // Prevent auto-sync
      newDM.initialize();

      expect(newDM.syncQueue).toHaveLength(1);
      expect(newDM.syncQueue[0].eventId).toBe('event_loaded');
    });
  });
});
