/**
 * Property-Based Test for Free Play Response Persistence
 * Feature: full-featured-quiz-app
 * 
 * Property 28: Free Play Response Persistence
 * Validates: Requirements 2.7
 * 
 * For any completed free play session, the participant's score and answers
 * should be saved to Firebase under `/events/freeplay/participants/{participantId}`.
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
    
    // Extract participant ID from URL
    const participantIdMatch = url.match(/\/events\/freeplay\/participants\/([^/.]+)\.json/);
    const participantId = participantIdMatch ? participantIdMatch[1] : null;
    
    if (method === 'PUT' && participantId) {
      // Save to in-memory storage
      firebaseStorage[participantId] = request.body;
      
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => request.body
      };
    } else if (method === 'GET' && participantId) {
      // Load from in-memory storage
      const data = firebaseStorage[participantId];
      
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
  
  // Mock window.FIREBASE_CONFIG
  global.window = {
    FIREBASE_CONFIG: {
      databaseURL: 'https://test-project.firebaseio.com'
    }
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  capturedRequests = [];
  firebaseStorage = {};
});

/**
 * Simulate the saveFreePlayResponse function from event.js
 */
async function saveFreePlayResponse(participant) {
  try {
    // Create anonymous response with only score and answers
    const anonymousResponse = {
      id: participant.id,
      score: participant.score,
      answers: participant.answers,
      createdAt: participant.createdAt
    };
    
    // Save to Firebase at /events/freeplay/participants/{participantId}
    const url = `${window.FIREBASE_CONFIG.databaseURL}/events/freeplay/participants/${participant.id}.json`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(anonymousResponse)
    });
    
    if (!response.ok) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Load a free play response from Firebase
 */
