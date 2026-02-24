/**
 * Property-Based Tests for Credential Storage
 * Feature: auth-bypass-fix
 * 
 * Property 5: Successful authentication stores valid credentials
 * Validates: Requirements 1.2
 * 
 * For any successful OAuth response, the Auth_Manager must store user credentials 
 * (uid, email, tokens) in both memory and localStorage.
 */

import { describe, test, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the AuthManager code
const authManagerCode = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');

/**
 * Create an AuthManager instance in a clean environment
 * @param {Object} mockFirebaseUser - Mock Firebase user object
 * @returns {Object} AuthManager instance and mock objects
 */
function createAuthManager(mockFirebaseUser) {
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

  // Mock Firebase Auth
  const mockAuth = {
    currentUser: mockFirebaseUser,
    onAuthStateChanged: vi.fn((callback) => {
      // Immediately call with current user
      setTimeout(() => callback(mockFirebaseUser), 0);
      return () => {}; // Unsubscribe function
    }),
    signInWithPopup: vi.fn(async () => {
      if (!mockFirebaseUser) {
        throw new Error('No user');
      }
      return { user: mockFirebaseUser };
    }),
    signOut: vi.fn(async () => {
      mockAuth.currentUser = null;
    })
  };

  // Mock Firebase user with token methods
  if (mockFirebaseUser) {
    mockFirebaseUser.getIdToken = vi.fn(async () => {
      return 'mock-id-token-' + Date.now();
    });

    mockFirebaseUser.getIdTokenResult = vi.fn(async () => {
      return {
        expirationTime: new Date(Date.now() + 3600000).toISOString(),
        token: 'mock-id-token'
      };
    });
  }

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
      warn: () => {}
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
    mockAuth,
    mockFirebaseUser
  };
}

// Generators for property-based testing

/**
 * Generate successful OAuth user responses
 */
const successfulOAuthGen = fc.record({
  uid: fc.uuid(),
  email: fc.emailAddress(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  photoURL: fc.webUrl(),
  refreshToken: fc.string({ minLength: 20, maxLength: 100 })
});

describe('Property 5: Successful authentication stores valid credentials', () => {
  test('**Validates: Requirements 1.2** - successful OAuth stores credentials in memory', async () => {
    await fc.assert(
      fc.asyncProperty(
        successfulOAuthGen,
        async (oauthUser) => {
          // Create mock Firebase user
          const mockUser = {
            uid: oauthUser.uid,
            email: oauthUser.email,
            displayName: oauthUser.displayName,
            photoURL: oauthUser.photoURL,
            refreshToken: oauthUser.refreshToken
          };

          // Create AuthManager
          const { authManager } = createAuthManager(mockUser);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Trigger sign-in
          await authManager.signInWithGoogle();

          // Property: Credentials must be stored in memory
          const currentUser = authManager.getCurrentUser();
          
          return currentUser !== null &&
                 currentUser.uid === oauthUser.uid &&
                 currentUser.email === oauthUser.email &&
                 currentUser.displayName === oauthUser.displayName &&
                 currentUser.photoURL === oauthUser.photoURL &&
                 currentUser.refreshToken === oauthUser.refreshToken &&
                 currentUser.idToken !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 1.2** - successful OAuth stores credentials in localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        successfulOAuthGen,
        async (oauthUser) => {
          // Create mock Firebase user
          const mockUser = {
            uid: oauthUser.uid,
            email: oauthUser.email,
            displayName: oauthUser.displayName,
            photoURL: oauthUser.photoURL,
            refreshToken: oauthUser.refreshToken
          };

          // Create AuthManager
          const { authManager, localStorage } = createAuthManager(mockUser);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Trigger sign-in
          await authManager.signInWithGoogle();

          // Property: Credentials must be stored in localStorage
          const storedData = localStorage.getItem('firebase_auth_user');
          
          if (!storedData) {
            return false;
          }

          const storedUser = JSON.parse(storedData);
          
          return storedUser.uid === oauthUser.uid &&
                 storedUser.email === oauthUser.email &&
                 storedUser.displayName === oauthUser.displayName &&
                 storedUser.photoURL === oauthUser.photoURL &&
                 storedUser.refreshToken === oauthUser.refreshToken &&
                 storedUser.idToken !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 1.2** - stored credentials include ID token', async () => {
    await fc.assert(
      fc.asyncProperty(
        successfulOAuthGen,
        async (oauthUser) => {
          // Create mock Firebase user
          const mockUser = {
            uid: oauthUser.uid,
            email: oauthUser.email,
            displayName: oauthUser.displayName,
            photoURL: oauthUser.photoURL,
            refreshToken: oauthUser.refreshToken
          };

          // Create AuthManager
          const { authManager } = createAuthManager(mockUser);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Trigger sign-in
          await authManager.signInWithGoogle();

          // Property: ID token must be included in stored credentials
          const currentUser = authManager.getCurrentUser();
          
          return currentUser !== null &&
                 currentUser.idToken !== undefined &&
                 currentUser.idToken !== null &&
                 typeof currentUser.idToken === 'string' &&
                 currentUser.idToken.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 1.2** - stored credentials include expiration time', async () => {
    await fc.assert(
      fc.asyncProperty(
        successfulOAuthGen,
        async (oauthUser) => {
          // Create mock Firebase user
          const mockUser = {
            uid: oauthUser.uid,
            email: oauthUser.email,
            displayName: oauthUser.displayName,
            photoURL: oauthUser.photoURL,
            refreshToken: oauthUser.refreshToken
          };

          // Create AuthManager
          const { authManager } = createAuthManager(mockUser);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Trigger sign-in
          await authManager.signInWithGoogle();

          // Property: Expiration time must be included in stored credentials
          const currentUser = authManager.getCurrentUser();
          
          return currentUser !== null &&
                 currentUser.expiresAt !== undefined &&
                 currentUser.expiresAt !== null &&
                 typeof currentUser.expiresAt === 'number' &&
                 currentUser.expiresAt > Date.now();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 1.2** - memory and localStorage credentials are consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        successfulOAuthGen,
        async (oauthUser) => {
          // Create mock Firebase user
          const mockUser = {
            uid: oauthUser.uid,
            email: oauthUser.email,
            displayName: oauthUser.displayName,
            photoURL: oauthUser.photoURL,
            refreshToken: oauthUser.refreshToken
          };

          // Create AuthManager
          const { authManager, localStorage } = createAuthManager(mockUser);

          // Initialize
          await authManager.initialize();
          
          // Wait for auth state to settle
          await new Promise(resolve => setTimeout(resolve, 10));

          // Trigger sign-in
          await authManager.signInWithGoogle();

          // Property: Memory and localStorage must have consistent credentials
          const memoryUser = authManager.getCurrentUser();
          const storedData = localStorage.getItem('firebase_auth_user');
          
          if (!memoryUser || !storedData) {
            return false;
          }

          const storedUser = JSON.parse(storedData);
          
          return memoryUser.uid === storedUser.uid &&
                 memoryUser.email === storedUser.email &&
                 memoryUser.displayName === storedUser.displayName &&
                 memoryUser.photoURL === storedUser.photoURL &&
                 memoryUser.refreshToken === storedUser.refreshToken &&
                 memoryUser.idToken === storedUser.idToken &&
                 memoryUser.expiresAt === storedUser.expiresAt;
        }
      ),
      { numRuns: 100 }
    );
  });
});
