/**
 * Authentication Manager
 * Handles Google OAuth authentication using Firebase Authentication
 * Requirements: 3.1, 3.2, 11.2
 */

class AuthManager {
    constructor() {
        this.auth = null;              // Firebase Auth instance
        this.googleProvider = null;     // Google Auth Provider
        this.currentUser = null;
        this.authStateListeners = [];
        this.initialized = false;
    }

    /**
     * Initialize Firebase Auth with Google provider
     * Requirements: 8.1, 8.4
     */
    async initialize() {
        if (this.initialized) {
            console.log('[Auth] AuthManager already initialized');
            return;
        }

        try {
            console.log('[Auth] Initializing AuthManager...');
            
            // Initialize Firebase App with config from firebase-config.js
            // Requirements: 8.1 - Initialize Firebase Auth SDK using configuration
            if (!firebase.apps.length) {
                firebase.initializeApp(window.FIREBASE_CONFIG);
                console.log('✅ Firebase App initialized');
            }
            
            // Get Firebase Auth instance
            this.auth = firebase.auth();
            console.log('✅ Firebase Auth instance created');
            
            // Create Google Auth Provider
            // Requirements: 8.1 - Create GoogleAuthProvider instance
            this.googleProvider = new firebase.auth.GoogleAuthProvider();
            console.log('✅ Google Auth Provider created');
            
            // Create a promise that resolves when the first auth state change fires AND completes
            let isFirstAuthStateChange = true;
            const authStateReady = new Promise((resolve) => {
                // Set up onAuthStateChanged listener
                // Requirements: 8.4 - Use Firebase Auth's onAuthStateChanged listener
                this.auth.onAuthStateChanged(async (user) => {
                    console.log('[Auth] Auth state changed:', user ? user.email : 'signed out');
                    console.log('[Debug] onAuthStateChanged callback - user object:', user ? 'EXISTS' : 'NULL');
                    
                    if (user) {
                        // User is signed in - fetch token and expiration
                        try {
                            console.log('[Debug] Fetching ID token...');
                            const idToken = await user.getIdToken();
                            console.log('[Debug] ID token fetched, length:', idToken.length);
                            
                            const tokenResult = await user.getIdTokenResult();
                            const expiresAt = new Date(tokenResult.expirationTime).getTime();
                            console.log('[Debug] Token expires at:', new Date(expiresAt).toISOString());
                            
                            this.currentUser = {
                                uid: user.uid,
                                email: user.email,
                                displayName: user.displayName,
                                photoURL: user.photoURL,
                                idToken: idToken,
                                refreshToken: user.refreshToken,
                                expiresAt: expiresAt
                            };
                            
                            console.log('[Debug] Setting this.currentUser:', this.currentUser.email);
                            
                            // Store in localStorage for session persistence
                            localStorage.setItem('firebase_auth_user', JSON.stringify(this.currentUser));
                            console.log('✅ User session stored:', this.currentUser.email);
                        } catch (error) {
                            console.error('❌ Error fetching token in onAuthStateChanged:', error);
                            // Store basic user info without token
                            this.currentUser = {
                                uid: user.uid,
                                email: user.email,
                                displayName: user.displayName,
                                photoURL: user.photoURL
                            };
                        }
                    } else {
                        // User is signed out
                        console.log('[Debug] User signed out, clearing currentUser');
                        this.currentUser = null;
                        localStorage.removeItem('firebase_auth_user');
                        console.log('✅ User session cleared');
                    }
                    
                    // Notify all listeners
                    this.notifyAuthStateListeners(this.currentUser);
                    
                    // Resolve the promise only on the FIRST auth state change AFTER async work completes
                    if (isFirstAuthStateChange) {
                        isFirstAuthStateChange = false;
                        console.log('[Debug] First auth state change complete, resolving promise');
                        resolve();
                    }
                });
            });
            
            // Wait for the first auth state change to complete
            console.log('[Debug] Waiting for initial auth state...');
            await authStateReady;
            console.log('[Debug] Initial auth state ready');
            
            this.initialized = true;
            console.log('✅ AuthManager initialized with Firebase Auth SDK');
        } catch (error) {
            // Requirements: 15.1, 15.5 - Log auth errors with context
            console.error('❌ Authentication operation failed: initialize', {
                operation: 'initialize',
                error: error.message,
                errorCode: error.code,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Trigger Google sign-in flow using Firebase signInWithPopup
     * Requirements: 1.1, 1.2, 8.2
     */
    async signInWithGoogle() {
        try {
            console.log('[Auth] Starting Google sign-in flow with popup...');
            
            if (!this.initialized) {
                throw new Error('AuthManager not initialized. Call initialize() first.');
            }
            
            // Requirements: 8.2 - Use Firebase signInWithPopup with GoogleAuthProvider
            const result = await this.auth.signInWithPopup(this.googleProvider);
            
            console.log('✅ Sign-in successful:', result.user.email);
            
            // The onAuthStateChanged listener will handle storing the user
            // Just return success
            return result.user;
            
        } catch (error) {
            // Requirements: 7.2 - Log authentication failures
            console.error('❌ Authentication operation failed: signInWithGoogle', {
                operation: 'signInWithGoogle',
                error: error.message,
                errorCode: error.code,
                timestamp: Date.now()
            });
            
            // Requirements: 6.1, 6.3 - Handle error cases
            if (error.code === 'auth/popup-closed-by-user') {
                throw new Error('Sign-in cancelled. Please try again.');
            } else if (error.code === 'auth/network-request-failed') {
                // Requirements: 6.1 - Network error with specific message
                throw new Error('Network error. Please check your connection and try again.');
            } else if (error.code === 'auth/popup-blocked') {
                throw new Error('Popup was blocked. Please allow popups for this site.');
            } else {
                // Requirements: 6.3 - Unknown error with generic message
                throw new Error('Authentication failed. Please try again.');
            }
        }
    }

    /**
     * Sign out current user using Firebase Auth
     * Requirements: 4.5, 8.3
     */
    async signOut() {
        try {
            console.log('[Auth] Signing out user...');
            
            if (!this.initialized) {
                throw new Error('AuthManager not initialized');
            }
            
            // Requirements: 8.3 - Call Firebase auth.signOut()
            await this.auth.signOut();
            
            // Requirements: 4.5 - Clear localStorage and memory
            this.currentUser = null;
            localStorage.removeItem('firebase_auth_user');
            
            console.log('✅ Sign out successful');
            
            // Notify listeners
            this.notifyAuthStateListeners(null);
            
            return true;
        } catch (error) {
            // Requirements: 15.1, 15.5 - Log auth errors with context
            console.error('❌ Authentication operation failed: signOut', {
                operation: 'signOut',
                error: error.message,
                errorCode: error.code,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get current authenticated user
     */
    getCurrentUser() {
        console.log('[Debug] getCurrentUser() called, this.currentUser:', this.currentUser ? this.currentUser.email : 'NULL');
        return this.currentUser;
    }

    /**
     * Check if user is authenticated with valid token
     * Requirements: 4.1 - Validate token expiration
     */
    isAuthenticated() {
        if (!this.currentUser) {
            return false;
        }
        
        // Requirements: 4.1 - Verify ID token is valid and not expired
        if (this.currentUser.expiresAt && Date.now() >= this.currentUser.expiresAt) {
            console.log('⚠️ Auth token expired');
            return false;
        }
        
        return true;
    }

    /**
     * Listen for auth state changes
     * @param {Function} callback - Called when auth state changes
     * @returns {Function} Unsubscribe function
     */
    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        
        // Immediately call with current state
        callback(this.currentUser);
        
        // Return unsubscribe function
        return () => {
            this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Get user ID token for API calls with automatic refresh
     * Requirements: 1.5, 4.2, 4.3, 8.5
     * @param {boolean} forceRefresh - Force token refresh even if not expired
     */
    async getIdToken(forceRefresh = false) {
        if (!this.currentUser) {
            throw new Error('No authenticated user');
        }
        
        if (!this.auth.currentUser) {
            throw new Error('Firebase user not available');
        }
        
        try {
            // Requirements: 8.5 - Use Firebase user.getIdToken(forceRefresh)
            // Requirements: 4.2 - Attempt to refresh token when expired
            const needsRefresh = forceRefresh || (this.currentUser.expiresAt && Date.now() >= this.currentUser.expiresAt);
            
            if (needsRefresh) {
                console.log('[Auth] Refreshing ID token...');
                
                // Requirements: 7.4 - Log token refresh event
                console.log('✅ Token refresh initiated:', {
                    operation: 'getIdToken',
                    timestamp: Date.now(),
                    forceRefresh: forceRefresh
                });
            }
            
            // Get fresh token from Firebase
            const idToken = await this.auth.currentUser.getIdToken(needsRefresh);
            
            // Update stored token and expiration
            const tokenResult = await this.auth.currentUser.getIdTokenResult();
            const expiresAt = new Date(tokenResult.expirationTime).getTime();
            
            this.currentUser.idToken = idToken;
            this.currentUser.expiresAt = expiresAt;
            
            // Update localStorage
            localStorage.setItem('firebase_auth_user', JSON.stringify(this.currentUser));
            
            if (needsRefresh) {
                console.log('✅ Token refreshed successfully');
            }
            
            return idToken;
            
        } catch (error) {
            // Requirements: 4.3 - Clear session if refresh fails
            console.error('❌ Token refresh failed:', {
                operation: 'getIdToken',
                error: error.message,
                errorCode: error.code,
                timestamp: Date.now()
            });
            
            // Clear session on refresh failure
            console.log('[Auth] Clearing session due to refresh failure...');
            await this.signOut();
            
            throw new Error('Token refresh failed. Please sign in again.');
        }
    }

    /**
     * Notify all auth state listeners
     * @private
     */
    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('❌ Auth state listener error:', error);
            }
        });
    }

    /**
     * Check and handle session expiration
     */
    checkSessionExpiration() {
        if (this.currentUser && this.currentUser.expiresAt) {
            if (Date.now() > this.currentUser.expiresAt) {
                console.log('⚠️ Session expired, signing out...');
                this.signOut();
                return true;
            }
        }
        return false;
    }
}

// Create singleton instance
const authManager = new AuthManager();

// Export for use in other modules
window.AuthManager = authManager;

console.log('[Auth] AuthManager module loaded');
