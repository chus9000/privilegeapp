/**
 * Quota State Manager Module
 * Manages client-side quota tracking with real-time updates
 * Requirements: 3.1, 3.2, 3.3, 3.4, 7.5
 */

class QuotaStateManager {
    constructor() {
        this.state = {
            userId: null,
            eventCount: 0,
            quotaLimit: 3,
            remainingQuota: 3,
            isAtLimit: false,
            lastUpdated: 0
        };
        this.listeners = [];
        this.realTimeListener = null;
        this.firebaseAPI = null;
    }

    /**
     * Initialize quota manager with user ID and set up real-time updates
     * Requirements: 3.1, 3.3, 7.5
     * 
     * @param {string} userId - Firebase Auth UID
     * @returns {Promise<void>}
     */
    async initialize(userId) {
        console.log('📊 QuotaStateManager.initialize called:', userId);
        
        if (!userId) {
            console.error('❌ Invalid userId for QuotaStateManager');
            return;
        }

        this.state.userId = userId;

        // Get Firebase API reference
        if (typeof window !== 'undefined' && window.FirebaseAPI) {
            this.firebaseAPI = window.FirebaseAPI;
        } else {
            console.warn('⚠️ FirebaseAPI not available');
        }

        // Fetch initial event count
        await this.updateState();

        // Set up real-time listener for quota changes
        this.setupRealTimeListener();

        console.log('✅ QuotaStateManager initialized');
    }

    /**
     * Get current event count for user
     * Requirements: 3.4, 8.3
     * 
     * @returns {Promise<number>} Number of events created by user
     */
    async getUserEventCount() {
        console.log('📊 QuotaStateManager.getUserEventCount called');
        
        if (!this.state.userId) {
            console.error('❌ No userId set in QuotaStateManager');
            return 0;
        }

        try {
            // Use FirebaseAPI to load events by creator
            if (this.firebaseAPI) {
                const events = await this.firebaseAPI.loadEventsByCreator(this.state.userId);
                
                // Handle malformed data: filter out events with missing or invalid creatorId
                // Requirement 8.3: Gracefully handle events lacking proper creator fields
                if (!events) {
                    console.log('✅ User has 0 events');
                    return 0;
                }
                
                // Count only valid events with proper creatorId
                const validEvents = events.filter(event => {
                    if (!event) {
                        console.warn('⚠️ Skipping null/undefined event in count');
                        return false;
                    }
                    
                    if (!event.creatorId) {
                        console.warn('⚠️ Skipping event with missing creatorId:', event);
                        return false;
                    }
                    
                    if (event.creatorId !== this.state.userId) {
                        console.warn('⚠️ Skipping event with mismatched creatorId:', event.creatorId);
                        return false;
                    }
                    
                    return true;
                });
                
                const count = validEvents.length;
                const skippedCount = events.length - count;
                
                if (skippedCount > 0) {
                    console.warn(`⚠️ Skipped ${skippedCount} malformed event(s) in quota count`);
                }
                
                console.log(`✅ User has ${count} valid events (${skippedCount} malformed events excluded)`);
                return count;
            } else {
                console.warn('⚠️ FirebaseAPI not available, returning 0');
                return 0;
            }
        } catch (error) {
            console.error('❌ Failed to get user event count:', error);
            return 0;
        }
    }

    /**
     * Calculate remaining quota
     * Requirements: 3.2
     * 
     * @returns {number} Number of events user can still create (0-3)
     */
    getRemainingQuota() {
        const remaining = Math.max(0, this.state.quotaLimit - this.state.eventCount);
        console.log(`📊 Remaining quota: ${remaining}`);
        return remaining;
    }

    /**
     * Update quota state with current event count
     * Requirements: 3.1, 3.2, 3.3
     * 
     * @returns {Promise<void>}
     */
    async updateState() {
        console.log('🔄 QuotaStateManager.updateState called');
        
        if (!this.state.userId) {
            console.error('❌ No userId set in QuotaStateManager');
            return;
        }

        const eventCount = await this.getUserEventCount();

        this.state = {
            userId: this.state.userId,
            eventCount,
            quotaLimit: 3,
            remainingQuota: Math.max(0, 3 - eventCount),
            isAtLimit: eventCount >= 3,
            lastUpdated: Date.now()
        };

        console.log('✅ Quota state updated:', this.state);

        // Notify all subscribers
        this.notifyListeners();
    }

