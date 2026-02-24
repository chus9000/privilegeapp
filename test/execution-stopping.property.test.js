/**
 * Property-Based Tests for Execution Stopping After Redirect
 * Feature: auth-bypass-fix
 * 
 * Property 9: Protected page logic stops after redirect
 * Validates: Requirements 3.5
 * 
 * For any protected route, when the route guard redirects an unauthenticated user, 
 * no protected page logic must execute.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

const routeGuardCode = readFileSync(join(process.cwd(), 'route-guard.js'), 'utf-8');

function createRouteGuard(isAuthenticated, pathname) {
  let pageLogicExecuted = false;
  
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
    isAuthenticated: function() { return isAuthenticated; },
    getCurrentUser: function() { return isAuthenticated ? { uid: 'test' } : null; },
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
  
  return { 
    routeGuard, location, sessionStorage,
    executePageLogic: () => { pageLogicExecuted = true; },
    wasPageLogicExecuted: () => pageLogicExecuted
  };
}

const protectedRouteGen = fc.constantFrom('/app', '/app/', '/app/index.html', '/app/create.html');

describe('Property 9: Protected page logic stops after redirect', () => {
  test('**Validates: Requirements 3.5** - guard returns false for unauthenticated users', async () => {
    await fc.assert(
      fc.asyncProperty(protectedRouteGen, async (pathname) => {
        const { routeGuard } = createRouteGuard(false, pathname);
        await routeGuard.initialize();
        const result = await routeGuard.guard();
        return result === false;
      }),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 3.5** - page logic should not execute when guard returns false', async () => {
    await fc.assert(
      fc.asyncProperty(protectedRouteGen, async (pathname) => {
        const { routeGuard, executePageLogic, wasPageLogicExecuted } = createRouteGuard(false, pathname);
        await routeGuard.initialize();
        const allowed = await routeGuard.guard();
        
        // Only execute page logic if allowed
        if (allowed) {
          executePageLogic();
        }
        
        return wasPageLogicExecuted() === false;
      }),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 3.5** - redirect occurs before page logic can execute', async () => {
    await fc.assert(
      fc.asyncProperty(protectedRouteGen, async (pathname) => {
        const { routeGuard, location } = createRouteGuard(false, pathname);
        const originalHref = pathname;
        
        await routeGuard.initialize();
        const allowed = await routeGuard.guard();
        
        // Check that redirect occurred and guard denied access
        const wasRedirected = location.href !== originalHref;
        return allowed === false && wasRedirected;
      }),
      { numRuns: 100 }
    );
  });
});
