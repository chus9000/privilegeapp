/**
 * Property-Based Test for Modal Content Completeness
 * Feature: spectrum-page-consolidation
 * 
 * Property 5: Modal Content Completeness
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
 * 
 * For any participant, when their modal is opened, the modal should display all required elements:
 * avatar, name, debrief section, ally tips section, and (in event mode only) score.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { JSDOM } from 'jsdom';
import { renderStatCards } from '../debrief-renderer.js';
import { getTipsForScore, categorizeScore, renderTips } from '../ally-tips.js';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generator for participant data with all required fields
 */
function participantArbitrary() {
    return fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 30 }),
        avatar: fc.constantFrom('😀', '😎', '🤓', '😊', '🙂', '😃', '😄', '😁', '🐯', '🦊', '🐻', '🦁'),
        score: fc.integer({ min: -25, max: 25 }),
        answers: fc.dictionary(
            fc.integer({ min: 0, max: 20 }).map(n => n.toString()),
            fc.constantFrom(0, 1),
            { minKeys: 5, maxKeys: 15 }
        )
    });
}

/**
 * Generator for a list of participants (for calculating analytics)
 */
function participantListArbitrary() {
    return fc.array(participantArbitrary(), { minLength: 2, maxLength: 30 });
}

/**
 * Generator for spectrum configuration
 */
