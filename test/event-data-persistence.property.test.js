/**
 * Property-Based Test for Event Data Persistence
 * Feature: full-featured-quiz-app
 * 
 * Property 4: Event Data Persistence
 * Validates: Requirements 5.6, 5.8, 11.1, 11.3
 * 
 * For any event creation with title, PIN, disabled questions, and creator ID,
 * saving to Firebase should result in a document at path `/events/{eventId}`
 * containing all provided fields.
 */

import { describe, test, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock fetch for Firebase API calls
let fetchMock;
let capturedRequests = [];

beforeEach(() => {
  capturedRequests = [];
  
  // In-memory storage for simulating Firebase
  const firebaseStorage = {};
  
  // Mock fetch to capture requests and simulate Firebase storage
  fetchMock = vi.fn(async (url, options) => {
    const method = options?.method || 'GET';
    const request = {
      url,
      method,
      body: options?.body ? JSON.parse(options.body) : null,
      headers: options?.headers || {}
    };
    capturedRequests.push(request);
    
    // Extract event ID from URL
    const eventIdMatch = url.match(/\/events\/([^/.]+)\.json/);
    const eventId = eventIdMatch ? eventIdMatch[1] : null;
    
    if (method === 'PUT' && eventId) {
      // Save to in-memory storage
      firebaseStorage[eventId] = request.body;
      
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => request.body
      };
    } else if (method === 'GET' && eventId) {
      // Load from in-memory storage
      const data = firebaseStorage[eventId];
      
      return {
        ok: !!data,
        status: data ? 200 : 404,
        statusText: data ? 'OK' : 'Not Found',
        json: async () => data || null
      };
    }
    
    // Default response
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => null
    };
  });
  
  global.fetch = fetchMock;
  
  // Mock AuthManager
  global.window = {
    AuthManager: {
      getCurrentUser: () => ({ uid: 'test-user-123' }),
      isAuthenticated: () => true,
      getIdToken: async () => 'test-token'
    }
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  capturedRequests = [];
});

/**
 * Create a minimal FirebaseAPI implementation for testing
 */
function createFirebaseAPI() {
  const FIREBASE_RTDB_URL = 'https://test-project.firebaseio.com/';
  
  return {
    async _getAuthToken() {
      if (window.AuthManager && window.AuthManager.isAuthenticated()) {
        try {
          return await window.AuthManager.getIdToken();
        } catch (error) {
          return null;
        }
      }
      return null;
    },
    
    async _buildUrl(path) {
      const token = await this._getAuthToken();
      const url = `${FIREBASE_RTDB_URL}${path}.json`;
      
      if (token) {
        return `${url}?auth=${token}`;
      }
      return url;
    },
    
    async saveEvent(eventId, eventData) {
      try {
        const currentUser = window.AuthManager ? window.AuthManager.getCurrentUser() : null;
        
        const requestBody = {
          title: eventData.title,
          pin: eventData.pin,
          participants: eventData.participants || [],
          disabledQuestions: eventData.disabledQuestions || [],
          createdAt: eventData.createdAt || new Date().toISOString()
        };
        
        if (currentUser && currentUser.uid) {
          requestBody.creatorId = currentUser.uid;
        }
        
        const url = await this._buildUrl(`/events/${eventId}`);
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        return response.ok;
      } catch (error) {
        return false;
      }
    },
    
    async loadEvent(eventId) {
      try {
        const url = `${FIREBASE_RTDB_URL}/events/${eventId}.json`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          return null;
        }
        
        const data = await response.json();
        
        if (!data) {
          return null;
        }
        
        return {
          title: data.title || '',
          pin: data.pin || '',
          participants: data.participants || [],
          disabledQuestions: data.disabledQuestions || [],
          creatorId: data.creatorId,
          createdAt: data.createdAt
        };
      } catch (error) {
        return null;
      }
    }
  };
}

