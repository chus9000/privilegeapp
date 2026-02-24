/**
 * Unit tests for multi-theme debrief functionality
 * 
 * Tests the new intersectional privilege analysis system
 */

import { describe, test, expect } from 'vitest';
import { generateResponseExplanation } from '../debrief-engine.js';

describe('Multi-Theme Debrief System', () => {
    // Question that should trigger multiple themes
    const intersectionalQuestion = {
        text: 'Have you ever feared for your safety while walking home at night because of your race or gender?',
        value: -3
    };

    const economicSocialQuestion = {
        text: 'Have you worried about being able to afford dinner with friends?',
        value: -2
    };

    describe('Theme Detection', () => {
        test('should detect multiple themes in intersectional questions', () => {
            // This question should detect both identity and safety themes
            const result = generateResponseExplanation(intersectionalQuestion, 1);
            const lower = result.toLowerCase();
            
            // Should mention both identity and safety concepts
            expect(lower).toMatch(/identity|perceived|race|gender/);
            expect(lower).toMatch(/safety|safe|secure|fear/);
        });

        test('should detect economic and social themes together', () => {
            const result = generateResponseExplanation(economicSocialQuestion, 1);
            const lower = result.toLowerCase();
            
            // Should mention both economic and social concepts
            expect(lower).toMatch(/economic|financial|afford/);
            expect(lower).toMatch(/social|friend|participate|connection/);
        });
    });

    describe('Explanation Styles', () => {
        test('focused style should work with single theme', () => {
            const config = {
                maxThemesPerResponse: 1,
                explanationStyle: 'focused'
            };
            
            const result = generateResponseExplanation(intersectionalQuestion, 1, config);
            
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(50);
            // Should not mention "this question touches on both"
            expect(result.toLowerCase()).not.toContain('touches on both');
        });

        test('nuanced style should show intersectionality', () => {
            const config = {
                maxThemesPerResponse: 2,
                explanationStyle: 'nuanced'
            };
            
            const result = generateResponseExplanation(intersectionalQuestion, 1, config);
            const lower = result.toLowerCase();
            
            // Should indicate multiple themes
            expect(lower).toMatch(/both|intersect|touches on/);
        });

        test('comprehensive style should provide detailed breakdown', () => {
            const config = {
                maxThemesPerResponse: 5,
                explanationStyle: 'comprehensive'
            };
            
            const result = generateResponseExplanation(intersectionalQuestion, 1, config);
            
            // Comprehensive style should be longer and more detailed
            expect(result.length).toBeGreaterThan(200);
            expect(result.toLowerCase()).toContain('intersecting');
        });
    });

    describe('Configuration Options', () => {
        test('maxThemesPerResponse should limit theme count', () => {
            const config1 = {
                maxThemesPerResponse: 1,
                explanationStyle: 'focused'
            };
            
            const config2 = {
                maxThemesPerResponse: 2,
                explanationStyle: 'nuanced'
            };
            
            const result1 = generateResponseExplanation(intersectionalQuestion, 1, config1);
            const result2 = generateResponseExplanation(intersectionalQuestion, 1, config2);
            
            // Results should be different based on config
            expect(result1).not.toBe(result2);
        });

        test('questionOverrides should allow custom configuration', () => {
            const config = {
                maxThemesPerResponse: 2,
                explanationStyle: 'nuanced',
                questionOverrides: {
                    [intersectionalQuestion.text]: {
                        themes: ['identity', 'safety'],
                        style: 'comprehensive'
                    }
                }
            };
            
            const result = generateResponseExplanation(intersectionalQuestion, 1, config);
            
            // Should use comprehensive style due to override
            expect(result.length).toBeGreaterThan(200);
        });
    });

    describe('Backward Compatibility', () => {
        test('should work without config parameter (uses default)', () => {
            const result = generateResponseExplanation(intersectionalQuestion, 1);
            
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(50);
        });

        test('should handle all answer types', () => {
            const result0 = generateResponseExplanation(intersectionalQuestion, 0);
            const result1 = generateResponseExplanation(intersectionalQuestion, 1);
            
            expect(typeof result0).toBe('string');
            expect(typeof result1).toBe('string');
            expect(result0).not.toBe(result1);
        });

        test('should handle edge cases gracefully', () => {
            const config = {
                maxThemesPerResponse: 2,
                explanationStyle: 'nuanced'
            };
            
            // Null question
            expect(() => generateResponseExplanation(null, 1, config)).not.toThrow();
            
            // Missing text
            expect(() => generateResponseExplanation({ value: 1 }, 1, config)).not.toThrow();
            
            // Empty text
            expect(() => generateResponseExplanation({ text: '', value: 1 }, 1, config)).not.toThrow();
        });
    });

    describe('Privilege vs Challenge Framing', () => {
        test('should frame privilege correctly for positive-value questions', () => {
            const privilegeQuestion = {
                text: 'Can you afford to take time off work when needed?',
                value: 2
            };
            
            const privilegeResult = generateResponseExplanation(privilegeQuestion, 1);
            const challengeResult = generateResponseExplanation(privilegeQuestion, 0);
            
            expect(privilegeResult.toLowerCase()).toMatch(/advantage|privilege|benefit/);
            expect(challengeResult.toLowerCase()).toMatch(/challenge|barrier|difficulty|obstacle/);
        });

        test('should frame privilege correctly for negative-value questions', () => {
            const hardshipQuestion = {
                text: 'Did your parents work multiple jobs to make ends meet?',
                value: -2
            };
            
            // Answer 1 (Yes) = experienced hardship = challenge
            const challengeResult = generateResponseExplanation(hardshipQuestion, 1);
            // Answer 0 (No) = did not experience hardship = privilege
            const privilegeResult = generateResponseExplanation(hardshipQuestion, 0);
            
            expect(challengeResult.toLowerCase()).toMatch(/challenge|barrier|difficulty|obstacle/);
            expect(privilegeResult.toLowerCase()).toMatch(/advantage|privilege|benefit/);
        });
    });

    describe('Ally Connection', () => {
        test('should include ally connection in all explanation styles', () => {
            const configs = [
                { maxThemesPerResponse: 1, explanationStyle: 'focused' },
                { maxThemesPerResponse: 2, explanationStyle: 'nuanced' },
                { maxThemesPerResponse: 5, explanationStyle: 'comprehensive' }
            ];
            
            configs.forEach(config => {
                const result = generateResponseExplanation(intersectionalQuestion, 1, config);
                const lower = result.toLowerCase();
                
                // Should mention ally-related concepts
                expect(lower).toMatch(/support|advocate|amplify|empowers|understanding|help|stand up|challenge/);
            });
        });
    });
});
