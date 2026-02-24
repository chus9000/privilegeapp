import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

/**
 * Feature: spectrum-page-consolidation
 * Task: 10.3 Write unit test to verify no references remain
 * 
 * Tests that no references to deleted spectrum files remain in the codebase
 * Requirements: 10.3
 */

describe('No Spectrum References', () => {
  it('should have no spectrum.html references in JavaScript files', () => {
    try {
      const result = execSync(
        'grep -r "spectrum\\.html" --include="*.js" --exclude-dir=".kiro" --exclude-dir="node_modules" --exclude-dir="test" .',
        { encoding: 'utf-8', cwd: process.cwd() }
      );
      // If grep finds matches, it returns them; we expect no matches
      expect(result.trim()).toBe('');
    } catch (error) {
      // grep returns exit code 1 when no matches found, which is what we want
      if (error.status === 1) {
        expect(true).toBe(true); // No matches found - test passes
      } else {
        throw error; // Actual error occurred
      }
    }
  });

  it('should have no spectrum.html references in HTML files (except redirect)', () => {
    try {
      const result = execSync(
        'grep -r "spectrum\\.html" --include="*.html" --exclude-dir=".kiro" --exclude-dir="node_modules" --exclude-dir="test" . | grep -v "app/spectrum.html"',
        { encoding: 'utf-8', cwd: process.cwd() }
      );
      // If grep finds matches, it returns them; we expect no matches
      expect(result.trim()).toBe('');
    } catch (error) {
      // grep returns exit code 1 when no matches found, which is what we want
      if (error.status === 1) {
        expect(true).toBe(true); // No matches found - test passes
      } else {
        throw error; // Actual error occurred
      }
    }
  });

  it('should have no spectrum.js script tags in HTML files', () => {
    try {
      const result = execSync(
        'grep -r "spectrum\\.js" --include="*.html" --exclude-dir=".kiro" --exclude-dir="node_modules" --exclude-dir="test" .',
        { encoding: 'utf-8', cwd: process.cwd() }
      );
      // If grep finds matches, it returns them; we expect no matches
      expect(result.trim()).toBe('');
    } catch (error) {
      // grep returns exit code 1 when no matches found, which is what we want
      if (error.status === 1) {
        expect(true).toBe(true); // No matches found - test passes
      } else {
        throw error; // Actual error occurred
      }
    }
  });

  it('should have no spectrum.js imports in JavaScript files', () => {
    try {
      const result = execSync(
        'grep -r "import.*spectrum\\.js\\|require.*spectrum\\.js" --include="*.js" --exclude-dir=".kiro" --exclude-dir="node_modules" --exclude-dir="test" .',
        { encoding: 'utf-8', cwd: process.cwd() }
      );
      // If grep finds matches, it returns them; we expect no matches
      expect(result.trim()).toBe('');
    } catch (error) {
      // grep returns exit code 1 when no matches found, which is what we want
      if (error.status === 1) {
        expect(true).toBe(true); // No matches found - test passes
      } else {
        throw error; // Actual error occurred
      }
    }
  });
});
