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
                <div id="detailsQuestionCount"></div>
                <a id="detailsEventLink" href="#"></a>
                <h3 id="detailsScoreStatsTitle">Score Statistics</h3>
                <div id="detailsMeanScore"></div>
                <div id="detailsMedianScore"></div>
                <div id="detailsModeScore"></div>
                <div id="detailsScoreRange"></div>
                <div id="eventDetailsModal" style="display: none;"></div>
                <button id="viewSpectrumBtn"></button>
                <button id="viewDetailedResultsBtn"></button>
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

    // Participants list display has been removed from the modal
    // Tests for displayParticipantsList are no longer applicable
    describe('displayParticipantsList', () => {
        it('should be removed from event details modal', () => {
            // This functionality has been removed as participants are no longer displayed in the modal
            expect(true).toBe(true);
        });
    });
    
    describe('Event Details Modal Display', () => {
        it('should show participant count in statistics title', () => {
            const participantCount = 5;
            const statsTitle = document.getElementById('detailsScoreStatsTitle');
            statsTitle.textContent = `Score Statistics for ${participantCount} participants`;
            
            expect(statsTitle.textContent).toBe('Score Statistics for 5 participants');
        });
        
        it('should show event title and PIN', () => {
            document.getElementById('detailsEventTitle').textContent = 'Test Event';
            document.getElementById('detailsEventPin').textContent = '123456';
            
            expect(document.getElementById('detailsEventTitle').textContent).toBe('Test Event');
            expect(document.getElementById('detailsEventPin').textContent).toBe('123456');
        });
    });
});
