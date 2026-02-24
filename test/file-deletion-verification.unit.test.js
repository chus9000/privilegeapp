import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Feature: spectrum-page-consolidation
 * Task: 11.3 Write unit test for file deletion verification
 * 
 * Tests that obsolete files are deleted and redirect file exists
 * Requirements: 1.2, 1.3, 10.1, 10.2
 */

describe('File Deletion Verification', () => {
  it('should have deleted spectrum.js', () => {
    const spectrumJsPath = join(process.cwd(), 'app', 'spectrum.js');
    expect(existsSync(spectrumJsPath)).toBe(false);
  });

  it('should have redirect spectrum.html', () => {
    const spectrumHtmlPath = join(process.cwd(), 'app', 'spectrum.html');
    expect(existsSync(spectrumHtmlPath)).toBe(true);
  });

  it('redirect spectrum.html should contain redirect logic', () => {
    const spectrumHtmlPath = join(process.cwd(), 'app', 'spectrum.html');
    const content = readFileSync(spectrumHtmlPath, 'utf-8');
    
    // Should have meta refresh
    expect(content).toContain('meta http-equiv="refresh"');
    expect(content).toContain('url=results.html');
    
    // Should have JavaScript redirect
    expect(content).toContain('window.location.replace');
    expect(content).toContain('results.html');
    
    // Should preserve query parameters
    expect(content).toContain('window.location.search');
  });

  it('redirect spectrum.html should be minimal', () => {
    const spectrumHtmlPath = join(process.cwd(), 'app', 'spectrum.html');
    const content = readFileSync(spectrumHtmlPath, 'utf-8');
    
    // Should not contain old spectrum content
    expect(content).not.toContain('spectrum-container');
    expect(content).not.toContain('spectrum-bar');
    expect(content).not.toContain('participantsResults');
    
    // Should not load spectrum.js
    expect(content).not.toContain('spectrum.js');
  });

  it('redirect spectrum.html should have fallback message', () => {
    const spectrumHtmlPath = join(process.cwd(), 'app', 'spectrum.html');
    const content = readFileSync(spectrumHtmlPath, 'utf-8');
    
    // Should have user-visible message for browsers with JS disabled
    expect(content).toContain('Redirecting');
  });
});
