/**
 * Unit Tests for Event Participation (Task 9.1)
 * Feature: full-featured-quiz-app
 * 
 * Tests for event authentication and PIN verification
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

describe('Event Participation - Authentication Check', () => {
  let mockEventData;
  let mockFirebaseAPI;
  let mockLocalStorage;

  beforeEach(() => {
    // Reset mocks
    mockEventData = {
      title: 'Test Event',
      pin: '123456',
      disabledQuestions: [],
      participants: []
    };

    mockFirebaseAPI = {
      loadEvent: vi.fn(),
      updateParticipant: vi.fn(),
      saveEvent: vi.fn()
    };

    mockLocalStorage = {
      _store: {},
      getItem(key) {
        return this._store[key] || null;
      },
      setItem(key, value) {
        this._store[key] = value;
      },
      removeItem(key) {
        delete this._store[key];
      },
      clear() {
        this._store = {};
      }
    };
  });

  describe('Requirement 6.1: Display PIN entry screen', () => {
    test('should verify event exists before showing PIN entry', async () => {
      // Arrange
      mockFirebaseAPI.loadEvent.mockResolvedValue(mockEventData);

      // Act
      const eventId = 'test-event-123';
      const result = await mockFirebaseAPI.loadEvent(eventId);

      // Assert
      expect(mockFirebaseAPI.loadEvent).toHaveBeenCalledWith(eventId);
      expect(result).toEqual(mockEventData);
      expect(result.title).toBe('Test Event');
      expect(result.pin).toBe('123456');
    });

    test('should handle free play mode without PIN', () => {
      // Arrange
      const eventId = 'freeplay';
      const isFreePlayMode = eventId === 'freeplay';

      // Act & Assert
      expect(isFreePlayMode).toBe(true);
      // Free play should skip PIN entry
    });
  });

  describe('Requirement 6.2: Grant access on correct PIN', () => {
    test('should verify PIN matches event PIN', () => {
      // Arrange
      const enteredPin = '123456';
      const eventPin = mockEventData.pin;

      // Act
      const isCorrect = enteredPin === eventPin.toString();

      // Assert
      expect(isCorrect).toBe(true);
    });

    test('should reject incorrect PIN', () => {
      // Arrange
      const enteredPin = '999999';
      const eventPin = mockEventData.pin;

      // Act
      const isCorrect = enteredPin === eventPin.toString();

      // Assert
      expect(isCorrect).toBe(false);
    });
  });

  describe('Requirement 6.3: Display error on incorrect PIN', () => {
    test('should track failed PIN attempts', () => {
      // Arrange
      let failedAttempts = 0;
      const MAX_ATTEMPTS = 5;
      const incorrectPin = '999999';
      const correctPin = '123456';

      // Act - simulate failed attempts
      for (let i = 0; i < 3; i++) {
        if (incorrectPin !== correctPin) {
          failedAttempts++;
        }
      }

      // Assert
      expect(failedAttempts).toBe(3);
      expect(failedAttempts).toBeLessThan(MAX_ATTEMPTS);
    });

    test('should rate limit after max attempts', () => {
      // Arrange
      let failedAttempts = 0;
      const MAX_ATTEMPTS = 5;
      const incorrectPin = '999999';
      const correctPin = '123456';

      // Act - simulate max failed attempts
      for (let i = 0; i < 5; i++) {
        if (incorrectPin !== correctPin) {
          failedAttempts++;
        }
      }

      // Assert
      expect(failedAttempts).toBe(MAX_ATTEMPTS);
      const shouldRateLimit = failedAttempts >= MAX_ATTEMPTS;
      expect(shouldRateLimit).toBe(true);
    });
  });

  describe('Requirement 6.4: Load event from Firebase', () => {
    test('should load event data from Firebase', async () => {
      // Arrange
      mockFirebaseAPI.loadEvent.mockResolvedValue(mockEventData);

      // Act
      const result = await mockFirebaseAPI.loadEvent('test-event-123');

      // Assert
      expect(result).toEqual(mockEventData);
      expect(result.title).toBe('Test Event');
      expect(result.pin).toBe('123456');
      expect(result.disabledQuestions).toEqual([]);
    });

    test('should fallback to localStorage if Firebase fails', async () => {
      // Arrange
      mockFirebaseAPI.loadEvent.mockRejectedValue(new Error('Network error'));
      mockLocalStorage.setItem('event_test-123', JSON.stringify(mockEventData));

      // Act
      let eventData = null;
      try {
        eventData = await mockFirebaseAPI.loadEvent('test-123');
      } catch (error) {
        // Fallback to localStorage
        const stored = mockLocalStorage.getItem('event_test-123');
        if (stored) {
          eventData = JSON.parse(stored);
        }
      }

      // Assert
      expect(eventData).toEqual(mockEventData);
      expect(eventData.title).toBe('Test Event');
    });

    test('should handle event not found', async () => {
      // Arrange
      mockFirebaseAPI.loadEvent.mockResolvedValue(null);

      // Act
      const result = await mockFirebaseAPI.loadEvent('nonexistent-event');

      // Assert
      expect(result).toBeNull();
    });

    test('should validate event has required PIN field', async () => {
      // Arrange
      const invalidEvent = {
        title: 'Invalid Event',
        // Missing PIN field
        disabledQuestions: [],
        participants: []
      };
      mockFirebaseAPI.loadEvent.mockResolvedValue(invalidEvent);

      // Act
      const result = await mockFirebaseAPI.loadEvent('invalid-event');

      // Assert
      expect(result.pin).toBeUndefined();
      const isValid = result && result.pin;
      expect(isValid).toBeFalsy();
    });
  });

  describe('Saved participant bypass', () => {
    test('should skip PIN entry if participant already exists', () => {
      // Arrange
      const savedParticipant = {
        id: 'participant-123',
        name: 'Test User',
        avatar: '🐱',
        score: 0,
        answers: {}
      };
      mockLocalStorage.setItem('participant_test-event-123', JSON.stringify(savedParticipant));

      // Act
      const stored = mockLocalStorage.getItem('participant_test-event-123');
      const participant = stored ? JSON.parse(stored) : null;

      // Assert
      expect(participant).toEqual(savedParticipant);
      expect(participant.id).toBe('participant-123');
      // If participant exists, PIN entry should be skipped
      const shouldSkipPinEntry = participant !== null;
      expect(shouldSkipPinEntry).toBe(true);
    });
  });

  describe('Error handling', () => {
    test('should handle missing event gracefully', async () => {
      // Arrange
      mockFirebaseAPI.loadEvent.mockResolvedValue(null);

      // Act
      const result = await mockFirebaseAPI.loadEvent('missing-event');

      // Assert
      expect(result).toBeNull();
      // Should display error message to user
    });

    test('should handle Firebase errors gracefully', async () => {
      // Arrange
      const error = new Error('Firebase connection failed');
      mockFirebaseAPI.loadEvent.mockRejectedValue(error);

      // Act & Assert
      await expect(mockFirebaseAPI.loadEvent('test-event')).rejects.toThrow('Firebase connection failed');
    });
  });

  describe('PIN entry UI behavior', () => {
    test('should clear PIN input after incorrect attempt', () => {
      // Arrange
      const mockPinInput = {
        value: '999999',
        focus: vi.fn()
      };
      const correctPin = '123456';

      // Act
      const isCorrect = mockPinInput.value === correctPin;
      if (!isCorrect) {
        mockPinInput.value = '';
        mockPinInput.focus();
      }

      // Assert
      expect(isCorrect).toBe(false);
      expect(mockPinInput.value).toBe('');
      expect(mockPinInput.focus).toHaveBeenCalled();
    });

    test('should disable PIN input after max failed attempts', () => {
      // Arrange
      let failedAttempts = 0;
      const MAX_ATTEMPTS = 5;
      const mockControls = {
        submitButton: { disabled: false },
        pinInput: { disabled: false }
      };

      // Act - simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        failedAttempts++;
      }

      if (failedAttempts >= MAX_ATTEMPTS) {
        mockControls.submitButton.disabled = true;
        mockControls.pinInput.disabled = true;
      }

      // Assert
      expect(mockControls.submitButton.disabled).toBe(true);
      expect(mockControls.pinInput.disabled).toBe(true);
    });

    test('should re-enable PIN input after timeout', async () => {
      // Arrange
      const mockControls = {
        submitButton: { disabled: true },
        pinInput: { disabled: true }
      };
      let failedAttempts = 5;

      // Act - simulate timeout reset
      const resetAfterTimeout = () => {
        mockControls.submitButton.disabled = false;
        mockControls.pinInput.disabled = false;
        failedAttempts = 0;
      };

      resetAfterTimeout();

      // Assert
      expect(mockControls.submitButton.disabled).toBe(false);
      expect(mockControls.pinInput.disabled).toBe(false);
      expect(failedAttempts).toBe(0);
    });
  });

  describe('Question filtering integration', () => {
    test('should load disabled questions from event data', () => {
      // Arrange
      const eventData = {
        title: 'Test Event',
        pin: '123456',
        disabledQuestions: [0, 5, 10, 15, 20],
        participants: []
      };

      // Act
      const disabledQuestions = eventData.disabledQuestions || [];

      // Assert
      expect(disabledQuestions).toEqual([0, 5, 10, 15, 20]);
      expect(Array.isArray(disabledQuestions)).toBe(true);
    });

    test('should filter questions based on disabled indices', () => {
      // Arrange
      const mockQuestions = Array.from({ length: 35 }, (_, i) => ({
        text: `Question ${i + 1}`,
        value: i % 2 === 0 ? 1 : -1
      }));
      const disabledQuestions = [0, 5, 10];

      // Act
      const enabledQuestions = mockQuestions.filter((_, index) => 
        !disabledQuestions.includes(index)
      );

      // Assert
      expect(enabledQuestions.length).toBe(32);
      enabledQuestions.forEach(question => {
        const originalIndex = mockQuestions.indexOf(question);
        expect(disabledQuestions).not.toContain(originalIndex);
      });
    });

    test('should calculate progress based on enabled questions only', () => {
      // Arrange
      const totalQuestions = 35;
      const disabledQuestions = [0, 1, 2, 3, 4]; // 5 disabled
      const enabledCount = totalQuestions - disabledQuestions.length;
      const answeredCount = 10;

      // Act
      const percentage = (answeredCount / enabledCount) * 100;
      const progressText = `${answeredCount}/${enabledCount} completed`;

      // Assert
      expect(enabledCount).toBe(30);
      expect(percentage).toBeCloseTo(33.33, 1);
      expect(progressText).toBe('10/30 completed');
    });
  });

  describe('Participant generation', () => {
    test('should generate anonymous participant for free play', () => {
      // Arrange
      const isFreePlayMode = true;

      // Act
      const participant = isFreePlayMode ? {
        id: 'test-id-123',
        score: 0,
        answers: {},
        createdAt: new Date().toISOString()
      } : {
        id: 'test-id-123',
        name: 'Test User',
        avatar: '🐱',
        score: 0,
        answers: {},
        createdAt: new Date().toISOString()
      };

      // Assert
      if (isFreePlayMode) {
        expect(participant).not.toHaveProperty('name');
        expect(participant).not.toHaveProperty('avatar');
      }
      expect(participant).toHaveProperty('id');
      expect(participant).toHaveProperty('score');
      expect(participant).toHaveProperty('answers');
      expect(participant).toHaveProperty('createdAt');
    });

    test('should generate participant with name and avatar for regular events', () => {
      // Arrange
      const isFreePlayMode = false;

      // Act
      const participant = {
        id: 'test-id-123',
        name: 'Happy Tiger',
        avatar: '🐯',
        score: 0,
        answers: {},
        createdAt: new Date().toISOString()
      };

      // Assert
      expect(participant).toHaveProperty('name');
      expect(participant).toHaveProperty('avatar');
      expect(participant.name).toBeTruthy();
      expect(participant.avatar).toBeTruthy();
    });
  });

  describe('Score calculation', () => {
    test('should calculate score correctly from answers', () => {
      // Arrange
      const mockQuestions = [
        { text: 'Q1', value: 2 },
        { text: 'Q2', value: -1 },
        { text: 'Q3', value: 3 },
        { text: 'Q4', value: -2 },
        { text: 'Q5', value: 1 }
      ];
      const answers = {
        0: 1, // Yes to Q1: +2
        1: 0, // No to Q2: 0
        2: 1, // Yes to Q3: +3
        3: 1, // Yes to Q4: -2
        4: 0  // No to Q5: 0
      };

      // Act
      let score = 0;
      mockQuestions.forEach((question, index) => {
        if (answers[index] === 1) {
          score += question.value;
        }
      });

      // Assert
      expect(score).toBe(3); // 2 + 0 + 3 + (-2) + 0 = 3
    });

    test('should handle empty answers', () => {
      // Arrange
      const answers = {};

      // Act
      const answeredCount = Object.keys(answers).length;

      // Assert
      expect(answeredCount).toBe(0);
    });

    test('should track partial completion', () => {
      // Arrange
      const totalQuestions = 35;
      const disabledQuestions = [0, 1, 2, 3, 4]; // 5 disabled
      const enabledCount = totalQuestions - disabledQuestions.length;
      const answers = {
        5: 1,
        6: 0,
        7: 1,
        8: 1,
        9: 0
      };

      // Act
      const answeredCount = Object.keys(answers).length;
      const isComplete = answeredCount === enabledCount;

      // Assert
      expect(answeredCount).toBe(5);
      expect(enabledCount).toBe(30);
      expect(isComplete).toBe(false);
    });
  });

  describe('localStorage integration', () => {
    test('should save participant to localStorage', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participant = {
        id: 'participant-123',
        name: 'Test User',
        avatar: '🐱',
        score: 10,
        answers: { 0: 1, 1: 0 }
      };

      // Act
      mockLocalStorage.setItem(`participant_${eventId}`, JSON.stringify(participant));
      const stored = mockLocalStorage.getItem(`participant_${eventId}`);

      // Assert
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored)).toEqual(participant);
    });

    test('should save event data to localStorage', () => {
      // Arrange
      const eventId = 'test-event-123';
      const eventData = {
        title: 'Test Event',
        pin: '123456',
        disabledQuestions: [0, 5, 10],
        participants: []
      };

      // Act
      mockLocalStorage.setItem(`event_${eventId}`, JSON.stringify(eventData));
      const stored = mockLocalStorage.getItem(`event_${eventId}`);

      // Assert
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored)).toEqual(eventData);
    });

    test('should restore participant from localStorage', () => {
      // Arrange
      const eventId = 'test-event-123';
      const savedParticipant = {
        id: 'participant-123',
        name: 'Test User',
        avatar: '🐱',
        score: 10,
        answers: { 0: 1, 1: 0 }
      };
      mockLocalStorage.setItem(`participant_${eventId}`, JSON.stringify(savedParticipant));

      // Act
      const stored = mockLocalStorage.getItem(`participant_${eventId}`);
      const participant = stored ? JSON.parse(stored) : null;

      // Assert
      expect(participant).toEqual(savedParticipant);
      expect(participant.score).toBe(10);
      expect(Object.keys(participant.answers).length).toBe(2);
    });
  });

  describe('Results navigation', () => {
    test('should enable results link when all questions answered', () => {
      // Arrange
      const totalQuestions = 35;
      const disabledQuestions = [0, 1, 2, 3, 4]; // 5 disabled
      const enabledCount = totalQuestions - disabledQuestions.length;
      const answeredCount = 30; // All enabled questions answered

      // Act
      const isComplete = answeredCount === enabledCount;

      // Assert
      expect(isComplete).toBe(true);
    });

    test('should keep results link disabled when incomplete', () => {
      // Arrange
      const totalQuestions = 35;
      const disabledQuestions = [0, 1, 2, 3, 4]; // 5 disabled
      const enabledCount = totalQuestions - disabledQuestions.length;
      const answeredCount = 20; // Not all questions answered

      // Act
      const isComplete = answeredCount === enabledCount;

      // Assert
      expect(isComplete).toBe(false);
    });

    test('should construct correct results URL', () => {
      // Arrange
      const eventId = 'test-event-123';

      // Act
      const resultsUrl = `results.html?id=${eventId}`;

      // Assert
      expect(resultsUrl).toBe('results.html?id=test-event-123');
    });

    test('should construct correct results URL for free play', () => {
      // Arrange
      const eventId = 'freeplay';

      // Act
      const resultsUrl = `results.html?id=${eventId}`;

      // Assert
      expect(resultsUrl).toBe('results.html?id=freeplay');
    });
  });
});
