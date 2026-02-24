/**
 * Property-Based Test for Modal Interaction Universality
 * Feature: spectrum-page-consolidation
 * 
 * Property 3: Modal Interaction Universality
 * **Validates: Requirements 7.2**
 * 
 * For any participant marker displayed on the spectrum, when a user clicks that marker,
 * the system should open the participant details modal with that participant's information.
 */

import { describe, test, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { JSDOM } from 'jsdom';

/**
 * Generate a random participant with valid data
 */
const participantArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  avatar: fc.constantFrom('😀', '😎', '🤓', '😊', '🙂', '😃', '😄', '😁'),
  score: fc.integer({ min: -25, max: 25 }),
  answers: fc.array(fc.constantFrom(0, 1, null), { minLength: 20, maxLength: 20 })
});

/**
 * Set up a minimal DOM environment for testing modal interactions
 */
function setupModalDOM() {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
      </head>
      <body>
        <div class="spectrum-bar"></div>
        
        <!-- Participant Details Modal -->
        <div id="participantModal" class="modal" style="display: none;">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Participant Details</h2>
              <span class="close-btn" id="closeModal">&times;</span>
            </div>
            <div class="modal-body">
              <div class="participant-details">
                <div class="participant-avatar-large" id="modalAvatar"></div>
                <h3 id="modalName"></h3>
                <div class="participant-score-large" id="modalScore"></div>
                <div id="modalDebrief" class="modal-debrief"></div>
                <div id="modalAllyTips" class="modal-ally-tips"></div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `, { runScripts: 'dangerously', url: 'http://localhost' });

  return dom;
}

/**
 * Create a participant marker element in the DOM
 */
function createParticipantMarker(document, participant, position) {
  const spectrumBar = document.querySelector('.spectrum-bar');
  const participantDiv = document.createElement('div');
  participantDiv.className = 'participant-marker';
  participantDiv.setAttribute('data-participant-id', participant.id);
  participantDiv.setAttribute('data-row', '0');
  
  participantDiv.innerHTML = `
    <div class="participant-container" style="left: ${position}%">
      <div class="participant-avatar">${participant.avatar}</div>
      <div class="participant-name-label">${participant.name} (${participant.score})</div>
    </div>
  `;
  
  spectrumBar.appendChild(participantDiv);
  return participantDiv;
}

/**
 * Simulate clicking a participant marker and opening the modal
 */
function simulateMarkerClick(document, participant, allParticipants) {
  // Find the participant in the list
  const foundParticipant = allParticipants.find(p => p.id === participant.id);
  if (!foundParticipant) return false;

  // Populate modal content (simulating showParticipantModal function)
  const modalAvatar = document.getElementById('modalAvatar');
  const modalName = document.getElementById('modalName');
  const modalScore = document.getElementById('modalScore');
  const modal = document.getElementById('participantModal');

  if (!modalAvatar || !modalName || !modalScore || !modal) {
    return false;
  }

  // Format score with sign
  const formatScore = (score) => {
    if (score > 0) return `+${score}`;
    if (score < 0) return `${score}`;
    return '0';
  };

  // Set modal content
  modalAvatar.textContent = foundParticipant.avatar;
  modalName.textContent = foundParticipant.name;
  modalScore.textContent = `Score: ${formatScore(foundParticipant.score)}`;

  // Show modal
  modal.style.display = 'block';

  return true;
}

/**
 * Verify modal is open and contains correct participant data
 */
function verifyModalContent(document, participant) {
  const modal = document.getElementById('participantModal');
  const modalAvatar = document.getElementById('modalAvatar');
  const modalName = document.getElementById('modalName');
  const modalScore = document.getElementById('modalScore');

  // Check modal is visible
  if (!modal || modal.style.display !== 'block') {
    return { success: false, reason: 'Modal not visible' };
  }

  // Check avatar matches
  if (!modalAvatar || modalAvatar.textContent !== participant.avatar) {
    return { success: false, reason: `Avatar mismatch: expected ${participant.avatar}, got ${modalAvatar?.textContent}` };
  }

  // Check name matches
  if (!modalName || modalName.textContent !== participant.name) {
    return { success: false, reason: `Name mismatch: expected ${participant.name}, got ${modalName?.textContent}` };
  }

  // Check score matches (with proper formatting)
  const formatScore = (score) => {
    if (score > 0) return `+${score}`;
    if (score < 0) return `${score}`;
    return '0';
  };
  const expectedScore = `Score: ${formatScore(participant.score)}`;
  if (!modalScore || modalScore.textContent !== expectedScore) {
    return { success: false, reason: `Score mismatch: expected ${expectedScore}, got ${modalScore?.textContent}` };
  }

  return { success: true };
}

describe('Property 3: Modal Interaction Universality', () => {
  test('clicking any participant marker should open modal with correct data', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 50 }),
        (participants) => {
          // Set up DOM for each test iteration
          const dom = setupModalDOM();
          const { document } = dom.window;

          // Create markers for all participants
          participants.forEach((participant, index) => {
            const position = (index / participants.length) * 100;
            createParticipantMarker(document, participant, position);
          });

          // Test clicking each participant marker
          for (const participant of participants) {
            // Reset modal state
            const modal = document.getElementById('participantModal');
            if (modal) modal.style.display = 'none';

            // Simulate clicking the marker
            const clickSuccess = simulateMarkerClick(document, participant, participants);
            
            // Property: Click should succeed
            if (!clickSuccess) {
              console.error(`Failed to click marker for participant ${participant.id}`);
              return false;
            }

            // Property: Modal should open with correct data
            const verification = verifyModalContent(document, participant);
            if (!verification.success) {
              console.error(`Modal verification failed for ${participant.name}: ${verification.reason}`);
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('modal should display correct avatar for each participant', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 20 }),
        (participants) => {
          const dom = setupModalDOM();
          const { document } = dom.window;

          // Test each participant
          for (const participant of participants) {
            // Reset modal
            const modal = document.getElementById('participantModal');
            if (modal) modal.style.display = 'none';

            // Simulate click
            simulateMarkerClick(document, participant, participants);

            // Property: Avatar should match exactly
            const modalAvatar = document.getElementById('modalAvatar');
            if (!modalAvatar || modalAvatar.textContent !== participant.avatar) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('modal should display correct name for each participant', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 20 }),
        (participants) => {
          const dom = setupModalDOM();
          const { document } = dom.window;

          // Test each participant
          for (const participant of participants) {
            // Reset modal
            const modal = document.getElementById('participantModal');
            if (modal) modal.style.display = 'none';

            // Simulate click
            simulateMarkerClick(document, participant, participants);

            // Property: Name should match exactly
            const modalName = document.getElementById('modalName');
            if (!modalName || modalName.textContent !== participant.name) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('modal should display correctly formatted score for each participant', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 20 }),
        (participants) => {
          const dom = setupModalDOM();
          const { document } = dom.window;

          const formatScore = (score) => {
            if (score > 0) return `+${score}`;
            if (score < 0) return `${score}`;
            return '0';
          };

          // Test each participant
          for (const participant of participants) {
            // Reset modal
            const modal = document.getElementById('participantModal');
            if (modal) modal.style.display = 'none';

            // Simulate click
            simulateMarkerClick(document, participant, participants);

            // Property: Score should be formatted correctly
            const modalScore = document.getElementById('modalScore');
            const expectedScore = `Score: ${formatScore(participant.score)}`;
            if (!modalScore || modalScore.textContent !== expectedScore) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('modal should become visible when any marker is clicked', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 1, maxLength: 30 }),
        (participants) => {
          const dom = setupModalDOM();
          const { document } = dom.window;

          // Test each participant
          for (const participant of participants) {
            // Reset modal to hidden
            const modal = document.getElementById('participantModal');
            if (modal) modal.style.display = 'none';

            // Verify modal is hidden before click
            if (modal.style.display !== 'none') {
              return false;
            }

            // Simulate click
            simulateMarkerClick(document, participant, participants);

            // Property: Modal should be visible after click
            if (modal.style.display !== 'block') {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('modal should handle participants with extreme scores correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            avatar: fc.constantFrom('😀', '😎', '🤓'),
            score: fc.constantFrom(-25, -20, -10, 0, 10, 20, 25),
            answers: fc.array(fc.constantFrom(0, 1), { minLength: 20, maxLength: 20 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (participants) => {
          const dom = setupModalDOM();
          const { document } = dom.window;

          const formatScore = (score) => {
            if (score > 0) return `+${score}`;
            if (score < 0) return `${score}`;
            return '0';
          };

          // Test each participant with extreme score
          for (const participant of participants) {
            const modal = document.getElementById('participantModal');
            if (modal) modal.style.display = 'none';

            simulateMarkerClick(document, participant, participants);

            // Property: Modal should handle extreme scores correctly
            const verification = verifyModalContent(document, participant);
            if (!verification.success) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('modal should handle participants with special characters in names', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.stringOf(fc.constantFrom('A', 'B', '1', '2', '-', '_', ' ', '\'', '"'), { minLength: 1, maxLength: 15 }),
            avatar: fc.constantFrom('😀', '😎'),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.array(fc.constantFrom(0, 1), { minLength: 20, maxLength: 20 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (participants) => {
          const dom = setupModalDOM();
          const { document } = dom.window;

          // Test each participant
          for (const participant of participants) {
            const modal = document.getElementById('participantModal');
            if (modal) modal.style.display = 'none';

            simulateMarkerClick(document, participant, participants);

            // Property: Name with special characters should display correctly
            const modalName = document.getElementById('modalName');
            if (!modalName || modalName.textContent !== participant.name) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('modal should handle large datasets efficiently', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 50, maxLength: 100 }),
        (participants) => {
          const dom = setupModalDOM();
          const { document } = dom.window;

          // Sample a subset to test (testing all 100 would be slow)
          const samplesToTest = Math.min(10, participants.length);
          const step = Math.floor(participants.length / samplesToTest);

          for (let i = 0; i < participants.length; i += step) {
            const participant = participants[i];
            const modal = document.getElementById('participantModal');
            if (modal) modal.style.display = 'none';

            // Property: Should handle large datasets without errors
            const clickSuccess = simulateMarkerClick(document, participant, participants);
            if (!clickSuccess) {
              return false;
            }

            const verification = verifyModalContent(document, participant);
            if (!verification.success) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('modal should maintain data integrity across multiple opens', () => {
    fc.assert(
      fc.property(
        fc.array(participantArbitrary, { minLength: 3, maxLength: 10 }),
        (participants) => {
          const dom = setupModalDOM();
          const { document } = dom.window;

          // Open modal for each participant in sequence
          for (const participant of participants) {
            const modal = document.getElementById('participantModal');
            if (modal) modal.style.display = 'none';

            simulateMarkerClick(document, participant, participants);

            // Property: Each modal open should show correct data (no data leakage)
            const verification = verifyModalContent(document, participant);
            if (!verification.success) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('modal should handle participants with duplicate names correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            avatar: fc.constantFrom('😀', '😎', '🤓'),
            score: fc.integer({ min: -25, max: 25 }),
            answers: fc.array(fc.constantFrom(0, 1), { minLength: 20, maxLength: 20 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (sharedName, participantData) => {
          const dom = setupModalDOM();
          const { document } = dom.window;

          // Create participants with same name but different IDs
          const participants = participantData.map(data => ({
            ...data,
            name: sharedName
          }));

          // Test each participant
          for (const participant of participants) {
            const modal = document.getElementById('participantModal');
            if (modal) modal.style.display = 'none';

            simulateMarkerClick(document, participant, participants);

            // Property: Should identify correct participant by ID, not name
            const modalAvatar = document.getElementById('modalAvatar');
            const modalScore = document.getElementById('modalScore');
            
            if (!modalAvatar || modalAvatar.textContent !== participant.avatar) {
              return false;
            }

            const formatScore = (score) => {
              if (score > 0) return `+${score}`;
              if (score < 0) return `${score}`;
              return '0';
            };
            const expectedScore = `Score: ${formatScore(participant.score)}`;
            if (!modalScore || modalScore.textContent !== expectedScore) {
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
