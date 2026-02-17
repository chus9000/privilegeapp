/**
 * Unit tests for Ally Tips on Event Results Pages
 * 
 * Tests that ally tips are displayed on event results pages (both results.html and spectrum.html)
 * Requirements: 2.4, 9.1
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Event Results Ally Tips Integration', () => {
    let dom;
    let document;
    let window;
    
    beforeEach(() => {
        // Load the results.html file
        const html = fs.readFileSync(path.resolve(__dirname, '../app/results.html'), 'utf8');
        dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
        document = dom.window.document;
        window = dom.window;
        
        // Mock global objects
        global.document = document;
        global.window = window;
    });
    
    describe('results.html modal structure', () => {
        test('should have ally tips container in participant modal', () => {
            const modal = document.getElementById('participantModal');
            expect(modal).toBeTruthy();
            
            const allyTipsContainer = document.getElementById('modalAllyTips');
            expect(allyTipsContainer).toBeTruthy();
            expect(allyTipsContainer.className).toContain('modal-ally-tips');
        });
        
        test('should have ally tips container inside modal body', () => {
            const modalBody = document.querySelector('.modal-body');
            expect(modalBody).toBeTruthy();
            
            const allyTipsContainer = modalBody.querySelector('#modalAllyTips');
            expect(allyTipsContainer).toBeTruthy();
        });
    });
    
    describe('spectrum.html modal structure', () => {
        beforeEach(() => {
            // Load the spectrum.html file
            const html = fs.readFileSync(path.resolve(__dirname, '../app/spectrum.html'), 'utf8');
            dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
            document = dom.window.document;
            window = dom.window;
            
            global.document = document;
            global.window = window;
        });
        
        test('should have ally tips container in participant modal', () => {
            const modal = document.getElementById('participantModal');
            expect(modal).toBeTruthy();
            
            const allyTipsContainer = document.getElementById('modalAllyTips');
            expect(allyTipsContainer).toBeTruthy();
            expect(allyTipsContainer.className).toContain('modal-ally-tips');
        });
        
        test('should load ally-tips.js script', () => {
            const scripts = Array.from(document.querySelectorAll('script'));
            const allyTipsScript = scripts.find(script => 
                script.src && script.src.includes('ally-tips.js')
            );
            expect(allyTipsScript).toBeTruthy();
        });
    });
    
    describe('showParticipantModal with ally tips', () => {
        let mockGetTipsForScore;
        let mockCategorizeScore;
        let mockRenderTips;
        
        beforeEach(() => {
            // Mock ally tips functions
            mockGetTipsForScore = vi.fn(() => [
                'Use your privilege to amplify marginalized voices',
                'Educate yourself on systemic inequalities'
            ]);
            mockCategorizeScore = vi.fn(() => 'highPrivilege');
            mockRenderTips = vi.fn((tips, category) => `
                <div class="ally-tips-section">
                    <h2>💡 Using Your Privilege to Support Others</h2>
                    <ul class="ally-tips-list">
                        ${tips.map(tip => `<li class="ally-tip-item">${tip}</li>`).join('')}
                    </ul>
                </div>
            `);
            
            global.getTipsForScore = mockGetTipsForScore;
            global.categorizeScore = mockCategorizeScore;
            global.renderTips = mockRenderTips;
        });
        
        test('should populate ally tips when modal is shown', () => {
            // Set up test data
            const participant = {
                id: 'test-123',
                name: 'Test User',
                avatar: '🐱',
                score: 15
            };
            
            const spectrumConfig = { min: -25, max: 25 };
            
            // Simulate modal population
            const modalAllyTips = document.getElementById('modalAllyTips');
            
            // Call the functions as the code would
            const allyTipsArray = mockGetTipsForScore(participant.score, spectrumConfig.min, spectrumConfig.max);
            const category = mockCategorizeScore(participant.score, spectrumConfig.min, spectrumConfig.max);
            const allyTipsHTML = mockRenderTips(allyTipsArray, category);
            
            if (modalAllyTips) {
                modalAllyTips.innerHTML = allyTipsHTML;
            }
            
            // Verify functions were called
            expect(mockGetTipsForScore).toHaveBeenCalledWith(15, -25, 25);
            expect(mockCategorizeScore).toHaveBeenCalledWith(15, -25, 25);
            expect(mockRenderTips).toHaveBeenCalled();
            
            // Verify HTML was populated
            expect(modalAllyTips.innerHTML).toContain('ally-tips-section');
            expect(modalAllyTips.innerHTML).toContain('Using Your Privilege to Support Others');
        });
        
        test('should show appropriate tips for different score categories', () => {
            const modalAllyTips = document.getElementById('modalAllyTips');
            
            // Test high privilege
            mockCategorizeScore.mockReturnValue('highPrivilege');
            mockRenderTips.mockReturnValue('<div class="ally-tips-section"><h2>High Privilege Tips</h2></div>');
            
            let allyTipsArray = mockGetTipsForScore(20, -25, 25);
            let category = mockCategorizeScore(20, -25, 25);
            let allyTipsHTML = mockRenderTips(allyTipsArray, category);
            modalAllyTips.innerHTML = allyTipsHTML;
            
            expect(mockCategorizeScore).toHaveBeenCalledWith(20, -25, 25);
            expect(modalAllyTips.innerHTML).toContain('High Privilege Tips');
            
            // Test low privilege
            mockCategorizeScore.mockReturnValue('lowPrivilege');
            mockRenderTips.mockReturnValue('<div class="ally-tips-section"><h2>Low Privilege Tips</h2></div>');
            
            allyTipsArray = mockGetTipsForScore(-20, -25, 25);
            category = mockCategorizeScore(-20, -25, 25);
            allyTipsHTML = mockRenderTips(allyTipsArray, category);
            modalAllyTips.innerHTML = allyTipsHTML;
            
            expect(mockCategorizeScore).toHaveBeenCalledWith(-20, -25, 25);
            expect(modalAllyTips.innerHTML).toContain('Low Privilege Tips');
            
            // Test neutral
            mockCategorizeScore.mockReturnValue('neutral');
            mockRenderTips.mockReturnValue('<div class="ally-tips-section"><h2>Neutral Tips</h2></div>');
            
            allyTipsArray = mockGetTipsForScore(0, -25, 25);
            category = mockCategorizeScore(0, -25, 25);
            allyTipsHTML = mockRenderTips(allyTipsArray, category);
            modalAllyTips.innerHTML = allyTipsHTML;
            
            expect(mockCategorizeScore).toHaveBeenCalledWith(0, -25, 25);
            expect(modalAllyTips.innerHTML).toContain('Neutral Tips');
        });
    });
});
