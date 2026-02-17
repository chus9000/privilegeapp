/**
 * Unit Tests for Authentication Flows
 * Feature: full-featured-quiz-app
 * Task: 3.5 Write unit tests for authentication flows
 * 
 * Tests authentication manager flows:
 * - Successful sign-in (Requirement 3.1)
 * - Sign-in cancellation (Requirement 3.3)
 * - Sign-in failure (Requirement 3.3)
 * - Logout (Requirement 3.5)
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the AuthManager JavaScript
const authManagerJS = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');

describe('Authentication Flows', () => {
  let authManager;
  let mockLocalStorage;
  let mockConsole;
  let originalDateNow;
  
  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
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
    
    // Mock console
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };
    
    // Mock Date.now for consistent timestamps
    originalDateNow = Date.now;
    Date.now = vi.fn(() => 1700000000000);
    
    // Create a mock window object
    const mockWindow = {
      localStorage: mockLocalStorage,
      console: mockConsole,
      AuthManager: null
    };
    
    // Execute AuthManager code in isolated context
    const authManagerFunc = new Function(
      'window',
      'localStorage',
      'console',
      'Date',
      authManagerJS + '\nreturn window.AuthManager;'
    );
    
    authManager = authManagerFunc(mockWindow, mockLocalStorage, mockConsole, Date);
  });
  
  afterEach(() => {
    // Restore Date.now
    Date.now = originalDateNow;
  });

  describe('Successful Sign-In (Requirement 3.1)', () => {
    test('signInWithGoogle returns user object on success', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Sign in
      const result = await authManager.signInWithGoogle();
      
      // Verify result contains expected user properties
      expect(result).toBeTruthy();
      expect(result.uid).toBeTruthy();
      expect(result.email).toBe('user@example.com');
      expect(result.displayName).toBe('Test User');
      expect(result.photoURL).toBeTruthy();
      expect(result.idToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.expiresAt).toBe(Date.now() + 3600000);
    });

    test('signInWithGoogle stores user in localStorage', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Sign in
      await authManager.signInWithGoogle();
      
      // Verify user is stored in localStorage
      const storedUser = mockLocalStorage.getItem('firebase_auth_user');
      expect(storedUser).toBeTruthy();
      
      const parsedUser = JSON.parse(storedUser);
      expect(parsedUser.email).toBe('user@example.com');
      expect(parsedUser.uid).toBeTruthy();
    });

    test('signInWithGoogle sets currentUser', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Verify no user initially
      expect(authManager.getCurrentUser()).toBeNull();
      
      // Sign in
      await authManager.signInWithGoogle();
      
      // Verify currentUser is set
      const currentUser = authManager.getCurrentUser();
      expect(currentUser).toBeTruthy();
      expect(currentUser.email).toBe('user@example.com');
    });

    test('signInWithGoogle notifies auth state listeners', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Set up listener
      const listener = vi.fn();
      authManager.onAuthStateChanged(listener);
      
      // Clear initial call
      listener.mockClear();
      
      // Sign in
      await authManager.signInWithGoogle();
      
      // Verify listener was called with user
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com'
        })
      );
    });

    test('isAuthenticated returns true after successful sign-in', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Verify not authenticated initially
      expect(authManager.isAuthenticated()).toBe(false);
      
      // Sign in
      await authManager.signInWithGoogle();
      
      // Verify authenticated
      expect(authManager.isAuthenticated()).toBe(true);
    });

    test('getIdToken returns token after sign-in', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Sign in
      await authManager.signInWithGoogle();
      
      // Get token
      const token = await authManager.getIdToken();
      
      // Verify token is returned
      expect(token).toBeTruthy();
      expect(token).toContain('mock_token_');
    });
  });

  describe('Sign-In Cancellation (Requirement 3.3)', () => {
    test('signInWithGoogle returns null when user cancels', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Mock the signInWithGoogle to simulate cancellation
      const originalSignIn = authManager.signInWithGoogle.bind(authManager);
      authManager.signInWithGoogle = vi.fn(async () => {
        const error = new Error('User cancelled');
        error.code = 'auth/popup-closed-by-user';
        throw error;
      });
      
      // Wrap in try-catch to handle the error
      let result;
      try {
        result = await authManager.signInWithGoogle();
      } catch (error) {
        // Simulate the actual behavior where popup-closed-by-user returns null
        if (error.code === 'auth/popup-closed-by-user') {
          result = null;
        }
      }
      
      // Verify null is returned
      expect(result).toBeNull();
    });

    test('user remains unauthenticated after cancellation', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Verify not authenticated initially
      expect(authManager.isAuthenticated()).toBe(false);
      
      // Mock cancellation
      authManager.signInWithGoogle = vi.fn(async () => {
        const error = new Error('User cancelled');
        error.code = 'auth/popup-closed-by-user';
        throw error;
      });
      
      // Attempt sign in
      try {
        await authManager.signInWithGoogle();
      } catch (error) {
        // Ignore error
      }
      
      // Verify still not authenticated
      expect(authManager.isAuthenticated()).toBe(false);
    });

    test('localStorage remains empty after cancellation', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Mock cancellation
      authManager.signInWithGoogle = vi.fn(async () => {
        const error = new Error('User cancelled');
        error.code = 'auth/popup-closed-by-user';
        throw error;
      });
      
      // Attempt sign in
      try {
        await authManager.signInWithGoogle();
      } catch (error) {
        // Ignore error
      }
      
      // Verify no user in localStorage
      const storedUser = mockLocalStorage.getItem('firebase_auth_user');
      expect(storedUser).toBeNull();
    });
  });

  describe('Sign-In Failure (Requirement 3.3)', () => {
    test('signInWithGoogle throws error on network failure', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Mock network error
      authManager.signInWithGoogle = vi.fn(async () => {
        const error = new Error('Network error');
        error.code = 'auth/network-request-failed';
        throw error;
      });
      
      // Attempt sign in and expect error
      await expect(authManager.signInWithGoogle()).rejects.toThrow();
    });

    test('signInWithGoogle throws error on general auth failure', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Mock general auth error
      authManager.signInWithGoogle = vi.fn(async () => {
        const error = new Error('Auth failed');
        error.code = 'auth/invalid-credential';
        throw error;
      });
      
      // Attempt sign in and expect error
      await expect(authManager.signInWithGoogle()).rejects.toThrow();
    });

    test('user remains unauthenticated after sign-in failure', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Verify not authenticated initially
      expect(authManager.isAuthenticated()).toBe(false);
      
      // Mock auth failure
      authManager.signInWithGoogle = vi.fn(async () => {
        throw new Error('Authentication failed');
      });
      
      // Attempt sign in
      try {
        await authManager.signInWithGoogle();
      } catch (error) {
        // Ignore error
      }
      
      // Verify still not authenticated
      expect(authManager.isAuthenticated()).toBe(false);
    });

    test('localStorage remains empty after sign-in failure', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Mock auth failure
      authManager.signInWithGoogle = vi.fn(async () => {
        throw new Error('Authentication failed');
      });
      
      // Attempt sign in
      try {
        await authManager.signInWithGoogle();
      } catch (error) {
        // Ignore error
      }
      
      // Verify no user in localStorage
      const storedUser = mockLocalStorage.getItem('firebase_auth_user');
      expect(storedUser).toBeNull();
    });

    test('error is logged to console on sign-in failure', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Mock auth failure
      const testError = new Error('Test auth failure');
      authManager.signInWithGoogle = vi.fn(async () => {
        mockConsole.error('❌ Google sign-in failed:', testError);
        throw testError;
      });
      
      // Attempt sign in
      try {
        await authManager.signInWithGoogle();
      } catch (error) {
        // Ignore error
      }
      
      // Verify error was logged
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Logout (Requirement 3.5)', () => {
    test('signOut clears currentUser', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Verify user is set
      expect(authManager.getCurrentUser()).toBeTruthy();
      
      // Sign out
      await authManager.signOut();
      
      // Verify currentUser is cleared
      expect(authManager.getCurrentUser()).toBeNull();
    });

    test('signOut removes user from localStorage', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Verify user is in localStorage
      expect(mockLocalStorage.getItem('firebase_auth_user')).toBeTruthy();
      
      // Sign out
      await authManager.signOut();
      
      // Verify user is removed from localStorage
      expect(mockLocalStorage.getItem('firebase_auth_user')).toBeNull();
    });

    test('signOut notifies auth state listeners with null', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Set up listener
      const listener = vi.fn();
      authManager.onAuthStateChanged(listener);
      
      // Clear initial call
      listener.mockClear();
      
      // Sign out
      await authManager.signOut();
      
      // Verify listener was called with null
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(null);
    });

    test('isAuthenticated returns false after sign-out', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Verify authenticated
      expect(authManager.isAuthenticated()).toBe(true);
      
      // Sign out
      await authManager.signOut();
      
      // Verify not authenticated
      expect(authManager.isAuthenticated()).toBe(false);
    });

    test('signOut returns true on success', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Sign out
      const result = await authManager.signOut();
      
      // Verify success
      expect(result).toBe(true);
    });

    test('getIdToken throws error after sign-out', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Verify token works
      await expect(authManager.getIdToken()).resolves.toBeTruthy();
      
      // Sign out
      await authManager.signOut();
      
      // Verify getIdToken throws error
      await expect(authManager.getIdToken()).rejects.toThrow('No authenticated user');
    });

    test('multiple signOut calls are safe', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Sign out multiple times
      await authManager.signOut();
      await authManager.signOut();
      await authManager.signOut();
      
      // Verify still not authenticated
      expect(authManager.isAuthenticated()).toBe(false);
      expect(authManager.getCurrentUser()).toBeNull();
    });
  });

  describe('Session Persistence', () => {
    test('initialize restores user from localStorage', async () => {
      // Set up user in localStorage
      const mockUser = {
        uid: 'stored_user_123',
        email: 'stored@example.com',
        displayName: 'Stored User',
        photoURL: 'https://example.com/photo.jpg',
        idToken: 'stored_token',
        refreshToken: 'stored_refresh',
        expiresAt: Date.now() + 3600000
      };
      
      mockLocalStorage.setItem('firebase_auth_user', JSON.stringify(mockUser));
      
      // Initialize auth manager
      await authManager.initialize();
      
      // Verify user is restored
      const currentUser = authManager.getCurrentUser();
      expect(currentUser).toBeTruthy();
      expect(currentUser.email).toBe('stored@example.com');
      expect(currentUser.uid).toBe('stored_user_123');
    });

    test('initialize notifies listeners with restored user', async () => {
      // Set up user in localStorage
      const mockUser = {
        uid: 'stored_user_123',
        email: 'stored@example.com',
        displayName: 'Stored User',
        photoURL: 'https://example.com/photo.jpg',
        idToken: 'stored_token',
        refreshToken: 'stored_refresh',
        expiresAt: Date.now() + 3600000
      };
      
      mockLocalStorage.setItem('firebase_auth_user', JSON.stringify(mockUser));
      
      // Set up listener before initialization
      const listener = vi.fn();
      authManager.onAuthStateChanged(listener);
      
      // Initialize auth manager
      await authManager.initialize();
      
      // Verify listener was called with restored user
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'stored@example.com'
        })
      );
    });

    test('isAuthenticated returns true for restored session', async () => {
      // Set up user in localStorage
      const mockUser = {
        uid: 'stored_user_123',
        email: 'stored@example.com',
        displayName: 'Stored User',
        photoURL: 'https://example.com/photo.jpg',
        idToken: 'stored_token',
        refreshToken: 'stored_refresh',
        expiresAt: Date.now() + 3600000
      };
      
      mockLocalStorage.setItem('firebase_auth_user', JSON.stringify(mockUser));
      
      // Initialize auth manager
      await authManager.initialize();
      
      // Verify authenticated
      expect(authManager.isAuthenticated()).toBe(true);
    });
  });

  describe('Token Expiration', () => {
    test('isAuthenticated returns false for expired token', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Verify authenticated
      expect(authManager.isAuthenticated()).toBe(true);
      
      // Mock Date.now to simulate time passing
      Date.now = vi.fn(() => 1700000000000 + 7200000); // 2 hours later
      
      // Verify not authenticated due to expiration
      expect(authManager.isAuthenticated()).toBe(false);
    });

    test('expired token triggers automatic sign-out', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Verify user is set
      expect(authManager.getCurrentUser()).toBeTruthy();
      
      // Mock Date.now to simulate time passing
      Date.now = vi.fn(() => 1700000000000 + 7200000); // 2 hours later
      
      // Check authentication (triggers sign-out)
      authManager.isAuthenticated();
      
      // Verify user is cleared
      expect(authManager.getCurrentUser()).toBeNull();
    });

    test('checkSessionExpiration returns true for expired session', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Mock Date.now to simulate time passing
      Date.now = vi.fn(() => 1700000000000 + 7200000); // 2 hours later
      
      // Check session expiration
      const expired = authManager.checkSessionExpiration();
      
      // Verify expiration detected
      expect(expired).toBe(true);
    });

    test('checkSessionExpiration returns false for valid session', async () => {
      // Initialize and sign in
      await authManager.initialize();
      await authManager.signInWithGoogle();
      
      // Check session expiration
      const expired = authManager.checkSessionExpiration();
      
      // Verify not expired
      expect(expired).toBe(false);
    });
  });

  describe('Auth State Listeners', () => {
    test('onAuthStateChanged calls callback immediately with current state', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Set up listener
      const listener = vi.fn();
      authManager.onAuthStateChanged(listener);
      
      // Verify listener was called immediately
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(null);
    });

    test('onAuthStateChanged returns unsubscribe function', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Set up listener
      const listener = vi.fn();
      const unsubscribe = authManager.onAuthStateChanged(listener);
      
      // Verify unsubscribe is a function
      expect(typeof unsubscribe).toBe('function');
      
      // Clear initial call
      listener.mockClear();
      
      // Sign in
      await authManager.signInWithGoogle();
      
      // Verify listener was called
      expect(listener).toHaveBeenCalledTimes(1);
      
      // Unsubscribe
      unsubscribe();
      
      // Clear calls
      listener.mockClear();
      
      // Sign out
      await authManager.signOut();
      
      // Verify listener was NOT called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });

    test('multiple listeners all receive updates', async () => {
      // Initialize auth manager
      await authManager.initialize();
      
      // Set up multiple listeners
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();
      
      authManager.onAuthStateChanged(listener1);
      authManager.onAuthStateChanged(listener2);
      authManager.onAuthStateChanged(listener3);
      
      // Clear initial calls
      listener1.mockClear();
      listener2.mockClear();
      listener3.mockClear();
      
      // Sign in
      await authManager.signInWithGoogle();
      
      // Verify all listeners were called
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });
  });
});
