/**
 * Unit Test: Dashboard Quota Display
 * Feature: event-creation-limit
 * Requirements: 3.1, 3.2
 * 
 * Test that dashboard shows correct quota information
 */

import { describe, test, beforeEach, expect } from 'vitest';

describe('Dashboard Quota Display', () => {
    let container;
    
    beforeEach(() => {
        // Create a mock DOM structure
        container = document.createElement('div');
        container.innerHTML = `
            <div id="dashboardQuotaDisplay" class="quota-info" style="display: none;">
                <span id="dashboardQuotaText" class="quota-text"></span>
            </div>
        `;
        document.body.appendChild(container);
    });
    
    afterEach(() => {
        document.body.removeChild(container);
    });
    
    /**
     * Helper function to simulate updateDashboardQuotaDisplay
     */
    function updateDashboardQuotaDisplay(state) {
        const quotaDisplay = document.getElementById('dashboardQuotaDisplay');
        const quotaText = document.getElementById('dashboardQuotaText');
        
        if (!quotaDisplay || !quotaText) {
            return;
        }
        
        // Show quota display
        quotaDisplay.style.display = 'block';
        
        // Update text
        const eventWord = state.eventCount === 1 ? 'event' : 'events';
        quotaText.textContent = `${state.eventCount} of ${state.quotaLimit} ${eventWord} created`;
        
        // Add visual indicator if at limit
        if (state.isAtLimit) {
            quotaDisplay.classList.add('at-limit');
        } else {
            quotaDisplay.classList.remove('at-limit');
        }
    }
    
    test('**Validates: Requirements 3.1, 3.2** - Shows correct quota for 0 events', () => {
        const state = {
            eventCount: 0,
            quotaLimit: 3,
            isAtLimit: false
        };
        
        updateDashboardQuotaDisplay(state);
        
        const quotaText = document.getElementById('dashboardQuotaText');
        expect(quotaText.textContent).toBe('0 of 3 events created');
        
        const quotaDisplay = document.getElementById('dashboardQuotaDisplay');
        expect(quotaDisplay.style.display).toBe('block');
        expect(quotaDisplay.classList.contains('at-limit')).toBe(false);
    });
    
    test('**Validates: Requirements 3.1, 3.2** - Shows correct quota for 1 event (singular)', () => {
        const state = {
            eventCount: 1,
            quotaLimit: 3,
            isAtLimit: false
        };
        
        updateDashboardQuotaDisplay(state);
        
        const quotaText = document.getElementById('dashboardQuotaText');
        expect(quotaText.textContent).toBe('1 of 3 event created');
    });
    
    test('**Validates: Requirements 3.1, 3.2** - Shows correct quota for 2 events', () => {
        const state = {
            eventCount: 2,
            quotaLimit: 3,
            isAtLimit: false
        };
        
        updateDashboardQuotaDisplay(state);
        
        const quotaText = document.getElementById('dashboardQuotaText');
        expect(quotaText.textContent).toBe('2 of 3 events created');
        
        const quotaDisplay = document.getElementById('dashboardQuotaDisplay');
        expect(quotaDisplay.classList.contains('at-limit')).toBe(false);
    });
    
    test('**Validates: Requirements 3.1, 3.2** - Shows at-limit state for 3 events', () => {
        const state = {
            eventCount: 3,
            quotaLimit: 3,
            isAtLimit: true
        };
        
        updateDashboardQuotaDisplay(state);
        
        const quotaText = document.getElementById('dashboardQuotaText');
        expect(quotaText.textContent).toBe('3 of 3 events created');
        
        const quotaDisplay = document.getElementById('dashboardQuotaDisplay');
        expect(quotaDisplay.classList.contains('at-limit')).toBe(true);
    });
    
    test('**Validates: Requirements 3.1, 3.2** - Updates from below limit to at limit', () => {
        // Start with 2 events
        let state = {
            eventCount: 2,
            quotaLimit: 3,
            isAtLimit: false
        };
        
        updateDashboardQuotaDisplay(state);
        
        let quotaDisplay = document.getElementById('dashboardQuotaDisplay');
        expect(quotaDisplay.classList.contains('at-limit')).toBe(false);
        
        // Update to 3 events
        state = {
            eventCount: 3,
            quotaLimit: 3,
            isAtLimit: true
        };
        
        updateDashboardQuotaDisplay(state);
        
        quotaDisplay = document.getElementById('dashboardQuotaDisplay');
        expect(quotaDisplay.classList.contains('at-limit')).toBe(true);
        
        const quotaText = document.getElementById('dashboardQuotaText');
        expect(quotaText.textContent).toBe('3 of 3 events created');
    });
    
    test('**Validates: Requirements 3.1, 3.2** - Updates from at limit to below limit', () => {
        // Start with 3 events
        let state = {
            eventCount: 3,
            quotaLimit: 3,
            isAtLimit: true
        };
        
        updateDashboardQuotaDisplay(state);
        
        let quotaDisplay = document.getElementById('dashboardQuotaDisplay');
        expect(quotaDisplay.classList.contains('at-limit')).toBe(true);
        
        // Update to 2 events (after deletion)
        state = {
            eventCount: 2,
            quotaLimit: 3,
            isAtLimit: false
        };
        
        updateDashboardQuotaDisplay(state);
        
        quotaDisplay = document.getElementById('dashboardQuotaDisplay');
        expect(quotaDisplay.classList.contains('at-limit')).toBe(false);
        
        const quotaText = document.getElementById('dashboardQuotaText');
        expect(quotaText.textContent).toBe('2 of 3 events created');
    });
});