    /**
     * Set up real-time listener for quota changes
     * Requirements: 3.3
     * 
     * @returns {void}
     */
    setupRealTimeListener() {
        console.log('👂 Setting up real-time listener for quota changes');
        
        if (!this.firebaseAPI || !this.state.userId) {
            console.warn('⚠️ Cannot set up real-time listener: missing FirebaseAPI or userId');
            return;
        }

        // Clean up existing listener if any
        if (this.realTimeListener) {
            this.cleanup();
        }

        try {
            // Set up Firebase real-time listener on events node
            // Listen for changes to events where creatorId matches current user
            const eventsRef = firebase.database().ref('events');
            const userEventsQuery = eventsRef.orderByChild('creatorId').equalTo(this.state.userId);

            // Listen for value changes
            const listener = userEventsQuery.on('value', (snapshot) => {
                console.log('🔔 Real-time update: events changed');
                
                // Count valid events, handling malformed data gracefully
                // Requirement 8.3: Gracefully handle events lacking proper creator fields
                let validEventCount = 0;
                let malformedCount = 0;
                
                snapshot.forEach((childSnapshot) => {
                    const event = childSnapshot.val();
                    
                    // Validate event has proper creatorId
                    if (!event) {
                        console.warn('⚠️ Skipping null/undefined event in real-time count');
                        malformedCount++;
                        return;
                    }
                    
                    if (!event.creatorId) {
                        console.warn('⚠️ Skipping event with missing creatorId in real-time count');
                        malformedCount++;
                        return;
                    }
                    
                    if (event.creatorId !== this.state.userId) {
                        console.warn('⚠️ Skipping event with mismatched creatorId in real-time count');
                        malformedCount++;
                        return;
                    }
                    
                    validEventCount++;
                });
                
                if (malformedCount > 0) {
                    console.warn(`⚠️ Excluded ${malformedCount} malformed event(s) from real-time quota count`);
                }
                
                this.state = {
                    userId: this.state.userId,
                    eventCount: validEventCount,
                    quotaLimit: 3,
                    remainingQuota: Math.max(0, 3 - validEventCount),
                    isAtLimit: validEventCount >= 3,
                    lastUpdated: Date.now()
                };

                console.log('✅ Quota state updated from real-time listener:', this.state);

                // Notify all subscribers
                this.notifyListeners();
            });

            // Store cleanup function
            this.realTimeListener = () => {
                userEventsQuery.off('value', listener);
            };

            console.log('✅ Real-time listener set up successfully');
        } catch (error) {
            console.error('❌ Failed to set up real-time listener:', error);
        }
    }

    /**
     * Subscribe to quota state changes
     * Requirements: 3.3
     * 
     * @param {Function} callback - Callback function to be called when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        if (typeof callback !== 'function') {
            console.error('❌ Subscribe callback must be a function');
            return () => {};
        }

        this.listeners.push(callback);
        console.log(`📋 Subscriber added (total: ${this.listeners.length})`);

        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
            console.log(`📋 Subscriber removed (total: ${this.listeners.length})`);
        };
    }

    /**
     * Notify all subscribers of state changes
     * Requirements: 3.3
     * 
     * @private
     */
    notifyListeners() {
        console.log(`📢 Notifying ${this.listeners.length} subscribers`);
        
        this.listeners.forEach(callback => {
            try {
                callback(this.state);
            } catch (error) {
                console.error('❌ Error in subscriber callback:', error);
            }
        });
    }

    /**
     * Get current quota state
     * 
     * @returns {Object} Current quota state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Clean up listeners when component unmounts
     * Requirements: 3.3
     * 
     * @returns {void}
     */
    cleanup() {
        console.log('🧹 Cleaning up QuotaStateManager');
        
        // Remove real-time listener
        if (this.realTimeListener) {
            this.realTimeListener();
            this.realTimeListener = null;
            console.log('✅ Real-time listener removed');
        }

        // Clear all subscribers
        this.listeners = [];
        console.log('✅ All subscribers cleared');
    }
}

// Create singleton instance
const quotaStateManager = new QuotaStateManager();

// Make available globally
if (typeof window !== 'undefined') {
    window.QuotaStateManager = quotaStateManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuotaStateManager;
}

console.log('📊 Quota State Manager module loaded');
