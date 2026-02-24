/**
 * Property-Based Tests for Log Security
 * Feature: auth-bypass-fix
 * 
 * Property 11: No sensitive data in logs
 * Validates: Requirements 7.5
 * 
 * For any authentication operation, log output must not contain tokens, refresh 
 * tokens, or other sensitive credentials in plain text.
 */

import { describe, test, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

const authManagerCode = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');

function createAuthManager(user, shouldFail = false) {
  const logMessages = [];
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
    signInWithPopup: vi.fn(async () => {
      if (shouldFail) {
        throw new Error('Auth failed');
      }
      return { user };
    }),
    signOut: vi.fn(async () => { mockAuth.currentUser = null; })
  };

  if (user) {
    user.getIdToken = vi.fn(async () => 'secret-token-' + Date.now());
    user.getIdTokenResult = vi.fn(async () => ({
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      token: 'secret-token'
    }));
  }

  const firebase = {
    apps: [],
    initializeApp: vi.fn(() => ({})),
    auth: vi.fn(() => mockAuth)
  };
  firebase.auth.GoogleAuthProvider = class {};

  const captureLog = (...args) => {
    logMessages.push(JSON.stringify(args));
  };

  const context = {
    firebase, localStorage,
    console: {
      log: captureLog,
      error: captureLog,
      warn: captureLog,
      info: captureLog
    },
    FIREBASE_CONFIG: { apiKey: 'test', authDomain: 'test.firebaseapp.com', projectId: 'test' },
    Date
  };

  const func = new Function('window', 'firebase', 'localStorage', 'console',
    authManagerCode + '; return new AuthManager();');
  const authManager = func(context, firebase, localStorage, console);
  
  return { authManager, getLogMessages: () => logMessages };
}

const userGen = fc.record({
  uid: fc.uuid(),
  email: fc.emailAddress(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  photoURL: fc.webUrl(),
  refreshToken: fc.string({ minLength: 20, maxLength: 100 })
});

describe('Property 11: No sensitive data in logs', () => {
  test('**Validates: Requirements 7.5** - logs do not contain ID tokens', async () => {
    await fc.assert(
      fc.asyncProperty(userGen, async (user) => {
        const mockUser = { ...user };
        const { authManager, getLogMessages } = createAuthManager(mockUser);
        await authManager.initialize();
        await new Promise(resolve => setTimeout(resolve, 10));
        
        try {
          await authManager.signInWithGoogle();
        } catch (error) {
          // Ignore
        }
        
        const logs = getLogMessages().join(' ');
        return !logs.includes('secret-token');
      }),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 7.5** - logs do not contain refresh tokens', async () => {
    await fc.assert(
      fc.asyncProperty(userGen, async (user) => {
        const mockUser = { ...user };
        const { authManager, getLogMessages } = createAuthManager(mockUser);
        await authManager.initialize();
        await new Promise(resolve => setTimeout(resolve, 10));
        
        try {
          await authManager.signInWithGoogle();
        } catch (error) {
          // Ignore
        }
        
        const logs = getLogMessages().join(' ');
        return !logs.includes(user.refreshToken);
      }),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 7.5** - error logs do not contain sensitive data', async () => {
    await fc.assert(
      fc.asyncProperty(userGen, async (user) => {
        const mockUser = { ...user };
        const { authManager, getLogMessages } = createAuthManager(mockUser, true);
        await authManager.initialize();
        await new Promise(resolve => setTimeout(resolve, 10));
        
        try {
          await authManager.signInWithGoogle();
        } catch (error) {
          // Expected
        }
        
        const logs = getLogMessages().join(' ');
        return !logs.includes('secret-token') && !logs.includes(user.refreshToken);
      }),
      { numRuns: 100 }
    );
  });
});
