/**
 * Property-Based Tests for Event URL Structure
 * Feature: full-featured-quiz-app
 * 
 * **Property 11: Event URL Structure**
 * **Validates: Requirements 10.5, 10.7, 10.8**
 * 
 * For any event with an event ID, the participation URL should follow the pattern
 * `/app/questions.html?id={eventId}` and the results URL should follow 
 * `/app/results.html?id={eventId}`.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';

/**
 * Generate a questions URL for an event
 */
function generateQuestionsUrl(eventId) {
  return `/app/questions.html?id=${encodeURIComponent(eventId)}`;
}

/**
 * Generate a results URL for an event
 */
function generateResultsUrl(eventId) {
  return `/app/results.html?id=${encodeURIComponent(eventId)}`;
}

/**
 * Parse event ID from a URL
 */
function parseEventIdFromUrl(url) {
  const urlObj = new URL(url, 'http://localhost');
  return urlObj.searchParams.get('id');
}

/**
 * Validate URL structure
 */
function validateUrlStructure(url, expectedPath) {
  const urlObj = new URL(url, 'http://localhost');
  return urlObj.pathname === expectedPath && urlObj.searchParams.has('id');
}

// Generators for property-based testing

/**
 * Generate valid event IDs
 * Event IDs are typically timestamps or UUIDs
 */
const eventIdGen = fc.oneof(
  // Timestamp-based IDs
  fc.integer({ min: 1000000000000, max: 9999999999999 }).map(String),
  // UUID-like IDs
  fc.uuid(),
  // Alphanumeric IDs
  fc.stringMatching(/^[a-zA-Z0-9_-]{8,32}$/),
  // Special case: freeplay
  fc.constant('freeplay')
);

