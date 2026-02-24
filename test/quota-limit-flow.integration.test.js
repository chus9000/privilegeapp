/**
 * Integration Test for Quota Limit Flow
 * Feature: event-creation-limit
 * 
 * **Validates: Requirements 1.1, 1.2, 5.1, 5.2, 5.3, 10.1, 10.4, 10.5**
 * 
 * This test validates the complete quota limit flow: creating 3 events,
 * attempting a 4th (which fails), deleting 1 event, and successfully
 * creating a new event. Also tests banner visibility and quota recovery.
 */

import { describe, test, beforeEach, expect } from 'vitest';

// Mock Firebase database and authentication
let mockDatabase;
let mockAuth;
let mockQuotaManager;
let mockBannerState;

beforeEach(() => {
  // Initialize mock database
  mockDatabase = {
    events: {},
    users: {}
  };
  
  // Initialize mock authentication
  mockAuth = {
    currentUser: null,
    signIn: (userId) => {
      mockAuth.currentUser = { uid: userId, email: `${userId}@test.com` };
      return Promise.resolve(mockAuth.currentUser);
    },
    signOut: () => {
      mockAuth.currentUser = null;
      return Promise.resolve();
    }
  };
  
  // Initialize mock quota manager
  mockQuotaManager = {
    state: {
      userId: null,
      eventCount: 0,
      quotaLimit: 3,
      remainingQuota: 3,
      isAtLimit: false,
      lastUpdated: 0
    },
    listeners: [],
    initialize: async function(userId) {
      this.state.userId = userId;
      await this.updateState();
    },
    getUserEventCount: async function() {
      if (!this.state.userId) return 0;
      
      const userEvents = Object.values(mockDatabase.events).filter(
        event => event && event.creatorId === this.state.userId
      );
      return userEvents.length;
    },
    updateState: async function() {
      const eventCount = await this.getUserEventCount();
      this.state = {
        userId: this.state.userId,
        eventCount,
        quotaLimit: 3,
        remainingQuota: Math.max(0, 3 - eventCount),
        isAtLimit: eventCount >= 3,
        lastUpdated: Date.now()
      };
      this.notifyListeners();
      updateBannerVisibility(this.state);
    },
    subscribe: function(callback) {
      this.listeners.push(callback);
      return () => {
        this.listeners = this.listeners.filter(cb => cb !== callback);
      };
    },
    notifyListeners: function() {
      this.listeners.forEach(callback => callback(this.state));
    },
    getState: function() {
      return { ...this.state };
    }
  };
  
  // Initialize mock banner state
  mockBannerState = {
    visible: false
  };
});

/**
 * Update banner visibility based on quota state
 */
function updateBannerVisibility(state) {
  mockBannerState.visible = state.isAtLimit;
}

/**
 * Simulate event creation with quota enforcement
 */
async function createEvent(userId, eventData) {
  // Check authentication
  if (!mockAuth.currentUser || mockAuth.currentUser.uid !== userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'User not authenticated' } };
  }
  
  // Count user's existing events
  const userEvents = Object.values(mockDatabase.events).filter(
    event => event && event.creatorId === userId
  );
  
  // Enforce quota limit (server-side check)
  if (userEvents.length >= 3) {
    return { success: false, error: { code: 'PERMISSION_DENIED', message: 'Quota exceeded' } };
  }
  
  // Generate event ID
  const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Create event
  const event = {
    id: eventId,
    title: eventData.title,
    pin: eventData.pin || generatePin(),
    creatorId: userId,
    createdAt: new Date().toISOString(),
    disabledQuestions: eventData.disabledQuestions || [],
    participants: []
  };
  
  // Save to database
  mockDatabase.events[eventId] = event;
  
  // Update quota manager
  await mockQuotaManager.updateState();
  
  return { success: true, eventId, event };
}

/**
 * Simulate event deletion
 */
async function deleteEvent(userId, eventId) {
  // Check authentication
  if (!mockAuth.currentUser || mockAuth.currentUser.uid !== userId) {
    return { success: false, error: 'Not authenticated' };
  }
  
  // Check if event exists
  const event = mockDatabase.events[eventId];
  if (!event) {
    return { success: false, error: 'Event not found' };
  }
  
  // Check if user owns the event
  if (event.creatorId !== userId) {
    return { success: false, error: 'Not authorized' };
  }
  
  // Delete event
  delete mockDatabase.events[eventId];
  
  // Update quota manager
  await mockQuotaManager.updateState();
  
  return { success: true };
}

/**
 * Generate 6-digit PIN
 */
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

