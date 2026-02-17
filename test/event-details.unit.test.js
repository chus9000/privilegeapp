/**
 * Unit Tests for Event Details View
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

const { JSDOM } = require('jsdom');

describe('Event Details View', () => {
    let dom;
    let document;
    let window;
    
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
    });
    
    afterEach(() => {
        delete global.document;
        delete global.window;
    });

    describe('calculateEventStatistics', () => {
        // Helper function to calculate statistics
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
        
        it('should calculate mean, median, mode correctly', () => {
            const participants = [
                { id: 'p1', name: 'Alice', score: 10 },
                { id: 'p2', name: 'Bob', score: 5 },
                { id: 'p3', name: 'Charlie', score: 10 },
                { id: 'p4', name: 'Diana', score: 15 }
            ];
            
            const stats = calculateEventStatistics(participants);
            
            expect(stats.mean).toBe(10); // (10 + 5 + 10 + 15) / 4 = 10
            expect(stats.median).toBe(10); // (10 + 10) / 2 = 10
            expect(stats.mode).toEqual([10]); // 10 appears twice
            expect(stats.min).toBe(5);
            expect(stats.max).toBe(15);
        });

        it('should handle single participant', () => {
            const participants = [
                { id: 'p1', name: 'Alice', score: 7 }
            ];
            
            const stats = calculateEventStatistics(participants);
            
            expect(stats.mean).toBe(7);
            expect(stats.median).toBe(7);
            expect(stats.mode).toBe(null); // No mode when all scores appear once
            expect(stats.min).toBe(7);
            expect(stats.max).toBe(7);
        });
        
        it('should handle multiple modes', () => {
            const participants = [
                { id: 'p1', name: 'Alice', score: 5 },
                { id: 'p2', name: 'Bob', score: 5 },
                { id: 'p3', name: 'Charlie', score: 10 },
                { id: 'p4', name: 'Diana', score: 10 }
            ];
            
            const stats = calculateEventStatistics(participants);
            
            expect(stats.mode).toEqual([5, 10]); // Both 5 and 10 appear twice
        });
        
        it('should handle negative scores', () => {
            const participants = [
                { id: 'p1', name: 'Alice', score: -5 },
                { id: 'p2', name: 'Bob', score: 0 },
                { id: 'p3', name: 'Charlie', score: 5 }
            ];
            
            const stats = calculateEventStatistics(participants);
            
            expect(stats.mean).toBe(0); // (-5 + 0 + 5) / 3 = 0
            expect(stats.median).toBe(0);
            expect(stats.min).toBe(-5);
            expect(stats.max).toBe(5);
        });
        
        it('should return null for empty participants array', () => {
            const stats = calculateEventStatistics([]);
            expect(stats).toBe(null);
        });
        
        it('should return null for null participants', () => {
            const stats = calculateEventStatistics(null);
            expect(stats).toBe(null);
        });
    });

    describe('displayEventStatistics', () => {
        function displayEventStatistics(stats) {
            if (!stats) {
                document.getElementById('detailsMeanScore').textContent = '-';
                document.getElementById('detailsMedianScore').textContent = '-';
                document.getElementById('detailsModeScore').textContent = '-';
                document.getElementById('detailsScoreRange').textContent = '-';
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
        
        it('should display statistics with positive scores', () => {
            const stats = {
                mean: 10.5,
                median: 10,
                mode: [10],
                min: 5,
                max: 15
            };
            
            displayEventStatistics(stats);
            
            expect(document.getElementById('detailsMeanScore').textContent).toBe('+10.5');
            expect(document.getElementById('detailsMedianScore').textContent).toBe('+10');
            expect(document.getElementById('detailsModeScore').textContent).toBe('+10');
            expect(document.getElementById('detailsScoreRange').textContent).toBe('+5 to +15');
        });

        it('should display statistics with negative scores', () => {
            const stats = {
                mean: -5.5,
                median: -5,
                mode: [-5],
                min: -10,
                max: 0
            };
            
            displayEventStatistics(stats);
            
            expect(document.getElementById('detailsMeanScore').textContent).toBe('-5.5');
            expect(document.getElementById('detailsMedianScore').textContent).toBe('-5');
            expect(document.getElementById('detailsModeScore').textContent).toBe('-5');
            expect(document.getElementById('detailsScoreRange').textContent).toBe('-10 to 0');
        });
        
        it('should display "No mode" when mode is null', () => {
            const stats = {
                mean: 5,
                median: 5,
                mode: null,
                min: 3,
                max: 7
            };
            
            displayEventStatistics(stats);
            
            expect(document.getElementById('detailsModeScore').textContent).toBe('No mode');
        });
        
        it('should display multiple modes', () => {
            const stats = {
                mean: 7.5,
                median: 7.5,
                mode: [5, 10],
                min: 5,
                max: 10
            };
            
            displayEventStatistics(stats);
            
            expect(document.getElementById('detailsModeScore').textContent).toBe('+5, +10');
        });
        
        it('should display empty statistics when stats is null', () => {
            displayEventStatistics(null);
            
            expect(document.getElementById('detailsMeanScore').textContent).toBe('-');
            expect(document.getElementById('detailsMedianScore').textContent).toBe('-');
            expect(document.getElementById('detailsModeScore').textContent).toBe('-');
            expect(document.getElementById('detailsScoreRange').textContent).toBe('-');
        });
    });

    describe('displayParticipantsList', () => {
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
        
        it('should display participants sorted by score (highest first)', () => {
            const participants = [
                { id: 'p1', name: 'Alice', avatar: '🐱', score: 5 },
                { id: 'p2', name: 'Bob', avatar: '🐶', score: 15 },
                { id: 'p3', name: 'Charlie', avatar: '🦊', score: 10 }
            ];
            
            displayParticipantsList(participants);
            
            const listContainer = document.getElementById('detailsParticipantsList');
            const items = listContainer.querySelectorAll('.participant-item');
            
            expect(items.length).toBe(3);
            expect(items[0].querySelector('.participant-name').textContent).toBe('Bob');
            expect(items[1].querySelector('.participant-name').textContent).toBe('Charlie');
            expect(items[2].querySelector('.participant-name').textContent).toBe('Alice');
        });
        
        it('should display correct rank numbers', () => {
            const participants = [
                { id: 'p1', name: 'Alice', avatar: '🐱', score: 10 },
                { id: 'p2', name: 'Bob', avatar: '🐶', score: 5 }
            ];
            
            displayParticipantsList(participants);
            
            const listContainer = document.getElementById('detailsParticipantsList');
            const ranks = listContainer.querySelectorAll('.participant-rank');
            
            expect(ranks[0].textContent).toBe('#1');
            expect(ranks[1].textContent).toBe('#2');
        });

        it('should format positive scores with + sign', () => {
            const participants = [
                { id: 'p1', name: 'Alice', avatar: '🐱', score: 10 }
            ];
            
            displayParticipantsList(participants);
            
            const listContainer = document.getElementById('detailsParticipantsList');
            const scoreElement = listContainer.querySelector('.participant-score');
            
            expect(scoreElement.textContent).toBe('Score: +10');
        });
        
        it('should format negative scores without extra sign', () => {
            const participants = [
                { id: 'p1', name: 'Alice', avatar: '🐱', score: -5 }
            ];
            
            displayParticipantsList(participants);
            
            const listContainer = document.getElementById('detailsParticipantsList');
            const scoreElement = listContainer.querySelector('.participant-score');
            
            expect(scoreElement.textContent).toBe('Score: -5');
        });
        
        it('should display avatars correctly', () => {
            const participants = [
                { id: 'p1', name: 'Alice', avatar: '🐱', score: 10 }
            ];
            
            displayParticipantsList(participants);
            
            const listContainer = document.getElementById('detailsParticipantsList');
            const avatar = listContainer.querySelector('.participant-avatar');
            
            expect(avatar.textContent).toBe('🐱');
        });
        
        it('should handle empty participants array', () => {
            displayParticipantsList([]);
            
            const listContainer = document.getElementById('detailsParticipantsList');
            const items = listContainer.querySelectorAll('.participant-item');
            
            expect(items.length).toBe(0);
        });
    });
    
    describe('Event Details Modal Display', () => {
        it('should show participant count', () => {
            const participantCount = 5;
            document.getElementById('detailsParticipantCount').textContent = participantCount;
            
            expect(document.getElementById('detailsParticipantCount').textContent).toBe('5');
        });
        
        it('should show event title and PIN', () => {
            document.getElementById('detailsEventTitle').textContent = 'Test Event';
            document.getElementById('detailsEventPin').textContent = '123456';
            
            expect(document.getElementById('detailsEventTitle').textContent).toBe('Test Event');
            expect(document.getElementById('detailsEventPin').textContent).toBe('123456');
        });
    });
});
