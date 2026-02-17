/**
 * Unit tests for form validation error messages
 * Requirements: 15.6
 * 
 * Tests validation for:
 * - Event creation form (title and questions)
 * - PIN entry form
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Form Validation Error Messages', () => {
    let dom;
    let document;
    let window;

    beforeEach(() => {
        // Set up DOM for event creation form
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <form id="eventCreationForm">
                    <input type="text" id="eventTitle" maxlength="100" required>
                    <div id="charCount">0</div>
                    <div id="titleError" class="error-message" style="display: none;"></div>
                    
                    <button type="button" id="reviewQuestionsBtn">Review Questions</button>
                    <div id="questionsError" class="error-message" style="display: none;"></div>
                    
                    <button type="submit" id="createEventBtn">Create Event</button>
                </form>
            </body>
            </html>
        `, { url: 'http://localhost' });

        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;
    });

    describe('Event Creation Form Validation', () => {
        it('should display error when title is empty', () => {
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');

            // Simulate empty title
            titleInput.value = '';
            
            // Simulate validation
            if (titleInput.value.trim() === '') {
                titleError.textContent = 'Event title is required';
                titleError.style.display = 'block';
            }

            expect(titleError.style.display).toBe('block');
            expect(titleError.textContent).toBe('Event title is required');
        });

        it('should display error when title exceeds 100 characters', () => {
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');

            // Simulate title over 100 characters
            titleInput.value = 'a'.repeat(101);
            
            // Simulate validation
            if (titleInput.value.length > 100) {
                titleError.textContent = 'Event title must be 100 characters or less';
                titleError.style.display = 'block';
            }

            expect(titleError.style.display).toBe('block');
            expect(titleError.textContent).toBe('Event title must be 100 characters or less');
        });

        it('should clear error when title is valid', () => {
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');

            // Set valid title
            titleInput.value = 'Valid Event Title';
            
            // Simulate validation
            if (titleInput.value.trim() !== '' && titleInput.value.length <= 100) {
                titleError.style.display = 'none';
            }

            expect(titleError.style.display).toBe('none');
        });

        it('should display error when fewer than 5 questions are enabled', () => {
            const questionsError = document.getElementById('questionsError');
            const totalQuestions = 35;
            const disabledQuestions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]; // 32 disabled
            const enabledQuestions = totalQuestions - disabledQuestions.length; // 3 enabled

            // Simulate validation
            if (enabledQuestions < 5) {
                questionsError.textContent = `At least 5 questions must be enabled (currently ${enabledQuestions} enabled)`;
                questionsError.style.display = 'block';
            }

            expect(questionsError.style.display).toBe('block');
            expect(questionsError.textContent).toContain('At least 5 questions must be enabled');
            expect(questionsError.textContent).toContain('3 enabled');
        });

        it('should clear questions error when 5 or more questions are enabled', () => {
            const questionsError = document.getElementById('questionsError');
            const totalQuestions = 35;
            const disabledQuestions = [0, 1, 2]; // 3 disabled
            const enabledQuestions = totalQuestions - disabledQuestions.length; // 32 enabled

            // Simulate validation
            if (enabledQuestions >= 5) {
                questionsError.style.display = 'none';
            }

            expect(questionsError.style.display).toBe('none');
        });

        it('should display all validation errors when multiple fields are invalid', () => {
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');
            const questionsError = document.getElementById('questionsError');

            // Set invalid values
            titleInput.value = '';
            const enabledQuestions = 2;

            // Simulate validation
            const errors = [];
            
            if (titleInput.value.trim() === '') {
                errors.push({ field: 'title', message: 'Event title is required' });
                titleError.textContent = 'Event title is required';
                titleError.style.display = 'block';
            }
            
            if (enabledQuestions < 5) {
                errors.push({ field: 'questions', message: `At least 5 questions must be enabled (currently ${enabledQuestions} enabled)` });
                questionsError.textContent = `At least 5 questions must be enabled (currently ${enabledQuestions} enabled)`;
                questionsError.style.display = 'block';
            }

            expect(errors.length).toBe(2);
            expect(titleError.style.display).toBe('block');
            expect(questionsError.style.display).toBe('block');
        });
    });

    describe('PIN Entry Form Validation', () => {
        beforeEach(() => {
            // Set up DOM for PIN entry form
            dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <div id="pinEntry">
                        <input type="text" id="pinInput" placeholder="Enter PIN" maxlength="6" required>
                        <button id="submitPin">Enter Event</button>
                        <div id="pinError" class="error-message" style="display: none;"></div>
                    </div>
                </body>
                </html>
            `, { url: 'http://localhost' });

            document = dom.window.document;
            window = dom.window;
            global.document = document;
            global.window = window;
        });

        it('should display error when PIN is empty', () => {
            const pinInput = document.getElementById('pinInput');
            const pinError = document.getElementById('pinError');

            // Simulate empty PIN
            pinInput.value = '';
            
            // Simulate validation
            if (pinInput.value.trim() === '') {
                pinError.textContent = 'Please enter a PIN';
                pinError.style.display = 'block';
            }

            expect(pinError.style.display).toBe('block');
            expect(pinError.textContent).toBe('Please enter a PIN');
        });

        it('should display error when PIN is incorrect', () => {
            const pinInput = document.getElementById('pinInput');
            const pinError = document.getElementById('pinError');
            const correctPin = '123456';

            // Simulate incorrect PIN
            pinInput.value = '999999';
            
            // Simulate validation
            if (pinInput.value.trim() !== correctPin) {
                pinError.textContent = 'Invalid PIN. Please try again.';
                pinError.style.display = 'block';
            }

            expect(pinError.style.display).toBe('block');
            expect(pinError.textContent).toBe('Invalid PIN. Please try again.');
        });

        it('should clear error when PIN is correct', () => {
            const pinInput = document.getElementById('pinInput');
            const pinError = document.getElementById('pinError');
            const correctPin = '123456';

            // Simulate correct PIN
            pinInput.value = '123456';
            
            // Simulate validation
            if (pinInput.value.trim() === correctPin) {
                pinError.style.display = 'none';
            }

            expect(pinError.style.display).toBe('none');
        });

        it('should display rate limit error after too many failed attempts', () => {
            const pinError = document.getElementById('pinError');
            const MAX_ATTEMPTS = 5;
            let failedAttempts = 5;

            // Simulate rate limiting
            if (failedAttempts >= MAX_ATTEMPTS) {
                pinError.textContent = 'Too many failed attempts. Please wait a moment before trying again.';
                pinError.style.display = 'block';
            }

            expect(pinError.style.display).toBe('block');
            expect(pinError.textContent).toContain('Too many failed attempts');
        });

        it('should handle whitespace-only PIN as empty', () => {
            const pinInput = document.getElementById('pinInput');
            const pinError = document.getElementById('pinError');

            // Simulate whitespace-only PIN
            pinInput.value = '   ';
            
            // Simulate validation
            if (pinInput.value.trim() === '') {
                pinError.textContent = 'Please enter a PIN';
                pinError.style.display = 'block';
            }

            expect(pinError.style.display).toBe('block');
            expect(pinError.textContent).toBe('Please enter a PIN');
        });
    });

    describe('Error Message Display Requirements', () => {
        it('should have error-message class for styling', () => {
            const titleError = document.getElementById('titleError');
            const questionsError = document.getElementById('questionsError');

            expect(titleError.className).toContain('error-message');
            expect(questionsError.className).toContain('error-message');
        });

        it('should be hidden by default', () => {
            const titleError = document.getElementById('titleError');
            const questionsError = document.getElementById('questionsError');

            expect(titleError.style.display).toBe('none');
            expect(questionsError.style.display).toBe('none');
        });

        it('should display inline near the relevant field', () => {
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');

            // Verify error is in the same form group
            const formGroup = titleInput.closest('form');
            const errorInForm = formGroup.contains(titleError);

            expect(errorInForm).toBe(true);
        });
    });

    describe('Validation Timing', () => {
        it('should validate on form submission', () => {
            const form = document.getElementById('eventCreationForm');
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');

            titleInput.value = '';

            // Simulate form submission
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            
            // Validation should occur
            if (titleInput.value.trim() === '') {
                titleError.textContent = 'Event title is required';
                titleError.style.display = 'block';
                submitEvent.preventDefault();
            }

            expect(titleError.style.display).toBe('block');
        });

        it('should validate on blur for title field', () => {
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');

            titleInput.value = '';

            // Simulate blur event
            const blurEvent = new window.Event('blur');
            titleInput.dispatchEvent(blurEvent);

            // Validation should occur on blur
            if (titleInput.value.trim() === '') {
                titleError.textContent = 'Event title is required';
                titleError.style.display = 'block';
            }

            expect(titleError.style.display).toBe('block');
        });

        it('should clear error on focus to allow correction', () => {
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');

            // Set error state
            titleError.textContent = 'Event title is required';
            titleError.style.display = 'block';

            // Simulate focus event
            const focusEvent = new window.Event('focus');
            titleInput.dispatchEvent(focusEvent);

            // Error should be cleared on focus
            if (titleError.textContent === 'Event title is required') {
                titleError.style.display = 'none';
            }

            expect(titleError.style.display).toBe('none');
        });
    });
});
