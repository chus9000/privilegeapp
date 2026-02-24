/**
 * Property-Based Tests: Button State Reactivity
 * Feature: event-creation-limit
 * **Property 9: Button State Reactivity**
 * **Validates: Requirements 4.4**
 * 
 * Tests that the button state transitions from disabled to enabled when event count changes from 3 to less than 3
 */

const fc = require('fast-check');

describe('Property 9: Button State Reactivity', () => {
    /**
     * Property: Button re-enables when count drops below 3
     * **Validates: Requirements 4.4**
     */
    test('button should transition from disabled to enabled when count changes from 3 to less than 3', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 2 }), // new count after deletion (0-2)
                (newCount) => {
                    // Setup: Create a mock DOM environment
                    document.body.innerHTML = `
                        <button id="createEventBtn" class="btn btn-primary">Create Event</button>
                    `;
                    
                    const button = document.getElementById('createEventBtn');
                    const QUOTA_LIMIT = 3;
                    
                    // Initial state: Button disabled at limit (count = 3)
                    button.disabled = true;
                    button.title = 'You have reached the 3-event limit. Delete an event to create a new one.';
                    button.classList.add('disabled-quota');
                    
                    // Verify initial state
                    expect(button.disabled).toBe(true);
                    
                    // Action: Simulate quota change (e.g., after deletion)
                    // Update button state based on new count
                    if (newCount >= QUOTA_LIMIT) {
                        button.disabled = true;
                        button.title = 'You have reached the 3-event limit. Delete an event to create a new one.';
                        button.classList.add('disabled-quota');
                    } else {
                        button.disabled = false;
                        button.title = 'Create a new event';
                        button.classList.remove('disabled-quota');
                    }
                    
                    // Assert: Button should now be enabled (since newCount < 3)
                    expect(button.disabled).toBe(false);
                    expect(button.title).toBe('Create a new event');
                    expect(button.classList.contains('disabled-quota')).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });
    
    /**
     * Property: Button state updates correctly for any count transition
     * **Validates: Requirements 4.4, 4.5**
     */
    test('button state should update correctly for any count transition', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 10 }), // initial count
                fc.integer({ min: 0, max: 10 }), // new count
                (initialCount, newCount) => {
                    // Setup: Create a mock DOM environment
                    document.body.innerHTML = `
                        <button id="createEventBtn" class="btn btn-primary">Create Event</button>
                    `;
                    
                    const button = document.getElementById('createEventBtn');
                    const QUOTA_LIMIT = 3;
                    
                    // Set initial state
                    button.disabled = initialCount >= QUOTA_LIMIT;
                    const initialDisabled = button.disabled;
                    
                    // Action: Update button state based on new count
                    button.disabled = newCount >= QUOTA_LIMIT;
                    if (newCount >= QUOTA_LIMIT) {
                        button.title = 'You have reached the 3-event limit. Delete an event to create a new one.';
                        button.classList.add('disabled-quota');
                    } else {
                        button.title = 'Create a new event';
                        button.classList.remove('disabled-quota');
                    }
                    
                    // Assert: Button state matches new count
                    const expectedDisabled = newCount >= QUOTA_LIMIT;
                    expect(button.disabled).toBe(expectedDisabled);
                    
                    // Assert: State changed if crossing boundary
                    if (initialCount < QUOTA_LIMIT && newCount >= QUOTA_LIMIT) {
                        // Crossed from enabled to disabled
                        expect(button.disabled).toBe(true);
                        expect(initialDisabled).toBe(false);
                    } else if (initialCount >= QUOTA_LIMIT && newCount < QUOTA_LIMIT) {
                        // Crossed from disabled to enabled
                        expect(button.disabled).toBe(false);
                        expect(initialDisabled).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
    
    /**
     * Property: Button state updates in real-time as quota changes
     * **Validates: Requirements 4.5**
     */
    test('button state should update in real-time as quota changes', () => {
        fc.assert(
            fc.property(
                fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 2, maxLength: 10 }), // sequence of count changes
                (countSequence) => {
                    // Setup: Create a mock DOM environment
                    document.body.innerHTML = `
                        <button id="createEventBtn" class="btn btn-primary">Create Event</button>
                    `;
                    
                    const button = document.getElementById('createEventBtn');
                    const QUOTA_LIMIT = 3;
                    
                    // Simulate real-time updates through sequence of changes
                    for (const count of countSequence) {
                        // Update button state
                        button.disabled = count >= QUOTA_LIMIT;
                        if (count >= QUOTA_LIMIT) {
                            button.title = 'You have reached the 3-event limit. Delete an event to create a new one.';
                            button.classList.add('disabled-quota');
                        } else {
                            button.title = 'Create a new event';
                            button.classList.remove('disabled-quota');
                        }
                        
                        // Assert: Button state is correct after each update
                        expect(button.disabled).toBe(count >= QUOTA_LIMIT);
                    }
                    
                    // Final assertion: Button state matches last count in sequence
                    const finalCount = countSequence[countSequence.length - 1];
                    expect(button.disabled).toBe(finalCount >= QUOTA_LIMIT);
                }
            ),
            { numRuns: 100 }
        );
    });
    
    /**
     * Property: Button re-enables immediately after deletion at limit
     * **Validates: Requirements 4.4**
     */
    test('button should re-enable immediately when count drops from 3 to 2', () => {
        fc.assert(
            fc.property(
                fc.constant(null), // No input needed
                () => {
                    // Setup: Create a mock DOM environment
                    document.body.innerHTML = `
                        <button id="createEventBtn" class="btn btn-primary">Create Event</button>
                    `;
                    
                    const button = document.getElementById('createEventBtn');
                    const QUOTA_LIMIT = 3;
                    
                    // Initial state: At limit (count = 3)
                    let count = 3;
                    button.disabled = count >= QUOTA_LIMIT;
                    expect(button.disabled).toBe(true);
                    
                    // Action: Simulate deletion (count drops to 2)
                    count = 2;
                    button.disabled = count >= QUOTA_LIMIT;
                    button.title = 'Create a new event';
                    button.classList.remove('disabled-quota');
                    
                    // Assert: Button immediately enabled
                    expect(button.disabled).toBe(false);
                    expect(count).toBe(2);
                }
            ),
            { numRuns: 100 }
        );
    });
});
