/**
 * Quota Configuration Module
 * 
 * This file centralizes all quota-related constants for the event creation limit feature.
 * It provides a single source of truth for quota limits and makes it easy to modify
 * quota values for future tiered licensing plans.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

/**
 * QUOTA LIMITS
 * 
 * These constants define the maximum number of events that users can create
 * based on their tier/plan. Currently, only FREE_TIER_LIMIT is used.
 */
export const QUOTA_CONFIG = {
  /**
   * Free tier event creation limit
   * This is the current default limit applied to all users
   * 
   * To modify: Change this value and redeploy the application
   * Note: You must also update the Firebase Security Rules to match
   */
  FREE_TIER_LIMIT: 3,

  /**
   * Pro tier event creation limit (future use)
   * This will be used when tiered licensing is implemented
   */
  PRO_TIER_LIMIT: 25,

  /**
   * Enterprise tier event creation limit (future use)
   * This will be used when tiered licensing is implemented
   */
  ENTERPRISE_TIER_LIMIT: 100,

  /**
   * Default limit used as fallback
   * This should match FREE_TIER_LIMIT
   */
  DEFAULT_LIMIT: 3
};

/**
 * HOW TO MODIFY THE QUOTA LIMIT
 * ==============================
 * 
 * To change the event creation limit for all users:
 * 
 * 1. Update the FREE_TIER_LIMIT constant above (e.g., change 3 to 5)
 * 
 * 2. Update the Firebase Security Rules in firebase-security-rules.json:
 *    - Find the line: "numChildren() < 3"
 *    - Change the number to match your new limit
 * 
 * 3. Update the quota limit in app/quota-manager.js:
 *    - Import this config: import { QUOTA_CONFIG } from '../config/quota-config.js';
 *    - Replace hardcoded "3" with QUOTA_CONFIG.FREE_TIER_LIMIT
 * 
 * 4. Deploy the changes:
 *    - Deploy Security Rules: firebase deploy --only database:rules
 *    - Deploy the application code
 * 
 * 5. Test thoroughly:
 *    - Verify users can create up to the new limit
 *    - Verify creation is blocked at the new limit
 *    - Verify quota display shows correct numbers
 * 
 * IMPORTANT: Security Rules and client code must use the same limit value!
 */

