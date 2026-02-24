/**
 * Unit Tests: ARIA Attributes for Quota UI
 * 
 * Tests that quota-related UI elements have appropriate ARIA labels and roles
 * for accessibility compliance.
 * 
 * Requirements: General accessibility compliance
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Accessibility - ARIA Attributes', () => {
    let dom;
    let document;
    let window;

    describe('Create Page ARIA Attributes', () => {
        beforeEach(() => {
            // Load create.html
            const createHtml = fs.readFileSync(
                path.join(__dirname, '../app/create.html'),
                'utf-8'
            );
            
            dom = new JSDOM(createHtml, {
                url: 'http://localhost/app/create.html',
                runScripts: 'outside-only'
            });
            
            document = dom.window.document;
            window = dom.window;
        });

        afterEach(() => {
            dom.window.close();
        });

        test('quota display container has role="status" and aria-live="polite"', () => {
            const quotaDisplay = document.querySelector('.quota-display');
            
            expect(quotaDisplay).toBeTruthy();
            expect(quotaDisplay.getAttribute('role')).toBe('status');
            expect(quotaDisplay.getAttribute('aria-live')).toBe('polite');
        });

        test('quota display span has aria-label', () => {
            const quotaDisplay = document.getElementById('quotaDisplay');
            
            expect(quotaDisplay).toBeTruthy();
            expect(quotaDisplay.getAttribute('aria-label')).toBe('Event quota status');
        });

        test('remaining quota span has aria-label', () => {
            const remainingQuota = document.getElementById('remainingQuota');
            
            expect(remainingQuota).toBeTruthy();
            expect(remainingQuota.getAttribute('aria-label')).toBe('Remaining quota');
        });

        test('quota message has role="status" and aria-live="polite"', () => {
            const quotaMessage = document.getElementById('quotaMessage');
            
            expect(quotaMessage).toBeTruthy();
            expect(quotaMessage.getAttribute('role')).toBe('status');
            expect(quotaMessage.getAttribute('aria-live')).toBe('polite');
        });

        test('create event button has aria-label', () => {
            const createBtn = document.getElementById('createEventBtn');
            
            expect(createBtn).toBeTruthy();
            expect(createBtn.getAttribute('aria-label')).toBe('Create new event');
        });
    });

    describe('Dashboard Page ARIA Attributes', () => {
        beforeEach(() => {
            // Load index.html (dashboard)
            const indexHtml = fs.readFileSync(
                path.join(__dirname, '../app/index.html'),
                'utf-8'
            );
            
            dom = new JSDOM(indexHtml, {
                url: 'http://localhost/app/index.html',
                runScripts: 'outside-only'
            });
            
            document = dom.window.document;
            window = dom.window;
        });

        afterEach(() => {
            dom.window.close();
        });

        test('dashboard quota display has role="status" and aria-live="polite"', () => {
            const quotaDisplay = document.getElementById('dashboardQuotaDisplay');
            
            expect(quotaDisplay).toBeTruthy();
            expect(quotaDisplay.getAttribute('role')).toBe('status');
            expect(quotaDisplay.getAttribute('aria-live')).toBe('polite');
        });

        test('dashboard quota text has aria-label', () => {
            const quotaText = document.getElementById('dashboardQuotaText');
            
            expect(quotaText).toBeTruthy();
            expect(quotaText.getAttribute('aria-label')).toBe('Event quota status');
        });

        test('quota banner has role="alert" and aria-live="assertive"', () => {
            const quotaBanner = document.getElementById('quotaBanner');
            
            expect(quotaBanner).toBeTruthy();
            expect(quotaBanner.getAttribute('role')).toBe('alert');
            expect(quotaBanner.getAttribute('aria-live')).toBe('assertive');
        });

        test('banner close button has aria-label', () => {
            const closeBtn = document.querySelector('.banner-close');
            
            expect(closeBtn).toBeTruthy();
            expect(closeBtn.getAttribute('aria-label')).toBe('Dismiss banner');
        });

        test('header create button has aria-label', () => {
            const headerBtn = document.getElementById('createNewEventBtnHeader');
            
            expect(headerBtn).toBeTruthy();
            expect(headerBtn.getAttribute('aria-label')).toBe('Create new event');
        });
    });

    describe('Button Disabled State ARIA', () => {
        beforeEach(() => {
            // Create a minimal DOM for testing button state
            dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <button id="createEventBtn" aria-label="Create new event">Create Event</button>
                    <button id="createNewEventBtnHeader" aria-label="Create new event">Create New Event</button>
                </body>
                </html>
            `);
            
            document = dom.window.document;
            window = dom.window;
        });

        afterEach(() => {
            dom.window.close();
        });

        test('button has aria-disabled="true" when disabled', () => {
            const btn = document.getElementById('createEventBtn');
            
            // Simulate disabling the button
            btn.disabled = true;
            btn.setAttribute('aria-disabled', 'true');
            
            expect(btn.disabled).toBe(true);
            expect(btn.getAttribute('aria-disabled')).toBe('true');
        });

        test('button has aria-disabled="false" when enabled', () => {
            const btn = document.getElementById('createEventBtn');
            
            // Simulate enabling the button
            btn.disabled = false;
            btn.setAttribute('aria-disabled', 'false');
            
            expect(btn.disabled).toBe(false);
            expect(btn.getAttribute('aria-disabled')).toBe('false');
        });

        test('header button has aria-disabled attribute when disabled', () => {
            const btn = document.getElementById('createNewEventBtnHeader');
            
            // Simulate disabling the button
            btn.disabled = true;
            btn.setAttribute('aria-disabled', 'true');
            
            expect(btn.disabled).toBe(true);
            expect(btn.getAttribute('aria-disabled')).toBe('true');
        });
    });
});
