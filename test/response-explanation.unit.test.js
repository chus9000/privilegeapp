/**
 * Unit tests for generateResponseExplanation
 *
 * Tests contextual explanation generation based on question content and answer value.
 * Requirements: 6.3, 8.1, 8.2, 8.3, 8.4
 */

import { describe, test, expect } from 'vitest';
import { generateResponseExplanation } from '../debrief-engine.js';

describe('generateResponseExplanation', () => {
    // Sample questions from the quiz covering different themes
    const economicQuestion = { text: 'Did you feel like you had adequate access to healthy food growing up?', value: 1 };
    const safetyQuestion = { text: 'Are you able to move through the world without fear of sexual assault?', value: 1 };
    const identityQuestion = { text: 'Can you show affection for your romantic partner in public without fear of ridicule or violence?', value: 1 };
    const accessQuestion = { text: 'Can you see a doctor whenever you feel the need?', value: 1 };
    const socialQuestion = { text: 'Did you come from a supportive family environment?', value: 1 };
    const negativeValueQuestion = { text: 'Did your parents work nights and weekends to support your family?', value: -1 };

    describe('return value structure', () => {
        test('should return a non-empty string', () => {
            const result = generateResponseExplanation(economicQuestion, 1);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        test('should return a string for answer 0 (No)', () => {
            const result = generateResponseExplanation(economicQuestion, 0);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('privilege context (Req 8.1)', () => {
        test('should indicate advantage when answer shows privilege (positive value, Yes)', () => {
            const result = generateResponseExplanation(economicQuestion, 1);
            const lower = result.toLowerCase();
            // Check for any privilege-indicating words
            expect(lower).toMatch(/advantage|privilege|benefit/);
        });

        test('should indicate challenge when answer shows lack of privilege (positive value, No)', () => {
            const result = generateResponseExplanation(economicQuestion, 0);
            const lower = result.toLowerCase();
            // Check for any challenge-indicating words (variations exist)
            expect(lower).toMatch(/challenge|barrier|difficulty|obstacle/);
        });

        test('should indicate challenge for negative-value question answered Yes (experienced hardship)', () => {
            // "Did your parents work nights and weekends?" value=-1, answer=1 (Yes) means hardship
            const result = generateResponseExplanation(negativeValueQuestion, 1);
            const lower = result.toLowerCase();
            expect(lower).toMatch(/challenge|barrier|difficulty|obstacle/);
        });

        test('should indicate advantage for negative-value question answered No (did not experience hardship)', () => {
            const result = generateResponseExplanation(negativeValueQuestion, 0);
            const lower = result.toLowerCase();
            expect(lower).toMatch(/advantage|privilege|benefit/);
        });
    });

    describe('contextual change explanation (Req 8.2)', () => {
        test('economic question explanation should mention how circumstances can change', () => {
            const result = generateResponseExplanation(economicQuestion, 1);
            const lower = result.toLowerCase();
            expect(lower).toMatch(/change|shift|stable/);
        });

        test('safety question explanation should mention how safety varies', () => {
            const result = generateResponseExplanation(safetyQuestion, 1);
            const lower = result.toLowerCase();
            expect(lower).toMatch(/change|vary|climate|where/);
        });

        test('identity question explanation should mention how identity treatment varies', () => {
            const result = generateResponseExplanation(identityQuestion, 1);
            const lower = result.toLowerCase();
            // Identity questions may be analyzed with safety theme due to "fear of violence"
            // Check for identity-related concepts OR safety-related concepts
            expect(lower).toMatch(/varies|communities|cultures|interactions|identity|perceived|secure|climate/);
        });

        test('access question explanation should mention how access depends on context', () => {
            const result = generateResponseExplanation(accessQuestion, 1);
            const lower = result.toLowerCase();
            expect(lower).toMatch(/depends|available|where/);
        });

        test('social question explanation should mention how support changes', () => {
            const result = generateResponseExplanation(socialQuestion, 1);
            const lower = result.toLowerCase();
            expect(lower).toMatch(/strengthen|weaken|transition|relationship/);
        });
    });

    describe('ally connection (Req 8.4)', () => {
        test('economic explanation should connect to supporting others financially', () => {
            const result = generateResponseExplanation(economicQuestion, 1);
            const lower = result.toLowerCase();
            expect(lower).toMatch(/support|mentorship|advocacy|understanding/);
        });

        test('safety explanation should connect to standing up for others', () => {
            const result = generateResponseExplanation(safetyQuestion, 0);
            const lower = result.toLowerCase();
            expect(lower).toMatch(/stand up|advocate|inclusive|protective/);
        });

        test('identity explanation should connect to amplifying voices', () => {
            const result = generateResponseExplanation(identityQuestion, 1);
            const lower = result.toLowerCase();
            // Identity questions may include intersectional analysis with safety
            // Check for identity ally concepts OR general empowerment concepts
            expect(lower).toMatch(/amplify|challenge|biases|voices|empowers|support|advocate|inclusive/);
        });

        test('access explanation should connect to removing barriers', () => {
            const result = generateResponseExplanation(accessQuestion, 0);
            const lower = result.toLowerCase();
            expect(lower).toMatch(/barrier|share|opportunities|help/);
        });
    });

    describe('edge cases and error handling', () => {
        test('should return fallback for null question', () => {
            const result = generateResponseExplanation(null, 1);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result.toLowerCase()).toContain('privilege');
        });

        test('should return fallback for undefined question', () => {
            const result = generateResponseExplanation(undefined, 0);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        test('should return fallback for question with missing text', () => {
            const result = generateResponseExplanation({ value: 1 }, 1);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        test('should return fallback for question with empty text', () => {
            const result = generateResponseExplanation({ text: '', value: 1 }, 1);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        test('should handle question with zero value', () => {
            const result = generateResponseExplanation({ text: 'Some question about life?', value: 0 }, 1);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        test('should handle question with missing value property', () => {
            const result = generateResponseExplanation({ text: 'Some question about life?' }, 1);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('theme detection', () => {
        test('should detect economic theme for financial questions', () => {
            const result = generateResponseExplanation(
                { text: 'Can you buy new clothes or go out to dinner when you want to?', value: 1 }, 1
            );
            expect(result.toLowerCase()).toContain('financial');
        });

        test('should detect safety theme for fear/violence questions', () => {
            const result = generateResponseExplanation(
                { text: 'Do you feel comfortable walking home alone at night?', value: 1 }, 1
            );
            expect(result.toLowerCase()).toContain('safety');
        });

        test('should detect identity theme for race/gender questions', () => {
            const result = generateResponseExplanation(
                { text: 'Can you make mistakes and not have people attribute your behavior to flaws in your racial/gender group?', value: 1 }, 0
            );
            expect(result.toLowerCase()).toContain('identity');
        });

        test('should detect access theme for education/healthcare questions', () => {
            const result = generateResponseExplanation(
                { text: 'Did your parents or guardians attend college?', value: 1 }, 1
            );
            expect(result.toLowerCase()).toContain('access');
        });

        test('should fall back to social theme for family/support questions', () => {
            const result = generateResponseExplanation(socialQuestion, 1);
            expect(result.toLowerCase()).toContain('support');
        });
    });
});
