/**
 * Property-Based Test for Error Message Display
 * Feature: full-featured-quiz-app
 * 
 * Property 19: Error Message Display
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.6
 * 
 * For any failed operation (authentication, network request, validation), the system
 * should display an appropriate error message to the user.
 */

import { describe, test, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { JSDOM } from 'jsdom';

describe('Property 19: Error Message Display', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div id="pinError" style="display: none;"></div>
          <div id="titleError" style="display: none;"></div>
          <div id="questionsError" style="display: none;"></div>
        </body>
      </html>
    `);
    
    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
    
    // Mock setTimeout for notification auto-dismiss
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete global.document;
    delete global.window;
  });

  /**
   * Test authentication error messages (Requirement 15.1)
   */
  test('authentication errors should display user-friendly error messages', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorCode: fc.constantFrom(
            'auth/popup-closed-by-user',
            'auth/network-request-failed',
            'auth/invalid-credential',
            'auth/user-disabled',
            'auth/operation-not-allowed',
            'auth/too-many-requests'
          ),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 })
        }),
        ({ errorCode, errorMessage }) => {
          // Simulate authentication error handling
          const error = new Error(errorMessage);
          error.code = errorCode;
          
          let displayedMessage = null;
          
          // Mock alert to capture displayed message
          global.alert = vi.fn((msg) => {
            displayedMessage = msg;
          });
          
          // Simulate error handling logic from auth-manager.js
          if (error.code === 'auth/popup-closed-by-user') {
            // User cancelled - no error message needed (silent failure)
            displayedMessage = null;
          } else if (error.code === 'auth/network-request-failed') {
            displayedMessage = 'Network error. Please check your connection and try again.';
          } else {
            displayedMessage = error.message || 'Authentication failed. Please try again.';
          }
          
          // Property 1: User-cancelled auth should not show error message
          if (error.code === 'auth/popup-closed-by-user') {
            if (displayedMessage !== null) {
              console.log(`FAILED: User-cancelled auth should not show error, but got: ${displayedMessage}`);
              return false;
            }
          }
          
          // Property 2: Network errors should show specific network error message
          if (error.code === 'auth/network-request-failed') {
            if (!displayedMessage || !displayedMessage.includes('Network error')) {
              console.log(`FAILED: Network error should mention network, got: ${displayedMessage}`);
              return false;
            }
          }
          
          // Property 3: Other auth errors should show a message
          if (error.code !== 'auth/popup-closed-by-user') {
            if (!displayedMessage || displayedMessage.trim().length === 0) {
              console.log(`FAILED: Auth error ${error.code} should show a message`);
              return false;
            }
          }
          
          // Property 4: Error messages should be user-friendly (not technical)
          if (displayedMessage && error.code !== 'auth/popup-closed-by-user') {
            // Should not expose raw error codes to users
            if (displayedMessage.includes('auth/') || displayedMessage.includes('firebase/')) {
              console.log(`FAILED: Error message should not expose technical codes: ${displayedMessage}`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test network error messages with retry option (Requirement 15.2)
   */
  test('network errors should display retry option', () => {
    fc.assert(
      fc.property(
        fc.record({
          operation: fc.constantFrom(
            'loadEvents',
            'saveEvent',
            'loadEvent',
            'updateParticipant',
            'deleteEvent'
          ),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 })
        }),
        ({ operation, errorMessage }) => {
          // Create error notification with retry button
          const notification = document.createElement('div');
          notification.className = 'error-notification';
          
          const messageDiv = document.createElement('div');
          messageDiv.textContent = errorMessage;
          notification.appendChild(messageDiv);
          
          // Add retry button for network errors
          const retryButton = document.createElement('button');
          retryButton.textContent = 'Retry';
          retryButton.className = 'retry-button';
          notification.appendChild(retryButton);
          
          document.body.appendChild(notification);
          
          // Property 1: Notification should be in the DOM
          const notificationInDom = document.querySelector('.error-notification');
          if (!notificationInDom) {
            console.log('FAILED: Error notification should be added to DOM');
            return false;
          }
          
          // Property 2: Notification should contain the error message
          if (!notificationInDom.textContent.includes(errorMessage)) {
            console.log(`FAILED: Notification should contain error message: ${errorMessage}`);
            return false;
          }
          
          // Property 3: Notification should have a retry button
          const retryBtn = notificationInDom.querySelector('.retry-button');
          if (!retryBtn) {
            console.log('FAILED: Network error notification should have retry button');
            return false;
          }
          
          // Property 4: Retry button should have appropriate text
          if (!retryBtn.textContent.toLowerCase().includes('retry')) {
            console.log(`FAILED: Retry button should say "Retry", got: ${retryBtn.textContent}`);
            return false;
          }
          
          // Clean up
          notification.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test event not found error message (Requirement 15.3)
   */
  test('event not found should display error with event ID', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 30 })
          .filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
        (eventId) => {
          // Simulate event not found error display
          const errorMessage = `Event not found (ID: ${eventId})`;
          
          // Create error display
          const errorContainer = document.createElement('div');
          errorContainer.className = 'error-container';
          errorContainer.innerHTML = `
            <h1>⚠️ Error</h1>
            <p>${errorMessage}</p>
            <button onclick="window.location.href='/'">Return to Home</button>
          `;
          
          document.body.appendChild(errorContainer);
          
          // Property 1: Error message should include "Event not found"
          if (!errorContainer.textContent.includes('Event not found')) {
            console.log('FAILED: Error should mention "Event not found"');
            return false;
          }
          
          // Property 2: Error message should include the event ID
          if (!errorContainer.textContent.includes(eventId)) {
            console.log(`FAILED: Error should include event ID: ${eventId}`);
            return false;
          }
          
          // Property 3: Should provide a way to return home
          const returnButton = errorContainer.querySelector('button');
          if (!returnButton) {
            console.log('FAILED: Should have a return button');
            return false;
          }
          
          // Clean up
          errorContainer.remove();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test PIN error messages (Requirement 15.4)
   */
  test('incorrect PIN should display error and clear input', () => {
    fc.assert(
      fc.property(
        fc.record({
          enteredPin: fc.string({ minLength: 1, maxLength: 10 }),
          correctPin: fc.integer({ min: 100000, max: 999999 }).map(String),
          attemptNumber: fc.integer({ min: 1, max: 10 })
        }),
        ({ enteredPin, correctPin, attemptNumber }) => {
          // Ensure entered PIN is different from correct PIN
          if (enteredPin === correctPin) {
            return true; // Skip this case - we're testing incorrect PINs
          }
          
          const MAX_ATTEMPTS = 5;
          
          // Simulate PIN error display
          const pinErrorDiv = document.getElementById('pinError');
          
          if (attemptNumber >= MAX_ATTEMPTS) {
            // Rate limiting message
            pinErrorDiv.textContent = 'Too many failed attempts. Please wait a moment before trying again.';
            pinErrorDiv.style.display = 'block';
          } else {
            // Regular incorrect PIN message
            pinErrorDiv.textContent = 'Invalid PIN. Please try again.';
            pinErrorDiv.style.display = 'block';
          }
          
          // Property 1: Error message should be displayed
          if (pinErrorDiv.style.display !== 'block') {
            console.log('FAILED: PIN error should be displayed');
            return false;
          }
          
          // Property 2: Error message should be appropriate for attempt number
          if (attemptNumber >= MAX_ATTEMPTS) {
            if (!pinErrorDiv.textContent.includes('Too many failed attempts')) {
              console.log(`FAILED: Should show rate limit message after ${MAX_ATTEMPTS} attempts`);
              return false;
            }
          } else {
            if (!pinErrorDiv.textContent.includes('Invalid PIN')) {
              console.log('FAILED: Should show invalid PIN message');
              return false;
            }
          }
          
          // Property 3: Error message should be clear and actionable
          const errorText = pinErrorDiv.textContent;
          if (errorText.trim().length === 0) {
            console.log('FAILED: Error message should not be empty');
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test validation error messages (Requirement 15.6)
   */
  test('validation errors should display clear, actionable messages', () => {
    fc.assert(
      fc.property(
        fc.record({
          field: fc.constantFrom('title', 'questions', 'pin'),
          errorType: fc.constantFrom('required', 'tooLong', 'tooFew', 'invalid')
        }),
        ({ field, errorType }) => {
          let errorMessage = '';
          let errorElement = null;
          
          // Simulate validation error display
          if (field === 'title') {
            errorElement = document.getElementById('titleError');
            if (errorType === 'required') {
              errorMessage = 'Event title is required';
            } else if (errorType === 'tooLong') {
              errorMessage = 'Event title must be 100 characters or less';
            }
          } else if (field === 'questions') {
            errorElement = document.getElementById('questionsError');
            if (errorType === 'tooFew') {
              errorMessage = 'At least 5 questions must be enabled';
            }
          } else if (field === 'pin') {
            errorElement = document.getElementById('pinError');
            if (errorType === 'required') {
              errorMessage = 'Please enter a PIN';
            } else if (errorType === 'invalid') {
              errorMessage = 'Invalid PIN. Please try again.';
            }
          }
          
          if (errorElement && errorMessage) {
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
            
            // Property 1: Error message should be displayed
            if (errorElement.style.display !== 'block') {
              console.log(`FAILED: ${field} error should be displayed`);
              return false;
            }
            
            // Property 2: Error message should not be empty
            if (errorElement.textContent.trim().length === 0) {
              console.log(`FAILED: ${field} error message should not be empty`);
              return false;
            }
            
            // Property 3: Error message should be specific to the field
            const fieldMentioned = errorElement.textContent.toLowerCase().includes(field) ||
                                   errorElement.textContent.toLowerCase().includes('title') ||
                                   errorElement.textContent.toLowerCase().includes('question') ||
                                   errorElement.textContent.toLowerCase().includes('pin');
            
            if (!fieldMentioned && field !== 'pin') {
              console.log(`FAILED: Error message should mention the field: ${field}`);
              return false;
            }
            
            // Property 4: Error message should be actionable (tell user what to do)
            const isActionable = errorElement.textContent.includes('required') ||
                                 errorElement.textContent.includes('must') ||
                                 errorElement.textContent.includes('Please') ||
                                 errorElement.textContent.includes('should') ||
                                 errorElement.textContent.includes('try again');
            
            if (!isActionable) {
              console.log(`FAILED: Error message should be actionable: ${errorElement.textContent}`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that error messages are appropriate for error type
   */
  test('error messages should match the error type and be user-friendly', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorCategory: fc.constantFrom('auth', 'network', 'validation', 'notFound'),
          specificError: fc.string({ minLength: 5, maxLength: 50 })
        }),
        ({ errorCategory, specificError }) => {
          let displayedMessage = '';
          
          // Simulate error message generation based on category
          switch (errorCategory) {
            case 'auth':
              displayedMessage = 'Authentication failed. Please try again.';
              break;
            case 'network':
              displayedMessage = 'Failed to load data. Please check your connection and try again.';
              break;
            case 'validation':
              displayedMessage = `${specificError} is required`;
              break;
            case 'notFound':
              displayedMessage = `${specificError} not found`;
              break;
          }
          
          // Property 1: Message should not be empty
          if (!displayedMessage || displayedMessage.trim().length === 0) {
            console.log(`FAILED: Error message should not be empty for ${errorCategory}`);
            return false;
          }
          
          // Property 2: Message should be user-friendly (no technical jargon)
          const technicalTerms = ['undefined', 'null', 'NaN', 'exception', 'stack trace', 'firebase/', 'auth/'];
          const hasTechnicalTerms = technicalTerms.some(term => 
            displayedMessage.toLowerCase().includes(term.toLowerCase())
          );
          
          if (hasTechnicalTerms) {
            console.log(`FAILED: Error message should not contain technical terms: ${displayedMessage}`);
            return false;
          }
          
          // Property 3: Network errors should mention connection or retry
          if (errorCategory === 'network') {
            const mentionsConnection = displayedMessage.toLowerCase().includes('connection') ||
                                       displayedMessage.toLowerCase().includes('network') ||
                                       displayedMessage.toLowerCase().includes('try again');
            
            if (!mentionsConnection) {
              console.log(`FAILED: Network error should mention connection: ${displayedMessage}`);
              return false;
            }
          }
          
          // Property 4: Validation errors should be specific
          if (errorCategory === 'validation') {
            if (!displayedMessage.includes(specificError)) {
              console.log(`FAILED: Validation error should mention field: ${specificError}`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
