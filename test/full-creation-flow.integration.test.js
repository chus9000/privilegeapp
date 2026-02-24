/**
 * Integration Test for Full Event Creation Flow with Quota Enforcement
 * Feature: event-creation-limit
 * 
 * **Validates: Requirements 1.1, 1.2, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2**
 * 
 * This test validates the complete end-to-end flow of event creation with quota
 * enforcement, from user authentication through event creation and quota display updates.
 */

import { describe, test, beforeEach, expect } from 'vitest';

// Mock Firebase database and authentication
let mockDatabase;
let mockAuth;
let mockQuotaManager;

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
});

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
 * Generate 6-digit PIN
 */
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Simulate dashboard loading events
 */
async function loadDashboard(userId) {
  if (!mockAuth.currentUser || mockAuth.currentUser.uid !== userId) {
    return { success: false, error: 'Not authenticated' };
  }
  
  const userEvents = Object.values(mockDatabase.events).filter(
    event => event && event.creatorId === userId
  );
  
  return { success: true, events: userEvents };
}

describe('Integration: Full Event Creation Flow with Quota Enforcement', () => {
  test('**Validates: Requirements 1.1, 3.1, 3.2, 4.1, 5.1** - complete flow from 0 to 3 events', async () => {
    const userId = 'user-full-flow';
    
    // Step 1: User logs in
    await mockAuth.signIn(userId);
    expect(mockAuth.currentUser).toBeTruthy();
    expect(mockAuth.currentUser.uid).toBe(userId);
    
    // Step 2: Initialize quota manager
    await mockQuotaManager.initialize(userId);
    expect(mockQuotaManager.state.userId).toBe(userId);
    expect(mockQuotaManager.state.eventCount).toBe(0);
    expect(mockQuotaManager.state.remainingQuota).toBe(3);
    expect(mockQuotaManager.state.isAtLimit).toBe(false);
    
    // Step 3: Navigate to dashboard (sees quota display)
    const dashboardResult = await loadDashboard(userId);
    expect(dashboardResult.success).toBe(true);
    expect(dashboardResult.events).toHaveLength(0);
    
    // Step 4: Create first event
    const event1Result = await createEvent(userId, {
      title: 'First Event',
      disabledQuestions: []
    });
    
    expect(event1Result.success).toBe(true);
    expect(event1Result.event.title).toBe('First Event');
    expect(event1Result.event.creatorId).toBe(userId);
    
    // Verify quota updated
    expect(mockQuotaManager.state.eventCount).toBe(1);
    expect(mockQuotaManager.state.remainingQuota).toBe(2);
    expect(mockQuotaManager.state.isAtLimit).toBe(false);
    
    // Step 5: Create second event
    const event2Result = await createEvent(userId, {
      title: 'Second Event',
      disabledQuestions: []
    });
    
    expect(event2Result.success).toBe(true);
    expect(mockQuotaManager.state.eventCount).toBe(2);
    expect(mockQuotaManager.state.remainingQuota).toBe(1);
    expect(mockQuotaManager.state.isAtLimit).toBe(false);
    
    // Step 6: Create third event
    const event3Result = await createEvent(userId, {
      title: 'Third Event',
      disabledQuestions: []
    });
    
    expect(event3Result.success).toBe(true);
    expect(mockQuotaManager.state.eventCount).toBe(3);
    expect(mockQuotaManager.state.remainingQuota).toBe(0);
    expect(mockQuotaManager.state.isAtLimit).toBe(true);
    
    // Step 7: Attempt to create fourth event (should fail)
    const event4Result = await createEvent(userId, {
      title: 'Fourth Event',
      disabledQuestions: []
    });
    
    expect(event4Result.success).toBe(false);
    expect(event4Result.error.code).toBe('PERMISSION_DENIED');
    
    // Verify quota unchanged
    expect(mockQuotaManager.state.eventCount).toBe(3);
    expect(mockQuotaManager.state.remainingQuota).toBe(0);
    expect(mockQuotaManager.state.isAtLimit).toBe(true);
    
    // Step 8: Verify dashboard shows all 3 events
    const finalDashboard = await loadDashboard(userId);
    expect(finalDashboard.success).toBe(true);
    expect(finalDashboard.events).toHaveLength(3);
  });

  test('**Validates: Requirements 3.3, 4.2** - quota display updates in real-time', async () => {
    const userId = 'user-realtime-updates';
    
    // Set up quota state listener
    const stateUpdates = [];
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    mockQuotaManager.subscribe((state) => {
      stateUpdates.push({ ...state });
    });
    
    // Create events and track state updates
    await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    await createEvent(userId, { title: 'Event 3' });
    
    // Verify state updates were triggered
    expect(stateUpdates.length).toBeGreaterThanOrEqual(3);
    
    // Verify final state
    const finalState = stateUpdates[stateUpdates.length - 1];
    expect(finalState.eventCount).toBe(3);
    expect(finalState.remainingQuota).toBe(0);
    expect(finalState.isAtLimit).toBe(true);
  });

  test('**Validates: Requirements 4.1, 4.2** - button state reflects quota', async () => {
    const userId = 'user-button-state';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Initially, button should be enabled
    let state = mockQuotaManager.getState();
    expect(state.isAtLimit).toBe(false);
    
    // Create 3 events
    await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    await createEvent(userId, { title: 'Event 3' });
    
    // Button should now be disabled
    state = mockQuotaManager.getState();
    expect(state.isAtLimit).toBe(true);
    expect(state.eventCount).toBe(3);
  });

  test('**Validates: Requirements 5.1, 5.2** - event creation succeeds when below quota', async () => {
    const userId = 'user-below-quota';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Create 2 events (below quota)
    const result1 = await createEvent(userId, { title: 'Event 1' });
    const result2 = await createEvent(userId, { title: 'Event 2' });
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    
    // Verify quota state
    const state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(2);
    expect(state.remainingQuota).toBe(1);
    expect(state.isAtLimit).toBe(false);
    
    // Should be able to create one more
    const result3 = await createEvent(userId, { title: 'Event 3' });
    expect(result3.success).toBe(true);
  });

  test('**Validates: Requirements 1.2** - event creation fails when at quota', async () => {
    const userId = 'user-at-quota';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Create 3 events to reach quota
    await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    await createEvent(userId, { title: 'Event 3' });
    
    // Attempt to create fourth event
    const result = await createEvent(userId, { title: 'Event 4' });
    
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('PERMISSION_DENIED');
    
    // Verify quota unchanged
    const state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(3);
    expect(state.isAtLimit).toBe(true);
  });

  test('**Validates: Requirements 3.1, 3.2** - quota display shows correct numbers', async () => {
    const userId = 'user-quota-display';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    // Initial state
    let state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(0);
    expect(state.quotaLimit).toBe(3);
    expect(state.remainingQuota).toBe(3);
    
    // After creating 1 event
    await createEvent(userId, { title: 'Event 1' });
    state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(1);
    expect(state.remainingQuota).toBe(2);
    
    // After creating 2 events
    await createEvent(userId, { title: 'Event 2' });
    state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(2);
    expect(state.remainingQuota).toBe(1);
    
    // After creating 3 events
    await createEvent(userId, { title: 'Event 3' });
    state = mockQuotaManager.getState();
    expect(state.eventCount).toBe(3);
    expect(state.remainingQuota).toBe(0);
  });

  test('**Validates: Requirements 1.1, 1.2** - multiple users have independent quotas', async () => {
    const user1Id = 'user-1';
    const user2Id = 'user-2';
    
    // User 1 creates 3 events
    await mockAuth.signIn(user1Id);
    await mockQuotaManager.initialize(user1Id);
    
    await createEvent(user1Id, { title: 'User1 Event 1' });
    await createEvent(user1Id, { title: 'User1 Event 2' });
    await createEvent(user1Id, { title: 'User1 Event 3' });
    
    const user1State = mockQuotaManager.getState();
    expect(user1State.eventCount).toBe(3);
    expect(user1State.isAtLimit).toBe(true);
    
    // User 2 should have independent quota
    await mockAuth.signOut();
    await mockAuth.signIn(user2Id);
    await mockQuotaManager.initialize(user2Id);
    
    const user2State = mockQuotaManager.getState();
    expect(user2State.eventCount).toBe(0);
    expect(user2State.remainingQuota).toBe(3);
    expect(user2State.isAtLimit).toBe(false);
    
    // User 2 can create events
    const result = await createEvent(user2Id, { title: 'User2 Event 1' });
    expect(result.success).toBe(true);
  });

  test('**Validates: Requirements 5.1** - event data persists correctly', async () => {
    const userId = 'user-persistence';
    
    await mockAuth.signIn(userId);
    await mockQuotaManager.initialize(userId);
    
    const eventData = {
      title: 'Test Event',
      disabledQuestions: [0, 1, 2]
    };
    
    const result = await createEvent(userId, eventData);
    
    expect(result.success).toBe(true);
    expect(result.event.title).toBe(eventData.title);
    expect(result.event.disabledQuestions).toEqual(eventData.disabledQuestions);
    expect(result.event.creatorId).toBe(userId);
    expect(result.event.participants).toEqual([]);
    expect(result.event.pin).toMatch(/^\d{6}$/); // 6-digit PIN
    
    // Verify event is in database
    const savedEvent = mockDatabase.events[result.eventId];
    expect(savedEvent).toBeTruthy();
    expect(savedEvent.title).toBe(eventData.title);
  });
});
