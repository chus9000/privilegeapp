/**
 * Unit Test for Unauthenticated Event Creation Rejection
 * Feature: event-creation-limit
 * 
 * Tests that unauthenticated users cannot create events
 * Validates: Requirements 1.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase database
let mockDatabase;

beforeEach(() => {
  mockDatabase = {
    events: {}
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Simulate Firebase Security Rules evaluation for event creation
 * This mimics the actual rule logic from firebase-security-rules.json
 */
function evaluateSecurityRule(auth, eventId, newData, existingData, database) {
  // Rule: "(auth != null && ((!data.exists() && root.child('events').orderByChild('creatorId').equalTo(auth.uid).once('value').numChildren() < 3) || (data.exists() && data.child('creatorId').val() === auth.uid))) || $eventId === 'freeplay'"
  
  // Special case: freeplay event
  if (eventId === 'freeplay') {
    return { allowed: true, reason: 'freeplay exception' };
  }
  
  // Check authentication
  if (!auth || !auth.uid) {
    return { allowed: false, reason: 'not authenticated' };
  }
  
  // Case 1: New event creation (data doesn't exist)
  if (!existingData) {
    // Count events by this creator
    const userEventCount = Object.values(database.events).filter(
      event => event && event.creatorId === auth.uid
    ).length;
    
    // Allow if count < 3
    if (userEventCount < 3) {
      return { allowed: true, reason: 'quota available' };
    } else {
      return { allowed: false, reason: 'quota exceeded' };
    }
  }
  
  // Case 2: Updating existing event
  if (existingData && existingData.creatorId === auth.uid) {
    return { allowed: true, reason: 'updating own event' };
  }
  
  return { allowed: false, reason: 'not authorized' };
}

