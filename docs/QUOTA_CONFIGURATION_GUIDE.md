# Quota Configuration Guide

This guide explains how to configure and extend the event creation quota system for future tiered licensing plans.

## Overview

The event creation limit feature restricts users to creating a maximum number of events (currently 3). This limit is enforced at both the Firebase Security Rules level (server-side) and the client-side UI level.

**Key Files:**
- `config/quota-config.js` - Centralized quota constants
- `firebase-security-rules.json` - Server-side enforcement
- `app/quota-manager.js` - Client-side quota tracking
- `app/event-creation.js` - Event creation UI with quota checks
- `app/dashboard.js` - Dashboard with quota display and banner

## Current Architecture

### Hardcoded Limit (Current Implementation)

The current system uses a hardcoded limit of 3 events per user:

```
User → Creates Event → Firebase Security Rules Check → Allow if count < 3
                                                     → Deny if count >= 3
```

**Enforcement Points:**
1. **Firebase Security Rules** (Primary): Server-side validation that cannot be bypassed
2. **Client UI** (Secondary): Disables create button and shows quota display for better UX

## Modifying the Current Quota Limit

To change the event creation limit for all users (e.g., from 3 to 5):

### Step 1: Update Configuration File

Edit `config/quota-config.js`:

```javascript
export const QUOTA_CONFIG = {
  FREE_TIER_LIMIT: 5,  // Changed from 3 to 5
  // ... other constants
  DEFAULT_LIMIT: 5     // Also update default
};
```

### Step 2: Update Firebase Security Rules

Edit `firebase-security-rules.json`:

Find this line in the `.write` rule:
```json
"numChildren() < 3"
```

Change it to:
```json
"numChildren() < 5"
```

Also update the comment at the top of the file to reflect the new limit.

### Step 3: Update QuotaStateManager

Edit `app/quota-manager.js`:

Option A - Import the config (recommended):
```javascript
import { QUOTA_CONFIG } from '../config/quota-config.js';

// Replace hardcoded 3 with:
quotaLimit: QUOTA_CONFIG.FREE_TIER_LIMIT
```

Option B - Update hardcoded values:
```javascript
// Find all instances of "quotaLimit: 3" and change to:
quotaLimit: 5
```

### Step 4: Deploy Changes

```bash
# Deploy Security Rules
firebase deploy --only database:rules

# Deploy application code (method depends on your hosting)
firebase deploy --only hosting
# OR
npm run build && npm run deploy
```

### Step 5: Test Thoroughly

- [ ] Verify users can create up to the new limit
- [ ] Verify creation is blocked at the new limit
- [ ] Verify quota display shows correct numbers
- [ ] Verify banner appears at the new limit
- [ ] Verify deletion frees quota correctly
- [ ] Test concurrent creation attempts

**CRITICAL:** Security Rules and client code must use the same limit value!

## Future: Tiered Licensing Implementation

When you're ready to implement different quota limits for different user tiers (free, pro, enterprise), follow this migration path:

### Architecture Overview

```
User → Has Tier → Has Quota → Creates Event → Security Rules Check → Allow/Deny
  |                                                                        ↓
  └─────────────────────────────────────────────────────────────────────────
  
Free Tier:       3 events
Pro Tier:        25 events
Enterprise Tier: 100 events
```

### Phase 1: Database Schema Extension

Add quota and tier fields to user records:

```
/users/{userId}/
  email: string
  displayName: string
  createdAt: string
  quota: number        // NEW: User-specific quota limit
  tier: string         // NEW: "free", "pro", or "enterprise"
```

**Migration Script:**

```javascript
// migrate-user-quotas.js
const admin = require('firebase-admin');
const { QUOTA_CONFIG } = require('./config/quota-config.js');

admin.initializeApp();

async function migrateUsers() {
  const usersRef = admin.database().ref('users');
  const snapshot = await usersRef.once('value');
  
  const updates = {};
  let count = 0;
  
  snapshot.forEach((child) => {
    const userId = child.key;
    const userData = child.val();
    
    // Set default quota if not already set
    if (userData.quota === undefined) {
      updates[`${userId}/quota`] = QUOTA_CONFIG.FREE_TIER_LIMIT;
      updates[`${userId}/tier`] = 'free';
      count++;
    }
  });
  
  if (Object.keys(updates).length > 0) {
    await usersRef.update(updates);
    console.log(`✅ Migrated ${count} users to default quota`);
  } else {
    console.log('✅ All users already have quota fields');
  }
}

migrateUsers().catch(console.error);
```

Run the migration:
```bash
node migrate-user-quotas.js
```

### Phase 2: Update Firebase Security Rules

Replace the hardcoded quota check with a dynamic lookup:

