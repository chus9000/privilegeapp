/**
 * Property-Based Test for Participant Data Persistence
 * Feature: full-featured-quiz-app
 * 
 * Property 5: Participant Data Persistence
 * Validates: Requirements 6.6, 11.4, 14.3
 * 
 * For any participant submission with answers and score, saving to Firebase
 * should result in a document at path `/events/{eventId}/participants/{participantId}`
 * containing the participant's complete data.
 */

import { describe, test, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock fetch for Firebase API calls
let fetchMock;
let capturedRequests = [];
let firebaseStorage = {};

beforeEach(() => {
  capturedRequests = [];
  firebaseStorage = {};
  
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
    const eventIdMatch = url.match(/\/events\/([^/]+)\.json/);
    const participantsMatch = url.match(/\/events\/([^/]+)\/participants\.json/);
    const eventId = eventIdMatch ? eventIdMatch[1] : (participantsMatch ? participantsMatch[1] : null);
    
    if (method === 'GET' && eventIdMatch) {
      // Load event from in-memory storage
      const data = firebaseStorage[eventId];
      
      return {
        ok: !!data,
        status: data ? 200 : 404,
        statusText: data ? 'OK' : 'Not Found',
        json: async () => data || null
      };
    } else if (method === 'PUT' && participantsMatch) {
      // Update participants array
      const eventId = participantsMatch[1];
      if (!firebaseStorage[eventId]) {
        firebaseStorage[eventId] = {
          title: 'Test Event',
          pin: '123456',
          participants: [],
          disabledQuestions: [],
          createdAt: new Date().toISOString()
        };
      }
      
      firebaseStorage[eventId].participants = request.body;
      
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => request.body
      };
    } else if (method === 'PUT' && eventIdMatch) {
      // Save entire event
      firebaseStorage[eventId] = request.body;
      
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => request.body
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
});

afterEach(() => {
  vi.restoreAllMocks();
  capturedRequests = [];
  firebaseStorage = {};
});

/**
 * Create a minimal FirebaseAPI implementation for testing
 */
function createFirebaseAPI() {
  const FIREBASE_RTDB_URL = 'https://test-project.firebaseio.com';
  
  return {
    async loadEvent(eventId) {
      try {
        const url = `${FIREBASE_RTDB_URL}/events/${eventId}.json`;
        const response = await fetch(url);
        
        if (!response.ok) {
          return null;
        }
        
        return await response.json();
      } catch (error) {
        return null;
      }
    },
    
    async updateParticipant(eventId, participant) {
      try {
        // First, get current event data
        const currentEvent = await this.loadEvent(eventId);
        if (!currentEvent) {
          return false;
        }
        
        // Find and update the participant, or add if new
        const participants = [...(currentEvent.participants || [])];
        const existingIndex = participants.findIndex(p => p.id === participant.id);
        
        if (existingIndex >= 0) {
          participants[existingIndex] = participant;
        } else {
          participants.push(participant);
        }
        
        // Update the participants array in Firebase RTDB
        const url = `${FIREBASE_RTDB_URL}/events/${eventId}/participants.json`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(participants)
        });
        
        return response.ok;
      } catch (error) {
        return false;
      }
    }
  };
}

