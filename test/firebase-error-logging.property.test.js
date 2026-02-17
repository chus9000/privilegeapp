/**
 * Property-Based Test for Firebase Error Logging
 * Feature: full-featured-quiz-app
 * 
 * Property 20: Firebase Error Logging
 * Validates: Requirements 15.5
 * 
 * For any Firebase operation that throws an error, the error should be logged
 * to the console with sufficient context for debugging (operation name, parameters,
 * error message, error code, and stack trace).
 */

import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest';
import fc from 'fast-check';

// Import DataManager class
let DataManager;

beforeEach(async () => {
  // Clear console mocks
  vi.clearAllMocks();
  
  // Mock console.error to capture error logs
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  
  // localStorage is already mocked by test/setup.js
  // Just clear it
  localStorage.clear();
  
  // Mock navigator
  global.navigator = { onLine: true };
  
  // Mock window
  global.window = {
    addEventListener: vi.fn(),
    FirebaseAPI: null
  };
  
  // Dynamically import DataManager
  const module = await import('../data-manager.js');
  DataManager = module.default || module;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.navigator;
  delete global.window;
});

/**
 * Create a mock FirebaseAPI that throws errors
 */
function createFailingFirebaseAPI(errorConfig) {
  return {
    async saveEvent(eventId, eventData) {
      const error = new Error(errorConfig.message || 'Firebase save failed');
      error.code = errorConfig.code || 'firebase/unknown';
      error.stack = errorConfig.stack || 'Error: Firebase save failed\n    at saveEvent (firebase.js:123:45)';
      throw error;
    },
    
    async loadEvent(eventId) {
      const error = new Error(errorConfig.message || 'Firebase load failed');
      error.code = errorConfig.code || 'firebase/unknown';
      error.stack = errorConfig.stack || 'Error: Firebase load failed\n    at loadEvent (firebase.js:234:56)';
      throw error;
    },
    
    async updateParticipant(eventId, participant) {
      const error = new Error(errorConfig.message || 'Firebase update failed');
      error.code = errorConfig.code || 'firebase/unknown';
      error.stack = errorConfig.stack || 'Error: Firebase update failed\n    at updateParticipant (firebase.js:345:67)';
      throw error;
    },
    
    async loadEventsByCreator(userId) {
      const error = new Error(errorConfig.message || 'Firebase query failed');
      error.code = errorConfig.code || 'firebase/unknown';
      error.stack = errorConfig.stack || 'Error: Firebase query failed\n    at loadEventsByCreator (firebase.js:456:78)';
      throw error;
    },
    
    async deleteEvent(eventId) {
      const error = new Error(errorConfig.message || 'Firebase delete failed');
      error.code = errorConfig.code || 'firebase/unknown';
      error.stack = errorConfig.stack || 'Error: Firebase delete failed\n    at deleteEvent (firebase.js:567:89)';
      throw error;
    }
  };
}

