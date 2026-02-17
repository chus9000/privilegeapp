/**
 * Property-Based Tests for Authentication Manager
 * Feature: full-featured-quiz-app
 * 
 * Property 12: Authentication State Persistence
 * Validates: Requirements 3.2, 3.4
 * 
 * For any authenticated user, navigating between pages should preserve 
 * the authentication state and user information.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the AuthManager code
const authManagerCode = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');

// Create a function to instantiate AuthManager in a clean environment
function createAuthManager(sharedLocalStorage = null) {
  // Create or use shared localStorage
  const storage = sharedLocalStorage || {
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
  
  // Create a new context with window object
  const context = {
    localStorage: storage,
    console: console,
    Date: Date
  };
  
  // Execute the AuthManager code in the context
  const func = new Function('window', 'localStorage', 'console', 'Date', authManagerCode + '; return new AuthManager();');
  const authManager = func(context, storage, console, Date);
  
  return { authManager, localStorage: storage };
}

describe('Property 12: Authentication State Persistence', () => {
  test('authenticated user state persists across AuthManager instances (simulating page navigation)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary user data
        fc.record({
          uid: fc.string({ minLength: 5, maxLength: 50 }),
          email: fc.emailAddress(),
          displayName: fc.string({ minLength: 1, maxLength: 100 }),
          photoURL: fc.webUrl(),
          idToken: fc.string({ minLength: 20, maxLength: 100 }),
          refreshToken: fc.string({ minLength: 20, maxLength: 100 })
        }),
        async (userData) => {
          // Add expiresAt dynamically to ensure it's always in the future
          const userDataWithExpiry = {
            ...userData,
            expiresAt: Date.now() + 3600000 // Always 1 hour in the future
          };
          // Create first AuthManager instance (simulating first page)
          const { authManager: authManager1, localStorage: storage } = createAuthManager();
          
          // Initialize and sign in
          await authManager1.initialize();
          
          // Manually set the user (simulating successful sign-in)
          authManager1.currentUser = userDataWithExpiry;
          storage.setItem('firebase_auth_user', JSON.stringify(userDataWithExpiry));
          
          // Create second AuthManager instance with same localStorage (simulating page navigation)
          const { authManager: authManager2 } = createAuthManager(storage);
          
          // Initialize second instance (should restore from localStorage)
          await authManager2.initialize();
          
          // Property: Authentication state should be preserved
          const isAuthenticated2 = authManager2.isAuthenticated();
          const currentUser2 = authManager2.getCurrentUser();
          
          // Verify authentication state persisted
          return isAuthenticated2 === true &&
                 currentUser2 !== null &&
                 currentUser2.uid === userDataWithExpiry.uid &&
                 currentUser2.email === userDataWithExpiry.email &&
                 currentUser2.displayName === userDataWithExpiry.displayName &&
                 currentUser2.photoURL === userDataWithExpiry.photoURL &&
                 currentUser2.idToken === userDataWithExpiry.idToken &&
                 currentUser2.refreshToken === userDataWithExpiry.refreshToken &&
                 currentUser2.expiresAt === userDataWithExpiry.expiresAt;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sign out clears authentication state across instances', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          uid: fc.string({ minLength: 5, maxLength: 50 }),
          email: fc.emailAddress(),
          displayName: fc.string({ minLength: 1, maxLength: 100 }),
          photoURL: fc.webUrl(),
          idToken: fc.string({ minLength: 20, maxLength: 100 }),
          refreshToken: fc.string({ minLength: 20, maxLength: 100 })
        }),
        async (userData) => {
          const userDataWithExpiry = {
            ...userData,
            expiresAt: Date.now() + 3600000
          };
          
          // Create first AuthManager instance
          const { authManager: authManager1, localStorage: storage } = createAuthManager();
          
          await authManager1.initialize();
          
          // Set authenticated user
          authManager1.currentUser = userDataWithExpiry;
          storage.setItem('firebase_auth_user', JSON.stringify(userDataWithExpiry));
          
          // Sign out
          await authManager1.signOut();
          
          // Create second instance (simulating page navigation after sign out)
          const { authManager: authManager2 } = createAuthManager(storage);
          
          await authManager2.initialize();
          
          // Property: Sign out should clear state across instances
          return authManager2.isAuthenticated() === false &&
                 authManager2.getCurrentUser() === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('expired token is not considered authenticated after page navigation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          uid: fc.string({ minLength: 5, maxLength: 50 }),
          email: fc.emailAddress(),
          displayName: fc.string({ minLength: 1, maxLength: 100 }),
          photoURL: fc.webUrl(),
          idToken: fc.string({ minLength: 20, maxLength: 100 }),
          refreshToken: fc.string({ minLength: 20, maxLength: 100 })
        }),
        async (userData) => {
          // Create user with expired token (dynamically generated to ensure it's in the past)
          const userDataWithExpiredToken = {
            ...userData,
            expiresAt: Date.now() - 3600000 // Expired 1 hour ago
          };
          
          // Create first AuthManager instance
          const { authManager: authManager1, localStorage: storage } = createAuthManager();
          
          await authManager1.initialize();
          
          // Set user with expired token
          authManager1.currentUser = userDataWithExpiredToken;
          storage.setItem('firebase_auth_user', JSON.stringify(userDataWithExpiredToken));
          
          // Create second instance (simulating page navigation)
          const { authManager: authManager2 } = createAuthManager(storage);
          
          await authManager2.initialize();
          
          // Property: Expired token should not be considered authenticated
          // The isAuthenticated() method should detect expiration and sign out
          const isAuthenticated = authManager2.isAuthenticated();
          
          return isAuthenticated === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('authentication state listeners are notified on initialization with persisted state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          uid: fc.string({ minLength: 5, maxLength: 50 }),
          email: fc.emailAddress(),
          displayName: fc.string({ minLength: 1, maxLength: 100 }),
          photoURL: fc.webUrl(),
          idToken: fc.string({ minLength: 20, maxLength: 100 }),
          refreshToken: fc.string({ minLength: 20, maxLength: 100 })
        }),
        async (userData) => {
          const userDataWithExpiry = {
            ...userData,
            expiresAt: Date.now() + 3600000
          };
          
          // Create first instance and set user
          const { authManager: authManager1, localStorage: storage } = createAuthManager();
          await authManager1.initialize();
          authManager1.currentUser = userDataWithExpiry;
          storage.setItem('firebase_auth_user', JSON.stringify(userDataWithExpiry));
          
          // Create second instance (simulating page navigation)
          const { authManager: authManager2 } = createAuthManager(storage);
          
          // Set up listener before initialization
          let listenerCallCount = 0;
          let receivedUser = null;
          
          authManager2.onAuthStateChanged((user) => {
            listenerCallCount++;
            receivedUser = user; // Keep the last received value
          });
          
          // Initialize (should restore user and notify listener)
          await authManager2.initialize();
          
          // Property: Listener should be called with restored user
          // The listener is called immediately with current state (null), then again after init with restored user
          return listenerCallCount >= 1 &&
                 receivedUser !== null &&
                 receivedUser.uid === userDataWithExpiry.uid &&
                 receivedUser.email === userDataWithExpiry.email;
        }
      ),
      { numRuns: 100 }
    );
  });
});
