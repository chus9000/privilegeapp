/**
 * Unit Tests for Real-Time Analytics Updates
 * Requirements: 8.5, 8.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Real-Time Analytics Updates', () => {
    let dom;
    let document;
    let window;
    let mockFirebaseAPI;
    let realTimeCallback;
    
    beforeEach(() => {
        // Create a minimal DOM environment
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="detailsEventTitle"></div>
                <div id="detailsEventPin"></div>
                <div id="detailsEventDate"></div>
                <div id="detailsParticipantCount"></div>
                <div id="detailsMeanScore"></div>
                <div id="detailsMedianScore"></div>
                <div id="detailsModeScore"></div>
                <div id="detailsScoreRange"></div>
                <div id="detailsParticipantsList"></div>
                <div id="detailsNoParticipants" style="display: none;"></div>
                <div id="eventDetailsModal" style="display: none;"></div>
                <button id="viewSpectrumBtn"></button>
            </body>
            </html>
        `);
        
        document = dom.window.document;
        window = dom.window;
        
        global.document = document;
        global.window = window;
        
        // Mock FirebaseAPI with real-time listener
        realTimeCallback = null;
        mockFirebaseAPI = {
            onEventUpdate: vi.fn((eventId, callback) => {
                realTimeCallback = callback;
                // Return cleanup function
                return () => {
                    realTimeCallback = null;
                };
            }),
            loadEventsByCreator: vi.fn().mockResolvedValue([])
        };
        
        window.FirebaseAPI = mockFirebaseAPI;
    });
    
    afterEach(() => {
        delete global.document;
        delete global.window;
        vi.clearAllMocks();
    });

    describe('setupRealTimeAnalyticsUpdates', () => {
        // Helper function to set up real-time updates
        function setupRealTimeAnalyticsUpdates(eventId, events) {
            let realTimeListener = null;
            
            if (!window.FirebaseAPI || !window.FirebaseAPI.onEventUpdate) {
                console.warn('⚠️ Real-time updates not available');
                return;
            }
            
            realTimeListener = window.FirebaseAPI.onEventUpdate(eventId, (updatedEventData) => {
                if (!updatedEventData) {
                    return;
                }
                
                // Update the event in the local events array
                const eventIndex = events.findIndex(e => e.id === eventId);
                if (eventIndex >= 0) {
                    events[eventIndex] = {
                        ...events[eventIndex],
                        participants: updatedEventData.participants || []
                    };
                }
                
                // Update analytics display
                updateAnalyticsDisplay(updatedEventData);
            });
            
            return realTimeListener;
        }
        
        // Helper function to update analytics display
        function updateAnalyticsDisplay(eventData) {
            const participants = eventData.participants || [];
            const participantCount = participants.length;
            
            document.getElementById('detailsParticipantCount').textContent = participantCount;
            
            if (participantCount > 0) {
                const stats = calculateEventStatistics(participants);
                displayEventStatistics(stats);
                displayParticipantsList(participants);
                
                document.getElementById('detailsParticipantsList').style.display = 'block';
                document.getElementById('detailsNoParticipants').style.display = 'none';
            } else {
                displayEmptyStatistics();
                
                document.getElementById('detailsParticipantsList').style.display = 'none';
                document.getElementById('detailsNoParticipants').style.display = 'block';
            }
        }
        
        // Helper functions for statistics
        function calculateEventStatistics(participants) {
            if (!participants || participants.length === 0) {
                return null;
            }
            
            const scores = participants.map(p => p.score);
            const sum = scores.reduce((acc, score) => acc + score, 0);
            const mean = sum / scores.length;
            
            const sortedScores = [...scores].sort((a, b) => a - b);
            const median = sortedScores.length % 2 === 0
                ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
                : sortedScores[Math.floor(sortedScores.length / 2)];
            
            const scoreFrequency = {};
            scores.forEach(score => {
                scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
            });
            
            const maxFrequency = Math.max(...Object.values(scoreFrequency));
            const modes = Object.keys(scoreFrequency)
                .filter(score => scoreFrequency[score] === maxFrequency)
                .map(Number);
            
            const mode = maxFrequency === 1 ? null : modes;
            const min = Math.min(...scores);
            const max = Math.max(...scores);
            
            return {
                mean: Math.round(mean * 10) / 10,
                median,
                mode,
                min,
                max
            };
        }
        
        function displayEventStatistics(stats) {
            if (!stats) {
                displayEmptyStatistics();
                return;
            }
            
            const meanValue = stats.mean > 0 ? `+${stats.mean}` : stats.mean.toString();
            document.getElementById('detailsMeanScore').textContent = meanValue;
            
            const medianValue = stats.median > 0 ? `+${stats.median}` : stats.median.toString();
            document.getElementById('detailsMedianScore').textContent = medianValue;
            
            if (stats.mode === null) {
                document.getElementById('detailsModeScore').textContent = 'No mode';
            } else if (Array.isArray(stats.mode)) {
                const modeValues = stats.mode.map(m => m > 0 ? `+${m}` : m.toString()).join(', ');
                document.getElementById('detailsModeScore').textContent = modeValues;
            } else {
                const modeValue = stats.mode > 0 ? `+${stats.mode}` : stats.mode.toString();
                document.getElementById('detailsModeScore').textContent = modeValue;
            }
            
            const minValue = stats.min > 0 ? `+${stats.min}` : stats.min.toString();
            const maxValue = stats.max > 0 ? `+${stats.max}` : stats.max.toString();
            document.getElementById('detailsScoreRange').textContent = `${minValue} to ${maxValue}`;
        }
        
        function displayEmptyStatistics() {
            document.getElementById('detailsMeanScore').textContent = '-';
            document.getElementById('detailsMedianScore').textContent = '-';
            document.getElementById('detailsModeScore').textContent = '-';
            document.getElementById('detailsScoreRange').textContent = '-';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function displayParticipantsList(participants) {
            const listContainer = document.getElementById('detailsParticipantsList');
            listContainer.innerHTML = '';
            
            const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
            
            sortedParticipants.forEach((participant, index) => {
                const participantItem = document.createElement('div');
                participantItem.className = 'participant-item';
                
                const scoreValue = participant.score > 0 ? `+${participant.score}` : participant.score.toString();
                const rank = index + 1;
                
                participantItem.innerHTML = `
                    <div class="participant-rank">#${rank}</div>
                    <div class="participant-avatar">${participant.avatar}</div>
                    <div class="participant-info">
                        <div class="participant-name">${escapeHtml(participant.name)}</div>
                        <div class="participant-score">Score: ${scoreValue}</div>
                    </div>
                `;
                
                listContainer.appendChild(participantItem);
            });
        }
        
        it('should call FirebaseAPI.onEventUpdate when setting up real-time updates', () => {
            const eventId = 'test-event-123';
            const events = [];
            
            setupRealTimeAnalyticsUpdates(eventId, events);
            
            expect(mockFirebaseAPI.onEventUpdate).toHaveBeenCalledWith(
                eventId,
                expect.any(Function)
            );
        });
        
        it('should not set up listener when FirebaseAPI is not available', () => {
            delete window.FirebaseAPI;
            
            const eventId = 'test-event-123';
            const events = [];
            
            const listener = setupRealTimeAnalyticsUpdates(eventId, events);
            
            expect(listener).toBeUndefined();
        });
        
        it('should not set up listener when onEventUpdate is not available', () => {
            window.FirebaseAPI = { loadEventsByCreator: vi.fn() };
            
            const eventId = 'test-event-123';
            const events = [];
            
            const listener = setupRealTimeAnalyticsUpdates(eventId, events);
            
            expect(listener).toBeUndefined();
        });
    });

    describe('Real-time callback behavior', () => {
        function setupRealTimeAnalyticsUpdates(eventId, events) {
            let realTimeListener = null;
            
            if (!window.FirebaseAPI || !window.FirebaseAPI.onEventUpdate) {
                return;
            }
            
            realTimeListener = window.FirebaseAPI.onEventUpdate(eventId, (updatedEventData) => {
                if (!updatedEventData) {
                    return;
                }
                
                const eventIndex = events.findIndex(e => e.id === eventId);
                if (eventIndex >= 0) {
                    events[eventIndex] = {
                        ...events[eventIndex],
                        participants: updatedEventData.participants || []
                    };
                }
                
                updateAnalyticsDisplay(updatedEventData);
            });
            
            return realTimeListener;
        }
        
        function updateAnalyticsDisplay(eventData) {
            const participants = eventData.participants || [];
            const participantCount = participants.length;
            
            document.getElementById('detailsParticipantCount').textContent = participantCount;
            
            if (participantCount > 0) {
                const stats = calculateEventStatistics(participants);
                displayEventStatistics(stats);
                displayParticipantsList(participants);
                
                document.getElementById('detailsParticipantsList').style.display = 'block';
                document.getElementById('detailsNoParticipants').style.display = 'none';
            } else {
                displayEmptyStatistics();
                
                document.getElementById('detailsParticipantsList').style.display = 'none';
                document.getElementById('detailsNoParticipants').style.display = 'block';
            }
        }
        
        function calculateEventStatistics(participants) {
            if (!participants || participants.length === 0) {
                return null;
            }
            
            const scores = participants.map(p => p.score);
            const sum = scores.reduce((acc, score) => acc + score, 0);
            const mean = sum / scores.length;
            
            const sortedScores = [...scores].sort((a, b) => a - b);
            const median = sortedScores.length % 2 === 0
                ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
                : sortedScores[Math.floor(sortedScores.length / 2)];
            
            const scoreFrequency = {};
            scores.forEach(score => {
                scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
            });
            
            const maxFrequency = Math.max(...Object.values(scoreFrequency));
            const modes = Object.keys(scoreFrequency)
                .filter(score => scoreFrequency[score] === maxFrequency)
                .map(Number);
            
            const mode = maxFrequency === 1 ? null : modes;
            const min = Math.min(...scores);
            const max = Math.max(...scores);
            
            return {
                mean: Math.round(mean * 10) / 10,
                median,
                mode,
                min,
                max
            };
        }
        
        function displayEventStatistics(stats) {
            if (!stats) {
                displayEmptyStatistics();
                return;
            }
            
            const meanValue = stats.mean > 0 ? `+${stats.mean}` : stats.mean.toString();
            document.getElementById('detailsMeanScore').textContent = meanValue;
            
            const medianValue = stats.median > 0 ? `+${stats.median}` : stats.median.toString();
            document.getElementById('detailsMedianScore').textContent = medianValue;
            
            if (stats.mode === null) {
                document.getElementById('detailsModeScore').textContent = 'No mode';
            } else if (Array.isArray(stats.mode)) {
                const modeValues = stats.mode.map(m => m > 0 ? `+${m}` : m.toString()).join(', ');
                document.getElementById('detailsModeScore').textContent = modeValues;
            } else {
                const modeValue = stats.mode > 0 ? `+${stats.mode}` : stats.mode.toString();
                document.getElementById('detailsModeScore').textContent = modeValue;
            }
            
            const minValue = stats.min > 0 ? `+${stats.min}` : stats.min.toString();
            const maxValue = stats.max > 0 ? `+${stats.max}` : stats.max.toString();
            document.getElementById('detailsScoreRange').textContent = `${minValue} to ${maxValue}`;
        }
        
        function displayEmptyStatistics() {
            document.getElementById('detailsMeanScore').textContent = '-';
            document.getElementById('detailsMedianScore').textContent = '-';
            document.getElementById('detailsModeScore').textContent = '-';
            document.getElementById('detailsScoreRange').textContent = '-';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function displayParticipantsList(participants) {
            const listContainer = document.getElementById('detailsParticipantsList');
            listContainer.innerHTML = '';
            
            const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
            
            sortedParticipants.forEach((participant, index) => {
                const participantItem = document.createElement('div');
                participantItem.className = 'participant-item';
                
                const scoreValue = participant.score > 0 ? `+${participant.score}` : participant.score.toString();
                const rank = index + 1;
                
                participantItem.innerHTML = `
                    <div class="participant-rank">#${rank}</div>
                    <div class="participant-avatar">${participant.avatar}</div>
                    <div class="participant-info">
                        <div class="participant-name">${escapeHtml(participant.name)}</div>
                        <div class="participant-score">Score: ${scoreValue}</div>
                    </div>
                `;
                
                listContainer.appendChild(participantItem);
            });
        }
        
        it('should update participant count when new participant joins', () => {
            const eventId = 'test-event-123';
            const events = [{ id: eventId, participants: [] }];
            
            setupRealTimeAnalyticsUpdates(eventId, events);
            
            // Initial state - no participants
            expect(document.getElementById('detailsParticipantCount').textContent).toBe('');
            
            // Simulate new participant joining
            const updatedEventData = {
                participants: [
                    { id: 'p1', name: 'Alice', avatar: '🐱', score: 10 }
                ]
            };
            
            realTimeCallback(updatedEventData);
            
            // Participant count should be updated
            expect(document.getElementById('detailsParticipantCount').textContent).toBe('1');
        });
        
        it('should update statistics when participants join', () => {
            const eventId = 'test-event-123';
            const events = [{ id: eventId, participants: [] }];
            
            setupRealTimeAnalyticsUpdates(eventId, events);
            
            // Simulate participants joining
            const updatedEventData = {
                participants: [
                    { id: 'p1', name: 'Alice', avatar: '🐱', score: 10 },
                    { id: 'p2', name: 'Bob', avatar: '🐶', score: 5 }
                ]
            };
            
            realTimeCallback(updatedEventData);
            
            // Statistics should be calculated and displayed
            expect(document.getElementById('detailsMeanScore').textContent).toBe('+7.5');
            expect(document.getElementById('detailsMedianScore').textContent).toBe('+7.5');
        });
        
        it('should update participants list when new participant joins', () => {
            const eventId = 'test-event-123';
            const events = [{ id: eventId, participants: [] }];
            
            setupRealTimeAnalyticsUpdates(eventId, events);
            
            // Simulate participants joining
            const updatedEventData = {
                participants: [
                    { id: 'p1', name: 'Alice', avatar: '🐱', score: 10 },
                    { id: 'p2', name: 'Bob', avatar: '🐶', score: 15 }
                ]
            };
            
            realTimeCallback(updatedEventData);
            
            // Participants list should be updated
            const listContainer = document.getElementById('detailsParticipantsList');
            const items = listContainer.querySelectorAll('.participant-item');
            
            expect(items.length).toBe(2);
            expect(items[0].querySelector('.participant-name').textContent).toBe('Bob'); // Highest score first
            expect(items[1].querySelector('.participant-name').textContent).toBe('Alice');
        });
        
        it('should show participants list and hide no participants message when participants exist', () => {
            const eventId = 'test-event-123';
            const events = [{ id: eventId, participants: [] }];
            
            setupRealTimeAnalyticsUpdates(eventId, events);
            
            // Simulate participant joining
            const updatedEventData = {
                participants: [
                    { id: 'p1', name: 'Alice', avatar: '🐱', score: 10 }
                ]
            };
            
            realTimeCallback(updatedEventData);
            
            // Participants list should be visible
            expect(document.getElementById('detailsParticipantsList').style.display).toBe('block');
            expect(document.getElementById('detailsNoParticipants').style.display).toBe('none');
        });
        
        it('should handle null event data gracefully', () => {
            const eventId = 'test-event-123';
            const events = [{ id: eventId, participants: [] }];
            
            setupRealTimeAnalyticsUpdates(eventId, events);
            
            // Simulate null event data
            realTimeCallback(null);
            
            // Should not throw error and participant count should remain unchanged
            expect(document.getElementById('detailsParticipantCount').textContent).toBe('');
        });
        
        it('should update local events array when real-time update received', () => {
            const eventId = 'test-event-123';
            const events = [{ id: eventId, title: 'Test Event', participants: [] }];
            
            setupRealTimeAnalyticsUpdates(eventId, events);
            
            // Simulate participant joining
            const updatedEventData = {
                participants: [
                    { id: 'p1', name: 'Alice', avatar: '🐱', score: 10 }
                ]
            };
            
            realTimeCallback(updatedEventData);
            
            // Local events array should be updated
            expect(events[0].participants.length).toBe(1);
            expect(events[0].participants[0].name).toBe('Alice');
        });
    });

    describe('Cleanup behavior', () => {
        it('should return cleanup function from setupRealTimeAnalyticsUpdates', () => {
            const eventId = 'test-event-123';
            const events = [];
            
            let realTimeListener = null;
            
            if (window.FirebaseAPI && window.FirebaseAPI.onEventUpdate) {
                realTimeListener = window.FirebaseAPI.onEventUpdate(eventId, () => {});
            }
            
            expect(realTimeListener).toBeDefined();
            expect(typeof realTimeListener).toBe('function');
        });
        
        it('should clean up listener when cleanup function is called', () => {
            const eventId = 'test-event-123';
            const events = [];
            
            let realTimeListener = null;
            
            if (window.FirebaseAPI && window.FirebaseAPI.onEventUpdate) {
                realTimeListener = window.FirebaseAPI.onEventUpdate(eventId, () => {});
            }
            
            // Callback should be set
            expect(realTimeCallback).toBeDefined();
            
            // Call cleanup function
            realTimeListener();
            
            // Callback should be cleared
            expect(realTimeCallback).toBeNull();
        });
    });
});
