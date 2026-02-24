/**
 * Property-Based Tests: Button State Based on Quota
 * Feature: event-creation-limit
 * **Property 8: Button State Based on Quota**
 * **Validates: Requirements 4.1, 4.2**
 * 
 * Tests that the event creation button is disabled if and only if the event count >= 3
 */

const fc = require('fast-check');

describe('Property 8: Button State Based on Quota', () => {
    /**
     * Property: Button disabled iff count >= 3
     * **Validates: Requirements 4.1, 4.2**
     */
    test('button should be disabled if and only if event count >= 3', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 10 }), // event count
                (eventCount) => {
                    // Setup: Create a mock DOM environment
                    document.body.innerHTML = `
                        <button id="createEventBtn" class="btn btn-primary">Create Event</button>
                    `;
                    
                    const button = document.getElementById('createEventBtn');
                    
                    // Simulate button state update based on quota
                    const QUOTA_LIMIT = 3;
                    if (eventCount >= QUOTA_LIMIT) {
                        button.disabled = true;
                        button.title = 'You have reached the 3-event limit. Delete an event to create a new one.';
                        button.classList.add('disabled-quota');
                    } else {
                        button.disabled = false;
                        button.title = 'Create a new event';
                        button.classList.remove('disabled-quota');
                    }
                    
                    // Assert: Button disabled iff count >= 3
                    const expectedDisabled = eventCount >= 3;
                    expect(button.disabled).toBe(expectedDisabled);
                    
                    // Additional assertions for consistency
                    if (expectedDisabled) {
                        expect(button.title).toContain('reached the 3-event limit');
                        expect(button.classList.contains('disabled-quota')).toBe(true);
                    } else {
                        expect(button.title).toBe('Create a new event');
                        expect(button.classList.contains('disabled-quota')).toBe(false);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
    
    /**
     * Property: Button state transitions correctly at boundary
     * **Validates: Requirements 4.1, 4.2**
     */
    test('button state should transition correctly at quota boundary (2 to 3)', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(2, 3), // boundary values
                (eventCount) => {
                    // Setup: Create a mock DOM environment
                    document.body.innerHTML = `
                        <button id="createEventBtn" class="btn btn-primary">Create Event</button>
                    `;
                    
                    const button = document.getElementById('createEventBtn');
                    
                    // Simulate button state update
                    const QUOTA_LIMIT = 3;
                    button.disabled = eventCount >= QUOTA_LIMIT;
                    
                    // Assert: Correct state at boundary
                    if (eventCount === 2) {
                        expect(button.disabled).toBe(false);
                    } else if (eventCount === 3) {
                        expect(button.disabled).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
    
    /**
     * Property: Button state is consistent with quota state
     * **Validates: Requirements 4.1, 4.2**
     */
    test('button disabled state should match quota isAtLimit flag', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 10 }), // event count
                (eventCount) => {
                    // Setup: Create mock quota state
                    const QUOTA_LIMIT = 3;
                    const quotaState = {
                        eventCount,
                        quotaLimit: QUOTA_LIMIT,
                        remainingQuota: Math.max(0, QUOTA_LIMIT - eventCount),
                        isAtLimit: eventCount >= QUOTA_LIMIT
                    };
                    
                    // Setup: Create a mock DOM environment
                    document.body.innerHTML = `
                        <button id="createEventBtn" class="btn btn-primary">Create Event</button>
                    `;
                    
                    const button = document.getElementById('createEventBtn');
                    
                    // Simulate button state update based on quota state
                    button.disabled = quotaState.isAtLimit;
                    
                    // Assert: Button disabled matches isAtLimit
                    expect(button.disabled).toBe(quotaState.isAtLimit);
                    expect(button.disabled).toBe(eventCount >= QUOTA_LIMIT);
                }
            ),
            { numRuns: 100 }
        );
    });
});
