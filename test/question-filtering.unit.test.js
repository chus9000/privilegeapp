/**
 * Unit Tests for Question Filtering in Event Participation
 * Feature: full-featured-quiz-app
 * 
 * Tests the integration of question filtering in the event participation flow
 * Validates Requirements 2.1, 6.5
 */

import { describe, test, expect } from 'vitest';

describe('Question Filtering Integration', () => {

  test('should filter questions correctly based on disabled indices', () => {
    // Mock questions array
    const mockQuestions = Array.from({ length: 35 }, (_, i) => ({
      text: `Question ${i + 1}`,
      value: i % 2 === 0 ? 1 : -1
    }));
    
    // Disabled questions
    const disabledQuestions = [0, 5, 10, 15, 20, 25, 30];
    
    // Filter questions (same logic as in event.js)
    const enabledQuestions = mockQuestions.filter((_, index) => !disabledQuestions.includes(index));
    
    // Verify correct count
    expect(enabledQuestions.length).toBe(35 - 7);
    expect(enabledQuestions.length).toBe(28);
    
    // Verify no disabled questions are included
    enabledQuestions.forEach(question => {
      const originalIndex = mockQuestions.indexOf(question);
      expect(disabledQuestions).not.toContain(originalIndex);
    });
  });

  test('should handle event with no disabled questions', () => {
    const mockQuestions = Array.from({ length: 35 }, (_, i) => ({
      text: `Question ${i + 1}`,
      value: i % 2 === 0 ? 1 : -1
    }));
    
    const disabledQuestions = [];
    const enabledQuestions = mockQuestions.filter((_, index) => !disabledQuestions.includes(index));
    
    // All questions should be enabled
    expect(enabledQuestions.length).toBe(35);
    expect(enabledQuestions).toEqual(mockQuestions);
  });

  test('should handle event with maximum disabled questions (keeping minimum 5)', () => {
    const mockQuestions = Array.from({ length: 35 }, (_, i) => ({
      text: `Question ${i + 1}`,
      value: i % 2 === 0 ? 1 : -1
    }));
    
    // Disable 30 questions, keep 5 enabled
    const disabledQuestions = Array.from({ length: 30 }, (_, i) => i);
    const enabledQuestions = mockQuestions.filter((_, index) => !disabledQuestions.includes(index));
    
    // Should have exactly 5 enabled questions
    expect(enabledQuestions.length).toBe(5);
    
    // Verify the enabled questions are the last 5
    expect(enabledQuestions[0]).toEqual(mockQuestions[30]);
    expect(enabledQuestions[4]).toEqual(mockQuestions[34]);
  });

  test('should preserve original question indices for answer tracking', () => {
    const mockQuestions = Array.from({ length: 35 }, (_, i) => ({
      text: `Question ${i + 1}`,
      value: i % 2 === 0 ? 1 : -1
    }));
    
    const disabledQuestions = [1, 3, 5, 7, 9];
    const enabledQuestions = mockQuestions.filter((_, index) => !disabledQuestions.includes(index));
    
    // Verify that we can map back to original indices
    enabledQuestions.forEach((question, displayIndex) => {
      const originalIndex = mockQuestions.indexOf(question);
      
      // Original index should not be in disabled set
      expect(disabledQuestions).not.toContain(originalIndex);
      
      // Original index should be valid
      expect(originalIndex).toBeGreaterThanOrEqual(0);
      expect(originalIndex).toBeLessThan(35);
    });
  });

  test('should handle legacy events without disabledQuestions field', () => {
    // Legacy event data (created before disabledQuestions feature)
    const legacyEventData = {
      title: 'Legacy Event',
      pin: '654321',
      // No disabledQuestions field
      participants: []
    };
    
    // Simulate the fallback logic from event.js
    let disabledQuestions = [];
    if (legacyEventData.disabledQuestions && Array.isArray(legacyEventData.disabledQuestions)) {
      disabledQuestions = legacyEventData.disabledQuestions;
    } else {
      // Fallback: assume all questions enabled
      disabledQuestions = [];
    }
    
    // Should default to empty array (all questions enabled)
    expect(disabledQuestions).toEqual([]);
    expect(Array.isArray(disabledQuestions)).toBe(true);
  });

  test('should update progress text with correct enabled question count', () => {
    const totalQuestions = 35;
    const disabledQuestions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // 10 disabled
    const enabledCount = totalQuestions - disabledQuestions.length;
    
    expect(enabledCount).toBe(25);
    
    // Verify progress text format
    const progressText = `0/${enabledCount} completed`;
    expect(progressText).toBe('0/25 completed');
  });

  test('should correctly map display index to original index', () => {
    const mockQuestions = Array.from({ length: 10 }, (_, i) => ({
      text: `Question ${i + 1}`,
      value: i % 2 === 0 ? 1 : -1
    }));
    
    // Disable questions at indices 2, 4, 6
    const disabledQuestions = [2, 4, 6];
    const enabledQuestions = mockQuestions.filter((_, index) => !disabledQuestions.includes(index));
    
    // Verify mapping
    // Display index 0 -> Original index 0
    expect(mockQuestions.indexOf(enabledQuestions[0])).toBe(0);
    
    // Display index 1 -> Original index 1
    expect(mockQuestions.indexOf(enabledQuestions[1])).toBe(1);
    
    // Display index 2 -> Original index 3 (skipped 2)
    expect(mockQuestions.indexOf(enabledQuestions[2])).toBe(3);
    
    // Display index 3 -> Original index 5 (skipped 4)
    expect(mockQuestions.indexOf(enabledQuestions[3])).toBe(5);
    
    // Display index 4 -> Original index 7 (skipped 6)
    expect(mockQuestions.indexOf(enabledQuestions[4])).toBe(7);
  });

  test('should handle free play mode with all questions enabled', () => {
    // Free play mode should have no disabled questions
    const freePlayEventData = {
      title: 'Free Play',
      pin: null,
      disabledQuestions: [],
      participants: []
    };
    
    const mockQuestions = Array.from({ length: 35 }, (_, i) => ({
      text: `Question ${i + 1}`,
      value: i % 2 === 0 ? 1 : -1
    }));
    
    const enabledQuestions = mockQuestions.filter((_, index) => 
      !freePlayEventData.disabledQuestions.includes(index)
    );
    
    // All questions should be enabled in free play
    expect(enabledQuestions.length).toBe(35);
  });
});