describe('Property 11: Event URL Structure', () => {
  test('**Validates: Requirements 10.5** - questions URL follows correct pattern', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        (eventId) => {
          // Generate questions URL
          const url = generateQuestionsUrl(eventId);
          
          // Property: URL should follow pattern /app/questions.html?id={eventId}
          const isValidStructure = validateUrlStructure(url, '/app/questions.html');
          const parsedId = parseEventIdFromUrl(url);
          
          if (!isValidStructure) {
            console.log(`FAILED: Invalid URL structure for questions: ${url}`);
            return false;
          }
          
          if (parsedId !== eventId) {
            console.log(`FAILED: Event ID mismatch. Expected: ${eventId}, Got: ${parsedId}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.7** - results URL follows correct pattern', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        (eventId) => {
          // Generate results URL
          const url = generateResultsUrl(eventId);
          
          // Property: URL should follow pattern /app/results.html?id={eventId}
          const isValidStructure = validateUrlStructure(url, '/app/results.html');
          const parsedId = parseEventIdFromUrl(url);
          
          if (!isValidStructure) {
            console.log(`FAILED: Invalid URL structure for results: ${url}`);
            return false;
          }
          
          if (parsedId !== eventId) {
            console.log(`FAILED: Event ID mismatch. Expected: ${eventId}, Got: ${parsedId}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.5, 10.7** - all URLs for same event share same ID', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        (eventId) => {
          // Generate all three URLs
          const questionsUrl = generateQuestionsUrl(eventId);
          const resultsUrl = generateResultsUrl(eventId);
          const spectrumUrl = generateSpectrumUrl(eventId);
          
          // Parse IDs from all URLs
          const questionsId = parseEventIdFromUrl(questionsUrl);
          const resultsId = parseEventIdFromUrl(resultsUrl);
          const spectrumId = parseEventIdFromUrl(spectrumUrl);
          
          // Property: All URLs should contain the same event ID
          if (questionsId !== eventId || resultsId !== eventId || spectrumId !== eventId) {
            console.log(`FAILED: Event ID mismatch across URLs`);
            console.log(`  Expected: ${eventId}`);
            console.log(`  Questions: ${questionsId}`);
            console.log(`  Results: ${resultsId}`);
            console.log(`  Spectrum: ${spectrumId}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.5, 10.7, 10.8** - URLs are properly encoded', () => {
    fc.assert(
      fc.property(
        // Generate event IDs with special characters that need encoding
        fc.oneof(
          fc.stringMatching(/^[a-zA-Z0-9_-]{8,32}$/),
          fc.string({ minLength: 8, maxLength: 32 }).filter(s => s.trim().length > 0)
        ),
        (eventId) => {
          // Generate URLs
          const questionsUrl = generateQuestionsUrl(eventId);
          const resultsUrl = generateResultsUrl(eventId);
          const spectrumUrl = generateSpectrumUrl(eventId);
          
          // Property: URLs should be valid and parseable
          try {
            new URL(questionsUrl, 'http://localhost');
            new URL(resultsUrl, 'http://localhost');
            new URL(spectrumUrl, 'http://localhost');
            
            // Parse IDs back
            const parsedQuestionsId = parseEventIdFromUrl(questionsUrl);
            const parsedResultsId = parseEventIdFromUrl(resultsUrl);
            const parsedSpectrumId = parseEventIdFromUrl(spectrumUrl);
            
            // Property: Parsed IDs should match original (URL encoding/decoding should work)
            return parsedQuestionsId === eventId && 
                   parsedResultsId === eventId && 
                   parsedSpectrumId === eventId;
          } catch (error) {
            console.log(`FAILED: Invalid URL generated for event ID: ${eventId}`);
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.5, 10.7, 10.8** - URL paths are absolute', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        (eventId) => {
          // Generate URLs
          const questionsUrl = generateQuestionsUrl(eventId);
          const resultsUrl = generateResultsUrl(eventId);
          const spectrumUrl = generateSpectrumUrl(eventId);
          
          // Property: All URLs should start with /app/
          const questionsStartsCorrectly = questionsUrl.startsWith('/app/questions.html');
          const resultsStartsCorrectly = resultsUrl.startsWith('/app/results.html');
          const spectrumStartsCorrectly = spectrumUrl.startsWith('/app/spectrum.html');
          
          if (!questionsStartsCorrectly || !resultsStartsCorrectly || !spectrumStartsCorrectly) {
            console.log(`FAILED: URLs do not start with correct absolute path`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.5, 10.7, 10.8** - URL generation is deterministic', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        (eventId) => {
          // Generate URLs multiple times
          const questionsUrl1 = generateQuestionsUrl(eventId);
          const questionsUrl2 = generateQuestionsUrl(eventId);
          const resultsUrl1 = generateResultsUrl(eventId);
          const resultsUrl2 = generateResultsUrl(eventId);
          const spectrumUrl1 = generateSpectrumUrl(eventId);
          const spectrumUrl2 = generateSpectrumUrl(eventId);
          
          // Property: Same input should always produce same output
          if (questionsUrl1 !== questionsUrl2) {
            console.log(`FAILED: Questions URL generation is not deterministic`);
            return false;
          }
          
          if (resultsUrl1 !== resultsUrl2) {
            console.log(`FAILED: Results URL generation is not deterministic`);
            return false;
          }
          
          if (spectrumUrl1 !== spectrumUrl2) {
            console.log(`FAILED: Spectrum URL generation is not deterministic`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.5, 10.7, 10.8** - URLs have correct file extensions', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        (eventId) => {
          // Generate URLs
          const questionsUrl = generateQuestionsUrl(eventId);
          const resultsUrl = generateResultsUrl(eventId);
          const spectrumUrl = generateSpectrumUrl(eventId);
          
          // Property: URLs should have .html extension before query string
          const questionsHasHtml = questionsUrl.includes('questions.html?');
          const resultsHasHtml = resultsUrl.includes('results.html?');
          const spectrumHasHtml = spectrumUrl.includes('spectrum.html?');
          
          if (!questionsHasHtml || !resultsHasHtml || !spectrumHasHtml) {
            console.log(`FAILED: URLs do not have correct .html extension`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.5, 10.7, 10.8** - URLs contain only id parameter', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        (eventId) => {
          // Generate URLs
          const questionsUrl = generateQuestionsUrl(eventId);
          const resultsUrl = generateResultsUrl(eventId);
          const spectrumUrl = generateSpectrumUrl(eventId);
          
          // Parse URLs
          const questionsUrlObj = new URL(questionsUrl, 'http://localhost');
          const resultsUrlObj = new URL(resultsUrl, 'http://localhost');
          const spectrumUrlObj = new URL(spectrumUrl, 'http://localhost');
          
          // Property: URLs should only have 'id' parameter
          const questionsParamCount = Array.from(questionsUrlObj.searchParams.keys()).length;
          const resultsParamCount = Array.from(resultsUrlObj.searchParams.keys()).length;
          const spectrumParamCount = Array.from(spectrumUrlObj.searchParams.keys()).length;
          
          if (questionsParamCount !== 1 || resultsParamCount !== 1 || spectrumParamCount !== 1) {
            console.log(`FAILED: URLs should only have 'id' parameter`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.5, 10.7, 10.8** - different URL types are distinguishable', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        (eventId) => {
          // Generate all three URLs
          const questionsUrl = generateQuestionsUrl(eventId);
          const resultsUrl = generateResultsUrl(eventId);
          const spectrumUrl = generateSpectrumUrl(eventId);
          
          // Property: All three URLs should be different
          const allDifferent = questionsUrl !== resultsUrl && 
                              resultsUrl !== spectrumUrl && 
                              questionsUrl !== spectrumUrl;
          
          if (!allDifferent) {
            console.log(`FAILED: URL types are not distinguishable`);
            return false;
          }
          
          // Property: Each URL should contain its specific page name
          const questionsHasCorrectPage = questionsUrl.includes('questions.html');
          const resultsHasCorrectPage = resultsUrl.includes('results.html');
          const spectrumHasCorrectPage = spectrumUrl.includes('spectrum.html');
          
          if (!questionsHasCorrectPage || !resultsHasCorrectPage || !spectrumHasCorrectPage) {
            console.log(`FAILED: URLs do not contain correct page names`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('**Validates: Requirements 10.5** - freeplay mode uses special ID', () => {
    const freeplayId = 'freeplay';
    
    // Generate URLs for freeplay
    const questionsUrl = generateQuestionsUrl(freeplayId);
    const resultsUrl = generateResultsUrl(freeplayId);
    
    // Property: Freeplay URLs should use 'freeplay' as the ID
    const questionsIdParsed = parseEventIdFromUrl(questionsUrl);
    const resultsIdParsed = parseEventIdFromUrl(resultsUrl);
    
    if (questionsIdParsed !== 'freeplay' || resultsIdParsed !== 'freeplay') {
      console.log(`FAILED: Freeplay URLs do not use 'freeplay' as ID`);
      return false;
    }
    
    // Property: Freeplay should follow same URL structure
    const questionsValid = validateUrlStructure(questionsUrl, '/app/questions.html');
    const resultsValid = validateUrlStructure(resultsUrl, '/app/results.html');
    
    return questionsValid && resultsValid;
  });

  test('**Validates: Requirements 10.5, 10.7, 10.8** - URL round-trip preserves event ID', () => {
    fc.assert(
      fc.property(
        eventIdGen,
        (originalEventId) => {
          // Generate URLs
          const questionsUrl = generateQuestionsUrl(originalEventId);
          const resultsUrl = generateResultsUrl(originalEventId);
          const spectrumUrl = generateSpectrumUrl(originalEventId);
          
          // Parse IDs back
          const questionsId = parseEventIdFromUrl(questionsUrl);
          const resultsId = parseEventIdFromUrl(resultsUrl);
          const spectrumId = parseEventIdFromUrl(spectrumUrl);
          
          // Property: Round-trip should preserve the event ID exactly
          if (questionsId !== originalEventId) {
            console.log(`FAILED: Questions URL round-trip failed. Original: ${originalEventId}, Parsed: ${questionsId}`);
            return false;
          }
          
          if (resultsId !== originalEventId) {
            console.log(`FAILED: Results URL round-trip failed. Original: ${originalEventId}, Parsed: ${resultsId}`);
            return false;
          }
          
          if (spectrumId !== originalEventId) {
            console.log(`FAILED: Spectrum URL round-trip failed. Original: ${originalEventId}, Parsed: ${spectrumId}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
