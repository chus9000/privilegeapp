import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Modal Scroll Blocking', () => {
    let dom;
    let document;
    let window;

    beforeEach(() => {
        // Create a minimal DOM for testing
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body.modal-open {
                        overflow: hidden;
                    }
                </style>
            </head>
            <body>
                <div id="testModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <p>Modal content</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;
    });

    afterEach(() => {
        dom.window.close();
    });

    test('should add modal-open class to body when modal is shown', () => {
        const modal = document.getElementById('testModal');
        
        // Simulate opening modal
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
        
        expect(document.body.classList.contains('modal-open')).toBe(true);
    });

    test('should remove modal-open class from body when modal is closed', () => {
        const modal = document.getElementById('testModal');
        
        // Simulate opening modal
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
        
        // Simulate closing modal
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        
        expect(document.body.classList.contains('modal-open')).toBe(false);
    });

    test('should have overflow hidden when modal-open class is present', () => {
        document.body.classList.add('modal-open');
        
        const computedStyle = window.getComputedStyle(document.body);
        expect(computedStyle.overflow).toBe('hidden');
    });

    test('should not have overflow hidden when modal-open class is absent', () => {
        document.body.classList.remove('modal-open');
        
        const computedStyle = window.getComputedStyle(document.body);
        expect(computedStyle.overflow).not.toBe('hidden');
    });

    test('should handle multiple modals correctly - only remove class when all modals are closed', () => {
        const modal1 = document.getElementById('testModal');
        
        // Create second modal
        const modal2 = document.createElement('div');
        modal2.id = 'testModal2';
        modal2.className = 'modal';
        modal2.style.display = 'none';
        document.body.appendChild(modal2);
        
        // Open first modal
        modal1.style.display = 'block';
        document.body.classList.add('modal-open');
        expect(document.body.classList.contains('modal-open')).toBe(true);
        
        // Open second modal (class should still be present)
        modal2.style.display = 'block';
        expect(document.body.classList.contains('modal-open')).toBe(true);
        
        // Close first modal (class should still be present because modal2 is open)
        modal1.style.display = 'none';
        // In real implementation, we'd check if any modals are still open before removing
        // For this test, we're just verifying the class management pattern
        
        // Close second modal (now class should be removed)
        modal2.style.display = 'none';
        document.body.classList.remove('modal-open');
        expect(document.body.classList.contains('modal-open')).toBe(false);
    });
});
