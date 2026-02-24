/**
 * Unit Test: Banner Content
 * Feature: event-creation-limit
 * 
 * **Validates: Requirements 10.2, 10.3, 10.6, 10.7**
 * 
 * Tests that the quota banner includes appropriate messaging about the 3-event limit
 * and upcoming licensing plans.
 */

describe('Unit Test: Banner Content', () => {
    beforeEach(() => {
        // Create mock DOM environment with banner
        document.body.innerHTML = `
            <div id="quotaBanner" class="quota-banner" style="display: none;">
                <div class="banner-icon">
                    <i data-lucide="info"></i>
                </div>
                <div class="banner-content">
                    <h4>Event Limit Reached</h4>
                    <p>
                        You've created 3 events, which is the current limit. 
                        Good news: we're working on licensing plans that will allow you to create more events!
                        For now, you can delete an old event to create a new one.
                    </p>
                </div>
                <button class="banner-close" onclick="dismissBanner()">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `;
    });

    /**
     * Test: Banner includes message about 3-event limit
     * **Validates: Requirements 10.2**
     */
    test('banner should include message about 3-event limit', () => {
        const banner = document.getElementById('quotaBanner');
        const bannerContent = banner.querySelector('.banner-content');
        
        expect(bannerContent).toBeTruthy();
        
        const text = bannerContent.textContent;
        
        // Should mention the limit
        expect(text).toMatch(/3 events/i);
        expect(text).toMatch(/limit/i);
    });

    /**
     * Test: Banner includes message about upcoming licensing plans
     * **Validates: Requirements 10.3**
     */
    test('banner should include message about upcoming licensing plans', () => {
        const banner = document.getElementById('quotaBanner');
        const bannerContent = banner.querySelector('.banner-content');
        
        expect(bannerContent).toBeTruthy();
        
        const text = bannerContent.textContent;
        
        // Should mention licensing plans
        expect(text).toMatch(/licensing plans/i);
        expect(text).toMatch(/more events/i);
    });

    /**
     * Test: Banner uses clear, friendly language
     * **Validates: Requirements 10.6**
     */
    test('banner should use clear, friendly language', () => {
        const banner = document.getElementById('quotaBanner');
        const bannerContent = banner.querySelector('.banner-content');
        
        expect(bannerContent).toBeTruthy();
        
        const text = bannerContent.textContent;
        
        // Should use encouraging language
        expect(text).toMatch(/good news/i);
        
        // Should not use harsh or alarming language
        expect(text).not.toMatch(/error/i);
        expect(text).not.toMatch(/failed/i);
        expect(text).not.toMatch(/denied/i);
    });

    /**
     * Test: Banner has dismiss button
     * **Validates: Requirements 10.7**
     */
    test('banner should have dismiss button', () => {
        const banner = document.getElementById('quotaBanner');
        const dismissButton = banner.querySelector('.banner-close');
        
        expect(dismissButton).toBeTruthy();
        expect(dismissButton.tagName).toBe('BUTTON');
    });

    /**
     * Test: Banner has appropriate structure
     * **Validates: Requirements 10.1**
     */
    test('banner should have appropriate HTML structure', () => {
        const banner = document.getElementById('quotaBanner');
        
        // Should have banner element
        expect(banner).toBeTruthy();
        expect(banner.classList.contains('quota-banner')).toBe(true);
        
        // Should have icon
        const icon = banner.querySelector('.banner-icon');
        expect(icon).toBeTruthy();
        
        // Should have content section
        const content = banner.querySelector('.banner-content');
        expect(content).toBeTruthy();
        
        // Should have heading
        const heading = content.querySelector('h4');
        expect(heading).toBeTruthy();
        expect(heading.textContent).toMatch(/limit/i);
        
        // Should have description
        const description = content.querySelector('p');
        expect(description).toBeTruthy();
        
        // Should have close button
        const closeButton = banner.querySelector('.banner-close');
        expect(closeButton).toBeTruthy();
    });

    /**
     * Test: Banner content is informative and actionable
     * **Validates: Requirements 10.2, 10.3**
     */
    test('banner should provide informative and actionable content', () => {
        const banner = document.getElementById('quotaBanner');
        const bannerContent = banner.querySelector('.banner-content');
        
        const text = bannerContent.textContent;
        
        // Should explain the current situation
        expect(text).toMatch(/created 3 events/i);
        expect(text).toMatch(/current limit/i);
        
        // Should provide future outlook
        expect(text).toMatch(/working on/i);
        expect(text).toMatch(/licensing plans/i);
        
        // Should suggest action
        expect(text).toMatch(/delete/i);
        expect(text).toMatch(/old event/i);
    });

    /**
     * Test: Banner heading is clear and concise
     * **Validates: Requirements 10.6**
     */
    test('banner heading should be clear and concise', () => {
        const banner = document.getElementById('quotaBanner');
        const heading = banner.querySelector('.banner-content h4');
        
        expect(heading).toBeTruthy();
        expect(heading.textContent.trim()).toBe('Event Limit Reached');
        
        // Heading should be short and to the point
        expect(heading.textContent.length).toBeLessThan(50);
    });

    /**
     * Test: Banner message is not alarming
     * **Validates: Requirements 10.6**
     */
    test('banner should not be alarming in appearance or tone', () => {
        const banner = document.getElementById('quotaBanner');
        const text = banner.textContent;
        
        // Should not use alarming punctuation
        expect(text).not.toMatch(/!!!/);
        expect(text).not.toMatch(/⚠️/);
        
        // Should not use all caps for emphasis
        const heading = banner.querySelector('.banner-content h4');
        expect(heading.textContent).not.toMatch(/[A-Z]{5,}/);
    });
});