describe('Unauthenticated Event Creation Rejection - Requirement 1.5', () => {
  it('should reject event creation when auth is null', () => {
    // Setup: No authentication
    const auth = null;
    const eventId = 'test-event-123';
    const newEventData = {
      title: 'Test Event',
      pin: '123456',
      creatorId: 'some-user-id',
      createdAt: new Date().toISOString()
    };
    
    // Action: Attempt to create event
    const result = evaluateSecurityRule(
      auth,
      eventId,
      newEventData,
      null, // No existing data
      mockDatabase
    );
    
    // Assert: Should be rejected
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not authenticated');
  });

  it('should reject event creation when auth is undefined', () => {
    // Setup: Undefined authentication
    const auth = undefined;
    const eventId = 'test-event-456';
    const newEventData = {
      title: 'Another Test Event',
      pin: '654321',
      creatorId: 'some-user-id',
      createdAt: new Date().toISOString()
    };
    
    // Action: Attempt to create event
    const result = evaluateSecurityRule(
      auth,
      eventId,
      newEventData,
      null,
      mockDatabase
    );
    
    // Assert: Should be rejected
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not authenticated');
  });

  it('should reject event creation when auth object exists but uid is missing', () => {
    // Setup: Auth object without uid
    const auth = { email: 'test@example.com' }; // No uid property
    const eventId = 'test-event-789';
    const newEventData = {
      title: 'Yet Another Event',
      pin: '111111',
      creatorId: 'some-user-id',
      createdAt: new Date().toISOString()
    };
    
    // Action: Attempt to create event
    const result = evaluateSecurityRule(
      auth,
      eventId,
      newEventData,
      null,
      mockDatabase
    );
    
    // Assert: Should be rejected
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not authenticated');
  });

  it('should reject event creation when auth.uid is null', () => {
    // Setup: Auth object with null uid
    const auth = { uid: null };
    const eventId = 'test-event-abc';
    const newEventData = {
      title: 'Event with null uid',
      pin: '222222',
      creatorId: 'some-user-id',
      createdAt: new Date().toISOString()
    };
    
    // Action: Attempt to create event
    const result = evaluateSecurityRule(
      auth,
      eventId,
      newEventData,
      null,
      mockDatabase
    );
    
    // Assert: Should be rejected
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not authenticated');
  });

  it('should reject event creation when auth.uid is empty string', () => {
    // Setup: Auth object with empty string uid
    const auth = { uid: '' };
    const eventId = 'test-event-def';
    const newEventData = {
      title: 'Event with empty uid',
      pin: '333333',
      creatorId: 'some-user-id',
      createdAt: new Date().toISOString()
    };
    
    // Action: Attempt to create event
    const result = evaluateSecurityRule(
      auth,
      eventId,
      newEventData,
      null,
      mockDatabase
    );
    
    // Assert: Should be rejected
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not authenticated');
  });

  it('should allow freeplay event creation without authentication', () => {
    // Setup: No authentication but freeplay event
    const auth = null;
    const eventId = 'freeplay'; // Special freeplay event ID
    const newEventData = {
      title: 'Freeplay Event',
      pin: '000000'
    };
    
    // Action: Attempt to create freeplay event
    const result = evaluateSecurityRule(
      auth,
      eventId,
      newEventData,
      null,
      mockDatabase
    );
    
    // Assert: Should be allowed (freeplay exception)
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('freeplay exception');
  });

  it('should reject regular event creation even with valid event data when unauthenticated', () => {
    // Setup: Valid event data but no authentication
    const auth = null;
    const eventId = 'valid-event-123';
    const newEventData = {
      title: 'Valid Event Title',
      pin: '123456',
      creatorId: 'user-123',
      createdAt: new Date().toISOString(),
      participants: [],
      disabledQuestions: []
    };
    
    // Action: Attempt to create event
    const result = evaluateSecurityRule(
      auth,
      eventId,
      newEventData,
      null,
      mockDatabase
    );
    
    // Assert: Should be rejected despite valid data
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not authenticated');
  });

  it('should reject event update when unauthenticated', () => {
    // Setup: Existing event and no authentication
    const auth = null;
    const eventId = 'existing-event-123';
    const existingEventData = {
      title: 'Original Title',
      pin: '123456',
      creatorId: 'user-123',
      createdAt: new Date().toISOString()
    };
    const updatedEventData = {
      ...existingEventData,
      title: 'Updated Title'
    };
    
    // Action: Attempt to update event
    const result = evaluateSecurityRule(
      auth,
      eventId,
      updatedEventData,
      existingEventData, // Existing data present
      mockDatabase
    );
    
    // Assert: Should be rejected
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not authenticated');
  });

  it('should allow authenticated user to create event', () => {
    // Setup: Valid authentication
    const auth = { uid: 'user-123' };
    const eventId = 'new-event-123';
    const newEventData = {
      title: 'New Event',
      pin: '123456',
      creatorId: 'user-123',
      createdAt: new Date().toISOString()
    };
    
    // Action: Attempt to create event
    const result = evaluateSecurityRule(
      auth,
      eventId,
      newEventData,
      null,
      mockDatabase
    );
    
    // Assert: Should be allowed
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('quota available');
  });

  it('should consistently reject unauthenticated requests regardless of database state', () => {
    // Setup: Database with existing events
    mockDatabase.events = {
      'event-1': {
        title: 'Event 1',
        pin: '111111',
        creatorId: 'user-1',
        createdAt: new Date().toISOString()
      },
      'event-2': {
        title: 'Event 2',
        pin: '222222',
        creatorId: 'user-2',
        createdAt: new Date().toISOString()
      }
    };
    
    const auth = null;
    const eventId = 'new-event-999';
    const newEventData = {
      title: 'New Event',
      pin: '999999',
      creatorId: 'user-999',
      createdAt: new Date().toISOString()
    };
    
    // Action: Attempt to create event
    const result = evaluateSecurityRule(
      auth,
      eventId,
      newEventData,
      null,
      mockDatabase
    );
    
    // Assert: Should be rejected regardless of database state
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not authenticated');
  });
});
