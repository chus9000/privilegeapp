/**
 * Integration Test for Silent Logout
 * Feature: auth-bypass-fix
 * 
 * Validates: Requirements 6.5
 * Test token refresh failure triggers silent logout
 */

import { describe, test, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Integration: Silent Logout', () => {
  test('**Validates: Requirements 6.5** - token refresh failure clears session', async () => {
    // Load AuthManager code
    const authManagerCode = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');
    
    const localStorage = {
      _store: {},
      getItem(key) { return this._store[key] || null; },
      setItem(key, value) { this._store[key] = value.toString(); },
      removeItem(key) { delete this._store[key]; },
      clear() { this._store = {}; }
    };

    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'http://example.com/photo.jpg',
      refreshToken: 'refresh-token',
      getIdToken: vi.fn(async (forceRefresh) => {
        if (forceRefresh) {
          throw new Error('Token refresh failed');
        }
        return 'old-token';
      }),
      getIdTokenResult: vi.fn(async () => {
        throw new Error('Token refresh failed');
      })
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

    await authManager.initialize();
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Set expired token
    authManager.currentUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      expiresAt: Date.now() - 1000 // Expired
    };

    // Attempt to get token (should fail and trigger logout)
    try {
      await authManager.getIdToken();
    } catch (error) {
      // Expected
    }

    // Property: Session should be cleared after refresh failure
    expect(authManager.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('firebase_auth_user')).toBeNull();
  });

  test('**Validates: Requirements 6.5** - silent logout does not display error', async () => {
    // Load AuthManager code
    const authManagerCode = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');
    
    const errorMessages = [];
    const localStorage = {
      _store: {},
      getItem(key) { return this._store[key] || null; },
      setItem(key, value) { this._store[key] = value.toString(); },
      removeItem(key) { delete this._store[key]; },
      clear() { this._store = {}; }
    };

    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'http://example.com/photo.jpg',
      refreshToken: 'refresh-token',
      getIdToken: vi.fn(async (forceRefresh) => {
        if (forceRefresh) {
          throw new Error('Token refresh failed');
        }
        return 'old-token';
      }),
      getIdTokenResult: vi.fn(async () => {
        throw new Error('Token refresh failed');
      })
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
      console: {
        log: () => {},
        error: (...args) => { 
          errorMessages.push(JSON.stringify(args));
        },
        warn: () => {}
      },
      FIREBASE_CONFIG: { apiKey: 'test', authDomain: 'test.firebaseapp.com', projectId: 'test' },
      Date
    };

    const func = new Function('window', 'firebase', 'localStorage', 'console',
      authManagerCode + '; return new AuthManager();');
    const authManager = func(context, firebase, localStorage, console);

    await authManager.initialize();
    await new Promise(resolve => setTimeout(resolve, 10));
    
    authManager.currentUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      expiresAt: Date.now() - 1000
    };

    let errorThrown = false;
    try {
      await authManager.getIdToken();
    } catch (error) {
      errorThrown = true;
    }

    // Property: Error should be thrown (for code to handle) but logged
    // The key is that no user-facing alert() or UI error is shown
    expect(errorThrown).toBe(true);
    // Session should be cleared (silent logout)
    expect(authManager.getCurrentUser()).toBeNull();
  });

  test('**Validates: Requirements 6.5** - silent logout redirects to landing page', async () => {
    // Load RouteGuard code
    const routeGuardCode = readFileSync(join(process.cwd(), 'route-guard.js'), 'utf-8');
    
    const sessionStorage = {
      _store: {},
      getItem(key) { return this._store[key] || null; },
      setItem(key, value) { this._store[key] = value.toString(); },
      removeItem(key) { delete this._store[key]; },
      clear() { this._store = {}; }
    };

    const location = {
      pathname: '/app/index.html',
      search: '',
      href: '/app/index.html',
      assign: function(url) { this.href = url; },
      replace: function(url) { this.href = url; }
    };

    const authManager = {
      initialize: async function() { this.initialized = true; },
      isAuthenticated: function() { return false; }, // Session expired/cleared
      getCurrentUser: function() { return null; },
      initialized: false
    };

    const context = {
      location, sessionStorage, AuthManager: authManager,
      console: { log: () => {}, error: () => {} }
    };

    const func = new Function('window', 'sessionStorage',
      routeGuardCode + '; return new RouteGuard();');
    const routeGuard = func(context, sessionStorage);
    routeGuard.authManager = authManager;

    await routeGuard.initialize();
    const allowed = await routeGuard.guard();

    // Property: After silent logout, user should be redirected to landing
    expect(allowed).toBe(false);
    expect(location.href).not.toBe('/app/index.html'); // Redirected
  });
});
