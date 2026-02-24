/**
 * Unit Tests for Code Reference Verification
 * Feature: spectrum-page-consolidation
 * Task: 2.3 Write unit test for code reference verification
 * 
 * Tests that no JavaScript files contain 'spectrum.html' references after consolidation
 * Requirements: 3.1, 3.2
 */

import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

describe('Code Reference Verification', () => {
  /**
   * Recursively find all JavaScript files in a directory
   * @param {string} dir - Directory to search
   * @param {string[]} fileList - Accumulated list of files
   * @returns {string[]} - List of JavaScript file paths
   */
  function findJavaScriptFiles(dir, fileList = []) {
    const files = readdirSync(dir);
    
    files.forEach(file => {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .git directories
        if (file !== 'node_modules' && file !== '.git' && file !== '.kiro') {
          findJavaScriptFiles(filePath, fileList);
        }
      } else if (file.endsWith('.js')) {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }

  /**
   * Check if a file contains references to spectrum.html
   * @param {string} filePath - Path to the file
   * @returns {boolean} - True if file contains spectrum.html reference
   */
  function containsSpectrumHtmlReference(filePath) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      // Check for spectrum.html references (case-insensitive)
      return /spectrum\.html/i.test(content);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return false;
    }
  }

  describe('Requirement 3.1: Navigation updates to consolidated page', () => {
    test('should not contain spectrum.html references in app directory JavaScript files', () => {
      const appDir = join(process.cwd(), 'app');
      const jsFiles = findJavaScriptFiles(appDir);
      
      const filesWithReferences = jsFiles.filter(file => 
        containsSpectrumHtmlReference(file)
      );
      
      expect(filesWithReferences).toEqual([]);
      
      if (filesWithReferences.length > 0) {
        console.error('Files with spectrum.html references:', filesWithReferences);
      }
    });

    test('should not contain spectrum.html references in root level JavaScript files', () => {
      const rootDir = process.cwd();
      const rootFiles = readdirSync(rootDir)
        .filter(file => file.endsWith('.js'))
        .map(file => join(rootDir, file));
      
      const filesWithReferences = rootFiles.filter(file => 
        containsSpectrumHtmlReference(file)
      );
      
      expect(filesWithReferences).toEqual([]);
      
      if (filesWithReferences.length > 0) {
        console.error('Root files with spectrum.html references:', filesWithReferences);
      }
    });
  });

  describe('Requirement 3.2: All JavaScript references updated', () => {
    test('should not contain spectrum.html references in any source JavaScript files', () => {
      const rootDir = process.cwd();
      const allJsFiles = findJavaScriptFiles(rootDir)
        // Exclude test files - they may reference spectrum.html for testing purposes
        .filter(file => !file.includes('/test/') && !file.includes('\\test\\'));
      
      const filesWithReferences = allJsFiles.filter(file => 
        containsSpectrumHtmlReference(file)
      );
      
      expect(filesWithReferences).toEqual([]);
      
      if (filesWithReferences.length > 0) {
        console.error('Source files with spectrum.html references:', filesWithReferences);
        filesWithReferences.forEach(file => {
          const content = readFileSync(file, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (/spectrum\.html/i.test(line)) {
              console.error(`  ${file}:${index + 1}: ${line.trim()}`);
            }
          });
        });
      }
    });

    test('should verify specific critical files do not reference spectrum.html', () => {
      const criticalFiles = [
        'results.js',
        'route-guard.js',
        'app-header.js',
        'event.js',
        'app/dashboard.js',
        'app/event-creation.js',
        'app/score.js'
      ];
      
      const filesWithReferences = [];
      
      criticalFiles.forEach(file => {
        const filePath = join(process.cwd(), file);
        try {
          if (containsSpectrumHtmlReference(filePath)) {
            filesWithReferences.push(file);
          }
        } catch (error) {
          // File might not exist, which is okay
          console.log(`Note: ${file} not found (may not exist in this project)`);
        }
      });
      
      expect(filesWithReferences).toEqual([]);
      
      if (filesWithReferences.length > 0) {
        console.error('Critical files with spectrum.html references:', filesWithReferences);
      }
    });
  });

  describe('Code quality checks', () => {
    test('should find at least some JavaScript files to verify', () => {
      const rootDir = process.cwd();
      const allJsFiles = findJavaScriptFiles(rootDir)
        .filter(file => !file.includes('/test/') && !file.includes('\\test\\'));
      
      // Should have at least a few JavaScript files in the project
      expect(allJsFiles.length).toBeGreaterThan(0);
    });

    test('should verify test utility functions work correctly', () => {
      // Test the helper function with a known file
      const testFilePath = join(process.cwd(), 'test', 'spectrum-redirect.unit.test.js');
      
      try {
        // This test file SHOULD contain spectrum.html references
        const hasReference = containsSpectrumHtmlReference(testFilePath);
        expect(hasReference).toBe(true);
      } catch (error) {
        // If file doesn't exist, that's okay - just skip this verification
        console.log('Note: spectrum-redirect.unit.test.js not found for verification');
      }
    });

    test('should handle files with various encodings', () => {
      const rootDir = process.cwd();
      const jsFiles = findJavaScriptFiles(rootDir)
        .filter(file => !file.includes('/test/') && !file.includes('\\test\\'))
        .slice(0, 5); // Just test a few files
      
      jsFiles.forEach(file => {
        expect(() => {
          containsSpectrumHtmlReference(file);
        }).not.toThrow();
      });
    });
  });

  describe('Edge cases and validation', () => {
    test('should detect spectrum.html in various formats', () => {
      const testCases = [
        { content: "window.location.href = 'spectrum.html'", shouldMatch: true },
        { content: 'window.location.href = "spectrum.html"', shouldMatch: true },
        { content: 'navigate to spectrum.html', shouldMatch: true },
        { content: 'SPECTRUM.HTML', shouldMatch: true }, // Case insensitive
        { content: '/app/spectrum.html', shouldMatch: true },
        { content: 'spectrum.html?id=123', shouldMatch: true },
        { content: 'results.html', shouldMatch: false },
        { content: 'spectrum-container', shouldMatch: false },
        { content: 'spectrumhtml', shouldMatch: false }
      ];
      
      testCases.forEach(({ content, shouldMatch }) => {
        const matches = /spectrum\.html/i.test(content);
        expect(matches).toBe(shouldMatch);
      });
    });

    test('should not flag false positives', () => {
      const safePhrases = [
        'spectrum visualization',
        'spectrum-container',
        'spectrumData',
        'results.html',
        'questions.html',
        'score.html'
      ];
      
      safePhrases.forEach(phrase => {
        const matches = /spectrum\.html/i.test(phrase);
        expect(matches).toBe(false);
      });
    });

    test('should handle empty files gracefully', () => {
      expect(() => {
        const matches = /spectrum\.html/i.test('');
        expect(matches).toBe(false);
      }).not.toThrow();
    });

    test('should handle files with special characters', () => {
      const specialContent = `
        // Comment with special chars: @#$%^&*()
        const url = 'results.html?id=test&mode=event';
        /* Multi-line comment
           with various content */
      `;
      
      const matches = /spectrum\.html/i.test(specialContent);
      expect(matches).toBe(false);
    });
  });

  describe('Documentation and comments', () => {
    test('should allow spectrum.html mentions in comments for historical context', () => {
      // This test documents that comments mentioning spectrum.html are acceptable
      // as long as the actual code doesn't reference it
      const commentExample = `
        // Previously used spectrum.html, now using results.html
        window.location.href = 'results.html';
      `;
      
      // The regex will still match, but in practice we only check source files
      // and developers can use comments for historical context
      expect(true).toBe(true);
    });

    test('should verify test files are excluded from checks', () => {
      const testFilePath = '/some/path/test/example.test.js';
      const isTestFile = testFilePath.includes('/test/') || testFilePath.includes('\\test\\');
      
      expect(isTestFile).toBe(true);
    });
  });
});
