/**
 * Data Manager Module
 * Centralized data operations with Firebase RTDB and localStorage fallback
 * Includes sync queue for offline operations
 * Requirements: 11.1, 11.3, 11.4, 14.1, 14.2, 14.4, 14.5
 */

class DataManager {
    constructor() {
        this.firebaseAPI = null;
        this.initialized = false;
        this.syncQueue = [];
        this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        this.isSyncing = false;
    }

    /**
     * Initialize the data manager
     * Sets up Firebase API reference and network listeners
     */
    initialize() {
        if (typeof window !== 'undefined' && window.FirebaseAPI) {
            this.firebaseAPI = window.FirebaseAPI;
            this.initialized = true;
            console.log('✅ DataManager initialized with FirebaseAPI');
        } else {
            console.warn('⚠️ FirebaseAPI not available, using localStorage only');
            this.initialized = true;
        }

        // Set up network status listeners
        this.setupNetworkListeners();

        // Load sync queue from localStorage
        this.loadSyncQueue();
    }

    /**
     * Set up network status listeners for offline/online detection
     * Requirements: 14.4, 14.5
     */
    setupNetworkListeners() {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', () => {
            console.log('🌐 Network connection restored');
            this.isOnline = true;
            this.processSyncQueue();
        });

        window.addEventListener('offline', () => {
            console.log('📴 Network connection lost');
            this.isOnline = false;
        });
    }

    /**
     * Add operation to sync queue
     * Requirements: 14.2, 14.4
     * 
     * @param {Object} operation - Operation to queue
     * @param {string} operation.type - Operation type (saveEvent, updateParticipant, deleteEvent)
     * @param {string} operation.eventId - Event ID
     * @param {*} operation.data - Operation data
     * @param {number} operation.timestamp - Timestamp when queued
     */
    addToSyncQueue(operation) {
        this.syncQueue.push({
            ...operation,
            timestamp: Date.now()
        });
        this.saveSyncQueue();
        console.log(`📋 Added to sync queue: ${operation.type} for ${operation.eventId}`);
    }

    /**
     * Save sync queue to localStorage
     * Requirements: 14.2
     */
    saveSyncQueue() {
        try {
            localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('❌ Failed to save sync queue:', error);
        }
    }

    /**
     * Load sync queue from localStorage
     * Requirements: 14.2
     */
    loadSyncQueue() {
        try {
            const queueData = localStorage.getItem('syncQueue');
            if (queueData) {
                this.syncQueue = JSON.parse(queueData);
                console.log(`📋 Loaded ${this.syncQueue.length} operations from sync queue`);
                
                // Process queue if online
                if (this.isOnline && this.syncQueue.length > 0) {
                    this.processSyncQueue();
                }
            }
        } catch (error) {
            console.error('❌ Failed to load sync queue:', error);
            this.syncQueue = [];
        }
    }

    /**
     * Process sync queue - sync all pending operations to Firebase
     * Requirements: 14.4, 14.5
     * 
     * @returns {Promise<void>}
     */
    async processSyncQueue() {
        if (!this.firebaseAPI || !this.isOnline || this.isSyncing) {
            return;
        }

        if (this.syncQueue.length === 0) {
            console.log('✅ Sync queue is empty');
            return;
        }

        this.isSyncing = true;
        console.log(`🔄 Processing sync queue: ${this.syncQueue.length} operations`);

        const failedOperations = [];

        for (const operation of this.syncQueue) {
            try {
                let success = false;

                switch (operation.type) {
                    case 'saveEvent':
                        success = await this.firebaseAPI.saveEvent(operation.eventId, operation.data);
                        break;
                    case 'updateParticipant':
                        success = await this.firebaseAPI.updateParticipant(operation.eventId, operation.data);
                        break;
                    case 'deleteEvent':
                        success = await this.firebaseAPI.deleteEvent(operation.eventId);
                        break;
                    default:
                        console.warn(`⚠️ Unknown operation type: ${operation.type}`);
                        continue;
                }

                if (success) {
                    console.log(`✅ Synced: ${operation.type} for ${operation.eventId}`);
                } else {
                    console.warn(`⚠️ Failed to sync: ${operation.type} for ${operation.eventId}`);
                    failedOperations.push(operation);
                }
            } catch (error) {
                // Requirements: 15.5 - Log Firebase errors with context
                console.error(`❌ Firebase operation failed during sync: ${operation.type}`, {
                    operation: operation.type,
                    eventId: operation.eventId,
                    timestamp: operation.timestamp,
                    error: error.message,
                    errorCode: error.code,
                    stack: error.stack
                });
                failedOperations.push(operation);
            }
        }

        // Update queue with only failed operations
        this.syncQueue = failedOperations;
        this.saveSyncQueue();

        this.isSyncing = false;

        if (failedOperations.length === 0) {
            console.log('✅ All operations synced successfully');
        } else {
            console.warn(`⚠️ ${failedOperations.length} operations failed to sync`);
        }
    }

    /**
     * Save event to Firebase with localStorage fallback
     * Requirements: 11.1, 11.3
     * 
     * @param {string} eventId - Unique event identifier
     * @param {Object} eventData - Event data object
     * @param {string} eventData.title - Event title
     * @param {string} eventData.pin - 6-digit PIN
     * @param {string} eventData.creatorId - Creator's user ID
     * @param {Array<number>} eventData.disabledQuestions - Array of disabled question indices
     * @param {Array<Object>} eventData.participants - Array of participant objects
     * @param {string} eventData.createdAt - ISO 8601 timestamp
     * @returns {Promise<boolean>} Success status
     */
    async saveEvent(eventId, eventData) {
        console.log('💾 DataManager.saveEvent called:', eventId);
        
        if (!eventId || !eventData) {
            console.error('❌ Invalid parameters for saveEvent');
            return false;
        }

        // Validate required fields
        if (!eventData.title || !eventData.pin) {
            console.error('❌ Missing required fields (title or pin)');
            return false;
        }

        // Save to localStorage first (immediate fallback)
        this.saveToLocalStorage(`event_${eventId}`, eventData);

        // Try Firebase if available and online
        if (this.firebaseAPI && this.isOnline) {
            try {
                const success = await this.firebaseAPI.saveEvent(eventId, eventData);
                if (success) {
                    console.log('✅ Event saved to Firebase successfully');
                    return true;
                } else {
                    console.warn('⚠️ Firebase save failed, queuing for sync');
                    this.addToSyncQueue({
                        type: 'saveEvent',
                        eventId,
                        data: eventData
                    });
                    return true; // Still return true since we have localStorage
                }
            } catch (error) {
                // Requirements: 15.5 - Log Firebase errors with context
                console.error('❌ Firebase operation failed: saveEvent', {
                    operation: 'saveEvent',
                    eventId: eventId,
                    error: error.message,
                    errorCode: error.code,
                    stack: error.stack
                });
                console.log('📦 Queuing for sync');
                this.addToSyncQueue({
                    type: 'saveEvent',
                    eventId,
                    data: eventData
                });
                return true; // Still return true since we have localStorage
            }
        } else {
            if (!this.isOnline) {
                console.log('📴 Offline - queuing for sync');
                this.addToSyncQueue({
                    type: 'saveEvent',
                    eventId,
                    data: eventData
                });
            } else {
                console.log('📦 Firebase not available, using localStorage only');
            }
            return true;
        }
    }

    /**
     * Migrate legacy event data to current format
     * Requirements: 13.2, 13.3
     * 
     * @param {Object} eventData - Event data that may be in legacy format
     * @returns {Object} Migrated event data with all required fields
     */
    migrateLegacyEventData(eventData) {
        if (!eventData) {
            return eventData;
        }

        let migrated = false;

        // Check for missing creatorId field (legacy events)
        if (!eventData.creatorId) {
            console.log('🔄 Migrating legacy event: adding creatorId');
            eventData.creatorId = 'legacy';
            migrated = true;
        }

        // Check for missing disabledQuestions field (legacy events)
        if (!eventData.disabledQuestions) {
            console.log('🔄 Migrating legacy event: adding disabledQuestions');
            eventData.disabledQuestions = [];
            migrated = true;
        }

        if (migrated) {
            console.log('✅ Legacy event data migrated successfully');
        }

        return eventData;
    }

    /**
     * Load event from Firebase with localStorage fallback
     * Requirements: 11.1, 13.2, 13.3
     * 
     * @param {string} eventId - Unique event identifier
     * @returns {Promise<Object|null>} Event data or null if not found
     */
    async loadEvent(eventId) {
        console.log('📖 DataManager.loadEvent called:', eventId);
        
        if (!eventId) {
            console.error('❌ Invalid eventId for loadEvent');
            return null;
        }

        // Try Firebase first if available
        if (this.firebaseAPI) {
            try {
                let eventData = await this.firebaseAPI.loadEvent(eventId);
                if (eventData) {
                    console.log('✅ Event loaded from Firebase');
                    // Migrate legacy data if needed
                    eventData = this.migrateLegacyEventData(eventData);
                    // Cache in localStorage for offline access
                    this.saveToLocalStorage(`event_${eventId}`, eventData);
                    return eventData;
                }
            } catch (error) {
                // Requirements: 15.5 - Log Firebase errors with context
                console.error('❌ Firebase operation failed: loadEvent', {
                    operation: 'loadEvent',
                    eventId: eventId,
                    error: error.message,
                    errorCode: error.code,
                    stack: error.stack
                });
            }
        }

        // Fallback to localStorage
        console.log('📦 Attempting to load from localStorage');
        let localData = this.loadFromLocalStorage(`event_${eventId}`);
        if (localData) {
            console.log('✅ Event loaded from localStorage');
            // Migrate legacy data if needed
            localData = this.migrateLegacyEventData(localData);
            return localData;
        }

        console.log('⚠️ Event not found in Firebase or localStorage');
        return null;
    }

    /**
     * Update participant in event
     * Requirements: 11.4, 14.3
     * 
     * @param {string} eventId - Unique event identifier
     * @param {Object} participant - Participant data object
     * @param {string} participant.id - Participant ID
     * @param {string} participant.name - Participant name
     * @param {string} participant.avatar - Participant avatar emoji
     * @param {number} participant.score - Participant score
     * @param {Object} participant.answers - Answer map {questionIndex: answer}
     * @param {string} participant.createdAt - ISO 8601 timestamp
     * @returns {Promise<boolean>} Success status
     */
    async updateParticipant(eventId, participant) {
        console.log('🔄 DataManager.updateParticipant called:', eventId, participant?.name);
        
        if (!eventId || !participant || !participant.id) {
            console.error('❌ Invalid parameters for updateParticipant');
            return false;
        }

        // Update in localStorage first
        const eventData = await this.loadEvent(eventId);
        if (eventData) {
            const participants = eventData.participants || [];
            const existingIndex = participants.findIndex(p => p.id === participant.id);
            
            if (existingIndex >= 0) {
                participants[existingIndex] = participant;
            } else {
                participants.push(participant);
            }
            
            eventData.participants = participants;
            this.saveToLocalStorage(`event_${eventId}`, eventData);
        }

        // Try Firebase if available and online
        if (this.firebaseAPI && this.isOnline) {
            try {
                const success = await this.firebaseAPI.updateParticipant(eventId, participant);
                if (success) {
                    console.log('✅ Participant updated in Firebase successfully');
                    return true;
                } else {
                    console.warn('⚠️ Firebase update failed, queuing for sync');
                    this.addToSyncQueue({
                        type: 'updateParticipant',
                        eventId,
                        data: participant
                    });
                    return true; // Still return true since we have localStorage
                }
            } catch (error) {
                // Requirements: 15.5 - Log Firebase errors with context
                console.error('❌ Firebase operation failed: updateParticipant', {
                    operation: 'updateParticipant',
                    eventId: eventId,
                    participantId: participant.id,
                    error: error.message,
                    errorCode: error.code,
                    stack: error.stack
                });
                console.log('📦 Queuing for sync');
                this.addToSyncQueue({
                    type: 'updateParticipant',
                    eventId,
                    data: participant
                });
                return true; // Still return true since we have localStorage
            }
        } else {
            if (!this.isOnline) {
                console.log('📴 Offline - queuing for sync');
                this.addToSyncQueue({
                    type: 'updateParticipant',
                    eventId,
                    data: participant
                });
            } else {
                console.log('📦 Firebase not available, using localStorage only');
            }
            return true;
        }
    }

    /**
     * Load events by creator ID
     * Requirements: 4.1, 4.5, 13.2, 13.3
     * 
     * @param {string} userId - Creator's user ID
     * @returns {Promise<Array<Object>>} Array of events created by the user
     */
    async loadEventsByCreator(userId) {
        console.log('📚 DataManager.loadEventsByCreator called:', userId);
        
        if (!userId) {
            console.error('❌ Invalid userId for loadEventsByCreator');
            return [];
        }

        // Try Firebase first if available
        if (this.firebaseAPI) {
            try {
                let events = await this.firebaseAPI.loadEventsByCreator(userId);
                if (events && events.length > 0) {
                    console.log(`✅ Loaded ${events.length} events from Firebase`);
                    // Migrate legacy data for each event
                    events = events.map(event => this.migrateLegacyEventData(event));
                    // Cache in localStorage
                    this.saveToLocalStorage(`events_${userId}`, events);
                    return events;
                }
            } catch (error) {
                // Requirements: 15.5 - Log Firebase errors with context
                console.error('❌ Firebase operation failed: loadEventsByCreator', {
                    operation: 'loadEventsByCreator',
                    userId: userId,
                    error: error.message,
                    errorCode: error.code,
                    stack: error.stack
                });
            }
        }

        // Fallback to localStorage
        console.log('📦 Attempting to load events from localStorage');
        let localEvents = this.loadFromLocalStorage(`events_${userId}`);
        if (localEvents && Array.isArray(localEvents)) {
            console.log(`✅ Loaded ${localEvents.length} events from localStorage`);
            // Migrate legacy data for each event
            localEvents = localEvents.map(event => this.migrateLegacyEventData(event));
            return localEvents;
        }

        console.log('⚠️ No events found for user');
        return [];
    }

    /**
     * Delete event from Firebase and localStorage
     * Requirements: 11.3
     * 
     * @param {string} eventId - Unique event identifier
     * @returns {Promise<boolean>} Success status
     */
    async deleteEvent(eventId) {
        console.log('🗑️ DataManager.deleteEvent called:', eventId);
        
        if (!eventId) {
            console.error('❌ Invalid eventId for deleteEvent');
            return false;
        }

        let firebaseSuccess = false;

        // Try Firebase if available and online
        if (this.firebaseAPI && this.isOnline) {
            if (this.firebaseAPI.deleteEvent) {
                try {
                    firebaseSuccess = await this.firebaseAPI.deleteEvent(eventId);
                    if (firebaseSuccess) {
                        console.log('✅ Event deleted from Firebase successfully');
                    } else {
                        console.warn('⚠️ Firebase delete failed, queuing for sync');
                        this.addToSyncQueue({
                            type: 'deleteEvent',
                            eventId,
                            data: null
                        });
                    }
                } catch (error) {
                    // Requirements: 15.5 - Log Firebase errors with context
                    console.error('❌ Firebase operation failed: deleteEvent', {
                        operation: 'deleteEvent',
                        eventId: eventId,
                        error: error.message,
                        errorCode: error.code,
                        stack: error.stack
                    });
                    this.addToSyncQueue({
                        type: 'deleteEvent',
                        eventId,
                        data: null
                    });
                }
            } else {
                // If deleteEvent method doesn't exist, implement it using REST API
                try {
                    const url = `https://privilegespectrum-default-rtdb.europe-west1.firebasedatabase.app/events/${eventId}.json`;
                    const response = await fetch(url, {
                        method: 'DELETE'
                    });
                    firebaseSuccess = response.ok;
                    if (firebaseSuccess) {
                        console.log('✅ Event deleted from Firebase successfully');
                    } else {
                        console.warn('⚠️ Firebase delete failed, queuing for sync');
                        this.addToSyncQueue({
                            type: 'deleteEvent',
                            eventId,
                            data: null
                        });
                    }
                } catch (error) {
                    // Requirements: 15.5 - Log Firebase errors with context
                    console.error('❌ Firebase operation failed: deleteEvent (REST API)', {
                        operation: 'DELETE',
                        eventId: eventId,
                        error: error.message,
                        errorCode: error.code,
                        stack: error.stack
                    });
                    this.addToSyncQueue({
                        type: 'deleteEvent',
                        eventId,
                        data: null
                    });
                }
            }
        } else if (!this.isOnline) {
            console.log('📴 Offline - queuing delete for sync');
            this.addToSyncQueue({
                type: 'deleteEvent',
                eventId,
                data: null
            });
        }

        // Delete from localStorage
        try {
            localStorage.removeItem(`event_${eventId}`);
            console.log('✅ Event deleted from localStorage');
        } catch (error) {
            console.error('❌ localStorage delete error:', error);
        }

        return firebaseSuccess || true; // Return true if either succeeded
    }

    /**
     * Save data to localStorage
     * Requirements: 14.1, 14.2
     * 
     * @param {string} key - Storage key
     * @param {*} data - Data to store (will be JSON stringified)
     */
    saveToLocalStorage(key, data) {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(key, jsonData);
            console.log(`💾 Saved to localStorage: ${key}`);
        } catch (error) {
            console.error(`❌ Failed to save to localStorage (${key}):`, error);
        }
    }

    /**
     * Load data from localStorage
     * Requirements: 14.1, 14.2
     * 
     * @param {string} key - Storage key
     * @returns {*|null} Parsed data or null if not found/invalid
     */
    loadFromLocalStorage(key) {
        try {
            const jsonData = localStorage.getItem(key);
            if (jsonData) {
                return JSON.parse(jsonData);
            }
        } catch (error) {
            console.error(`❌ Failed to load from localStorage (${key}):`, error);
        }
        return null;
    }

    /**
     * Sync localStorage data to Firebase
     * Requirements: 14.5
     * 
     * @param {string} eventId - Event ID to sync
     * @returns {Promise<boolean>} Success status
     */
    async syncToFirebase(eventId) {
        console.log('🔄 DataManager.syncToFirebase called:', eventId);
        
        if (!this.firebaseAPI) {
            console.warn('⚠️ Firebase not available, cannot sync');
            return false;
        }

        // Load from localStorage
        const eventData = this.loadFromLocalStorage(`event_${eventId}`);
        if (!eventData) {
            console.warn('⚠️ No local data to sync');
            return false;
        }

        // Save to Firebase
        try {
            const success = await this.firebaseAPI.saveEvent(eventId, eventData);
            if (success) {
                console.log('✅ Successfully synced to Firebase');
                return true;
            } else {
                console.error('❌ Failed to sync to Firebase');
                return false;
            }
        } catch (error) {
            // Requirements: 15.5 - Log Firebase errors with context
            console.error('❌ Firebase operation failed: syncToFirebase', {
                operation: 'saveEvent',
                eventId: eventId,
                error: error.message,
                errorCode: error.code,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Get sync queue status
     * Requirements: 14.2
     * 
     * @returns {Object} Sync queue status
     */
    getSyncQueueStatus() {
        return {
            queueLength: this.syncQueue.length,
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            operations: this.syncQueue.map(op => ({
                type: op.type,
                eventId: op.eventId,
                timestamp: op.timestamp
            }))
        };
    }

    /**
     * Manually trigger sync queue processing
     * Requirements: 14.4, 14.5
     * 
     * @returns {Promise<void>}
     */
    async manualSync() {
        console.log('🔄 Manual sync triggered');
        await this.processSyncQueue();
    }
}

// Create singleton instance
const dataManager = new DataManager();

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    window.DataManager = dataManager;
    
    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            dataManager.initialize();
        });
    } else {
        dataManager.initialize();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}
