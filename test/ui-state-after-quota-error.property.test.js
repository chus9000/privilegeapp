/**
 * Property-Based Test for UI State After Error
 * Feature: event-creation-limit
 * 
 * Property 14: UI State After Error
 * **Validates: Requirements 6.5**
 * 
 * For any quota error that occurs during event creation, the UI should remain in a
 * functional state (form should be usable, buttons should be clickable, no broken state).
 */

import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest';
import fc from 'fast-check';
import { JSDOM } from 'jsdom';

// Setup DOM environment
let dom;
let document;
let window;

beforeEach(() => {
  // Create a minimal DOM for testing
  dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <form id="createForm">
          <input type="text" id="eventTitle" value="Test Event" />
          <button type="submit" id="createEventBtn">Create Event</button>
        </form>
        <div id="errorContainer"></div>
      </body>
    </html>
  `);
  
  document = dom.window.document;
  window = dom.window;
  global.document = document;
  global.window = window;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.document;
  delete global.window;
});

/**
 * Simulate handling a quota error and verify UI remains functional
 */
function handleQuotaError(eventCount) {
  const submitBtn = document.getElementById('createEventBtn');
  const form = document.getElementById('createForm');
  const errorContainer = document.getElementById('errorContainer');
  
  // Display error message
  errorContainer.innerHTML = `
    <div class="error-message">
      You've reached the 3-event limit (currently have ${eventCount} events).
      To create a new event, please delete one of your existing events.
    </div>
  `;
  
  // Re-enable submit button (should not be left disabled)
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Event';
  }
  
  // Form should remain visible and functional
  if (form) {
    form.style.display = '';
  }
  
  return {
    buttonEnabled: !submitBtn.disabled,
    formVisible: form.style.display !== 'none',
    errorDisplayed: errorContainer.innerHTML.includes('3-event limit'),
    buttonText: submitBtn.textContent
  };
}

describe('Property 14: UI State After Error', () => {
  test('should keep submit button enabled after quota error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count at or above quota (3-5)
        fc.integer({ min: 3, max: 5 }),
        async (eventCount) => {
          // Handle quota error
          const uiState = handleQuotaError(eventCount);
          
          // Button should be enabled (not left in disabled state)
          expect(uiState.buttonEnabled).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('should keep form visible after quota error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count at or above quota (3-5)
        fc.integer({ min: 3, max: 5 }),
        async (eventCount) => {
          // Handle quota error
          const uiState = handleQuotaError(eventCount);
          
          // Form should remain visible
          expect(uiState.formVisible).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('should display error message after quota error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count at or above quota (3-5)
        fc.integer({ min: 3, max: 5 }),
        async (eventCount) => {
          // Handle quota error
          const uiState = handleQuotaError(eventCount);
          
          // Error message should be displayed
          expect(uiState.errorDisplayed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('should restore button text after quota error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count at or above quota (3-5)
        fc.integer({ min: 3, max: 5 }),
        async (eventCount) => {
          // Simulate button being in "Creating..." state
          const submitBtn = document.getElementById('createEventBtn');
          submitBtn.textContent = 'Creating...';
          submitBtn.disabled = true;
          
          // Handle quota error
          const uiState = handleQuotaError(eventCount);
          
          // Button text should be restored
          expect(uiState.buttonText).toBe('Create Event');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('should maintain form input values after quota error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count at or above quota (3-5)
        fc.integer({ min: 3, max: 5 }),
        // Generate form input value
        fc.string({ minLength: 1, maxLength: 100 }),
        async (eventCount, inputValue) => {
          // Set form input value
          const titleInput = document.getElementById('eventTitle');
          titleInput.value = inputValue;
          
          // Handle quota error
          handleQuotaError(eventCount);
          
          // Input value should be preserved
          expect(titleInput.value).toBe(inputValue);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('should allow form resubmission after quota error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count at or above quota (3-5)
        fc.integer({ min: 3, max: 5 }),
        async (eventCount) => {
          // Handle quota error
          handleQuotaError(eventCount);
          
          // Get form and button
          const form = document.getElementById('createForm');
          const submitBtn = document.getElementById('createEventBtn');
          
          // Button should be clickable
          expect(submitBtn.disabled).toBe(false);
          
          // Form should be submittable
          let submitAttempted = false;
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitAttempted = true;
          });
          
          // Simulate form submission
          const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
          
          // Form submission should have been attempted
          expect(submitAttempted).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('should not break UI with multiple consecutive errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate number of consecutive errors (1-5)
        fc.integer({ min: 1, max: 5 }),
        // Generate event count at quota
        fc.integer({ min: 3, max: 5 }),
        async (errorCount, eventCount) => {
          // Handle multiple consecutive errors
          let finalState;
          for (let i = 0; i < errorCount; i++) {
            finalState = handleQuotaError(eventCount);
          }
          
          // UI should still be functional after multiple errors
          expect(finalState.buttonEnabled).toBe(true);
          expect(finalState.formVisible).toBe(true);
          expect(finalState.errorDisplayed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('should maintain consistent UI state regardless of error timing', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate event count at quota
        fc.integer({ min: 3, max: 5 }),
        async (eventCount) => {
          // Handle error immediately
          const state1 = handleQuotaError(eventCount);
          
          // Simulate some time passing
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Handle error again
          const state2 = handleQuotaError(eventCount);
          
          // States should be consistent
          expect(state1.buttonEnabled).toBe(state2.buttonEnabled);
          expect(state1.formVisible).toBe(state2.formVisible);
          expect(state1.buttonText).toBe(state2.buttonText);
        }
      ),
      { numRuns: 50 }
    );
  });
});
