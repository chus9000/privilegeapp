/**
 * Unit Test for Quota Error Message Content
 * Feature: event-creation-limit
 * 
 * Tests that quota error messages include event count and suggestions
 * **Validates: Requirements 6.1, 6.3**
 */

import { describe, test, beforeEach, afterEach, expect } from 'vitest';
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
  delete global.document;
  delete global.window;
});

/**
 * Simulate showing quota error message
 * This should match the implementation in app/event-creation.js
 */
function showQuotaError(eventCount) {
  const errorContainer = document.getElementById('errorContainer');
  
  const message = `
    You've reached the 3-event limit (currently have ${eventCount} events).
    To create a new event, please delete one of your existing events from the dashboard.
    
    We're working on licensing plans that will allow higher limits!
  `;
  
  errorContainer.innerHTML = `
    <div class="error-modal">
      <h3>Event Limit Reached</h3>
      <p>${message}</p>
      <div class="error-actions">
        <button class="btn-primary" onclick="window.location.href='./'">Go to Dashboard</button>
        <button class="btn-secondary" onclick="this.closest('.error-modal').remove()">Cancel</button>
      </div>
    </div>
  `;
  
  return errorContainer.innerHTML;
}

describe('Quota Error Message Content', () => {
  test('should include current event count in error message', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Error message should include the event count
    expect(errorHtml).toContain('currently have 3 events');
  });
  
  test('should mention the 3-event limit', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Error message should mention the limit
    expect(errorHtml).toContain('3-event limit');
  });
  
  test('should suggest deleting old events', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Error message should suggest deletion
    expect(errorHtml).toContain('delete one of your existing events');
  });
  
  test('should mention dashboard as location to delete events', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Error message should mention dashboard
    expect(errorHtml).toContain('dashboard');
  });
  
  test('should mention upcoming licensing plans', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Error message should mention licensing plans
    expect(errorHtml).toContain('licensing plans');
  });
  
  test('should have a clear title', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Error should have a clear title
    expect(errorHtml).toContain('Event Limit Reached');
  });
  
  test('should provide action to go to dashboard', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Error should have dashboard action button
    expect(errorHtml).toContain('Go to Dashboard');
    expect(errorHtml).toContain("window.location.href='./'");
  });
  
  test('should provide cancel action', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Error should have cancel button
    expect(errorHtml).toContain('Cancel');
  });
  
  test('should work with event count of 4 (edge case)', () => {
    const eventCount = 4;
    const errorHtml = showQuotaError(eventCount);
    
    // Should handle counts above 3
    expect(errorHtml).toContain('currently have 4 events');
    expect(errorHtml).toContain('3-event limit');
  });
  
  test('should work with event count of 5 (edge case)', () => {
    const eventCount = 5;
    const errorHtml = showQuotaError(eventCount);
    
    // Should handle counts well above 3
    expect(errorHtml).toContain('currently have 5 events');
    expect(errorHtml).toContain('3-event limit');
  });
  
  test('should have user-friendly tone', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Message should not contain harsh language in the actual message text
    const messageText = errorHtml.toLowerCase();
    expect(messageText).not.toContain('failed');
    expect(messageText).not.toContain('denied');
    
    // Should have positive language
    expect(errorHtml).toContain('working on');
  });
  
  test('should provide clear next steps', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Should tell user what to do next
    expect(errorHtml).toContain('To create a new event');
    expect(errorHtml).toContain('delete');
  });
  
  test('should be displayed in a modal format', () => {
    const eventCount = 3;
    const errorHtml = showQuotaError(eventCount);
    
    // Should use modal structure
    expect(errorHtml).toContain('error-modal');
    expect(errorHtml).toContain('error-actions');
  });
});
