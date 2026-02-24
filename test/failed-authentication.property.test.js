/**
 * Property-Based Tests for Failed Authentication
 * Feature: auth-bypass-fix
 * 
 * Property 6: Failed authentication prevents session creation
 * Validates: Requirements 1.3
 * 
 * For any failed or cancelled OAuth flow, the Auth_Manager must not create any 
 * user session or store any credentials.
 */

import { describe, test, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the AuthManager code
const authManagerCode = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');

/**
 * Create an AuthManager instance that will fail authentication
 * @param {string} errorCode - Firebase error code
 * @returns {Object} AuthManager instance and mock objects
 */
function createAuthManager(errorCode) {
  // Mock localStorage
  const localStorage = {
    _store: {},
    getItem(key) {
      return this._store[key] || null;
    },
    setItem(key, value) {
      this._store[key] = value.toString();
    },
    removeItem(key) {
      delete this._store[key];
    },
    clear() {
      this._store = {};
    }
  };

  // Mock Firebase Auth that fails
  const mockAuth = {
    currentUser: null,
    onAuthStateChanged: vi.fn((callback) => {
      // Immediately call with null user
      setTimeout(() => callback(null), 0);
      return () => {}; // Unsubscribe function
    }),
    signInWithPopup: vi.fn(async () => {
      const error = new Error('Auth failed');
      error.code = errorCode;
      throw error;
    }),
    signOut: vi.fn(async () => {
      mockAuth.currentUser = null;
    })
  };

  // Mock Firebase SDK
  const firebase = {
    apps: [],
    initializeApp: vi.fn(() => ({})),
    auth: vi.fn(() => mockAuth)
  };

  firebase.auth.GoogleAuthProvider = class {
    constructor() {}
  };

  // Create context
  const context = {
    firebase: firebase,
    localStorage: localStorage,
    console: {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {}
    },
    FIREBASE_CONFIG: {
      apiKey: 'test-api-key',
      authDomain: 'test.firebaseapp.com',
      projectId: 'test-project'
    },
    Date: Date
  };

  // Execute AuthManager code in context
  const func = new Function(
    'window',
    'firebase',
    'localStorage',
    'console',
    authManagerCode + '; return new AuthManager();'
  );
  
  const authManager = func(context, firebase, localStorage, console);
  
  return { 
    authManager, 
    localStorage, 
    mockAuth
  };
}

// Generators for property-based testing

/**
 * Generate Firebase error codes
 */
const errorCodeGen = fc.constantFrom(
  'auth/network-request-failed',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/popup-blocked',
  'auth/internal-error',
  'auth/invalid-api-key',
  'auth/app-deleted',
  'auth/unauthorized-domain'
);

describe('Property 6: Failed authentication prevents session creation', () => {
  test('**Validates: Requirements 1.3** - failed auth does not create session in memory', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorCodeGen,
        async (errorCode) => {
          // Create AuthManager that will fail
          const { authManager } = createAuthManager(errorCode);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Attempt sign-in (should fail)
          try {
            await authManager.signInWithGoogle();
          } catch (error) {
            // Expected to fail
          }

          // Property: No session should be created in memory
          const currentUser = authManager.getCurrentUser();
          
          return currentUser === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 1.3** - failed auth does not store credentials in localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorCodeGen,
        async (errorCode) => {
          // Create AuthManager that will fail
          const { authManager, localStorage } = createAuthManager(errorCode);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Attempt sign-in (should fail)
          try {
            await authManager.signInWithGoogle();
          } catch (error) {
            // Expected to fail
          }

          // Property: No credentials should be stored in localStorage
          const storedData = localStorage.getItem('firebase_auth_user');
          
          return storedData === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 1.3** - cancelled auth returns null without error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant('auth/popup-closed-by-user'),
        async (errorCode) => {
          // Create AuthManager that will be cancelled
          const { authManager } = createAuthManager(errorCode);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Attempt sign-in (should be cancelled)
          let result;
          let errorThrown = false;
          try {
            result = await authManager.signInWithGoogle();
          } catch (error) {
            errorThrown = true;
          }

          // Property: Cancelled auth should return null without throwing
          return result === null && errorThrown === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 1.3** - network error throws appropriate error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant('auth/network-request-failed'),
        async (errorCode) => {
          // Create AuthManager that will have network error
          const { authManager } = createAuthManager(errorCode);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Attempt sign-in (should fail with network error)
          let errorMessage = '';
          try {
            await authManager.signInWithGoogle();
          } catch (error) {
            errorMessage = error.message;
          }

          // Property: Network error should throw with specific message
          return errorMessage.includes('Network error');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 1.3** - unknown errors throw generic error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'auth/internal-error',
          'auth/invalid-api-key',
          'auth/app-deleted',
          'auth/unauthorized-domain'
        ),
        async (errorCode) => {
          // Create AuthManager that will have unknown error
          const { authManager } = createAuthManager(errorCode);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Attempt sign-in (should fail with unknown error)
          let errorMessage = '';
          try {
            await authManager.signInWithGoogle();
          } catch (error) {
            errorMessage = error.message;
          }

          // Property: Unknown error should throw with generic message
          return errorMessage.includes('Authentication failed');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 1.3** - failed auth does not affect isAuthenticated', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorCodeGen,
        async (errorCode) => {
          // Create AuthManager that will fail
          const { authManager } = createAuthManager(errorCode);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Check auth before attempt
          const authBefore = authManager.isAuthenticated();

          // Attempt sign-in (should fail)
          try {
            await authManager.signInWithGoogle();
          } catch (error) {
            // Expected to fail
          }

          // Check auth after attempt
          const authAfter = authManager.isAuthenticated();

          // Property: Failed auth should not change authentication state
          return authBefore === false && authAfter === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
