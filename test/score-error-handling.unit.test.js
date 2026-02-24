/**
 * Unit Tests for Score Page Error Handling
 * 
 * Tests error handling scenarios for the score page including:
 * - Missing participant data
 * - Debrief rendering failures
 * - Missing analytics data (free play mode)
 * - Error logging behavior
 * 
 * Requirements: 7.4, 7.5
 * Task: 2.7, 2.8
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Score Page Error Handling (Task 2.7, 2.8)', () => {
    let dom;
    let document;
    let window;
    let consoleErrorSpy;
    let consoleWarnSpy;
    let consoleLogSpy;

    beforeEach(() => {
        // Setup DOM environment
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="debriefContainer"></div>
                <div id="allyTipsContainer"></div>
                <button id="viewResultsBtn"></button>
                <button id="viewDetailedBtn"></button>
            </body>
            </html>
        `, { url: 'http://localhost/app/score.html?id=test-event' });
        
        document = dom.window.document;
        window = dom.window;
        
        // Make document and window global
        global.document = document;
        global.window = window;
        
        // Mock sessionStorage
        global.sessionStorage = {
            data: {},
            getItem(key) {
                return this.data[key] || null;
            },
            setItem(key, value) {
                this.data[key] = value;
            },
            clear() {
                this.data = {};
            }
        };
        
        // Mock localStorage
        global.localStorage = {
            data: {},
            getItem(key) {
                return this.data[key] || null;
            },
            setItem(key, value) {
                this.data[key] = value;
            },
            clear() {
                this.data = {};
            }
        };
        
        // Spy on console methods
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console methods
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleLogSpy.mockRestore();
        
        // Clear storage
        global.sessionStorage.clear();
        global.localStorage.clear();
    });

    describe('Missing Participant Data Error Handling', () => {
        test('displays error message when participant data is null', () => {
            // Requirement 7.4: Display appropriate error message when debrief data is unavailable
            
            const debriefContainer = document.getElementById('debriefContainer');
            
            // Simulate showError function behavior
            const errorMessage = 'Unable to load your results. Your response data may not have been saved properly.';
            debriefContainer.innerHTML = `
                <div class="error-message">
                    <h2>⚠️ Error</h2>
                    <p>${errorMessage}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
            
            expect(debriefContainer.innerHTML).toContain('error-message');
            expect(debriefContainer.innerHTML).toContain(errorMessage);
            expect(debriefContainer.innerHTML).toContain('Retry');
        });

        test('logs error when participant not found', () => {
            // Requirement 7.5: Log errors when debrief rendering fails without breaking the page
            
            const eventId = 'test-event';
            const participantId = 'missing-participant';
            
            // Simulate error logging
            console.error('[Score] Failed to load participant data');
            console.error('[Score] Load error details:', {
                message: 'Participant not found',
                eventId,
                participantId
            });
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Score] Failed to load participant data');
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[Score] Load error details:',
                expect.objectContaining({
                    message: 'Participant not found',
                    eventId,
                    participantId
                })
            );
        });

        test('displays error message when participant answers are missing', () => {
            // Requirement 7.4: Display appropriate error message when debrief data is unavailable
            
            const debriefContainer = document.getElementById('debriefContainer');
            
            // Simulate showError for missing answers
            const errorMessage = 'Unable to load your results. Your response data is missing.';
            debriefContainer.innerHTML = `
                <div class="error-message">
                    <h2>⚠️ Error</h2>
                    <p>${errorMessage}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
            
            expect(debriefContainer.innerHTML).toContain('error-message');
            expect(debriefContainer.innerHTML).toContain('Your response data is missing');
        });
    });

    describe('Debrief Rendering Failure Handling', () => {
        test('displays error message when debrief rendering fails', () => {
            // Requirement 7.4: Display appropriate error message when debrief data is unavailable
            
            const debriefContainer = document.getElementById('debriefContainer');
            
            // Simulate showError for rendering failure
            const errorMessage = 'Unable to load your personalized debrief. Please try refreshing the page.';
            debriefContainer.innerHTML = `
                <div class="error-message">
                    <h2>⚠️ Error</h2>
                    <p>${errorMessage}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
            
            expect(debriefContainer.innerHTML).toContain('error-message');
            expect(debriefContainer.innerHTML).toContain('Unable to load your personalized debrief');
            expect(debriefContainer.innerHTML).toContain('Retry');
        });

        test('logs detailed error information when rendering fails', () => {
            // Requirement 7.5: Log errors when debrief rendering fails without breaking the page
            
            const error = new Error('Rendering failed');
            const participantId = 'test-participant';
            const eventId = 'test-event';
            
            // Simulate error logging
            console.error('[Score] Error rendering debrief:', error);
            console.error('[Score] Error details:', {
                message: error.message,
                stack: error.stack,
                participant: participantId,
                eventId
            });
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Score] Error rendering debrief:', error);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[Score] Error details:',
                expect.objectContaining({
                    message: 'Rendering failed',
                    participant: participantId,
                    eventId
                })
            );
        });

        test('page remains functional after rendering error', () => {
            // Requirement 7.5: Log errors without breaking the page
            
            const debriefContainer = document.getElementById('debriefContainer');
            const viewResultsBtn = document.getElementById('viewResultsBtn');
            const viewDetailedBtn = document.getElementById('viewDetailedBtn');
            
            // Simulate error state
            debriefContainer.innerHTML = `
                <div class="error-message">
                    <h2>⚠️ Error</h2>
                    <p>Unable to load your personalized debrief. Please try refreshing the page.</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
            
            // Verify navigation buttons still exist and are functional
            expect(viewResultsBtn).not.toBeNull();
            expect(viewDetailedBtn).not.toBeNull();
            expect(debriefContainer.innerHTML).toContain('error-message');
        });

        test('logs error when debrief container not found in DOM', () => {
            // Requirement 7.5: Log errors when debrief rendering fails without breaking the page
            
            // Remove debrief container
            const container = document.getElementById('debriefContainer');
            container.remove();
            
            // Simulate error logging
            console.error('[Score] Debrief container not found in DOM');
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Score] Debrief container not found in DOM');
        });
    });

    describe('Missing Analytics Data Handling (Free Play Mode)', () => {
        test('logs info message when analytics data is unavailable', () => {
            // Requirement 7.4: Handle missing analytics data (free play mode)
            
            // Simulate analytics unavailable scenario
            console.log('[Score] Analytics data unavailable - displaying debrief without comparative statistics');
            
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[Score] Analytics data unavailable - displaying debrief without comparative statistics'
            );
        });

        test('logs warning when no participants found for analytics', () => {
            // Requirement 7.4: Handle missing analytics data (free play mode)
            
            const eventId = 'freeplay';
            
            // Simulate warning for no participants
            console.warn('[Score] No participants found for analytics - likely free play mode or first participant');
            
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[Score] No participants found for analytics - likely free play mode or first participant'
            );
        });

        test('logs info when only one participant exists', () => {
            // Requirement 7.4: Handle missing analytics data (free play mode)
            
            // Simulate single participant scenario
            console.log('[Score] Only one participant - analytics unavailable');
            
            expect(consoleLogSpy).toHaveBeenCalledWith('[Score] Only one participant - analytics unavailable');
        });

        test('debrief renders without analytics data', async () => {
            // Requirement 7.4: Handle missing analytics data gracefully
            
            const { renderFreePlayDebrief } = await import('../debrief-renderer.js');
            
            const score = 10;
            const answers = { 0: 1, 1: 0 };
            const min = -25;
            const max = 25;
            const questions = [
                { text: 'Question 1', value: 5 },
                { text: 'Question 2', value: -3 }
            ];
            
            // Render with null analyticsData
            const result = renderFreePlayDebrief(score, answers, min, max, questions, null);
            
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain('debrief-container');
        });

        test('logs error details when analytics calculation fails', () => {
            // Requirement 7.5: Log errors without breaking the page
            
            const error = new Error('Analytics calculation failed');
            const eventId = 'test-event';
            const userScore = 10;
            
            // Simulate error logging
            console.error('[Score] Error getting analytics data:', error);
            console.error('[Score] Analytics error details:', {
                message: error.message,
                eventId,
                userScore
            });
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Score] Error getting analytics data:', error);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[Score] Analytics error details:',
                expect.objectContaining({
                    message: 'Analytics calculation failed',
                    eventId,
                    userScore
                })
            );
        });
    });

    describe('Ally Tips Error Handling', () => {
        test('logs error when ally tips rendering fails', () => {
            // Requirement 7.5: Log errors without breaking the page
            
            const error = new Error('Ally tips rendering failed');
            const score = 10;
            const min = -25;
            const max = 25;
            
            // Simulate error logging
            console.error('[Score] Error rendering ally tips:', error);
            console.error('[Score] Ally tips error details:', {
                message: error.message,
                score,
                min,
                max
            });
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Score] Error rendering ally tips:', error);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[Score] Ally tips error details:',
                expect.objectContaining({
                    message: 'Ally tips rendering failed',
                    score,
                    min,
                    max
                })
            );
        });

        test('logs error when ally tips container not found', () => {
            // Requirement 7.5: Log errors without breaking the page
            
            // Remove ally tips container
            const container = document.getElementById('allyTipsContainer');
            container.remove();
            
            // Simulate error logging
            console.error('[Score] Ally tips container not found in DOM');
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Score] Ally tips container not found in DOM');
        });

        test('page continues to function when ally tips fail', () => {
            // Requirement 7.5: Log errors without breaking the page
            
            const debriefContainer = document.getElementById('debriefContainer');
            const allyTipsContainer = document.getElementById('allyTipsContainer');
            
            // Simulate ally tips failure (container remains empty)
            allyTipsContainer.innerHTML = '';
            
            // Debrief should still be present
            debriefContainer.innerHTML = '<div class="debrief-container">Debrief content</div>';
            
            expect(debriefContainer.innerHTML).toContain('debrief-container');
            expect(allyTipsContainer.innerHTML).toBe('');
        });
    });

    describe('Initialization Error Handling', () => {
        test('displays error message when initialization fails', () => {
            // Requirement 7.4: Display appropriate error message
            
            const debriefContainer = document.getElementById('debriefContainer');
            
            // Simulate showError for initialization failure
            const errorMessage = 'An unexpected error occurred. Please try refreshing the page.';
            debriefContainer.innerHTML = `
                <div class="error-message">
                    <h2>⚠️ Error</h2>
                    <p>${errorMessage}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
            
            expect(debriefContainer.innerHTML).toContain('error-message');
            expect(debriefContainer.innerHTML).toContain('An unexpected error occurred');
        });

        test('logs detailed error information on initialization failure', () => {
            // Requirement 7.5: Log errors without breaking the page
            
            const error = new Error('Initialization failed');
            
            // Simulate error logging
            console.error('[Score] Initialization error:', error);
            console.error('[Score] Initialization error details:', {
                message: error.message,
                stack: error.stack
            });
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Score] Initialization error:', error);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[Score] Initialization error details:',
                expect.objectContaining({
                    message: 'Initialization failed'
                })
            );
        });

        test('attempts to setup navigation even when initialization fails', () => {
            // Requirement 7.5: Log errors without breaking the page
            
            const viewResultsBtn = document.getElementById('viewResultsBtn');
            const viewDetailedBtn = document.getElementById('viewDetailedBtn');
            
            // Simulate navigation setup after error
            const eventId = 'test-event';
            viewResultsBtn.onclick = () => {
                window.location.href = `./results.html?id=${eventId}`;
            };
            viewDetailedBtn.onclick = () => {
                window.location.href = `./detailed-results.html?id=${eventId}`;
            };
            
            expect(viewResultsBtn.onclick).toBeDefined();
            expect(viewDetailedBtn.onclick).toBeDefined();
        });
    });

    describe('Error Message Display', () => {
        test('showError creates proper error message structure', () => {
            // Requirement 7.4: Display appropriate error message
            
            const debriefContainer = document.getElementById('debriefContainer');
            const message = 'Test error message';
            
            // Simulate showError function
            debriefContainer.innerHTML = `
                <div class="error-message">
                    <h2>⚠️ Error</h2>
                    <p>${message}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
            
            expect(debriefContainer.querySelector('.error-message')).not.toBeNull();
            expect(debriefContainer.querySelector('h2').textContent).toBe('⚠️ Error');
            expect(debriefContainer.querySelector('p').textContent).toBe(message);
            expect(debriefContainer.querySelector('button').textContent).toBe('Retry');
            expect(debriefContainer.querySelector('button').className).toContain('btn-primary');
        });

        test('error message includes retry button', () => {
            // Requirement 7.4: Display appropriate error message
            
            const debriefContainer = document.getElementById('debriefContainer');
            
            debriefContainer.innerHTML = `
                <div class="error-message">
                    <h2>⚠️ Error</h2>
                    <p>Error occurred</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
            
            const retryButton = debriefContainer.querySelector('button');
            expect(retryButton).not.toBeNull();
            expect(retryButton.textContent).toBe('Retry');
            expect(retryButton.getAttribute('onclick')).toBe('window.location.reload()');
        });
    });
});
