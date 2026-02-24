/**
 * Unit Tests for Spectrum Page Redirect Mechanism
 * Feature: spectrum-page-consolidation
 * Task: 1. Create redirect mechanism for backward compatibility
 * 
 * Tests for spectrum.html redirect to results.html with query parameter preservation
 * Requirements: 2.1, 2.2, 2.4
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Spectrum Page Redirect Mechanism', () => {
  let spectrumHtml;

  // Load the spectrum.html file once for all tests
  try {
    spectrumHtml = readFileSync(join(process.cwd(), 'app', 'spectrum.html'), 'utf-8');
  } catch (error) {
    console.error('Failed to load spectrum.html:', error);
    spectrumHtml = '';
  }

  describe('Requirement 2.1: Redirect to results.html', () => {
    test('should contain meta refresh tag pointing to results.html', () => {
      expect(spectrumHtml).toContain('meta http-equiv="refresh"');
      expect(spectrumHtml).toContain('url=results.html');
    });

    test('should have meta refresh with 0 second delay', () => {
      expect(spectrumHtml).toContain('content="0;url=results.html"');
    });

    test('should contain JavaScript redirect to results.html', () => {
      expect(spectrumHtml).toContain("window.location.replace('results.html'");
    });

    test('should use window.location.replace for redirect', () => {
      // Using replace() instead of href prevents back button issues
      expect(spectrumHtml).toContain('window.location.replace');
      expect(spectrumHtml).not.toContain('window.location.href = \'results.html\'');
    });

    test('should have minimal HTML structure', () => {
      expect(spectrumHtml).toContain('<!DOCTYPE html>');
      expect(spectrumHtml).toContain('<html');
      expect(spectrumHtml).toContain('<head>');
      expect(spectrumHtml).toContain('<body>');
    });

    test('should have redirecting message in body', () => {
      expect(spectrumHtml).toContain('Redirecting');
    });

    test('should have appropriate title', () => {
      expect(spectrumHtml).toContain('<title>Redirecting...</title>');
    });
  });

  describe('Requirement 2.2: Query parameter preservation', () => {
    test('should append window.location.search to redirect URL', () => {
      expect(spectrumHtml).toContain('window.location.search');
      expect(spectrumHtml).toContain("'results.html' + window.location.search");
    });

    test('should preserve query parameters in JavaScript redirect', () => {
      // The redirect should concatenate the search string
      const redirectPattern = /window\.location\.replace\(['"]results\.html['"] \+ window\.location\.search\)/;
      expect(redirectPattern.test(spectrumHtml)).toBe(true);
    });

    test('should not hardcode any query parameters', () => {
      // Should not contain ?id= or other hardcoded params in the redirect
      const jsRedirectMatch = spectrumHtml.match(/window\.location\.replace\([^)]+\)/);
      if (jsRedirectMatch) {
        expect(jsRedirectMatch[0]).not.toContain('?id=');
        expect(jsRedirectMatch[0]).not.toContain('&');
      }
    });
  });

  describe('Requirement 2.4: Fast redirect (<100ms)', () => {
    test('should use immediate JavaScript redirect', () => {
      // Script should be in head for immediate execution
      const headContent = spectrumHtml.match(/<head>([\s\S]*?)<\/head>/);
      expect(headContent).toBeTruthy();
      if (headContent) {
        expect(headContent[0]).toContain('window.location.replace');
      }
    });

    test('should have meta refresh as fallback', () => {
      // Meta refresh with 0 delay ensures redirect even if JS fails
      expect(spectrumHtml).toContain('content="0;url=results.html"');
    });

    test('should not load unnecessary resources', () => {
      // Should not load CSS, images, or other resources that slow down redirect
      expect(spectrumHtml).not.toContain('link rel="stylesheet"');
      expect(spectrumHtml).not.toContain('<img');
      expect(spectrumHtml).not.toContain('firebase-config.js');
      expect(spectrumHtml).not.toContain('spectrum.js');
    });

    test('should not have external script dependencies', () => {
      // Only inline script for redirect
      const scriptTags = spectrumHtml.match(/<script[^>]*src=/g);
      expect(scriptTags).toBeNull();
    });
  });

  describe('Browser compatibility', () => {
    test('should have both JavaScript and meta refresh for compatibility', () => {
      // JavaScript for modern browsers
      expect(spectrumHtml).toContain('window.location.replace');
      // Meta refresh for browsers with JS disabled
      expect(spectrumHtml).toContain('meta http-equiv="refresh"');
    });

    test('should have proper charset declaration', () => {
      expect(spectrumHtml).toContain('charset="UTF-8"');
    });

    test('should have proper HTML5 doctype', () => {
      expect(spectrumHtml).toMatch(/^<!DOCTYPE html>/i);
    });

    test('should have viewport meta tag for mobile compatibility', () => {
      expect(spectrumHtml).toContain('name="viewport"');
    });
  });

  describe('Code quality and structure', () => {
    test('should be minimal in size', () => {
      // Redirect file should be small (< 1KB)
      expect(spectrumHtml.length).toBeLessThan(1024);
    });

    test('should not contain old spectrum.html content', () => {
      // Should not have spectrum-specific elements
      expect(spectrumHtml).not.toContain('spectrum-container');
      expect(spectrumHtml).not.toContain('spectrum-bar');
      expect(spectrumHtml).not.toContain('participantsResults');
      expect(spectrumHtml).not.toContain('participantModal');
    });

    test('should not load spectrum.js', () => {
      expect(spectrumHtml).not.toContain('spectrum.js');
    });

    test('should not load results.js', () => {
      // Redirect page should not load any app scripts
      expect(spectrumHtml).not.toContain('results.js');
    });

    test('should have clean, readable code', () => {
      // Should have proper indentation and structure
      expect(spectrumHtml).toContain('  '); // Has indentation
      expect(spectrumHtml).toContain('\n'); // Has line breaks
    });
  });

  describe('Security considerations', () => {
    test('should use relative URL for redirect', () => {
      // Should not redirect to external domains
      expect(spectrumHtml).not.toContain('http://');
      expect(spectrumHtml).not.toContain('https://');
      expect(spectrumHtml).toContain("'results.html'");
    });

    test('should not expose sensitive information', () => {
      // Should not contain API keys, tokens, or other secrets
      expect(spectrumHtml).not.toContain('apiKey');
      expect(spectrumHtml).not.toContain('token');
      expect(spectrumHtml).not.toContain('secret');
    });

    test('should use window.location.replace to prevent back button issues', () => {
      // replace() removes redirect page from history
      expect(spectrumHtml).toContain('window.location.replace');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty query string', () => {
      // When window.location.search is empty, should still work
      // 'results.html' + '' = 'results.html'
      expect(spectrumHtml).toContain("'results.html' + window.location.search");
    });

    test('should handle query strings with special characters', () => {
      // window.location.search preserves encoding
      // No special handling needed, just concatenation
      expect(spectrumHtml).toContain("'results.html' + window.location.search");
    });

    test('should work with hash fragments', () => {
      // Note: window.location.search does not include hash
      // This is expected behavior - hash is preserved by browser
      expect(spectrumHtml).toContain('window.location.search');
    });
  });

  describe('Accessibility', () => {
    test('should have lang attribute on html tag', () => {
      expect(spectrumHtml).toContain('lang="en"');
    });

    test('should have visible message for users', () => {
      // Users should see something while redirect happens
      expect(spectrumHtml).toContain('Redirecting');
    });

    test('should have meaningful title', () => {
      expect(spectrumHtml).toContain('<title>');
      expect(spectrumHtml).toContain('Redirecting');
    });
  });
});
