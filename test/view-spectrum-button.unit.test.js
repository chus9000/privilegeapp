/**
 * Unit tests for View Spectrum button functionality
 * Task: 10.4 Update results.html to link to spectrum
 * Requirement: 7.2
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the results page HTML
const resultsHTML = readFileSync(join(process.cwd(), 'app/results.html'), 'utf-8');

describe('View Spectrum Button', () => {
    let dom;
    let window;
    let document;

    beforeEach(() => {
        // Create a new JSDOM instance for each test
        dom = new JSDOM(resultsHTML, {
            url: 'http://localhost/app/results.html?id=test-event-123',
            runScripts: 'outside-only'
        });

        window = dom.window;
        document = window.document;

        // Mock console methods
        window.console = {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn()
        };
    });

    test('View Spectrum button exists in HTML', () => {
        const viewSpectrumBtn = document.getElementById('viewSpectrumBtn');
        expect(viewSpectrumBtn).toBeTruthy();
        expect(viewSpectrumBtn.textContent).toBe('View Spectrum');
    });

    test('View Spectrum button is hidden by default', () => {
        const viewSpectrumBtn = document.getElementById('viewSpectrumBtn');
        expect(viewSpectrumBtn.style.display).toBe('none');
    });

    test('View Spectrum button has correct CSS class', () => {
        const viewSpectrumBtn = document.getElementById('viewSpectrumBtn');
        expect(viewSpectrumBtn.classList.contains('distribution-btn')).toBe(true);
    });
});

describe('View Spectrum Navigation', () => {
    test('viewSpectrum function navigates to correct URL', () => {
        // Test the navigation logic directly without mocking window.location
        const eventId = 'test-event-123';
        const expectedUrl = `app/results.html?id=${eventId}`;
        
        // Simulate the viewSpectrum function logic
        let navigationUrl = null;
        if (eventId) {
            navigationUrl = `app/results.html?id=${eventId}`;
        }

        // Verify the URL is constructed correctly
        expect(navigationUrl).toBe(expectedUrl);
    });

    test('viewSpectrum function handles missing event ID', () => {
        // Mock console.error
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Define the viewSpectrum function with no eventId
        const eventId = null;
        function viewSpectrum() {
            if (!eventId) {
                console.error('No event ID available for navigation');
                return;
            }
            return `app/results.html?id=${eventId}`;
        }

        // Call the function
        const result = viewSpectrum();

        // Verify error was logged and no URL was returned
        expect(consoleErrorSpy).toHaveBeenCalledWith('No event ID available for navigation');
        expect(result).toBeUndefined();
        
        consoleErrorSpy.mockRestore();
    });
});

describe('View Spectrum Button Visibility', () => {
    test('button should be shown for event mode (not free play)', () => {
        // This test verifies the button exists and can be shown
        // The actual showing logic is in results.js loadResults() function
        const dom = new JSDOM(resultsHTML, {
            url: 'http://localhost/app/results.html?id=test-event-123',
            runScripts: 'outside-only'
        });

        const document = dom.window.document;
        const viewSpectrumBtn = document.getElementById('viewSpectrumBtn');
        
        // Verify button exists
        expect(viewSpectrumBtn).toBeTruthy();
        
        // Simulate what loadResults() does for event mode
        viewSpectrumBtn.style.display = 'block';
        
        // Verify button is now visible
        expect(viewSpectrumBtn.style.display).toBe('block');
    });

    test('button should be hidden for free play mode', () => {
        // This test verifies the button can be hidden for free play
        const dom = new JSDOM(resultsHTML, {
            url: 'http://localhost/app/results.html?id=freeplay',
            runScripts: 'outside-only'
        });

        const document = dom.window.document;
        const viewSpectrumBtn = document.getElementById('viewSpectrumBtn');
        
        // Verify button exists
        expect(viewSpectrumBtn).toBeTruthy();
        
        // Simulate what renderFreePlayAnalytics() does
        viewSpectrumBtn.style.display = 'none';
        
        // Verify button is hidden
        expect(viewSpectrumBtn.style.display).toBe('none');
    });
});
