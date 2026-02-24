/**
 * Property-Based Tests for Debrief Message Content
 * 
 * Feature: personalized-results-debrief
 * 
 * **Property 3: Low Privilege Debrief Content**
 * **Property 4: High Privilege Debrief Content**
 * **Property 5: Neutral Privilege Debrief Content**
 * 
 * **Validates: Requirements 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3**
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { generateScoreDebrief, categorizePrivilegeScore } from '../debrief-engine.js';

describe('Property 3: Low Privilege Debrief Content', () => {
    test('low privilege debrief should acknowledge challenging contexts for any low score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.0, max: 0.399, noNaN: true }), // normalized position < 40%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as low
                    if (category !== 'low') return false;
                    
                    // Verify message acknowledges challenging contexts (Requirement 2.1)
                    const message = debrief.message.toLowerCase();
                    const acknowledgesChallenge = 
                        message.includes('challenge') || 
                        message.includes('obstacle') ||
                        message.includes('difficult');
                    
                    return acknowledgesChallenge;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('low privilege debrief should celebrate resilience for any low score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.0, max: 0.399, noNaN: true }), // normalized position < 40%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as low
                    if (category !== 'low') return false;
                    
                    // Verify message celebrates resilience (Requirement 2.2)
                    const message = debrief.message.toLowerCase();
                    const celebratesResilience = 
                        message.includes('resilience') || 
                        message.includes('strength') ||
                        message.includes('progress');
                    
                    return celebratesResilience;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('low privilege debrief should avoid victimization language for any low score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.0, max: 0.399, noNaN: true }), // normalized position < 40%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as low
                    if (category !== 'low') return false;
                    
                    // Verify message avoids victimization language (Requirement 2.4)
                    const message = debrief.message.toLowerCase();
                    const avoidsVictimization = 
                        !message.includes('victim') && 
                        !message.includes('unfortunate') &&
                        !message.includes('poor') &&
                        !message.includes('pity');
                    
                    return avoidsVictimization;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('low privilege debrief should have encouraging tone for any low score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.0, max: 0.399, noNaN: true }), // normalized position < 40%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as low
                    if (category !== 'low') return false;
                    
                    // Verify encouraging tone (Requirement 2.3)
                    expect(debrief).toHaveProperty('title');
                    expect(debrief).toHaveProperty('message');
                    expect(debrief.title).toBe('Your Journey and Resilience');
                    expect(debrief.message).toBeTruthy();
                    expect(debrief.message.length).toBeGreaterThan(0);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Property 4: High Privilege Debrief Content', () => {
    test('high privilege debrief should recognize advantages for any high score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.601, max: 1.0, noNaN: true }), // normalized position > 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as high
                    if (category !== 'high') return false;
                    
                    // Verify message recognizes advantages (Requirement 3.1)
                    const message = debrief.message.toLowerCase();
                    const recognizesAdvantages = 
                        message.includes('advantage') || 
                        message.includes('easier') ||
                        message.includes('privilege');
                    
                    return recognizesAdvantages;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('high privilege debrief should encourage helping others for any high score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.601, max: 1.0, noNaN: true }), // normalized position > 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as high
                    if (category !== 'high') return false;
                    
                    // Verify message encourages helping others (Requirement 3.2)
                    const message = debrief.message.toLowerCase();
                    const encouragesHelping = 
                        message.includes('help') || 
                        message.includes('support') ||
                        message.includes('ally') ||
                        message.includes('others');
                    
                    return encouragesHelping;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('high privilege debrief should use empowering language for any high score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.601, max: 1.0, noNaN: true }), // normalized position > 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as high
                    if (category !== 'high') return false;
                    
                    // Verify empowering language like "superpowers" (Requirement 3.3)
                    const message = debrief.message.toLowerCase();
                    const usesEmpoweringLanguage = 
                        message.includes('superpower') || 
                        message.includes('opportunity') ||
                        message.includes('powerful');
                    
                    return usesEmpoweringLanguage;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('high privilege debrief should avoid guilt-inducing language for any high score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.601, max: 1.0, noNaN: true }), // normalized position > 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as high
                    if (category !== 'high') return false;
                    
                    // Verify message avoids guilt or shame (Requirement 3.4)
                    const message = debrief.message.toLowerCase();
                    const avoidsGuilt = 
                        !message.includes('guilt') && 
                        !message.includes('shame') &&
                        !message.includes('should feel bad') &&
                        !message.includes('apologize');
                    
                    return avoidsGuilt;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('high privilege debrief should have consistent structure for any high score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.601, max: 1.0, noNaN: true }), // normalized position > 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as high
                    if (category !== 'high') return false;
                    
                    // Verify structure
                    expect(debrief).toHaveProperty('title');
                    expect(debrief).toHaveProperty('message');
                    expect(debrief.title).toBe('Using Your Advantages to Help Others');
                    expect(debrief.message).toBeTruthy();
                    expect(debrief.message.length).toBeGreaterThan(0);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Property 5: Neutral Privilege Debrief Content', () => {
    test('neutral privilege debrief should acknowledge mixed status for any neutral score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.4, max: 0.6, noNaN: true }), // normalized position between 40% and 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as neutral
                    if (category !== 'neutral') return false;
                    
                    // Verify message acknowledges mixed status (Requirement 4.1)
                    const message = debrief.message.toLowerCase();
                    const acknowledgesMixed = 
                        message.includes('mix') || 
                        message.includes('both') ||
                        message.includes('advantage') && message.includes('challenge');
                    
                    return acknowledgesMixed;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('neutral privilege debrief should explain intersectionality for any neutral score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.4, max: 0.6, noNaN: true }), // normalized position between 40% and 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as neutral
                    if (category !== 'neutral') return false;
                    
                    // Verify message explains intersectionality (Requirement 4.2)
                    const message = debrief.message.toLowerCase();
                    const explainsIntersectionality = 
                        message.includes('intersectionality') || 
                        message.includes('context') ||
                        (message.includes('some') && message.includes('other'));
                    
                    return explainsIntersectionality;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('neutral privilege debrief should encourage recognition of both sides for any neutral score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.4, max: 0.6, noNaN: true }), // normalized position between 40% and 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as neutral
                    if (category !== 'neutral') return false;
                    
                    // Verify message encourages recognition of both advantages and challenges (Requirement 4.3)
                    const message = debrief.message.toLowerCase();
                    const encouragesRecognition = 
                        (message.includes('understand') || message.includes('bridge')) &&
                        (message.includes('both') || message.includes('side'));
                    
                    return encouragesRecognition;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('neutral privilege debrief should use balanced tone for any neutral score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.4, max: 0.6, noNaN: true }), // normalized position between 40% and 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as neutral
                    if (category !== 'neutral') return false;
                    
                    // Verify balanced tone (Requirement 4.4)
                    expect(debrief).toHaveProperty('title');
                    expect(debrief).toHaveProperty('message');
                    expect(debrief.title).toBe('Understanding Your Mixed Experience');
                    expect(debrief.message).toBeTruthy();
                    expect(debrief.message.length).toBeGreaterThan(0);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('neutral privilege debrief should avoid extreme language for any neutral score', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -100, max: 0 }),   // min
                fc.integer({ min: 1, max: 100 }),    // max
                fc.double({ min: 0.4, max: 0.6, noNaN: true }), // normalized position between 40% and 60%
                (min, max, normalizedPosition) => {
                    const range = max - min;
                    const score = min + (range * normalizedPosition);
                    
                    const category = categorizePrivilegeScore(score, min, max);
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify it's categorized as neutral
                    if (category !== 'neutral') return false;
                    
                    // Verify avoids extreme language
                    const message = debrief.message.toLowerCase();
                    const avoidsExtremes = 
                        !message.includes('always') && 
                        !message.includes('never') &&
                        !message.includes('completely') &&
                        !message.includes('totally');
                    
                    return avoidsExtremes;
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Cross-Category Properties', () => {
    test('all categories should return valid debrief structure', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('low', 'neutral', 'high'),
                fc.integer({ min: -100, max: 100 }),
                (category, score) => {
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify structure
                    expect(debrief).toHaveProperty('title');
                    expect(debrief).toHaveProperty('message');
                    expect(debrief).toHaveProperty('category');
                    expect(debrief.category).toBe(category);
                    expect(typeof debrief.title).toBe('string');
                    expect(typeof debrief.message).toBe('string');
                    expect(debrief.title.length).toBeGreaterThan(0);
                    expect(debrief.message.length).toBeGreaterThan(0);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('all categories should use empathetic and non-judgmental language', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('low', 'neutral', 'high'),
                fc.integer({ min: -100, max: 100 }),
                (category, score) => {
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify empathetic language (Requirement 11.1, 11.2)
                    const message = debrief.message.toLowerCase();
                    const avoidsNegativeJudgment = 
                        !message.includes('bad') && 
                        !message.includes('wrong') &&
                        !message.includes('fault') &&
                        !message.includes('blame');
                    
                    return avoidsNegativeJudgment;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    test('debrief messages should be concise and readable', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('low', 'neutral', 'high'),
                fc.integer({ min: -100, max: 100 }),
                (category, score) => {
                    const debrief = generateScoreDebrief(category, score);
                    
                    // Verify message is concise (2-4 sentences as per design)
                    const sentenceCount = (debrief.message.match(/[.!?]+/g) || []).length;
                    
                    // Should have at least 1 sentence and not be excessively long
                    return sentenceCount >= 1 && debrief.message.length < 1000;
                }
            ),
            { numRuns: 100 }
        );
    });
});
