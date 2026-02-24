/**
 * Property-Based Tests for Unauthenticated Redirect
 * Feature: auth-bypass-fix
 * 
 * Property 2: Unauthenticated access triggers redirect
 * Validates: Requirements 2.2, 2.3, 2.5
 * 
 * For any protected route, when an unauthenticated user (including expired sessions) 
 * attempts access, the system must redirect to the landing page and store the intended destination.
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
 * @param {boolean} isExpired - Whether the session is expired (for edge case testing)
 * @returns {Object} RouteGuard instance and mock objects
 */
function createRouteGuard(isAuthenticated, pathname, search = '', isExpired = false) {
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
      // If session is expired, return false even if user exists
      if (isExpired) {
        return false;
      }
      return isAuthenticated;
    },
    getCurrentUser: function() {
      if (isExpired) {
        // Expired session still has user data but isAuthenticated returns false
        return { 
          uid: 'expired-user', 
          email: 'expired@example.com',
          expiresAt: Date.now() - 1000 // Expired 1 second ago
        };
      }
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
    authManager
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
 * Generate query strings with various parameters
 */
const queryStringGen = fc.option(
  fc.record({
    id: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
    pin: fc.option(fc.integer({ min: 100000, max: 999999 }).map(String)),
    event: fc.option(fc.string({ minLength: 1, maxLength: 15 })),
    session: fc.option(fc.uuid())
  }).map(params => {
    const parts = [];
    if (params.id) parts.push(`id=${params.id}`);
    if (params.pin) parts.push(`pin=${params.pin}`);
    if (params.event) parts.push(`event=${params.event}`);
    if (params.session) parts.push(`session=${params.session}`);
    return parts.length > 0 ? '?' + parts.join('&') : '';
  }),
  { nil: '' }
);

describe('Property 2: Unauthenticated access triggers redirect', () => {
  test('**Validates: Requirements 2.2, 2.3, 2.5** - unauthenticated users are redirected to landing page', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, location } = createRouteGuard(false, pathname, search);
          
          const originalHref = pathname + search;
          
          // Initialize and guard the route
          await routeGuard.initialize();
          const result = await routeGuard.guard();
          
          // Property: Unauthenticated access must trigger redirect
          // 1. Guard should deny access (return false)
          // 2. Location should be changed to landing page
          const accessDenied = result === false;
          const redirectedToLanding = location.href !== originalHref && 
                                     (location.href === '/' || location.href === '../');
          
          return accessDenied && redirectedToLanding;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.5** - intended path is stored in sessionStorage on redirect', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, sessionStorage } = createRouteGuard(false, pathname, search);
          
          const expectedIntendedPath = pathname + search;
          
          // Initialize and guard the route
          await routeGuard.initialize();
          await routeGuard.guard();
          
          // Property: Intended path must be stored for post-login redirect
          // The stored path should match the attempted access path
          const storedPath = sessionStorage.getItem('intended_path');
          
          // Note: The route guard may not store '/' as intended path
          if (pathname === '/' || pathname === '../') {
            return storedPath === null || storedPath === expectedIntendedPath;
          }
          
          return storedPath === expectedIntendedPath;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.3** - expired sessions trigger redirect (edge case)', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with expired session
          const { routeGuard, location, authManager } = createRouteGuard(false, pathname, search, true);
          
          const originalHref = pathname + search;
          
          // Verify we have an expired session (user exists but not authenticated)
          const user = authManager.getCurrentUser();
          const isAuth = authManager.isAuthenticated();
          const hasExpiredSession = user !== null && isAuth === false;
          
          if (!hasExpiredSession) {
            // Skip if expired session wasn't properly set up
            return true;
          }
          
          // Initialize and guard the route
          await routeGuard.initialize();
          const result = await routeGuard.guard();
          
          // Property: Expired sessions must be treated as unauthenticated
          // 1. Guard should deny access (return false)
          // 2. Location should be changed to landing page
          const accessDenied = result === false;
          const redirectedToLanding = location.href !== originalHref && 
                                     (location.href === '/' || location.href === '../');
          
          return accessDenied && redirectedToLanding;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.2, 2.5** - redirect preserves query parameters in intended path', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen.filter(q => q !== ''), // Only test with non-empty query strings
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, sessionStorage } = createRouteGuard(false, pathname, search);
          
          // Initialize and guard the route
          await routeGuard.initialize();
          await routeGuard.guard();
          
          // Property: Query parameters must be preserved in intended path
          const storedPath = sessionStorage.getItem('intended_path');
          
          if (pathname === '/' || pathname === '../') {
            return true; // Skip root paths
          }
          
          // The stored path should include the query string
          return storedPath !== null && storedPath.includes(search);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.2** - multiple redirect attempts are consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, location, sessionStorage } = createRouteGuard(false, pathname, search);
          
          // Initialize once
          await routeGuard.initialize();
          
          // Attempt to guard multiple times
          const result1 = await routeGuard.guard();
          const href1 = location.href;
          const stored1 = sessionStorage.getItem('intended_path');
          
          // Reset location for second attempt
          location.pathname = pathname;
          location.search = search;
          location.href = pathname + search;
          
          const result2 = await routeGuard.guard();
          const href2 = location.href;
          const stored2 = sessionStorage.getItem('intended_path');
          
          // Property: Multiple redirect attempts should be consistent
          // 1. Both attempts should deny access
          // 2. Both attempts should redirect to the same location
          // 3. Intended path should be stored consistently
          return result1 === false && 
                 result2 === false && 
                 href1 === href2 &&
                 stored1 === stored2;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.2, 2.3** - all protected routes enforce redirect for unauthenticated access', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        async (pathname) => {
          // Create RouteGuard with unauthenticated user
          const { routeGuard, location } = createRouteGuard(false, pathname);
          
          const originalHref = pathname;
          
          // Initialize and guard the route
          await routeGuard.initialize();
          const result = await routeGuard.guard();
          
          // Property: ALL protected routes must enforce redirect
          // No protected route should allow unauthenticated access
          const accessDenied = result === false;
          const wasRedirected = location.href !== originalHref;
          
          return accessDenied && wasRedirected;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 2.2** - redirect occurs before any page logic execution', async () => {
    await fc.assert(
      fc.asyncProperty(
        protectedRouteGen,
        queryStringGen,
        async (pathname, search) => {
          // Track execution order
          const executionOrder = [];
          
          // Mock sessionStorage with tracking
          const sessionStorage = {
            _store: {},
            getItem(key) {
              return this._store[key] || null;
            },
            setItem(key, value) {
              executionOrder.push('redirect');
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
              executionOrder.push('auth_check');
              return false;
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
          const result = await routeGuard.guard();
          
          // Property: Redirect must occur immediately after auth check fails
          // No other operations should happen between auth check and redirect
          const authCheckIndex = executionOrder.indexOf('auth_check');
          const redirectIndex = executionOrder.indexOf('redirect');
          
          // Both operations should occur, and auth check should come first
          return result === false &&
                 authCheckIndex !== -1 && 
                 redirectIndex !== -1 && 
                 authCheckIndex < redirectIndex;
        }
      ),
      { numRuns: 100 }
    );
  });
});
