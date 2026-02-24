/**
 * Unit Tests for Dashboard Functionality
 * Feature: full-featured-quiz-app
 * Task: 4.7 Write unit tests for dashboard functionality
 * 
 * Tests dashboard functionality:
 * - Event loading (Requirement 4.3)
 * - Empty state display (Requirement 4.6)
 * - Navigation to create event (Requirement 4.3)
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the dashboard HTML and JavaScript
const dashboardHTML = readFileSync(join(process.cwd(), 'app/index.html'), 'utf-8');
const dashboardJS = readFileSync(join(process.cwd(), 'app/dashboard.js'), 'utf-8');
const authManagerJS = readFileSync(join(process.cwd(), 'auth-manager.js'), 'utf-8');

describe('Dashboard Functionality', () => {
  let dom;
  let window;
  let document;
  let authManager;
  let firebaseAPI;
  let navigationSpy;
  
  beforeEach(async () => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(dashboardHTML, {
      url: 'http://localhost/app',
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
    
    // Mock alert and confirm
    window.alert = vi.fn();
    window.confirm = vi.fn(() => true);
    
    // Mock navigator.clipboard
    window.navigator.clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined)
    };
    
    // Create navigation spy - we'll spy on window.location.href assignments
    navigationSpy = vi.fn();
    
    // Store original location
    const originalLocation = window.location;
    
    // Delete and recreate location with a simple object
    delete window.location;
    
    let currentHref = 'http://localhost/app';
    window.location = {
      get href() { return currentHref; },
      set href(value) {
        currentHref = value;
        navigationSpy(value);
      },
      origin: 'http://localhost',
      pathname: '/app',
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
    
    // Initialize AuthManager
    await authManager.initialize();
    
    // Mock authenticated user
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
    await authManager.initialize();
    
    // Mock RouteGuard
    const mockRouteGuard = {
      guardOnLoad: vi.fn().mockResolvedValue(true), // Allow access by default
      guard: vi.fn().mockResolvedValue(true),
      initialize: vi.fn().mockResolvedValue(undefined),
      isProtectedRoute: vi.fn().mockReturnValue(true),
      redirectToLanding: vi.fn()
    };
    window.RouteGuard = mockRouteGuard;
    
    // Mock FirebaseAPI
    firebaseAPI = {
      loadEventsByCreator: vi.fn(),
      loadEvent: vi.fn(),
      deleteEvent: vi.fn()
    };
    window.FirebaseAPI = firebaseAPI;
    
    // Execute dashboard.js code
    const dashboardFunc = new Function(
      'window',
      'document',
      'console',
      'alert',
      'confirm',
      'navigator',
      dashboardJS
    );
    dashboardFunc(window, document, window.console, window.alert, window.confirm, window.navigator);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });


  describe('Event Loading (Requirement 4.3)', () => {
    test('loads events from Firebase on page load', async () => {
      // Mock events data
      const mockEvents = [
        {
          id: 'event_1',
          title: 'Test Event 1',
          pin: '123456',
          creatorId: 'test_user_123',
          createdAt: '2024-01-15T10:00:00Z',
          participants: [
            { id: 'p1', name: 'Alice', score: 10 },
            { id: 'p2', name: 'Bob', score: 15 }
          ]
        },
        {
          id: 'event_2',
          title: 'Test Event 2',
          pin: '654321',
          creatorId: 'test_user_123',
          createdAt: '2024-01-16T10:00:00Z',
          participants: []
        }
      ];
      
      firebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify loadEventsByCreator was called with correct user ID
      expect(firebaseAPI.loadEventsByCreator).toHaveBeenCalledWith('test_user_123');
      
      // Verify events are rendered
      const eventsContainer = document.getElementById('eventsContainer');
      expect(eventsContainer.style.display).toBe('grid');
      
      const eventCards = eventsContainer.querySelectorAll('.event-card');
      expect(eventCards.length).toBe(2);
    });


    test('displays event details correctly', async () => {
      const mockEvents = [
        {
          id: 'event_1',
          title: 'My Test Event',
          pin: '123456',
          creatorId: 'test_user_123',
          createdAt: '2024-01-15T10:00:00Z',
          participants: [
            { id: 'p1', name: 'Alice', score: 10 },
            { id: 'p2', name: 'Bob', score: 15 },
            { id: 'p3', name: 'Charlie', score: 20 }
          ]
        }
      ];
      
      firebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the event card
      const eventCard = document.querySelector('.event-card');
      expect(eventCard).toBeTruthy();
      
      // Verify title is displayed
      const titleElement = eventCard.querySelector('.event-title');
      expect(titleElement.textContent).toBe('My Test Event');
      
      // Verify participant count is displayed
      const participantStat = eventCard.querySelector('.event-stat .stat-value');
      expect(participantStat.textContent).toBe('3');
      
      // Verify PIN is displayed
      const pinStats = eventCard.querySelectorAll('.event-stat .stat-value');
      expect(pinStats[1].textContent).toBe('123456');
      
      // Verify event link is displayed
      const linkInput = eventCard.querySelector('.event-link-input');
      expect(linkInput.value).toContain('/app/questions.html?id=event_1');
    });


    test('sorts events by creation date (newest first)', async () => {
      const mockEvents = [
        {
          id: 'event_1',
          title: 'Oldest Event',
          pin: '111111',
          creatorId: 'test_user_123',
          createdAt: '2024-01-10T10:00:00Z',
          participants: []
        },
        {
          id: 'event_2',
          title: 'Newest Event',
          pin: '333333',
          creatorId: 'test_user_123',
          createdAt: '2024-01-20T10:00:00Z',
          participants: []
        },
        {
          id: 'event_3',
          title: 'Middle Event',
          pin: '222222',
          creatorId: 'test_user_123',
          createdAt: '2024-01-15T10:00:00Z',
          participants: []
        }
      ];
      
      firebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get all event cards
      const eventCards = document.querySelectorAll('.event-card');
      const titles = Array.from(eventCards).map(card => 
        card.querySelector('.event-title').textContent
      );
      
      // Verify order (newest first)
      expect(titles[0]).toBe('Newest Event');
      expect(titles[1]).toBe('Middle Event');
      expect(titles[2]).toBe('Oldest Event');
    });


    test('handles loading errors gracefully', async () => {
      // Mock Firebase error
      firebaseAPI.loadEventsByCreator.mockRejectedValue(new Error('Network error'));
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify error was logged
      expect(window.console.error).toHaveBeenCalled();
      
      // Verify alert was shown
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load events')
      );
      
      // Verify loading state is hidden
      const loadingState = document.getElementById('loadingState');
      expect(loadingState.style.display).toBe('none');
    });

    test('shows loading state while fetching events', async () => {
      // Mock delayed response
      firebaseAPI.loadEventsByCreator.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([]), 50);
        });
      });
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify loading state is shown
      const loadingState = document.getElementById('loadingState');
      expect(loadingState.style.display).toBe('flex');
      
      // Wait for loading to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify loading state is hidden
      expect(loadingState.style.display).toBe('none');
    });
  });


  describe('Empty State Display (Requirement 4.6)', () => {
    test('shows empty state when no events exist', async () => {
      // Mock empty events array
      firebaseAPI.loadEventsByCreator.mockResolvedValue([]);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify empty state is displayed
      const emptyState = document.getElementById('emptyState');
      expect(emptyState.style.display).toBe('flex');
      
      // Verify events container is hidden
      const eventsContainer = document.getElementById('eventsContainer');
      expect(eventsContainer.style.display).toBe('none');
    });

    test('empty state contains encouraging message', async () => {
      firebaseAPI.loadEventsByCreator.mockResolvedValue([]);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify empty state message
      const emptyState = document.getElementById('emptyState');
      const heading = emptyState.querySelector('h2');
      const paragraph = emptyState.querySelector('p');
      
      expect(heading.textContent).toBe('No Events Yet');
      expect(paragraph.textContent).toContain('Create your first event');
    });


    test('empty state has "Create First Event" button', async () => {
      firebaseAPI.loadEventsByCreator.mockResolvedValue([]);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify button exists
      const createFirstEventBtn = document.getElementById('createFirstEventBtn');
      expect(createFirstEventBtn).toBeTruthy();
      expect(createFirstEventBtn.textContent).toContain('Create Your First Event');
    });

    test('hides empty state when events are loaded', async () => {
      const mockEvents = [
        {
          id: 'event_1',
          title: 'Test Event',
          pin: '123456',
          creatorId: 'test_user_123',
          createdAt: '2024-01-15T10:00:00Z',
          participants: []
        }
      ];
      
      firebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify empty state is hidden
      const emptyState = document.getElementById('emptyState');
      expect(emptyState.style.display).toBe('none');
      
      // Verify events container is shown
      const eventsContainer = document.getElementById('eventsContainer');
      expect(eventsContainer.style.display).toBe('grid');
    });
  });


  describe('Navigation to Create Event (Requirement 4.3)', () => {
    test('clicking "Create New Event" button navigates to /app/create', async () => {
      firebaseAPI.loadEventsByCreator.mockResolvedValue([]);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the create new event button
      const createNewEventBtn = document.getElementById('createNewEventBtn');
      expect(createNewEventBtn).toBeTruthy();
      
      // Click the button
      createNewEventBtn.click();
      
      // Verify navigation
      expect(navigationSpy).toHaveBeenCalledWith('/app/create');
    });

    test('clicking "Create First Event" button navigates to /app/create', async () => {
      firebaseAPI.loadEventsByCreator.mockResolvedValue([]);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the create first event button
      const createFirstEventBtn = document.getElementById('createFirstEventBtn');
      expect(createFirstEventBtn).toBeTruthy();
      
      // Click the button
      createFirstEventBtn.click();
      
      // Verify navigation
      expect(navigationSpy).toHaveBeenCalledWith('/app/create');
    });


    test('both create buttons navigate to the same location', async () => {
      firebaseAPI.loadEventsByCreator.mockResolvedValue([]);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Click create new event button
      const createNewEventBtn = document.getElementById('createNewEventBtn');
      createNewEventBtn.click();
      
      // Verify navigation
      expect(navigationSpy).toHaveBeenCalledWith('/app/create');
      
      // Reset spy
      navigationSpy.mockClear();
      
      // Click create first event button
      const createFirstEventBtn = document.getElementById('createFirstEventBtn');
      createFirstEventBtn.click();
      
      // Verify same navigation
      expect(navigationSpy).toHaveBeenCalledWith('/app/create');
    });
  });

  describe('Additional Dashboard Features', () => {
    test('clicking "View Details" navigates to spectrum page', async () => {
      const mockEvents = [
        {
          id: 'event_123',
          title: 'Test Event',
          pin: '123456',
          creatorId: 'test_user_123',
          createdAt: '2024-01-15T10:00:00Z',
          participants: []
        }
      ];
      
      firebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Click view details button
      const viewDetailsBtn = document.querySelector('.view-details-btn');
      viewDetailsBtn.click();
      
      // Verify navigation to results page
      expect(navigationSpy).toHaveBeenCalledWith('/app/results.html?id=event_123');
    });


    test('clicking "Copy Link" copies event URL to clipboard', async () => {
      const mockEvents = [
        {
          id: 'event_123',
          title: 'Test Event',
          pin: '123456',
          creatorId: 'test_user_123',
          createdAt: '2024-01-15T10:00:00Z',
          participants: []
        }
      ];
      
      firebaseAPI.loadEventsByCreator.mockResolvedValue(mockEvents);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Click copy link button
      const copyBtn = document.querySelector('.copy-link-btn');
      copyBtn.click();
      
      // Wait for clipboard operation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify clipboard.writeText was called with correct URL
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/app/questions.html?id=event_123')
      );
    });

    test('clicking "Sign Out" triggers sign out and redirects', async () => {
      firebaseAPI.loadEventsByCreator.mockResolvedValue([]);
      
      // Spy on signOut method
      const signOutSpy = vi.spyOn(authManager, 'signOut');
      signOutSpy.mockResolvedValue(true);
      
      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Click sign out button
      const signOutBtn = document.getElementById('signOutBtn');
      signOutBtn.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify signOut was called
      expect(signOutSpy).toHaveBeenCalled();
      
      // Verify navigation to landing page
      expect(navigationSpy).toHaveBeenCalledWith('/');
    });
  });
});