describe('Property 20: Firebase Error Logging', () => {
  test('saveEvent should log errors with operation name, eventId, error message, code, and stack', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          errorCode: fc.oneof(
            fc.constant('permission-denied'),
            fc.constant('network-request-failed'),
            fc.constant('firebase/unavailable'),
            fc.constant('firebase/timeout'),
            fc.constant('firebase/unknown')
          ),
          title: fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0),
          pin: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
        }),
        async ({ eventId, errorMessage, errorCode, title, pin }) => {
          // Create DataManager instance
          const dataManager = new DataManager();
          
          // Set up failing Firebase API
          const errorConfig = {
            message: errorMessage,
            code: errorCode,
            stack: `Error: ${errorMessage}\n    at saveEvent (firebase.js:123:45)\n    at async DataManager.saveEvent (data-manager.js:234:56)`
          };
          
          dataManager.firebaseAPI = createFailingFirebaseAPI(errorConfig);
          dataManager.initialized = true;
          dataManager.isOnline = true;
          
          // Clear previous console calls
          console.error.mockClear();
          
          // Attempt to save event (should fail and log error)
          const eventData = { title, pin, disabledQuestions: [], participants: [] };
          await dataManager.saveEvent(eventId, eventData);
          
          // Property 1: console.error should have been called
          if (console.error.mock.calls.length === 0) {
            return false;
          }
          
          // Find the error log call for saveEvent operation
          const errorCalls = console.error.mock.calls.filter(call => 
            call[0] && call[0].includes('Firebase operation failed: saveEvent')
          );
          
          if (errorCalls.length === 0) {
            return false;
          }
          
          const errorCall = errorCalls[0];
          
          // Property 2: First argument should identify the operation
          if (!errorCall[0].includes('saveEvent')) {
            return false;
          }
          
          // Property 3: Second argument should be an object with context
          const context = errorCall[1];
          if (!context || typeof context !== 'object') {
            return false;
          }
          
          // Property 4: Context should include operation name
          if (context.operation !== 'saveEvent') {
            return false;
          }
          
          // Property 5: Context should include eventId
          if (context.eventId !== eventId) {
            return false;
          }
          
          // Property 6: Context should include error message
          if (context.error !== errorMessage) {
            return false;
          }
          
          // Property 7: Context should include error code
          if (context.errorCode !== errorCode) {
            return false;
          }
          
          // Property 8: Context should include stack trace
          if (!context.stack || typeof context.stack !== 'string') {
            return false;
          }
          
          if (!context.stack.includes(errorMessage)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loadEvent should log errors with operation name, eventId, error message, code, and stack', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          errorCode: fc.oneof(
            fc.constant('permission-denied'),
            fc.constant('not-found'),
            fc.constant('firebase/unavailable'),
            fc.constant('firebase/timeout')
          )
        }),
        async ({ eventId, errorMessage, errorCode }) => {
          const dataManager = new DataManager();
          
          const errorConfig = {
            message: errorMessage,
            code: errorCode,
            stack: `Error: ${errorMessage}\n    at loadEvent (firebase.js:234:56)`
          };
          
          dataManager.firebaseAPI = createFailingFirebaseAPI(errorConfig);
          dataManager.initialized = true;
          dataManager.isOnline = true;
          
          console.error.mockClear();
          
          // Attempt to load event (should fail and log error)
          await dataManager.loadEvent(eventId);
          
          // Find the error log call for loadEvent operation
          const errorCalls = console.error.mock.calls.filter(call => 
            call[0] && call[0].includes('Firebase operation failed: loadEvent')
          );
          
          if (errorCalls.length === 0) {
            return false;
          }
          
          const context = errorCalls[0][1];
          
          // Verify all required context fields
          return context &&
                 context.operation === 'loadEvent' &&
                 context.eventId === eventId &&
                 context.error === errorMessage &&
                 context.errorCode === errorCode &&
                 typeof context.stack === 'string' &&
                 context.stack.includes(errorMessage);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('updateParticipant should log errors with operation name, eventId, participantId, error message, code, and stack', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          participantId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          errorCode: fc.oneof(
            fc.constant('permission-denied'),
            fc.constant('network-request-failed'),
            fc.constant('firebase/unavailable')
          )
        }),
        async ({ eventId, participantId, errorMessage, errorCode }) => {
          const dataManager = new DataManager();
          
          const errorConfig = {
            message: errorMessage,
            code: errorCode,
            stack: `Error: ${errorMessage}\n    at updateParticipant (firebase.js:345:67)`
          };
          
          dataManager.firebaseAPI = createFailingFirebaseAPI(errorConfig);
          dataManager.initialized = true;
          dataManager.isOnline = true;
          
          // Mock loadEvent to return a valid event
          dataManager.loadEvent = async () => ({
            title: 'Test Event',
            pin: '123456',
            participants: []
          });
          
          console.error.mockClear();
          
          // Attempt to update participant (should fail and log error)
          const participant = {
            id: participantId,
            name: 'Test User',
            avatar: '🐱',
            score: 10,
            answers: {}
          };
          
          await dataManager.updateParticipant(eventId, participant);
          
          // Find the error log call for updateParticipant operation
          const errorCalls = console.error.mock.calls.filter(call => 
            call[0] && call[0].includes('Firebase operation failed: updateParticipant')
          );
          
          if (errorCalls.length === 0) {
            return false;
          }
          
          const context = errorCalls[0][1];
          
          // Verify all required context fields including participantId
          return context &&
                 context.operation === 'updateParticipant' &&
                 context.eventId === eventId &&
                 context.participantId === participantId &&
                 context.error === errorMessage &&
                 context.errorCode === errorCode &&
                 typeof context.stack === 'string';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loadEventsByCreator should log errors with operation name, userId, error message, code, and stack', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          errorCode: fc.oneof(
            fc.constant('permission-denied'),
            fc.constant('firebase/unavailable'),
            fc.constant('firebase/timeout')
          )
        }),
        async ({ userId, errorMessage, errorCode }) => {
          const dataManager = new DataManager();
          
          const errorConfig = {
            message: errorMessage,
            code: errorCode,
            stack: `Error: ${errorMessage}\n    at loadEventsByCreator (firebase.js:456:78)`
          };
          
          dataManager.firebaseAPI = createFailingFirebaseAPI(errorConfig);
          dataManager.initialized = true;
          dataManager.isOnline = true;
          
          console.error.mockClear();
          
          // Attempt to load events by creator (should fail and log error)
          await dataManager.loadEventsByCreator(userId);
          
          // Find the error log call for loadEventsByCreator operation
          const errorCalls = console.error.mock.calls.filter(call => 
            call[0] && call[0].includes('Firebase operation failed: loadEventsByCreator')
          );
          
          if (errorCalls.length === 0) {
            return false;
          }
          
          const context = errorCalls[0][1];
          
          // Verify all required context fields
          return context &&
                 context.operation === 'loadEventsByCreator' &&
                 context.userId === userId &&
                 context.error === errorMessage &&
                 context.errorCode === errorCode &&
                 typeof context.stack === 'string';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('deleteEvent should log errors with operation name, eventId, error message, code, and stack', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          errorCode: fc.oneof(
            fc.constant('permission-denied'),
            fc.constant('network-request-failed'),
            fc.constant('firebase/unavailable')
          )
        }),
        async ({ eventId, errorMessage, errorCode }) => {
          const dataManager = new DataManager();
          
          const errorConfig = {
            message: errorMessage,
            code: errorCode,
            stack: `Error: ${errorMessage}\n    at deleteEvent (firebase.js:567:89)`
          };
          
          dataManager.firebaseAPI = createFailingFirebaseAPI(errorConfig);
          dataManager.initialized = true;
          dataManager.isOnline = true;
          
          console.error.mockClear();
          
          // Attempt to delete event (should fail and log error)
          await dataManager.deleteEvent(eventId);
          
          // Find the error log call for deleteEvent operation
          const errorCalls = console.error.mock.calls.filter(call => 
            call[0] && call[0].includes('Firebase operation failed: deleteEvent')
          );
          
          if (errorCalls.length === 0) {
            return false;
          }
          
          const context = errorCalls[0][1];
          
          // Verify all required context fields
          return context &&
                 context.operation === 'deleteEvent' &&
                 context.eventId === eventId &&
                 context.error === errorMessage &&
                 context.errorCode === errorCode &&
                 typeof context.stack === 'string';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sync queue processing should log errors with operation context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          errorCode: fc.oneof(
            fc.constant('permission-denied'),
            fc.constant('network-request-failed'),
            fc.constant('firebase/unavailable')
          ),
          operationType: fc.oneof(
            fc.constant('saveEvent'),
            fc.constant('updateParticipant'),
            fc.constant('deleteEvent')
          )
        }),
        async ({ eventId, errorMessage, errorCode, operationType }) => {
          const dataManager = new DataManager();
          
          const errorConfig = {
            message: errorMessage,
            code: errorCode,
            stack: `Error: ${errorMessage}\n    at ${operationType} (firebase.js:123:45)`
          };
          
          dataManager.firebaseAPI = createFailingFirebaseAPI(errorConfig);
          dataManager.initialized = true;
          dataManager.isOnline = true;
          
          // Add operation to sync queue
          const operation = {
            type: operationType,
            eventId: eventId,
            data: operationType === 'updateParticipant' 
              ? { id: 'test-participant', name: 'Test', score: 10 }
              : { title: 'Test', pin: '123456' },
            timestamp: Date.now()
          };
          
          dataManager.syncQueue = [operation];
          
          console.error.mockClear();
          
          // Process sync queue (should fail and log error)
          await dataManager.processSyncQueue();
          
          // Find the error log call for sync operation
          const errorCalls = console.error.mock.calls.filter(call => 
            call[0] && call[0].includes('Firebase operation failed during sync')
          );
          
          if (errorCalls.length === 0) {
            return false;
          }
          
          const context = errorCalls[0][1];
          
          // Verify all required context fields for sync operations
          return context &&
                 context.operation === operationType &&
                 context.eventId === eventId &&
                 typeof context.timestamp === 'number' &&
                 context.error === errorMessage &&
                 context.errorCode === errorCode &&
                 typeof context.stack === 'string';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('error logs should include stack traces for debugging', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          eventId: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          stackFrames: fc.array(
            fc.record({
              function: fc.string({ minLength: 5, maxLength: 20 }),
              file: fc.string({ minLength: 5, maxLength: 30 }),
              line: fc.integer({ min: 1, max: 1000 }),
              column: fc.integer({ min: 1, max: 100 })
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async ({ eventId, errorMessage, stackFrames }) => {
          const dataManager = new DataManager();
          
          // Build stack trace from frames
          const stackTrace = `Error: ${errorMessage}\n` + 
            stackFrames.map(frame => 
              `    at ${frame.function} (${frame.file}:${frame.line}:${frame.column})`
            ).join('\n');
          
          const errorConfig = {
            message: errorMessage,
            code: 'firebase/test-error',
            stack: stackTrace
          };
          
          dataManager.firebaseAPI = createFailingFirebaseAPI(errorConfig);
          dataManager.initialized = true;
          dataManager.isOnline = true;
          
          console.error.mockClear();
          
          // Attempt operation
          await dataManager.saveEvent(eventId, { title: 'Test', pin: '123456' });
          
          // Find error log
          const errorCalls = console.error.mock.calls.filter(call => 
            call[0] && call[0].includes('Firebase operation failed')
          );
          
          if (errorCalls.length === 0) {
            return false;
          }
          
          const context = errorCalls[0][1];
          
          // Property: Stack trace should be preserved in error log
          if (!context.stack || typeof context.stack !== 'string') {
            return false;
          }
          
          // Stack should contain the error message
          if (!context.stack.includes(errorMessage)) {
            return false;
          }
          
          // Stack should contain at least one function name from the frames
          const hasStackFrame = stackFrames.some(frame => 
            context.stack.includes(frame.function)
          );
          
          return hasStackFrame;
        }
      ),
      { numRuns: 100 }
    );
  });
});
