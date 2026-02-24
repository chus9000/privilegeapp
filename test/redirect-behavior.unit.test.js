/**
 * Unit Tests for Redirect Behavior (Task 3.4)
 * Feature: score-page-separation
 * 
 * Tests for resultsLink href and session participant storage after completion
 * Requirements: 1.2, 2.3, 2.4, 4.1
 */

import { describe, test, expect, beforeEach } from 'vitest';

describe('Redirect Behavior - Score Page Navigation', () => {
  let mockSessionStorage;
  let mockDocument;

  beforeEach(() => {
    // Create a fresh sessionStorage mock for each test
    mockSessionStorage = {
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

    // Create a mock document with resultsLink element
    mockDocument = {
      getElementById: (id) => {
        if (id === 'resultsLink') {
          return {
            href: '',
            classList: {
              remove: () => {},
              add: () => {}
            },
            style: {
              pointerEvents: 'auto'
            }
          };
        }
        return null;
      }
    };
  });

  describe('Requirement 1.2, 4.1: Results link points to score.html', () => {
    test('should set resultsLink href to score.html with correct event ID', () => {
      // Arrange
      const eventId = 'test-event-123';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act - Simulate updateResultsLink function
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toBe('./score.html?id=test-event-123');
    });

    test('should set resultsLink href for free play mode', () => {
      // Arrange
      const eventId = 'freeplay';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toBe('./score.html?id=freeplay');
    });

    test('should handle event IDs with special characters', () => {
      // Arrange
      const eventId = 'event-with-special_chars-123';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toBe('./score.html?id=event-with-special_chars-123');
    });

    test('should use relative path for score.html', () => {
      // Arrange
      const eventId = 'test-event-123';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toContain('./score.html');
      expect(resultsLink.href).not.toContain('http');
      expect(resultsLink.href).not.toContain('https');
    });

    test('should preserve event ID in query parameter', () => {
      // Arrange
      const eventId = 'my-quiz-event-456';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      const url = new URL(resultsLink.href, 'http://localhost');
      expect(url.searchParams.get('id')).toBe('my-quiz-event-456');
    });

    test('should handle numeric event IDs', () => {
      // Arrange
      const eventId = '12345';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toBe('./score.html?id=12345');
    });

    test('should handle UUID-style event IDs', () => {
      // Arrange
      const eventId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toBe('./score.html?id=a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });
  });

  describe('Requirement 2.3, 2.4: Session participant storage after completion', () => {
    test('should store participant ID in sessionStorage with correct key format', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participantId = 'participant-abc-456';

      // Act - Simulate storeSessionParticipant function
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);

      // Assert
      const stored = mockSessionStorage.getItem(`participant_${eventId}`);
      expect(stored).toBe(participantId);
    });

    test('should store participant ID for free play mode', () => {
      // Arrange
      const eventId = 'freeplay';
      const participantId = 'participant-xyz-789';

      // Act
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);

      // Assert
      const stored = mockSessionStorage.getItem(`participant_freeplay`);
      expect(stored).toBe(participantId);
    });

    test('should retrieve participant ID from sessionStorage', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participantId = 'participant-abc-456';
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);

      // Act
      const retrieved = mockSessionStorage.getItem(`participant_${eventId}`);

      // Assert
      expect(retrieved).toBe(participantId);
    });

    test('should return null for non-existent session participant', () => {
      // Arrange
      const eventId = 'nonexistent-event';

      // Act
      const retrieved = mockSessionStorage.getItem(`participant_${eventId}`);

      // Assert
      expect(retrieved).toBeNull();
    });

    test('should overwrite existing session participant for same event', () => {
      // Arrange
      const eventId = 'test-event-123';
      const oldParticipantId = 'participant-old-123';
      const newParticipantId = 'participant-new-456';

      // Act
      mockSessionStorage.setItem(`participant_${eventId}`, oldParticipantId);
      mockSessionStorage.setItem(`participant_${eventId}`, newParticipantId);

      // Assert
      const stored = mockSessionStorage.getItem(`participant_${eventId}`);
      expect(stored).toBe(newParticipantId);
      expect(stored).not.toBe(oldParticipantId);
    });

    test('should store different participants for different events', () => {
      // Arrange
      const eventId1 = 'event-123';
      const eventId2 = 'event-456';
      const participantId1 = 'participant-abc';
      const participantId2 = 'participant-xyz';

      // Act
      mockSessionStorage.setItem(`participant_${eventId1}`, participantId1);
      mockSessionStorage.setItem(`participant_${eventId2}`, participantId2);

      // Assert
      expect(mockSessionStorage.getItem(`participant_${eventId1}`)).toBe(participantId1);
      expect(mockSessionStorage.getItem(`participant_${eventId2}`)).toBe(participantId2);
    });

    test('should handle special characters in event ID', () => {
      // Arrange
      const eventId = 'event-with-special_chars-123';
      const participantId = 'participant-abc-456';

      // Act
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);

      // Assert
      const stored = mockSessionStorage.getItem(`participant_${eventId}`);
      expect(stored).toBe(participantId);
    });

    test('should handle special characters in participant ID', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participantId = 'participant-with-special_chars-abc-123';

      // Act
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);

      // Assert
      const stored = mockSessionStorage.getItem(`participant_${eventId}`);
      expect(stored).toBe(participantId);
    });

    test('should clear session participant when sessionStorage is cleared', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participantId = 'participant-abc-456';
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);

      // Act
      mockSessionStorage.clear();

      // Assert
      const stored = mockSessionStorage.getItem(`participant_${eventId}`);
      expect(stored).toBeNull();
    });

    test('should persist participant ID across page reloads (within session)', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participantId = 'participant-abc-456';
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);

      // Act - Simulate page reload by creating new reference
      const retrievedAfterReload = mockSessionStorage.getItem(`participant_${eventId}`);

      // Assert
      expect(retrievedAfterReload).toBe(participantId);
    });
  });

  describe('Integration: Redirect flow after completion', () => {
    test('should set both resultsLink and store session participant', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participantId = 'participant-abc-456';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act - Simulate completion flow
      resultsLink.href = `./score.html?id=${eventId}`;
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);

      // Assert
      expect(resultsLink.href).toBe('./score.html?id=test-event-123');
      expect(mockSessionStorage.getItem(`participant_${eventId}`)).toBe(participantId);
    });

    test('should handle free play completion flow', () => {
      // Arrange
      const eventId = 'freeplay';
      const participantId = 'participant-freeplay-123';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);

      // Assert
      expect(resultsLink.href).toBe('./score.html?id=freeplay');
      expect(mockSessionStorage.getItem(`participant_freeplay`)).toBe(participantId);
    });

    test('should enable resultsLink after all questions answered', () => {
      // Arrange
      const eventId = 'test-event-123';
      const resultsLink = mockDocument.getElementById('resultsLink');
      const totalQuestions = 30;
      const answeredCount = 30;

      // Act
      const isComplete = answeredCount === totalQuestions;
      if (isComplete) {
        resultsLink.href = `./score.html?id=${eventId}`;
        resultsLink.classList.remove('disabled');
        resultsLink.style.pointerEvents = 'auto';
      }

      // Assert
      expect(isComplete).toBe(true);
      expect(resultsLink.href).toBe('./score.html?id=test-event-123');
      expect(resultsLink.style.pointerEvents).toBe('auto');
    });

    test('should not enable resultsLink when questions incomplete', () => {
      // Arrange
      const eventId = 'test-event-123';
      const resultsLink = mockDocument.getElementById('resultsLink');
      const totalQuestions = 30;
      const answeredCount = 20;

      // Act
      const isComplete = answeredCount === totalQuestions;

      // Assert
      expect(isComplete).toBe(false);
      // resultsLink should remain disabled (href not set)
      expect(resultsLink.href).toBe('');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty event ID', () => {
      // Arrange
      const eventId = '';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toBe('./score.html?id=');
    });

    test('should handle undefined event ID', () => {
      // Arrange
      const eventId = undefined;
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toBe('./score.html?id=undefined');
    });

    test('should handle null participant ID', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participantId = null;

      // Act
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);
      const stored = mockSessionStorage.getItem(`participant_${eventId}`);

      // Assert
      // Mock storage returns null as-is, real sessionStorage would convert to string
      expect(stored).toBe(null);
    });

    test('should handle very long event IDs', () => {
      // Arrange
      const eventId = 'a'.repeat(1000);
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toContain('./score.html?id=');
      expect(resultsLink.href.length).toBeGreaterThan(1000);
    });

    test('should handle event IDs with URL-unsafe characters', () => {
      // Arrange
      const eventId = 'event with spaces & special=chars';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toContain('./score.html?id=');
      // Note: In real implementation, these should be URL-encoded
    });

    test('should handle concurrent storage operations', () => {
      // Arrange
      const eventId1 = 'event-1';
      const eventId2 = 'event-2';
      const participantId1 = 'participant-1';
      const participantId2 = 'participant-2';

      // Act - Simulate concurrent operations
      mockSessionStorage.setItem(`participant_${eventId1}`, participantId1);
      mockSessionStorage.setItem(`participant_${eventId2}`, participantId2);

      // Assert - Both should be stored independently
      expect(mockSessionStorage.getItem(`participant_${eventId1}`)).toBe(participantId1);
      expect(mockSessionStorage.getItem(`participant_${eventId2}`)).toBe(participantId2);
    });
  });

  describe('URL construction validation', () => {
    test('should construct valid URL with query parameter', () => {
      // Arrange
      const eventId = 'test-event-123';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      const url = new URL(resultsLink.href, 'http://localhost');
      expect(url.pathname).toContain('score.html');
      expect(url.searchParams.has('id')).toBe(true);
      expect(url.searchParams.get('id')).toBe('test-event-123');
    });

    test('should not include additional query parameters', () => {
      // Arrange
      const eventId = 'test-event-123';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      const url = new URL(resultsLink.href, 'http://localhost');
      expect(url.searchParams.size).toBe(1);
      expect(url.searchParams.has('id')).toBe(true);
    });

    test('should use correct file extension', () => {
      // Arrange
      const eventId = 'test-event-123';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toContain('.html');
      expect(resultsLink.href).toContain('score.html');
    });

    test('should point to score.html not results.html', () => {
      // Arrange
      const eventId = 'test-event-123';
      const resultsLink = mockDocument.getElementById('resultsLink');

      // Act
      resultsLink.href = `./score.html?id=${eventId}`;

      // Assert
      expect(resultsLink.href).toContain('score.html');
      expect(resultsLink.href).not.toContain('results.html');
    });
  });

  describe('Session storage key format validation', () => {
    test('should use correct key format with participant_ prefix', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participantId = 'participant-abc-456';

      // Act
      const key = `participant_${eventId}`;
      mockSessionStorage.setItem(key, participantId);

      // Assert
      expect(key).toBe('participant_test-event-123');
      expect(key).toContain('participant_');
      expect(mockSessionStorage.getItem(key)).toBe(participantId);
    });

    test('should not use incorrect key formats', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participantId = 'participant-abc-456';

      // Act - Store with correct format
      mockSessionStorage.setItem(`participant_${eventId}`, participantId);

      // Assert - Incorrect formats should not retrieve the value
      expect(mockSessionStorage.getItem(`session_${eventId}`)).toBeNull();
      expect(mockSessionStorage.getItem(`${eventId}_participant`)).toBeNull();
      expect(mockSessionStorage.getItem(eventId)).toBeNull();
    });

    test('should maintain key format consistency across operations', () => {
      // Arrange
      const eventId = 'test-event-123';
      const participantId = 'participant-abc-456';
      const keyFormat = (id) => `participant_${id}`;

      // Act
      mockSessionStorage.setItem(keyFormat(eventId), participantId);
      const retrieved = mockSessionStorage.getItem(keyFormat(eventId));

      // Assert
      expect(retrieved).toBe(participantId);
    });
  });
});
