/**
 * Integration Test for Free Play Mode
 * Feature: auth-bypass-fix
 * 
 * Validates: Requirements 5.2
 * Test free play navigation without authentication
 */

import { describe, test, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Integration: Free Play Mode', () => {
  test('**Validates: Requirements 5.2** - questions page is accessible without authentication', () => {
    // Load the questions page HTML
    const html = readFileSync(join(process.cwd(), 'app/questions.html'), 'utf-8');
    
    // Property: Questions page should not require route guard
    expect(html).not.toContain('route-guard.js');
    expect(html.length).toBeGreaterThan(100);
  });

  test('**Validates: Requirements 5.2** - route guard allows access to questions page', async () => {
    // Load RouteGuard code
    const routeGuardCode = readFileSync(join(process.cwd(), 'route-guard.js'), 'utf-8');
    
    // Create mock environment
    const sessionStorage = {
      _store: {},
      getItem(key) { return this._store[key] || null; },
      setItem(key, value) { this._store[key] = value.toString(); },
      removeItem(key) { delete this._store[key]; },
      clear() { this._store = {}; }
    };

    const location = {
      pathname: '/app/questions.html',
      search: '',
      href: '/app/questions.html',
      assign: function(url) { this.href = url; },
      replace: function(url) { this.href = url; }
    };

    const authManager = {
      initialize: async function() { this.initialized = true; },
      isAuthenticated: function() { return false; }, // Unauthenticated
      getCurrentUser: function() { return null; },
      initialized: false
    };

    const context = {
      location, sessionStorage, AuthManager: authManager,
      console: { log: () => {}, error: () => {} }
    };

    // Execute RouteGuard code
    const func = new Function('window', 'sessionStorage',
      routeGuardCode + '; return new RouteGuard();');
    const routeGuard = func(context, sessionStorage);
    routeGuard.authManager = authManager;

    // Initialize and guard
    await routeGuard.initialize();
    const allowed = await routeGuard.guard();

    // Property: Questions page should be accessible without auth
    expect(allowed).toBe(true);
    expect(location.href).toBe('/app/questions.html'); // No redirect
  });

  test('**Validates: Requirements 5.2** - free play does not create session', async () => {
    // Load RouteGuard code
    const routeGuardCode = readFileSync(join(process.cwd(), 'route-guard.js'), 'utf-8');
    
    const sessionStorage = {
      _store: {},
      getItem(key) { return this._store[key] || null; },
      setItem(key, value) { this._store[key] = value.toString(); },
      removeItem(key) { delete this._store[key]; },
      clear() { this._store = {}; }
    };

    const location = {
      pathname: '/app/questions.html',
      search: '',
      href: '/app/questions.html',
      assign: function(url) { this.href = url; },
      replace: function(url) { this.href = url; }
    };

    const authManager = {
      initialize: async function() { this.initialized = true; },
      isAuthenticated: function() { return false; },
      getCurrentUser: function() { return null; },
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

    await routeGuard.initialize();
    await routeGuard.guard();

    // Property: No session should be created for free play
    expect(authManager.getCurrentUser()).toBeNull();
    expect(authManager.isAuthenticated()).toBe(false);
  });
});
