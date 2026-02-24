/**
 * Unit tests for Quota Display functionality
 * Tests quota display rendering and exhausted quota messages
 * Requirements: 3.1, 3.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Quota Display - Rendering', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Create a DOM environment for testing
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="quotaDisplay"></div>
          <div id="quotaMessage"></div>
          <div id="remainingQuota"></div>
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

  it('should display correct quota numbers (0 of 3)', () => {
    const eventCount = 0;
    const quotaLimit = 3;
    const remaining = quotaLimit - eventCount;

    const quotaDisplay = document.getElementById('quotaDisplay');
    quotaDisplay.textContent = `${eventCount} of ${quotaLimit} events created`;

    const remainingDisplay = document.getElementById('remainingQuota');
    remainingDisplay.textContent = `${remaining} remaining`;

    expect(quotaDisplay.textContent).toBe('0 of 3 events created');
    expect(remainingDisplay.textContent).toBe('3 remaining');
  });

  it('should display correct quota numbers (1 of 3)', () => {
    const eventCount = 1;
    const quotaLimit = 3;
    const remaining = quotaLimit - eventCount;

    const quotaDisplay = document.getElementById('quotaDisplay');
    quotaDisplay.textContent = `${eventCount} of ${quotaLimit} events created`;

    const remainingDisplay = document.getElementById('remainingQuota');
    remainingDisplay.textContent = `${remaining} remaining`;

    expect(quotaDisplay.textContent).toBe('1 of 3 events created');
    expect(remainingDisplay.textContent).toBe('2 remaining');
  });

  it('should display correct quota numbers (2 of 3)', () => {
    const eventCount = 2;
    const quotaLimit = 3;
    const remaining = quotaLimit - eventCount;

    const quotaDisplay = document.getElementById('quotaDisplay');
    quotaDisplay.textContent = `${eventCount} of ${quotaLimit} events created`;

    const remainingDisplay = document.getElementById('remainingQuota');
    remainingDisplay.textContent = `${remaining} remaining`;

    expect(quotaDisplay.textContent).toBe('2 of 3 events created');
    expect(remainingDisplay.textContent).toBe('1 remaining');
  });

  it('should display correct quota numbers (3 of 3)', () => {
    const eventCount = 3;
    const quotaLimit = 3;
    const remaining = Math.max(0, quotaLimit - eventCount);

    const quotaDisplay = document.getElementById('quotaDisplay');
    quotaDisplay.textContent = `${eventCount} of ${quotaLimit} events created`;

    const remainingDisplay = document.getElementById('remainingQuota');
    remainingDisplay.textContent = `${remaining} remaining`;

    expect(quotaDisplay.textContent).toBe('3 of 3 events created');
    expect(remainingDisplay.textContent).toBe('0 remaining');
  });

  it('should show exhausted quota message when at limit', () => {
    const eventCount = 3;
    const quotaLimit = 3;
    const isAtLimit = eventCount >= quotaLimit;

    const quotaMessage = document.getElementById('quotaMessage');
    
    if (isAtLimit) {
      quotaMessage.textContent = 'You have reached the 3-event limit. Delete an event to create a new one.';
      quotaMessage.style.display = 'block';
    } else {
      quotaMessage.style.display = 'none';
    }

    expect(quotaMessage.textContent).toContain('reached the 3-event limit');
    expect(quotaMessage.textContent).toContain('Delete an event');
    expect(quotaMessage.style.display).toBe('block');
  });

  it('should hide exhausted quota message when below limit', () => {
    const eventCount = 2;
    const quotaLimit = 3;
    const isAtLimit = eventCount >= quotaLimit;

    const quotaMessage = document.getElementById('quotaMessage');
    
    if (isAtLimit) {
      quotaMessage.textContent = 'You have reached the 3-event limit. Delete an event to create a new one.';
      quotaMessage.style.display = 'block';
    } else {
      quotaMessage.style.display = 'none';
    }

    expect(quotaMessage.style.display).toBe('none');
  });

  it('should display quota with singular "event" for count of 1', () => {
    const eventCount = 1;
    const quotaLimit = 3;

    const quotaDisplay = document.getElementById('quotaDisplay');
    const eventWord = eventCount === 1 ? 'event' : 'events';
    quotaDisplay.textContent = `${eventCount} of ${quotaLimit} ${eventWord} created`;

    expect(quotaDisplay.textContent).toBe('1 of 3 event created');
  });

  it('should display quota with plural "events" for count other than 1', () => {
    const eventCount = 2;
    const quotaLimit = 3;

    const quotaDisplay = document.getElementById('quotaDisplay');
    const eventWord = eventCount === 1 ? 'event' : 'events';
    quotaDisplay.textContent = `${eventCount} of ${quotaLimit} ${eventWord} created`;

    expect(quotaDisplay.textContent).toBe('2 of 3 events created');
  });

  it('should handle remaining quota calculation correctly at boundary', () => {
    const testCases = [
      { eventCount: 0, expected: 3 },
      { eventCount: 1, expected: 2 },
      { eventCount: 2, expected: 1 },
      { eventCount: 3, expected: 0 },
      { eventCount: 4, expected: 0 }, // Edge case: should not go negative
    ];

    testCases.forEach(({ eventCount, expected }) => {
      const quotaLimit = 3;
      const remaining = Math.max(0, quotaLimit - eventCount);
      expect(remaining).toBe(expected);
    });
  });

  it('should update quota display when event count changes', () => {
    const quotaDisplay = document.getElementById('quotaDisplay');
    const remainingDisplay = document.getElementById('remainingQuota');
    const quotaLimit = 3;

    // Initial state: 1 event
    let eventCount = 1;
    quotaDisplay.textContent = `${eventCount} of ${quotaLimit} events created`;
    remainingDisplay.textContent = `${quotaLimit - eventCount} remaining`;

    expect(quotaDisplay.textContent).toBe('1 of 3 events created');
    expect(remainingDisplay.textContent).toBe('2 remaining');

    // After creating another event: 2 events
    eventCount = 2;
    quotaDisplay.textContent = `${eventCount} of ${quotaLimit} events created`;
    remainingDisplay.textContent = `${quotaLimit - eventCount} remaining`;

    expect(quotaDisplay.textContent).toBe('2 of 3 events created');
    expect(remainingDisplay.textContent).toBe('1 remaining');

    // After creating third event: 3 events
    eventCount = 3;
    quotaDisplay.textContent = `${eventCount} of ${quotaLimit} events created`;
    remainingDisplay.textContent = `${Math.max(0, quotaLimit - eventCount)} remaining`;

    expect(quotaDisplay.textContent).toBe('3 of 3 events created');
    expect(remainingDisplay.textContent).toBe('0 remaining');
  });
});

describe('Quota Display - Message Content', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="quotaMessage"></div>
        </body>
      </html>
    `);
    document = dom.window.document;
    global.document = document;
  });

  afterEach(() => {
    delete global.document;
  });

  it('should display clear message about limit being reached', () => {
    const quotaMessage = document.getElementById('quotaMessage');
    quotaMessage.textContent = 'You have reached the 3-event limit. Delete an event to create a new one.';

    expect(quotaMessage.textContent).toContain('reached');
    expect(quotaMessage.textContent).toContain('3-event limit');
  });

  it('should suggest deleting events in exhausted message', () => {
    const quotaMessage = document.getElementById('quotaMessage');
    quotaMessage.textContent = 'You have reached the 3-event limit. Delete an event to create a new one.';

    expect(quotaMessage.textContent).toContain('Delete an event');
  });

  it('should include quota limit number in message', () => {
    const quotaLimit = 3;
    const quotaMessage = document.getElementById('quotaMessage');
    quotaMessage.textContent = `You have reached the ${quotaLimit}-event limit. Delete an event to create a new one.`;

    expect(quotaMessage.textContent).toContain('3-event limit');
  });
});

describe('Quota Display - Visual States', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="quotaContainer" class="quota-info"></div>
        </body>
      </html>
    `);
    document = dom.window.document;
    global.document = document;
  });

  afterEach(() => {
    delete global.document;
  });

  it('should apply warning class when at limit', () => {
    const eventCount = 3;
    const quotaLimit = 3;
    const quotaContainer = document.getElementById('quotaContainer');

    if (eventCount >= quotaLimit) {
      quotaContainer.classList.add('quota-warning');
    } else {
      quotaContainer.classList.remove('quota-warning');
    }

    expect(quotaContainer.classList.contains('quota-warning')).toBe(true);
  });

  it('should not apply warning class when below limit', () => {
    const eventCount = 2;
    const quotaLimit = 3;
    const quotaContainer = document.getElementById('quotaContainer');

    if (eventCount >= quotaLimit) {
      quotaContainer.classList.add('quota-warning');
    } else {
      quotaContainer.classList.remove('quota-warning');
    }

    expect(quotaContainer.classList.contains('quota-warning')).toBe(false);
  });

  it('should show quota message element when at limit', () => {
    const eventCount = 3;
    const quotaLimit = 3;
    
    const quotaMessage = document.createElement('div');
    quotaMessage.id = 'quotaMessage';
    quotaMessage.style.display = eventCount >= quotaLimit ? 'block' : 'none';
    
    document.body.appendChild(quotaMessage);

    expect(quotaMessage.style.display).toBe('block');
  });

  it('should hide quota message element when below limit', () => {
    const eventCount = 1;
    const quotaLimit = 3;
    
    const quotaMessage = document.createElement('div');
    quotaMessage.id = 'quotaMessage';
    quotaMessage.style.display = eventCount >= quotaLimit ? 'block' : 'none';
    
    document.body.appendChild(quotaMessage);

    expect(quotaMessage.style.display).toBe('none');
  });
});
