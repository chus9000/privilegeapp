/**
 * Property-Based Tests for Token Refresh
 * Feature: auth-bypass-fix
 * 
 * Property 7: Token refresh maintains authentication
 * Validates: Requirements 1.5, 4.2, 4.3
 * 
 * For any expired token, when getIdToken is called, the Auth_Manager must attempt 
 * to refresh the token, and if refresh fails, must clear the session.
 */

import { describe, test, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the AuthManager code
const authManagerCode = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');

function createAuthManager(shouldRefreshSucceed) {
  const localStorage = {
    _store: {},
    getItem(key) { return this._store[key] || null; },
    setItem(key, value) { this._store[key] = value.toString(); },
    removeItem(key) { delete this._store[key]; },
    clear() { this._store = {}; }
  };

  let refreshAttempted = false;
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'http://example.com/photo.jpg',
    refreshToken: 'refresh-token',
    getIdToken: vi.fn(async (forceRefresh) => {
      if (forceRefresh) {
        refreshAttempted = true;
        if (!shouldRefreshSucceed) {
          throw new Error('Token refresh failed');
        }
      }
      return 'new-token-' + Date.now();
    }),
    getIdTokenResult: vi.fn(async () => ({
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      token: 'new-token'
    }))
  };

  const mockAuth = {
    currentUser: mockUser,
    onAuthStateChanged: vi.fn((callback) => {
      setTimeout(() => callback(mockUser), 0);
      return () => {};
    }),
    signOut: vi.fn(async () => { mockAuth.currentUser = null; })
  };

  const firebase = {
    apps: [],
    initializeApp: vi.fn(() => ({})),
    auth: vi.fn(() => mockAuth)
  };
  firebase.auth.GoogleAuthProvider = class {};

  const context = {
    firebase, localStorage,
    console: { log: () => {}, error: () => {}, warn: () => {} },
    FIREBASE_CONFIG: { apiKey: 'test', authDomain: 'test.firebaseapp.com', projectId: 'test' },
    Date
  };

  const func = new Function('window', 'firebase', 'localStorage', 'console',
    authManagerCode + '; return new AuthManager();');
  const authManager = func(context, firebase, localStorage, console);
  
  return { authManager, localStorage, getRefreshAttempted: () => refreshAttempted };
}

describe('Property 7: Token refresh maintains authentication', () => {
  test('**Validates: Requirements 1.5, 4.2** - expired token triggers refresh attempt', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (shouldSucceed) => {
        const { authManager, getRefreshAttempted } = createAuthManager(shouldSucceed);
        await authManager.initialize();
        await new Promise(resolve => setTimeout(resolve, 10));
        
        authManager.currentUser = {
          uid: 'test', email: 'test@example.com',
          expiresAt: Date.now() - 1000 // Expired
        };

        try {
          await authManager.getIdToken();
        } catch (error) {
          // Expected if refresh fails
        }

        return getRefreshAttempted() === true;
      }),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 4.3** - failed refresh clears session', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(false), async (shouldSucceed) => {
        const { authManager, localStorage } = createAuthManager(shouldSucceed);
        await authManager.initialize();
        await new Promise(resolve => setTimeout(resolve, 10));
        
        authManager.currentUser = {
          uid: 'test', email: 'test@example.com',
          expiresAt: Date.now() - 1000
        };

        try {
          await authManager.getIdToken();
        } catch (error) {
          // Expected
        }

        return authManager.getCurrentUser() === null &&
               localStorage.getItem('firebase_auth_user') === null;
      }),
      { numRuns: 100 }
    );
  });
});
