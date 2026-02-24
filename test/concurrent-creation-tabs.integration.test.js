/**
 * Integration Test for Concurrent Creation from Multiple Browser Tabs
 * Feature: event-creation-limit
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 3.3, 4.5**
 * 
 * This test validates that when a user has multiple browser tabs open and
 * attempts to create events simultaneously, the quota enforcement works
 * correctly and quota displays update across all tabs.
 */

import { describe, test, beforeEach, expect } from 'vitest';

// Mock Firebase database and authentication
let mockDatabase;
let mockAuth;

// Simulate multiple browser tabs with separate quota managers
class TabSimulator {
  constructor(tabId) {
    this.tabId = tabId;
    this.quotaManager = {
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
    this.buttonEnabled = true;
  }
  
  async initialize(userId) {
    await this.quotaManager.initialize(userId);
    this.updateButtonState();
  }
  
  updateButtonState() {
    const state = this.quotaManager.getState();
    this.buttonEnabled = !state.isAtLimit;
  }
  
  async createEvent(userId, eventData) {
    // Check if button is enabled (client-side check)
    if (!this.buttonEnabled) {
      return { success: false, error: { code: 'CLIENT_BLOCKED', message: 'Button disabled' } };
    }
    
    // Attempt server-side creation
    const result = await createEvent(userId, eventData);
    
    // Update quota state after creation attempt
    await this.quotaManager.updateState();
    this.updateButtonState();
    
    return result;
  }
  
  async refreshQuota() {
    await this.quotaManager.updateState();
    this.updateButtonState();
  }
}

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
    }
  };
});

/**
 * Simulate event creation with quota enforcement (server-side)
 */
async function createEvent(userId, eventData) {
  // Check authentication
  if (!mockAuth.currentUser || mockAuth.currentUser.uid !== userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'User not authenticated' } };
  }
  
  // Count user's existing events (atomic check)
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
  
  // Save to database (atomic operation)
  mockDatabase.events[eventId] = event;
  
  return { success: true, eventId, event };
}

/**
 * Generate 6-digit PIN
 */
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Simulate real-time database updates across tabs
 */
async function broadcastDatabaseChange(tabs) {
  // Simulate Firebase real-time listener triggering updates in all tabs
  for (const tab of tabs) {
    await tab.refreshQuota();
  }
}

