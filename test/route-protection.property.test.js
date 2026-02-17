/**
 * Property-Based Tests for Route Protection
 * Feature: full-featured-quiz-app
 * 
 * Property 17: Unauthenticated Route Protection
 * Validates: Requirements 10.9
 * 
 * For any attempt to access an authenticated route (paths starting with `/app` 
 * except `/app/questions.html` and `/app/results.html`) without authentication, 
 * the system should redirect to the landing page.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the RouteGuard code
const routeGuardCode = readFileSync(join(process.cwd(), 'route-guard.js'), 'utf-8');

/**
 * Create a RouteGuard instance in a clean environment
 * @param {boolean} isAuthenticated - Whether the user should be authenticated
 * @param {string} pathname - The current pathname
 * @param {string} search - The current search string
 * @returns {Object} RouteGuard instance and mock objects
 */
function createRouteGuard(isAuthenticated, pathname, search = '') {
  // Mock sessionStorage
  const sessionStorage = {
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
  const location = {
    pathname: pathname,
    search: search,
    href: pathname + search,
    assign: function(url) {
      this.href = url;
    },
    replace: function(url) {
      this.href = url;
    }
  };

  // Mock AuthManager
  const authManager = {
    initialize: async function() {
      this.initialized = true;
    },
    isAuthenticated: function() {
      return isAuthenticated;
    },
    getCurrentUser: function() {
      return isAuthenticated ? { uid: 'test-user', email: 'test@example.com' } : null;
    },
    initialized: false
  };

  // Create context
  const context = {
    location: location,
    sessionStorage: sessionStorage,
    AuthManager: authManager,
    console: {
      log: () => {},
      error: () => {}
    }
  };

  // Execute RouteGuard code in context
  const func = new Function(
    'window',
    'sessionStorage',
    routeGuardCode + '; return new RouteGuard();'
  );
  
  const routeGuard = func(context, sessionStorage);
  
  // Manually set up the context for the instance
  routeGuard.authManager = authManager;
  
  return { routeGuard, location, sessionStorage, authManager };
}

// Generators for property-based testing

/**
 * Generate protected route paths
 */
const protectedRouteGen = fc.constantFrom(
  '/app',
  '/app/',
  '/app/index.html',
  '/app/create',
  '/app/create.html'
);

/**
 * Generate public route paths
 */
const publicRouteGen = fc.constantFrom(
  '/',
  '/app/questions.html',
  '/app/results.html',
  '/app/spectrum.html'
);

/**
 * Generate query strings
 */
const queryStringGen = fc.option(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    pin: fc.option(fc.integer({ min: 100000, max: 999999 }).map(String))
  }).map(params => {
    const parts = [`id=${params.id}`];
    if (params.pin) {
      parts.push(`pin=${params.pin}`);
    }
    return '?' + parts.join('&');
  }),
  { nil: '' }
);

describe('Property 17: Unauthenticated Route Protection', () => {
  test('**Validates: Requirements 10.9** - unauthenticated users are redirected from all protected routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, location } = createRouteGuard(false, pathname, search);
          
          // Initialize the route guard
          await routeGuard.initialize();
          
          // Guard the route
          const result = await routeGuard.guard();
          
          // Property: Should redirect to landing page
          // Result should be false (access denied)
          // Location should be changed to '/'
          return result === false && location.href === '/';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.9** - authenticated users can access all protected routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with authenticated user
          const { routeGuard, location } = createRouteGuard(true, pathname, search);
          
          const originalHref = pathname + search;
          
          // Initialize the route guard
          await routeGuard.initialize();
          
          // Guard the route
          const result = await routeGuard.guard();
          
          // Property: Should allow access
          // Result should be true (access granted)
          // Location should remain unchanged
          return result === true && location.href === originalHref;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.9** - public routes are accessible without authentication', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, location } = createRouteGuard(false, pathname, search);
          
          const originalHref = pathname + search;
          
          // Initialize the route guard
          await routeGuard.initialize();
          
          // Guard the route
          const result = await routeGuard.guard();
          
          // Property: Should allow access to public routes
          // Result should be true (access granted)
          // Location should remain unchanged
          return result === true && location.href === originalHref;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.9** - intended path is stored when redirecting from protected routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen.filter(s => s !== ''), // Only test with non-empty query strings
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, sessionStorage } = createRouteGuard(false, pathname, search);
          
          const expectedIntendedPath = pathname + search;
          
          // Initialize the route guard
          await routeGuard.initialize();
          
          // Guard the route (should redirect and store intended path)
          await routeGuard.guard();
          
          // Property: Intended path should be stored in sessionStorage
          const storedPath = sessionStorage.getItem('intended_path');
          
          return storedPath === expectedIntendedPath;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.9** - route protection works consistently across multiple guard calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        fc.boolean(),
        async (pathname, isAuthenticated) => {
          // Create RouteGuard
          const { routeGuard, location } = createRouteGuard(isAuthenticated, pathname);
          
          // Initialize once
          await routeGuard.initialize();
          
          // Call guard multiple times
          const result1 = await routeGuard.guard();
          const result2 = await routeGuard.guard();
          const result3 = await routeGuard.guard();
          
          // Property: Results should be consistent
          // If authenticated, all should return true
          // If not authenticated, all should return false and redirect
          if (isAuthenticated) {
            return result1 === true && result2 === true && result3 === true;
          } else {
            return result1 === false && result2 === false && result3 === false &&
                   location.href === '/';
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.9** - isProtectedRoute correctly identifies route types', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(protectedRouteGen, publicRouteGen),
        (pathname) => {
          // Create RouteGuard (authentication doesn't matter for this test)
          const { routeGuard } = createRouteGuard(false, pathname);
          
          // Check if route is protected
          const isProtected = routeGuard.isProtectedRoute();
          
          // Property: Protected routes should be identified correctly
          const expectedProtected = [
            '/app',
            '/app/',
            '/app/index.html',
            '/app/create',
            '/app/create.html'
          ].includes(pathname);
          
          return isProtected === expectedProtected;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.9** - getIntendedPath retrieves and clears stored path', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, sessionStorage } = createRouteGuard(false, pathname, search);
          
          const expectedPath = pathname + search;
          
          // Initialize and guard (stores intended path)
          await routeGuard.initialize();
          await routeGuard.guard();
          
          // Get intended path (should retrieve and clear)
          const retrievedPath = routeGuard.getIntendedPath();
          
          // Try to get again (should be null after clearing)
          const secondRetrieval = routeGuard.getIntendedPath();
          
          // Property: First retrieval should return the path, second should be null
          return retrievedPath === (expectedPath === '/' ? null : expectedPath) &&
                 secondRetrieval === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});
