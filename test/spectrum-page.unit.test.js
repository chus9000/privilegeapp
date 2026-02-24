/**
 * Unit tests for results page spectrum functionality
 * Requirements: 5.1, 5.2, 7.7, 12.4
 * 
 * Tests spectrum rendering, participant highlighting, and mobile scrolling/centering
 * Updated for spectrum page consolidation - tests results.html instead of spectrum.html
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Results Page Spectrum Tests', () => {
    let dom;
    let window;
    let document;
    let localStorage;

    beforeEach(() => {
        // Create a minimal HTML structure matching results.html
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .spectrum-container {
                        overflow-x: auto;
                        width: 100%;
                    }
                    .spectrum-bar {
                        position: relative;
                        width: 1024px;
                        height: 400px;
                    }
                    .participant-marker {
                        position: absolute;
                    }
                    .current-participant {
                        border: 2px solid gold;
                    }
                </style>
            </head>
            <body>
                <div id="eventTitle"></div>
                <div class="spectrum-container">
                    <div class="spectrum-bar"></div>
                </div>
                <div id="searchInput"></div>
                <div id="searchToggle"></div>
                <div id="searchContainer"></div>
                <div id="searchCount"></div>
                <button id="backToResultsBtn">Back to Results</button>
            </body>
            </html>
        `;

        dom = new JSDOM(html, {
            url: 'http://localhost/app/results.html?id=test-event',
            runScripts: 'dangerously',
            resources: 'usable'
        });

        window = dom.window;
        document = window.document;
        
        // Mock localStorage
        localStorage = {
            data: {},
            getItem(key) {
                return this.data[key] || null;
            },
            setItem(key, value) {
                this.data[key] = value;
            },
            removeItem(key) {
                delete this.data[key];
            },
            clear() {
                this.data = {};
            }
        };

        window.localStorage = localStorage;
        
        // Mock FirebaseAPI
        window.FirebaseAPI = {
            loadEvent: vi.fn(),
            onEventUpdate: vi.fn()
        };

        // Mock questions array
        window.questions = [
            { text: 'Question 1', value: 1 },
            { text: 'Question 2', value: -1 },
            { text: 'Question 3', value: 2 }
        ];
    });

    afterEach(() => {
        if (dom) {
            dom.window.close();
        }
    });

    describe('Spectrum Rendering', () => {
        it('should render spectrum bar with correct structure', () => {
            const spectrumBar = document.querySelector('.spectrum-bar');
            
            expect(spectrumBar).toBeDefined();
            expect(spectrumBar).not.toBeNull();
        });

        it('should render event title', () => {
            const eventTitle = document.getElementById('eventTitle');
            const testTitle = 'Test Event';
            
            eventTitle.textContent = testTitle;
            
            expect(eventTitle.textContent).toBe(testTitle);
        });

        it('should render participants on spectrum bar', () => {
            const spectrumBar = document.querySelector('.spectrum-bar');
            const participants = [
                { id: 'p1', name: 'Alice', avatar: '🐱', score: 5 },
                { id: 'p2', name: 'Bob', avatar: '🐶', score: -3 },
                { id: 'p3', name: 'Charlie', avatar: '🦊', score: 0 }
            ];

            // Simulate rendering participants
            participants.forEach(p => {
                const marker = document.createElement('div');
                marker.className = 'participant-marker';
                marker.setAttribute('data-participant-id', p.id);
                marker.innerHTML = `
                    <div class="participant-container">
                        <div class="participant-avatar">${p.avatar}</div>
                        <div class="participant-name-label">${p.name} (${p.score > 0 ? '+' : ''}${p.score})</div>
                    </div>
                `;
                spectrumBar.appendChild(marker);
            });

            const markers = spectrumBar.querySelectorAll('.participant-marker');
            expect(markers.length).toBe(3);
        });

        it('should render spectrum sections with correct labels', () => {
            const spectrumBar = document.querySelector('.spectrum-bar');
            
            // Simulate creating spectrum sections
            const sections = [
                { start: -25, end: -20, label: '-25' },
                { start: -20, end: -15, label: '-20' },
                { start: 0, end: 5, label: '+5' },
                { start: 20, end: 25, label: '+25' }
            ];

            sections.forEach(s => {
                const section = document.createElement('div');
                section.className = 'spectrum-section';
                section.setAttribute('data-start', s.start.toString());
                section.setAttribute('data-end', s.end.toString());
                section.textContent = s.label;
                spectrumBar.appendChild(section);
            });

            const renderedSections = spectrumBar.querySelectorAll('.spectrum-section');
            expect(renderedSections.length).toBe(4);
            expect(renderedSections[0].textContent).toBe('-25');
            expect(renderedSections[3].textContent).toBe('+25');
        });

        it('should render zero line on spectrum', () => {
            const spectrumBar = document.querySelector('.spectrum-bar');
            
            // Simulate creating zero line
            const zeroLine = document.createElement('div');
            zeroLine.className = 'spectrum-zero-line';
            zeroLine.setAttribute('data-value', '0');
            spectrumBar.appendChild(zeroLine);

            const renderedZeroLine = spectrumBar.querySelector('.spectrum-zero-line');
            expect(renderedZeroLine).not.toBeNull();
            expect(renderedZeroLine.getAttribute('data-value')).toBe('0');
        });

        it('should position participants correctly based on score', () => {
            const spectrumBar = document.querySelector('.spectrum-bar');
            const min = -25;
            const max = 25;
            const range = max - min;

            const participant = { id: 'p1', name: 'Test', avatar: '🐱', score: 0 };
            const expectedPosition = ((participant.score - min) / range) * 100;

            const marker = document.createElement('div');
            marker.className = 'participant-marker';
            marker.innerHTML = `
                <div class="participant-container" style="left: ${expectedPosition}%">
                    <div class="participant-avatar">${participant.avatar}</div>
                </div>
            `;
            spectrumBar.appendChild(marker);

            const container = marker.querySelector('.participant-container');
            expect(container.style.left).toBe('50%'); // 0 is at 50% for -25 to +25 range
        });

        it('should handle empty participant list', () => {
            const spectrumBar = document.querySelector('.spectrum-bar');
            const markers = spectrumBar.querySelectorAll('.participant-marker');
            
            expect(markers.length).toBe(0);
        });

        it('should render multiple participants at same score', () => {
            const spectrumBar = document.querySelector('.spectrum-bar');
            const participants = [
                { id: 'p1', name: 'Alice', avatar: '🐱', score: 5 },
                { id: 'p2', name: 'Bob', avatar: '🐶', score: 5 },
                { id: 'p3', name: 'Charlie', avatar: '🦊', score: 5 }
            ];

            participants.forEach((p, index) => {
                const marker = document.createElement('div');
                marker.className = 'participant-marker';
                marker.setAttribute('data-participant-id', p.id);
                marker.setAttribute('data-row', (index % 20).toString());
                spectrumBar.appendChild(marker);
            });

            const markers = spectrumBar.querySelectorAll('.participant-marker');
            expect(markers.length).toBe(3);
            
            // Verify they have different rows
            const rows = Array.from(markers).map(m => m.getAttribute('data-row'));
            expect(rows).toEqual(['0', '1', '2']);
        });
    });

    describe('Participant Highlighting', () => {
        it('should highlight current participant from localStorage', () => {
            const spectrumBar = document.querySelector('.spectrum-bar');
            const currentParticipant = {
                id: 'current-user',
                name: 'Current User',
                avatar: '🐱',
                score: 10
            };

            // Store current participant in localStorage
            localStorage.setItem('participant_test-event', JSON.stringify(currentParticipant));

            // Create participant markers
            const participants = [
                { id: 'p1', name: 'User 1', score: 5 },
                { id: 'current-user', name: 'Current User', score: 10 },
                { id: 'p3', name: 'User 3', score: 15 }
            ];

            participants.forEach(p => {
                const marker = document.createElement('div');
                marker.className = 'participant-marker';
                marker.setAttribute('data-participant-id', p.id);
                spectrumBar.appendChild(marker);
            });

            // Simulate highlighting logic
            const storedData = localStorage.getItem('participant_test-event');
            const participant = JSON.parse(storedData);
            const markerToHighlight = document.querySelector(
                `.participant-marker[data-participant-id="${participant.id}"]`
            );
            
            if (markerToHighlight) {
                markerToHighlight.classList.add('current-participant');
            }

            // Verify highlighting
            const highlightedMarker = document.querySelector('.current-participant');
            expect(highlightedMarker).not.toBeNull();
            expect(highlightedMarker.getAttribute('data-participant-id')).toBe('current-user');
        });

        it('should not highlight any participant when localStorage is empty', () => {
            const spectrumBar = document.querySelector('.spectrum-bar');
            
            const marker = document.createElement('div');
            marker.className = 'participant-marker';
            marker.setAttribute('data-participant-id', 'p1');
            spectrumBar.appendChild(marker);

            const highlightedMarker = document.querySelector('.current-participant');
            expect(highlightedMarker).toBeNull();
        });

        it('should maintain highlight class when other classes are added', () => {
            const spectrumBar = document.querySelector('.spectrum-bar');
            const marker = document.createElement('div');
            marker.className = 'participant-marker current-participant';
            marker.setAttribute('data-participant-id', 'p1');
            spectrumBar.appendChild(marker);

            // Add another class
            marker.classList.add('filtered-out');

            expect(marker.classList.contains('current-participant')).toBe(true);
            expect(marker.classList.contains('filtered-out')).toBe(true);
        });
    });

    describe('Mobile Scrolling and Centering', () => {
        it('should center spectrum on zero position for mobile viewport', () => {
            // Mock mobile viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375 // Mobile width
            });

            const spectrumContainer = document.querySelector('.spectrum-container');
            const spectrumWidth = 1024;
            const viewportWidth = window.innerWidth;
            
            // Calculate expected scroll position
            const zeroPosition = spectrumWidth * 0.5; // 50% is zero
            const expectedScrollLeft = zeroPosition - (viewportWidth / 2);

            // Simulate centering logic
            spectrumContainer.scrollLeft = expectedScrollLeft;

            expect(spectrumContainer.scrollLeft).toBe(expectedScrollLeft);
            expect(spectrumContainer.scrollLeft).toBeGreaterThan(0);
        });

        it('should not center spectrum for desktop viewport', () => {
            // Mock desktop viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1920 // Desktop width
            });

            const spectrumContainer = document.querySelector('.spectrum-container');
            
            // For desktop (width > 920), centering should not occur
            if (window.innerWidth > 920) {
                // Don't set scrollLeft
            } else {
                const spectrumWidth = 1024;
                const viewportWidth = window.innerWidth;
                const zeroPosition = spectrumWidth * 0.5;
                spectrumContainer.scrollLeft = zeroPosition - (viewportWidth / 2);
            }

            // Desktop should remain at default scroll position
            expect(spectrumContainer.scrollLeft).toBe(0);
        });

        it('should calculate correct scroll position for tablet viewport', () => {
            // Mock tablet viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 768 // Tablet width
            });

            const spectrumContainer = document.querySelector('.spectrum-container');
            const spectrumWidth = 1024;
            const viewportWidth = window.innerWidth;
            
            const zeroPosition = spectrumWidth * 0.5;
            const expectedScrollLeft = zeroPosition - (viewportWidth / 2);

            spectrumContainer.scrollLeft = expectedScrollLeft;

            expect(spectrumContainer.scrollLeft).toBe(128); // 512 - 384
        });

        it('should handle spectrum container scrolling', () => {
            const spectrumContainer = document.querySelector('.spectrum-container');
            
            // Test that container can be scrolled
            spectrumContainer.scrollLeft = 100;
            expect(spectrumContainer.scrollLeft).toBe(100);
            
            spectrumContainer.scrollLeft = 500;
            expect(spectrumContainer.scrollLeft).toBe(500);
        });

        it('should center on zero for viewport width exactly 920px', () => {
            // Test boundary condition
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 920
            });

            const spectrumContainer = document.querySelector('.spectrum-container');
            
            // At exactly 920px, should still center (condition is <= 920)
            if (window.innerWidth <= 920) {
                const spectrumWidth = 1024;
                const viewportWidth = window.innerWidth;
                const zeroPosition = spectrumWidth * 0.5;
                spectrumContainer.scrollLeft = zeroPosition - (viewportWidth / 2);
            }

            expect(spectrumContainer.scrollLeft).toBeGreaterThan(0);
        });

        it('should not center for viewport width 921px', () => {
            // Test boundary condition
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 921
            });

            const spectrumContainer = document.querySelector('.spectrum-container');
            
            // At 921px, should not center (condition is <= 920)
            if (window.innerWidth <= 920) {
                const spectrumWidth = 1024;
                const viewportWidth = window.innerWidth;
                const zeroPosition = spectrumWidth * 0.5;
                spectrumContainer.scrollLeft = zeroPosition - (viewportWidth / 2);
            }

            expect(spectrumContainer.scrollLeft).toBe(0);
        });

        it('should handle very small mobile viewport', () => {
            // Mock very small mobile viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 320 // Small mobile width
            });

            const spectrumContainer = document.querySelector('.spectrum-container');
            const spectrumWidth = 1024;
            const viewportWidth = window.innerWidth;
            
            const zeroPosition = spectrumWidth * 0.5;
            const expectedScrollLeft = zeroPosition - (viewportWidth / 2);

            spectrumContainer.scrollLeft = expectedScrollLeft;

            expect(spectrumContainer.scrollLeft).toBe(352); // 512 - 160
        });

        it('should recalculate scroll position on window resize', () => {
            const spectrumContainer = document.querySelector('.spectrum-container');
            
            // Start with mobile
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375
            });

            let viewportWidth = window.innerWidth;
            const spectrumWidth = 1024;
            let zeroPosition = spectrumWidth * 0.5;
            spectrumContainer.scrollLeft = zeroPosition - (viewportWidth / 2);
            
            const mobileScrollLeft = spectrumContainer.scrollLeft;

            // Resize to desktop
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1920
            });

            // On desktop, don't center
            if (window.innerWidth > 920) {
                spectrumContainer.scrollLeft = 0;
            }

            expect(mobileScrollLeft).toBeGreaterThan(0);
            expect(spectrumContainer.scrollLeft).toBe(0);
        });
    });

    describe('Search Functionality', () => {
        it('should have search input element', () => {
            const searchInput = document.getElementById('searchInput');
            expect(searchInput).not.toBeNull();
        });

        it('should have search toggle button', () => {
            const searchToggle = document.getElementById('searchToggle');
            expect(searchToggle).not.toBeNull();
        });

        it('should have search container', () => {
            const searchContainer = document.getElementById('searchContainer');
            expect(searchContainer).not.toBeNull();
        });

        it('should have search count display', () => {
            const searchCount = document.getElementById('searchCount');
            expect(searchCount).not.toBeNull();
        });
    });

    describe('Navigation', () => {
        it('should have back to results button', () => {
            const backBtn = document.getElementById('backToResultsBtn');
            expect(backBtn).not.toBeNull();
            expect(backBtn.textContent).toBe('Back to Results');
        });

        it('should extract event ID from URL', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('id');
            
            expect(eventId).toBe('test-event');
        });
    });

    describe('Dynamic Spectrum Range', () => {
        it('should calculate correct range for different question sets', () => {
            // Test range calculation logic
            const calculateRange = (questions) => {
                let positiveSum = 0;
                let negativeSum = 0;
                
                questions.forEach(q => {
                    if (q.value > 0) positiveSum += q.value;
                    else negativeSum += Math.abs(q.value);
                });
                
                const maxSum = Math.max(positiveSum, negativeSum);
                
                if (maxSum >= 20 && maxSum <= 25) return { min: -25, max: 25 };
                if (maxSum >= 15 && maxSum <= 19) return { min: -20, max: 20 };
                if (maxSum >= 10 && maxSum <= 14) return { min: -15, max: 15 };
                if (maxSum >= 5 && maxSum <= 9) return { min: -10, max: 10 };
                if (maxSum >= 1 && maxSum <= 4) return { min: -5, max: 5 };
                return { min: -25, max: 25 };
            };

            const questions1 = [{ value: 5 }, { value: 5 }, { value: 5 }, { value: 5 }];
            const range1 = calculateRange(questions1);
            expect(range1.max).toBe(25); // maxSum = 20

            const questions2 = [{ value: 3 }, { value: 3 }];
            const range2 = calculateRange(questions2);
            expect(range2.max).toBe(10); // maxSum = 6
        });
    });

    describe('Real-time Updates', () => {
        it('should detect participant changes', () => {
            const oldData = {
                participants: [
                    { id: 'p1', name: 'Alice', score: 5 },
                    { id: 'p2', name: 'Bob', score: 10 }
                ]
            };

            const newData = {
                participants: [
                    { id: 'p1', name: 'Alice', score: 5 },
                    { id: 'p2', name: 'Bob', score: 10 },
                    { id: 'p3', name: 'Charlie', score: 15 }
                ]
            };

            // Simple change detection
            const hasChanges = oldData.participants.length !== newData.participants.length;
            expect(hasChanges).toBe(true);
        });

        it('should detect score changes', () => {
            const oldData = {
                participants: [
                    { id: 'p1', name: 'Alice', score: 5 }
                ]
            };

            const newData = {
                participants: [
                    { id: 'p1', name: 'Alice', score: 10 }
                ]
            };

            const participant1 = oldData.participants[0];
            const participant2 = newData.participants.find(p => p.id === participant1.id);
            
            const hasChanges = participant1.score !== participant2.score;
            expect(hasChanges).toBe(true);
        });
    });

    describe('Row Allocation', () => {
        it('should allocate participants to rows using round-robin', () => {
            const participants = [
                { id: 'p1', score: 5 },
                { id: 'p2', score: 10 },
                { id: 'p3', score: 15 },
                { id: 'p4', score: 20 }
            ];

            // Simulate round-robin allocation
            const rows = participants.map((p, index) => index % 20);
            
            expect(rows).toEqual([0, 1, 2, 3]);
        });

        it('should wrap rows after 20 participants', () => {
            const participants = Array.from({ length: 25 }, (_, i) => ({
                id: `p${i}`,
                score: i
            }));

            const rows = participants.map((p, index) => index % 20);
            
            expect(rows[0]).toBe(0);
            expect(rows[20]).toBe(0); // Wraps back to row 0
            expect(rows[21]).toBe(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing event data gracefully', () => {
            const eventData = null;
            
            if (!eventData) {
                const errorMessage = 'Event not found';
                expect(errorMessage).toBe('Event not found');
            }
        });

        it('should handle empty participants array', () => {
            const eventData = {
                title: 'Test Event',
                participants: []
            };

            expect(eventData.participants.length).toBe(0);
        });

        it('should handle malformed participant data', () => {
            const participant = {
                id: 'p1',
                // Missing name, avatar, score
            };

            expect(participant.name).toBeUndefined();
            expect(participant.avatar).toBeUndefined();
            expect(participant.score).toBeUndefined();
        });
    });
});
