/**
 * Property-Based Tests for Protected Route Enforcement
 * Feature: auth-bypass-fix
 * 
 * Property 1: Protected routes enforce authentication
 * Validates: Requirements 2.1, 3.3
 * 
 * For any protected route (dashboard, event creation), when a user attempts to 
 * access it, the route guard must verify authentication before allowing access.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the RouteGuard code
const routeGuardCode = readFileSync(join(process.cwd(), 'route-guard.js'), 'utf-8');

/**
 * Create a RouteGuard instance in a clean environment with tracking
 * @param {boolean} isAuthenticated - Whether the user should be authenticated
 * @param {string} pathname - The current pathname
 * @param {string} search - The current search string
 * @returns {Object} RouteGuard instance and mock objects with tracking
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

describe('Property 1: Protected routes enforce authentication', () => {
  test('**Validates: Requirements 2.1, 3.3** - route guard checks authentication before allowing access to protected routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        fc.boolean(),
        async (pathname, search, isAuthenticated) => {
          // Create RouteGuard with specified authentication state
          const { routeGuard, getAuthCheckCount } = createRouteGuard(isAuthenticated, pathname, search);
          
          // Initialize the route guard
          await routeGuard.initialize();
          
          // Reset auth check count after initialization
          const initialCheckCount = getAuthCheckCount();
          
          // Guard the route
          const result = await routeGuard.guard();
          
          // Property: Authentication must be checked for protected routes
          // The auth check count should increase by at least 1
          const finalCheckCount = getAuthCheckCount();
          const authWasChecked = finalCheckCount > initialCheckCount;
          
          // Verify the result matches the authentication state
          const resultMatchesAuth = result === isAuthenticated;
          
          return authWasChecked && resultMatchesAuth;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.1, 3.3** - authentication check occurs before any access decision', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Track the order of operations
          const operations = [];
          
          // Mock sessionStorage
          const sessionStorage = {
            _store: {},
            getItem(key) {
              return this._store[key] || null;
            },
            setItem(key, value) {
              operations.push('redirect');
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

          // Mock AuthManager with operation tracking
          const authManager = {
            initialize: async function() {
              this.initialized = true;
            },
            isAuthenticated: function() {
              operations.push('auth_check');
              return false; // Unauthenticated to trigger redirect
            },
            getCurrentUser: function() {
              return null;
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
          routeGuard.authManager = authManager;
          
          // Initialize and guard
          await routeGuard.initialize();
          await routeGuard.guard();
          
          // Property: auth_check must occur before redirect
          const authCheckIndex = operations.indexOf('auth_check');
          const redirectIndex = operations.indexOf('redirect');
          
          return authCheckIndex !== -1 && 
                 redirectIndex !== -1 && 
                 authCheckIndex < redirectIndex;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.1, 3.3** - authenticated users can access protected routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with authenticated user
          const { routeGuard, location, getAuthCheckCount } = createRouteGuard(true, pathname, search);
          
          const originalHref = pathname + search;
          
          // Initialize the route guard
          await routeGuard.initialize();
          
          const initialCheckCount = getAuthCheckCount();
          
          // Guard the route
          const result = await routeGuard.guard();
          
          const finalCheckCount = getAuthCheckCount();
          
          // Property: 
          // 1. Authentication must be checked
          // 2. Access should be granted (result = true)
          // 3. Location should remain unchanged (no redirect)
          return finalCheckCount > initialCheckCount &&
                 result === true && 
                 location.href === originalHref;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.1, 3.3** - unauthenticated users are denied access to protected routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, location, getAuthCheckCount } = createRouteGuard(false, pathname, search);
          
          const originalHref = pathname + search;
          
          // Initialize the route guard
          await routeGuard.initialize();
          
          const initialCheckCount = getAuthCheckCount();
          
          // Guard the route
          const result = await routeGuard.guard();
          
          const finalCheckCount = getAuthCheckCount();
          
          // Property:
          // 1. Authentication must be checked
          // 2. Access should be denied (result = false)
          // 3. Location should be changed (redirect occurred)
          // The redirect can be to '/' or '../' depending on the path calculation
          const wasRedirected = location.href !== originalHref && 
                               (location.href === '/' || location.href === '../');
          
          return finalCheckCount > initialCheckCount &&
                 result === false && 
                 wasRedirected;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.1, 3.3** - authentication check is consistent across multiple guard calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        fc.boolean(),
        async (pathname, isAuthenticated) => {
          // Create RouteGuard
          const { routeGuard, getAuthCheckCount } = createRouteGuard(isAuthenticated, pathname);
          
          // Initialize once
          await routeGuard.initialize();
          
          const initialCheckCount = getAuthCheckCount();
          
          // Call guard multiple times
          const result1 = await routeGuard.guard();
          const result2 = await routeGuard.guard();
          const result3 = await routeGuard.guard();
          
          const finalCheckCount = getAuthCheckCount();
          
          // Property: 
          // 1. Authentication should be checked on each guard call
          // 2. Results should be consistent with authentication state
          const checksPerformed = finalCheckCount - initialCheckCount;
          const resultsConsistent = result1 === result2 && result2 === result3;
          const resultsMatchAuth = result1 === isAuthenticated;
          
          return checksPerformed >= 3 && resultsConsistent && resultsMatchAuth;
        }
      ),
      { numRuns: 100 }
    );
  });
});
