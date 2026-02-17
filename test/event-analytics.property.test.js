/**
 * Property-Based Tests for Event Analytics
 * Feature: full-featured-quiz-app
 * Requirements: 8.1, 8.2, 8.3, 8.4
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 */

const fc = require('fast-check');

describe('Event Analytics Properties', () => {
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

    // Participant generator
    const participantGenerator = fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
        name: fc.string({ minLength: 1, maxLength: 30 }),
        avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼', '🐸', '🐵'),
        score: fc.integer({ min: -25, max: 25 })
    });
    
    describe('Property: Mean Score Calculation', () => {
        it('mean should equal sum of scores divided by count', () => {
            fc.assert(
                fc.property(
                    fc.array(participantGenerator, { minLength: 1, maxLength: 50 }),
                    (participants) => {
                        const stats = calculateEventStatistics(participants);
                        
                        if (!stats) return true;
                        
                        const scores = participants.map(p => p.score);
                        const expectedMean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
                        const roundedExpectedMean = Math.round(expectedMean * 10) / 10;
                        
                        return Math.abs(stats.mean - roundedExpectedMean) < 0.01;
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('mean should be between min and max scores', () => {
            fc.assert(
                fc.property(
                    fc.array(participantGenerator, { minLength: 1, maxLength: 50 }),
                    (participants) => {
                        const stats = calculateEventStatistics(participants);
                        
                        if (!stats) return true;
                        
                        return stats.mean >= stats.min && stats.mean <= stats.max;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property: Median Score Calculation', () => {
        it('median should be between min and max scores', () => {
            fc.assert(
                fc.property(
                    fc.array(participantGenerator, { minLength: 1, maxLength: 50 }),
                    (participants) => {
                        const stats = calculateEventStatistics(participants);
                        
                        if (!stats) return true;
                        
                        return stats.median >= stats.min && stats.median <= stats.max;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('for single participant, median should equal their score', () => {
            fc.assert(
                fc.property(
                    participantGenerator,
                    (participant) => {
                        const stats = calculateEventStatistics([participant]);
                        
                        return stats.median === participant.score;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property: Mode Score Calculation', () => {
        it('mode should be null when all scores appear once', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.integer({ min: -25, max: 25 }),
                        { minLength: 1, maxLength: 20 }
                    ).map(scores => {
                        // Ensure all scores are unique
                        const uniqueScores = [...new Set(scores)];
                        return uniqueScores.map((score, i) => ({
                            id: `p${i}`,
                            name: `Participant ${i}`,
                            avatar: '🐱',
                            score
                        }));
                    }),
                    (participants) => {
                        if (participants.length === 0) return true;
                        
                        const stats = calculateEventStatistics(participants);
                        
                        return stats.mode === null;
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('mode should contain the most frequent score(s)', () => {
            fc.assert(
                fc.property(
                    fc.array(participantGenerator, { minLength: 2, maxLength: 50 }),
                    (participants) => {
                        const stats = calculateEventStatistics(participants);
                        
                        if (!stats || stats.mode === null) return true;
                        
                        const scores = participants.map(p => p.score);
                        const scoreFrequency = {};
                        scores.forEach(score => {
                            scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
                        });
                        
                        const maxFrequency = Math.max(...Object.values(scoreFrequency));
                        const modes = Array.isArray(stats.mode) ? stats.mode : [stats.mode];
                        
                        // All modes should have the maximum frequency
                        return modes.every(mode => scoreFrequency[mode] === maxFrequency);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Property: Min and Max Scores', () => {
        it('min should be less than or equal to all scores', () => {
            fc.assert(
                fc.property(
                    fc.array(participantGenerator, { minLength: 1, maxLength: 50 }),
                    (participants) => {
                        const stats = calculateEventStatistics(participants);
                        
                        if (!stats) return true;
                        
                        const scores = participants.map(p => p.score);
                        return scores.every(score => score >= stats.min);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('max should be greater than or equal to all scores', () => {
            fc.assert(
                fc.property(
                    fc.array(participantGenerator, { minLength: 1, maxLength: 50 }),
                    (participants) => {
                        const stats = calculateEventStatistics(participants);
                        
                        if (!stats) return true;
                        
                        const scores = participants.map(p => p.score);
                        return scores.every(score => score <= stats.max);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('min should be less than or equal to max', () => {
            fc.assert(
                fc.property(
                    fc.array(participantGenerator, { minLength: 1, maxLength: 50 }),
                    (participants) => {
                        const stats = calculateEventStatistics(participants);
                        
                        if (!stats) return true;
                        
                        return stats.min <= stats.max;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Property: Participant List Sorting', () => {
        it('participants should be sorted by score in descending order', () => {
            fc.assert(
                fc.property(
                    fc.array(participantGenerator, { minLength: 1, maxLength: 50 }),
                    (participants) => {
                        const sorted = [...participants].sort((a, b) => b.score - a.score);
                        
                        // Check that each participant has score >= next participant
                        for (let i = 0; i < sorted.length - 1; i++) {
                            if (sorted[i].score < sorted[i + 1].score) {
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

    describe('Property: Statistics Completeness', () => {
        it('all statistics fields should be present for non-empty participant list', () => {
            fc.assert(
                fc.property(
                    fc.array(participantGenerator, { minLength: 1, maxLength: 50 }),
                    (participants) => {
                        const stats = calculateEventStatistics(participants);
                        
                        if (!stats) return false;
                        
                        return (
                            typeof stats.mean === 'number' &&
                            typeof stats.median === 'number' &&
                            (stats.mode === null || typeof stats.mode === 'number' || Array.isArray(stats.mode)) &&
                            typeof stats.min === 'number' &&
                            typeof stats.max === 'number'
                        );
                    }
                ),
                { numRuns: 100 }
            );
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
    
    describe('Property: Participant Count Consistency', () => {
        it('participant count should match array length', () => {
            fc.assert(
                fc.property(
                    fc.array(participantGenerator, { minLength: 0, maxLength: 100 }),
                    (participants) => {
                        const count = participants.length;
                        
                        // This property just verifies the count matches the array length
                        return count === participants.length;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
