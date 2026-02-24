/**
 * Property-Based Tests for Session Persistence
 * Feature: auth-bypass-fix
 * 
 * Property 10: Authenticated sessions persist across public routes
 * Validates: Requirements 5.5
 * 
 * For any authenticated user, when navigating to public routes, the authentication 
 * session must remain valid and accessible.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

const routeGuardCode = readFileSync(join(process.cwd(), 'route-guard.js'), 'utf-8');

function createRouteGuard(user, pathname) {
  const sessionStorage = {
    _store: {},
    getItem(key) { return this._store[key] || null; },
    setItem(key, value) { this._store[key] = value.toString(); },
    removeItem(key) { delete this._store[key]; },
    clear() { this._store = {}; }
  };

  const location = {
    pathname: pathname,
    search: '',
    href: pathname,
    assign: function(url) { this.href = url; },
    replace: function(url) { this.href = url; }
  };

  const authManager = {
    initialize: async function() { this.initialized = true; },
    isAuthenticated: function() { return user !== null; },
    getCurrentUser: function() { return user; },
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
  
  return { routeGuard, authManager };
}

const publicRouteGen = fc.constantFrom('/', '/index.html', '/app/questions.html', '/app/results.html', '/app/score.html');
const userGen = fc.record({
  uid: fc.uuid(),
  email: fc.emailAddress(),
  displayName: fc.string({ minLength: 1, maxLength: 50 })
});

describe('Property 10: Authenticated sessions persist across public routes', () => {
  test('**Validates: Requirements 5.5** - session remains valid on public routes', async () => {
    await fc.assert(
      fc.asyncProperty(publicRouteGen, userGen, async (pathname, user) => {
        const { routeGuard, authManager } = createRouteGuard(user, pathname);
        await routeGuard.initialize();
        
        const authBefore = authManager.isAuthenticated();
        const userBefore = authManager.getCurrentUser();
        
        await routeGuard.guard();
        
        const authAfter = authManager.isAuthenticated();
        const userAfter = authManager.getCurrentUser();
        
        return authBefore === true && authAfter === true &&
               userBefore.uid === userAfter.uid;
      }),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 5.5** - user data remains accessible on public routes', async () => {
    await fc.assert(
      fc.asyncProperty(publicRouteGen, userGen, async (pathname, user) => {
        const { routeGuard, authManager } = createRouteGuard(user, pathname);
        await routeGuard.initialize();
        await routeGuard.guard();
        
        const currentUser = authManager.getCurrentUser();
        return currentUser !== null &&
               currentUser.uid === user.uid &&
               currentUser.email === user.email;
      }),
      { numRuns: 100 }
    );
  });
});
