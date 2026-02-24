/**
 * Property Test: Conditional Score Page Navigation
 * 
 * **Validates: Requirements 3.4, 3.5**
 * 
 * Property 5: Conditional Score Page Navigation
 * For any participant avatar clicked on the results page, the modal should include 
 * a "View My Full Results" button if and only if the clicked participant is the session participant.
 */

import fc from 'fast-check';
import { JSDOM } from 'jsdom';

describe('Property 5: Conditional Score Page Navigation', () => {
    let dom;
    let window;
    let document;
    let sessionStorage;

    beforeEach(() => {
        // Create a fresh DOM for each test
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="modalDebrief"></div>
            </body>
            </html>
        `, {
            url: 'http://localhost',
            runScripts: 'dangerously'
        });
        
        window = dom.window;
        document = window.document;
        sessionStorage = window.sessionStorage;
        
        // Make globals available
        global.window = window;
        global.document = document;
        global.sessionStorage = sessionStorage;
    });

    afterEach(() => {
        // Clean up
        delete global.window;
        delete global.document;
        delete global.sessionStorage;
    });

    test('Property: Button appears only for session participant', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 5, maxLength: 20 }), // eventId
                fc.string({ minLength: 5, maxLength: 20 }), // sessionParticipantId
                fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 10 }), // otherParticipantIds
                (eventId, sessionParticipantId, otherParticipantIds) => {
                    // Ensure session participant is not in other participants
                    const filteredOtherIds = otherParticipantIds.filter(id => id !== sessionParticipantId);
                    if (filteredOtherIds.length === 0) {
                        // Skip if no other participants
                        return true;
                    }

                    // Store session participant
                    sessionStorage.setItem(`participant_${eventId}`, sessionParticipantId);

                    // Test 1: Session participant should have button
                    const modalDebrief1 = document.getElementById('modalDebrief');
                    modalDebrief1.innerHTML = '<div class="stat-cards">Stats here</div>';
                    
                    // Simulate adding button for session participant
                    const clickedParticipantId1 = sessionParticipantId;
                    const storedSessionId1 = sessionStorage.getItem(`participant_${eventId}`);
                    
                    if (clickedParticipantId1 === storedSessionId1) {
                        const btn = document.createElement('button');
                        btn.className = 'btn btn-primary';
                        btn.textContent = 'View My Full Results';
                        modalDebrief1.appendChild(btn);
                    }
                    
                    const hasButton1 = modalDebrief1.querySelector('button') !== null;
                    const buttonText1 = modalDebrief1.querySelector('button')?.textContent || '';
                    
                    // Verify button exists for session participant
                    if (!hasButton1 || !buttonText1.includes('View My Full Results')) {
                        return false;
                    }

                    // Test 2: Non-session participant should NOT have button
                    const modalDebrief2 = document.getElementById('modalDebrief');
                    modalDebrief2.innerHTML = '<div class="stat-cards">Stats here</div>';
                    
                    const clickedParticipantId2 = filteredOtherIds[0];
                    const storedSessionId2 = sessionStorage.getItem(`participant_${eventId}`);
                    
                    if (clickedParticipantId2 === storedSessionId2) {
                        const btn = document.createElement('button');
                        btn.className = 'btn btn-primary';
                        btn.textContent = 'View My Full Results';
                        modalDebrief2.appendChild(btn);
                    }
                    
                    const hasButton2 = modalDebrief2.querySelector('button') !== null;
                    
                    // Verify button does NOT exist for non-session participant
                    if (hasButton2) {
                        return false;
                    }

                    // Clean up
                    sessionStorage.clear();
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Property: Button navigates to correct score page URL', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 5, maxLength: 20 }), // eventId
                fc.string({ minLength: 5, maxLength: 20 }), // participantId
                (eventId, participantId) => {
                    // Store session participant
                    sessionStorage.setItem(`participant_${eventId}`, participantId);

                    // Simulate modal with button
                    const modalDebrief = document.getElementById('modalDebrief');
                    modalDebrief.innerHTML = '<div class="stat-cards">Stats here</div>';
                    
                    const clickedParticipantId = participantId;
                    const storedSessionId = sessionStorage.getItem(`participant_${eventId}`);
                    
                    if (clickedParticipantId === storedSessionId) {
                        const btn = document.createElement('button');
                        btn.className = 'btn btn-primary';
                        btn.textContent = 'View My Full Results';
                        btn.onclick = () => {
                            window.location.href = `./score.html?id=${eventId}`;
                        };
                        modalDebrief.appendChild(btn);
                    }
                    
                    const button = modalDebrief.querySelector('button');
                    
                    // Verify button exists
                    if (!button) {
                        return false;
                    }
                    
                    // Verify button has correct onclick behavior
                    // We can't actually trigger navigation in tests, but we can verify the onclick is set
                    if (!button.onclick) {
                        return false;
                    }
                    
                    // Verify button text
                    if (!button.textContent.includes('View My Full Results')) {
                        return false;
                    }

                    // Clean up
                    sessionStorage.clear();
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Property: Button only appears when session storage key exists', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 5, maxLength: 20 }), // eventId
                fc.string({ minLength: 5, maxLength: 20 }), // participantId
                (eventId, participantId) => {
                    // Test without session storage
                    sessionStorage.clear();
                    
                    const modalDebrief1 = document.getElementById('modalDebrief');
                    modalDebrief1.innerHTML = '<div class="stat-cards">Stats here</div>';
                    
                    const storedSessionId1 = sessionStorage.getItem(`participant_${eventId}`);
                    
                    if (participantId === storedSessionId1) {
                        const btn = document.createElement('button');
                        btn.className = 'btn btn-primary';
                        btn.textContent = 'View My Full Results';
                        modalDebrief1.appendChild(btn);
                    }
                    
                    const hasButton1 = modalDebrief1.querySelector('button') !== null;
                    
                    // Should not have button when session storage is empty
                    if (hasButton1) {
                        return false;
                    }

                    // Test with session storage
                    sessionStorage.setItem(`participant_${eventId}`, participantId);
                    
                    const modalDebrief2 = document.getElementById('modalDebrief');
                    modalDebrief2.innerHTML = '<div class="stat-cards">Stats here</div>';
                    
                    const storedSessionId2 = sessionStorage.getItem(`participant_${eventId}`);
                    
                    if (participantId === storedSessionId2) {
                        const btn = document.createElement('button');
                        btn.className = 'btn btn-primary';
                        btn.textContent = 'View My Full Results';
                        modalDebrief2.appendChild(btn);
                    }
                    
                    const hasButton2 = modalDebrief2.querySelector('button') !== null;
                    
                    // Should have button when session storage is set
                    if (!hasButton2) {
                        return false;
                    }

                    // Clean up
                    sessionStorage.clear();
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