/**
 * MIGRATION PATH FOR PER-USER QUOTAS (TIERED LICENSING)
 * ======================================================
 * 
 * When implementing tiered licensing with different quota limits per user:
 * 
 * STEP 1: Add User Quota Field to Database
 * -----------------------------------------
 * Add a quota field to each user's record:
 * 
 * /users/{userId}/
 *   quota: number  // User-specific quota limit (3, 25, or 100)
 *   tier: string   // "free", "pro", or "enterprise"
 * 
 * 
 * STEP 2: Update Firebase Security Rules
 * ---------------------------------------
 * Modify firebase-security-rules.json to read per-user quota:
 * 
 * ".write": "(auth != null && (
 *   (!data.exists() && 
 *    root.child('events')
 *      .orderByChild('creatorId')
 *      .equalTo(auth.uid)
 *      .once('value')
 *      .numChildren() < root.child('users').child(auth.uid).child('quota').val()) ||
 *   (data.exists() && 
 *    data.child('creatorId').val() === auth.uid)
 * ))"
 * 
 * Add validation rules for the quota field:
 * 
 * "users": {
 *   "$userId": {
 *     "quota": {
 *       ".read": "auth.uid === $userId",
 *       ".write": false,  // Only admins can modify quotas via Admin SDK
 *       ".validate": "newData.isNumber() && newData.val() >= 0"
 *     },
 *     "tier": {
 *       ".read": "auth.uid === $userId",
 *       ".write": false,  // Only admins can modify tier via Admin SDK
 *       ".validate": "newData.isString() && 
 *                     (newData.val() === 'free' || 
 *                      newData.val() === 'pro' || 
 *                      newData.val() === 'enterprise')"
 *     }
 *   }
 * }
 * 
 * 
 * STEP 3: Update QuotaStateManager
 * ---------------------------------
 * Modify app/quota-manager.js to fetch user-specific quota:
 * 
 * async fetchUserQuota(userId) {
 *   try {
 *     const userRef = firebase.database().ref(`users/${userId}/quota`);
 *     const snapshot = await userRef.once('value');
 *     const quota = snapshot.val();
 *     
 *     // Use user's quota if set, otherwise default to FREE_TIER_LIMIT
 *     return quota !== null ? quota : QUOTA_CONFIG.FREE_TIER_LIMIT;
 *   } catch (error) {
 *     console.error('Failed to fetch user quota:', error);
 *     return QUOTA_CONFIG.DEFAULT_LIMIT;
 *   }
 * }
 * 
 * async updateState() {
 *   const [eventCount, quotaLimit] = await Promise.all([
 *     this.getUserEventCount(),
 *     this.fetchUserQuota(this.state.userId)
 *   ]);
 *   
 *   this.state = {
 *     userId: this.state.userId,
 *     eventCount,
 *     quotaLimit,  // Now dynamic instead of hardcoded 3
 *     remainingQuota: Math.max(0, quotaLimit - eventCount),
 *     isAtLimit: eventCount >= quotaLimit,
 *     lastUpdated: Date.now()
 *   };
 *   
 *   this.notifyListeners();
 * }
 * 
 * 
 * STEP 4: Migrate Existing Users
 * -------------------------------
 * Create a migration script to add quota field to existing users:
 * 
 * const admin = require('firebase-admin');
 * admin.initializeApp();
 * 
 * async function migrateUsers() {
 *   const usersRef = admin.database().ref('users');
 *   const snapshot = await usersRef.once('value');
 *   
 *   const updates = {};
 *   snapshot.forEach((child) => {
 *     const userId = child.key;
 *     const userData = child.val();
 *     
 *     // Set default quota if not already set
 *     if (!userData.quota) {
 *       updates[`${userId}/quota`] = QUOTA_CONFIG.FREE_TIER_LIMIT;
 *       updates[`${userId}/tier`] = 'free';
 *     }
 *   });
 *   
 *   await usersRef.update(updates);
 *   console.log(`Migrated ${Object.keys(updates).length / 2} users`);
 * }
 * 
 * 
 * STEP 5: Implement Admin Interface
 * ----------------------------------
 * Create admin functions to manage user quotas:
 * 
 * async function setUserQuota(userId, tier) {
 *   const quotaMap = {
 *     'free': QUOTA_CONFIG.FREE_TIER_LIMIT,
 *     'pro': QUOTA_CONFIG.PRO_TIER_LIMIT,
 *     'enterprise': QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT
 *   };
 *   
 *   const quota = quotaMap[tier] || QUOTA_CONFIG.DEFAULT_LIMIT;
 *   
 *   await admin.database().ref(`users/${userId}`).update({
 *     quota: quota,
 *     tier: tier
 *   });
 * }
 * 
 * 
 * STEP 6: Update UI Messages
 * ---------------------------
 * Modify quota banner and error messages to be tier-aware:
 * 
 * - Show different messages for free vs paid users
 * - Include upgrade prompts for free tier users
 * - Show tier-specific limits in quota display
 * 
 * 
 * BACKWARD COMPATIBILITY
 * ----------------------
 * The migration path maintains backward compatibility:
 * 
 * - Existing users get default quota of 3 (FREE_TIER_LIMIT)
 * - System works identically for free tier users
 * - No changes required to existing event data
 * - Security Rules remain secure throughout transition
 * - Client code gracefully falls back to default if quota not set
 * 
 * 
 * TESTING CHECKLIST
 * -----------------
 * Before deploying tiered licensing:
 * 
 * [ ] Test user with free tier quota (3 events)
 * [ ] Test user with pro tier quota (25 events)
 * [ ] Test user with enterprise tier quota (100 events)
 * [ ] Test user with no quota field (should default to 3)
 * [ ] Test quota enforcement in Security Rules
 * [ ] Test quota display updates correctly
 * [ ] Test banner shows tier-appropriate messages
 * [ ] Test concurrent creation with different quotas
 * [ ] Test quota changes when user upgrades tier
 * [ ] Test admin functions for setting quotas
 */

/**
 * Get quota limit for a specific tier
 * 
 * @param {string} tier - User tier: "free", "pro", or "enterprise"
 * @returns {number} Quota limit for the tier
 */
export function getQuotaForTier(tier) {
  switch (tier) {
    case 'free':
      return QUOTA_CONFIG.FREE_TIER_LIMIT;
    case 'pro':
      return QUOTA_CONFIG.PRO_TIER_LIMIT;
    case 'enterprise':
      return QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT;
    default:
      return QUOTA_CONFIG.DEFAULT_LIMIT;
  }
}

/**
 * Get tier name for a quota limit
 * 
 * @param {number} quota - Quota limit
 * @returns {string} Tier name: "free", "pro", "enterprise", or "custom"
 */
export function getTierForQuota(quota) {
  if (quota === QUOTA_CONFIG.FREE_TIER_LIMIT) return 'free';
  if (quota === QUOTA_CONFIG.PRO_TIER_LIMIT) return 'pro';
  if (quota === QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT) return 'enterprise';
  return 'custom';
}

// Make available globally for non-module environments
if (typeof window !== 'undefined') {
  window.QUOTA_CONFIG = QUOTA_CONFIG;
  window.getQuotaForTier = getQuotaForTier;
  window.getTierForQuota = getTierForQuota;
}

console.log('📋 Quota configuration module loaded');
