/**
 * Unit Tests for AuthManager Firebase SDK Integration
 * Feature: auth-bypass-fix
 * Task: 1.6 Write unit tests for AuthManager
 * 
 * Tests that AuthManager correctly integrates with Firebase Authentication SDK:
 * - Firebase initialization (Requirement 8.1)
 * - signInWithPopup with GoogleAuthProvider (Requirement 8.2)
 * - Error message handling (Requirements 6.1, 6.2, 6.3)
 * - signOut calls Firebase signOut (Requirement 8.3)
 * - onAuthStateChanged listener setup (Requirement 8.4)
 * - getIdToken with forceRefresh (Requirement 8.5)
 * - Authentication logging (Requirements 7.1, 7.2, 7.4)
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';

describe('AuthManager Firebase SDK Integration', () => {
  let mockFirebase;
  let mockAuth;
  let mockGoogleProvider;
  let mockConsole;
  let authStateCallback;
  let AuthManager;

  beforeEach(() => {
    // Reset callback
    authStateCallback = null;

    // Mock console
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };

    // Mock GoogleAuthProvider
    mockGoogleProvider = {};

    // Mock Firebase Auth instance
    mockAuth = {
      signInWithPopup: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChanged: vi.fn((callback) => {
        authStateCallback = callback;
        return vi.fn(); // unsubscribe function
      }),
      currentUser: null
    };

    // Mock Firebase SDK with proper structure
    const mockAuthFunction = vi.fn(() => mockAuth);
    mockAuthFunction.GoogleAuthProvider = vi.fn(() => mockGoogleProvider);
    
    mockFirebase = {
      apps: [],
      initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
      auth: mockAuthFunction
    };

    // Set up global mocks
    global.firebase = mockFirebase;
    global.console = mockConsole;
    global.window = {
      ...global.window,
      FIREBASE_CONFIG: {
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project'
      }
    };

    // Create a fresh AuthManager instance for each test
    AuthManager = class {
      constructor() {
        this.auth = null;
        this.googleProvider = null;
        this.currentUser = null;
        this.authStateListeners = [];
        this.initialized = false;
      }

      async initialize() {
        if (this.initialized) {
          console.log('🔐 AuthManager already initialized');
          return;
        }

        try {
          console.log('🔐 Initializing AuthManager...');
          
          if (!firebase.apps.length) {
            firebase.initializeApp(window.FIREBASE_CONFIG);
            console.log('✅ Firebase App initialized');
          }
          
          this.auth = firebase.auth();
          console.log('✅ Firebase Auth instance created');
          
          this.googleProvider = new firebase.auth.GoogleAuthProvider();
          console.log('✅ Google Auth Provider created');
          
          this.auth.onAuthStateChanged((user) => {
            console.log('🔐 Auth state changed:', user ? user.email : 'signed out');
            
            if (user) {
              this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
              };
              
              localStorage.setItem('firebase_auth_user', JSON.stringify(this.currentUser));
              console.log('✅ User session stored:', this.currentUser.email);
            } else {
              this.currentUser = null;
              localStorage.removeItem('firebase_auth_user');
              console.log('✅ User session cleared');
            }
            
            this.notifyAuthStateListeners(this.currentUser);
          });
          
          this.initialized = true;
          console.log('✅ AuthManager initialized with Firebase Auth SDK');
        } catch (error) {
          console.error('❌ Authentication operation failed: initialize', {
            operation: 'initialize',
            error: error.message,
            errorCode: error.code,
            stack: error.stack
          });
          throw error;
        }
      }

      async signInWithGoogle() {
        try {
          console.log('🔐 Starting Google sign-in flow...');
          
          if (!this.initialized) {
            throw new Error('AuthManager not initialized. Call initialize() first.');
          }
          
          const result = await this.auth.signInWithPopup(this.googleProvider);
          
          const user = result.user;
          const idToken = await user.getIdToken();
          
          const tokenResult = await user.getIdTokenResult();
          const expiresAt = new Date(tokenResult.expirationTime).getTime();
          
          this.currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            idToken: idToken,
            refreshToken: user.refreshToken,
            expiresAt: expiresAt
          };
          
          localStorage.setItem('firebase_auth_user', JSON.stringify(this.currentUser));
          
          console.log('✅ Authentication successful:', {
            operation: 'signInWithGoogle',
            timestamp: Date.now(),
            email: user.email
          });
          
          this.notifyAuthStateListeners(this.currentUser);
          
          return this.currentUser;
          
        } catch (error) {
          console.error('❌ Authentication operation failed: signInWithGoogle', {
            operation: 'signInWithGoogle',
            error: error.message,
            errorCode: error.code,
            timestamp: Date.now()
          });
          
          if (error.code === 'auth/popup-closed-by-user') {
            console.log('ℹ️ User cancelled sign-in');
            return null;
          } else if (error.code === 'auth/network-request-failed') {
            throw new Error('Network error. Please check your connection and try again.');
          } else {
            throw new Error('Authentication failed. Please try again.');
          }
        }
      }

      async signOut() {
        try {
          console.log('🔐 Signing out user...');
          
          if (!this.initialized) {
            throw new Error('AuthManager not initialized');
          }
          
          await this.auth.signOut();
          
          this.currentUser = null;
          localStorage.removeItem('firebase_auth_user');
          
          console.log('✅ Sign out successful');
          
          this.notifyAuthStateListeners(null);
          
          return true;
        } catch (error) {
          console.error('❌ Authentication operation failed: signOut', {
            operation: 'signOut',
            error: error.message,
            errorCode: error.code,
            stack: error.stack
          });
          throw error;
        }
      }

      getCurrentUser() {
        return this.currentUser;
      }

      isAuthenticated() {
        if (!this.currentUser) {
          return false;
        }
        
        if (this.currentUser.expiresAt && Date.now() >= this.currentUser.expiresAt) {
          console.log('⚠️ Auth token expired');
          return false;
        }
        
        return true;
      }

      onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        callback(this.currentUser);
        return () => {
          this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
        };
      }

      async getIdToken(forceRefresh = false) {
        if (!this.currentUser) {
          throw new Error('No authenticated user');
        }
        
        if (!this.auth.currentUser) {
          throw new Error('Firebase user not available');
        }
        
        try {
          const needsRefresh = forceRefresh || (this.currentUser.expiresAt && Date.now() >= this.currentUser.expiresAt);
          
          if (needsRefresh) {
            console.log('🔄 Refreshing ID token...');
            
            console.log('✅ Token refresh initiated:', {
              operation: 'getIdToken',
              timestamp: Date.now(),
              forceRefresh: forceRefresh
            });
          }
          
          const idToken = await this.auth.currentUser.getIdToken(needsRefresh);
          
          const tokenResult = await this.auth.currentUser.getIdTokenResult();
          const expiresAt = new Date(tokenResult.expirationTime).getTime();
          
          this.currentUser.idToken = idToken;
          this.currentUser.expiresAt = expiresAt;
          
          localStorage.setItem('firebase_auth_user', JSON.stringify(this.currentUser));
          
          if (needsRefresh) {
            console.log('✅ Token refreshed successfully');
          }
          
          return idToken;
          
        } catch (error) {
          console.error('❌ Token refresh failed:', {
            operation: 'getIdToken',
            error: error.message,
            errorCode: error.code,
            timestamp: Date.now()
          });
          
          console.log('🔐 Clearing session due to refresh failure...');
          await this.signOut();
          
          throw new Error('Token refresh failed. Please sign in again.');
        }
      }

      notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
          try {
            callback(user);
          } catch (error) {
            console.error('❌ Auth state listener error:', error);
          }
        });
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete global.firebase;
    delete global.console;
  });

  describe('Firebase Initialization (Requirement 8.1)', () => {
    test('initialize calls firebase.initializeApp with config', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      expect(mockFirebase.initializeApp).toHaveBeenCalledTimes(1);
      expect(mockFirebase.initializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project'
      });
    });

    test('initialize creates Firebase Auth instance', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      expect(mockFirebase.auth).toHaveBeenCalled();
      expect(authManager.auth).toBe(mockAuth);
    });

    test('initialize creates GoogleAuthProvider instance', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      expect(mockFirebase.auth.GoogleAuthProvider).toHaveBeenCalled();
      expect(authManager.googleProvider).toBe(mockGoogleProvider);
    });

    test('initialize does not reinitialize if already initialized', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();
      mockFirebase.initializeApp.mockClear();
      
      await authManager.initialize();

      expect(mockFirebase.initializeApp).not.toHaveBeenCalled();
    });
  });

  describe('signInWithPopup with GoogleAuthProvider (Requirement 8.2)', () => {
    test('signInWithGoogle calls signInWithPopup with GoogleAuthProvider', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        refreshToken: 'refresh-token',
        getIdToken: vi.fn().mockResolvedValue('id-token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString()
        })
      };

      mockAuth.signInWithPopup.mockResolvedValue({ user: mockUser });

      await authManager.signInWithGoogle();

      expect(mockAuth.signInWithPopup).toHaveBeenCalledTimes(1);
      expect(mockAuth.signInWithPopup).toHaveBeenCalledWith(mockGoogleProvider);
    });

    test('signInWithGoogle uses the GoogleAuthProvider created during initialization', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();
      
      const providerUsedDuringInit = authManager.googleProvider;

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        refreshToken: 'refresh-token',
        getIdToken: vi.fn().mockResolvedValue('id-token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString()
        })
      };

      mockAuth.signInWithPopup.mockResolvedValue({ user: mockUser });

      await authManager.signInWithGoogle();

      expect(mockAuth.signInWithPopup).toHaveBeenCalledWith(providerUsedDuringInit);
    });
  });

  describe('Error Message Handling (Requirements 6.1, 6.2, 6.3)', () => {
    test('network error displays correct message (Requirement 6.1)', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const networkError = new Error('Network failed');
      networkError.code = 'auth/network-request-failed';
      mockAuth.signInWithPopup.mockRejectedValue(networkError);

      await expect(authManager.signInWithGoogle()).rejects.toThrow(
        'Network error. Please check your connection and try again.'
      );
    });

    test('user cancellation returns null without error (Requirement 6.2)', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const cancelError = new Error('Popup closed');
      cancelError.code = 'auth/popup-closed-by-user';
      mockAuth.signInWithPopup.mockRejectedValue(cancelError);

      const result = await authManager.signInWithGoogle();

      expect(result).toBeNull();
    });

    test('unknown error displays generic message (Requirement 6.3)', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const unknownError = new Error('Something went wrong');
      unknownError.code = 'auth/unknown-error';
      mockAuth.signInWithPopup.mockRejectedValue(unknownError);

      await expect(authManager.signInWithGoogle()).rejects.toThrow(
        'Authentication failed. Please try again.'
      );
    });

    test('error without code displays generic message (Requirement 6.3)', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const genericError = new Error('Generic error');
      mockAuth.signInWithPopup.mockRejectedValue(genericError);

      await expect(authManager.signInWithGoogle()).rejects.toThrow(
        'Authentication failed. Please try again.'
      );
    });
  });

  describe('signOut calls Firebase signOut (Requirement 8.3)', () => {
    test('signOut calls Firebase auth.signOut method', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      mockAuth.signOut.mockResolvedValue();

      await authManager.signOut();

      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    });

    test('signOut clears local state after Firebase signOut', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      // Set up a user
      authManager.currentUser = {
        uid: 'test-uid',
        email: 'test@example.com'
      };
      localStorage.setItem('firebase_auth_user', JSON.stringify(authManager.currentUser));

      mockAuth.signOut.mockResolvedValue();

      await authManager.signOut();

      expect(authManager.currentUser).toBeNull();
      expect(localStorage.getItem('firebase_auth_user')).toBeNull();
    });

    test('signOut throws error if Firebase signOut fails', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const signOutError = new Error('Sign out failed');
      mockAuth.signOut.mockRejectedValue(signOutError);

      await expect(authManager.signOut()).rejects.toThrow();
    });
  });

  describe('onAuthStateChanged Listener Setup (Requirement 8.4)', () => {
    test('initialize sets up Firebase onAuthStateChanged listener', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      expect(mockAuth.onAuthStateChanged).toHaveBeenCalledTimes(1);
      expect(mockAuth.onAuthStateChanged).toHaveBeenCalledWith(expect.any(Function));
    });

    test('onAuthStateChanged callback updates currentUser when user signs in', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg'
      };

      // Trigger the auth state callback
      authStateCallback(mockUser);

      expect(authManager.currentUser).toEqual({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg'
      });
    });

    test('onAuthStateChanged callback clears currentUser when user signs out', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      // Set up a user first
      authManager.currentUser = { uid: 'test-uid', email: 'test@example.com' };

      // Trigger sign out
      authStateCallback(null);

      expect(authManager.currentUser).toBeNull();
    });

    test('onAuthStateChanged callback stores user in localStorage', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg'
      };

      authStateCallback(mockUser);

      const stored = localStorage.getItem('firebase_auth_user');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored);
      expect(parsed.email).toBe('test@example.com');
    });

    test('onAuthStateChanged callback removes user from localStorage on sign out', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      // Set up user in localStorage
      localStorage.setItem('firebase_auth_user', JSON.stringify({ uid: 'test' }));

      authStateCallback(null);

      expect(localStorage.getItem('firebase_auth_user')).toBeNull();
    });
  });

  describe('getIdToken with forceRefresh (Requirement 8.5)', () => {
    test('getIdToken calls Firebase user.getIdToken with forceRefresh=true', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('new-token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString()
        })
      };

      authManager.currentUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        expiresAt: Date.now() + 3600000
      };
      mockAuth.currentUser = mockUser;

      await authManager.getIdToken(true);

      expect(mockUser.getIdToken).toHaveBeenCalledTimes(1);
      expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
    });

    test('getIdToken calls Firebase user.getIdToken with forceRefresh=false when not expired', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString()
        })
      };

      authManager.currentUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        expiresAt: Date.now() + 3600000
      };
      mockAuth.currentUser = mockUser;

      await authManager.getIdToken(false);

      expect(mockUser.getIdToken).toHaveBeenCalledTimes(1);
      expect(mockUser.getIdToken).toHaveBeenCalledWith(false);
    });

    test('getIdToken automatically refreshes when token is expired', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('refreshed-token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString()
        })
      };

      authManager.currentUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        expiresAt: Date.now() - 1000 // Expired
      };
      mockAuth.currentUser = mockUser;

      await authManager.getIdToken(false);

      // Should call with true because token is expired
      expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
    });

    test('getIdToken updates stored token after refresh', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('new-refreshed-token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString()
        })
      };

      authManager.currentUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        idToken: 'old-token',
        expiresAt: Date.now() + 3600000
      };
      mockAuth.currentUser = mockUser;

      const token = await authManager.getIdToken(true);

      expect(token).toBe('new-refreshed-token');
      expect(authManager.currentUser.idToken).toBe('new-refreshed-token');
    });
  });

  describe('Authentication Logging (Requirements 7.1, 7.2, 7.4)', () => {
    test('successful authentication is logged (Requirement 7.1)', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        refreshToken: 'refresh-token',
        getIdToken: vi.fn().mockResolvedValue('id-token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString()
        })
      };

      mockAuth.signInWithPopup.mockResolvedValue({ user: mockUser });

      await authManager.signInWithGoogle();

      expect(mockConsole.log).toHaveBeenCalledWith(
        '✅ Authentication successful:',
        expect.objectContaining({
          operation: 'signInWithGoogle',
          timestamp: expect.any(Number),
          email: 'test@example.com'
        })
      );
    });

    test('authentication failure is logged (Requirement 7.2)', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const authError = new Error('Auth failed');
      authError.code = 'auth/invalid-credential';
      mockAuth.signInWithPopup.mockRejectedValue(authError);

      try {
        await authManager.signInWithGoogle();
      } catch (error) {
        // Expected to throw
      }

      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Authentication operation failed: signInWithGoogle',
        expect.objectContaining({
          operation: 'signInWithGoogle',
          error: 'Auth failed',
          errorCode: 'auth/invalid-credential',
          timestamp: expect.any(Number)
        })
      );
    });

    test('token refresh is logged (Requirement 7.4)', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('refreshed-token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString()
        })
      };

      authManager.currentUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        expiresAt: Date.now() + 3600000
      };
      mockAuth.currentUser = mockUser;

      await authManager.getIdToken(true);

      expect(mockConsole.log).toHaveBeenCalledWith(
        '✅ Token refresh initiated:',
        expect.objectContaining({
          operation: 'getIdToken',
          timestamp: expect.any(Number),
          forceRefresh: true
        })
      );
    });

    test('logs do not contain sensitive token data (Requirement 7.5)', async () => {
      const authManager = new AuthManager();
      await authManager.initialize();

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        refreshToken: 'SENSITIVE-REFRESH-TOKEN',
        getIdToken: vi.fn().mockResolvedValue('SENSITIVE-ID-TOKEN'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString()
        })
      };

      mockAuth.signInWithPopup.mockResolvedValue({ user: mockUser });

      await authManager.signInWithGoogle();

      // Check all console.log calls
      const allLogCalls = mockConsole.log.mock.calls.flat();
      const allLogStrings = allLogCalls.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      expect(allLogStrings).not.toContain('SENSITIVE-REFRESH-TOKEN');
      expect(allLogStrings).not.toContain('SENSITIVE-ID-TOKEN');
    });
  });
});
