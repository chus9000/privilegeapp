/**
 * Integration Tests for Offline-to-Online Sync
 * Tests the complete offline sync workflow
 * Requirements: 14.4, 14.5
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Offline-to-Online Sync Integration Tests', () => {
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
    
    // Override window.localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      writable: true,
      configurable: true
    });
    
    // Mock navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true
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

  test('complete offline-to-online sync workflow', async () => {
    // Step 1: Start online, save an event
    const eventId1 = 'event_online_1';
    const eventData1 = {
      title: 'Online Event',
      pin: '111111',
      creatorId: 'user_1',
      disabledQuestions: [],
      participants: [],
      createdAt: new Date().toISOString()
    };

    mockFirebaseAPI.saveEvent.mockResolvedValue(true);
    await dataManager.saveEvent(eventId1, eventData1);

    expect(mockFirebaseAPI.saveEvent).toHaveBeenCalledWith(eventId1, eventData1);
    expect(dataManager.syncQueue.length).toBe(0);

    // Step 2: Go offline
    dataManager.isOnline = false;

    // Step 3: Save events while offline
    const eventId2 = 'event_offline_1';
    const eventData2 = {
      title: 'Offline Event 1',
      pin: '222222',
      creatorId: 'user_1',
      disabledQuestions: [0, 1],
      participants: [],
      createdAt: new Date().toISOString()
    };

    const eventId3 = 'event_offline_2';
    const eventData3 = {
      title: 'Offline Event 2',
      pin: '333333',
      creatorId: 'user_1',
      disabledQuestions: [2, 3],
      participants: [],
      createdAt: new Date().toISOString()
    };

    await dataManager.saveEvent(eventId2, eventData2);
    await dataManager.saveEvent(eventId3, eventData3);

    // Verify events are queued
    expect(dataManager.syncQueue.length).toBe(2);
    expect(dataManager.syncQueue[0].type).toBe('saveEvent');
    expect(dataManager.syncQueue[0].eventId).toBe(eventId2);
    expect(dataManager.syncQueue[1].eventId).toBe(eventId3);

    // Verify events are in localStorage
    const stored2 = JSON.parse(localStorage.getItem('event_event_offline_1'));
    const stored3 = JSON.parse(localStorage.getItem('event_event_offline_2'));
    expect(stored2).toEqual(eventData2);
    expect(stored3).toEqual(eventData3);

    // Step 4: Add participant while offline
    const participant = {
      id: 'participant_1',
      name: 'Alice',
      avatar: '🐱',
      score: 10,
      answers: { 0: 1, 1: 0 },
      createdAt: new Date().toISOString()
    };

    mockFirebaseAPI.loadEvent.mockResolvedValue(eventData2);
    await dataManager.updateParticipant(eventId2, participant);

    // Verify participant update is queued
    expect(dataManager.syncQueue.length).toBe(3);
    expect(dataManager.syncQueue[2].type).toBe('updateParticipant');

    // Step 5: Come back online
    dataManager.isOnline = true;
    mockFirebaseAPI.saveEvent.mockResolvedValue(true);
    mockFirebaseAPI.updateParticipant.mockResolvedValue(true);

    // Step 6: Process sync queue
    await dataManager.processSyncQueue();

    // Verify all operations were synced
    expect(mockFirebaseAPI.saveEvent).toHaveBeenCalledWith(eventId2, eventData2);
    expect(mockFirebaseAPI.saveEvent).toHaveBeenCalledWith(eventId3, eventData3);
    expect(mockFirebaseAPI.updateParticipant).toHaveBeenCalledWith(eventId2, participant);

    // Verify queue is empty
    expect(dataManager.syncQueue.length).toBe(0);

    // Verify sync queue is cleared from localStorage
    const storedQueue = localStorage.getItem('syncQueue');
    expect(JSON.parse(storedQueue)).toEqual([]);
  });

  test('network reconnection triggers automatic sync', async () => {
    // Start offline
    dataManager.isOnline = false;

    // Queue some operations
    const eventId = 'event_auto_sync';
    const eventData = {
      title: 'Auto Sync Event',
      pin: '444444',
      creatorId: 'user_2',
      disabledQuestions: [],
      participants: [],
      createdAt: new Date().toISOString()
    };

    await dataManager.saveEvent(eventId, eventData);
    expect(dataManager.syncQueue.length).toBe(1);

    // Mock successful Firebase save
    mockFirebaseAPI.saveEvent.mockResolvedValue(true);

    // Simulate network reconnection by triggering the online event
    dataManager.isOnline = true;
    
    // Manually trigger the online event handler (simulating browser behavior)
    const onlineEvent = new window.Event('online');
    window.dispatchEvent(onlineEvent);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify sync was triggered
    expect(mockFirebaseAPI.saveEvent).toHaveBeenCalledWith(eventId, eventData);
    expect(dataManager.syncQueue.length).toBe(0);
  });

  test('failed sync operations remain in queue', async () => {
    // Start offline
    dataManager.isOnline = false;

    // Queue multiple operations
    const event1 = {
      id: 'event_fail_1',
      data: {
        title: 'Event 1',
        pin: '555555',
        creatorId: 'user_3',
        disabledQuestions: [],
        participants: [],
        createdAt: new Date().toISOString()
      }
    };

    const event2 = {
      id: 'event_fail_2',
      data: {
        title: 'Event 2',
        pin: '666666',
        creatorId: 'user_3',
        disabledQuestions: [],
        participants: [],
        createdAt: new Date().toISOString()
      }
    };

    await dataManager.saveEvent(event1.id, event1.data);
    await dataManager.saveEvent(event2.id, event2.data);

    expect(dataManager.syncQueue.length).toBe(2);

    // Come back online
    dataManager.isOnline = true;

    // Mock first operation succeeds, second fails
    mockFirebaseAPI.saveEvent
      .mockResolvedValueOnce(true)  // First call succeeds
      .mockResolvedValueOnce(false); // Second call fails

    await dataManager.processSyncQueue();

    // Verify only failed operation remains in queue
    expect(dataManager.syncQueue.length).toBe(1);
    expect(dataManager.syncQueue[0].eventId).toBe(event2.id);

    // Verify failed operation is persisted to localStorage
    const storedQueue = JSON.parse(localStorage.getItem('syncQueue'));
    expect(storedQueue.length).toBe(1);
    expect(storedQueue[0].eventId).toBe(event2.id);
  });

  test('sync queue persists across page reloads', async () => {
    // Start offline and queue operations
    dataManager.isOnline = false;

    const eventId = 'event_persist';
    const eventData = {
      title: 'Persistent Event',
      pin: '777777',
      creatorId: 'user_4',
      disabledQuestions: [],
      participants: [],
      createdAt: new Date().toISOString()
    };

    await dataManager.saveEvent(eventId, eventData);
    expect(dataManager.syncQueue.length).toBe(1);

    // Verify queue is in localStorage
    const storedQueue = JSON.parse(localStorage.getItem('syncQueue'));
    expect(storedQueue.length).toBe(1);
    expect(storedQueue[0].eventId).toBe(eventId);

    // Simulate page reload by creating new DataManager instance
    const DataManagerModule = await import('../data-manager.js');
    const DataManager = DataManagerModule.default || DataManagerModule;
    const newDataManager = new DataManager();
    newDataManager.firebaseAPI = mockFirebaseAPI;
    newDataManager.isOnline = false; // Prevent auto-sync
    newDataManager.initialize();

    // Verify queue was loaded from localStorage
    expect(newDataManager.syncQueue.length).toBe(1);
    expect(newDataManager.syncQueue[0].eventId).toBe(eventId);
    expect(newDataManager.syncQueue[0].type).toBe('saveEvent');
  });

  test('manual sync can be triggered', async () => {
    // Queue operations while offline
    dataManager.isOnline = false;

    const eventId = 'event_manual';
    const eventData = {
      title: 'Manual Sync Event',
      pin: '888888',
      creatorId: 'user_5',
      disabledQuestions: [],
      participants: [],
      createdAt: new Date().toISOString()
    };

    await dataManager.saveEvent(eventId, eventData);
    expect(dataManager.syncQueue.length).toBe(1);

    // Come back online
    dataManager.isOnline = true;
    mockFirebaseAPI.saveEvent.mockResolvedValue(true);

    // Manually trigger sync
    await dataManager.manualSync();

    // Verify sync completed
    expect(mockFirebaseAPI.saveEvent).toHaveBeenCalledWith(eventId, eventData);
    expect(dataManager.syncQueue.length).toBe(0);
  });

  test('sync queue status provides accurate information', () => {
    // Add some operations to the queue
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
      },
      {
        type: 'deleteEvent',
        eventId: 'event_3',
        data: null,
        timestamp: Date.now()
      }
    ];

    dataManager.isOnline = true;
    dataManager.isSyncing = false;

    const status = dataManager.getSyncQueueStatus();

    expect(status.queueLength).toBe(3);
    expect(status.isOnline).toBe(true);
    expect(status.isSyncing).toBe(false);
    expect(status.operations).toHaveLength(3);
    expect(status.operations[0].type).toBe('saveEvent');
    expect(status.operations[1].type).toBe('updateParticipant');
    expect(status.operations[2].type).toBe('deleteEvent');
  });

  test('delete operations sync correctly', async () => {
    // Start offline
    dataManager.isOnline = false;

    const eventId = 'event_delete';
    
    // Pre-populate localStorage
    localStorage.setItem('event_event_delete', JSON.stringify({ title: 'To Delete' }));

    // Delete while offline
    await dataManager.deleteEvent(eventId);

    // Verify delete is queued
    expect(dataManager.syncQueue.length).toBe(1);
    expect(dataManager.syncQueue[0].type).toBe('deleteEvent');
    expect(dataManager.syncQueue[0].eventId).toBe(eventId);

    // Verify deleted from localStorage
    expect(localStorage.getItem('event_event_delete')).toBeNull();

    // Come back online and sync
    dataManager.isOnline = true;
    mockFirebaseAPI.deleteEvent.mockResolvedValue(true);

    await dataManager.processSyncQueue();

    // Verify delete was synced to Firebase
    expect(mockFirebaseAPI.deleteEvent).toHaveBeenCalledWith(eventId);
    expect(dataManager.syncQueue.length).toBe(0);
  });
});
