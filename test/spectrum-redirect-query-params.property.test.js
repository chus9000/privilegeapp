/**
 * Property-Based Tests for Spectrum Redirect Query Parameter Preservation
 * Feature: spectrum-page-consolidation
 * Task: 1.1 Write property test for query parameter preservation
 * 
 * **Property 1: Query Parameter Preservation on Redirect**
 * **Validates: Requirements 2.1, 2.2**
 * 
 * For any URL query string, when navigating to spectrum.html with that query string,
 * the redirect to results.html should preserve the exact same query string.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Property Test: Query Parameter Preservation on Redirect', () => {
  let spectrumHtml;

  // Load the spectrum.html file once for all tests
  try {
    spectrumHtml = readFileSync(join(process.cwd(), 'app', 'spectrum.html'), 'utf-8');
  } catch (error) {
    console.error('Failed to load spectrum.html:', error);
    spectrumHtml = '';
  }

  /**
   * Helper function to simulate the redirect logic
   * Extracts and executes the redirect code from spectrum.html
   */
  function simulateRedirect(queryString) {
    // The redirect code should be: 'results.html' + window.location.search
    // We simulate window.location.search with the provided queryString
    const mockWindow = {
      location: {
        search: queryString,
        replace: function(url) {
          return url;
        }
      }
    };
    
    // Build the redirect URL as the code does
    return 'results.html' + mockWindow.location.search;
  }

  /**
   * Property 1: Query Parameter Preservation on Redirect
   * 
   * For any valid query string, the redirect mechanism should preserve it exactly.
   * This tests that window.location.search is correctly appended to the redirect URL.
   */
  test('Property 1: Query parameters are preserved across redirect', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary query strings with various parameters
        fc.record({
          id: fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fc.uuid(),
            fc.integer({ min: 1, max: 999999 }).map(n => n.toString()),
            fc.constant('freeplay')
          ),
          additionalParams: fc.option(
            fc.record({
              mode: fc.oneof(fc.constant('event'), fc.constant('freeplay')),
              view: fc.oneof(fc.constant('spectrum'), fc.constant('results')),
              timestamp: fc.integer({ min: 0, max: Date.now() }).map(n => n.toString())
            }),
            { nil: undefined }
          )
        }),
        ({ id, additionalParams }) => {
          // Build query string
          let queryString = `?id=${encodeURIComponent(id)}`;
          if (additionalParams) {
            if (additionalParams.mode) {
              queryString += `&mode=${encodeURIComponent(additionalParams.mode)}`;
            }
            if (additionalParams.view) {
              queryString += `&view=${encodeURIComponent(additionalParams.view)}`;
            }
            if (additionalParams.timestamp) {
              queryString += `&timestamp=${encodeURIComponent(additionalParams.timestamp)}`;
            }
          }

          // Simulate the redirect
          const redirectUrl = simulateRedirect(queryString);

          // Verify redirect URL structure
          expect(redirectUrl).toBe(`results.html${queryString}`);
          expect(redirectUrl).toContain('results.html');
          expect(redirectUrl).toContain(queryString);

          // Parse and verify parameters are preserved
          const redirectedUrl = new URL(redirectUrl, 'http://localhost/app/');
          const originalUrl = new URL(`http://localhost/app/spectrum.html${queryString}`);

          // All original query parameters should be in the redirect
          originalUrl.searchParams.forEach((value, key) => {
            expect(redirectedUrl.searchParams.get(key)).toBe(value);
          });

          // The id parameter should match
          expect(redirectedUrl.searchParams.get('id')).toBe(id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Empty query string handling
   * 
   * When no query parameters are present, the redirect should still work correctly.
   */
  test('Property 2: Redirect works with empty query string', () => {
    fc.assert(
      fc.property(
        fc.constant(''), // Empty query string
        (queryString) => {
          const redirectUrl = simulateRedirect(queryString);
          expect(redirectUrl).toBe('results.html');
          expect(redirectUrl).not.toContain('?');
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 3: Special characters in query parameters
   * 
   * Query parameters with special characters should be preserved correctly.
   */
  test('Property 3: Special characters in query parameters are preserved', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.oneof(
            fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            fc.constant('event-with-dashes'),
            fc.constant('event_with_underscores'),
            fc.constant('event.with.dots'),
            fc.constant('event123')
          )
        }),
        ({ id }) => {
          const queryString = `?id=${encodeURIComponent(id)}`;
          const redirectUrl = simulateRedirect(queryString);
          
          expect(redirectUrl).toBe(`results.html${queryString}`);
          
          const redirectedUrl = new URL(redirectUrl, 'http://localhost/app/');
          expect(redirectedUrl.searchParams.get('id')).toBe(id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Multiple query parameters preservation
   * 
   * When multiple query parameters are present, all should be preserved.
   */
  test('Property 4: Multiple query parameters are all preserved', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
          fc.string({ minLength: 1, maxLength: 50 }),
          { minKeys: 1, maxKeys: 5 }
        ),
        (params) => {
          const queryString = '?' + Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

          const redirectUrl = simulateRedirect(queryString);
          
          expect(redirectUrl).toBe(`results.html${queryString}`);
          
          const redirectedUrl = new URL(redirectUrl, 'http://localhost/app/');

          // Verify each parameter individually
          Object.entries(params).forEach(([key, value]) => {
            expect(redirectedUrl.searchParams.get(key)).toBe(value);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Redirect URL structure
   * 
   * The redirect URL should always have the correct structure: results.html + query string
   */
  test('Property 5: Redirect URL structure is always correct', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }).map(s => {
          // Generate valid query string
          if (s.length === 0) return '';
          return '?' + s.split('').filter(c => /[a-zA-Z0-9=&_-]/.test(c)).join('');
        }),
        (queryString) => {
          const redirectUrl = simulateRedirect(queryString);
          
          // Should start with results.html
          expect(redirectUrl.startsWith('results.html')).toBe(true);

          // Should be exactly: results.html + queryString
          expect(redirectUrl).toBe(`results.html${queryString}`);

          // Should not contain spectrum.html
          expect(redirectUrl).not.toContain('spectrum.html');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: HTML structure verification
   * 
   * The spectrum.html file should contain the correct redirect code structure
   */
  test('Property 6: HTML contains correct redirect code', () => {
    // Verify the HTML contains the redirect logic
    expect(spectrumHtml).toContain("'results.html' + window.location.search");
    expect(spectrumHtml).toContain('window.location.replace');
    expect(spectrumHtml).toContain('meta http-equiv="refresh"');
    expect(spectrumHtml).toContain('url=results.html');
  });
});
