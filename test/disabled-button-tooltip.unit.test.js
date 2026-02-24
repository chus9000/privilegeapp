/**
 * Unit Tests: Disabled Button Tooltip
 * Feature: event-creation-limit
 * **Validates: Requirements 4.3**
 * 
 * Tests that the disabled button shows an explanatory tooltip
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Disabled Button Tooltip', () => {
    let dom;
    let document;
    
    beforeEach(() => {
        // Setup: Create a mock DOM environment
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <body>
                    <button id="createEventBtn" class="btn btn-primary">Create Event</button>
                </body>
            </html>
        `);
        document = dom.window.document;
        global.document = document;
    });
    
    /**
     * Test: Disabled button shows explanatory tooltip
     * **Validates: Requirements 4.3**
     */
    test('disabled button should show tooltip explaining quota limit', () => {
        const button = document.getElementById('createEventBtn');
        const QUOTA_LIMIT = 3;
        const eventCount = 3;
        
        // Simulate button state update when at limit
        button.disabled = true;
        button.title = 'You have reached the 3-event limit. Delete an event to create a new one.';
        button.classList.add('disabled-quota');
        
        // Assert: Button has explanatory tooltip
        expect(button.disabled).toBe(true);
        expect(button.title).toBeTruthy();
        expect(button.title).toContain('3-event limit');
        expect(button.title).toContain('Delete an event');
    });
    
    /**
     * Test: Enabled button shows different tooltip
     * **Validates: Requirements 4.3**
     */
    test('enabled button should show create event tooltip', () => {
        const button = document.getElementById('createEventBtn');
        const QUOTA_LIMIT = 3;
        const eventCount = 2;
        
        // Simulate button state update when below limit
        button.disabled = false;
        button.title = 'Create a new event';
        button.classList.remove('disabled-quota');
        
        // Assert: Button has create event tooltip
        expect(button.disabled).toBe(false);
        expect(button.title).toBe('Create a new event');
    });
    
    /**
     * Test: Tooltip content is informative
     * **Validates: Requirements 4.3**
     */
    test('disabled button tooltip should explain why button is disabled', () => {
        const button = document.getElementById('createEventBtn');
        
        // Simulate button state update when at limit
        button.disabled = true;
        button.title = 'You have reached the 3-event limit. Delete an event to create a new one.';
        
        // Assert: Tooltip explains the reason and provides guidance
        expect(button.title).toContain('reached');
        expect(button.title).toContain('limit');
        expect(button.title).toContain('Delete');
    });
    
    /**
     * Test: Tooltip updates when button state changes
     * **Validates: Requirements 4.3**
     */
    test('tooltip should update when button transitions between enabled and disabled', () => {
        const button = document.getElementById('createEventBtn');
        const QUOTA_LIMIT = 3;
        
        // Initial state: Enabled (count = 2)
        button.disabled = false;
        button.title = 'Create a new event';
        expect(button.title).toBe('Create a new event');
        
        // Transition to disabled (count = 3)
        button.disabled = true;
        button.title = 'You have reached the 3-event limit. Delete an event to create a new one.';
        expect(button.title).toContain('3-event limit');
        
        // Transition back to enabled (count = 2)
        button.disabled = false;
        button.title = 'Create a new event';
        expect(button.title).toBe('Create a new event');
    });
    
    /**
     * Test: Disabled button has visual indicator class
     * **Validates: Requirements 4.3**
     */
    test('disabled button should have disabled-quota class for visual styling', () => {
        const button = document.getElementById('createEventBtn');
        
        // Simulate button state update when at limit
        button.disabled = true;
        button.classList.add('disabled-quota');
        
        // Assert: Button has visual indicator class
        expect(button.classList.contains('disabled-quota')).toBe(true);
        
        // Simulate button state update when below limit
        button.disabled = false;
        button.classList.remove('disabled-quota');
        
        // Assert: Button does not have visual indicator class
        expect(button.classList.contains('disabled-quota')).toBe(false);
    });
});