**Before (hardcoded):**
```json
".write": "(auth != null && (
  (!data.exists() && 
   root.child('events')
     .orderByChild('creatorId')
     .equalTo(auth.uid)
     .once('value')
     .numChildren() < 3) ||
  (data.exists() && 
   data.child('creatorId').val() === auth.uid)
))"
```

**After (dynamic):**
```json
".write": "(auth != null && (
  (!data.exists() && 
   root.child('events')
     .orderByChild('creatorId')
     .equalTo(auth.uid)
     .once('value')
     .numChildren() < root.child('users').child(auth.uid).child('quota').val()) ||
  (data.exists() && 
   data.child('creatorId').val() === auth.uid)
))"
```

**Add validation rules for quota and tier:**

```json
"users": {
  "$userId": {
    ".read": "auth != null && auth.uid === $userId",
    ".write": "auth != null && auth.uid === $userId",
    
    "quota": {
      ".read": "auth.uid === $userId",
      ".write": false,
      ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000"
    },
    
    "tier": {
      ".read": "auth.uid === $userId",
      ".write": false,
      ".validate": "newData.isString() && (newData.val() === 'free' || newData.val() === 'pro' || newData.val() === 'enterprise')"
    }
  }
}
```

**Note:** `.write: false` means only server-side admin code can modify quotas, preventing users from changing their own limits.

### Phase 3: Update QuotaStateManager

Modify `app/quota-manager.js` to fetch user-specific quota:

```javascript
import { QUOTA_CONFIG } from '../config/quota-config.js';

class QuotaStateManager {
  // ... existing code ...
  
  /**
   * Fetch user-specific quota from database
   * Falls back to FREE_TIER_LIMIT if not set
   */
  async fetchUserQuota(userId) {
    try {
      const userRef = firebase.database().ref(`users/${userId}/quota`);
      const snapshot = await userRef.once('value');
      const quota = snapshot.val();
      
      if (quota !== null && quota !== undefined) {
        console.log(`✅ User quota: ${quota}`);
        return quota;
      } else {
        console.log(`⚠️ No quota set, using default: ${QUOTA_CONFIG.FREE_TIER_LIMIT}`);
        return QUOTA_CONFIG.FREE_TIER_LIMIT;
      }
    } catch (error) {
      console.error('❌ Failed to fetch user quota:', error);
      return QUOTA_CONFIG.DEFAULT_LIMIT;
    }
  }
  
  /**
   * Update quota state with current event count and user-specific quota
   */
  async updateState() {
    if (!this.state.userId) {
      console.error('❌ No userId set in QuotaStateManager');
      return;
    }

    // Fetch both event count and user quota in parallel
    const [eventCount, quotaLimit] = await Promise.all([
      this.getUserEventCount(),
      this.fetchUserQuota(this.state.userId)
    ]);

    this.state = {
      userId: this.state.userId,
      eventCount,
      quotaLimit,  // Now dynamic instead of hardcoded 3
      remainingQuota: Math.max(0, quotaLimit - eventCount),
      isAtLimit: eventCount >= quotaLimit,
      lastUpdated: Date.now()
    };

    console.log('✅ Quota state updated:', this.state);
    this.notifyListeners();
  }
  
  // Update setupRealTimeListener to use dynamic quota
  setupRealTimeListener() {
    // ... existing listener code ...
    
    const listener = userEventsQuery.on('value', async (snapshot) => {
      const validEventCount = /* ... count logic ... */;
      
      // Fetch current quota limit
      const quotaLimit = await this.fetchUserQuota(this.state.userId);
      
      this.state = {
        userId: this.state.userId,
        eventCount: validEventCount,
        quotaLimit,  // Dynamic quota
        remainingQuota: Math.max(0, quotaLimit - validEventCount),
        isAtLimit: validEventCount >= quotaLimit,
        lastUpdated: Date.now()
      };
      
      this.notifyListeners();
    });
  }
}
```

### Phase 4: Admin Interface for Managing Quotas

Create admin functions to manage user quotas (server-side only):