function spectrumConfigArbitrary() {
    return fc.constantFrom(
        { min: -25, max: 25 },
        { min: -20, max: 20 },
        { min: -15, max: 15 },
        { min: -10, max: 10 },
        { min: -5, max: 5 }
    );
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Set up a minimal DOM environment for testing modal content
 */
function setupModalDOM() {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test</title>
        </head>
        <body>
            <!-- Participant Details Modal -->
            <div id="participantModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Participant Details</h2>
                        <span class="close-btn" id="closeModal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="participant-details">
                            <div class="participant-avatar-large" id="modalAvatar"></div>
                            <h3 id="modalName"></h3>
                            <div class="participant-score-large" id="modalScore"></div>
                            <div id="modalDebrief" class="modal-debrief"></div>
                            <div id="modalAllyTips" class="modal-ally-tips"></div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `, { runScripts: 'dangerously', url: 'http://localhost' });

    return dom;
}

/**
 * Format score with appropriate sign prefix
 */
function formatScore(score) {
    if (score > 0) return `+${score}`;
    if (score < 0) return `${score}`;
    return '0';
}

/**
 * Calculate analytics stats from participant list
 */
function calculateAnalytics(participants, targetParticipant) {
    const scores = participants.map(p => p.score);
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
    
    return {
        stats: { mean, median, mode },
        percentile,
        lessPrivilegedCount
    };
}

/**
 * Simulate rendering modal content for a participant
 */
function renderModalContent(document, participant, participants, spectrumConfig) {
    const { min, max } = spectrumConfig;
    
    // Populate basic participant info
    document.getElementById('modalAvatar').textContent = participant.avatar;
    document.getElementById('modalName').textContent = participant.name;
    document.getElementById('modalScore').textContent = `Score: ${formatScore(participant.score)}`;
    
    // Calculate analytics and render stat cards (debrief section)
    const { stats, percentile, lessPrivilegedCount } = calculateAnalytics(participants, participant);
    const statCardsHTML = renderStatCards(
        participant.score,
        stats,
        percentile,
        participants.length,
        lessPrivilegedCount
    );
    document.getElementById('modalDebrief').innerHTML = statCardsHTML;
    
    // Render ally tips
    const allyTipsArray = getTipsForScore(participant.score, min, max);
    const category = categorizeScore(participant.score, min, max);
    const allyTipsHTML = renderTips(allyTipsArray, category);
    document.getElementById('modalAllyTips').innerHTML = allyTipsHTML;
    
    // Show modal
    document.getElementById('participantModal').style.display = 'block';
}

/**
 * Verify all required modal elements are present
 */
function verifyModalCompleteness(document, participant) {
    const errors = [];
    
    // Requirement 9.1: Avatar should be present
    const modalAvatar = document.getElementById('modalAvatar');
    if (!modalAvatar || !modalAvatar.textContent) {
        errors.push('Avatar element missing or empty');
    } else if (modalAvatar.textContent !== participant.avatar) {
        errors.push(`Avatar mismatch: expected ${participant.avatar}, got ${modalAvatar.textContent}`);
    }
    
    // Requirement 9.2: Name should be present
    const modalName = document.getElementById('modalName');
    if (!modalName || !modalName.textContent) {
        errors.push('Name element missing or empty');
    } else if (modalName.textContent !== participant.name) {
        errors.push(`Name mismatch: expected ${participant.name}, got ${modalName.textContent}`);
    }
    
    // Requirement 9.3: Score should be present (in event mode)
    const modalScore = document.getElementById('modalScore');
    if (!modalScore || !modalScore.textContent) {
        errors.push('Score element missing or empty');
    } else {
        const expectedScore = `Score: ${formatScore(participant.score)}`;
        if (modalScore.textContent !== expectedScore) {
            errors.push(`Score mismatch: expected ${expectedScore}, got ${modalScore.textContent}`);
        }
    }
    
    // Requirement 9.4: Debrief section should be present
    const modalDebrief = document.getElementById('modalDebrief');
    if (!modalDebrief || !modalDebrief.innerHTML) {
        errors.push('Debrief section missing or empty');
    } else {
        // Verify stat cards are present
        if (!modalDebrief.innerHTML.includes('stat-cards-container')) {
            errors.push('Stat cards container missing in debrief section');
        }
        if (!modalDebrief.innerHTML.includes('TOTAL SCORE')) {
            errors.push('Total score stat card missing');
        }
        if (!modalDebrief.innerHTML.includes('VS. OTHERS')) {
            errors.push('VS. OTHERS stat card missing');
        }
        if (!modalDebrief.innerHTML.includes('VS. MODE')) {
            errors.push('VS. MODE stat card missing');
        }
        if (!modalDebrief.innerHTML.includes('VS. MEDIAN')) {
            errors.push('VS. MEDIAN stat card missing');
        }
    }
    
    // Requirement 9.5: Ally tips section should be present
    const modalAllyTips = document.getElementById('modalAllyTips');
    if (!modalAllyTips || !modalAllyTips.innerHTML) {
        errors.push('Ally tips section missing or empty');
    } else {
        // Verify ally tips structure
        if (!modalAllyTips.innerHTML.includes('ally-tips-section')) {
            errors.push('Ally tips section class missing');
        }
        if (!modalAllyTips.innerHTML.includes('ally-tips-list')) {
            errors.push('Ally tips list missing');
        }
        if (!modalAllyTips.innerHTML.includes('ally-tip-item')) {
            errors.push('Ally tip items missing');
        }
    }
    
    return {
        success: errors.length === 0,
        errors
    };
}

// ---------------------------------------------------------------------------
// Property 5: Modal Content Completeness
// ---------------------------------------------------------------------------

describe('Property 5: Modal Content Completeness', () => {
    test('modal should display all required elements for any participant', () => {
        /**
         * Feature: spectrum-page-consolidation, Property 5: Modal Content Completeness
         *
         * For any participant, when their modal is opened, the modal should display
         * all required elements: avatar, name, score, debrief section (stat cards),
         * and ally tips section.
         *
         * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
         */
        fc.assert(
            fc.property(
                participantListArbitrary(),
                spectrumConfigArbitrary(),
                (participants, spectrumConfig) => {
                    // Reuse single DOM instance for all participants in this iteration
                    const dom = setupModalDOM();
                    const { document } = dom.window;
                    
                    // Test each participant in the list
                    for (const participant of participants) {
                        // Render modal content
                        renderModalContent(document, participant, participants, spectrumConfig);
                        
                        // Verify all required elements are present
                        const verification = verifyModalCompleteness(document, participant);
                        
                        if (!verification.success) {
                            console.error(`Modal completeness check failed for ${participant.name}:`, verification.errors);
                            return false;
                        }
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal avatar should always match participant avatar', () => {
        /**
         * Feature: spectrum-page-consolidation, Property 5: Modal Content Completeness
         *
         * Validates Requirement 9.1: Avatar display
         */
        fc.assert(
            fc.property(
                participantListArbitrary(),
                spectrumConfigArbitrary(),
                (participants, spectrumConfig) => {
                    const dom = setupModalDOM();
                    const { document } = dom.window;
                    
                    for (const participant of participants) {
                        renderModalContent(document, participant, participants, spectrumConfig);
                        
                        const modalAvatar = document.getElementById('modalAvatar');
                        if (!modalAvatar || modalAvatar.textContent !== participant.avatar) {
                            return false;
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal name should always match participant name', () => {
        /**
         * Feature: spectrum-page-consolidation, Property 5: Modal Content Completeness
         *
         * Validates Requirement 9.2: Name display
         */
        fc.assert(
            fc.property(
                participantListArbitrary(),
                spectrumConfigArbitrary(),
                (participants, spectrumConfig) => {
                    const dom = setupModalDOM();
                    const { document } = dom.window;
                    
                    for (const participant of participants) {
                        renderModalContent(document, participant, participants, spectrumConfig);
                        
                        const modalName = document.getElementById('modalName');
                        if (!modalName || modalName.textContent !== participant.name) {
                            return false;
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal score should always be present and correctly formatted in event mode', () => {
        /**
         * Feature: spectrum-page-consolidation, Property 5: Modal Content Completeness
         *
         * Validates Requirement 9.3: Score display in event mode
         */
        fc.assert(
            fc.property(
                participantListArbitrary(),
                spectrumConfigArbitrary(),
                (participants, spectrumConfig) => {
                    const dom = setupModalDOM();
                    const { document } = dom.window;
                    
                    for (const participant of participants) {
                        renderModalContent(document, participant, participants, spectrumConfig);
                        
                        const modalScore = document.getElementById('modalScore');
                        const expectedScore = `Score: ${formatScore(participant.score)}`;
                        
                        if (!modalScore || modalScore.textContent !== expectedScore) {
                            return false;
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal debrief section should always contain stat cards', () => {
        /**
         * Feature: spectrum-page-consolidation, Property 5: Modal Content Completeness
         *
         * Validates Requirement 9.4: Debrief section display
         */
        fc.assert(
            fc.property(
                participantListArbitrary(),
                spectrumConfigArbitrary(),
                (participants, spectrumConfig) => {
                    const dom = setupModalDOM();
                    const { document } = dom.window;
                    
                    for (const participant of participants) {
                        renderModalContent(document, participant, participants, spectrumConfig);
                        
                        const modalDebrief = document.getElementById('modalDebrief');
                        if (!modalDebrief || !modalDebrief.innerHTML) {
                            return false;
                        }
                        
                        // Verify all stat cards are present
                        const html = modalDebrief.innerHTML;
                        if (!html.includes('stat-cards-container') ||
                            !html.includes('TOTAL SCORE') ||
                            !html.includes('VS. OTHERS') ||
                            !html.includes('VS. MODE') ||
                            !html.includes('VS. MEDIAN')) {
                            return false;
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal ally tips section should always be present and contain tips', () => {
        /**
         * Feature: spectrum-page-consolidation, Property 5: Modal Content Completeness
         *
         * Validates Requirement 9.5: Ally tips section display
         */
        fc.assert(
            fc.property(
                participantListArbitrary(),
                spectrumConfigArbitrary(),
                (participants, spectrumConfig) => {
                    const dom = setupModalDOM();
                    const { document } = dom.window;
                    
                    for (const participant of participants) {
                        renderModalContent(document, participant, participants, spectrumConfig);
                        
                        const modalAllyTips = document.getElementById('modalAllyTips');
                        if (!modalAllyTips || !modalAllyTips.innerHTML) {
                            return false;
                        }
                        
                        // Verify ally tips structure
                        const html = modalAllyTips.innerHTML;
                        if (!html.includes('ally-tips-section') ||
                            !html.includes('ally-tips-list') ||
                            !html.includes('ally-tip-item')) {
                            return false;
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal should handle participants with extreme scores correctly', () => {
        /**
         * Feature: spectrum-page-consolidation, Property 5: Modal Content Completeness
         *
         * Validates that modal completeness holds for edge case scores
         */
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 1, maxLength: 20 }),
                        avatar: fc.constantFrom('😀', '😎', '🤓'),
                        score: fc.constantFrom(-25, -20, -10, 0, 10, 20, 25),
                        answers: fc.dictionary(
                            fc.integer({ min: 0, max: 20 }).map(n => n.toString()),
                            fc.constantFrom(0, 1),
                            { minKeys: 5, maxKeys: 15 }
                        )
                    }),
                    { minLength: 2, maxLength: 10 }
                ),
                spectrumConfigArbitrary(),
                (participants, spectrumConfig) => {
                    const dom = setupModalDOM();
                    const { document } = dom.window;
                    
                    for (const participant of participants) {
                        renderModalContent(document, participant, participants, spectrumConfig);
                        
                        const verification = verifyModalCompleteness(document, participant);
                        if (!verification.success) {
                            return false;
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal should handle participants with special characters in names', () => {
        /**
         * Feature: spectrum-page-consolidation, Property 5: Modal Content Completeness
         *
         * Validates that modal completeness holds for names with special characters
         */
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        name: fc.stringOf(
                            fc.constantFrom('A', 'B', '1', '2', '-', '_', ' ', '\'', '"', '&', '<', '>'),
                            { minLength: 1, maxLength: 20 }
                        ),
                        avatar: fc.constantFrom('😀', '😎', '🤓'),
                        score: fc.integer({ min: -25, max: 25 }),
                        answers: fc.dictionary(
                            fc.integer({ min: 0, max: 20 }).map(n => n.toString()),
                            fc.constantFrom(0, 1),
                            { minKeys: 5, maxKeys: 15 }
                        )
                    }),
                    { minLength: 2, maxLength: 10 }
                ),
                spectrumConfigArbitrary(),
                (participants, spectrumConfig) => {
                    const dom = setupModalDOM();
                    const { document } = dom.window;
                    
                    for (const participant of participants) {
                        renderModalContent(document, participant, participants, spectrumConfig);
                        
                        const verification = verifyModalCompleteness(document, participant);
                        if (!verification.success) {
                            return false;
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal should display correct ally tips category based on score', () => {
        /**
         * Feature: spectrum-page-consolidation, Property 5: Modal Content Completeness
         *
         * Validates that ally tips are categorized correctly based on participant score
         */
        fc.assert(
            fc.property(
                participantListArbitrary(),
                spectrumConfigArbitrary(),
                (participants, spectrumConfig) => {
                    const { min, max } = spectrumConfig;
                    const dom = setupModalDOM();
                    const { document } = dom.window;
                    
                    for (const participant of participants) {
                        renderModalContent(document, participant, participants, spectrumConfig);
                        
                        const modalAllyTips = document.getElementById('modalAllyTips');
                        const html = modalAllyTips.innerHTML;
                        
                        // Determine expected category
                        const category = categorizeScore(participant.score, min, max);
                        
                        // Verify category-specific content is present
                        if (category === 'highPrivilege') {
                            if (!html.includes('Using Your Privilege to Support Others')) {
                                return false;
                            }
                        } else if (category === 'lowPrivilege') {
                            if (!html.includes('Self-Advocacy and Community Building')) {
                                return false;
                            }
                        } else if (category === 'neutral') {
                            if (!html.includes('Understanding Intersectionality')) {
                                return false;
                            }
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('modal should maintain completeness across different spectrum configurations', () => {
        /**
         * Feature: spectrum-page-consolidation, Property 5: Modal Content Completeness
         *
         * Validates that modal completeness holds across different spectrum ranges
         */
        fc.assert(
            fc.property(
                participantListArbitrary(),
                fc.constantFrom(
                    { min: -25, max: 25 },
                    { min: -20, max: 20 },
                    { min: -15, max: 15 },
                    { min: -10, max: 10 },
                    { min: -5, max: 5 }
                ),
                (participants, spectrumConfig) => {
                    // Adjust participant scores to fit within spectrum range
                    const adjustedParticipants = participants.map(p => ({
                        ...p,
                        score: Math.max(spectrumConfig.min, Math.min(spectrumConfig.max, p.score))
                    }));
                    
                    const dom = setupModalDOM();
                    const { document } = dom.window;
                    
                    for (const participant of adjustedParticipants) {
                        renderModalContent(document, participant, adjustedParticipants, spectrumConfig);
                        
                        const verification = verifyModalCompleteness(document, participant);
                        if (!verification.success) {
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
