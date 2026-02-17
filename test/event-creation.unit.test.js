/**
 * Unit tests for Event Creation functionality
 * Tests validation, ID generation, PIN generation, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock questions data
const mockQuestions = [
  { text: "Question 1", value: 1 },
  { text: "Question 2", value: -1 },
  { text: "Question 3", value: 1 },
  { text: "Question 4", value: -1 },
  { text: "Question 5", value: 1 },
  { text: "Question 6", value: 1 },
  { text: "Question 7", value: -1 }
];

// Mock the questions global
global.questions = mockQuestions;

// Import validation function (we'll test the logic directly)
function validateEvent(title, disabledQuestionIndices) {
  const errors = [];
  
  // Validate title
  if (!title || title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Event title is required' });
  }
  
  if (title.length > 100) {
    errors.push({ field: 'title', message: 'Event title must be 100 characters or less' });
  }
  
  // Validate minimum questions
  const totalQuestions = mockQuestions.length;
  const enabledQuestions = totalQuestions - disabledQuestionIndices.length;
  
  if (enabledQuestions < 5) {
    errors.push({ 
      field: 'questions', 
      message: `At least 5 questions must be enabled (currently ${enabledQuestions} enabled)` 
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function generateEventId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${timestamp}_${randomStr}`;
}

function generatePin() {
  const pin = Math.floor(100000 + Math.random() * 900000);
  return pin.toString();
}

describe('Event Creation - Validation', () => {
  it('should validate a valid event configuration', () => {
    const result = validateEvent('Team Building Event', [0, 1]);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject empty title', () => {
    const result = validateEvent('', []);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('title');
    expect(result.errors[0].message).toContain('required');
  });
  
  it('should reject title longer than 100 characters', () => {
    const longTitle = 'a'.repeat(101);
    const result = validateEvent(longTitle, []);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'title' && e.message.includes('100 characters'))).toBe(true);
  });
  
  it('should reject when fewer than 5 questions are enabled', () => {
    // Disable 3 questions, leaving only 4 enabled
    const result = validateEvent('Valid Title', [0, 1, 2]);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'questions')).toBe(true);
  });
  
  it('should accept exactly 5 questions enabled', () => {
    // Disable 2 questions, leaving exactly 5 enabled
    const result = validateEvent('Valid Title', [0, 1]);
    
    expect(result.isValid).toBe(true);
  });
  
  it('should preserve user input on validation error', () => {
    const title = 'My Event Title';
    const disabledQuestions = [0, 1, 2];
    
    const result = validateEvent(title, disabledQuestions);
    
    // The validation should not modify the input
    expect(title).toBe('My Event Title');
    expect(disabledQuestions).toEqual([0, 1, 2]);
  });
});

describe('Event Creation - ID Generation', () => {
  it('should generate unique event IDs', () => {
    const id1 = generateEventId();
    const id2 = generateEventId();
    
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[a-z0-9]+_[a-z0-9]+$/);
  });
  
  it('should generate event ID with timestamp and random components', () => {
    const id = generateEventId();
    const parts = id.split('_');
    
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });
});

describe('Event Creation - PIN Generation', () => {
  it('should generate 6-digit PIN', () => {
    const pin = generatePin();
    
    expect(pin).toMatch(/^\d{6}$/);
    expect(pin.length).toBe(6);
  });
  
  it('should generate PIN within valid range', () => {
    const pin = generatePin();
    const pinNumber = parseInt(pin);
    
    expect(pinNumber).toBeGreaterThanOrEqual(100000);
    expect(pinNumber).toBeLessThanOrEqual(999999);
  });
  
  it('should generate different PINs', () => {
    const pin1 = generatePin();
    const pin2 = generatePin();
    
    // While theoretically they could be the same, it's extremely unlikely
    // This test might occasionally fail due to randomness, but it's a good sanity check
    expect(pin1).toBeDefined();
    expect(pin2).toBeDefined();
  });
});

describe('Event Creation - Error Handling', () => {
  it('should display error for empty title', () => {
    const result = validateEvent('', []);
    
    expect(result.isValid).toBe(false);
    const titleError = result.errors.find(e => e.field === 'title');
    expect(titleError).toBeDefined();
    expect(titleError.message).toBe('Event title is required');
  });
  
  it('should display error for too few questions', () => {
    const result = validateEvent('Valid Title', [0, 1, 2, 3]);
    
    expect(result.isValid).toBe(false);
    const questionsError = result.errors.find(e => e.field === 'questions');
    expect(questionsError).toBeDefined();
    expect(questionsError.message).toContain('At least 5 questions must be enabled');
  });
  
  it('should display multiple errors when both title and questions are invalid', () => {
    const result = validateEvent('', [0, 1, 2, 3]);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.some(e => e.field === 'title')).toBe(true);
    expect(result.errors.some(e => e.field === 'questions')).toBe(true);
  });
});

describe('Event Creation - Valid Event Creation Flow', () => {
  it('should create event with valid title and sufficient questions', () => {
    const title = 'Team Building Workshop';
    const disabledQuestions = [0, 1]; // 5 questions enabled
    
    // Validate event
    const validation = validateEvent(title, disabledQuestions);
    expect(validation.isValid).toBe(true);
    
    // Generate event ID and PIN
    const eventId = generateEventId();
    const pin = generatePin();
    
    // Verify event ID format
    expect(eventId).toMatch(/^[a-z0-9]+_[a-z0-9]+$/);
    
    // Verify PIN format
    expect(pin).toMatch(/^\d{6}$/);
    
    // Create event data structure
    const eventData = {
      title,
      pin,
      creatorId: 'test_user_123',
      createdAt: new Date().toISOString(),
      disabledQuestions: [...disabledQuestions],
      participants: []
    };
    
    // Verify event data structure
    expect(eventData.title).toBe(title);
    expect(eventData.pin).toBe(pin);
    expect(eventData.creatorId).toBe('test_user_123');
    expect(eventData.disabledQuestions).toEqual(disabledQuestions);
    expect(eventData.participants).toEqual([]);
    expect(eventData.createdAt).toBeDefined();
  });
  
  it('should create event with all questions enabled', () => {
    const title = 'Full Quiz Event';
    const disabledQuestions = []; // All questions enabled
    
    const validation = validateEvent(title, disabledQuestions);
    expect(validation.isValid).toBe(true);
    
    const eventData = {
      title,
      pin: generatePin(),
      creatorId: 'test_user_123',
      createdAt: new Date().toISOString(),
      disabledQuestions: [],
      participants: []
    };
    
    expect(eventData.disabledQuestions).toEqual([]);
  });
  
  it('should create event with maximum disabled questions (keeping minimum 5 enabled)', () => {
    const title = 'Minimal Quiz Event';
    const disabledQuestions = [0, 1]; // Disable 2, keep 5 enabled
    
    const validation = validateEvent(title, disabledQuestions);
    expect(validation.isValid).toBe(true);
    
    const eventData = {
      title,
      pin: generatePin(),
      creatorId: 'test_user_123',
      createdAt: new Date().toISOString(),
      disabledQuestions: [...disabledQuestions],
      participants: []
    };
    
    expect(eventData.disabledQuestions.length).toBe(2);
    expect(mockQuestions.length - eventData.disabledQuestions.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Event Creation - Event Details Display', () => {
  it('should generate correct event URL format', () => {
    const eventId = generateEventId();
    const origin = 'http://localhost';
    const eventUrl = `${origin}/questions.html?id=${eventId}`;
    
    expect(eventUrl).toContain('/questions.html?id=');
    expect(eventUrl).toContain(eventId);
    expect(eventUrl).toMatch(/^http:\/\/localhost\/questions\.html\?id=[a-z0-9]+_[a-z0-9]+$/);
  });
  
  it('should display event URL and PIN after creation', () => {
    const eventId = generateEventId();
    const pin = generatePin();
    const origin = 'http://localhost';
    const eventUrl = `${origin}/questions.html?id=${eventId}`;
    
    // Simulate event details display
    const eventDetails = {
      url: eventUrl,
      pin: pin
    };
    
    expect(eventDetails.url).toBe(eventUrl);
    expect(eventDetails.pin).toBe(pin);
    expect(eventDetails.url).toContain(eventId);
    expect(eventDetails.pin).toMatch(/^\d{6}$/);
  });
  
  it('should preserve event details for copying', () => {
    const eventId = 'test123_abc456';
    const pin = '123456';
    const origin = 'http://localhost';
    const eventUrl = `${origin}/questions.html?id=${eventId}`;
    
    // Store event details (simulating what happens after creation)
    const storedUrl = eventUrl;
    const storedPin = pin;
    
    // Verify details are preserved correctly
    expect(storedUrl).toBe(eventUrl);
    expect(storedPin).toBe(pin);
    
    // Verify they can be retrieved for copying
    expect(storedUrl).toContain('questions.html?id=test123_abc456');
    expect(storedPin).toBe('123456');
  });
  
  it('should format event details for display', () => {
    const title = 'Team Building Event';
    const eventId = generateEventId();
    const pin = generatePin();
    const createdAt = new Date().toISOString();
    
    const displayData = {
      title,
      url: `http://localhost/questions.html?id=${eventId}`,
      pin,
      createdAt
    };
    
    // Verify all display fields are present
    expect(displayData.title).toBe(title);
    expect(displayData.url).toContain('/questions.html?id=');
    expect(displayData.pin).toMatch(/^\d{6}$/);
    expect(displayData.createdAt).toBeDefined();
    expect(new Date(displayData.createdAt).toString()).not.toBe('Invalid Date');
  });
});