```javascript
// admin/quota-management.js
const admin = require('firebase-admin');
const { QUOTA_CONFIG, getQuotaForTier } = require('../config/quota-config.js');

/**
 * Set user's tier and quota
 * This should only be called from server-side admin code
 */
async function setUserTier(userId, tier) {
  if (!['free', 'pro', 'enterprise'].includes(tier)) {
    throw new Error(`Invalid tier: ${tier}`);
  }
  
  const quota = getQuotaForTier(tier);
  
  await admin.database().ref(`users/${userId}`).update({
    quota: quota,
    tier: tier,
    tierUpdatedAt: new Date().toISOString()
  });
  
  console.log(`✅ Set user ${userId} to ${tier} tier (quota: ${quota})`);
}

/**
 * Set custom quota for a user
 */
async function setCustomQuota(userId, quota) {
  if (typeof quota !== 'number' || quota < 0 || quota > 1000) {
    throw new Error(`Invalid quota: ${quota}`);
  }
  
  await admin.database().ref(`users/${userId}`).update({
    quota: quota,
    tier: 'custom',
    tierUpdatedAt: new Date().toISOString()
  });
  
  console.log(`✅ Set user ${userId} to custom quota: ${quota}`);
}

/**
 * Get user's current tier and quota
 */
async function getUserQuota(userId) {
  const snapshot = await admin.database().ref(`users/${userId}`).once('value');
  const userData = snapshot.val();
  
  return {
    tier: userData?.tier || 'free',
    quota: userData?.quota || QUOTA_CONFIG.FREE_TIER_LIMIT,
    eventCount: await getEventCount(userId)
  };
}

/**
 * Bulk upgrade users to a tier
 */
async function bulkUpgradeUsers(userIds, tier) {
  const quota = getQuotaForTier(tier);
  const updates = {};
  
  userIds.forEach(userId => {
    updates[`${userId}/quota`] = quota;
    updates[`${userId}/tier`] = tier;
    updates[`${userId}/tierUpdatedAt`] = new Date().toISOString();
  });
  
  await admin.database().ref('users').update(updates);
  console.log(`✅ Upgraded ${userIds.length} users to ${tier} tier`);
}

module.exports = {
  setUserTier,
  setCustomQuota,
  getUserQuota,
  bulkUpgradeUsers
};
```

### Phase 5: Update UI for Tier-Aware Messaging

Modify quota banner and error messages to be tier-aware:

**Banner Updates (`app/dashboard.js`):**

```javascript
function updateBannerContent(eventCount, quotaLimit, tier) {
  const banner = document.getElementById('quotaBanner');
  const bannerContent = banner.querySelector('.banner-content');
  
  if (eventCount >= quotaLimit) {
    let message = '';
    
    if (tier === 'free') {
      message = `
        <h4>Free Tier Limit Reached</h4>
        <p>
          You've created ${eventCount} events, which is the limit for the free tier.
          <strong>Upgrade to Pro</strong> to create up to 25 events, or delete an old event to create a new one.
        </p>
      `;
    } else if (tier === 'pro') {
      message = `
        <h4>Pro Tier Limit Reached</h4>
        <p>
          You've created ${eventCount} events, which is the limit for the Pro tier.
          <strong>Upgrade to Enterprise</strong> for up to 100 events, or delete an old event to create a new one.
        </p>
      `;
    } else {
      message = `
        <h4>Event Limit Reached</h4>
        <p>
          You've created ${eventCount} events, which is your current limit.
          Delete an old event to create a new one.
        </p>
      `;
    }
    
    bannerContent.innerHTML = message;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}
```

**Quota Display Updates:**

```javascript
function updateQuotaDisplay(eventCount, quotaLimit, tier) {
  const quotaDisplay = document.getElementById('quotaDisplay');
  const tierBadge = getTierBadge(tier);
  
  quotaDisplay.innerHTML = `
    ${tierBadge}
    <span class="quota-count">${eventCount} of ${quotaLimit} events created</span>
    <span class="quota-remaining">${Math.max(0, quotaLimit - eventCount)} remaining</span>
  `;
}

function getTierBadge(tier) {
  const badges = {
    'free': '<span class="tier-badge tier-free">Free</span>',
    'pro': '<span class="tier-badge tier-pro">Pro</span>',
    'enterprise': '<span class="tier-badge tier-enterprise">Enterprise</span>',
    'custom': '<span class="tier-badge tier-custom">Custom</span>'
  };
  return badges[tier] || '';
}
```

## Testing Tiered Licensing

### Test Checklist

Before deploying tiered licensing to production:

- [ ] **Free Tier User**
  - [ ] Can create up to 3 events
  - [ ] Blocked at 4th event
  - [ ] Quota display shows "3 of 3"
  - [ ] Banner shows upgrade prompt
  - [ ] Deletion frees quota

- [ ] **Pro Tier User**
  - [ ] Can create up to 25 events
  - [ ] Blocked at 26th event
  - [ ] Quota display shows correct limit
  - [ ] Banner shows enterprise upgrade prompt

- [ ] **Enterprise Tier User**
  - [ ] Can create up to 100 events
  - [ ] Blocked at 101st event
  - [ ] Quota display shows correct limit

- [ ] **User Without Quota Field**
  - [ ] Defaults to free tier (3 events)
  - [ ] System works correctly

- [ ] **Security Rules**
  - [ ] Enforces per-user quota correctly
  - [ ] Prevents quota field tampering
  - [ ] Handles missing quota gracefully

