/**
 * Unit Tests for Landing Page Navigation
 * Feature: full-featured-quiz-app
 * 
 * Tests landing page navigation flows:
 * - Free play navigation (Requirement 1.3)
 * - Auth trigger on create event click (Requirement 1.4)
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the landing page HTML and JavaScript
const landingHTML = readFileSync(join(process.cwd(), 'index.html'), 'utf-8');
const landingJS = readFileSync(join(process.cwd(), 'landing.js'), 'utf-8');
const authManagerJS = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');

describe('Landing Page Navigation', () => {
  let dom;
  let window;
  let document;
  let authManager;
  let navigationSpy;
  
  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(landingHTML, {
      url: 'http://localhost/',
      runScripts: 'outside-only'
    });
    
    window = dom.window;
    document = window.document;
    
    // Mock console methods
    window.console = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };
    
    // Mock localStorage
    const localStorageMock = {
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
    window.localStorage = localStorageMock;
    
    // Mock alert
    window.alert = vi.fn();
    
    // Create a spy for navigation by intercepting location.href assignments
    navigationSpy = vi.fn();
    
    // Store original location
    const originalLocation = window.location;
    
    // Delete and recreate location with a simple object
    delete window.location;
    
    let currentHref = 'http://localhost/';
    window.location = {
      get href() { return currentHref; },
      set href(value) {
        currentHref = value;
        navigationSpy(value);
      },
      origin: 'http://localhost',
      pathname: '/',
      search: '',
      hash: '',
      assign: navigationSpy,
      replace: navigationSpy,
      reload: vi.fn()
    };
    
    // Execute AuthManager code
    const authManagerFunc = new Function('window', 'localStorage', 'console', 'Date', authManagerJS);
    authManagerFunc(window, window.localStorage, window.console, Date);
    authManager = window.AuthManager;
    
    // Execute landing.js code
    const landingFunc = new Function('window', 'document', 'console', 'alert', landingJS);
    landingFunc(window, document, window.console, window.alert);
  });

  describe('Free Play Navigation (Requirement 1.3)', () => {
    test('clicking "Free Play" button navigates to questions.html?id=freeplay', async () => {
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Get the free play button
      const freePlayBtn = document.getElementById('freePlayBtn');
      expect(freePlayBtn).toBeTruthy();
      
      // Click the button
      freePlayBtn.click();
      
      // Verify navigation
      expect(navigationSpy).toHaveBeenCalledWith('/app/questions.html?id=freeplay');
    });

    test('free play navigation does not require authentication', async () => {
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Ensure user is not authenticated
      expect(authManager.isAuthenticated()).toBe(false);
      
      const freePlayBtn = document.getElementById('freePlayBtn');
      
      // Click the button
      freePlayBtn.click();
      
      // Verify navigation happened without authentication
      expect(navigationSpy).toHaveBeenCalledWith('/app/questions.html?id=freeplay');
      expect(authManager.isAuthenticated()).toBe(false);
    });
  });

  describe('Create Event Authentication (Requirement 1.4)', () => {
    test('clicking "Create Event" button triggers Google sign-in', async () => {
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Initialize AuthManager
      await authManager.initialize();
      
      // Spy on signInWithGoogle method
      const signInSpy = vi.spyOn(authManager, 'signInWithGoogle');
      signInSpy.mockResolvedValue({
        uid: 'test_user_123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        idToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() + 3600000
      });
      
      // Get the create event button
      const createEventBtn = document.getElementById('createEventBtn');
      expect(createEventBtn).toBeTruthy();
      
      // Click the button
      createEventBtn.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify signInWithGoogle was called
      expect(signInSpy).toHaveBeenCalled();
      
      // Verify navigation to dashboard after successful auth
      expect(navigationSpy).toHaveBeenCalledWith('/app');
    });

    test('create event button shows loading state during sign-in', async () => {
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Initialize AuthManager
      await authManager.initialize();
      
      // Mock signInWithGoogle to delay
      const signInSpy = vi.spyOn(authManager, 'signInWithGoogle');
      signInSpy.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              uid: 'test_user_123',
              email: 'test@example.com',
              displayName: 'Test User',
              photoURL: 'https://example.com/photo.jpg',
              idToken: 'test_token',
              refreshToken: 'test_refresh',
              expiresAt: Date.now() + 3600000
            });
          }, 50);
        });
      });
      
      const createEventBtn = document.getElementById('createEventBtn');
      const originalText = createEventBtn.textContent;
      
      // Click the button
      createEventBtn.click();
      
      // Wait a bit for the loading state to be set
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify button shows loading state
      expect(createEventBtn.textContent).toContain('Signing in');
      expect(createEventBtn.disabled).toBe(true);
      
      // Wait for sign-in to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('create event button handles authentication cancellation', async () => {
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Initialize AuthManager
      await authManager.initialize();
      
      // Mock signInWithGoogle to return null (user cancelled)
      const signInSpy = vi.spyOn(authManager, 'signInWithGoogle');
      signInSpy.mockResolvedValue(null);
      
      const createEventBtn = document.getElementById('createEventBtn');
      
      // Click the button
      createEventBtn.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify no navigation occurred
      expect(navigationSpy).not.toHaveBeenCalled();
      
      // Verify button is re-enabled
      expect(createEventBtn.disabled).toBe(false);
    });

    test('create event button handles authentication errors', async () => {
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Initialize AuthManager
      await authManager.initialize();
      
      // Mock signInWithGoogle to throw error
      const signInSpy = vi.spyOn(authManager, 'signInWithGoogle');
      signInSpy.mockRejectedValue(new Error('Authentication failed'));
      
      const createEventBtn = document.getElementById('createEventBtn');
      
      // Click the button
      createEventBtn.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify error alert was shown
      expect(window.alert).toHaveBeenCalled();
      
      // Verify no navigation occurred
      expect(navigationSpy).not.toHaveBeenCalled();
      
      // Verify button is re-enabled
      expect(createEventBtn.disabled).toBe(false);
    });
  });

  describe('Existing Auth Session Check (Requirement 1.5)', () => {
    test('authenticated user sees "Go to Dashboard" button', async () => {
      // Set up authenticated user
      const mockUser = {
        uid: 'test_user_123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        idToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() + 3600000
      };
      
      window.localStorage.setItem('firebase_auth_user', JSON.stringify(mockUser));
      
      // Initialize AuthManager
      await authManager.initialize();
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify user is authenticated
      expect(authManager.isAuthenticated()).toBe(true);
      
      // Get the create event button
      const createEventBtn = document.getElementById('createEventBtn');
      
      // Verify button text changed to "Go to Dashboard" with proper structure
      expect(createEventBtn.textContent).toContain('Go to Dashboard');
      expect(createEventBtn.textContent).toContain('Manage your events');
    });

    test('clicking "Go to Dashboard" navigates to /app', async () => {
      // Set up authenticated user
      const mockUser = {
        uid: 'test_user_123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        idToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() + 3600000
      };
      
      window.localStorage.setItem('firebase_auth_user', JSON.stringify(mockUser));
      
      // Initialize AuthManager
      await authManager.initialize();
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the create event button
      const createEventBtn = document.getElementById('createEventBtn');
      
      // Click the button
      createEventBtn.click();
      
      // Verify navigation to dashboard
      expect(navigationSpy).toHaveBeenCalledWith('/app');
    });
  });
});
