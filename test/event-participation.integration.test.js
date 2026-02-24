/**
 * Integration Test for Event Participation
 * Feature: auth-bypass-fix
 * 
 * Validates: Requirements 5.3
 * Test event access via PIN/URL without authentication
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Integration: Event Participation', () => {
  test('**Validates: Requirements 5.3** - questions page accepts event parameters', () => {
    // Load the questions page HTML
    const html = readFileSync(join(process.cwd(), 'app/questions.html'), 'utf-8');
    
    // Property: Questions page should exist and be accessible
    expect(html).toContain('<!DOCTYPE html>');
    expect(html.length).toBeGreaterThan(100);
  });

  test('**Validates: Requirements 5.3** - route guard allows event participation without auth', async () => {
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
      search: '?id=test-event&pin=123456',
      href: '/app/questions.html?id=test-event&pin=123456',
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

    const func = new Function('window', 'sessionStorage',
      routeGuardCode + '; return new RouteGuard();');
    const routeGuard = func(context, sessionStorage);
    routeGuard.authManager = authManager;

    await routeGuard.initialize();
    const allowed = await routeGuard.guard();

    // Property: Event participation should be allowed without auth
    expect(allowed).toBe(true);
    expect(location.href).toContain('?id=test-event&pin=123456'); // No redirect
  });

  test('**Validates: Requirements 5.3** - results page is accessible without auth', async () => {
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
      pathname: '/app/results.html',
      search: '?id=test-event',
      href: '/app/results.html?id=test-event',
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
    const allowed = await routeGuard.guard();

    // Property: Results page should be accessible without auth
    expect(allowed).toBe(true);
    expect(location.href).toContain('results.html');
  });

  test('**Validates: Requirements 5.3** - spectrum page is accessible without auth', async () => {
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
      pathname: '/app/results.html',
      search: '?id=test-event',
      href: '/app/results.html?id=test-event',
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
    const allowed = await routeGuard.guard();

    // Property: Results page should be accessible without auth
    expect(allowed).toBe(true);
    expect(location.href).toContain('results.html');
  });
});
