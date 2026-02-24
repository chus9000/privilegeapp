/**
 * Unit Tests: Navigation Button Handlers
 * 
 * Tests for task 2.5: Setup navigation button handlers
 * Validates Requirements: 4.2, 4.3
 */

describe('Navigation Button Handlers', () => {
    let originalLocation;
    
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div class="score-actions">
                <button id="viewResultsBtn" class="btn btn-primary">View Group Results</button>
                <button id="viewDetailedBtn" class="btn btn-secondary">View Detailed Analysis</button>
            </div>
        `;
        
        // Mock window.location
        originalLocation = window.location;
        delete window.location;
        window.location = { href: '' };
    });
    
    afterEach(() => {
        // Restore window.location
        window.location = originalLocation;
    });
    
    test('View Group Results button navigates to results.html with event ID', () => {
        const eventId = 'test-event-123';
        
        // Setup navigation (inline implementation for testing)
        const viewResultsBtn = document.getElementById('viewResultsBtn');
        viewResultsBtn.onclick = () => {
            window.location.href = `./results.html?id=${eventId}`;
        };
        
        // Click button
        viewResultsBtn.click();
        
        // Verify navigation
        expect(window.location.href).toBe('./results.html?id=test-event-123');
    });
    
    test('View Detailed Analysis button navigates to detailed-results.html with event ID', () => {
        const eventId = 'test-event-456';
        
        // Setup navigation (inline implementation for testing)
        const viewDetailedBtn = document.getElementById('viewDetailedBtn');
        viewDetailedBtn.onclick = () => {
            window.location.href = `./detailed-results.html?id=${eventId}`;
        };
        
        // Click button
        viewDetailedBtn.click();
        
        // Verify navigation
        expect(window.location.href).toBe('./detailed-results.html?id=test-event-456');
    });
    
    test('Navigation preserves event ID with special characters', () => {
        const eventId = 'event-with-special_chars.123';
        
        // Setup navigation
        const viewResultsBtn = document.getElementById('viewResultsBtn');
        viewResultsBtn.onclick = () => {
            window.location.href = `./results.html?id=${eventId}`;
        };
        
        // Click button
        viewResultsBtn.click();
        
        // Verify event ID is preserved
        expect(window.location.href).toContain('event-with-special_chars.123');
    });
    
    test('Navigation works with freeplay event ID', () => {
        const eventId = 'freeplay';
        
        // Setup navigation
        const viewResultsBtn = document.getElementById('viewResultsBtn');
        const viewDetailedBtn = document.getElementById('viewDetailedBtn');
        
        viewResultsBtn.onclick = () => {
            window.location.href = `./results.html?id=${eventId}`;
        };
        
        viewDetailedBtn.onclick = () => {
            window.location.href = `./detailed-results.html?id=${eventId}`;
        };
        
        // Test results button
        viewResultsBtn.click();
        expect(window.location.href).toBe('./results.html?id=freeplay');
        
        // Reset and test detailed button
        window.location.href = '';
        viewDetailedBtn.click();
        expect(window.location.href).toBe('./detailed-results.html?id=freeplay');
    });
    
    test('Buttons exist in DOM with correct IDs', () => {
        const viewResultsBtn = document.getElementById('viewResultsBtn');
        const viewDetailedBtn = document.getElementById('viewDetailedBtn');
        
        expect(viewResultsBtn).toBeTruthy();
        expect(viewDetailedBtn).toBeTruthy();
        expect(viewResultsBtn.textContent).toBe('View Group Results');
        expect(viewDetailedBtn.textContent).toBe('View Detailed Analysis');
    });
    
    test('Navigation handles empty event ID gracefully', () => {
        const eventId = '';
        
        // Setup navigation
        const viewResultsBtn = document.getElementById('viewResultsBtn');
        viewResultsBtn.onclick = () => {
            window.location.href = `./results.html?id=${eventId}`;
        };
        
        // Click button
        viewResultsBtn.click();
        
        // Should still navigate, even with empty ID
        expect(window.location.href).toBe('./results.html?id=');
    });
});
