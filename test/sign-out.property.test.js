/**
 * Property-Based Tests for Sign-Out
 * Feature: auth-bypass-fix
 * 
 * Property 8: Sign-out clears all session data
 * Validates: Requirements 4.5
 * 
 * For any authenticated user, when signOut is called, the system must revoke 
 * the Firebase session and clear all local storage data.
 */

import { describe, test, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

const authManagerCode = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');

function createAuthManager(user) {
  const localStorage = {
    _store: {},
    getItem(key) { return this._store[key] || null; },
    setItem(key, value) { this._store[key] = value.toString(); },
    removeItem(key) { delete this._store[key]; },
    clear() { this._store = {}; }
  };

  const mockAuth = {
    currentUser: user,
    onAuthStateChanged: vi.fn((callback) => {
      setTimeout(() => callback(user), 0);
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
    console: { log: () => {}, error: () => {} },
    FIREBASE_CONFIG: { apiKey: 'test', authDomain: 'test.firebaseapp.com', projectId: 'test' },
    Date
  };

  const func = new Function('window', 'firebase', 'localStorage', 'console',
    authManagerCode + '; return new AuthManager();');
  const authManager = func(context, firebase, localStorage, console);
  
  return { authManager, localStorage, mockAuth };
}

const userGen = fc.record({
  uid: fc.uuid(),
  email: fc.emailAddress(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  photoURL: fc.webUrl()
});

describe('Property 8: Sign-out clears all session data', () => {
  test('**Validates: Requirements 4.5** - signOut clears memory', async () => {
    await fc.assert(
      fc.asyncProperty(userGen, async (user) => {
        const { authManager } = createAuthManager(user);
        await authManager.initialize();
        await new Promise(resolve => setTimeout(resolve, 10));
        
        authManager.currentUser = { ...user, idToken: 'token', expiresAt: Date.now() + 3600000 };
        await authManager.signOut();
        
        return authManager.getCurrentUser() === null;
      }),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 4.5** - signOut clears localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(userGen, async (user) => {
        const { authManager, localStorage } = createAuthManager(user);
        await authManager.initialize();
        await new Promise(resolve => setTimeout(resolve, 10));
        
        authManager.currentUser = { ...user, idToken: 'token', expiresAt: Date.now() + 3600000 };
        localStorage.setItem('firebase_auth_user', JSON.stringify(authManager.currentUser));
        
        await authManager.signOut();
        
        return localStorage.getItem('firebase_auth_user') === null;
      }),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 4.5** - signOut calls Firebase signOut', async () => {
    await fc.assert(
      fc.asyncProperty(userGen, async (user) => {
        const { authManager, mockAuth } = createAuthManager(user);
        await authManager.initialize();
        await new Promise(resolve => setTimeout(resolve, 10));
        
        authManager.currentUser = { ...user, idToken: 'token', expiresAt: Date.now() + 3600000 };
        await authManager.signOut();
        
        return mockAuth.signOut.mock.calls.length > 0;
      }),
      { numRuns: 100 }
    );
  });
});