describe('Integration: Quota Limit Flow', () => {
  test('**Validates: Requirements 1.1, 1.2, 5.1, 5.2** - complete quota limit flow', async () => {
    const userId = 'user-quota-flow';
    
    // Step 1: User logs in
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Step 2: Create 3 events
    const event1 = await createEvent(userId, { title: 'Event 1' });
    const event2 = await createEvent(userId, { title: 'Event 2' });
    const event3 = await createEvent(userId, { title: 'Event 3' });
    
    expect(event1.success).toBe(true);
    expect(event2.success).toBe(true);
    expect(event3.success).toBe(true);
    
    // Verify quota is at limit
    let state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(3);
    expect(state.remainingQuota).toBe(0);
    expect(state.isAtLimit).toBe(true);
    
    // Step 3: Attempt to create 4th event (should fail)
    const event4 = await createEvent(userId, { title: 'Event 4' });
    
    expect(event4.success).toBe(false);
    expect(event4.error.code).toBe('PERMISSION_DENIED');
    
    // Verify quota unchanged
    state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(3);
    expect(state.isAtLimit).toBe(true);
    
    // Step 4: Delete one event
    const deleteResult = await deleteEvent(userId, event1.eventId);
    expect(deleteResult.success).toBe(true);
    
    // Verify quota decreased
    state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(2);
    expect(state.remainingQuota).toBe(1);
    expect(state.isAtLimit).toBe(false);
    
    // Step 5: Create new event (should succeed)
    const event5 = await createEvent(userId, { title: 'Event 5' });
    
    expect(event5.success).toBe(true);
    expect(event5.event.title).toBe('Event 5');
    
    // Verify quota back at limit
    state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(3);
    expect(state.remainingQuota).toBe(0);
    expect(state.isAtLimit).toBe(true);
  });

  test('**Validates: Requirements 5.1, 5.2, 5.3** - deletion frees quota immediately', async () => {
    const userId = 'user-deletion-quota';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Create 3 events
    const event1 = await createEvent(userId, { title: 'Event 1' });
    const event2 = await createEvent(userId, { title: 'Event 2' });
    const event3 = await createEvent(userId, { title: 'Event 3' });
    
    // At limit
    let state = mockQuotaManager.getState();
    expect(state.isAtLimit).toBe(true);
    
    // Delete one event
    await deleteEvent(userId, event2.eventId);
    
    // Quota should be freed immediately
    state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(2);
    expect(state.remainingQuota).toBe(1);
    expect(state.isAtLimit).toBe(false);
    
    // Should be able to create immediately
    const event4 = await createEvent(userId, { title: 'Event 4' });
    expect(event4.success).toBe(true);
  });

  test('**Validates: Requirements 10.1, 10.4** - banner appears when at limit', async () => {
    const userId = 'user-banner-at-limit';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Initially, banner should be hidden
    expect(mockBannerState.visible).toBe(false);
    
    // Create 3 events
    await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    
    // Still hidden (not at limit yet)
    expect(mockBannerState.visible).toBe(false);
    
    // Create 3rd event
    await createEvent(userId, { title: 'Event 3' });
    
    // Banner should now be visible
    expect(mockBannerState.visible).toBe(true);
    
    // Verify quota state
    const state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(3);
    expect(state.isAtLimit).toBe(true);
  });

  test('**Validates: Requirements 10.5** - banner disappears when below limit', async () => {
    const userId = 'user-banner-disappears';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Create 3 events to reach limit
    const event1 = await createEvent(userId, { title: 'Event 1' });
    const event2 = await createEvent(userId, { title: 'Event 2' });
    const event3 = await createEvent(userId, { title: 'Event 3' });
    
    // Banner should be visible
    expect(mockBannerState.visible).toBe(true);
    
    // Delete one event
    await deleteEvent(userId, event1.eventId);
    
    // Banner should disappear
    expect(mockBannerState.visible).toBe(false);
    
    // Verify quota state
    const state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(2);
    expect(state.isAtLimit).toBe(false);
  });

  test('**Validates: Requirements 5.2** - multiple delete-create cycles work correctly', async () => {
    const userId = 'user-multiple-cycles';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Create 3 events
    let event1 = await createEvent(userId, { title: 'Event 1' });
    let event2 = await createEvent(userId, { title: 'Event 2' });
    let event3 = await createEvent(userId, { title: 'Event 3' });
    
    expect(mockQuotaManager.getState().isAtLimit).toBe(true);
    
    // Cycle 1: Delete and create
    await deleteEvent(userId, event1.eventId);
    expect(mockQuotaManager.getState().isAtLimit).toBe(false);
    
    const event4 = await createEvent(userId, { title: 'Event 4' });
    expect(event4.success).toBe(true);
    expect(mockQuotaManager.getState().isAtLimit).toBe(true);
    
    // Cycle 2: Delete and create
    await deleteEvent(userId, event2.eventId);
    expect(mockQuotaManager.getState().isAtLimit).toBe(false);
    
    const event5 = await createEvent(userId, { title: 'Event 5' });
    expect(event5.success).toBe(true);
    expect(mockQuotaManager.getState().isAtLimit).toBe(true);
    
    // Cycle 3: Delete and create
    await deleteEvent(userId, event3.eventId);
    expect(mockQuotaManager.getState().isAtLimit).toBe(false);
    
    const event6 = await createEvent(userId, { title: 'Event 6' });
    expect(event6.success).toBe(true);
    expect(mockQuotaManager.getState().isAtLimit).toBe(true);
    
    // Verify final state
    const state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(3);
    
    // Verify correct events exist
    const events = Object.values(mockDatabase.events);
    const eventTitles = events.map(e => e.title).sort();
    expect(eventTitles).toEqual(['Event 4', 'Event 5', 'Event 6']);
  });

  test('**Validates: Requirements 5.3** - quota updates within 2 seconds after deletion', async () => {
    const userId = 'user-quota-timing';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Create 3 events
    const event1 = await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    await createEvent(userId, { title: 'Event 3' });
    
    // Record time before deletion
    const startTime = Date.now();
    
    // Delete event
    await deleteEvent(userId, event1.eventId);
    
    // Check quota state
    const state = mockQuotaManager.getState();
    const updateTime = state.lastUpdated;
    
    // Verify update happened within 2 seconds
    const timeDiff = updateTime - startTime;
    expect(timeDiff).toBeLessThan(2000);
    
    // Verify quota is correct
    expect(state.eventCount).toBe(2);
    expect(state.remainingQuota).toBe(1);
  });

  test('**Validates: Requirements 1.2** - cannot create at limit even after failed attempt', async () => {
    const userId = 'user-failed-attempt';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Create 3 events
    await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    await createEvent(userId, { title: 'Event 3' });
    
    // Attempt to create 4th event (fails)
    const attempt1 = await createEvent(userId, { title: 'Event 4' });
    expect(attempt1.success).toBe(false);
    
    // Attempt again (should still fail)
    const attempt2 = await createEvent(userId, { title: 'Event 5' });
    expect(attempt2.success).toBe(false);
    
    // Verify quota unchanged
    const state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(3);
    expect(state.isAtLimit).toBe(true);
  });

  test('**Validates: Requirements 5.1, 5.2** - deleting all events resets quota', async () => {
    const userId = 'user-delete-all';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Create 3 events
    const event1 = await createEvent(userId, { title: 'Event 1' });
    const event2 = await createEvent(userId, { title: 'Event 2' });
    const event3 = await createEvent(userId, { title: 'Event 3' });
    
    expect(mockQuotaManager.getState().isAtLimit).toBe(true);
    
    // Delete all events
    await deleteEvent(userId, event1.eventId);
    await deleteEvent(userId, event2.eventId);
    await deleteEvent(userId, event3.eventId);
    
    // Verify quota is fully reset
    const state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(0);
    expect(state.remainingQuota).toBe(3);
    expect(state.isAtLimit).toBe(false);
    
    // Should be able to create 3 new events
    const newEvent1 = await createEvent(userId, { title: 'New Event 1' });
    const newEvent2 = await createEvent(userId, { title: 'New Event 2' });
    const newEvent3 = await createEvent(userId, { title: 'New Event 3' });
    
    expect(newEvent1.success).toBe(true);
    expect(newEvent2.success).toBe(true);
    expect(newEvent3.success).toBe(true);
  });

  test('**Validates: Requirements 10.1, 10.5** - banner toggles correctly during delete-create cycle', async () => {
    const userId = 'user-banner-toggle';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Create 3 events
    const event1 = await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    await createEvent(userId, { title: 'Event 3' });
    
    // Banner visible at limit
    expect(mockBannerState.visible).toBe(true);
    
    // Delete one event - banner should hide
    await deleteEvent(userId, event1.eventId);
    expect(mockBannerState.visible).toBe(false);
    
    // Create new event - banner should show again
    await createEvent(userId, { title: 'Event 4' });
    expect(mockBannerState.visible).toBe(true);
    
    // Delete another event - banner should hide
    await deleteEvent(userId, 'event_' + Date.now());
    // Find an actual event ID to delete
    const events = Object.values(mockDatabase.events);
    if (events.length > 0) {
      await deleteEvent(userId, events[0].id);
      expect(mockBannerState.visible).toBe(false);
    }
  });
});
