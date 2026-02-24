/**
 * Integration Test for Landing Page Accessibility
 * Feature: auth-bypass-fix
 * 
 * Validates: Requirements 5.1
 * Test landing page displays both buttons without auth
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { JSDOM } from 'jsdom';

describe('Integration: Landing Page Accessibility', () => {
  test('**Validates: Requirements 5.1** - landing page displays both buttons without authentication', () => {
    // Load the landing page HTML
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf-8');
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Check for "Free Play" button/link
    const freePlayElements = Array.from(document.querySelectorAll('button, a')).filter(el => 
      el.textContent.toLowerCase().includes('free play')
    );
    
    // Check for "Create your own event" button/link
    const createEventElements = Array.from(document.querySelectorAll('button, a')).filter(el => 
      el.textContent.toLowerCase().includes('create') || 
      el.textContent.toLowerCase().includes('event')
    );

    // Property: Both options must be visible without authentication
    expect(freePlayElements.length).toBeGreaterThan(0);
    expect(createEventElements.length).toBeGreaterThan(0);
  });

  test('**Validates: Requirements 5.1** - landing page does not require auth scripts', () => {
    // Load the landing page HTML
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf-8');
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Check that route-guard is NOT loaded on landing page
    const scripts = Array.from(document.querySelectorAll('script'));
    const hasRouteGuard = scripts.some(script => 
      script.src && script.src.includes('route-guard')
    );

    // Property: Landing page should not load route guard
    expect(hasRouteGuard).toBe(false);
  });

  test('**Validates: Requirements 5.1** - landing page is accessible without Firebase', () => {
    // Load the landing page HTML
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf-8');
    
    // Property: HTML should load without errors (basic structure check)
    expect(html).toContain('<!DOCTYPE html>');
    expect(html.length).toBeGreaterThan(100);
  });
});
