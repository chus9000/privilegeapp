/**
 * Integration tests for Ally Tips on Results Pages
 * 
 * Tests the complete integration of ally tips on both free play and event results pages.
 * Requirements: 2.4, 9.1
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { getTipsForScore, categorizeScore, renderTips } from '../ally-tips.js';

describe('Ally Tips Integration on Results Pages', () => {
    describe('Free Play Results - Ally Tips Display', () => {
        test('should display ally tips for high privilege score in free play', () => {
            const userScore = 20;
            const min = -25;
            const max = 25;
            
            const allyTipsArray = getTipsForScore(userScore, min, max);
            const category = categorizeScore(userScore, min, max);
            const allyTipsHTML = renderTips(allyTipsArray, category);
            
            expect(category).toBe('highPrivilege');
            expect(allyTipsHTML).toContain('ally-tips-section');
            expect(allyTipsHTML).toContain('Using Your Privilege to Support Others');
            expect(allyTipsHTML).toContain('Use your privilege to amplify marginalized voices');
        });
        
        test('should display ally tips for low privilege score in free play', () => {
            const userScore = -20;
            const min = -25;
            const max = 25;
            
            const allyTipsArray = getTipsForScore(userScore, min, max);
            const category = categorizeScore(userScore, min, max);
            const allyTipsHTML = renderTips(allyTipsArray, category);
            
            expect(category).toBe('lowPrivilege');
            expect(allyTipsHTML).toContain('ally-tips-section');
            expect(allyTipsHTML).toContain('Self-Advocacy and Community Building');
            expect(allyTipsHTML).toContain('Connect with supportive communities');
        });
        
        test('should display ally tips for neutral score in free play', () => {
            const userScore = 0;
            const min = -25;
            const max = 25;
            
            const allyTipsArray = getTipsForScore(userScore, min, max);
            const category = categorizeScore(userScore, min, max);
            const allyTipsHTML = renderTips(allyTipsArray, category);
            
            expect(category).toBe('neutral');
            expect(allyTipsHTML).toContain('ally-tips-section');
            expect(allyTipsHTML).toContain('Understanding Intersectionality');
            expect(allyTipsHTML).toContain('Recognize that privilege is intersectional');
        });
    });
    
    describe('Event Results - Ally Tips Display in Modal', () => {
        test('should display ally tips for high privilege participant in event modal', () => {
            const participant = {
                id: 'test-123',
                name: 'Test User',
                avatar: '🐱',
                score: 15
            };
            
            const spectrumConfig = { min: -20, max: 20 };
            
            const allyTipsArray = getTipsForScore(participant.score, spectrumConfig.min, spectrumConfig.max);
            const category = categorizeScore(participant.score, spectrumConfig.min, spectrumConfig.max);
            const allyTipsHTML = renderTips(allyTipsArray, category);
            
            expect(category).toBe('highPrivilege');
            expect(allyTipsHTML).toContain('ally-tips-section');
            expect(allyTipsHTML).toContain('Using Your Privilege to Support Others');
        });
        
        test('should display ally tips for low privilege participant in event modal', () => {
            const participant = {
                id: 'test-456',
                name: 'Another User',
                avatar: '🐶',
                score: -15
            };
            
            const spectrumConfig = { min: -20, max: 20 };
            
            const allyTipsArray = getTipsForScore(participant.score, spectrumConfig.min, spectrumConfig.max);
            const category = categorizeScore(participant.score, spectrumConfig.min, spectrumConfig.max);
            const allyTipsHTML = renderTips(allyTipsArray, category);
            
            expect(category).toBe('lowPrivilege');
            expect(allyTipsHTML).toContain('ally-tips-section');
            expect(allyTipsHTML).toContain('Self-Advocacy and Community Building');
        });
        
        test('should adapt to dynamic spectrum range in events', () => {
            // Test with smaller range (fewer questions enabled)
            const participant = {
                id: 'test-789',
                name: 'Small Range User',
                avatar: '🦊',
                score: 8
            };
            
            const spectrumConfig = { min: -10, max: 10 };
            
            const allyTipsArray = getTipsForScore(participant.score, spectrumConfig.min, spectrumConfig.max);
            const category = categorizeScore(participant.score, spectrumConfig.min, spectrumConfig.max);
            const allyTipsHTML = renderTips(allyTipsArray, category);
            
            // Score of 8 in range -10 to 10 is 90% of max, so high privilege
            expect(category).toBe('highPrivilege');
            expect(allyTipsHTML).toContain('ally-tips-section');
        });
    });
    
    describe('Ally Tips Content Quality', () => {
        test('should provide actionable tips for all categories', () => {
            const scores = [20, 0, -20];
            const min = -25;
            const max = 25;
            
            scores.forEach(score => {
                const allyTipsArray = getTipsForScore(score, min, max);
                const category = categorizeScore(score, min, max);
                const allyTipsHTML = renderTips(allyTipsArray, category);
                
                // Verify tips are present
                expect(allyTipsArray.length).toBeGreaterThan(0);
                
                // Verify HTML structure
                expect(allyTipsHTML).toContain('ally-tips-section');
                expect(allyTipsHTML).toContain('ally-tips-list');
                expect(allyTipsHTML).toContain('ally-tip-item');
                
                // Verify all tips are rendered
                allyTipsArray.forEach(tip => {
                    expect(allyTipsHTML).toContain(tip);
                });
            });
        });
        
        test('should include educational intro text', () => {
            const allyTipsArray = getTipsForScore(10, -25, 25);
            const category = categorizeScore(10, -25, 25);
            const allyTipsHTML = renderTips(allyTipsArray, category);
            
            expect(allyTipsHTML).toContain('Based on your privilege status');
            expect(allyTipsHTML).toContain('ways to be a better ally');
        });
        
        test('should use appropriate emoji and styling', () => {
            const allyTipsArray = getTipsForScore(0, -25, 25);
            const category = categorizeScore(0, -25, 25);
            const allyTipsHTML = renderTips(allyTipsArray, category);
            
            expect(allyTipsHTML).toContain('💡');
            expect(allyTipsHTML).toContain('ally-tips-intro');
        });
    });
    
    describe('Requirements Validation', () => {
        test('Requirement 2.4: Free play results show ally tips based on score', () => {
            // Test that free play mode displays ally tips
            const userScore = 12;
            const min = -25;
            const max = 25;
            
            const allyTipsArray = getTipsForScore(userScore, min, max);
            const category = categorizeScore(userScore, min, max);
            const allyTipsHTML = renderTips(allyTipsArray, category);
            
            // Verify tips are personalized based on score
            expect(category).toBe('highPrivilege');
            expect(allyTipsHTML).toContain('ally-tips-section');
            expect(allyTipsArray.length).toBeGreaterThan(0);
        });
        
        test('Requirement 9.1: Score screen includes ally tips content', () => {
            // Test that both free play and event results include ally tips
            const scores = [15, 0, -15];
            const min = -25;
            const max = 25;
            
            scores.forEach(score => {
                const allyTipsArray = getTipsForScore(score, min, max);
                const category = categorizeScore(score, min, max);
                const allyTipsHTML = renderTips(allyTipsArray, category);
                
                // Verify ally tips content is included
                expect(allyTipsHTML).toContain('ally-tips-section');
                expect(allyTipsArray.length).toBeGreaterThanOrEqual(5);
            });
        });
    });
});
