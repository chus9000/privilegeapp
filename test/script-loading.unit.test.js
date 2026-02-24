import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Script Loading in results.html', () => {
  const resultsHtml = readFileSync(join(process.cwd(), 'app/results.html'), 'utf-8');

  it('should load results.js', () => {
    expect(resultsHtml).toContain('src="../results.js"');
  });

  it('should load free-play-analytics.js', () => {
    expect(resultsHtml).toContain('src="../free-play-analytics.js"');
  });

  it('should NOT load spectrum.js', () => {
    expect(resultsHtml).not.toContain('spectrum.js');
  });

  it('should load scripts in correct order', () => {
    const scriptMatches = [...resultsHtml.matchAll(/<script src="\.\.\/([^"]+)"><\/script>/g)];
    const scriptOrder = scriptMatches.map(match => match[1]);
    
    const expectedOrder = [
      'firebase-config.js',
      'questions.js',
      'free-play-analytics.js',
      'ally-tips.js',
      'results.js'
    ];
    
    expect(scriptOrder).toEqual(expectedOrder);
  });

  it('should load firebase-config.js before other scripts', () => {
    const firebaseIndex = resultsHtml.indexOf('firebase-config.js');
    const resultsIndex = resultsHtml.indexOf('results.js');
    const analyticsIndex = resultsHtml.indexOf('free-play-analytics.js');
    
    expect(firebaseIndex).toBeLessThan(resultsIndex);
    expect(firebaseIndex).toBeLessThan(analyticsIndex);
  });
});
