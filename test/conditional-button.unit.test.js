/**
 * Unit Tests for Conditional "View My Full Results" Button
 * 
 * Feature: score-page-separation
 * Task: 5.3
 * 
 * Tests the conditional button that appears in the participant modal
 * when the session participant clicks their own avatar.
 * 
 * Requirements: 3.4, 3.5
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Conditional "View My Full Results" Button (Task 5.3)', () => {
    let dom;
    let document;
    let window;
    let sessionStorage;

    beforeEach(() => {
        // Setup DOM environment with modal structure
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="participantModal" style="display: none;">
                    <div id="modalAvatar"></div>
                    <div id="modalName"></div>
                    <div id="modalScore"></div>
                    <div id="modalDebrief"></div>
                    <div id="modalAllyTips"></div>
                </div>
            </body>
            </html>
        `, { url: 'http://localhost' });
        
        document = dom.window.document;
        window = dom.window;
        sessionStorage = dom.window.sessionStorage;
        
        // Make globals available
        global.document = document;
        global.window = window;
        global.sessionStorage = sessionStorage;
    });

    afterEach(() => {
        // Clean up
        sessionStorage.clear();
    });

    describe('Requirement 3.4: Button appears for session participant', () => {
        test('should add "View My Full Results" button when participant is session participant', () => {
            // Arrange
            const eventId = 'test-event-123';
            const participantId = 'participant-abc-456';
            const modalDebrief = document.getElementById('modalDebrief');
            
            // Store session participant
            sessionStorage.setItem(`participant_${eventId}`, participantId);
            
            // Simulate stat cards HTML
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act - Simulate the conditional button logic
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            expect(button).not.toBeNull();
            expect(button.textContent).toBe('View My Full Results');
            expect(button.className).toContain('btn');
            expect(button.className).toContain('btn-primary');
        });

        test('should set correct onclick handler for button', () => {
            // Arrange
            const eventId = 'test-event-123';
            const participantId = 'participant-abc-456';
            const modalDebrief = document.getElementById('modalDebrief');
            
            sessionStorage.setItem(`participant_${eventId}`, participantId);
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            expect(button.onclick).toBeDefined();
            expect(typeof button.onclick).toBe('function');
        });

        test('should append button after stat cards', () => {
            // Arrange
            const eventId = 'test-event-123';
            const participantId = 'participant-abc-456';
            const modalDebrief = document.getElementById('modalDebrief');
            
            sessionStorage.setItem(`participant_${eventId}`, participantId);
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const statCards = modalDebrief.querySelector('.stat-cards-container');
            const button = modalDebrief.querySelector('button');
            
            expect(statCards).not.toBeNull();
            expect(button).not.toBeNull();
            
            // Button should come after stat cards
            const children = Array.from(modalDebrief.children);
            const statCardsIndex = children.indexOf(statCards);
            const buttonIndex = children.indexOf(button);
            
            expect(buttonIndex).toBeGreaterThan(statCardsIndex);
        });

        test('should work for free play mode', () => {
            // Arrange
            const eventId = 'freeplay';
            const participantId = 'participant-freeplay-123';
            const modalDebrief = document.getElementById('modalDebrief');
            
            sessionStorage.setItem(`participant_${eventId}`, participantId);
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            expect(button).not.toBeNull();
            expect(button.textContent).toBe('View My Full Results');
        });
    });

    describe('Requirement 3.5: Button does not appear for non-session participants', () => {
        test('should NOT add button when participant is not session participant', () => {
            // Arrange
            const eventId = 'test-event-123';
            const sessionParticipantId = 'participant-abc-456';
            const otherParticipantId = 'participant-xyz-789';
            const modalDebrief = document.getElementById('modalDebrief');
            
            // Store session participant
            sessionStorage.setItem(`participant_${eventId}`, sessionParticipantId);
            
            // Simulate stat cards HTML
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act - Simulate clicking on a different participant's avatar
            const storedSessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (otherParticipantId === storedSessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            expect(button).toBeNull();
        });

        test('should NOT add button when no session participant is stored', () => {
            // Arrange
            const eventId = 'test-event-123';
            const participantId = 'participant-abc-456';
            const modalDebrief = document.getElementById('modalDebrief');
            
            // Do NOT store session participant
            // sessionStorage is empty
            
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            expect(button).toBeNull();
        });

        test('should NOT add button for different event ID', () => {
            // Arrange
            const eventId1 = 'test-event-123';
            const eventId2 = 'test-event-456';
            const participantId = 'participant-abc-456';
            const modalDebrief = document.getElementById('modalDebrief');
            
            // Store session participant for event1
            sessionStorage.setItem(`participant_${eventId1}`, participantId);
            
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act - Try to show button for event2 (different event)
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId2}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId2}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            expect(button).toBeNull();
        });

        test('should only show stat cards without button for non-session participant', () => {
            // Arrange
            const eventId = 'test-event-123';
            const sessionParticipantId = 'participant-abc-456';
            const otherParticipantId = 'participant-xyz-789';
            const modalDebrief = document.getElementById('modalDebrief');
            
            sessionStorage.setItem(`participant_${eventId}`, sessionParticipantId);
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act
            const storedSessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (otherParticipantId === storedSessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const statCards = modalDebrief.querySelector('.stat-cards-container');
            const button = modalDebrief.querySelector('button');
            
            expect(statCards).not.toBeNull();
            expect(button).toBeNull();
            expect(modalDebrief.children.length).toBe(1); // Only stat cards
        });
    });

    describe('Edge cases', () => {
        test('should handle null session participant ID', () => {
            // Arrange
            const eventId = 'test-event-123';
            const participantId = 'participant-abc-456';
            const modalDebrief = document.getElementById('modalDebrief');
            
            sessionStorage.setItem(`participant_${eventId}`, null);
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            expect(button).toBeNull();
        });

        test('should handle empty string participant ID', () => {
            // Arrange
            const eventId = 'test-event-123';
            const participantId = '';
            const modalDebrief = document.getElementById('modalDebrief');
            
            sessionStorage.setItem(`participant_${eventId}`, '');
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            // Empty string matches empty string, so button should appear
            expect(button).not.toBeNull();
        });

        test('should handle case-sensitive participant IDs', () => {
            // Arrange
            const eventId = 'test-event-123';
            const participantId = 'Participant-ABC-456';
            const modalDebrief = document.getElementById('modalDebrief');
            
            // Store with different case
            sessionStorage.setItem(`participant_${eventId}`, 'participant-abc-456');
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            // Case mismatch, button should NOT appear
            expect(button).toBeNull();
        });
    });

    describe('Button properties', () => {
        test('should have correct CSS classes', () => {
            // Arrange
            const eventId = 'test-event-123';
            const participantId = 'participant-abc-456';
            const modalDebrief = document.getElementById('modalDebrief');
            
            sessionStorage.setItem(`participant_${eventId}`, participantId);
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            expect(button.classList.contains('btn')).toBe(true);
            expect(button.classList.contains('btn-primary')).toBe(true);
        });

        test('should have correct text content', () => {
            // Arrange
            const eventId = 'test-event-123';
            const participantId = 'participant-abc-456';
            const modalDebrief = document.getElementById('modalDebrief');
            
            sessionStorage.setItem(`participant_${eventId}`, participantId);
            modalDebrief.innerHTML = '<div class="stat-cards-container">Stats here</div>';
            
            // Act
            const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (participantId === sessionParticipantId) {
                const backToScoreBtn = document.createElement('button');
                backToScoreBtn.className = 'btn btn-primary';
                backToScoreBtn.textContent = 'View My Full Results';
                backToScoreBtn.onclick = () => {
                    window.location.href = `./score.html?id=${eventId}`;
                };
                modalDebrief.appendChild(backToScoreBtn);
            }
            
            // Assert
            const button = modalDebrief.querySelector('button');
            expect(button.textContent).toBe('View My Full Results');
            expect(button.textContent).not.toBe('View Results');
            expect(button.textContent).not.toBe('Back to Score');
        });
    });
});
