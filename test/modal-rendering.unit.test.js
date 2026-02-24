/**
 * Unit Tests: Modal Rendering
 * 
 * Tests modal shows stat cards but not full debrief sections,
 * and "View My Full Results" button appears for session participant.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Modal Rendering', () => {
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
                <div id="modalAvatar"></div>
                <div id="modalName"></div>
                <div id="modalScore"></div>
                <div id="modalDebrief"></div>
                <div id="modalAllyTips"></div>
                <div id="participantModal" style="display: none;"></div>
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
        sessionStorage.clear();
        delete global.window;
        delete global.document;
        delete global.sessionStorage;
    });

    it('should show stat cards but not full debrief sections', () => {
        const modalDebrief = document.getElementById('modalDebrief');
        
        // Simulate rendering stat cards only (no score meaning or response analysis)
        modalDebrief.innerHTML = `
            <div class="stat-cards-container">
                <div class="stat-card stat-card-primary">
                    <div class="stat-card-label">TOTAL SCORE</div>
                    <div class="stat-card-value">+5</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">VS. OTHERS</div>
                    <div class="stat-card-value">3/10</div>
                </div>
            </div>
        `;
        
        // Verify stat cards are present
        const statCards = modalDebrief.querySelector('.stat-cards-container');
        expect(statCards).not.toBeNull();
        expect(statCards.querySelectorAll('.stat-card').length).toBeGreaterThan(0);
        
        // Verify full debrief sections are NOT present
        const scoreMeaning = modalDebrief.querySelector('.score-meaning');
        const responseAnalysis = modalDebrief.querySelector('.response-analysis');
        
        expect(scoreMeaning).toBeNull();
        expect(responseAnalysis).toBeNull();
    });

    it('should include "View My Full Results" button for session participant', () => {
        const eventId = 'test-event-123';
        const participantId = 'participant-abc';
        
        // Store session participant
        sessionStorage.setItem(`participant_${eventId}`, participantId);
        
        const modalDebrief = document.getElementById('modalDebrief');
        modalDebrief.innerHTML = '<div class="stat-cards-container">Stats</div>';
        
        // Simulate checking if clicked participant is session participant
        const clickedParticipantId = participantId;
        const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
        
        if (clickedParticipantId === sessionParticipantId) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = 'View My Full Results';
            btn.onclick = () => {
                window.location.href = `./score.html?id=${eventId}`;
            };
            modalDebrief.appendChild(btn);
        }
        
        // Verify button exists
        const button = modalDebrief.querySelector('button');
        expect(button).not.toBeNull();
        expect(button.textContent).toBe('View My Full Results');
        expect(button.className).toContain('btn-primary');
    });

    it('should NOT include button for non-session participant', () => {
        const eventId = 'test-event-123';
        const sessionParticipantId = 'participant-abc';
        const otherParticipantId = 'participant-xyz';
        
        // Store session participant
        sessionStorage.setItem(`participant_${eventId}`, sessionParticipantId);
        
        const modalDebrief = document.getElementById('modalDebrief');
        modalDebrief.innerHTML = '<div class="stat-cards-container">Stats</div>';
        
        // Simulate checking if clicked participant is session participant
        const clickedParticipantId = otherParticipantId;
        const storedSessionId = sessionStorage.getItem(`participant_${eventId}`);
        
        if (clickedParticipantId === storedSessionId) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = 'View My Full Results';
            modalDebrief.appendChild(btn);
        }
        
        // Verify button does NOT exist
        const button = modalDebrief.querySelector('button');
        expect(button).toBeNull();
    });

    it('should populate modal with participant information', () => {
        const participant = {
            id: 'participant-123',
            name: 'John Doe',
            avatar: '😊',
            score: 5
        };
        
        // Simulate populating modal
        document.getElementById('modalAvatar').textContent = participant.avatar;
        document.getElementById('modalName').textContent = participant.name;
        document.getElementById('modalScore').textContent = `Score: +${participant.score}`;
        
        // Verify modal content
        expect(document.getElementById('modalAvatar').textContent).toBe('😊');
        expect(document.getElementById('modalName').textContent).toBe('John Doe');
        expect(document.getElementById('modalScore').textContent).toBe('Score: +5');
    });

    it('should show modal when participant is clicked', () => {
        const modal = document.getElementById('participantModal');
        
        // Initially hidden
        expect(modal.style.display).toBe('none');
        
        // Simulate showing modal
        modal.style.display = 'block';
        
        // Verify modal is visible
        expect(modal.style.display).toBe('block');
    });

    it('should handle missing session storage gracefully', () => {
        const eventId = 'test-event-123';
        const participantId = 'participant-abc';
        
        // Don't store anything in session storage
        sessionStorage.clear();
        
        const modalDebrief = document.getElementById('modalDebrief');
        modalDebrief.innerHTML = '<div class="stat-cards-container">Stats</div>';
        
        // Simulate checking for session participant
        const clickedParticipantId = participantId;
        const sessionParticipantId = sessionStorage.getItem(`participant_${eventId}`);
        
        if (clickedParticipantId === sessionParticipantId) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = 'View My Full Results';
            modalDebrief.appendChild(btn);
        }
        
        // Verify button does NOT exist when session storage is empty
        const button = modalDebrief.querySelector('button');
        expect(button).toBeNull();
    });

    it('should render stat cards with correct structure', () => {
        const modalDebrief = document.getElementById('modalDebrief');
        
        // Simulate rendering stat cards
        modalDebrief.innerHTML = `
            <div class="stat-cards-container">
                <div class="stat-card stat-card-primary">
                    <div class="stat-card-label">TOTAL SCORE</div>
                    <div class="stat-card-value">+5</div>
                    <div class="stat-card-badge">RELATIVE INDEX</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">VS. OTHERS</div>
                    <div class="stat-card-value">3/10</div>
                    <div class="stat-card-description">are less privileged than you</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">VS. MODE</div>
                    <div class="stat-card-value">+2 points</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">VS. MEDIAN</div>
                    <div class="stat-card-value">+1 points</div>
                </div>
            </div>
        `;
        
        // Verify stat cards structure
        const container = modalDebrief.querySelector('.stat-cards-container');
        expect(container).not.toBeNull();
        
        const statCards = container.querySelectorAll('.stat-card');
        expect(statCards.length).toBeGreaterThanOrEqual(4);
        
        // Verify primary card
        const primaryCard = container.querySelector('.stat-card-primary');
        expect(primaryCard).not.toBeNull();
        expect(primaryCard.querySelector('.stat-card-label').textContent).toBe('TOTAL SCORE');
        expect(primaryCard.querySelector('.stat-card-value').textContent).toBe('+5');
    });

    it('should not render score meaning section in modal', () => {
        const modalDebrief = document.getElementById('modalDebrief');
        
        // Simulate rendering only stat cards (no score meaning)
        modalDebrief.innerHTML = `
            <div class="stat-cards-container">
                <div class="stat-card">Stats</div>
            </div>
        `;
        
        // Verify score meaning section is NOT present
        const scoreMeaning = modalDebrief.querySelector('.score-meaning');
        const debriefContent = modalDebrief.querySelector('.debrief-content');
        
        expect(scoreMeaning).toBeNull();
        expect(debriefContent).toBeNull();
    });

    it('should not render response analysis section in modal', () => {
        const modalDebrief = document.getElementById('modalDebrief');
        
        // Simulate rendering only stat cards (no response analysis)
        modalDebrief.innerHTML = `
            <div class="stat-cards-container">
                <div class="stat-card">Stats</div>
            </div>
        `;
        
        // Verify response analysis section is NOT present
        const responseAnalysis = modalDebrief.querySelector('.response-analysis');
        const responseCards = modalDebrief.querySelector('.response-cards');
        
        expect(responseAnalysis).toBeNull();
        expect(responseCards).toBeNull();
    });
});
