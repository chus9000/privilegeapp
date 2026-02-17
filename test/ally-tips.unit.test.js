/**
 * Unit tests for Ally Tips Module
 * 
 * Tests the ally tips categorization and rendering functionality.
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import { describe, test, expect } from 'vitest';
import { getTipsForScore, categorizeScore, renderTips, allyTips } from '../ally-tips.js';

describe('Ally Tips Module', () => {
    describe('categorizeScore', () => {
        test('should categorize high privilege scores correctly', () => {
            // Score > 60% of range should be high privilege
            // For range -25 to 25 (total 50), 60% = 30 from min = 5
            expect(categorizeScore(15, -25, 25)).toBe('highPrivilege');
            expect(categorizeScore(25, -25, 25)).toBe('highPrivilege');
            expect(categorizeScore(10, -25, 25)).toBe('highPrivilege');
        });
        
        test('should categorize low privilege scores correctly', () => {
            // Score < 40% of range should be low privilege
            // For range -25 to 25 (total 50), 40% = 20 from min = -5
            expect(categorizeScore(-15, -25, 25)).toBe('lowPrivilege');
            expect(categorizeScore(-25, -25, 25)).toBe('lowPrivilege');
            expect(categorizeScore(-10, -25, 25)).toBe('lowPrivilege');
        });
        
        test('should categorize neutral scores correctly', () => {
            // Score between 40% and 60% should be neutral
            expect(categorizeScore(0, -25, 25)).toBe('neutral');
            expect(categorizeScore(3, -25, 25)).toBe('neutral');
            expect(categorizeScore(-3, -25, 25)).toBe('neutral');
        });
        
        test('should work with different ranges', () => {
            // Test with range -10 to 10
            expect(categorizeScore(7, -10, 10)).toBe('highPrivilege');
            expect(categorizeScore(-7, -10, 10)).toBe('lowPrivilege');
            expect(categorizeScore(0, -10, 10)).toBe('neutral');
        });
    });
    
    describe('getTipsForScore', () => {
        test('should return high privilege tips for high scores', () => {
            const tips = getTipsForScore(15, -25, 25);
            expect(tips).toEqual(allyTips.highPrivilege);
            expect(tips).toContain('Use your privilege to amplify marginalized voices');
        });
        
        test('should return low privilege tips for low scores', () => {
            const tips = getTipsForScore(-15, -25, 25);
            expect(tips).toEqual(allyTips.lowPrivilege);
            expect(tips).toContain('Connect with supportive communities');
        });
        
        test('should return neutral tips for neutral scores', () => {
            const tips = getTipsForScore(0, -25, 25);
            expect(tips).toEqual(allyTips.neutral);
            expect(tips).toContain('Recognize that privilege is intersectional');
        });
        
        test('should use default range when not specified', () => {
            const tips = getTipsForScore(15);
            expect(tips).toEqual(allyTips.highPrivilege);
        });
    });
    
    describe('renderTips', () => {
        test('should render tips with correct HTML structure', () => {
            const tips = ['Tip 1', 'Tip 2', 'Tip 3'];
            const html = renderTips(tips, 'highPrivilege');
            
            expect(html).toContain('ally-tips-section');
            expect(html).toContain('Using Your Privilege to Support Others');
            expect(html).toContain('Tip 1');
            expect(html).toContain('Tip 2');
            expect(html).toContain('Tip 3');
            expect(html).toContain('ally-tip-item');
        });
        
        test('should render correct title for each category', () => {
            const tips = ['Test tip'];
            
            const highHtml = renderTips(tips, 'highPrivilege');
            expect(highHtml).toContain('Using Your Privilege to Support Others');
            
            const neutralHtml = renderTips(tips, 'neutral');
            expect(neutralHtml).toContain('Understanding Intersectionality');
            
            const lowHtml = renderTips(tips, 'lowPrivilege');
            expect(lowHtml).toContain('Self-Advocacy and Community Building');
        });
        
        test('should render all tips as list items', () => {
            const tips = ['Tip 1', 'Tip 2', 'Tip 3'];
            const html = renderTips(tips, 'neutral');
            
            const tipCount = (html.match(/ally-tip-item/g) || []).length;
            expect(tipCount).toBe(tips.length);
        });
    });
    
    describe('allyTips content', () => {
        test('should have tips for all categories', () => {
            expect(allyTips.highPrivilege).toBeDefined();
            expect(allyTips.neutral).toBeDefined();
            expect(allyTips.lowPrivilege).toBeDefined();
        });
        
        test('should have at least 5 tips per category', () => {
            expect(allyTips.highPrivilege.length).toBeGreaterThanOrEqual(5);
            expect(allyTips.neutral.length).toBeGreaterThanOrEqual(5);
            expect(allyTips.lowPrivilege.length).toBeGreaterThanOrEqual(5);
        });
        
        test('tips should be non-empty strings', () => {
            [...allyTips.highPrivilege, ...allyTips.neutral, ...allyTips.lowPrivilege].forEach(tip => {
                expect(typeof tip).toBe('string');
                expect(tip.length).toBeGreaterThan(0);
            });
        });
    });
});
