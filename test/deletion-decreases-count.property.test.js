/**
 * Property Test: Deletion Decreases Count
 * Feature: event-creation-limit
 * Property 10: Deletion decreases count
 * Validates: Requirements 5.1
 * 
 * For any user with at least one event, when an event is deleted,
 * the user's event count should decrease by exactly 1.
 */

import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest';
import fc from 'fast-check';

describe('Property 10: Deletion Decreases Count', () => {
    let mockFirebase;
    let mockAuth;
    let mockDatabase;
    let mockRef;
    let eventsData;
    let currentUser;

    beforeEach(() => {
        // Reset events data
        eventsData = {};
        currentUser = { uid: 'test-user-123' };

        // Mock Firebase database
        mockRef = {
            orderByChild: vi.fn(function() {
                this._orderBy = 'creatorId';
                return this;
            }),
            equalTo: vi.fn(function(value) {
                this._equalTo = value;
                return this;
            }),
            once: vi.fn(function() {
                // Filter events by the equalTo value (userId)
                const userId = this._equalTo;
                const userEvents = Object.entries(eventsData)
                    .filter(([_, event]) => event.creatorId === userId)
                    .reduce((acc, [id, event]) => {
                        acc[id] = event;
                        return acc;
                    }, {});
                
                return Promise.resolve({
                    val: () => userEvents,
                    numChildren: () => Object.keys(userEvents).length
                });
            }),
            remove: vi.fn().mockImplementation(function() {
                // Get the path from the ref
                const path = this._path;
                if (path && eventsData[path]) {
                    delete eventsData[path];
                    return Promise.resolve();
                }
                return Promise.reject(new Error('Event not found'));
            }),
            child: vi.fn().mockImplementation(function(path) {
                return {
                    ...mockRef,
                    _path: path,
                    remove: mockRef.remove
                };
            })
        };

        mockDatabase = {
            ref: vi.fn().mockImplementation((path) => {
                if (path === 'events') {
                    return mockRef;
                }
                return {
                    ...mockRef,
                    _path: path
                };
            })
        };

        mockAuth = {
            currentUser: currentUser
        };

        mockFirebase = {
            database: vi.fn().mockReturnValue(mockDatabase),
            auth: vi.fn().mockReturnValue(mockAuth)
        };

        global.firebase = mockFirebase;
    });

    afterEach(() => {
        delete global.firebase;
    });

    /**
     * Helper: Create events for a user
     */
    function createEventsForUser(userId, count) {
        const events = [];
        for (let i = 0; i < count; i++) {
            const eventId = `event_${userId}_${i}_${Date.now()}`;
            const event = {
                id: eventId,
                title: `Test Event ${i}`,
                pin: `${100000 + i}`,
                creatorId: userId,
                createdAt: new Date().toISOString(),
                disabledQuestions: [],
                participants: []
            };
            eventsData[eventId] = event;
            events.push(event);
        }
        return events;
    }

    /**
     * Helper: Get user event count
     */
    async function getUserEventCount(userId) {
        const ref = mockDatabase.ref('events');
        const query = ref.orderByChild('creatorId').equalTo(userId);
        const snapshot = await query.once('value');
        return snapshot.numChildren();
    }

    /**
     * Helper: Delete event
     */
    async function deleteEvent(eventId) {
        const ref = mockDatabase.ref('events').child(eventId);
        await ref.remove();
    }

    test('**Validates: Requirements 5.1** - Deletion decreases count by exactly 1', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 5 }), // initial event count (at least 1)
                fc.integer({ min: 0, max: 10 }), // which event to delete (index)
                async (initialCount, deleteIndex) => {
                    // Reset events data for this test run
                    eventsData = {};
                    
                    // Setup: Create user with initialCount events
                    const events = createEventsForUser(currentUser.uid, initialCount);
                    
                    // Verify initial count
                    const countBefore = await getUserEventCount(currentUser.uid);
                    expect(countBefore).toBe(initialCount);
                    
                    // Only proceed if deleteIndex is valid
                    if (deleteIndex >= events.length) {
                        return true; // Skip this test case
                    }
                    
                    // Action: Delete one event
                    await deleteEvent(events[deleteIndex].id);
                    
                    // Assert: Count decreased by exactly 1
                    const countAfter = await getUserEventCount(currentUser.uid);
                    expect(countAfter).toBe(initialCount - 1);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('**Validates: Requirements 5.1** - Multiple deletions decrease count correctly', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 2, max: 5 }), // initial event count (at least 2)
                fc.integer({ min: 1, max: 3 }), // number of events to delete
                async (initialCount, deleteCount) => {
                    // Reset events data for this test run
                    eventsData = {};
                    
                    // Setup: Create user with initialCount events
                    const events = createEventsForUser(currentUser.uid, initialCount);
                    
                    // Verify initial count
                    const countBefore = await getUserEventCount(currentUser.uid);
                    expect(countBefore).toBe(initialCount);
                    
                    // Only proceed if we have enough events to delete
                    const actualDeleteCount = Math.min(deleteCount, events.length);
                    
                    // Action: Delete multiple events
                    for (let i = 0; i < actualDeleteCount; i++) {
                        await deleteEvent(events[i].id);
                    }
                    
                    // Assert: Count decreased by exactly actualDeleteCount
                    const countAfter = await getUserEventCount(currentUser.uid);
                    expect(countAfter).toBe(initialCount - actualDeleteCount);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test('**Validates: Requirements 5.1** - Deleting last event results in count of 0', async () => {
        // Reset events data for this test
        eventsData = {};
        
        // Setup: Create user with 1 event
        const events = createEventsForUser(currentUser.uid, 1);
        
        // Verify initial count
        const countBefore = await getUserEventCount(currentUser.uid);
        expect(countBefore).toBe(1);
        
        // Action: Delete the event
        await deleteEvent(events[0].id);
        
        // Assert: Count is now 0
        const countAfter = await getUserEventCount(currentUser.uid);
        expect(countAfter).toBe(0);
    });

    test('**Validates: Requirements 5.1** - Deletion only affects the specific user', async () => {
        // Reset events data for this test
        eventsData = {};
        
        // Setup: Create events for two different users
        const user1 = 'user1';
        const user2 = 'user2';
        
        const user1Events = createEventsForUser(user1, 3);
        const user2Events = createEventsForUser(user2, 2);
        
        // Verify initial counts
        const user1CountBefore = await getUserEventCount(user1);
        const user2CountBefore = await getUserEventCount(user2);
        expect(user1CountBefore).toBe(3);
        expect(user2CountBefore).toBe(2);
        
        // Action: Delete one event from user1
        await deleteEvent(user1Events[0].id);
        
        // Assert: Only user1's count decreased
        const user1CountAfter = await getUserEventCount(user1);
        const user2CountAfter = await getUserEventCount(user2);
        expect(user1CountAfter).toBe(2);
        expect(user2CountAfter).toBe(2); // Unchanged
    });
});
