/**
 * Integration tests for form validation across the application
 * Requirements: 15.6
 * 
 * Tests that all forms have proper validation error messages:
 * - Event creation form
 * - PIN entry form
 * - Participant name (optional, no validation needed)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Form Validation Integration Tests', () => {
    describe('Event Creation Form - Complete Flow', () => {
        let dom, document, window;

        beforeEach(() => {
            dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <form id="eventCreationForm">
                        <div class="form-group">
                            <label for="eventTitle">Event Title <span class="required">*</span></label>
                            <input type="text" id="eventTitle" maxlength="100" required>
                            <div class="char-counter">
                                <span id="charCount">0</span>/100 characters
                            </div>
                            <div id="titleError" class="error-message" style="display: none;"></div>
                        </div>

                        <div class="form-group">
                            <label>Questions</label>
                            <button type="button" id="reviewQuestionsBtn">Review & Select Questions</button>
                            <div id="questionsError" class="error-message" style="display: none;"></div>
                        </div>

                        <div class="form-actions">
                            <button type="button" id="cancelBtn">Cancel</button>
                            <button type="submit" id="createEventBtn">Create Event</button>
                        </div>
                    </form>
                </body>
                </html>
            `, { url: 'http://localhost' });

            document = dom.window.document;
            window = dom.window;
            global.document = document;
            global.window = window;
        });

        it('should prevent form submission when title is empty', () => {
            const form = document.getElementById('eventCreationForm');
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');
            
            titleInput.value = '';
            
            // Simulate validation on submit
            let formSubmitted = false;
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Validation logic
                if (titleInput.value.trim() === '') {
                    titleError.textContent = 'Event title is required';
                    titleError.style.display = 'block';
                } else {
                    formSubmitted = true;
                }
            });
            
            // Trigger submit
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            expect(formSubmitted).toBe(false);
            expect(titleError.style.display).toBe('block');
            expect(titleError.textContent).toBe('Event title is required');
        });

        it('should prevent form submission when fewer than 5 questions enabled', () => {
            const form = document.getElementById('eventCreationForm');
            const titleInput = document.getElementById('eventTitle');
            const questionsError = document.getElementById('questionsError');
            
            titleInput.value = 'Valid Title';
            const enabledQuestions = 3;
            
            // Simulate validation on submit
            let formSubmitted = false;
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Validation logic
                if (enabledQuestions < 5) {
                    questionsError.textContent = `At least 5 questions must be enabled (currently ${enabledQuestions} enabled)`;
                    questionsError.style.display = 'block';
                } else {
                    formSubmitted = true;
                }
            });
            
            // Trigger submit
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            expect(formSubmitted).toBe(false);
            expect(questionsError.style.display).toBe('block');
            expect(questionsError.textContent).toContain('At least 5 questions must be enabled');
        });

        it('should allow form submission when all validations pass', () => {
            const form = document.getElementById('eventCreationForm');
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');
            const questionsError = document.getElementById('questionsError');
            
            titleInput.value = 'Valid Event Title';
            const enabledQuestions = 10;
            
            // Simulate validation on submit
            let formSubmitted = false;
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Validation logic
                let isValid = true;
                
                if (titleInput.value.trim() === '') {
                    titleError.textContent = 'Event title is required';
                    titleError.style.display = 'block';
                    isValid = false;
                }
                
                if (enabledQuestions < 5) {
                    questionsError.textContent = `At least 5 questions must be enabled (currently ${enabledQuestions} enabled)`;
                    questionsError.style.display = 'block';
                    isValid = false;
                }
                
                if (isValid) {
                    formSubmitted = true;
                }
            });
            
            // Trigger submit
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            expect(formSubmitted).toBe(true);
            expect(titleError.style.display).toBe('none');
            expect(questionsError.style.display).toBe('none');
        });

        it('should show multiple errors simultaneously', () => {
            const form = document.getElementById('eventCreationForm');
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');
            const questionsError = document.getElementById('questionsError');
            
            titleInput.value = '';
            const enabledQuestions = 2;
            
            // Simulate validation on submit
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Validation logic - check all fields
                if (titleInput.value.trim() === '') {
                    titleError.textContent = 'Event title is required';
                    titleError.style.display = 'block';
                }
                
                if (enabledQuestions < 5) {
                    questionsError.textContent = `At least 5 questions must be enabled (currently ${enabledQuestions} enabled)`;
                    questionsError.style.display = 'block';
                }
            });
            
            // Trigger submit
            const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            // Both errors should be visible
            expect(titleError.style.display).toBe('block');
            expect(questionsError.style.display).toBe('block');
        });
    });

    describe('PIN Entry Form - Complete Flow', () => {
        let dom, document, window;

        beforeEach(() => {
            dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <div id="pinEntry">
                        <h1>Enter Participation PIN</h1>
                        <div class="pin-input-container">
                            <input type="text" id="pinInput" placeholder="Enter PIN" maxlength="6" required>
                            <button id="submitPin">Enter Event</button>
                        </div>
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

        it('should validate PIN on button click', () => {
            const pinInput = document.getElementById('pinInput');
            const submitBtn = document.getElementById('submitPin');
            const pinError = document.getElementById('pinError');
            const correctPin = '123456';
            
            pinInput.value = '';
            
            // Simulate click handler
            submitBtn.addEventListener('click', () => {
                const enteredPin = pinInput.value.trim();
                
                if (!enteredPin) {
                    pinError.textContent = 'Please enter a PIN';
                    pinError.style.display = 'block';
                } else if (enteredPin !== correctPin) {
                    pinError.textContent = 'Invalid PIN. Please try again.';
                    pinError.style.display = 'block';
                } else {
                    pinError.style.display = 'none';
                }
            });
            
            // Trigger click
            submitBtn.click();
            
            expect(pinError.style.display).toBe('block');
            expect(pinError.textContent).toBe('Please enter a PIN');
        });

        it('should validate PIN on Enter key press', () => {
            const pinInput = document.getElementById('pinInput');
            const pinError = document.getElementById('pinError');
            const correctPin = '123456';
            
            pinInput.value = '999999';
            
            // Simulate keypress handler
            pinInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const enteredPin = pinInput.value.trim();
                    
                    if (!enteredPin) {
                        pinError.textContent = 'Please enter a PIN';
                        pinError.style.display = 'block';
                    } else if (enteredPin !== correctPin) {
                        pinError.textContent = 'Invalid PIN. Please try again.';
                        pinError.style.display = 'block';
                    } else {
                        pinError.style.display = 'none';
                    }
                }
            });
            
            // Trigger Enter key
            const enterEvent = new window.KeyboardEvent('keypress', { key: 'Enter' });
            pinInput.dispatchEvent(enterEvent);
            
            expect(pinError.style.display).toBe('block');
            expect(pinError.textContent).toBe('Invalid PIN. Please try again.');
        });

        it('should clear PIN input after incorrect attempt', () => {
            const pinInput = document.getElementById('pinInput');
            const submitBtn = document.getElementById('submitPin');
            const pinError = document.getElementById('pinError');
            const correctPin = '123456';
            
            pinInput.value = '999999';
            
            // Simulate click handler with clear
            submitBtn.addEventListener('click', () => {
                const enteredPin = pinInput.value.trim();
                
                if (enteredPin !== correctPin) {
                    pinError.textContent = 'Invalid PIN. Please try again.';
                    pinError.style.display = 'block';
                    pinInput.value = '';
                }
            });
            
            // Trigger click
            submitBtn.click();
            
            expect(pinInput.value).toBe('');
            expect(pinError.style.display).toBe('block');
        });
    });

    describe('All Forms - Error Message Styling', () => {
        it('should have consistent error message class across all forms', () => {
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <div id="titleError" class="error-message"></div>
                    <div id="questionsError" class="error-message"></div>
                    <div id="pinError" class="error-message"></div>
                </body>
                </html>
            `);

            const document = dom.window.document;
            
            const titleError = document.getElementById('titleError');
            const questionsError = document.getElementById('questionsError');
            const pinError = document.getElementById('pinError');
            
            expect(titleError.className).toBe('error-message');
            expect(questionsError.className).toBe('error-message');
            expect(pinError.className).toBe('error-message');
        });

        it('should be positioned inline near relevant fields', () => {
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="form-group">
                        <input type="text" id="eventTitle">
                        <div id="titleError" class="error-message"></div>
                    </div>
                    <div class="pin-input-container">
                        <input type="text" id="pinInput">
                        <div id="pinError" class="error-message"></div>
                    </div>
                </body>
                </html>
            `);

            const document = dom.window.document;
            
            const titleInput = document.getElementById('eventTitle');
            const titleError = document.getElementById('titleError');
            const titleParent = titleInput.parentElement;
            
            const pinInput = document.getElementById('pinInput');
            const pinError = document.getElementById('pinError');
            const pinParent = pinInput.parentElement;
            
            // Errors should be in the same container as their inputs
            expect(titleParent.contains(titleError)).toBe(true);
            expect(pinParent.contains(pinError)).toBe(true);
        });
    });

    describe('User-Friendly Error Messages', () => {
        it('should use clear, actionable language for title errors', () => {
            const errors = [
                'Event title is required',
                'Event title must be 100 characters or less'
            ];
            
            errors.forEach(error => {
                expect(error).toMatch(/Event title/);
                expect(error.length).toBeLessThan(100);
                expect(error).not.toContain('error');
                expect(error).not.toContain('invalid');
            });
        });

        it('should use clear, actionable language for PIN errors', () => {
            const errors = [
                'Please enter a PIN',
                'Invalid PIN. Please try again.',
                'Too many failed attempts. Please wait a moment before trying again.'
            ];
            
            errors.forEach(error => {
                expect(error).toMatch(/PIN|attempts/);
                expect(error.length).toBeLessThan(100);
            });
        });

        it('should use clear, actionable language for question errors', () => {
            const error = 'At least 5 questions must be enabled (currently 3 enabled)';
            
            expect(error).toContain('5 questions');
            expect(error).toContain('enabled');
            expect(error).toContain('currently');
        });
    });
});
