/**
 * Property-Based Test for Modal Content Restriction
 * 
 * Feature: score-page-separation
 * 
 * **Property 4: Modal Content Restriction**
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { renderStatCards } from '../debrief-renderer.js';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generator for participant data with score and basic info
 */
function participantArb() {
    return fc.record({
        id: fc.string({ minLength: 5, maxLength: 20 }),
        name: fc.string({ minLength: 3, maxLength: 30 }),
        avatar: fc.constantFrom('😊', '🐯', '🦊', '🐻', '🦁', '🐼', '🐨', '🦉'),
        score: fc.integer({ min: -50, max: 50 }),
        answers: fc.dictionary(
            fc.integer({ min: 0, max: 20 }).map(n => n.toString()),
            fc.constantFrom(0, 1),
            { minKeys: 5, maxKeys: 15 }
        )
    });
}

/**
 * Generator for analytics stats
 */
function analyticsStatsArb() {
    return fc.record({
        mean: fc.integer({ min: -50, max: 50 }),
        median: fc.integer({ min: -50, max: 50 }),
        mode: fc.integer({ min: -50, max: 50 })
    });
}

/**
 * Generator for a list of participants (for calculating comparative stats)
 */
function participantListArb() {
    return fc.array(participantArb(), { minLength: 2, maxLength: 20 });
}

// ---------------------------------------------------------------------------
// Property 4: Modal Content Restriction
// ---------------------------------------------------------------------------

