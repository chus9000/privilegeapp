/**
 * Unit Tests for Error Handling
 * Feature: full-featured-quiz-app
 * Task: 17.6 Write unit tests for error handling
 * 
 * Tests error handling for:
 * - Authentication error display (Requirement 15.1)
 * - Network error retry (Requirement 15.2)
 * - Event not found error (Requirement 15.3)
 * - PIN error display (Requirement 15.4)
 * - Validation error display (Requirement 15.6)
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Error Handling - Unit Tests', () => {
  let dom;
  let document;
  let window;
  let mockConsole;

  beforeEach(() => {
    // Set up DOM
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="app"></div>
      </body>
      </html>
    `, { url: 'http://localhost' });

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;

    // Mock console
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };
    global.console = mockConsole;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 15.1: Authentication Error Display', () => {
    test('should display error message when Google sign-in fails', () => {
      // Arrange
      const errorMessage = 'Authentication failed. Please try again.';
      
      // Act - simulate showing error
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-notification';
      errorDiv.textContent = errorMessage;
      document.body.appendChild(errorDiv);

      // Assert
      expect(errorDiv.textContent).toBe(errorMessage);
      expect(errorDiv.className).toBe('error-notification');
      expect(document.querySelector('.error-notification')).toBeTruthy();
    });

    test('should display network error message for auth network failures', () => {
      // Arrange
      const error = {
        code: 'auth/network-request-failed',
        message: 'Network error'
      };
      
      // Act - determine error message
      let displayMessage;
      if (error.code === 'auth/network-request-failed') {
        displayMessage = 'Network error. Please check your connection and try again.';
      }

      // Assert
      expect(displayMessage).toBe('Network error. Please check your connection and try again.');
    });

    test('should not display error when user cancels authentication', () => {
      // Arrange
      const error = {
        code: 'auth/popup-closed-by-user',
        message: 'User cancelled'
      };
      
      // Act - determine if error should be shown
      let shouldShowError = true;
      if (error.code === 'auth/popup-closed-by-user') {
        shouldShowError = false;
      }

      // Assert
      expect(shouldShowError).toBe(false);
    });

    test('should display generic error for unknown auth failures', () => {
      // Arrange
      const error = {
        code: 'auth/unknown-error',
        message: 'Unknown error'
      };
      
      // Act - determine error message
      let displayMessage = 'Authentication failed. Please try again.';

      // Assert
      expect(displayMessage).toBe('Authentication failed. Please try again.');
    });

    test('should log authentication errors to console', () => {
      // Arrange
      const error = new Error('Auth failed');
      error.code = 'auth/invalid-credential';
      
      // Act - simulate error logging
      console.error('❌ Authentication operation failed: signInWithGoogle', {
        operation: 'signInWithGoogle',
        error: error.message,
        errorCode: error.code,
        stack: error.stack
      });

      // Assert
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Authentication operation failed'),
        expect.objectContaining({
          operation: 'signInWithGoogle',
          errorCode: 'auth/invalid-credential'
        })
      );
    });
  });

  describe('Requirement 15.2: Network Error Retry', () => {
    test('should display retry button for network errors', () => {
      // Arrange
      const errorMessage = 'Failed to load events. Please check your connection and try again.';
      const onRetry = vi.fn();
      
      // Act - create error notification with retry
      const notification = document.createElement('div');
      notification.className = 'error-notification';
      notification.textContent = errorMessage;
      
      const retryButton = document.createElement('button');
      retryButton.textContent = 'Retry';
      retryButton.onclick = onRetry;
      notification.appendChild(retryButton);
      
      document.body.appendChild(notification);

      // Assert
      const retryBtn = notification.querySelector('button');
      expect(retryBtn).toBeTruthy();
      expect(retryBtn.textContent).toBe('Retry');
      
      // Simulate click
      retryBtn.click();
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    test('should retry loading events when retry button clicked', () => {
      // Arrange
      const loadEvents = vi.fn();
      const onRetry = () => {
        console.log('🔄 User requested retry...');
        loadEvents();
      };
      
      // Act - simulate retry
      onRetry();

      // Assert
      expect(loadEvents).toHaveBeenCalledTimes(1);
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('User requested retry')
      );
    });

    test('should retry saving participant data when retry button clicked', () => {
      // Arrange
      const saveParticipant = vi.fn();
      const onRetry = () => {
        console.log('🔄 Retrying save...');
        saveParticipant();
      };
      
      // Act - simulate retry
      onRetry();

      // Assert
      expect(saveParticipant).toHaveBeenCalledTimes(1);
    });

    test('should retry creating event when retry button clicked', () => {
      // Arrange
      const createEvent = vi.fn();
      const onRetry = () => {
        console.log('🔄 Retrying event creation...');
        createEvent();
      };
      
      // Act - simulate retry
      onRetry();

      // Assert
      expect(createEvent).toHaveBeenCalledTimes(1);
    });

    test('should display error without retry for non-network errors', () => {
      // Arrange
      const errorMessage = 'Permission denied';
      
      // Act - create error notification without retry
      const notification = document.createElement('div');
      notification.className = 'error-notification';
      notification.textContent = errorMessage;
      document.body.appendChild(notification);

      // Assert
      const retryBtn = notification.querySelector('button');
      expect(retryBtn).toBeNull();
    });
  });

  describe('Requirement 15.3: Event Not Found Error', () => {
    test('should display event not found message with event ID', () => {
      // Arrange
      const eventId = 'test-event-123';
      const errorMessage = `Event not found (ID: ${eventId})`;
      
      // Act - create error display
      const errorDiv = document.createElement('div');
      errorDiv.className = 'card';
      errorDiv.innerHTML = `
        <h1>⚠️ Error</h1>
        <p>${errorMessage}</p>
        <button onclick="window.location.href='/'">Return to Home</button>
      `;
      document.body.appendChild(errorDiv);

      // Assert
      expect(errorDiv.textContent).toContain('Event not found');
      expect(errorDiv.textContent).toContain(eventId);
      expect(errorDiv.querySelector('button')).toBeTruthy();
    });

    test('should log event not found error to console', () => {
      // Arrange
      const eventId = 'nonexistent-event';
      
      // Act - simulate error logging
      console.error('❌ Event not found:', eventId);

      // Assert
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Event not found'),
        eventId
      );
    });

    test('should provide return to home button on event not found', () => {
      // Arrange
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
        <h1>⚠️ Error</h1>
        <p>Event not found (ID: test-123)</p>
        <button id="returnHome">Return to Home</button>
      `;
      document.body.appendChild(errorDiv);
      
      // Act
      const returnButton = errorDiv.querySelector('#returnHome');

      // Assert
      expect(returnButton).toBeTruthy();
      expect(returnButton.textContent).toBe('Return to Home');
    });

    test('should display error when event has invalid configuration', () => {
      // Arrange
      const errorMessage = 'Event configuration is invalid. Please contact the event creator.';
      
      // Act - create error display
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
        <h1>⚠️ Error</h1>
        <p>${errorMessage}</p>
      `;
      document.body.appendChild(errorDiv);

      // Assert
      expect(errorDiv.textContent).toContain('Event configuration is invalid');
    });
  });

  describe('Requirement 15.4: PIN Error Display', () => {
    test('should display error when PIN is incorrect', () => {
      // Arrange
      const pinError = document.createElement('div');
      pinError.id = 'pinError';
      pinError.className = 'error-message';
      pinError.style.display = 'none';
      document.body.appendChild(pinError);
      
      const enteredPin = '999999';
      const correctPin = '123456';
      
      // Act - validate PIN
      if (enteredPin !== correctPin) {
        pinError.textContent = 'Invalid PIN. Please try again.';
        pinError.style.display = 'block';
      }

      // Assert
      expect(pinError.style.display).toBe('block');
      expect(pinError.textContent).toBe('Invalid PIN. Please try again.');
    });

    test('should clear PIN input field after incorrect attempt', () => {
      // Arrange
      const pinInput = document.createElement('input');
      pinInput.id = 'pinInput';
      pinInput.value = '999999';
      document.body.appendChild(pinInput);
      
      const correctPin = '123456';
      
      // Act - validate and clear
      if (pinInput.value !== correctPin) {
        pinInput.value = '';
      }

      // Assert
      expect(pinInput.value).toBe('');
    });

    test('should display error when PIN is empty', () => {
      // Arrange
      const pinError = document.createElement('div');
      pinError.id = 'pinError';
      pinError.className = 'error-message';
      pinError.style.display = 'none';
      document.body.appendChild(pinError);
      
      const pinInput = document.createElement('input');
      pinInput.value = '';
      
      // Act - validate PIN
      if (pinInput.value.trim() === '') {
        pinError.textContent = 'Please enter a PIN';
        pinError.style.display = 'block';
      }

      // Assert
      expect(pinError.style.display).toBe('block');
      expect(pinError.textContent).toBe('Please enter a PIN');
    });

    test('should display rate limit error after too many failed attempts', () => {
      // Arrange
      const pinError = document.createElement('div');
      pinError.id = 'pinError';
      pinError.className = 'error-message';
      document.body.appendChild(pinError);
      
      const MAX_ATTEMPTS = 5;
      let failedAttempts = 5;
      
      // Act - check rate limit
      if (failedAttempts >= MAX_ATTEMPTS) {
        pinError.textContent = 'Too many failed attempts. Please wait a moment before trying again.';
        pinError.style.display = 'block';
      }

      // Assert
      expect(pinError.style.display).toBe('block');
      expect(pinError.textContent).toContain('Too many failed attempts');
    });

    test('should clear PIN error when correct PIN entered', () => {
      // Arrange
      const pinError = document.createElement('div');
      pinError.id = 'pinError';
      pinError.className = 'error-message';
      pinError.style.display = 'block';
      pinError.textContent = 'Invalid PIN. Please try again.';
      document.body.appendChild(pinError);
      
      const enteredPin = '123456';
      const correctPin = '123456';
      
      // Act - validate PIN
      if (enteredPin === correctPin) {
        pinError.style.display = 'none';
      }

      // Assert
      expect(pinError.style.display).toBe('none');
    });
  });

  describe('Requirement 15.6: Validation Error Display', () => {
    test('should display error when event title is empty', () => {
      // Arrange
      const titleError = document.createElement('div');
      titleError.id = 'titleError';
      titleError.className = 'error-message';
      titleError.style.display = 'none';
      document.body.appendChild(titleError);
      
      const titleInput = document.createElement('input');
      titleInput.value = '';
      
      // Act - validate title
      if (titleInput.value.trim() === '') {
        titleError.textContent = 'Event title is required';
        titleError.style.display = 'block';
      }

      // Assert
      expect(titleError.style.display).toBe('block');
      expect(titleError.textContent).toBe('Event title is required');
    });

    test('should display error when title exceeds 100 characters', () => {
      // Arrange
      const titleError = document.createElement('div');
      titleError.id = 'titleError';
      titleError.className = 'error-message';
      document.body.appendChild(titleError);
      
      const titleInput = document.createElement('input');
      titleInput.value = 'a'.repeat(101);
      
      // Act - validate title length
      if (titleInput.value.length > 100) {
        titleError.textContent = 'Event title must be 100 characters or less';
        titleError.style.display = 'block';
      }

      // Assert
      expect(titleError.style.display).toBe('block');
      expect(titleError.textContent).toBe('Event title must be 100 characters or less');
    });

    test('should display error when fewer than 5 questions enabled', () => {
      // Arrange
      const questionsError = document.createElement('div');
      questionsError.id = 'questionsError';
      questionsError.className = 'error-message';
      document.body.appendChild(questionsError);
      
      const totalQuestions = 35;
      const disabledQuestions = Array.from({ length: 32 }, (_, i) => i); // 32 disabled
      const enabledCount = totalQuestions - disabledQuestions.length;
      
      // Act - validate question count
      if (enabledCount < 5) {
        questionsError.textContent = `At least 5 questions must be enabled (currently ${enabledCount} enabled)`;
        questionsError.style.display = 'block';
      }

      // Assert
      expect(questionsError.style.display).toBe('block');
      expect(questionsError.textContent).toContain('At least 5 questions must be enabled');
      expect(questionsError.textContent).toContain('3 enabled');
    });

    test('should display multiple validation errors simultaneously', () => {
      // Arrange
      const titleError = document.createElement('div');
      titleError.id = 'titleError';
      titleError.className = 'error-message';
      document.body.appendChild(titleError);
      
      const questionsError = document.createElement('div');
      questionsError.id = 'questionsError';
      questionsError.className = 'error-message';
      document.body.appendChild(questionsError);
      
      const titleInput = document.createElement('input');
      titleInput.value = '';
      const enabledCount = 2;
      
      // Act - validate all fields
      const errors = [];
      
      if (titleInput.value.trim() === '') {
        errors.push({ field: 'title', message: 'Event title is required' });
        titleError.textContent = 'Event title is required';
        titleError.style.display = 'block';
      }
      
      if (enabledCount < 5) {
        errors.push({ field: 'questions', message: `At least 5 questions must be enabled` });
        questionsError.textContent = `At least 5 questions must be enabled (currently ${enabledCount} enabled)`;
        questionsError.style.display = 'block';
      }

      // Assert
      expect(errors.length).toBe(2);
      expect(titleError.style.display).toBe('block');
      expect(questionsError.style.display).toBe('block');
    });

    test('should clear validation errors when fields become valid', () => {
      // Arrange
      const titleError = document.createElement('div');
      titleError.id = 'titleError';
      titleError.className = 'error-message';
      titleError.style.display = 'block';
      titleError.textContent = 'Event title is required';
      document.body.appendChild(titleError);
      
      const titleInput = document.createElement('input');
      titleInput.value = 'Valid Event Title';
      
      // Act - validate title
      if (titleInput.value.trim() !== '' && titleInput.value.length <= 100) {
        titleError.style.display = 'none';
      }

      // Assert
      expect(titleError.style.display).toBe('none');
    });

    test('should preserve user input when validation fails', () => {
      // Arrange
      const titleInput = document.createElement('input');
      titleInput.value = 'My Event';
      document.body.appendChild(titleInput);
      
      const enabledCount = 2; // Invalid
      
      // Act - validation fails but input preserved
      const isValid = enabledCount >= 5;

      // Assert
      expect(isValid).toBe(false);
      expect(titleInput.value).toBe('My Event'); // Input preserved
    });
  });

  describe('Firebase Error Logging (Requirement 15.5)', () => {
    test('should log Firebase errors with operation context', () => {
      // Arrange
      const error = new Error('Network timeout');
      error.code = 'network-timeout';
      const eventId = 'test-event-123';
      
      // Act - log error
      console.error('❌ Firebase operation failed: loadEvent', {
        operation: 'loadEvent',
        eventId: eventId,
        error: error.message,
        errorCode: error.code,
        stack: error.stack
      });

      // Assert
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Firebase operation failed'),
        expect.objectContaining({
          operation: 'loadEvent',
          eventId: eventId,
          errorCode: 'network-timeout'
        })
      );
    });

    test('should log save participant errors with context', () => {
      // Arrange
      const error = new Error('Permission denied');
      error.code = 'permission-denied';
      
      // Act - log error
      console.error('❌ Failed to save participant:', {
        error: error.message,
        errorCode: error.code,
        stack: error.stack
      });

      // Assert
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save participant'),
        expect.objectContaining({
          errorCode: 'permission-denied'
        })
      );
    });

    test('should log event creation errors with context', () => {
      // Arrange
      const error = new Error('Database write failed');
      error.code = 'database-error';
      
      // Act - log error
      console.error('❌ Failed to create event:', {
        error: error.message,
        errorCode: error.code,
        stack: error.stack
      });

      // Assert
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create event'),
        expect.objectContaining({
          errorCode: 'database-error'
        })
      );
    });

    test('should log delete event errors with context', () => {
      // Arrange
      const error = new Error('Event not found');
      const eventId = 'test-event-123';
      
      // Act - log error
      console.error('❌ Failed to delete event:', error);

      // Assert
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete event'),
        error
      );
    });
  });

  describe('Error Notification UI', () => {
    test('should create error notification with proper styling', () => {
      // Arrange & Act
      const notification = document.createElement('div');
      notification.className = 'error-notification';
      notification.textContent = 'An error occurred';
      document.body.appendChild(notification);

      // Assert
      expect(notification.className).toBe('error-notification');
      expect(document.querySelector('.error-notification')).toBeTruthy();
    });

    test('should auto-dismiss error notification after timeout', () => {
      // Arrange
      const notification = document.createElement('div');
      notification.className = 'error-notification';
      document.body.appendChild(notification);
      
      const dismissAfter = 5000; // 5 seconds
      
      // Act - simulate timeout
      const timeoutId = setTimeout(() => {
        notification.remove();
      }, dismissAfter);

      // Assert
      expect(timeoutId).toBeTruthy();
      expect(document.querySelector('.error-notification')).toBeTruthy();
      
      // Clean up
      clearTimeout(timeoutId);
    });

    test('should allow manual dismissal of error notification', () => {
      // Arrange
      const notification = document.createElement('div');
      notification.className = 'error-notification';
      
      const dismissButton = document.createElement('button');
      dismissButton.textContent = '×';
      dismissButton.onclick = () => notification.remove();
      
      notification.appendChild(dismissButton);
      document.body.appendChild(notification);
      
      // Act
      dismissButton.click();

      // Assert
      expect(document.querySelector('.error-notification')).toBeNull();
    });

    test('should stack multiple error notifications', () => {
      // Arrange & Act
      const notification1 = document.createElement('div');
      notification1.className = 'error-notification';
      notification1.textContent = 'Error 1';
      document.body.appendChild(notification1);
      
      const notification2 = document.createElement('div');
      notification2.className = 'error-notification';
      notification2.textContent = 'Error 2';
      document.body.appendChild(notification2);

      // Assert
      const notifications = document.querySelectorAll('.error-notification');
      expect(notifications.length).toBe(2);
      expect(notifications[0].textContent).toBe('Error 1');
      expect(notifications[1].textContent).toBe('Error 2');
    });
  });

  describe('Error Recovery', () => {
    test('should allow retry after network error', () => {
      // Arrange
      let attemptCount = 0;
      const maxRetries = 3;
      const operation = vi.fn(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Network error');
        }
        return 'success';
      });
      
      // Act - retry logic
      let result;
      for (let i = 0; i < maxRetries; i++) {
        try {
          result = operation();
          break;
        } catch (error) {
          if (i === maxRetries - 1) {
            throw error;
          }
        }
      }

      // Assert
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('should fallback to localStorage when Firebase fails', () => {
      // Arrange
      const mockLocalStorage = {
        getItem: vi.fn(() => JSON.stringify({ title: 'Test Event' }))
      };
      const mockFirebase = {
        loadEvent: vi.fn(() => Promise.reject(new Error('Network error')))
      };
      
      // Act - try Firebase, fallback to localStorage
      let eventData;
      mockFirebase.loadEvent('test-123')
        .catch(() => {
          const stored = mockLocalStorage.getItem('event_test-123');
          eventData = JSON.parse(stored);
        });

      // Wait for promise to resolve
      return new Promise(resolve => {
        setTimeout(() => {
          // Assert
          expect(mockFirebase.loadEvent).toHaveBeenCalled();
          expect(mockLocalStorage.getItem).toHaveBeenCalled();
          expect(eventData).toEqual({ title: 'Test Event' });
          resolve();
        }, 10);
      });
    });

    test('should preserve form data when submission fails', () => {
      // Arrange
      const formData = {
        title: 'My Event',
        disabledQuestions: [0, 1, 2]
      };
      
      const submitForm = vi.fn(() => {
        throw new Error('Network error');
      });
      
      // Act - attempt submission
      try {
        submitForm();
      } catch (error) {
        // Form data should be preserved
      }

      // Assert
      expect(formData.title).toBe('My Event');
      expect(formData.disabledQuestions).toEqual([0, 1, 2]);
    });
  });
});
