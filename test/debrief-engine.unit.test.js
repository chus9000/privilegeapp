/**
 * Unit tests for Debrief Engine Module
 * 
 * Tests the score categorization and normalization functionality.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, test, expect } from 'vitest';
import { categorizePrivilegeScore, normalizeScore, generateScoreDebrief, formatScore } from '../debrief-engine.js';

describe('Debrief Engine Module', () => {
    describe('normalizeScore', () => {
        test('should normalize score to 0-1 range', () => {
            expect(normalizeScore(0, -25, 25)).toBe(0.5);
            expect(normalizeScore(-25, -25, 25)).toBe(0);
            expect(normalizeScore(25, -25, 25)).toBe(1);
        });
        
        test('should handle positive ranges', () => {
            expect(normalizeScore(5, 0, 10)).toBe(0.5);
            expect(normalizeScore(0, 0, 10)).toBe(0);
            expect(normalizeScore(10, 0, 10)).toBe(1);
        });
        
        test('should handle negative ranges', () => {
            expect(normalizeScore(-5, -10, 0)).toBe(0.5);
            expect(normalizeScore(-10, -10, 0)).toBe(0);
            expect(normalizeScore(0, -10, 0)).toBe(1);
        });
        
        test('should clamp scores outside range', () => {
            expect(normalizeScore(30, -25, 25)).toBe(1);
            expect(normalizeScore(-30, -25, 25)).toBe(0);
        });
        
        test('should handle edge case where min equals max', () => {
            expect(normalizeScore(5, 5, 5)).toBe(0.5);
        });
    });
    
    describe('categorizePrivilegeScore', () => {
        test('should categorize high privilege scores correctly', () => {
            // Score > 60% of range should be high privilege
            // For range -25 to 25 (total 50), 60% = 30 from min = 5
            expect(categorizePrivilegeScore(15, -25, 25)).toBe('high');
            expect(categorizePrivilegeScore(25, -25, 25)).toBe('high');
            expect(categorizePrivilegeScore(10, -25, 25)).toBe('high');
        });
        
        test('should categorize low privilege scores correctly', () => {
            // Score < 40% of range should be low privilege
            // For range -25 to 25 (total 50), 40% = 20 from min = -5
            expect(categorizePrivilegeScore(-15, -25, 25)).toBe('low');
            expect(categorizePrivilegeScore(-25, -25, 25)).toBe('low');
            expect(categorizePrivilegeScore(-10, -25, 25)).toBe('low');
        });
        
        test('should categorize neutral scores correctly', () => {
            // Score between 40% and 60% should be neutral
            expect(categorizePrivilegeScore(0, -25, 25)).toBe('neutral');
            expect(categorizePrivilegeScore(3, -25, 25)).toBe('neutral');
            expect(categorizePrivilegeScore(-3, -25, 25)).toBe('neutral');
        });
        
        test('should work with different ranges', () => {
            // Test with range -10 to 10
            expect(categorizePrivilegeScore(7, -10, 10)).toBe('high');
            expect(categorizePrivilegeScore(-7, -10, 10)).toBe('low');
            expect(categorizePrivilegeScore(0, -10, 10)).toBe('neutral');
        });
        
        test('should handle boundary values correctly', () => {
            // For range -25 to 25:
            // 40% threshold = -25 + (50 * 0.4) = -5
            // 60% threshold = -25 + (50 * 0.6) = 5
            
            // Exactly at 40% threshold should be neutral
            expect(categorizePrivilegeScore(-5, -25, 25)).toBe('neutral');
            
            // Exactly at 60% threshold should be neutral
            expect(categorizePrivilegeScore(5, -25, 25)).toBe('neutral');
            
            // Just above 60% threshold should be high
            expect(categorizePrivilegeScore(5.1, -25, 25)).toBe('high');
            
            // Just below 40% threshold should be low
            expect(categorizePrivilegeScore(-5.1, -25, 25)).toBe('low');
        });
        
        test('should handle asymmetric ranges', () => {
            // Range -10 to 30 (total 40)
            // 40% = -10 + 16 = 6
            // 60% = -10 + 24 = 14
            expect(categorizePrivilegeScore(20, -10, 30)).toBe('high');
            expect(categorizePrivilegeScore(0, -10, 30)).toBe('low');
            expect(categorizePrivilegeScore(10, -10, 30)).toBe('neutral');
        });
        
        test('should clamp out-of-range scores before categorizing', () => {
            // Scores outside range should be clamped
            expect(categorizePrivilegeScore(100, -25, 25)).toBe('high');
            expect(categorizePrivilegeScore(-100, -25, 25)).toBe('low');
        });
    });
    
    describe('generateScoreDebrief', () => {
        test('should generate low privilege debrief message', () => {
            const debrief = generateScoreDebrief('low', -15);
            
            expect(debrief).toHaveProperty('title');
            expect(debrief).toHaveProperty('message');
            expect(debrief).toHaveProperty('category', 'low');
            expect(debrief.title).toBe('Your Journey and Resilience');
            expect(debrief.message).toContain('challenges');
            expect(debrief.message).toContain('resilience');
        });
        
        test('should generate neutral privilege debrief message', () => {
            const debrief = generateScoreDebrief('neutral', 0);
            
            expect(debrief).toHaveProperty('title');
            expect(debrief).toHaveProperty('message');
            expect(debrief).toHaveProperty('category', 'neutral');
            expect(debrief.title).toBe('Understanding Your Mixed Experience');
            expect(debrief.message).toContain('mix');
            expect(debrief.message).toContain('intersectionality');
        });
        
        test('should generate high privilege debrief message', () => {
            const debrief = generateScoreDebrief('high', 15);
            
            expect(debrief).toHaveProperty('title');
            expect(debrief).toHaveProperty('message');
            expect(debrief).toHaveProperty('category', 'high');
            expect(debrief.title).toBe('Using Your Advantages to Help Others');
            expect(debrief.message).toContain('advantages');
            expect(debrief.message).toContain('superpowers');
        });
        
        test('should return fallback message for invalid category', () => {
            const debrief = generateScoreDebrief('invalid', 0);
            
            expect(debrief).toHaveProperty('title', 'Understanding Your Score');
            expect(debrief).toHaveProperty('message');
            expect(debrief.message).toContain('unique combination');
        });
        
        test('should include category in return object', () => {
            const lowDebrief = generateScoreDebrief('low', -10);
            const neutralDebrief = generateScoreDebrief('neutral', 0);
            const highDebrief = generateScoreDebrief('high', 10);
            
            expect(lowDebrief.category).toBe('low');
            expect(neutralDebrief.category).toBe('neutral');
            expect(highDebrief.category).toBe('high');
        });
        
        test('low privilege message should avoid victimization language', () => {
            const debrief = generateScoreDebrief('low', -15);
            
            // Should not contain words that reinforce deficit narratives
            expect(debrief.message.toLowerCase()).not.toContain('victim');
            expect(debrief.message.toLowerCase()).not.toContain('unfortunate');
            expect(debrief.message.toLowerCase()).not.toContain('poor');
            
            // Should contain empowering language
            expect(debrief.message).toContain('strength');
        });
        
        test('high privilege message should avoid guilt language', () => {
            const debrief = generateScoreDebrief('high', 15);
            
            // Should not contain words that induce guilt or shame
            expect(debrief.message.toLowerCase()).not.toContain('guilt');
            expect(debrief.message.toLowerCase()).not.toContain('shame');
            expect(debrief.message.toLowerCase()).not.toContain('sorry');
            
            // Should contain empowering language
            expect(debrief.message).toContain('opportunity');
        });
        
        test('neutral message should use balanced tone', () => {
            const debrief = generateScoreDebrief('neutral', 0);
            
            // Should acknowledge both sides
            expect(debrief.message).toContain('advantages');
            expect(debrief.message).toContain('challenges');
        });
    });

    describe('formatScore', () => {
        test('should prefix positive scores with "+"', () => {
            expect(formatScore(5)).toBe('+5');
            expect(formatScore(1)).toBe('+1');
            expect(formatScore(25)).toBe('+25');
        });

        test('should prefix negative scores with "-"', () => {
            expect(formatScore(-5)).toBe('-5');
            expect(formatScore(-1)).toBe('-1');
            expect(formatScore(-25)).toBe('-25');
        });

        test('should display zero without prefix', () => {
            expect(formatScore(0)).toBe('0');
        });
    });
});
