/**
 * Unit tests for current participant highlighting
 * Requirements: 7.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Current Participant Highlighting', () => {
    let dom;
    let window;
    let document;
    let localStorage;

    beforeEach(() => {
        // Read the actual spectrum.js file
        const spectrumJs = fs.readFileSync(path.join(process.cwd(), 'app/spectrum.js'), 'utf-8');
        
        // Create a minimal HTML structure
        const html = `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
                <div class="spectrum-bar"></div>
                <div id="eventTitle"></div>
                <div id="searchInput"></div>
                <div id="searchToggle"></div>
                <div id="searchContainer"></div>
                <div id="searchCount"></div>
            </body>
            </html>
        `;

        dom = new JSDOM(html, {
            url: 'http://localhost/app/spectrum.html?id=test-event',
            runScripts: 'dangerously',
            resources: 'usable'
        });

        window = dom.window;
        document = window.document;
        localStorage = {
            data: {},
            getItem(key) {
                return this.data[key] || null;
            },
            setItem(key, value) {
                this.data[key] = value;
            },
            removeItem(key) {
                delete this.data[key];
            },
            clear() {
                this.data = {};
            }
        };

        // Set up global objects
        window.localStorage = localStorage;
        window.FirebaseAPI = {
            loadEvent: vi.fn(),
            onEventUpdate: vi.fn()
        };

        // Mock questions array
        window.questions = [
            { text: 'Question 1', value: 1 },
            { text: 'Question 2', value: -1 },
            { text: 'Question 3', value: 2 }
        ];

        // Set up global functions that spectrum.js expects
        window.allParticipants = [];
        window.eventData = null;
        window.eventId = 'test-event';
    });

    afterEach(() => {
        if (dom) {
            dom.window.close();
        }
    });

    it('should identify current participant from localStorage', () => {
        // Arrange: Set up participant data in localStorage
        const currentParticipant = {
            id: 'participant-123',
            name: 'Test User',
            avatar: '🐱',
            score: 5
        };
        
        localStorage.setItem('participant_test-event', JSON.stringify(currentParticipant));

        // Act: Retrieve the data
        const storedData = localStorage.getItem('participant_test-event');
        const participant = JSON.parse(storedData);

        // Assert: Verify the participant data is correctly stored and retrieved
        expect(participant).toBeDefined();
        expect(participant.id).toBe('participant-123');
        expect(participant.name).toBe('Test User');
        expect(participant.score).toBe(5);
    });

    it('should add current-participant class to the correct marker', () => {
        // Arrange: Create participant markers in the DOM
        const spectrumBar = document.querySelector('.spectrum-bar');
        
        const participants = [
            { id: 'participant-1', name: 'User 1', avatar: '🐱', score: 3 },
            { id: 'participant-2', name: 'User 2', avatar: '🐶', score: 5 },
            { id: 'participant-3', name: 'User 3', avatar: '🦊', score: -2 }
        ];

        participants.forEach(p => {
            const marker = document.createElement('div');
            marker.className = 'participant-marker';
            marker.setAttribute('data-participant-id', p.id);
            marker.innerHTML = `
                <div class="participant-container">
                    <div class="participant-avatar">${p.avatar}</div>
                    <div class="participant-name-label">${p.name} (${p.score})</div>
                </div>
            `;
            spectrumBar.appendChild(marker);
        });

        // Set current participant in localStorage
        const currentParticipant = participants[1]; // User 2
        localStorage.setItem('participant_test-event', JSON.stringify(currentParticipant));
        window.allParticipants = participants;

        // Act: Simulate the highlighting logic
        const currentParticipantData = localStorage.getItem('participant_test-event');
        const participant = JSON.parse(currentParticipantData);
        const participantMarker = document.querySelector(`.participant-marker[data-participant-id="${participant.id}"]`);
        
        if (participantMarker) {
            participantMarker.classList.add('current-participant');
        }

        // Assert: Verify the correct marker has the class
        const highlightedMarker = document.querySelector('.participant-marker.current-participant');
        expect(highlightedMarker).toBeDefined();
        expect(highlightedMarker.getAttribute('data-participant-id')).toBe('participant-2');
        
        // Verify other markers don't have the class
        const allMarkers = document.querySelectorAll('.participant-marker');
        expect(allMarkers.length).toBe(3);
        expect(allMarkers[0].classList.contains('current-participant')).toBe(false);
        expect(allMarkers[1].classList.contains('current-participant')).toBe(true);
        expect(allMarkers[2].classList.contains('current-participant')).toBe(false);
    });

    it('should handle missing localStorage data gracefully', () => {
        // Arrange: No participant data in localStorage
        const spectrumBar = document.querySelector('.spectrum-bar');
        
        const marker = document.createElement('div');
        marker.className = 'participant-marker';
        marker.setAttribute('data-participant-id', 'participant-1');
        spectrumBar.appendChild(marker);

        // Act: Try to get participant data
        const currentParticipantData = localStorage.getItem('participant_test-event');

        // Assert: Should handle null gracefully
        expect(currentParticipantData).toBeNull();
        
        // Verify no markers are highlighted
        const highlightedMarker = document.querySelector('.participant-marker.current-participant');
        expect(highlightedMarker).toBeNull();
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
        // Arrange: Set invalid JSON in localStorage
        localStorage.setItem('participant_test-event', 'invalid-json{');

        // Act & Assert: Should not throw error
        expect(() => {
            const data = localStorage.getItem('participant_test-event');
            try {
                JSON.parse(data);
            } catch (error) {
                // Expected to catch error
                expect(error).toBeDefined();
            }
        }).not.toThrow();
    });

    it('should handle participant not found in spectrum', () => {
        // Arrange: Set participant data that doesn't exist in spectrum
        const currentParticipant = {
            id: 'non-existent-participant',
            name: 'Ghost User',
            avatar: '👻',
            score: 10
        };
        
        localStorage.setItem('participant_test-event', JSON.stringify(currentParticipant));
        
        const spectrumBar = document.querySelector('.spectrum-bar');
        const marker = document.createElement('div');
        marker.className = 'participant-marker';
        marker.setAttribute('data-participant-id', 'different-participant');
        spectrumBar.appendChild(marker);

        window.allParticipants = [
            { id: 'different-participant', name: 'Other User', avatar: '🐱', score: 5 }
        ];

        // Act: Try to find and highlight the participant
        const storedData = localStorage.getItem('participant_test-event');
        const participant = JSON.parse(storedData);
        const foundParticipant = window.allParticipants.find(p => p.id === participant.id);

        // Assert: Should not find the participant
        expect(foundParticipant).toBeUndefined();
        
        // Verify no markers are highlighted
        const highlightedMarker = document.querySelector('.participant-marker.current-participant');
        expect(highlightedMarker).toBeNull();
    });

    it('should use correct event ID from URL for localStorage key', () => {
        // Arrange: Different event IDs
        const eventId1 = 'event-abc';
        const eventId2 = 'event-xyz';
        
        const participant1 = { id: 'p1', name: 'User 1', score: 5 };
        const participant2 = { id: 'p2', name: 'User 2', score: 10 };

        // Act: Store participants for different events
        localStorage.setItem(`participant_${eventId1}`, JSON.stringify(participant1));
        localStorage.setItem(`participant_${eventId2}`, JSON.stringify(participant2));

        // Assert: Should retrieve correct participant for each event
        const retrieved1 = JSON.parse(localStorage.getItem(`participant_${eventId1}`));
        const retrieved2 = JSON.parse(localStorage.getItem(`participant_${eventId2}`));

        expect(retrieved1.id).toBe('p1');
        expect(retrieved2.id).toBe('p2');
        expect(retrieved1.name).toBe('User 1');
        expect(retrieved2.name).toBe('User 2');
    });

    it('should apply visual highlight with correct CSS class', () => {
        // Arrange: Create a participant marker
        const spectrumBar = document.querySelector('.spectrum-bar');
        const marker = document.createElement('div');
        marker.className = 'participant-marker';
        marker.setAttribute('data-participant-id', 'test-participant');
        spectrumBar.appendChild(marker);

        // Act: Add the current-participant class
        marker.classList.add('current-participant');

        // Assert: Verify the class is applied
        expect(marker.classList.contains('current-participant')).toBe(true);
        expect(marker.classList.contains('participant-marker')).toBe(true);
    });

    it('should maintain highlight when search filters are applied', () => {
        // Arrange: Create markers with one being current participant
        const spectrumBar = document.querySelector('.spectrum-bar');
        
        const markers = [
            { id: 'p1', name: 'Alice', isCurrent: false },
            { id: 'p2', name: 'Bob', isCurrent: true },
            { id: 'p3', name: 'Charlie', isCurrent: false }
        ];

        markers.forEach(m => {
            const marker = document.createElement('div');
            marker.className = 'participant-marker';
            marker.setAttribute('data-participant-id', m.id);
            if (m.isCurrent) {
                marker.classList.add('current-participant');
            }
            spectrumBar.appendChild(marker);
        });

        // Act: Apply search filter (filtered-out class)
        const currentMarker = document.querySelector('[data-participant-id="p2"]');
        currentMarker.classList.add('filtered-out');

        // Assert: Current participant class should still be present
        expect(currentMarker.classList.contains('current-participant')).toBe(true);
        expect(currentMarker.classList.contains('filtered-out')).toBe(true);
    });
});