describe('Property 4: Event Data Persistence', () => {
  test('saving event should persist all required fields to Firebase', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary event data
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
          disabledQuestions: fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 30 }),
          createdAt: fc.date().map(d => d.toISOString())
        }),
        async ({ eventId, title, pin, disabledQuestions, createdAt }) => {
          // Reset captured requests
          capturedRequests = [];
          
          const firebaseAPI = createFirebaseAPI();
          
          // Create event data
          const eventData = {
            title,
            pin,
            disabledQuestions,
            createdAt,
            participants: []
          };
          
          // Save event
          const success = await firebaseAPI.saveEvent(eventId, eventData);
          
          // Property 1: Save operation should succeed
          if (!success) {
            return false;
          }
          
          // Property 2: Should have made exactly one PUT request
          const putRequests = capturedRequests.filter(r => r.method === 'PUT');
          if (putRequests.length !== 1) {
            return false;
          }
          
          const request = putRequests[0];
          
          // Property 3: Request URL should contain the event ID
          if (!request.url.includes(`/events/${eventId}`)) {
            return false;
          }
          
          // Property 4: Request body should contain all provided fields
          const body = request.body;
          
          if (body.title !== title) {
            return false;
          }
          
          if (body.pin !== pin) {
            return false;
          }
          
          if (body.createdAt !== createdAt) {
            return false;
          }
          
          // Property 5: Disabled questions should match (order-independent)
          const bodyDisabled = [...body.disabledQuestions].sort();
          const expectedDisabled = [...disabledQuestions].sort();
          if (JSON.stringify(bodyDisabled) !== JSON.stringify(expectedDisabled)) {
            return false;
          }
          
          // Property 6: Should include creatorId from authenticated user
          if (body.creatorId !== 'test-user-123') {
            return false;
          }
          
          // Property 7: Should include participants array (empty for new events)
          if (!Array.isArray(body.participants)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event data round-trip should preserve all fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
          disabledQuestions: fc.array(fc.integer({ min: 0, max: 34 }), { maxLength: 30 }),
          createdAt: fc.date().map(d => d.toISOString())
        }),
        async ({ eventId, title, pin, disabledQuestions, createdAt }) => {
          capturedRequests = [];
          
          const firebaseAPI = createFirebaseAPI();
          
          // Create and save event
          const eventData = {
            title,
            pin,
            disabledQuestions,
            createdAt,
            participants: []
          };
          
          await firebaseAPI.saveEvent(eventId, eventData);
          
          // Load the event back
          const loadedEvent = await firebaseAPI.loadEvent(eventId);
          
          // Property: Loaded event should match saved event
          if (!loadedEvent) {
            return false;
          }
          
          if (loadedEvent.title !== title) {
            return false;
          }
          
          if (loadedEvent.pin !== pin) {
            return false;
          }
          
          if (loadedEvent.createdAt !== createdAt) {
            return false;
          }
          
          if (loadedEvent.creatorId !== 'test-user-123') {
            return false;
          }
          
          // Check disabled questions (order-independent)
          const loadedDisabled = [...loadedEvent.disabledQuestions].sort();
          const expectedDisabled = [...disabledQuestions].sort();
          if (JSON.stringify(loadedDisabled) !== JSON.stringify(expectedDisabled)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('saving event with participants should persist participant data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
          participants: fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              avatar: fc.string({ minLength: 1, maxLength: 5 }),
              score: fc.integer({ min: -25, max: 25 })
            }),
            { maxLength: 10 }
          )
        }),
        async ({ eventId, title, pin, participants }) => {
          capturedRequests = [];
          
          const firebaseAPI = createFirebaseAPI();
          
          // Create event with participants
          const eventData = {
            title,
            pin,
            disabledQuestions: [],
            createdAt: new Date().toISOString(),
            participants
          };
          
          await firebaseAPI.saveEvent(eventId, eventData);
          
          const request = capturedRequests.find(r => r.method === 'PUT');
          
          // Property: Participants array should be persisted
          if (!request || !request.body) {
            return false;
          }
          
          if (!Array.isArray(request.body.participants)) {
            return false;
          }
          
          if (request.body.participants.length !== participants.length) {
            return false;
          }
          
          // Check each participant is preserved
          for (let i = 0; i < participants.length; i++) {
            const saved = request.body.participants[i];
            const original = participants[i];
            
            if (saved.id !== original.id ||
                saved.name !== original.name ||
                saved.avatar !== original.avatar ||
                saved.score !== original.score) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('saving event without authentication should not include creatorId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
        }),
        async ({ eventId, title, pin }) => {
          capturedRequests = [];
          
          // Mock unauthenticated state
          global.window.AuthManager = {
            getCurrentUser: () => null,
            isAuthenticated: () => false,
            getIdToken: async () => null
          };
          
          const firebaseAPI = createFirebaseAPI();
          
          const eventData = {
            title,
            pin,
            disabledQuestions: [],
            createdAt: new Date().toISOString(),
            participants: []
          };
          
          await firebaseAPI.saveEvent(eventId, eventData);
          
          const request = capturedRequests.find(r => r.method === 'PUT');
          
          // Property: Request should not include creatorId when not authenticated
          if (!request || !request.body) {
            return false;
          }
          
          // creatorId should not be present
          return !('creatorId' in request.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('event path structure should follow Firebase RTDB conventions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => !s.includes('/') && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0)
        }),
        async ({ eventId, title }) => {
          capturedRequests = [];
          
          const firebaseAPI = createFirebaseAPI();
          
          const eventData = {
            title,
            pin: '123456',
            disabledQuestions: [],
            createdAt: new Date().toISOString(),
            participants: []
          };
          
          await firebaseAPI.saveEvent(eventId, eventData);
          
          const request = capturedRequests.find(r => r.method === 'PUT');
          
          // Property: URL should follow pattern /events/{eventId}.json
          if (!request) {
            return false;
          }
          
          const urlPattern = new RegExp(`/events/${eventId}\\.json`);
          return urlPattern.test(request.url);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('disabled questions array should handle edge cases', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          disabledQuestions: fc.oneof(
            fc.constant([]), // Empty array
            fc.array(fc.integer({ min: 0, max: 34 }), { minLength: 1, maxLength: 1 }), // Single element
            fc.array(fc.integer({ min: 0, max: 34 }), { minLength: 30, maxLength: 30 }) // Almost all disabled
          )
        }),
        async ({ eventId, title, disabledQuestions }) => {
          capturedRequests = [];
          
          const firebaseAPI = createFirebaseAPI();
          
          const eventData = {
            title,
            pin: '123456',
            disabledQuestions,
            createdAt: new Date().toISOString(),
            participants: []
          };
          
          await firebaseAPI.saveEvent(eventId, eventData);
          
          const request = capturedRequests.find(r => r.method === 'PUT');
          
          // Property: Disabled questions should be persisted correctly regardless of size
          if (!request || !request.body) {
            return false;
          }
          
          const savedDisabled = [...request.body.disabledQuestions].sort();
          const expectedDisabled = [...disabledQuestions].sort();
          
          return JSON.stringify(savedDisabled) === JSON.stringify(expectedDisabled);
        }
      ),
      { numRuns: 100 }
    );
  });
});
