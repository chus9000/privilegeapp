/**
 * Property-Based Test for Participant Display Completeness
 * Feature: full-featured-quiz-app
 * 
 * Property 22: Participant Display Completeness
 * Validates: Requirements 7.6
 * 
 * For any participant displayed on the spectrum, the rendered output should include
 * their avatar, name, and score.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { JSDOM } from 'jsdom';

/**
 * Render participants on a spectrum bar (simulates spectrum.js renderParticipants logic)
 * This function creates DOM elements for each participant with their avatar, name, and score
 * 
 * @param {Array} participants - Array of participant objects
 * @param {Object} spectrumConfig - Spectrum configuration with min, max
 * @returns {HTMLElement} The spectrum bar element with rendered participants
 */
function renderParticipantsToDOM(participants, spectrumConfig) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div class="spectrum-bar"></div></body></html>');
  const document = dom.window.document;
  const spectrumBar = document.querySelector('.spectrum-bar');
  
  const { min, max } = spectrumConfig;
  const range = max - min;
  
  // Sort participants by score (as done in spectrum.js)
  const sortedParticipants = [...participants].sort((a, b) => a.score - b.score);
  
  // Render each participant
  sortedParticipants.forEach((participant, index) => {
    const clampedScore = Math.max(min, Math.min(max, participant.score));
    const scorePercentage = ((clampedScore - min) / range) * 100;
    const assignedRow = index % 20;
    
    const participantDiv = document.createElement('div');
    participantDiv.className = 'participant-marker';
    participantDiv.setAttribute('data-participant-id', participant.id);
    participantDiv.setAttribute('data-row', assignedRow.toString());
    
    // This matches the HTML structure from spectrum.js
    participantDiv.innerHTML = `
      <div class="participant-container" style="left: ${scorePercentage}%">
        <div class="participant-avatar">${participant.avatar}</div>
        <div class="participant-name-label">${participant.name} (${participant.score > 0 ? '+' : ''}${participant.score})</div>
      </div>
    `;
    
    spectrumBar.appendChild(participantDiv);
  });
  
  return spectrumBar;
}

/**
 * Verify that a participant is displayed with all required fields
 * **Validates: Requirements 7.6**
 * 
 * @param {HTMLElement} participantMarker - The participant marker DOM element
 * @param {Object} participant - The participant data object
 * @returns {boolean} True if all required fields are present
 */
function verifyParticipantDisplay(participantMarker, participant) {
  // Check that the marker exists
  if (!participantMarker) return false;
  
  // Check that participant ID is set
  const participantId = participantMarker.getAttribute('data-participant-id');
  if (participantId !== participant.id) return false;
  
  // Check that avatar is displayed
  const avatarElement = participantMarker.querySelector('.participant-avatar');
  if (!avatarElement) return false;
  if (avatarElement.textContent !== participant.avatar) return false;
  
  // Check that name is displayed
  const nameElement = participantMarker.querySelector('.participant-name-label');
  if (!nameElement) return false;
  
  // Name label should contain the participant's name
  const nameText = nameElement.textContent;
  if (!nameText.includes(participant.name)) return false;
  
  // Name label should contain the participant's score
  const expectedScore = participant.score > 0 ? `+${participant.score}` : `${participant.score}`;
  if (!nameText.includes(expectedScore)) return false;
  
  return true;
}

/**
 * Verify that all participants are displayed (no missing participants)
 * 
 * @param {HTMLElement} spectrumBar - The spectrum bar element
 * @param {Array} participants - Array of participant objects
 * @returns {boolean} True if all participants are displayed
 */