describe('Integration: Concurrent Creation from Multiple Browser Tabs', () => {
  test('**Validates: Requirements 2.1, 2.2** - concurrent creation from 2 tabs at quota boundary', async () => {
    const userId = 'user-two-tabs';
    await mockAuth.signIn(userId);
    
    // Create 2 existing events
    await createEvent(userId, { title: 'Existing Event 1' });
    await createEvent(userId, { title: 'Existing Event 2' });
    
    // Simulate 2 browser tabs
    const tab1 = new TabSimulator('tab1');
    const tab2 = new TabSimulator('tab2');
    
    await tab1.initialize(userId);
    await tab2.initialize(userId);
    
    // Both tabs see 2 events, 1 remaining
    expect(tab1.quotaManager.getState().eventCount).toBe(2);
    expect(tab2.quotaManager.getState().eventCount).toBe(2);
    expect(tab1.buttonEnabled).toBe(true);
    expect(tab2.buttonEnabled).toBe(true);
    
    // Both tabs attempt to create event simultaneously
    const [result1, result2] = await Promise.all([
      tab1.createEvent(userId, { title: 'Tab1 Event' }),
      tab2.createEvent(userId, { title: 'Tab2 Event' })
    ]);
    
    // One should succeed, one should fail
    const successCount = [result1, result2].filter(r => r.success).length;
    const failCount = [result1, result2].filter(r => !r.success).length;
    
    expect(successCount).toBe(1);
    expect(failCount).toBe(1);
    
    // Verify total events is exactly 3
    const totalEvents = Object.values(mockDatabase.events).filter(
      e => e.creatorId === userId
    ).length;
    expect(totalEvents).toBe(3);
    
    // Broadcast database change to all tabs
    await broadcastDatabaseChange([tab1, tab2]);
    
    // Both tabs should now show 3 events and disabled button
    expect(tab1.quotaManager.getState().eventCount).toBe(3);
    expect(tab2.quotaManager.getState().eventCount).toBe(3);
    expect(tab1.buttonEnabled).toBe(false);
    expect(tab2.buttonEnabled).toBe(false);
  });

  test('**Validates: Requirements 2.1, 2.2, 2.3** - concurrent creation from 3 tabs', async () => {
    const userId = 'user-three-tabs';
    await mockAuth.signIn(userId);
    
    // Create 1 existing event
    await createEvent(userId, { title: 'Existing Event' });
    
    // Simulate 3 browser tabs
    const tab1 = new TabSimulator('tab1');
    const tab2 = new TabSimulator('tab2');
    const tab3 = new TabSimulator('tab3');
    
    await tab1.initialize(userId);
    await tab2.initialize(userId);
    await tab3.initialize(userId);
    
    // All tabs see 1 event, 2 remaining
    expect(tab1.quotaManager.getState().eventCount).toBe(1);
    expect(tab2.quotaManager.getState().eventCount).toBe(1);
    expect(tab3.quotaManager.getState().eventCount).toBe(1);
    
    // All tabs attempt to create event simultaneously
    const [result1, result2, result3] = await Promise.all([
      tab1.createEvent(userId, { title: 'Tab1 Event' }),
      tab2.createEvent(userId, { title: 'Tab2 Event' }),
      tab3.createEvent(userId, { title: 'Tab3 Event' })
    ]);
    
    // Exactly 2 should succeed (bringing total to 3)
    const successCount = [result1, result2, result3].filter(r => r.success).length;
    const failCount = [result1, result2, result3].filter(r => !r.success).length;
    
    expect(successCount).toBe(2);
    expect(failCount).toBe(1);
    
    // Verify total events is exactly 3
    const totalEvents = Object.values(mockDatabase.events).filter(
      e => e.creatorId === userId
    ).length;
    expect(totalEvents).toBe(3);
    
    // Broadcast database change to all tabs
    await broadcastDatabaseChange([tab1, tab2, tab3]);
    
    // All tabs should now show 3 events and disabled button
    expect(tab1.quotaManager.getState().eventCount).toBe(3);
    expect(tab2.quotaManager.getState().eventCount).toBe(3);
    expect(tab3.quotaManager.getState().eventCount).toBe(3);
    expect(tab1.buttonEnabled).toBe(false);
    expect(tab2.buttonEnabled).toBe(false);
    expect(tab3.buttonEnabled).toBe(false);
  });

  test('**Validates: Requirements 3.3, 4.5** - quota display updates across all tabs', async () => {
    const userId = 'user-quota-sync';
    await mockAuth.signIn(userId);
    
    // Simulate 2 browser tabs
    const tab1 = new TabSimulator('tab1');
    const tab2 = new TabSimulator('tab2');
    
    await tab1.initialize(userId);
    await tab2.initialize(userId);
    
    // Both tabs start with 0 events
    expect(tab1.quotaManager.getState().eventCount).toBe(0);
    expect(tab2.quotaManager.getState().eventCount).toBe(0);
    
    // Tab 1 creates an event
    await tab1.createEvent(userId, { title: 'Tab1 Event 1' });
    
    // Broadcast change
    await broadcastDatabaseChange([tab1, tab2]);
    
    // Both tabs should see 1 event
    expect(tab1.quotaManager.getState().eventCount).toBe(1);
    expect(tab2.quotaManager.getState().eventCount).toBe(1);
    
    // Tab 2 creates an event
    await tab2.createEvent(userId, { title: 'Tab2 Event 1' });
    
    // Broadcast change
    await broadcastDatabaseChange([tab1, tab2]);
    
    // Both tabs should see 2 events
    expect(tab1.quotaManager.getState().eventCount).toBe(2);
    expect(tab2.quotaManager.getState().eventCount).toBe(2);
    
    // Tab 1 creates third event
    await tab1.createEvent(userId, { title: 'Tab1 Event 2' });
    
    // Broadcast change
    await broadcastDatabaseChange([tab1, tab2]);
    
    // Both tabs should see 3 events and be at limit
    expect(tab1.quotaManager.getState().eventCount).toBe(3);
    expect(tab2.quotaManager.getState().eventCount).toBe(3);
    expect(tab1.quotaManager.getState().isAtLimit).toBe(true);
    expect(tab2.quotaManager.getState().isAtLimit).toBe(true);
  });

  test('**Validates: Requirements 2.2, 2.3** - all tabs blocked when at quota', async () => {
    const userId = 'user-all-blocked';
    await mockAuth.signIn(userId);
    
    // Create 3 events to reach quota
    await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    await createEvent(userId, { title: 'Event 3' });
    
    // Simulate 3 browser tabs
    const tab1 = new TabSimulator('tab1');
    const tab2 = new TabSimulator('tab2');
    const tab3 = new TabSimulator('tab3');
    
    await tab1.initialize(userId);
    await tab2.initialize(userId);
    await tab3.initialize(userId);
    
    // All tabs should see quota at limit
    expect(tab1.quotaManager.getState().isAtLimit).toBe(true);
    expect(tab2.quotaManager.getState().isAtLimit).toBe(true);
    expect(tab3.quotaManager.getState().isAtLimit).toBe(true);
    
    // All buttons should be disabled
    expect(tab1.buttonEnabled).toBe(false);
    expect(tab2.buttonEnabled).toBe(false);
    expect(tab3.buttonEnabled).toBe(false);
    
    // All tabs attempt to create event
    const [result1, result2, result3] = await Promise.all([
      tab1.createEvent(userId, { title: 'Tab1 Event' }),
      tab2.createEvent(userId, { title: 'Tab2 Event' }),
      tab3.createEvent(userId, { title: 'Tab3 Event' })
    ]);
    
    // All should fail (client-side blocked)
    expect(result1.success).toBe(false);
    expect(result2.success).toBe(false);
    expect(result3.success).toBe(false);
    
    // Verify total events unchanged
    const totalEvents = Object.values(mockDatabase.events).filter(
      e => e.creatorId === userId
    ).length;
    expect(totalEvents).toBe(3);
  });

  test('**Validates: Requirements 2.1, 3.3** - deletion in one tab updates all tabs', async () => {
    const userId = 'user-delete-sync';
    await mockAuth.signIn(userId);
    
    // Create 3 events
    const event1 = await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    await createEvent(userId, { title: 'Event 3' });
    
    // Simulate 2 browser tabs
    const tab1 = new TabSimulator('tab1');
    const tab2 = new TabSimulator('tab2');
    
    await tab1.initialize(userId);
    await tab2.initialize(userId);
    
    // Both tabs at limit
    expect(tab1.buttonEnabled).toBe(false);
    expect(tab2.buttonEnabled).toBe(false);
    
    // Delete event from database (simulating deletion from tab1)
    delete mockDatabase.events[event1.eventId];
    
    // Broadcast change
    await broadcastDatabaseChange([tab1, tab2]);
    
    // Both tabs should now show 2 events and enabled button
    expect(tab1.quotaManager.getState().eventCount).toBe(2);
    expect(tab2.quotaManager.getState().eventCount).toBe(2);
    expect(tab1.buttonEnabled).toBe(true);
    expect(tab2.buttonEnabled).toBe(true);
    
    // Both tabs can now create events
    const result1 = await tab1.createEvent(userId, { title: 'Tab1 New Event' });
    expect(result1.success).toBe(true);
  });

  test('**Validates: Requirements 2.3** - atomic operations prevent quota overflow', async () => {
    const userId = 'user-atomic-test';
    await mockAuth.signIn(userId);
    
    // Create 2 existing events
    await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    
    // Simulate 5 browser tabs
    const tabs = [
      new TabSimulator('tab1'),
      new TabSimulator('tab2'),
      new TabSimulator('tab3'),
      new TabSimulator('tab4'),
      new TabSimulator('tab5')
    ];
    
    // Initialize all tabs
    for (const tab of tabs) {
      await tab.initialize(userId);
    }
    
    // All tabs attempt to create event simultaneously
    const results = await Promise.all(
      tabs.map(tab => tab.createEvent(userId, { title: `${tab.tabId} Event` }))
    );
    
    // Exactly 1 should succeed (bringing total to 3)
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(1);
    
    // Verify total events is exactly 3 (never exceeded)
    const totalEvents = Object.values(mockDatabase.events).filter(
      e => e.creatorId === userId
    ).length;
    expect(totalEvents).toBe(3);
    expect(totalEvents).toBeLessThanOrEqual(3);
    
    // Broadcast change
    await broadcastDatabaseChange(tabs);
    
    // All tabs should show 3 events
    for (const tab of tabs) {
      expect(tab.quotaManager.getState().eventCount).toBe(3);
      expect(tab.buttonEnabled).toBe(false);
    }
  });

  test('**Validates: Requirements 4.5** - button state syncs across tabs', async () => {
    const userId = 'user-button-sync';
    await mockAuth.signIn(userId);
    
    // Simulate 2 browser tabs
    const tab1 = new TabSimulator('tab1');
    const tab2 = new TabSimulator('tab2');
    
    await tab1.initialize(userId);
    await tab2.initialize(userId);
    
    // Both buttons enabled initially
    expect(tab1.buttonEnabled).toBe(true);
    expect(tab2.buttonEnabled).toBe(true);
    
    // Create events until quota reached
    await tab1.createEvent(userId, { title: 'Event 1' });
    await broadcastDatabaseChange([tab1, tab2]);
    
    expect(tab1.buttonEnabled).toBe(true);
    expect(tab2.buttonEnabled).toBe(true);
    
    await tab2.createEvent(userId, { title: 'Event 2' });
    await broadcastDatabaseChange([tab1, tab2]);
    
    expect(tab1.buttonEnabled).toBe(true);
    expect(tab2.buttonEnabled).toBe(true);
    
    await tab1.createEvent(userId, { title: 'Event 3' });
    await broadcastDatabaseChange([tab1, tab2]);
    
    // Both buttons should now be disabled
    expect(tab1.buttonEnabled).toBe(false);
    expect(tab2.buttonEnabled).toBe(false);
  });

  test('**Validates: Requirements 2.1, 2.2** - rapid concurrent attempts from same tab', async () => {
    const userId = 'user-rapid-attempts';
    await mockAuth.signIn(userId);
    
    // Create 2 existing events
    await createEvent(userId, { title: 'Event 1' });
    await createEvent(userId, { title: 'Event 2' });
    
    const tab = new TabSimulator('tab1');
    await tab.initialize(userId);
    
    // Simulate rapid clicking (5 attempts in quick succession)
    const attempts = [];
    for (let i = 0; i < 5; i++) {
      attempts.push(tab.createEvent(userId, { title: `Rapid Event ${i}` }));
    }
    
    const results = await Promise.all(attempts);
    
    // Only 1 should succeed (bringing total to 3)
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(1);
    
    // Verify total events is exactly 3
    const totalEvents = Object.values(mockDatabase.events).filter(
      e => e.creatorId === userId
    ).length;
    expect(totalEvents).toBe(3);
  });
});