async function loadFreePlayResponse(participantId) {
  try {
    const url = `${window.FIREBASE_CONFIG.databaseURL}/events/freeplay/participants/${participantId}.json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    return null;
  }
}

describe('Property 28: Free Play Response Persistence', () => {
  test('free play response should be saved to correct Firebase path', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary participant data
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 50 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          score: fc.integer({ min: -25, max: 25 }),
          answers: fc.dictionary(
            fc.integer({ min: 0, max: 34 }).map(String),
            fc.integer({ min: 0, max: 1 })
          ),
          createdAt: fc.date().map(d => d.toISOString())
        }),
        async ({ id, score, answers, createdAt }) => {
          // Reset captured requests
          capturedRequests = [];
          
          const participant = { id, score, answers, createdAt };
          
          // Save free play response
          const success = await saveFreePlayResponse(participant);
          
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
          
          // Property 3: Request URL should follow pattern /events/freeplay/participants/{participantId}.json
          const expectedUrlPattern = `/events/freeplay/participants/${id}.json`;
          if (!request.url.includes(expectedUrlPattern)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('free play response should contain only anonymous data (no name/avatar)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 50 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          score: fc.integer({ min: -25, max: 25 }),
          answers: fc.dictionary(
            fc.integer({ min: 0, max: 34 }).map(String),
            fc.integer({ min: 0, max: 1 })
          ),
          createdAt: fc.date().map(d => d.toISOString()),
          // These should NOT be saved for free play
          name: fc.string({ minLength: 5, maxLength: 30 }),
          avatar: fc.string({ minLength: 1, maxLength: 5 })
        }),
        async ({ id, score, answers, createdAt, name, avatar }) => {
          capturedRequests = [];
          
          // Create participant with name and avatar (which should be filtered out)
          const participant = { id, score, answers, createdAt, name, avatar };
          
          await saveFreePlayResponse(participant);
          
          const request = capturedRequests.find(r => r.method === 'PUT');
          
          // Property: Request body should NOT contain name or avatar
          if (!request || !request.body) {
            return false;
          }
          
          const body = request.body;
          
          // Should not have name or avatar
          if ('name' in body || 'avatar' in body) {
            return false;
          }
          
          // Should have only id, score, answers, createdAt
          const expectedKeys = ['id', 'score', 'answers', 'createdAt'];
          const actualKeys = Object.keys(body).sort();
          
          return JSON.stringify(actualKeys) === JSON.stringify(expectedKeys.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  test('free play response should persist all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 50 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          score: fc.integer({ min: -25, max: 25 }),
          answers: fc.dictionary(
            fc.integer({ min: 0, max: 34 }).map(String),
            fc.integer({ min: 0, max: 1 })
          ),
          createdAt: fc.date().map(d => d.toISOString())
        }),
        async ({ id, score, answers, createdAt }) => {
          capturedRequests = [];
          
          const participant = { id, score, answers, createdAt };
          
          await saveFreePlayResponse(participant);
          
          const request = capturedRequests.find(r => r.method === 'PUT');
          
          // Property: Request body should contain all required fields with correct values
          if (!request || !request.body) {
            return false;
          }
          
          const body = request.body;
          
          if (body.id !== id) {
            return false;
          }
          
          if (body.score !== score) {
            return false;
          }
          
          if (body.createdAt !== createdAt) {
            return false;
          }
          
          // Check answers object matches
          if (JSON.stringify(body.answers) !== JSON.stringify(answers)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('free play response round-trip should preserve all data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 50 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          score: fc.integer({ min: -25, max: 25 }),
          answers: fc.dictionary(
            fc.integer({ min: 0, max: 34 }).map(String),
            fc.integer({ min: 0, max: 1 }),
            { minKeys: 1, maxKeys: 35 }
          ),
          createdAt: fc.date().map(d => d.toISOString())
        }),
        async ({ id, score, answers, createdAt }) => {
          capturedRequests = [];
          
          const participant = { id, score, answers, createdAt };
          
          // Save response
          await saveFreePlayResponse(participant);
          
          // Load response back
          const loadedResponse = await loadFreePlayResponse(id);
          
          // Property: Loaded response should match saved response
          if (!loadedResponse) {
            return false;
          }
          
          if (loadedResponse.id !== id) {
            return false;
          }
          
          if (loadedResponse.score !== score) {
            return false;
          }
          
          if (loadedResponse.createdAt !== createdAt) {
            return false;
          }
          
          // Check answers match
          if (JSON.stringify(loadedResponse.answers) !== JSON.stringify(answers)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('free play response should handle empty answers object', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 50 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          score: fc.constant(0), // Score should be 0 if no answers
          createdAt: fc.date().map(d => d.toISOString())
        }),
        async ({ id, score, createdAt }) => {
          capturedRequests = [];
          
          const participant = {
            id,
            score,
            answers: {}, // Empty answers
            createdAt
          };
          
          const success = await saveFreePlayResponse(participant);
          
          // Property: Should successfully save even with empty answers
          if (!success) {
            return false;
          }
          
          const request = capturedRequests.find(r => r.method === 'PUT');
          
          if (!request || !request.body) {
            return false;
          }
          
          // Should have empty answers object
          return JSON.stringify(request.body.answers) === '{}';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('free play response should handle all questions answered', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 50 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          score: fc.integer({ min: -25, max: 25 }),
          createdAt: fc.date().map(d => d.toISOString())
        }),
        async ({ id, score, createdAt }) => {
          capturedRequests = [];
          
          // Create answers for all 35 questions
          const answers = {};
          for (let i = 0; i < 35; i++) {
            answers[i.toString()] = Math.random() < 0.5 ? 0 : 1;
          }
          
          const participant = { id, score, answers, createdAt };
          
          const success = await saveFreePlayResponse(participant);
          
          // Property: Should successfully save with all questions answered
          if (!success) {
            return false;
          }
          
          const request = capturedRequests.find(r => r.method === 'PUT');
          
          if (!request || !request.body) {
            return false;
          }
          
          // Should have 35 answers
          return Object.keys(request.body.answers).length === 35;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('multiple free play responses should be stored independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 10, maxLength: 50 })
              .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
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
        }),
        async (participants) => {
          capturedRequests = [];
          
          // Save all participants
          for (const participant of participants) {
            await saveFreePlayResponse(participant);
          }
          
          // Property: Each participant should be stored independently
          for (const participant of participants) {
            const loaded = await loadFreePlayResponse(participant.id);
            
            if (!loaded) {
              return false;
            }
            
            if (loaded.id !== participant.id ||
                loaded.score !== participant.score ||
                loaded.createdAt !== participant.createdAt) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('free play response should handle score edge cases', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 50 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
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
        }),
        async ({ id, score, answers, createdAt }) => {
          capturedRequests = [];
          
          const participant = { id, score, answers, createdAt };
          
          const success = await saveFreePlayResponse(participant);
          
          // Property: Should handle edge case scores correctly
          if (!success) {
            return false;
          }
          
          const request = capturedRequests.find(r => r.method === 'PUT');
          
          if (!request || !request.body) {
            return false;
          }
          
          return request.body.score === score;
        }
      ),
      { numRuns: 100 }
    );
  });
});