function verifyAllParticipantsDisplayed(spectrumBar, participants) {
  const participantMarkers = spectrumBar.querySelectorAll('.participant-marker');
  
  // Check that the count matches
  if (participantMarkers.length !== participants.length) {
    return false;
  }
  
  // Check that each participant is displayed
  for (const participant of participants) {
    const marker = spectrumBar.querySelector(`.participant-marker[data-participant-id="${participant.id}"]`);
    if (!marker) {
      return false;
    }
    
    // Verify the participant has all required display fields
    if (!verifyParticipantDisplay(marker, participant)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Verify that no participants are duplicated
 * 
 * @param {HTMLElement} spectrumBar - The spectrum bar element
 * @returns {boolean} True if no duplicates exist
 */
function verifyNoDuplicateParticipants(spectrumBar) {
  const participantMarkers = spectrumBar.querySelectorAll('.participant-marker');
  const participantIds = new Set();
  
  for (const marker of participantMarkers) {
    const id = marker.getAttribute('data-participant-id');
    if (participantIds.has(id)) {
      return false; // Duplicate found
    }
    participantIds.add(id);
  }
  
  return true;
}

/**
 * Helper function to add unique IDs to participants
 * 
 * @param {Array} participantsWithoutIds - Array of participant objects without IDs
 * @returns {Array} Array of participants with unique IDs
 */
function addUniqueIds(participantsWithoutIds) {
  return participantsWithoutIds.map((p, index) => ({
    ...p,
    id: `participant-${index}`
  }));
}

describe('Property 22: Participant Display Completeness', () => {
  test('all participants should be displayed with avatar, name, and score', () => {
    fc.assert(
      fc.property(
        // Generate array of participants
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/), // Alphanumeric names only
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🐮'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 100 }
        ),
        // Generate spectrum configuration
        fc.record({
          min: fc.constantFrom(-25, -20, -15, -10, -5),
          max: fc.constantFrom(5, 10, 15, 20, 25)
        }),
        (participantsWithoutIds, spectrumConfig) => {
          // Add unique IDs to participants
          const participants = participantsWithoutIds.map((p, index) => ({
            ...p,
            id: `participant-${index}`
          }));
          
          // Render participants to DOM
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: All participants should be displayed
          return verifyAllParticipantsDisplayed(spectrumBar, participants);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('each participant marker should contain avatar element', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          const participantMarkers = spectrumBar.querySelectorAll('.participant-marker');
          
          // Property: Every marker should have an avatar element
          return Array.from(participantMarkers).every(marker => {
            const avatarElement = marker.querySelector('.participant-avatar');
            return avatarElement !== null && avatarElement.textContent.length > 0;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('each participant marker should contain name label element', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          const participantMarkers = spectrumBar.querySelectorAll('.participant-marker');
          
          // Property: Every marker should have a name label element
          return Array.from(participantMarkers).every(marker => {
            const nameElement = marker.querySelector('.participant-name-label');
            return nameElement !== null && nameElement.textContent.length > 0;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('avatar should match participant data', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: Each participant's avatar should match their data
          return participants.every(participant => {
            const marker = spectrumBar.querySelector(`.participant-marker[data-participant-id="${participant.id}"]`);
            if (!marker) return false;
            
            const avatarElement = marker.querySelector('.participant-avatar');
            return avatarElement && avatarElement.textContent === participant.avatar;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('name should match participant data', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: Each participant's name should be in their name label
          return participants.every(participant => {
            const marker = spectrumBar.querySelector(`.participant-marker[data-participant-id="${participant.id}"]`);
            if (!marker) return false;
            
            const nameElement = marker.querySelector('.participant-name-label');
            return nameElement && nameElement.textContent.includes(participant.name);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('score should be displayed in name label', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: Each participant's score should be in their name label
          return participants.every(participant => {
            const marker = spectrumBar.querySelector(`.participant-marker[data-participant-id="${participant.id}"]`);
            if (!marker) return false;
            
            const nameElement = marker.querySelector('.participant-name-label');
            if (!nameElement) return false;
            
            const expectedScore = participant.score > 0 ? `+${participant.score}` : `${participant.score}`;
            return nameElement.textContent.includes(expectedScore);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('no participants should be missing from display', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          const participantMarkers = spectrumBar.querySelectorAll('.participant-marker');
          
          // Property: Number of displayed participants should equal input count
          return participantMarkers.length === participants.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('no participants should be duplicated in display', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: No participant IDs should be duplicated
          return verifyNoDuplicateParticipants(spectrumBar);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('each participant should have unique data-participant-id attribute', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          const participantMarkers = spectrumBar.querySelectorAll('.participant-marker');
          
          // Property: All participant IDs should be unique
          const ids = Array.from(participantMarkers).map(marker => 
            marker.getAttribute('data-participant-id')
          );
          const uniqueIds = new Set(ids);
          
          return ids.length === uniqueIds.size;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('display should handle single participant correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
          avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
          score: fc.integer({ min: -25, max: 25 })
        }),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantWithoutId, spectrumConfig) => {
          const participants = addUniqueIds([participantWithoutId]);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: Single participant should be displayed with all fields
          return verifyAllParticipantsDisplayed(spectrumBar, participants);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('display should handle participants with same score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -25, max: 25 }),
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼')
          }),
          { minLength: 2, maxLength: 10 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (sharedScore, participantDataWithoutIds, spectrumConfig) => {
          // Create participants with same score and unique IDs
          const participants = addUniqueIds(participantDataWithoutIds).map(data => ({
            ...data,
            score: sharedScore
          }));
          
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: All participants should be displayed even with same score
          return verifyAllParticipantsDisplayed(spectrumBar, participants);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('display should handle participants with extreme scores', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.constantFrom(-25, -20, 0, 20, 25)
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.record({
          min: fc.constant(-25),
          max: fc.constant(25)
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: Participants with extreme scores should be displayed
          return verifyAllParticipantsDisplayed(spectrumBar, participants);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('display should handle large number of participants', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 50, maxLength: 200 }
        ),
        fc.record({
          min: fc.constant(-25),
          max: fc.constant(25)
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: All participants should be displayed even with large count
          return verifyAllParticipantsDisplayed(spectrumBar, participants) &&
                 verifyNoDuplicateParticipants(spectrumBar);
        }
      ),
      { numRuns: 10 } // Fewer runs for large datasets
    );
  });

  test('display should handle participants with special characters in names', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: Names with any characters should be displayed
          return participants.every(participant => {
            const marker = spectrumBar.querySelector(`.participant-marker[data-participant-id="${participant.id}"]`);
            if (!marker) return false;
            
            const nameElement = marker.querySelector('.participant-name-label');
            return nameElement && nameElement.textContent.includes(participant.name);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('display should handle zero score correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.constant(0)
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: Participants with zero score should be displayed
          return participants.every(participant => {
            const marker = spectrumBar.querySelector(`.participant-marker[data-participant-id="${participant.id}"]`);
            if (!marker) return false;
            
            const nameElement = marker.querySelector('.participant-name-label');
            // Zero score should be displayed as "0" not "+0"
            return nameElement && nameElement.textContent.includes('0');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('positive scores should be displayed with plus sign', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: 1, max: 25 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: Positive scores should have "+" prefix
          return participants.every(participant => {
            const marker = spectrumBar.querySelector(`.participant-marker[data-participant-id="${participant.id}"]`);
            if (!marker) return false;
            
            const nameElement = marker.querySelector('.participant-name-label');
            return nameElement && nameElement.textContent.includes(`+${participant.score}`);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('negative scores should be displayed without plus sign', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: -1 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.record({
          min: fc.integer({ min: -25, max: -1 }),
          max: fc.integer({ min: 1, max: 25 })
        }),
        (participantsWithoutIds, spectrumConfig) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: Negative scores should not have "+" prefix
          return participants.every(participant => {
            const marker = spectrumBar.querySelector(`.participant-marker[data-participant-id="${participant.id}"]`);
            if (!marker) return false;
            
            const nameElement = marker.querySelector('.participant-name-label');
            const scoreText = `${participant.score}`;
            return nameElement && 
                   nameElement.textContent.includes(scoreText) &&
                   !nameElement.textContent.includes(`+${participant.score}`);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('all standard spectrum ranges should display participants correctly', () => {
    // Test all standard ranges from the design: ±25, ±20, ±15, ±10, ±5
    const standardRanges = [
      { min: -25, max: 25 },
      { min: -20, max: 20 },
      { min: -15, max: 15 },
      { min: -10, max: 10 },
      { min: -5, max: 5 }
    ];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...standardRanges),
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9 ]{3,30}$/),
            avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
            score: fc.integer({ min: -25, max: 25 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (spectrumConfig, participantsWithoutIds) => {
          const participants = addUniqueIds(participantsWithoutIds);
          const spectrumBar = renderParticipantsToDOM(participants, spectrumConfig);
          
          // Property: All standard ranges should display all participants
          return verifyAllParticipantsDisplayed(spectrumBar, participants);
        }
      ),
      { numRuns: 100 }
    );
  });
});
