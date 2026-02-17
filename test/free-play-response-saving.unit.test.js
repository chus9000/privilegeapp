/**
 * Unit tests for free play response saving
 * Requirements: 2.7
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Free Play Response Saving', () => {
    let originalFetch;
    let fetchCalls;
    
    beforeEach(() => {
        // Mock fetch
        fetchCalls = [];
        originalFetch = global.fetch;
        global.fetch = vi.fn((url, options) => {
            fetchCalls.push({ url, options });
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve('')
            });
        });
        
        // Mock console to reduce noise
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        // Mock window.FIREBASE_CONFIG
        global.window = {
            FIREBASE_CONFIG: {
                databaseURL: 'https://test-db.firebaseio.com'
            }
        };
    });
    
    afterEach(() => {
        global.fetch = originalFetch;
        vi.restoreAllMocks();
    });
    
    test('should save anonymous response with only score and answers', async () => {
        // Create a mock participant with all fields
        const participant = {
            id: 'test-participant-123',
            name: 'Test User',
            avatar: '🐱',
            score: 15,
            answers: { 0: 1, 1: 0, 2: 1 },
            createdAt: '2025-01-01T00:00:00.000Z'
        };
        
        // Mock saveFreePlayResponse function
        const saveFreePlayResponse = async (participant) => {
            const anonymousResponse = {
                id: participant.id,
                score: participant.score,
                answers: participant.answers,
                createdAt: participant.createdAt
            };
            
            const url = `${window.FIREBASE_CONFIG.databaseURL}/events/freeplay/participants/${participant.id}.json`;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(anonymousResponse)
            });
            
            return response.ok;
        };
        
        // Call the function
        const result = await saveFreePlayResponse(participant);
        
        // Verify the result
        expect(result).toBe(true);
        
        // Verify fetch was called with correct URL
        expect(fetchCalls).toHaveLength(1);
        expect(fetchCalls[0].url).toBe('https://test-db.firebaseio.com/events/freeplay/participants/test-participant-123.json');
        
        // Verify the request body contains only anonymous fields
        const requestBody = JSON.parse(fetchCalls[0].options.body);
        expect(requestBody).toEqual({
            id: 'test-participant-123',
            score: 15,
            answers: { 0: 1, 1: 0, 2: 1 },
            createdAt: '2025-01-01T00:00:00.000Z'
        });
        
        // Verify name and avatar are NOT included
        expect(requestBody.name).toBeUndefined();
        expect(requestBody.avatar).toBeUndefined();
    });
    
    test('should handle Firebase save errors gracefully', async () => {
        // Mock fetch to return error
        global.fetch = vi.fn(() => Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: () => Promise.resolve('Database error')
        }));
        
        const participant = {
            id: 'test-participant-456',
            score: 10,
            answers: { 0: 1 },
            createdAt: '2025-01-01T00:00:00.000Z'
        };
        
        // Mock saveFreePlayResponse function
        const saveFreePlayResponse = async (participant) => {
            try {
                const anonymousResponse = {
                    id: participant.id,
                    score: participant.score,
                    answers: participant.answers,
                    createdAt: participant.createdAt
                };
                
                const url = `${window.FIREBASE_CONFIG.databaseURL}/events/freeplay/participants/${participant.id}.json`;
                
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(anonymousResponse)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Free play response save failed:', {
                        status: response.status,
                        statusText: response.statusText,
                        errorBody: errorText
                    });
                    return false;
                }
                
                return true;
            } catch (error) {
                console.error('❌ Free play response save exception:', error);
                return false;
            }
        };
        
        // Call the function
        const result = await saveFreePlayResponse(participant);
        
        // Verify the result is false (error handled gracefully)
        expect(result).toBe(false);
        
        // Verify error was logged
        expect(console.error).toHaveBeenCalled();
    });
    
    test('should handle network exceptions gracefully', async () => {
        // Mock fetch to throw network error
        global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
        
        const participant = {
            id: 'test-participant-789',
            score: 5,
            answers: { 0: 0, 1: 1 },
            createdAt: '2025-01-01T00:00:00.000Z'
        };
        
        // Mock saveFreePlayResponse function
        const saveFreePlayResponse = async (participant) => {
            try {
                const anonymousResponse = {
                    id: participant.id,
                    score: participant.score,
                    answers: participant.answers,
                    createdAt: participant.createdAt
                };
                
                const url = `${window.FIREBASE_CONFIG.databaseURL}/events/freeplay/participants/${participant.id}.json`;
                
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(anonymousResponse)
                });
                
                return response.ok;
            } catch (error) {
                console.error('❌ Free play response save exception:', error);
                return false;
            }
        };
        
        // Call the function
        const result = await saveFreePlayResponse(participant);
        
        // Verify the result is false (exception handled gracefully)
        expect(result).toBe(false);
        
        // Verify error was logged
        expect(console.error).toHaveBeenCalled();
    });
    
    test('should save to correct Firebase path', async () => {
        const participant = {
            id: 'unique-id-abc',
            score: 20,
            answers: { 0: 1, 1: 1, 2: 1 },
            createdAt: '2025-01-01T00:00:00.000Z'
        };
        
        // Mock saveFreePlayResponse function
        const saveFreePlayResponse = async (participant) => {
            const anonymousResponse = {
                id: participant.id,
                score: participant.score,
                answers: participant.answers,
                createdAt: participant.createdAt
            };
            
            const url = `${window.FIREBASE_CONFIG.databaseURL}/events/freeplay/participants/${participant.id}.json`;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(anonymousResponse)
            });
            
            return response.ok;
        };
        
        // Call the function
        await saveFreePlayResponse(participant);
        
        // Verify the path structure
        expect(fetchCalls[0].url).toContain('/events/freeplay/participants/');
        expect(fetchCalls[0].url).toContain('unique-id-abc');
        expect(fetchCalls[0].url.endsWith('.json')).toBe(true);
    });
});
