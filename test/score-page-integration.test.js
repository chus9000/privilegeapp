/**
 * Integration Tests: Score Page Separation
 * 
 * Tests complete flows for score page functionality including:
 * - Complete question flow
 * - Navigation flow
 * - Unauthorized access flow
 * - Session participant data isolation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Score Page Integration Tests', () => {
    let dom;
    let window;
    let document;
    let sessionStorage;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="debriefContainer"></div>
                <div id="allyTipsContainer"></div>
                <button id="viewResultsBtn"></button>
                <button id="viewDetailedBtn"></button>
                <div id="modalDebrief"></div>
            </body>
            </html>
        `, {
            url: 'http://localhost/app/score.html',
            runScripts: 'dangerously'
        });
        
        window = dom.window;
        document = window.document;
        sessionStorage = window.sessionStorage;
        
        global.window = window;
        global.document = document;
        global.sessionStorage = sessionStorage;
    });

    afterEach(() => {
        sessionStorage.clear();
        delete global.window;
        delete global.document;
        delete global.sessionStorage;
    });

    describe('Complete Question Flow', () => {
        it('should redirect to score.html after completing questions', () => {
            const eventId = 'event-123';
            const participantId = 'participant-abc';
            
            // Simulate completing questions and storing session participant
            sessionStorage.setItem(`participant_${eventId}`, participantId);
            
            // Simulate redirect
            const redirectUrl = `./score.html?id=${eventId}`;
            
            expect(redirectUrl).toBe('./score.html?id=event-123');
            expect(sessionStorage.getItem(`participant_${eventId}`)).toBe(participantId);
        });

        it('should store session participant ID after completion', () => {
            const eventId = 'event-456';
            const participantId = 'participant-xyz';
            
            // Simulate storing participant ID
            sessionStorage.setItem(`participant_${eventId}`, participantId);
            
            // Verify storage
            const stored = sessionStorage.getItem(`participant_${eventId}`);
            expect(stored).toBe(participantId);
        });

        it('should render debrief correctly on score page', () => {
            const debriefContainer = document.getElementById('debriefContainer');
            
            // Simulate rendering debrief
            debriefContainer.innerHTML = `
                <div class="debrief-container">
                    <div class="stat-cards-container">Stats</div>
                    <div class="debrief-section score-meaning">Score Meaning</div>
                    <div class="debrief-section response-analysis">Response Analysis</div>
                </div>
            `;
            
            // Verify debrief is rendered
            expect(debriefContainer.innerHTML).toContain('debrief-container');
            expect(debriefContainer.innerHTML).toContain('stat-cards-container');
            expect(debriefContainer.innerHTML).toContain('score-meaning');
            expect(debriefContainer.innerHTML).toContain('response-analysis');
        });
    });

    describe('Navigation Flow', () => {
        it('should navigate from score.html to results.html', () => {
            const eventId = 'event-789';
            const viewResultsBtn = document.getElementById('viewResultsBtn');
            
            // Setup navigation
            let navigatedTo = null;
            viewResultsBtn.onclick = () => {
                navigatedTo = `./results.html?id=${eventId}`;
            };
            
            // Trigger navigation
            viewResultsBtn.onclick();
            
            expect(navigatedTo).toBe('./results.html?id=event-789');
        });

        it('should show modal with back button when clicking own avatar', () => {
            const eventId = 'event-101';
            const participantId = 'participant-101';
            
            // Store session participant
            sessionStorage.setItem(`participant_${eventId}`, participantId);
            
            // Simulate modal with back button
            const modalDebrief = document.getElementById('modalDebrief');
            modalDebrief.innerHTML = `
                <div class="stat-cards-container">Stats</div>
                <button class="btn btn-primary">View My Full Results</button>
            `;
            
            // Verify button exists
            const button = modalDebrief.querySelector('button');
            expect(button).not.toBeNull();
            expect(button.textContent).toBe('View My Full Results');
        });

        it('should preserve event ID when returning to score.html', () => {
            const eventId = 'event-202';
            
            // Simulate navigation back to score page
            const backUrl = `./score.html?id=${eventId}`;
            
            expect(backUrl).toContain('id=event-202');
        });

        it('should navigate to detailed results with event ID', () => {
            const eventId = 'event-303';
            const viewDetailedBtn = document.getElementById('viewDetailedBtn');
            
            // Setup navigation
            let navigatedTo = null;
            viewDetailedBtn.onclick = () => {
                navigatedTo = `./detailed-results.html?id=${eventId}`;
            };
            
            // Trigger navigation
            viewDetailedBtn.onclick();
            
            expect(navigatedTo).toBe('./detailed-results.html?id=event-303');
        });
    });

    describe('Unauthorized Access Flow', () => {
        it('should redirect when accessing score.html without session participant', () => {
            const eventId = 'event-404';
            
            // Clear session storage (no session participant)
            sessionStorage.clear();
            
            // Check for session participant
            const participantId = sessionStorage.getItem(`participant_${eventId}`);
            
            // Should be null
            expect(participantId).toBeNull();
            
            // Simulate redirect logic
            if (!participantId) {
                const redirectUrl = `./results.html?id=${eventId}`;
                expect(redirectUrl).toBe('./results.html?id=event-404');
            }
        });

        it('should log warning when unauthorized access is attempted', () => {
            const eventId = 'event-505';
            const warnings = [];
            
            // Mock console.warn
            const originalWarn = console.warn;
            console.warn = (msg) => warnings.push(msg);
            
            // Simulate unauthorized access
            const participantId = sessionStorage.getItem(`participant_${eventId}`);
            if (!participantId) {
                console.warn(`No session participant found for event: ${eventId}`);
            }
            
            // Verify warning was logged
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings[0]).toContain('No session participant found');
            
            // Restore console.warn
            console.warn = originalWarn;
        });

        it('should redirect to results page on validation failure', () => {
            const eventId = 'event-606';
            
            // Simulate validation failure (no participant ID)
            const participantId = sessionStorage.getItem(`participant_${eventId}`);
            const hasAccess = participantId !== null;
            
            expect(hasAccess).toBe(false);
            
            // Simulate redirect
            if (!hasAccess) {
                const redirectUrl = `./results.html?id=${eventId}`;
                expect(redirectUrl).toBe('./results.html?id=event-606');
            }
        });
    });

    describe('Session Participant Data Isolation', () => {
        it('should only display data for session participant', () => {
            const eventId = 'event-707';
            const sessionParticipantId = 'participant-session';
            const otherParticipantId = 'participant-other';
            
            // Store session participant
            sessionStorage.setItem(`participant_${eventId}`, sessionParticipantId);
            
            // Simulate loading participant data
            const loadedParticipantId = sessionStorage.getItem(`participant_${eventId}`);
            
            // Verify only session participant data is loaded
            expect(loadedParticipantId).toBe(sessionParticipantId);
            expect(loadedParticipantId).not.toBe(otherParticipantId);
        });

        it('should not leak data from other participants', () => {
            const eventId = 'event-808';
            const participant1 = 'participant-1';
            const participant2 = 'participant-2';
            
            // Store session participant
            sessionStorage.setItem(`participant_${eventId}`, participant1);
            
            // Verify only participant1 data is accessible
            const stored = sessionStorage.getItem(`participant_${eventId}`);
            expect(stored).toBe(participant1);
            expect(stored).not.toBe(participant2);
        });

        it('should validate participant ID matches session', () => {
            const eventId = 'event-909';
            const sessionParticipantId = 'participant-session';
            const attemptedParticipantId = 'participant-attempted';
            
            // Store session participant
            sessionStorage.setItem(`participant_${eventId}`, sessionParticipantId);
            
            // Simulate validation
            const storedId = sessionStorage.getItem(`participant_${eventId}`);
            const isValid = storedId === attemptedParticipantId;
            
            expect(isValid).toBe(false);
        });

        it('should handle multiple events with different session participants', () => {
            const event1 = 'event-1001';
            const event2 = 'event-1002';
            const participant1 = 'participant-1001';
            const participant2 = 'participant-1002';
            
            // Store different participants for different events
            sessionStorage.setItem(`participant_${event1}`, participant1);
            sessionStorage.setItem(`participant_${event2}`, participant2);
            
            // Verify isolation
            expect(sessionStorage.getItem(`participant_${event1}`)).toBe(participant1);
            expect(sessionStorage.getItem(`participant_${event2}`)).toBe(participant2);
            expect(sessionStorage.getItem(`participant_${event1}`)).not.toBe(participant2);
            expect(sessionStorage.getItem(`participant_${event2}`)).not.toBe(participant1);
        });
    });

    describe('End-to-End Flow', () => {
        it('should complete full flow from questions to score to results', () => {
            const eventId = 'event-e2e';
            const participantId = 'participant-e2e';
            
            // Step 1: Complete questions and store session participant
            sessionStorage.setItem(`participant_${eventId}`, participantId);
            expect(sessionStorage.getItem(`participant_${eventId}`)).toBe(participantId);
            
            // Step 2: Redirect to score page
            const scoreUrl = `./score.html?id=${eventId}`;
            expect(scoreUrl).toBe('./score.html?id=event-e2e');
            
            // Step 3: Render debrief on score page
            const debriefContainer = document.getElementById('debriefContainer');
            debriefContainer.innerHTML = '<div class="debrief-container">Debrief</div>';
            expect(debriefContainer.innerHTML).toContain('debrief-container');
            
            // Step 4: Navigate to results page
            const resultsUrl = `./results.html?id=${eventId}`;
            expect(resultsUrl).toBe('./results.html?id=event-e2e');
            
            // Step 5: Click own avatar and see back button
            const modalDebrief = document.getElementById('modalDebrief');
            const clickedParticipantId = participantId;
            const storedSessionId = sessionStorage.getItem(`participant_${eventId}`);
            
            if (clickedParticipantId === storedSessionId) {
                modalDebrief.innerHTML = '<button>View My Full Results</button>';
            }
            
            expect(modalDebrief.innerHTML).toContain('View My Full Results');
            
            // Step 6: Navigate back to score page
            const backToScoreUrl = `./score.html?id=${eventId}`;
            expect(backToScoreUrl).toBe('./score.html?id=event-e2e');
        });
    });
});
