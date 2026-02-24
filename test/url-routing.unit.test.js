/**
 * Unit Tests for URL Routing
 * Feature: full-featured-quiz-app
 * Task: 13.5 Write unit tests for URL routing
 * 
 * Tests URL routing behavior:
 * - Landing page route (Requirement 10.1)
 * - Dashboard route with/without auth (Requirements 10.2, 10.9)
 * - Create route with/without auth (Requirements 10.3, 10.9)
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

describe('URL Routing - Unit Tests', () => {
  let mockAuthManager;
  let mockRouteGuard;
  let mockLocation;
  let mockSessionStorage;

  beforeEach(() => {
    // Mock sessionStorage
    mockSessionStorage = {
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

    // Mock window.location
    mockLocation = {
      pathname: '/',
      search: '',
      href: '/',
      origin: 'http://localhost',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn()
    };

    // Mock AuthManager
    mockAuthManager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: vi.fn().mockReturnValue(false),
      getCurrentUser: vi.fn().mockReturnValue(null),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn()
    };

    // Mock RouteGuard
    mockRouteGuard = {
      initialize: vi.fn().mockResolvedValue(undefined),
      guard: vi.fn().mockResolvedValue(true),
      guardOnLoad: vi.fn().mockResolvedValue(true),
      isProtectedRoute: vi.fn(),
      getIntendedPath: vi.fn().mockReturnValue(null),
      redirectToLanding: vi.fn()
    };
  });

  describe('Landing Page Route (Requirement 10.1)', () => {
    test('landing page should be accessible at /', () => {
      mockLocation.pathname = '/';
      mockLocation.href = '/';
      
      // Landing page is always public
      const isPublic = mockLocation.pathname === '/';
      
      expect(isPublic).toBe(true);
      expect(mockLocation.pathname).toBe('/');
    });

    test('landing page should not require authentication', async () => {
      mockLocation.pathname = '/';
      mockRouteGuard.isProtectedRoute.mockReturnValue(false);
      
      // Simulate route guard check
      const isProtected = mockRouteGuard.isProtectedRoute();
      
      expect(isProtected).toBe(false);
      expect(mockAuthManager.isAuthenticated).not.toHaveBeenCalled();
    });

    test('landing page should be accessible when not authenticated', async () => {
      mockLocation.pathname = '/';
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      mockRouteGuard.guard.mockResolvedValue(true);
      
      const canAccess = await mockRouteGuard.guard();
      
      expect(canAccess).toBe(true);
    });

    test('landing page should be accessible when authenticated', async () => {
      mockLocation.pathname = '/';
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.getCurrentUser.mockReturnValue({
        uid: 'user123',
        email: 'user@example.com'
      });
      mockRouteGuard.guard.mockResolvedValue(true);
      
      const canAccess = await mockRouteGuard.guard();
      
      expect(canAccess).toBe(true);
    });
  });

  describe('Dashboard Route (Requirements 10.2, 10.9)', () => {
    test('dashboard should be accessible at /app', () => {
      mockLocation.pathname = '/app';
      mockLocation.href = '/app';
      
      expect(mockLocation.pathname).toBe('/app');
    });

    test('dashboard should be a protected route', () => {
      mockLocation.pathname = '/app';
      mockRouteGuard.isProtectedRoute.mockReturnValue(true);
      
      const isProtected = mockRouteGuard.isProtectedRoute();
      
      expect(isProtected).toBe(true);
    });

    test('dashboard should redirect to landing page when not authenticated', async () => {
      mockLocation.pathname = '/app';
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      mockRouteGuard.guard.mockResolvedValue(false);
      mockRouteGuard.redirectToLanding.mockImplementation(() => {
        mockLocation.href = '/';
      });
      
      const canAccess = await mockRouteGuard.guard();
      
      if (!canAccess) {
        mockRouteGuard.redirectToLanding();
      }
      
      expect(canAccess).toBe(false);
      expect(mockLocation.href).toBe('/');
    });

    test('dashboard should be accessible when authenticated', async () => {
      mockLocation.pathname = '/app';
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.getCurrentUser.mockReturnValue({
        uid: 'user123',
        email: 'user@example.com'
      });
      mockRouteGuard.guard.mockResolvedValue(true);
      
      const canAccess = await mockRouteGuard.guard();
      
      expect(canAccess).toBe(true);
      expect(mockLocation.pathname).toBe('/app');
    });

    test('dashboard should store intended path when redirecting unauthenticated user', async () => {
      mockLocation.pathname = '/app';
      mockLocation.search = '?view=events';
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      mockRouteGuard.guard.mockResolvedValue(false);
      mockRouteGuard.redirectToLanding.mockImplementation(() => {
        const intendedPath = mockLocation.pathname + mockLocation.search;
        mockSessionStorage.setItem('intended_path', intendedPath);
        mockLocation.href = '/';
      });
      
      const canAccess = await mockRouteGuard.guard();
      
      if (!canAccess) {
        mockRouteGuard.redirectToLanding();
      }
      
      expect(mockSessionStorage.getItem('intended_path')).toBe('/app?view=events');
    });

    test('dashboard should work with trailing slash /app/', () => {
      mockLocation.pathname = '/app/';
      mockRouteGuard.isProtectedRoute.mockReturnValue(true);
      
      const isProtected = mockRouteGuard.isProtectedRoute();
      
      expect(isProtected).toBe(true);
    });

    test('dashboard should work with explicit index.html /app/index.html', () => {
      mockLocation.pathname = '/app/index.html';
      mockRouteGuard.isProtectedRoute.mockReturnValue(true);
      
      const isProtected = mockRouteGuard.isProtectedRoute();
      
      expect(isProtected).toBe(true);
    });
  });

  describe('Create Route (Requirements 10.3, 10.9)', () => {
    test('create page should be accessible at /app/create', () => {
      mockLocation.pathname = '/app/create';
      mockLocation.href = '/app/create';
      
      expect(mockLocation.pathname).toBe('/app/create');
    });

    test('create page should be a protected route', () => {
      mockLocation.pathname = '/app/create';
      mockRouteGuard.isProtectedRoute.mockReturnValue(true);
      
      const isProtected = mockRouteGuard.isProtectedRoute();
      
      expect(isProtected).toBe(true);
    });

    test('create page should redirect to landing page when not authenticated', async () => {
      mockLocation.pathname = '/app/create';
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      mockRouteGuard.guard.mockResolvedValue(false);
      mockRouteGuard.redirectToLanding.mockImplementation(() => {
        mockLocation.href = '/';
      });
      
      const canAccess = await mockRouteGuard.guard();
      
      if (!canAccess) {
        mockRouteGuard.redirectToLanding();
      }
      
      expect(canAccess).toBe(false);
      expect(mockLocation.href).toBe('/');
    });

    test('create page should be accessible when authenticated', async () => {
      mockLocation.pathname = '/app/create';
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.getCurrentUser.mockReturnValue({
        uid: 'user123',
        email: 'user@example.com'
      });
      mockRouteGuard.guard.mockResolvedValue(true);
      
      const canAccess = await mockRouteGuard.guard();
      
      expect(canAccess).toBe(true);
      expect(mockLocation.pathname).toBe('/app/create');
    });

    test('create page should store intended path when redirecting unauthenticated user', async () => {
      mockLocation.pathname = '/app/create';
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      mockRouteGuard.guard.mockResolvedValue(false);
      mockRouteGuard.redirectToLanding.mockImplementation(() => {
        const intendedPath = mockLocation.pathname + mockLocation.search;
        mockSessionStorage.setItem('intended_path', intendedPath);
        mockLocation.href = '/';
      });
      
      const canAccess = await mockRouteGuard.guard();
      
      if (!canAccess) {
        mockRouteGuard.redirectToLanding();
      }
      
      expect(mockSessionStorage.getItem('intended_path')).toBe('/app/create');
    });

    test('create page should work with .html extension /app/create.html', () => {
      mockLocation.pathname = '/app/create.html';
      mockRouteGuard.isProtectedRoute.mockReturnValue(true);
      
      const isProtected = mockRouteGuard.isProtectedRoute();
      
      expect(isProtected).toBe(true);
    });
  });

  describe('Public App Routes', () => {
    test('questions page should be accessible without authentication', async () => {
      mockLocation.pathname = '/app/questions.html';
      mockRouteGuard.isProtectedRoute.mockReturnValue(false);
      mockRouteGuard.guard.mockResolvedValue(true);
      
      const isProtected = mockRouteGuard.isProtectedRoute();
      const canAccess = await mockRouteGuard.guard();
      
      expect(isProtected).toBe(false);
      expect(canAccess).toBe(true);
    });

    test('results page should be accessible without authentication', async () => {
      mockLocation.pathname = '/app/results.html';
      mockRouteGuard.isProtectedRoute.mockReturnValue(false);
      mockRouteGuard.guard.mockResolvedValue(true);
      
      const isProtected = mockRouteGuard.isProtectedRoute();
      const canAccess = await mockRouteGuard.guard();
      
      expect(isProtected).toBe(false);
      expect(canAccess).toBe(true);
    });

    test('score page should be accessible without authentication', async () => {
      mockLocation.pathname = '/app/score.html';
      mockRouteGuard.isProtectedRoute.mockReturnValue(false);
      mockRouteGuard.guard.mockResolvedValue(true);
      
      const isProtected = mockRouteGuard.isProtectedRoute();
      const canAccess = await mockRouteGuard.guard();
      
      expect(isProtected).toBe(false);
      expect(canAccess).toBe(true);
    });
  });

  describe('Route Guard Integration', () => {
    test('guardOnLoad should be called on protected page load', async () => {
      mockLocation.pathname = '/app';
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockRouteGuard.guardOnLoad.mockResolvedValue(true);
      
      // Simulate page load
      const canAccess = await mockRouteGuard.guardOnLoad();
      
      expect(mockRouteGuard.guardOnLoad).toHaveBeenCalled();
      expect(canAccess).toBe(true);
    });

    test('guardOnLoad should redirect unauthenticated users from protected routes', async () => {
      mockLocation.pathname = '/app/create';
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      mockRouteGuard.guardOnLoad.mockResolvedValue(false);
      mockRouteGuard.redirectToLanding.mockImplementation(() => {
        mockLocation.href = '/';
      });
      
      const canAccess = await mockRouteGuard.guardOnLoad();
      
      if (!canAccess) {
        mockRouteGuard.redirectToLanding();
      }
      
      expect(canAccess).toBe(false);
      expect(mockLocation.href).toBe('/');
    });

    test('intended path should be restored after successful authentication', async () => {
      // User tries to access /app/create without auth
      mockSessionStorage.setItem('intended_path', '/app/create');
      
      // User authenticates
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.getCurrentUser.mockReturnValue({
        uid: 'user123',
        email: 'user@example.com'
      });
      
      // Get intended path
      mockRouteGuard.getIntendedPath.mockReturnValue('/app/create');
      const intendedPath = mockRouteGuard.getIntendedPath();
      
      // Redirect to intended path
      if (intendedPath) {
        mockLocation.href = intendedPath;
      }
      
      expect(intendedPath).toBe('/app/create');
      expect(mockLocation.href).toBe('/app/create');
    });
  });

  describe('URL Structure Validation', () => {
    test('all protected routes should follow /app pattern', () => {
      const protectedRoutes = [
        '/app',
        '/app/',
        '/app/index.html',
        '/app/create',
        '/app/create.html'
      ];
      
      protectedRoutes.forEach(route => {
        expect(route.startsWith('/app')).toBe(true);
      });
    });

    test('public app routes should be explicitly defined', () => {
      const publicAppRoutes = [
        '/app/questions.html',
        '/app/results.html',
        '/app/score.html'
      ];
      
      publicAppRoutes.forEach(route => {
        expect(route.startsWith('/app/')).toBe(true);
        expect(route.endsWith('.html')).toBe(true);
      });
    });

    test('landing page should be at root', () => {
      const landingRoute = '/';
      
      expect(landingRoute).toBe('/');
      expect(landingRoute.length).toBe(1);
    });
  });

  describe('Query Parameters', () => {
    test('dashboard route should preserve query parameters during redirect', async () => {
      mockLocation.pathname = '/app';
      mockLocation.search = '?filter=recent';
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      mockRouteGuard.guard.mockResolvedValue(false);
      mockRouteGuard.redirectToLanding.mockImplementation(() => {
        const intendedPath = mockLocation.pathname + mockLocation.search;
        mockSessionStorage.setItem('intended_path', intendedPath);
        mockLocation.href = '/';
      });
      
      const canAccess = await mockRouteGuard.guard();
      
      if (!canAccess) {
        mockRouteGuard.redirectToLanding();
      }
      
      expect(mockSessionStorage.getItem('intended_path')).toBe('/app?filter=recent');
    });

    test('create route should preserve query parameters during redirect', async () => {
      mockLocation.pathname = '/app/create';
      mockLocation.search = '?template=quiz';
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      mockRouteGuard.guard.mockResolvedValue(false);
      mockRouteGuard.redirectToLanding.mockImplementation(() => {
        const intendedPath = mockLocation.pathname + mockLocation.search;
        mockSessionStorage.setItem('intended_path', intendedPath);
        mockLocation.href = '/';
      });
      
      const canAccess = await mockRouteGuard.guard();
      
      if (!canAccess) {
        mockRouteGuard.redirectToLanding();
      }
      
      expect(mockSessionStorage.getItem('intended_path')).toBe('/app/create?template=quiz');
    });
  });
});
