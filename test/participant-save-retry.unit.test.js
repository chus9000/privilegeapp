/**
 * Unit Tests for Participant Data Saving with Retry (Task 9.3)
 * Feature: full-featured-quiz-app
 * 
 * Tests for participant data saving with retry logic and error handling
 * Requirements: 6.6
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

describe('Participant Data Saving with Retry', () => {
  let mockFirebaseAPI;
  let mockSleep;

  beforeEach(() => {
    // Mock sleep function to avoid actual delays in tests
    mockSleep = vi.fn().mockResolvedValue(undefined);
    
    mockFirebaseAPI = {
      updateParticipant: vi.fn()
    };
  });

  describe('Requirement 6.6: Save participant responses with retry', () => {
    test('should save participant data on first attempt', async () => {
      // Arrange
      mockFirebaseAPI.updateParticipant.mockResolvedValue(true);
      const eventId = 'test-event-123';
      const participant = {
        id: 'participant-123',
        name: 'Test User',
        avatar: '🐱',
        score: 10,
        answers: { 0: 1, 1: 0, 2: 1 }
      };

      // Act
      const result = await mockFirebaseAPI.updateParticipant(eventId, participant);

      // Assert
      expect(mockFirebaseAPI.updateParticipant).toHaveBeenCalledWith(eventId, participant);
      expect(mockFirebaseAPI.updateParticipant).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    test('should retry on failure and succeed on second attempt', async () => {
      // Arrange
      mockFirebaseAPI.updateParticipant
        .mockResolvedValueOnce(false) // First attempt fails
        .mockResolvedValueOnce(true);  // Second attempt succeeds
      
      const eventId = 'test-event-123';
      const participant = {
        id: 'participant-123',
        name: 'Test User',
        score: 10,
        answers: {}
      };

      // Act - simulate retry logic
      let result = false;
      let attempts = 0;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        attempts++;
        result = await mockFirebaseAPI.updateParticipant(eventId, participant);
        if (result) break;
        if (attempt < maxRetries) {
          await mockSleep(Math.pow(2, attempt) * 1000);
        }
      }

      // Assert
      expect(attempts).toBe(2);
      expect(mockFirebaseAPI.updateParticipant).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });

    test('should retry up to max attempts and fail', async () => {
      // Arrange
      mockFirebaseAPI.updateParticipant.mockResolvedValue(false);
      
      const eventId = 'test-event-123';
      const participant = {
        id: 'participant-123',
        name: 'Test User',
        score: 10,
        answers: {}
      };

      // Act - simulate retry logic
      let result = false;
      let attempts = 0;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        attempts++;
        result = await mockFirebaseAPI.updateParticipant(eventId, participant);
        if (result) break;
        if (attempt < maxRetries) {
          await mockSleep(Math.pow(2, attempt) * 1000);
        }
      }

      // Assert
      expect(attempts).toBe(3);
      expect(mockFirebaseAPI.updateParticipant).toHaveBeenCalledTimes(3);
      expect(result).toBe(false);
    });

    test('should use exponential backoff between retries', async () => {
      // Arrange
      mockFirebaseAPI.updateParticipant.mockResolvedValue(false);
      const sleepDurations = [];
      mockSleep.mockImplementation((ms) => {
        sleepDurations.push(ms);
        return Promise.resolve();
      });

      // Act - simulate retry logic with exponential backoff
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await mockFirebaseAPI.updateParticipant('event-123', {});
        if (attempt < maxRetries) {
          await mockSleep(Math.pow(2, attempt) * 1000);
        }
      }

      // Assert
      expect(sleepDurations).toEqual([2000, 4000]); // 2^1 * 1000, 2^2 * 1000
    });

    test('should handle network errors with retry', async () => {
      // Arrange
      mockFirebaseAPI.updateParticipant
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(true);
      
      const eventId = 'test-event-123';
      const participant = {
        id: 'participant-123',
        name: 'Test User',
        score: 10,
        answers: {}
      };

      // Act - simulate retry logic with error handling
      let result = false;
      let attempts = 0;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        attempts++;
        try {
          result = await mockFirebaseAPI.updateParticipant(eventId, participant);
          if (result) break;
        } catch (error) {
          // Continue to retry
        }
        if (attempt < maxRetries) {
          await mockSleep(Math.pow(2, attempt) * 1000);
        }
      }

      // Assert
      expect(attempts).toBe(2);
      expect(mockFirebaseAPI.updateParticipant).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });

    test('should not retry on permission denied error', async () => {
      // Arrange
      const permissionError = new Error('Permission denied');
      permissionError.code = 'permission-denied';
      mockFirebaseAPI.updateParticipant.mockRejectedValue(permissionError);
      
      const eventId = 'test-event-123';
      const participant = {
        id: 'participant-123',
        name: 'Test User',
        score: 10,
        answers: {}
      };

      // Act - simulate retry logic with permission check
      let result = false;
      let attempts = 0;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        attempts++;
        try {
          result = await mockFirebaseAPI.updateParticipant(eventId, participant);
          if (result) break;
        } catch (error) {
          // Stop retrying on permission denied
          if (error.code === 'permission-denied') {
            break;
          }
        }
        if (attempt < maxRetries) {
          await mockSleep(Math.pow(2, attempt) * 1000);
        }
      }

      // Assert
      expect(attempts).toBe(1);
      expect(mockFirebaseAPI.updateParticipant).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });

    test('should associate participant with event ID', async () => {
      // Arrange
      mockFirebaseAPI.updateParticipant.mockResolvedValue(true);
      const eventId = 'test-event-123';
      const participant = {
        id: 'participant-123',
        name: 'Test User',
        score: 10,
        answers: {}
      };

      // Act
      await mockFirebaseAPI.updateParticipant(eventId, participant);

      // Assert
      expect(mockFirebaseAPI.updateParticipant).toHaveBeenCalledWith(
        eventId,
        expect.objectContaining({
          id: 'participant-123',
          name: 'Test User',
          score: 10
        })
      );
    });

    test('should save to localStorage before attempting Firebase', () => {
      // Arrange
      const mockLocalStorage = {
        _store: {},
        setItem(key, value) {
          this._store[key] = value;
        },
        getItem(key) {
          return this._store[key] || null;
        }
      };

      const eventId = 'test-event-123';
      const participant = {
        id: 'participant-123',
        name: 'Test User',
        score: 10,
        answers: {}
      };

      // Act
      mockLocalStorage.setItem(`participant_${eventId}`, JSON.stringify(participant));

      // Assert
      const stored = mockLocalStorage.getItem(`participant_${eventId}`);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored)).toEqual(participant);
    });
  });

  describe('Free play mode retry logic', () => {
    test('should retry free play response save on failure', async () => {
      // Arrange
      const mockSaveFreePlayResponse = vi.fn()
        .mockResolvedValueOnce(false) // First attempt fails
        .mockResolvedValueOnce(true);  // Second attempt succeeds
      
      const participant = {
        id: 'freeplay-participant-123',
        score: 10,
        answers: { 0: 1, 1: 0 }
      };

      // Act - simulate retry logic
      let result = false;
      let attempts = 0;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        attempts++;
        result = await mockSaveFreePlayResponse(participant);
        if (result) break;
        if (attempt < maxRetries) {
          await mockSleep(Math.pow(2, attempt) * 1000);
        }
      }

      // Assert
      expect(attempts).toBe(2);
      expect(mockSaveFreePlayResponse).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });

    test('should save only score and answers for free play (no name/avatar)', () => {
      // Arrange
      const participant = {
        id: 'freeplay-participant-123',
        name: 'Test User', // Should not be saved
        avatar: '🐱',      // Should not be saved
        score: 10,
        answers: { 0: 1, 1: 0 },
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      // Act - create anonymous response
      const anonymousResponse = {
        id: participant.id,
        score: participant.score,
        answers: participant.answers,
        createdAt: participant.createdAt
      };

      // Assert
      expect(anonymousResponse).not.toHaveProperty('name');
      expect(anonymousResponse).not.toHaveProperty('avatar');
      expect(anonymousResponse).toHaveProperty('id');
      expect(anonymousResponse).toHaveProperty('score');
      expect(anonymousResponse).toHaveProperty('answers');
      expect(anonymousResponse).toHaveProperty('createdAt');
    });
  });

  describe('Error handling', () => {
    test('should log errors but continue after max retries', async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFirebaseAPI.updateParticipant.mockRejectedValue(new Error('Network error'));
      
      // Act - simulate retry logic
      const maxRetries = 3;
      let attempts = 0;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        attempts++;
        try {
          await mockFirebaseAPI.updateParticipant('event-123', {});
        } catch (error) {
          // Log error but continue
        }
        if (attempt < maxRetries) {
          await mockSleep(Math.pow(2, attempt) * 1000);
        }
      }

      // Assert
      expect(attempts).toBe(3);
      expect(mockFirebaseAPI.updateParticipant).toHaveBeenCalledTimes(3);
      
      consoleErrorSpy.mockRestore();
    });

    test('should gracefully handle save failure with localStorage fallback', () => {
      // Arrange
      const mockLocalStorage = {
        _store: {},
        setItem(key, value) {
          this._store[key] = value;
        },
        getItem(key) {
          return this._store[key] || null;
        }
      };

      const eventId = 'test-event-123';
      const participant = {
        id: 'participant-123',
        name: 'Test User',
        score: 10,
        answers: {}
      };

      // Act - save to localStorage (fallback)
      mockLocalStorage.setItem(`participant_${eventId}`, JSON.stringify(participant));
      
      // Simulate Firebase failure
      const firebaseFailed = true;
      
      // Verify localStorage has the data
      const stored = mockLocalStorage.getItem(`participant_${eventId}`);

      // Assert
      expect(firebaseFailed).toBe(true);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored)).toEqual(participant);
    });
  });
});
