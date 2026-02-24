/**
 * Property-Based Tests for Public Route Accessibility
 * Feature: auth-bypass-fix
 * 
 * Property 3: Public routes remain accessible
 * Validates: Requirements 3.4, 5.4
 * 
 * For any public route (landing, questions, results, spectrum), access must be 
 * allowed without authentication regardless of authentication state.
 */

import { describe, test } from 'vitest';
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
  // Track authentication checks
  let authCheckCount = 0;
  
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

  // Mock AuthManager with tracking
  const authManager = {
    initialize: async function() {
      this.initialized = true;
    },
    isAuthenticated: function() {
      authCheckCount++;
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
  
  return { 
    routeGuard, 
    location, 
    sessionStorage, 
    authManager,
    getAuthCheckCount: () => authCheckCount
  };
}

// Generators for property-based testing

/**
 * Generate public route paths
 * Public routes: landing page, questions, results, spectrum
 */
const publicRouteGen = fc.constantFrom(
  '/',
  '/index.html',
  '/app/questions.html',
  '/app/results.html',
  '/app/score.html'
);

/**
 * Generate query strings with various parameters
 */
const queryStringGen = fc.option(
  fc.record({
    id: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
    pin: fc.option(fc.integer({ min: 100000, max: 999999 }).map(String)),
    event: fc.option(fc.string({ minLength: 1, maxLength: 15 })),
    session: fc.option(fc.uuid()),
    participant: fc.option(fc.string({ minLength: 1, maxLength: 20 }))
  }).map(params => {
    const parts = [];
    if (params.id) parts.push(`id=${params.id}`);
    if (params.pin) parts.push(`pin=${params.pin}`);
    if (params.event) parts.push(`event=${params.event}`);
    if (params.session) parts.push(`session=${params.session}`);
    if (params.participant) parts.push(`participant=${params.participant}`);
    return parts.length > 0 ? '?' + parts.join('&') : '';
  }),
  { nil: '' }
);

describe('Property 3: Public routes remain accessible', () => {
  test('**Validates: Requirements 3.4, 5.4** - public routes are accessible without authentication', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, location } = createRouteGuard(false, pathname, search);
          
          const originalHref = pathname + search;
          
          // Initialize and guard the route
          await routeGuard.initialize();
          const result = await routeGuard.guard();
          
          // Property: Public routes must be accessible without authentication
          // 1. Guard should grant access (return true)
          // 2. Location should remain unchanged (no redirect)
          const accessGranted = result === true;
          const noRedirect = location.href === originalHref;
          
          return accessGranted && noRedirect;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 5.4** - authenticated users can access public routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with authenticated user
          const { routeGuard, location } = createRouteGuard(true, pathname, search);
          
          const originalHref = pathname + search;
          
          // Initialize and guard the route
          await routeGuard.initialize();
          const result = await routeGuard.guard();
          
          // Property: Authenticated users must also be able to access public routes
          // 1. Guard should grant access (return true)
          // 2. Location should remain unchanged (no redirect)
          const accessGranted = result === true;
          const noRedirect = location.href === originalHref;
          
          return accessGranted && noRedirect;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 3.4, 5.4** - public routes do not require authentication check', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, getAuthCheckCount } = createRouteGuard(false, pathname, search);
          
          // Initialize the route guard
          await routeGuard.initialize();
          
          const initialCheckCount = getAuthCheckCount();
          
          // Guard the route
          const result = await routeGuard.guard();
          
          const finalCheckCount = getAuthCheckCount();
          
          // Property: Public routes should not trigger authentication checks
          // 1. Access should be granted
          // 2. Authentication check count should not increase
          const accessGranted = result === true;
          const noAuthCheck = finalCheckCount === initialCheckCount;
          
          return accessGranted && noAuthCheck;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 3.4, 5.4** - public routes preserve query parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicRouteGen,
        queryStringGen.filter(q => q !== ''), // Only test with non-empty query strings
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, location } = createRouteGuard(false, pathname, search);
          
          const originalHref = pathname + search;
          
          // Initialize and guard the route
          await routeGuard.initialize();
          const result = await routeGuard.guard();
          
          // Property: Query parameters must be preserved on public routes
          // 1. Access should be granted
          // 2. Location should remain exactly the same (including query params)
          const accessGranted = result === true;
          const queryPreserved = location.href === originalHref && location.search === search;
          
          return accessGranted && queryPreserved;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 3.4, 5.4** - public routes do not store intended path', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, sessionStorage } = createRouteGuard(false, pathname, search);
          
          // Initialize and guard the route
          await routeGuard.initialize();
          await routeGuard.guard();
          
          // Property: Public routes should not store intended path
          // Since no redirect occurs, there's no need to store where the user wanted to go
          const storedPath = sessionStorage.getItem('intended_path');
          
          return storedPath === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 3.4, 5.4** - all public routes are consistently accessible', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicRouteGen,
        fc.boolean(), // Test with both authenticated and unauthenticated states
        async (pathname, isAuthenticated) => {
          // Create RouteGuard with specified authentication state
          const { routeGuard, location } = createRouteGuard(isAuthenticated, pathname);
          
          const originalHref = pathname;
          
          // Initialize and guard the route
          await routeGuard.initialize();
          const result = await routeGuard.guard();
          
          // Property: ALL public routes must be accessible regardless of auth state
          // 1. Guard should grant access (return true)
          // 2. Location should remain unchanged (no redirect)
          const accessGranted = result === true;
          const noRedirect = location.href === originalHref;
          
          return accessGranted && noRedirect;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 5.4** - authenticated session persists when accessing public routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with authenticated user
          const { routeGuard, authManager } = createRouteGuard(true, pathname, search);
          
          // Verify initial authentication state
          await routeGuard.initialize();
          const initialAuthState = authManager.isAuthenticated();
          const initialUser = authManager.getCurrentUser();
          
          // Guard the route
          await routeGuard.guard();
          
          // Check authentication state after guarding
          const finalAuthState = authManager.isAuthenticated();
          const finalUser = authManager.getCurrentUser();
          
          // Property: Authentication session must persist after accessing public routes
          // 1. Auth state should remain true
          // 2. User should remain the same
          const authPersisted = initialAuthState === true && finalAuthState === true;
          const userPersisted = initialUser !== null && finalUser !== null && 
                               initialUser.uid === finalUser.uid;
          
          return authPersisted && userPersisted;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 3.4, 5.4** - multiple accesses to public routes are consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicRouteGen,
        fc.boolean(),
        async (pathname, isAuthenticated) => {
          // Create RouteGuard
          const { routeGuard, location } = createRouteGuard(isAuthenticated, pathname);
          
          // Initialize once
          await routeGuard.initialize();
          
          // Access the route multiple times
          const result1 = await routeGuard.guard();
          const href1 = location.href;
          
          // Reset location for second access
          location.pathname = pathname;
          location.search = '';
          location.href = pathname;
          
          const result2 = await routeGuard.guard();
          const href2 = location.href;
          
          // Reset location for third access
          location.pathname = pathname;
          location.search = '';
          location.href = pathname;
          
          const result3 = await routeGuard.guard();
          const href3 = location.href;
          
          // Property: Multiple accesses should be consistent
          // 1. All accesses should grant access (return true)
          // 2. Location should remain unchanged in all cases
          const allAccessGranted = result1 === true && result2 === true && result3 === true;
          const allUnchanged = href1 === pathname && href2 === pathname && href3 === pathname;
          
          return allAccessGranted && allUnchanged;
        }
      ),
      { numRuns: 100 }
    );
  });
});