describe('Property 4: Modal Content Restriction', () => {
    test('modal should display only statistical information and not full debrief sections', () => {
        /**
         * Feature: score-page-separation, Property 4: Modal Content Restriction
         *
         * For any participant avatar clicked on the results page, the modal should
         * display only statistical information (name, avatar, score, comparative stats)
         * and should not include full debrief sections (score meaning, response analysis).
         *
         * **Validates: Requirements 3.1, 3.2, 3.3**
         */
        fc.assert(
            fc.property(
                participantArb(),
                analyticsStatsArb(),
                fc.integer({ min: 0, max: 100 }), // percentile
                fc.integer({ min: 2, max: 100 }), // totalParticipants
                fc.integer({ min: 0, max: 99 }), // lessPrivilegedCount
                (participant, stats, percentile, totalParticipants, lessPrivilegedCount) => {
                    // Ensure lessPrivilegedCount is less than totalParticipants
                    const validLessPrivilegedCount = Math.min(lessPrivilegedCount, totalParticipants - 1);

                    // Render stat cards (what should be shown in modal)
                    const modalHTML = renderStatCards(
                        participant.score,
                        stats,
                        percentile,
                        totalParticipants,
                        validLessPrivilegedCount
                    );

                    // Property: Modal should contain stat cards
                    expect(modalHTML).toContain('stat-cards-container');
                    expect(modalHTML).toContain('TOTAL SCORE');
                    expect(modalHTML).toContain('VS. OTHERS');
                    expect(modalHTML).toContain('VS. MODE');
                    expect(modalHTML).toContain('VS. MEDIAN');

                    // Property: Modal should NOT contain full debrief sections
                    // Score meaning section markers
                    expect(modalHTML).not.toContain('class="debrief-section score-meaning"');
                    expect(modalHTML).not.toContain('Understanding Your Score');
                    expect(modalHTML).not.toContain('Using Your Advantages to Help Others');
                    expect(modalHTML).not.toContain('Your Journey and Resilience');
                    expect(modalHTML).not.toContain('Understanding Your Mixed Experience');
                    expect(modalHTML).not.toContain('superpowers');
                    expect(modalHTML).not.toContain('resilience');
                    expect(modalHTML).not.toContain('intersectionality');

                    // Response analysis section markers
                    expect(modalHTML).not.toContain('class="debrief-section response-analysis"');
                    expect(modalHTML).not.toContain('Understanding Privilege in Context');
                    expect(modalHTML).not.toContain('class="response-card"');
                    expect(modalHTML).not.toContain('class="question-text"');
                    expect(modalHTML).not.toContain('Your answer:');
                    expect(modalHTML).not.toContain('class="explanation"');

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal should only contain stat card elements and no debrief narrative content', () => {
        /**
         * Feature: score-page-separation, Property 4: Modal Content Restriction
         *
         * Verifies that the modal HTML structure contains only statistical
         * comparison elements and excludes all narrative debrief content.
         *
         * **Validates: Requirements 3.1, 3.2, 3.3**
         */
        fc.assert(
            fc.property(
                participantListArb(),
                (participants) => {
                    // Pick a random participant to show in modal
                    const targetParticipant = participants[0];
                    const scores = participants.map(p => p.score);

                    // Calculate real analytics
                    const sortedScores = [...scores].sort((a, b) => a - b);
                    const median = sortedScores.length % 2 === 0
                        ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
                        : sortedScores[Math.floor(sortedScores.length / 2)];
                    const mean = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);

                    // Calculate mode
                    const scoreFrequency = {};
                    scores.forEach(score => {
                        scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
                    });
                    const maxFrequency = Math.max(...Object.values(scoreFrequency));
                    const modes = Object.keys(scoreFrequency)
                        .filter(score => scoreFrequency[score] === maxFrequency)
                        .map(Number);
                    const mode = modes[0];

                    const lessPrivilegedCount = scores.filter(s => s < targetParticipant.score).length;
                    const percentile = Math.round((lessPrivilegedCount / scores.length) * 100);

                    // Render modal content (stat cards only)
                    const modalHTML = renderStatCards(
                        targetParticipant.score,
                        { mean, median, mode },
                        percentile,
                        participants.length,
                        lessPrivilegedCount
                    );

                    // Property: Should contain statistical elements
                    expect(modalHTML).toContain('stat-card');
                    expect(modalHTML).toContain('stat-card-value');
                    expect(modalHTML).toContain('stat-card-label');

                    // Property: Should NOT contain debrief container or sections
                    expect(modalHTML).not.toContain('debrief-container');
                    expect(modalHTML).not.toContain('debrief-section');
                    expect(modalHTML).not.toContain('debrief-content');

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal content should be restricted regardless of participant score category', () => {
        /**
         * Feature: score-page-separation, Property 4: Modal Content Restriction
         *
         * Ensures that modal content restriction applies uniformly across all
         * score categories (low, neutral, high privilege).
         *
         * **Validates: Requirements 3.1, 3.2, 3.3**
         */
        fc.assert(
            fc.property(
                fc.constantFrom('low', 'neutral', 'high'),
                participantArb(),
                analyticsStatsArb(),
                (category, participant, stats) => {
                    // Adjust score to match category
                    let adjustedScore = participant.score;
                    if (category === 'low') {
                        adjustedScore = -30; // Low privilege score
                    } else if (category === 'neutral') {
                        adjustedScore = 0; // Neutral score
                    } else if (category === 'high') {
                        adjustedScore = 30; // High privilege score
                    }

                    const modalHTML = renderStatCards(
                        adjustedScore,
                        stats,
                        50, // percentile
                        10, // totalParticipants
                        5   // lessPrivilegedCount
                    );

                    // Property: Regardless of category, modal should only show stats
                    expect(modalHTML).toContain('stat-cards-container');

                    // Property: Category-specific debrief messages should NOT appear
                    if (category === 'high') {
                        expect(modalHTML).not.toContain('Using Your Advantages to Help Others');
                        expect(modalHTML).not.toContain('superpowers');
                    } else if (category === 'low') {
                        expect(modalHTML).not.toContain('Your Journey and Resilience');
                        expect(modalHTML).not.toContain('resilience');
                    } else if (category === 'neutral') {
                        expect(modalHTML).not.toContain('Understanding Your Mixed Experience');
                        expect(modalHTML).not.toContain('intersectionality');
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal should not expose participant answer details', () => {
        /**
         * Feature: score-page-separation, Property 4: Modal Content Restriction
         *
         * Verifies that individual question responses and explanations are not
         * exposed in the modal, maintaining privacy of detailed response data.
         *
         * **Validates: Requirements 3.1, 3.2, 3.3**
         */
        fc.assert(
            fc.property(
                participantArb(),
                analyticsStatsArb(),
                (participant, stats) => {
                    const modalHTML = renderStatCards(
                        participant.score,
                        stats,
                        50,
                        10,
                        5
                    );

                    // Property: Should not contain answer-related elements
                    expect(modalHTML).not.toContain('Your answer:');
                    expect(modalHTML).not.toContain('Yes');
                    expect(modalHTML).not.toContain('No');
                    expect(modalHTML).not.toContain('response-card');
                    expect(modalHTML).not.toContain('question-text');
                    expect(modalHTML).not.toContain('explanation');

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
