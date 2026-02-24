/**
 * Property Test: Debrief Content Consistency
 * 
 * **Validates: Requirements 7.3**
 * 
 * Property 8: Debrief Content Consistency
 * For any participant's debrief, the content rendered on score.html should be equivalent 
 * to the content that was previously rendered in the results.html modal (using the same 
 * rendering functions and data).
 */

import fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import { renderFreePlayDebrief, renderModalDebrief } from '../debrief-renderer.js';

describe('Property 8: Debrief Content Consistency', () => {
    test('Property: Same rendering functions produce consistent output', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -25, max: 25 }), // score
                fc.record({
                    0: fc.integer({ min: 0, max: 1 }),
                    1: fc.integer({ min: 0, max: 1 }),
                    2: fc.integer({ min: 0, max: 1 }),
                    3: fc.integer({ min: 0, max: 1 }),
                    4: fc.integer({ min: 0, max: 1 })
                }), // answers
                fc.integer({ min: -25, max: -5 }), // min
                fc.integer({ min: 5, max: 25 }), // max
                (score, answers, min, max) => {
                    // Ensure min < max
                    if (min >= max) {
                        return true; // Skip invalid ranges
                    }

                    // Mock questions array
                    const questions = [
                        { text: 'Question 1', value: 3 },
                        { text: 'Question 2', value: -2 },
                        { text: 'Question 3', value: 1 },
                        { text: 'Question 4', value: -1 },
                        { text: 'Question 5', value: 2 }
                    ];

                    // Mock analytics data
                    const analyticsData = {
                        stats: { mean: 0, median: 0, mode: 0 },
                        percentile: 50,
                        totalParticipants: 10,
                        lessPrivilegedCount: 5
                    };

                    // Render using free play debrief (used on score.html)
                    const freePlayHTML = renderFreePlayDebrief(
                        score,
                        answers,
                        min,
                        max,
                        questions,
                        analyticsData
                    );

                    // Render using modal debrief (used on results.html modal)
                    const participant = { score, answers };
                    const modalHTML = renderModalDebrief(
                        participant,
                        min,
                        max,
                        questions,
                        analyticsData
                    );

                    // Both should produce valid HTML
                    expect(freePlayHTML).toBeDefined();
                    expect(modalHTML).toBeDefined();
                    expect(typeof freePlayHTML).toBe('string');
                    expect(typeof modalHTML).toBe('string');

                    // Both should contain debrief container
                    expect(freePlayHTML).toContain('debrief-container');
                    expect(modalHTML).toContain('debrief-container');

                    // Both should contain stat cards when analytics data is provided
                    expect(freePlayHTML).toContain('stat-cards-container');
                    expect(modalHTML).toContain('stat-cards-container');

                    // Both should contain score meaning section
                    expect(freePlayHTML).toContain('score-meaning');
                    expect(modalHTML).toContain('score-meaning');

                    // Both should contain response analysis section
                    expect(freePlayHTML).toContain('response-analysis');
                    expect(modalHTML).toContain('response-analysis');

                    // The content should be structurally equivalent
                    // (same sections in same order)
                    const freePlaySections = extractSections(freePlayHTML);
                    const modalSections = extractSections(modalHTML);

                    expect(freePlaySections.length).toBe(modalSections.length);
                    expect(freePlaySections).toEqual(modalSections);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Property: Debrief sections appear in consistent order', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -25, max: 25 }), // score
                fc.record({
                    0: fc.integer({ min: 0, max: 1 }),
                    1: fc.integer({ min: 0, max: 1 }),
                    2: fc.integer({ min: 0, max: 1 })
                }), // answers
                (score, answers) => {
                    const questions = [
                        { text: 'Q1', value: 3 },
                        { text: 'Q2', value: -2 },
                        { text: 'Q3', value: 1 }
                    ];

                    const analyticsData = {
                        stats: { mean: 0, median: 0, mode: 0 },
                        percentile: 50,
                        totalParticipants: 5,
                        lessPrivilegedCount: 2
                    };

                    // Render both versions
                    const freePlayHTML = renderFreePlayDebrief(score, answers, -25, 25, questions, analyticsData);
                    const participant = { score, answers };
                    const modalHTML = renderModalDebrief(participant, -25, 25, questions, analyticsData);

                    // Extract section order
                    const freePlayOrder = getSectionOrder(freePlayHTML);
                    const modalOrder = getSectionOrder(modalHTML);

                    // Verify order is: stat-cards, score-meaning, response-analysis
                    const expectedOrder = ['stat-cards-container', 'score-meaning', 'response-analysis'];

                    expect(freePlayOrder).toEqual(expectedOrder);
                    expect(modalOrder).toEqual(expectedOrder);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Property: Same score produces same category classification', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -25, max: 25 }), // score
                fc.record({
                    0: fc.integer({ min: 0, max: 1 }),
                    1: fc.integer({ min: 0, max: 1 })
                }), // answers
                (score, answers) => {
                    const questions = [
                        { text: 'Q1', value: 3 },
                        { text: 'Q2', value: -2 }
                    ];

                    const analyticsData = {
                        stats: { mean: 0, median: 0, mode: 0 },
                        percentile: 50,
                        totalParticipants: 5,
                        lessPrivilegedCount: 2
                    };

                    // Render both versions
                    const freePlayHTML = renderFreePlayDebrief(score, answers, -25, 25, questions, analyticsData);
                    const participant = { score, answers };
                    const modalHTML = renderModalDebrief(participant, -25, 25, questions, analyticsData);

                    // Extract category from both
                    const freePlayCategory = extractCategory(freePlayHTML);
                    const modalCategory = extractCategory(modalHTML);

                    // Both should have the same category
                    expect(freePlayCategory).toBe(modalCategory);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Property: Handles null analytics data consistently', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -25, max: 25 }), // score
                fc.record({
                    0: fc.integer({ min: 0, max: 1 }),
                    1: fc.integer({ min: 0, max: 1 })
                }), // answers
                (score, answers) => {
                    const questions = [
                        { text: 'Q1', value: 3 },
                        { text: 'Q2', value: -2 }
                    ];

                    // Render with null analytics data (free play mode or first participant)
                    const freePlayHTML = renderFreePlayDebrief(score, answers, -25, 25, questions, null);
                    const participant = { score, answers };
                    const modalHTML = renderModalDebrief(participant, -25, 25, questions, null);

                    // Both should still render successfully
                    expect(freePlayHTML).toBeDefined();
                    expect(modalHTML).toBeDefined();

                    // Both should NOT contain stat cards when analytics is null
                    expect(freePlayHTML).not.toContain('stat-cards-container');
                    expect(modalHTML).not.toContain('stat-cards-container');

                    // Both should still contain score meaning and response analysis
                    expect(freePlayHTML).toContain('score-meaning');
                    expect(modalHTML).toContain('score-meaning');
                    expect(freePlayHTML).toContain('response-analysis');
                    expect(modalHTML).toContain('response-analysis');

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});

// Helper function to extract section types from HTML
function extractSections(html) {
    const sections = [];
    if (html.includes('stat-cards-container')) sections.push('stat-cards');
    if (html.includes('score-meaning')) sections.push('score-meaning');
    if (html.includes('response-analysis')) sections.push('response-analysis');
    return sections;
}

// Helper function to get section order from HTML
function getSectionOrder(html) {
    const order = [];
    const statCardsIndex = html.indexOf('stat-cards-container');
    const scoreMeaningIndex = html.indexOf('score-meaning');
    const responseAnalysisIndex = html.indexOf('response-analysis');

    const sections = [
        { name: 'stat-cards-container', index: statCardsIndex },
        { name: 'score-meaning', index: scoreMeaningIndex },
        { name: 'response-analysis', index: responseAnalysisIndex }
    ];

    // Sort by index and filter out sections not found (-1)
    sections
        .filter(s => s.index !== -1)
        .sort((a, b) => a.index - b.index)
        .forEach(s => order.push(s.name));

    return order;
}

// Helper function to extract category from HTML
function extractCategory(html) {
    const categoryMatch = html.match(/data-category="([^"]+)"/);
    return categoryMatch ? categoryMatch[1] : null;
}