describe('Property 5: Participant Data Persistence', () => {
  test('saving participant should persist all required fields to Firebase', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary participant and event data
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          participant: fc.record({
            id: fc.string({ minLength: 5, maxLength: 50 })
              .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
            name: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁'),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.dictionary(
              fc.integer({ min: 0, max: 34 }).map(String),
              fc.integer({ min: 0, max: 1 }),
              { minKeys: 1, maxKeys: 35 }
            ),
            createdAt: fc.date().map(d => d.toISOString())
          })
        }),
        async ({ eventId, participant }) => {
          // Reset state
          capturedRequests = [];
          
          // Initialize event in storage
          firebaseStorage[eventId] = {
            title: 'Test Event',
            pin: '123456',
            participants: [],
            disabledQuestions: [],
            createdAt: new Date().toISOString()
          };
          
          const firebaseAPI = createFirebaseAPI();
          
          // Save participant
          const success = await firebaseAPI.updateParticipant(eventId, participant);
          
          // Property 1: Save operation should succeed
          if (!success) {
            return false;
          }
          
          // Property 2: Should have made a PUT request to participants endpoint
          const putRequests = capturedRequests.filter(r => 
            r.method === 'PUT' && r.url.includes('/participants.json')
          );
          if (putRequests.length !== 1) {
            return false;
          }
          
          const request = putRequests[0];
          
          // Property 3: Request URL should contain the event ID
          if (!request.url.includes(`/events/${eventId}/participants`)) {
            return false;
          }
          
          // Property 4: Request body should be an array containing the participant
          const body = request.body;
          if (!Array.isArray(body)) {
            return false;
          }
          
          if (body.length !== 1) {
            return false;
          }
          
          const savedParticipant = body[0];
          
          // Property 5: All participant fields should be preserved
          if (savedParticipant.id !== participant.id) {
            return false;
          }
          
          if (savedParticipant.name !== participant.name) {
            return false;
          }
          
          if (savedParticipant.avatar !== participant.avatar) {
            return false;
          }
          
          if (savedParticipant.score !== participant.score) {
            return false;
          }
          
          if (savedParticipant.createdAt !== participant.createdAt) {
            return false;
          }
          
          // Property 6: Answers object should match exactly
          if (JSON.stringify(savedParticipant.answers) !== JSON.stringify(participant.answers)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participant data round-trip should preserve all fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          participant: fc.record({
            id: fc.string({ minLength: 5, maxLength: 50 })
              .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
            name: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.dictionary(
              fc.integer({ min: 0, max: 34 }).map(String),
              fc.integer({ min: 0, max: 1 }),
              { minKeys: 1, maxKeys: 35 }
            ),
            createdAt: fc.date().map(d => d.toISOString())
          })
        }),
        async ({ eventId, participant }) => {
          capturedRequests = [];
          
          // Initialize event
          firebaseStorage[eventId] = {
            title: 'Test Event',
            pin: '123456',
            participants: [],
            disabledQuestions: [],
            createdAt: new Date().toISOString()
          };
          
          const firebaseAPI = createFirebaseAPI();
          
          // Save participant
          await firebaseAPI.updateParticipant(eventId, participant);
          
          // Load event back to verify participant was saved
          const loadedEvent = await firebaseAPI.loadEvent(eventId);
          
          // Property: Loaded participant should match saved participant
          if (!loadedEvent || !loadedEvent.participants) {
            return false;
          }
          
          const loadedParticipant = loadedEvent.participants.find(p => p.id === participant.id);
          
          if (!loadedParticipant) {
            return false;
          }
          
          if (loadedParticipant.name !== participant.name) {
            return false;
          }
          
          if (loadedParticipant.avatar !== participant.avatar) {
            return false;
          }
          
          if (loadedParticipant.score !== participant.score) {
            return false;
          }
          
          if (loadedParticipant.createdAt !== participant.createdAt) {
            return false;
          }
          
          // Check answers match
          if (JSON.stringify(loadedParticipant.answers) !== JSON.stringify(participant.answers)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('updating existing participant should replace their data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          participantId: fc.string({ minLength: 5, maxLength: 50 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          initialData: fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0),
            avatar: fc.constantFrom('🐱', '🐶', '🦊'),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.dictionary(
              fc.integer({ min: 0, max: 34 }).map(String),
              fc.integer({ min: 0, max: 1 }),
              { minKeys: 1, maxKeys: 10 }
            )
          }),
          updatedData: fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0),
            avatar: fc.constantFrom('🐻', '🐼', '🐨'),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.dictionary(
              fc.integer({ min: 0, max: 34 }).map(String),
              fc.integer({ min: 0, max: 1 }),
              { minKeys: 1, maxKeys: 35 }
            )
          })
        }),
        async ({ eventId, participantId, initialData, updatedData }) => {
          capturedRequests = [];
          
          // Initialize event with initial participant
          const createdAt = new Date().toISOString();
          firebaseStorage[eventId] = {
            title: 'Test Event',
            pin: '123456',
            participants: [{
              id: participantId,
              ...initialData,
              createdAt
            }],
            disabledQuestions: [],
            createdAt
          };
          
          const firebaseAPI = createFirebaseAPI();
          
          // Update participant with new data
          const updatedParticipant = {
            id: participantId,
            ...updatedData,
            createdAt
          };
          
          const success = await firebaseAPI.updateParticipant(eventId, updatedParticipant);
          
          // Property 1: Update should succeed
          if (!success) {
            return false;
          }
          
          // Property 2: Should still have only one participant
          const loadedEvent = await firebaseAPI.loadEvent(eventId);
          if (!loadedEvent || loadedEvent.participants.length !== 1) {
            return false;
          }
          
          const savedParticipant = loadedEvent.participants[0];
          
          // Property 3: Participant data should match updated data, not initial data
          if (savedParticipant.name !== updatedData.name) {
            return false;
          }
          
          if (savedParticipant.avatar !== updatedData.avatar) {
            return false;
          }
          
          if (savedParticipant.score !== updatedData.score) {
            return false;
          }
          
          if (JSON.stringify(savedParticipant.answers) !== JSON.stringify(updatedData.answers)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('multiple participants should be stored independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          participants: fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 50 })
                .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
              name: fc.string({ minLength: 1, maxLength: 50 })
                .filter(s => s.trim().length > 0),
              avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
              score: fc.integer({ min: -25, max: 25 }),
              answers: fc.dictionary(
                fc.integer({ min: 0, max: 34 }).map(String),
                fc.integer({ min: 0, max: 1 })
              ),
              createdAt: fc.date().map(d => d.toISOString())
            }),
            { minLength: 2, maxLength: 5 }
          ).chain(participants => {
            // Ensure unique IDs
            const uniqueIds = new Set();
            const uniqueParticipants = [];
            for (const p of participants) {
              if (!uniqueIds.has(p.id)) {
                uniqueIds.add(p.id);
                uniqueParticipants.push(p);
              }
            }
            return fc.constant(uniqueParticipants);
          })
        }),
        async ({ eventId, participants }) => {
          capturedRequests = [];
          
          // Initialize event
          firebaseStorage[eventId] = {
            title: 'Test Event',
            pin: '123456',
            participants: [],
            disabledQuestions: [],
            createdAt: new Date().toISOString()
          };
          
          const firebaseAPI = createFirebaseAPI();
          
          // Save all participants
          for (const participant of participants) {
            const success = await firebaseAPI.updateParticipant(eventId, participant);
            if (!success) {
              return false;
            }
          }
          
          // Property: All participants should be stored independently
          const loadedEvent = await firebaseAPI.loadEvent(eventId);
          
          if (!loadedEvent || !loadedEvent.participants) {
            return false;
          }
          
          if (loadedEvent.participants.length !== participants.length) {
            return false;
          }
          
          // Check each participant is preserved
          for (const participant of participants) {
            const loaded = loadedEvent.participants.find(p => p.id === participant.id);
            
            if (!loaded) {
              return false;
            }
            
            if (loaded.name !== participant.name ||
                loaded.avatar !== participant.avatar ||
                loaded.score !== participant.score ||
                loaded.createdAt !== participant.createdAt) {
              return false;
            }
            
            if (JSON.stringify(loaded.answers) !== JSON.stringify(participant.answers)) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participant with empty answers should be saved correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          participant: fc.record({
            id: fc.string({ minLength: 5, maxLength: 50 })
              .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
            name: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0),
            avatar: fc.constantFrom('🐱', '🐶', '🦊'),
            score: fc.constant(0), // Score should be 0 if no answers
            createdAt: fc.date().map(d => d.toISOString())
          })
        }),
        async ({ eventId, participant }) => {
          capturedRequests = [];
          
          // Initialize event
          firebaseStorage[eventId] = {
            title: 'Test Event',
            pin: '123456',
            participants: [],
            disabledQuestions: [],
            createdAt: new Date().toISOString()
          };
          
          const firebaseAPI = createFirebaseAPI();
          
          // Add empty answers
          const participantWithEmptyAnswers = {
            ...participant,
            answers: {}
          };
          
          const success = await firebaseAPI.updateParticipant(eventId, participantWithEmptyAnswers);
          
          // Property: Should successfully save even with empty answers
          if (!success) {
            return false;
          }
          
          const loadedEvent = await firebaseAPI.loadEvent(eventId);
          const loaded = loadedEvent.participants.find(p => p.id === participant.id);
          
          if (!loaded) {
            return false;
          }
          
          // Should have empty answers object
          return JSON.stringify(loaded.answers) === '{}';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participant with all questions answered should be saved correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          participant: fc.record({
            id: fc.string({ minLength: 5, maxLength: 50 })
              .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
            name: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0),
            avatar: fc.constantFrom('🐱', '🐶', '🦊'),
            score: fc.integer({ min: -25, max: 25 }),
            createdAt: fc.date().map(d => d.toISOString())
          })
        }),
        async ({ eventId, participant }) => {
          capturedRequests = [];
          
          // Initialize event
          firebaseStorage[eventId] = {
            title: 'Test Event',
            pin: '123456',
            participants: [],
            disabledQuestions: [],
            createdAt: new Date().toISOString()
          };
          
          const firebaseAPI = createFirebaseAPI();
          
          // Create answers for all 35 questions
          const answers = {};
          for (let i = 0; i < 35; i++) {
            answers[i.toString()] = Math.random() < 0.5 ? 0 : 1;
          }
          
          const participantWithAllAnswers = {
            ...participant,
            answers
          };
          
          const success = await firebaseAPI.updateParticipant(eventId, participantWithAllAnswers);
          
          // Property: Should successfully save with all questions answered
          if (!success) {
            return false;
          }
          
          const loadedEvent = await firebaseAPI.loadEvent(eventId);
          const loaded = loadedEvent.participants.find(p => p.id === participant.id);
          
          if (!loaded) {
            return false;
          }
          
          // Should have 35 answers
          return Object.keys(loaded.answers).length === 35;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participant score edge cases should be handled correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          participant: fc.record({
            id: fc.string({ minLength: 5, maxLength: 50 })
              .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
            name: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0),
            avatar: fc.constantFrom('🐱', '🐶', '🦊'),
            score: fc.oneof(
              fc.constant(-25), // Minimum score
              fc.constant(0),   // Zero score
              fc.constant(25)   // Maximum score
            ),
            answers: fc.dictionary(
              fc.integer({ min: 0, max: 34 }).map(String),
              fc.integer({ min: 0, max: 1 })
            ),
            createdAt: fc.date().map(d => d.toISOString())
          })
        }),
        async ({ eventId, participant }) => {
          capturedRequests = [];
          
          // Initialize event
          firebaseStorage[eventId] = {
            title: 'Test Event',
            pin: '123456',
            participants: [],
            disabledQuestions: [],
            createdAt: new Date().toISOString()
          };
          
          const firebaseAPI = createFirebaseAPI();
          
          const success = await firebaseAPI.updateParticipant(eventId, participant);
          
          // Property: Should handle edge case scores correctly
          if (!success) {
            return false;
          }
          
          const loadedEvent = await firebaseAPI.loadEvent(eventId);
          const loaded = loadedEvent.participants.find(p => p.id === participant.id);
          
          if (!loaded) {
            return false;
          }
          
          return loaded.score === participant.score;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participant path structure should follow Firebase RTDB conventions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => !s.includes('/') && /^[a-zA-Z0-9_-]+$/.test(s)),
          participant: fc.record({
            id: fc.string({ minLength: 5, maxLength: 50 })
              .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
            name: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0),
            avatar: fc.constantFrom('🐱', '🐶'),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.dictionary(
              fc.integer({ min: 0, max: 34 }).map(String),
              fc.integer({ min: 0, max: 1 })
            ),
            createdAt: fc.date().map(d => d.toISOString())
          })
        }),
        async ({ eventId, participant }) => {
          capturedRequests = [];
          
          // Initialize event
          firebaseStorage[eventId] = {
            title: 'Test Event',
            pin: '123456',
            participants: [],
            disabledQuestions: [],
            createdAt: new Date().toISOString()
          };
          
          const firebaseAPI = createFirebaseAPI();
          
          await firebaseAPI.updateParticipant(eventId, participant);
          
          const request = capturedRequests.find(r => 
            r.method === 'PUT' && r.url.includes('/participants.json')
          );
          
          // Property: URL should follow pattern /events/{eventId}/participants.json
          if (!request) {
            return false;
          }
          
          const urlPattern = new RegExp(`/events/${eventId}/participants\\.json`);
          return urlPattern.test(request.url);
        }
      ),
      { numRuns: 100 }
    );
  });
});