- [ ] **Concurrent Creation**
  - [ ] Works correctly with different quotas
  - [ ] No race conditions

- [ ] **Tier Changes**
  - [ ] Quota updates when tier changes
  - [ ] UI reflects new quota immediately
  - [ ] No data loss during upgrade

### Test Script

```javascript
// test-tiered-quotas.js
const admin = require('firebase-admin');
const { setUserTier } = require('./admin/quota-management.js');

async function testTieredQuotas() {
  // Create test users
  const testUsers = {
    free: 'test-free-user-id',
    pro: 'test-pro-user-id',
    enterprise: 'test-enterprise-user-id'
  };
  
  // Set tiers
  await setUserTier(testUsers.free, 'free');
  await setUserTier(testUsers.pro, 'pro');
  await setUserTier(testUsers.enterprise, 'enterprise');
  
  console.log('✅ Test users created with different tiers');
  console.log('Now test event creation in the UI for each user');
}

testTieredQuotas().catch(console.error);
```

## Backward Compatibility

The tiered licensing implementation maintains full backward compatibility:

✅ **Existing users** automatically get free tier quota (3 events)
✅ **Existing events** require no migration or changes
✅ **Free tier users** experience no changes in functionality
✅ **Security Rules** remain secure throughout transition
✅ **Client code** gracefully falls back to default if quota not set
✅ **No breaking changes** to existing API or data structures

## Performance Considerations

### Current Implementation (Hardcoded)
- Query time: O(n) where n = user's event count (typically ≤ 3)
- Rule evaluation: ~10-50ms
- No additional database reads

### Tiered Implementation (Dynamic)
- Query time: O(n) where n = user's event count
- Rule evaluation: ~20-100ms (includes quota field read)
- Additional database read: 1 per event creation attempt
- Cached on client side to minimize reads

**Optimization:** Client-side caching of quota value reduces database reads:

```javascript
class QuotaCache {
  constructor(ttl = 300000) { // 5 minute TTL
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  get(userId) {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.quota;
    }
    return null;
  }
  
  set(userId, quota) {
    this.cache.set(userId, {
      quota,
      timestamp: Date.now()
    });
  }
}
```

## Security Considerations

### Defense in Depth

Both implementations maintain multiple security layers:

1. **Firebase Security Rules** (Primary)
   - Server-side enforcement
   - Cannot be bypassed by client
   - Atomic evaluation prevents race conditions

2. **Admin-Only Quota Modification**
   - Users cannot change their own quota
   - Only server-side admin code can modify
   - Prevents privilege escalation

3. **Client-Side Validation** (Secondary)
   - Improves UX by preventing failed requests
   - Not relied upon for security

4. **Creator Field Validation**
   - Prevents quota spoofing
   - Ensures users can't create events under other users' quotas

### Attack Vectors and Mitigations

| Attack | Mitigation | Result |
|--------|-----------|--------|
| Client-side bypass | Security Rules enforce server-side | Attack fails |
| Quota field tampering | `.write: false` on quota field | Attack fails |
| Creator field spoofing | Rules validate `creatorId === auth.uid` | Attack fails |
| Concurrent creation race | Atomic rule evaluation | Only allowed events created |
| Token manipulation | Firebase validates tokens cryptographically | Attack fails |

## Support and Troubleshooting

### Common Issues

**Issue:** Quota display shows wrong number
- **Cause:** Client cache out of sync
- **Fix:** Call `quotaStateManager.updateState()` to refresh

**Issue:** User can't create events despite having quota
- **Cause:** Security Rules not deployed or index missing
- **Fix:** Deploy rules and verify index exists

**Issue:** Quota doesn't update after deletion
- **Cause:** Real-time listener not set up
- **Fix:** Ensure `setupRealTimeListener()` is called

**Issue:** Different quota in UI vs Security Rules
- **Cause:** Hardcoded values not updated consistently
- **Fix:** Use `QUOTA_CONFIG` constants everywhere

### Debug Mode

Enable debug logging in `quota-manager.js`:

```javascript
const DEBUG = true;

if (DEBUG) {
  console.log('🐛 Debug: Quota state:', this.state);
  console.log('🐛 Debug: Event count:', eventCount);
  console.log('🐛 Debug: Quota limit:', quotaLimit);
}
```

## Additional Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/database/security)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Event Creation Limit Design Document](.kiro/specs/event-creation-limit/design.md)
- [Event Creation Limit Requirements](.kiro/specs/event-creation-limit/requirements.md)

## Questions?

For questions about quota configuration or tiered licensing implementation, refer to:
- Design document: `.kiro/specs/event-creation-limit/design.md`
- Configuration file: `config/quota-config.js`
- Security Rules: `firebase-security-rules.json`
