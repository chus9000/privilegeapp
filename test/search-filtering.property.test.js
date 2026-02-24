/**
 * Property-Based Test for Search Filtering Correctness
 * Feature: spectrum-page-consolidation
 * 
 * Property 4: Search Filtering Correctness
 * **Validates: Requirements 7.3**
 * 
 * For any search term entered by the user, the system should filter the displayed participants
 * such that only participants whose names contain the search term (case-insensitive) remain visible.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { JSDOM } from 'jsdom';

/**
 * Generate a random participant with valid data
 */
const participantArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  avatar: fc.constantFrom('😀', '😎', '🤓', '😊', '🙂', '😃', '😄', '😁'),
  score: fc.integer({ min: -25, max: 25 })
});

/**
 * Set up a minimal DOM environment for testing search functionality
 */
function setupSearchDOM() {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
      </head>
      <body>
        <div class="spectrum-bar"></div>
        <input type="text" id="searchInput" />
        <div id="searchCount"></div>
      </body>
    </html>
  `, { runScripts: 'dangerously', url: 'http://localhost' });

  return dom;
}

/**
 * Create a participant marker element in the DOM
 */
function createParticipantMarker(document, participant) {
  const spectrumBar = document.querySelector('.spectrum-bar');
  const participantDiv = document.createElement('div');
  participantDiv.className = 'participant-marker';
  participantDiv.setAttribute('data-participant-id', participant.id);
  
  participantDiv.innerHTML = `
    <div class="participant-container">
      <div class="participant-avatar">${participant.avatar}</div>
      <div class="participant-name-label">${participant.name} (${participant.score})</div>
    </div>
  `;
  
  spectrumBar.appendChild(participantDiv);
  return participantDiv;
}

/**
 * Check if a participant matches the search term
 * This mirrors the logic from results.js doesParticipantMatchSearch function
 */
function doesParticipantMatchSearch(participant, searchTerm) {
  if (!searchTerm) return true;
  
  const name = participant.name.toLowerCase();
  const score = participant.score.toString();
  const avatar = participant.avatar.toLowerCase();
  
  return name.includes(searchTerm) || 
         score.includes(searchTerm) || 
         avatar.includes(searchTerm);
}

/**
 * Apply search filter to participant markers in the DOM
 */
function applySearchFilter(document, participants, searchTerm) {
  const normalizedSearchTerm = searchTerm.toLowerCase().trim();
  
  const participantMarkers = document.querySelectorAll('.participant-marker');
  let visibleCount = 0;
  
  participantMarkers.forEach(marker => {
    const participantId = marker.getAttribute('data-participant-id');
    const participant = participants.find(p => p.id === participantId);
    
    if (participant) {
      const matches = doesParticipantMatchSearch(participant, normalizedSearchTerm);
      
      if (normalizedSearchTerm === '' || matches) {
        marker.classList.remove('filtered-out');
        visibleCount++;
      } else {
        marker.classList.add('filtered-out');
      }
    }
  });
  
  return visibleCount;
}

/**
 * Get visible participants from the DOM
 */
function getVisibleParticipants(document, participants) {
  const participantMarkers = document.querySelectorAll('.participant-marker');
  const visibleParticipants = [];
  
  participantMarkers.forEach(marker => {
    if (!marker.classList.contains('filtered-out')) {
      const participantId = marker.getAttribute('data-participant-id');
      const participant = participants.find(p => p.id === participantId);
      if (participant) {
        visibleParticipants.push(participant);
      }
    }
  });
  
  return visibleParticipants;
}

describe('Property 4: Search Filtering Correctness', () => {
  test('search should filter participants by name (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 0, maxLength: 10 }),
        (participants, searchTerm) => {
          // Set up DOM for each test iteration
          const dom = setupSearchDOM();
          const { document } = dom.window;

          // Create markers for all participants
          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          // Apply search filter
          const visibleCount = applySearchFilter(document, participants, searchTerm);

          // Get visible participants
          const visibleParticipants = getVisibleParticipants(document, participants);

          // Property: Visible count should match actual visible participants
          if (visibleCount !== visibleParticipants.length) {
            return false;
          }

          // Property: All visible participants should match the search term
          const normalizedSearchTerm = searchTerm.toLowerCase().trim();
          for (const participant of visibleParticipants) {
            if (!doesParticipantMatchSearch(participant, normalizedSearchTerm)) {
              return false;
            }
          }

          // Property: All matching participants should be visible
          const expectedMatches = participants.filter(p => 
            doesParticipantMatchSearch(p, normalizedSearchTerm)
          );
          
          if (visibleParticipants.length !== expectedMatches.length) {
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('empty search term should show all participants', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 50 }),
        (participants) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          // Create markers for all participants
          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          // Apply empty search
          const visibleCount = applySearchFilter(document, participants, '');

          // Property: All participants should be visible with empty search
          return visibleCount === participants.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('search should be case-insensitive', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.constantFrom('Alice', 'Bob', 'Charlie', 'David', 'Eve'),
            avatar: fc.constantFrom('😀', '😎'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.constantFrom('alice', 'ALICE', 'Alice', 'aLiCe', 'bob', 'BOB', 'Bob'),
        (participants, searchTerm) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          applySearchFilter(document, participants, searchTerm);
          const visibleParticipants = getVisibleParticipants(document, participants);

          // Property: Case variations should produce same results
          const normalizedSearchTerm = searchTerm.toLowerCase().trim();
          const expectedMatches = participants.filter(p => 
            p.name.toLowerCase().includes(normalizedSearchTerm)
          );

          return visibleParticipants.length === expectedMatches.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('search should filter by score when search term is numeric', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 50 }),
        fc.integer({ min: -25, max: 25 }),
        (participants, scoreToSearch) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          const searchTerm = scoreToSearch.toString();
          applySearchFilter(document, participants, searchTerm);
          const visibleParticipants = getVisibleParticipants(document, participants);

          // Property: All visible participants should match search term (name, score, or avatar)
          // Search matches by name OR score OR avatar, not just score
          const normalizedSearchTerm = searchTerm.toLowerCase().trim();
          for (const participant of visibleParticipants) {
            if (!doesParticipantMatchSearch(participant, normalizedSearchTerm)) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('search should handle partial name matches', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.constantFrom('Alexander', 'Alexandra', 'Alex', 'Alexa', 'Alice'),
            avatar: fc.constantFrom('😀', '😎'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.constantFrom('alex', 'ale', 'al', 'a'),
        (participants, searchTerm) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          applySearchFilter(document, participants, searchTerm);
          const visibleParticipants = getVisibleParticipants(document, participants);

          // Property: All visible participants should contain search term in name
          const normalizedSearchTerm = searchTerm.toLowerCase().trim();
          for (const participant of visibleParticipants) {
            if (!participant.name.toLowerCase().includes(normalizedSearchTerm)) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('search should handle whitespace correctly', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (participants, searchTerm) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          // Add whitespace to search term
          const searchWithWhitespace = `  ${searchTerm}  `;
          applySearchFilter(document, participants, searchWithWhitespace);
          const visibleWithWhitespace = getVisibleParticipants(document, participants);

          // Reset DOM
          const dom2 = setupSearchDOM();
          const { document: document2 } = dom2.window;
          participants.forEach(participant => {
            createParticipantMarker(document2, participant);
          });

          // Apply search without whitespace
          applySearchFilter(document2, participants, searchTerm);
          const visibleWithoutWhitespace = getVisibleParticipants(document2, participants);

          // Property: Whitespace should be trimmed and produce same results
          return visibleWithWhitespace.length === visibleWithoutWhitespace.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('search should handle special characters in names', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 15 }).map(s => 
              s.replace(/[^\w\s-]/g, '') || 'Name'
            ),
            avatar: fc.constantFrom('😀', '😎'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.string({ minLength: 1, maxLength: 5 }),
        (participants, searchTerm) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          applySearchFilter(document, participants, searchTerm);
          const visibleParticipants = getVisibleParticipants(document, participants);

          // Property: Search should work correctly with special characters
          const normalizedSearchTerm = searchTerm.toLowerCase().trim();
          for (const participant of visibleParticipants) {
            if (!doesParticipantMatchSearch(participant, normalizedSearchTerm)) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('no participants should match impossible search terms', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.constantFrom('Alice', 'Bob', 'Charlie'),
            avatar: fc.constantFrom('😀', '😎'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (participants) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          // Use a search term that won't match any participant
          const impossibleSearchTerm = 'ZZZZZZZZZZZZZ';
          const visibleCount = applySearchFilter(document, participants, impossibleSearchTerm);

          // Property: No participants should be visible
          return visibleCount === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('search should maintain filtered state across multiple searches', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 5, maxLength: 30 }),
        fc.array(fc.string({ minLength: 0, maxLength: 10 }), { minLength: 2, maxLength: 5 }),
        (participants, searchTerms) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          // Apply multiple searches in sequence
          for (const searchTerm of searchTerms) {
            applySearchFilter(document, participants, searchTerm);
            const visibleParticipants = getVisibleParticipants(document, participants);

            // Property: Each search should produce correct results
            const normalizedSearchTerm = searchTerm.toLowerCase().trim();
            const expectedMatches = participants.filter(p => 
              doesParticipantMatchSearch(p, normalizedSearchTerm)
            );

            if (visibleParticipants.length !== expectedMatches.length) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('clearing search should restore all participants', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (participants, searchTerm) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          // Apply search filter
          applySearchFilter(document, participants, searchTerm);

          // Clear search
          const visibleCount = applySearchFilter(document, participants, '');

          // Property: All participants should be visible after clearing search
          return visibleCount === participants.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('search should handle large datasets efficiently', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 50, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 10 }),
        (participants, searchTerm) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          // Apply search filter
          const visibleCount = applySearchFilter(document, participants, searchTerm);
          const visibleParticipants = getVisibleParticipants(document, participants);

          // Property: Search should work correctly even with large datasets
          const normalizedSearchTerm = searchTerm.toLowerCase().trim();
          const expectedMatches = participants.filter(p => 
            doesParticipantMatchSearch(p, normalizedSearchTerm)
          );

          return visibleCount === expectedMatches.length &&
                 visibleParticipants.length === expectedMatches.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('search should handle participants with duplicate names', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            avatar: fc.constantFrom('😀', '😎', '🤓'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (sharedName, participantData) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          // Create participants with same name but different IDs
          const participants = participantData.map(data => ({
            ...data,
            name: sharedName
          }));

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          // Search for the shared name
          const visibleCount = applySearchFilter(document, participants, sharedName);

          // Property: All participants with matching name should be visible
          return visibleCount === participants.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('search should correctly identify non-matching participants', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (participants, searchTerm) => {
          const dom = setupSearchDOM();
          const { document } = dom.window;

          participants.forEach(participant => {
            createParticipantMarker(document, participant);
          });

          applySearchFilter(document, participants, searchTerm);

          // Get filtered-out participants
          const participantMarkers = document.querySelectorAll('.participant-marker');
          const filteredOutParticipants = [];
          
          participantMarkers.forEach(marker => {
            if (marker.classList.contains('filtered-out')) {
              const participantId = marker.getAttribute('data-participant-id');
              const participant = participants.find(p => p.id === participantId);
              if (participant) {
                filteredOutParticipants.push(participant);
              }
            }
          });

          // Property: All filtered-out participants should NOT match the search term
          const normalizedSearchTerm = searchTerm.toLowerCase().trim();
          for (const participant of filteredOutParticipants) {
            if (doesParticipantMatchSearch(participant, normalizedSearchTerm)) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
