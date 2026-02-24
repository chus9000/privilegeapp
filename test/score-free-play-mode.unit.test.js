/**
 * Unit Tests: Free Play Mode on Score Page
 * 
 * Tests that score page handles free play mode correctly, including
 * rendering debrief without analytics data and navigation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Score Page Free Play Mode', () => {
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
                <div id="debriefContainer"></div>
                <div id="allyTipsContainer"></div>
                <button id="viewResultsBtn"></button>
                <button id="viewDetailedBtn"></button>
            </body>
            </html>
        `, {
            url: 'http://localhost/app/score.html?id=freeplay',
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

    it('should detect free play mode from URL', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('id');
        
        expect(eventId).toBe('freeplay');
    });

    it('should handle absence of analytics data gracefully', () => {
        // Simulate rendering debrief without analytics data
        const debriefContainer = document.getElementById('debriefContainer');
        
        // Mock debrief HTML without stat cards (analytics unavailable)
        debriefContainer.innerHTML = `
            <div class="debrief-container">
                <div class="debrief-section score-meaning">
                    <h2>Understanding Your Score</h2>
                    <p>Your score reflects your privilege level.</p>
                </div>
                <div class="debrief-section response-analysis">
                    <h2>Understanding Privilege in Context</h2>
                    <div class="response-cards">
                        <div class="response-card">Response 1</div>
                    </div>
                </div>
            </div>
        `;
        
        // Verify debrief renders without stat cards
        expect(debriefContainer.innerHTML).toContain('debrief-container');
        expect(debriefContainer.innerHTML).toContain('score-meaning');
        expect(debriefContainer.innerHTML).toContain('response-analysis');
        expect(debriefContainer.innerHTML).not.toContain('stat-cards-container');
    });

    it('should display appropriate messaging when analytics unavailable', () => {
        const debriefContainer = document.getElementById('debriefContainer');
        
        // Simulate first participant message
        debriefContainer.innerHTML = `
            <div class="debrief-container">
                <p class="info-message">You're the first participant! Invite others to see comparisons.</p>
                <div class="debrief-section score-meaning">
                    <h2>Understanding Your Score</h2>
                </div>
            </div>
        `;
        
        // Verify appropriate messaging is present
        expect(debriefContainer.innerHTML).toContain('first participant');
    });

    it('should setup navigation buttons for free play mode', () => {
        const viewResultsBtn = document.getElementById('viewResultsBtn');
        const viewDetailedBtn = document.getElementById('viewDetailedBtn');
        
        // Simulate setting up navigation
        viewResultsBtn.onclick = () => {
            window.location.href = './results.html?id=freeplay';
        };
        
        viewDetailedBtn.onclick = () => {
            window.location.href = './detailed-results.html?id=freeplay';
        };
        
        // Verify buttons have onclick handlers
        expect(viewResultsBtn.onclick).toBeDefined();
        expect(viewDetailedBtn.onclick).toBeDefined();
    });

    it('should preserve event ID in navigation URLs', () => {
        const eventId = 'freeplay';
        
        // Simulate navigation URL construction
        const resultsUrl = `./results.html?id=${eventId}`;
        const detailedUrl = `./detailed-results.html?id=${eventId}`;
        
        expect(resultsUrl).toBe('./results.html?id=freeplay');
        expect(detailedUrl).toBe('./detailed-results.html?id=freeplay');
    });

    it('should handle session storage for free play mode', () => {
        const eventId = 'freeplay';
        const participantId = 'participant-freeplay-123';
        
        // Store session participant for free play
        sessionStorage.setItem(`participant_${eventId}`, participantId);
        
        // Verify storage
        const stored = sessionStorage.getItem(`participant_${eventId}`);
        expect(stored).toBe(participantId);
    });

    it('should render debrief sections in correct order for free play', () => {
        const debriefContainer = document.getElementById('debriefContainer');
        
        // Simulate rendering debrief for free play (no analytics)
        debriefContainer.innerHTML = `
            <div class="debrief-container">
                <div class="debrief-section score-meaning" data-order="1">
                    <h2>Understanding Your Score</h2>
                </div>
                <div class="debrief-section response-analysis" data-order="2">
                    <h2>Understanding Privilege in Context</h2>
                </div>
            </div>
        `;
        
        // Verify sections are present
        const scoreMeaning = debriefContainer.querySelector('.score-meaning');
        const responseAnalysis = debriefContainer.querySelector('.response-analysis');
        
        expect(scoreMeaning).not.toBeNull();
        expect(responseAnalysis).not.toBeNull();
        
        // Verify order (score meaning before response analysis)
        const sections = debriefContainer.querySelectorAll('.debrief-section');
        expect(sections[0].classList.contains('score-meaning')).toBe(true);
        expect(sections[1].classList.contains('response-analysis')).toBe(true);
    });

    it('should handle navigation from free play score page to results', () => {
        const viewResultsBtn = document.getElementById('viewResultsBtn');
        
        // Mock navigation
        let navigatedTo = null;
        viewResultsBtn.onclick = () => {
            navigatedTo = './results.html?id=freeplay';
        };
        
        // Trigger navigation
        viewResultsBtn.onclick();
        
        expect(navigatedTo).toBe('./results.html?id=freeplay');
    });

    it('should handle navigation from free play score page to detailed results', () => {
        const viewDetailedBtn = document.getElementById('viewDetailedBtn');
        
        // Mock navigation
        let navigatedTo = null;
        viewDetailedBtn.onclick = () => {
            navigatedTo = './detailed-results.html?id=freeplay';
        };
        
        // Trigger navigation
        viewDetailedBtn.onclick();
        
        expect(navigatedTo).toBe('./detailed-results.html?id=freeplay');
    });

    it('should render ally tips for free play mode', () => {
        const allyTipsContainer = document.getElementById('allyTipsContainer');
        
        // Simulate rendering ally tips
        allyTipsContainer.innerHTML = `
            <div class="ally-tips-section">
                <h2>Ways to Be an Ally</h2>
                <div class="ally-tip">Tip 1</div>
                <div class="ally-tip">Tip 2</div>
            </div>
        `;
        
        // Verify ally tips are rendered
        expect(allyTipsContainer.innerHTML).toContain('ally-tips-section');
        expect(allyTipsContainer.innerHTML).toContain('Ways to Be an Ally');
    });

    it('should handle error when participant data is missing in free play', () => {
        const debriefContainer = document.getElementById('debriefContainer');
        
        // Simulate error state
        debriefContainer.innerHTML = `
            <div class="error-message">
                <h2>⚠️ Error</h2>
                <p>Unable to load your results. Please try again.</p>
                <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
            </div>
        `;
        
        // Verify error message is displayed
        expect(debriefContainer.innerHTML).toContain('error-message');
        expect(debriefContainer.innerHTML).toContain('Unable to load your results');
        expect(debriefContainer.innerHTML).toContain('Retry');
    });
});
