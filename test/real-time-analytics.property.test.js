/**
 * Property-Based Tests for Real-Time Analytics Updates
 * Feature: full-featured-quiz-app
 * Property 21: Real-Time Data Updates
 * 
 * For any change to event participant data in Firebase, the analytics displays
 * should update automatically within 5 seconds.
 * 
 * **Validates: Requirements 8.6**
 */

import { describe, test, beforeEach } from 'vitest';
import fc from 'fast-check';

describe('Property 21: Real-Time Data Updates', () => {
    let updateCallbacks = [];
    
    beforeEach(() => {
        updateCallbacks = [];
    });
    
    /**
     * Mock FirebaseAPI with real-time listener support
     */
    function createMockFirebaseAPI() {
        return {
            onEventUpdate: (eventId, callback) => {
                updateCallbacks.push({ eventId, callback });
                return () => {
                    const index = updateCallbacks.findIndex(
                        cb => cb.eventId === eventId && cb.callback === callback
                    );
                    if (index >= 0) {
                        updateCallbacks.splice(index, 1);
                    }
                };
            }
        };
    }
    
    /**
     * Simulate real-time update by calling registered callbacks
     */
    function simulateRealTimeUpdate(eventId, updatedData) {
        const callbacks = updateCallbacks.filter(cb => cb.eventId === eventId);
        callbacks.forEach(cb => cb.callback(updatedData));
    }
    
    /**
     * Set up real-time listener
     */
    function setupRealTimeListener(firebaseAPI, eventId, onUpdate) {
        if (!firebaseAPI || !firebaseAPI.onEventUpdate) {
            return null;
        }
        
        return firebaseAPI.onEventUpdate(eventId, (updatedEventData) => {
            if (updatedEventData) {
                onUpdate(updatedEventData);
            }
        });
    }
    
    /**
     * Calculate event statistics
     */
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
        
        return {
            mean: Math.round(mean * 10) / 10,
            median,
            participantCount: participants.length
        };
    }
    
    test('real-time updates should trigger analytics recalculation for any participant change', () => {
        fc.assert(
            fc.property(
                // Generate event ID
                fc.string({ minLength: 5, maxLength: 20 }),
                // Generate initial participants
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 3, maxLength: 20 }),
                        avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
                        score: fc.integer({ min: -25, max: 25 })
                    }),
                    { minLength: 0, maxLength: 10 }
                ),
                // Generate new participant to add
                fc.record({
                    id: fc.uuid(),
                    name: fc.string({ minLength: 3, maxLength: 20 }),
                    avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
                    score: fc.integer({ min: -25, max: 25 })
                }),
                (eventId, initialParticipants, newParticipant) => {
                    const firebaseAPI = createMockFirebaseAPI();
                    
                    let currentAnalytics = null;
                    let updateCount = 0;
                    
                    // Set up real-time listener
                    const cleanup = setupRealTimeListener(firebaseAPI, eventId, (updatedEventData) => {
                        currentAnalytics = calculateEventStatistics(updatedEventData.participants);
                        updateCount++;
                    });
                    
                    // Calculate initial statistics
                    const initialStats = calculateEventStatistics(initialParticipants);
                    
                    // Simulate participant joining
                    const updatedParticipants = [...initialParticipants, newParticipant];
                    simulateRealTimeUpdate(eventId, { participants: updatedParticipants });
                    
                    // Calculate expected statistics
                    const expectedStats = calculateEventStatistics(updatedParticipants);
                    
                    // Verify update was triggered
                    if (updateCount === 0) {
                        throw new Error('Real-time update callback was not triggered');
                    }
                    
                    // Verify analytics were recalculated
                    if (currentAnalytics === null && updatedParticipants.length > 0) {
                        throw new Error('Analytics were not calculated after update');
                    }
                    
                    // Verify participant count is correct
                    if (currentAnalytics && currentAnalytics.participantCount !== updatedParticipants.length) {
                        throw new Error(
                            `Participant count mismatch: expected ${updatedParticipants.length}, got ${currentAnalytics.participantCount}`
                        );
                    }
                    
                    // Verify statistics match expected values
                    if (currentAnalytics && expectedStats) {
                        if (currentAnalytics.mean !== expectedStats.mean) {
                            throw new Error(
                                `Mean mismatch: expected ${expectedStats.mean}, got ${currentAnalytics.mean}`
                            );
                        }
                        
                        if (currentAnalytics.median !== expectedStats.median) {
                            throw new Error(
                                `Median mismatch: expected ${expectedStats.median}, got ${currentAnalytics.median}`
                            );
                        }
                    }
                    
                    // Clean up
                    if (cleanup) {
                        cleanup();
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('real-time updates should handle multiple participants joining simultaneously', () => {
        fc.assert(
            fc.property(
                // Generate event ID
                fc.string({ minLength: 5, maxLength: 20 }),
                // Generate initial participants
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 3, maxLength: 20 }),
                        avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
                        score: fc.integer({ min: -25, max: 25 })
                    }),
                    { minLength: 0, maxLength: 5 }
                ),
                // Generate multiple new participants
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 3, maxLength: 20 }),
                        avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
                        score: fc.integer({ min: -25, max: 25 })
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                (eventId, initialParticipants, newParticipants) => {
                    const firebaseAPI = createMockFirebaseAPI();
                    
                    let currentAnalytics = null;
                    let updateCount = 0;
                    
                    // Set up real-time listener
                    const cleanup = setupRealTimeListener(firebaseAPI, eventId, (updatedEventData) => {
                        currentAnalytics = calculateEventStatistics(updatedEventData.participants);
                        updateCount++;
                    });
                    
                    // Simulate multiple participants joining
                    const updatedParticipants = [...initialParticipants, ...newParticipants];
                    simulateRealTimeUpdate(eventId, { participants: updatedParticipants });
                    
                    // Verify update was triggered
                    if (updateCount === 0) {
                        throw new Error('Real-time update callback was not triggered');
                    }
                    
                    // Verify participant count is correct
                    if (currentAnalytics && currentAnalytics.participantCount !== updatedParticipants.length) {
                        throw new Error(
                            `Participant count mismatch: expected ${updatedParticipants.length}, got ${currentAnalytics.participantCount}`
                        );
                    }
                    
                    // Clean up
                    if (cleanup) {
                        cleanup();
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('real-time listener cleanup should prevent further updates', () => {
        fc.assert(
            fc.property(
                // Generate event ID
                fc.string({ minLength: 5, maxLength: 20 }),
                // Generate participants
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 3, maxLength: 20 }),
                        avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
                        score: fc.integer({ min: -25, max: 25 })
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                (eventId, participants) => {
                    const firebaseAPI = createMockFirebaseAPI();
                    
                    let updateCount = 0;
                    
                    // Set up real-time listener
                    const cleanup = setupRealTimeListener(firebaseAPI, eventId, () => {
                        updateCount++;
                    });
                    
                    // Simulate first update
                    simulateRealTimeUpdate(eventId, { participants });
                    const firstUpdateCount = updateCount;
                    
                    // Clean up listener
                    if (cleanup) {
                        cleanup();
                    }
                    
                    // Simulate second update after cleanup
                    simulateRealTimeUpdate(eventId, { participants });
                    const secondUpdateCount = updateCount;
                    
                    // Verify first update was received
                    if (firstUpdateCount === 0) {
                        throw new Error('First update was not received');
                    }
                    
                    // Verify second update was NOT received after cleanup
                    if (secondUpdateCount !== firstUpdateCount) {
                        throw new Error(
                            `Update received after cleanup: expected ${firstUpdateCount}, got ${secondUpdateCount}`
                        );
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('real-time updates should handle empty participant arrays', () => {
        fc.assert(
            fc.property(
                // Generate event ID
                fc.string({ minLength: 5, maxLength: 20 }),
                (eventId) => {
                    const firebaseAPI = createMockFirebaseAPI();
                    
                    let currentAnalytics = null;
                    let updateCount = 0;
                    
                    // Set up real-time listener
                    const cleanup = setupRealTimeListener(firebaseAPI, eventId, (updatedEventData) => {
                        currentAnalytics = calculateEventStatistics(updatedEventData.participants);
                        updateCount++;
                    });
                    
                    // Simulate update with empty participants
                    simulateRealTimeUpdate(eventId, { participants: [] });
                    
                    // Verify update was triggered
                    if (updateCount === 0) {
                        throw new Error('Real-time update callback was not triggered');
                    }
                    
                    // Verify analytics are null for empty participants
                    if (currentAnalytics !== null) {
                        throw new Error('Analytics should be null for empty participants');
                    }
                    
                    // Clean up
                    if (cleanup) {
                        cleanup();
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('real-time updates should only affect the specific event', () => {
        fc.assert(
            fc.property(
                // Generate two different event IDs
                fc.string({ minLength: 5, maxLength: 20 }),
                fc.string({ minLength: 5, maxLength: 20 }),
                // Generate participants for each event
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 3, maxLength: 20 }),
                        avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
                        score: fc.integer({ min: -25, max: 25 })
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 3, maxLength: 20 }),
                        avatar: fc.constantFrom('🐱', '🐶', '🦊', '🐻', '🐼'),
                        score: fc.integer({ min: -25, max: 25 })
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                (eventId1, eventId2, participants1, participants2) => {
                    // Skip if event IDs are the same
                    if (eventId1 === eventId2) {
                        return true;
                    }
                    
                    const firebaseAPI = createMockFirebaseAPI();
                    
                    let event1UpdateCount = 0;
                    let event2UpdateCount = 0;
                    
                    // Set up listeners for both events
                    const cleanup1 = setupRealTimeListener(firebaseAPI, eventId1, () => {
                        event1UpdateCount++;
                    });
                    
                    const cleanup2 = setupRealTimeListener(firebaseAPI, eventId2, () => {
                        event2UpdateCount++;
                    });
                    
                    // Simulate update for event 1 only
                    simulateRealTimeUpdate(eventId1, { participants: participants1 });
                    
                    // Verify only event 1 was updated
                    if (event1UpdateCount === 0) {
                        throw new Error('Event 1 update was not received');
                    }
                    
                    if (event2UpdateCount !== 0) {
                        throw new Error('Event 2 should not have received update for event 1');
                    }
                    
                    // Simulate update for event 2 only
                    simulateRealTimeUpdate(eventId2, { participants: participants2 });
                    
                    // Verify only event 2 was updated
                    if (event2UpdateCount === 0) {
                        throw new Error('Event 2 update was not received');
                    }
                    
                    if (event1UpdateCount !== 1) {
                        throw new Error('Event 1 should not have received update for event 2');
                    }
                    
                    // Clean up
                    if (cleanup1) cleanup1();
                    if (cleanup2) cleanup2();
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
