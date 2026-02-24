/**
 * Unit Tests: Quota Configuration Loading
 * 
 * Tests that quota configuration is loaded correctly and provides
 * appropriate default values when config is missing.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Quota Configuration', () => {
  let QUOTA_CONFIG, getQuotaForTier, getTierForQuota;

  beforeEach(async () => {
    // Dynamically import the config module
    const module = await import('../config/quota-config.js');
    QUOTA_CONFIG = module.QUOTA_CONFIG;
    getQuotaForTier = module.getQuotaForTier;
    getTierForQuota = module.getTierForQuota;
  });

  describe('QUOTA_CONFIG constants', () => {
    it('should define FREE_TIER_LIMIT', () => {
      expect(QUOTA_CONFIG.FREE_TIER_LIMIT).toBeDefined();
      expect(typeof QUOTA_CONFIG.FREE_TIER_LIMIT).toBe('number');
      expect(QUOTA_CONFIG.FREE_TIER_LIMIT).toBe(3);
    });

    it('should define PRO_TIER_LIMIT', () => {
      expect(QUOTA_CONFIG.PRO_TIER_LIMIT).toBeDefined();
      expect(typeof QUOTA_CONFIG.PRO_TIER_LIMIT).toBe('number');
      expect(QUOTA_CONFIG.PRO_TIER_LIMIT).toBe(25);
    });

    it('should define ENTERPRISE_TIER_LIMIT', () => {
      expect(QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT).toBeDefined();
      expect(typeof QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT).toBe('number');
      expect(QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT).toBe(100);
    });

    it('should define DEFAULT_LIMIT', () => {
      expect(QUOTA_CONFIG.DEFAULT_LIMIT).toBeDefined();
      expect(typeof QUOTA_CONFIG.DEFAULT_LIMIT).toBe('number');
      expect(QUOTA_CONFIG.DEFAULT_LIMIT).toBe(3);
    });

    it('should have DEFAULT_LIMIT match FREE_TIER_LIMIT', () => {
      expect(QUOTA_CONFIG.DEFAULT_LIMIT).toBe(QUOTA_CONFIG.FREE_TIER_LIMIT);
    });

    it('should have tier limits in ascending order', () => {
      expect(QUOTA_CONFIG.FREE_TIER_LIMIT).toBeLessThan(QUOTA_CONFIG.PRO_TIER_LIMIT);
      expect(QUOTA_CONFIG.PRO_TIER_LIMIT).toBeLessThan(QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT);
    });

    it('should have all limits as positive numbers', () => {
      expect(QUOTA_CONFIG.FREE_TIER_LIMIT).toBeGreaterThan(0);
      expect(QUOTA_CONFIG.PRO_TIER_LIMIT).toBeGreaterThan(0);
      expect(QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT).toBeGreaterThan(0);
      expect(QUOTA_CONFIG.DEFAULT_LIMIT).toBeGreaterThan(0);
    });
  });

  describe('getQuotaForTier()', () => {
    it('should return correct quota for free tier', () => {
      const quota = getQuotaForTier('free');
      expect(quota).toBe(QUOTA_CONFIG.FREE_TIER_LIMIT);
      expect(quota).toBe(3);
    });

    it('should return correct quota for pro tier', () => {
      const quota = getQuotaForTier('pro');
      expect(quota).toBe(QUOTA_CONFIG.PRO_TIER_LIMIT);
      expect(quota).toBe(25);
    });

    it('should return correct quota for enterprise tier', () => {
      const quota = getQuotaForTier('enterprise');
      expect(quota).toBe(QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT);
      expect(quota).toBe(100);
    });

    it('should return default quota for unknown tier', () => {
      const quota = getQuotaForTier('unknown');
      expect(quota).toBe(QUOTA_CONFIG.DEFAULT_LIMIT);
    });

    it('should return default quota for null tier', () => {
      const quota = getQuotaForTier(null);
      expect(quota).toBe(QUOTA_CONFIG.DEFAULT_LIMIT);
    });

    it('should return default quota for undefined tier', () => {
      const quota = getQuotaForTier(undefined);
      expect(quota).toBe(QUOTA_CONFIG.DEFAULT_LIMIT);
    });

    it('should return default quota for empty string tier', () => {
      const quota = getQuotaForTier('');
      expect(quota).toBe(QUOTA_CONFIG.DEFAULT_LIMIT);
    });

    it('should be case-sensitive for tier names', () => {
      // Uppercase should not match
      const quotaUpper = getQuotaForTier('FREE');
      expect(quotaUpper).toBe(QUOTA_CONFIG.DEFAULT_LIMIT);
      
      // Lowercase should match
      const quotaLower = getQuotaForTier('free');
      expect(quotaLower).toBe(QUOTA_CONFIG.FREE_TIER_LIMIT);
    });
  });

  describe('getTierForQuota()', () => {
    it('should return "free" for FREE_TIER_LIMIT', () => {
      const tier = getTierForQuota(QUOTA_CONFIG.FREE_TIER_LIMIT);
      expect(tier).toBe('free');
    });

    it('should return "pro" for PRO_TIER_LIMIT', () => {
      const tier = getTierForQuota(QUOTA_CONFIG.PRO_TIER_LIMIT);
      expect(tier).toBe('pro');
    });

    it('should return "enterprise" for ENTERPRISE_TIER_LIMIT', () => {
      const tier = getTierForQuota(QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT);
      expect(tier).toBe('enterprise');
    });

    it('should return "custom" for unrecognized quota', () => {
      const tier = getTierForQuota(50);
      expect(tier).toBe('custom');
    });

    it('should return "custom" for zero quota', () => {
      const tier = getTierForQuota(0);
      expect(tier).toBe('custom');
    });

    it('should return "custom" for negative quota', () => {
      const tier = getTierForQuota(-1);
      expect(tier).toBe('custom');
    });

    it('should return "custom" for very large quota', () => {
      const tier = getTierForQuota(1000);
      expect(tier).toBe('custom');
    });
  });

  describe('Configuration consistency', () => {
    it('should have getQuotaForTier and getTierForQuota be inverse operations for standard tiers', () => {
      // Free tier
      const freeTier = getTierForQuota(QUOTA_CONFIG.FREE_TIER_LIMIT);
      const freeQuota = getQuotaForTier(freeTier);
      expect(freeQuota).toBe(QUOTA_CONFIG.FREE_TIER_LIMIT);

      // Pro tier
      const proTier = getTierForQuota(QUOTA_CONFIG.PRO_TIER_LIMIT);
      const proQuota = getQuotaForTier(proTier);
      expect(proQuota).toBe(QUOTA_CONFIG.PRO_TIER_LIMIT);

      // Enterprise tier
      const enterpriseTier = getTierForQuota(QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT);
      const enterpriseQuota = getQuotaForTier(enterpriseTier);
      expect(enterpriseQuota).toBe(QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT);
    });

    it('should have all tier names map to unique quota values', () => {
      const tiers = ['free', 'pro', 'enterprise'];
      const quotas = tiers.map(tier => getQuotaForTier(tier));
      
      // Check all quotas are unique
      const uniqueQuotas = new Set(quotas);
      expect(uniqueQuotas.size).toBe(tiers.length);
    });
  });

  describe('Global availability', () => {
    it('should be available in window object when in browser environment', () => {
      // This test verifies the module makes itself available globally
      // In a real browser environment, window.QUOTA_CONFIG should be defined
      // In test environment, we just verify the export exists
      expect(QUOTA_CONFIG).toBeDefined();
      expect(getQuotaForTier).toBeDefined();
      expect(getTierForQuota).toBeDefined();
    });
  });

  describe('Default values when config is missing', () => {
    it('should provide sensible defaults for all tier limits', () => {
      // Verify that all limits are reasonable values
      expect(QUOTA_CONFIG.FREE_TIER_LIMIT).toBeGreaterThanOrEqual(1);
      expect(QUOTA_CONFIG.FREE_TIER_LIMIT).toBeLessThanOrEqual(10);
      
      expect(QUOTA_CONFIG.PRO_TIER_LIMIT).toBeGreaterThanOrEqual(10);
      expect(QUOTA_CONFIG.PRO_TIER_LIMIT).toBeLessThanOrEqual(50);
      
      expect(QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT).toBeGreaterThanOrEqual(50);
      expect(QUOTA_CONFIG.ENTERPRISE_TIER_LIMIT).toBeLessThanOrEqual(1000);
    });

    it('should use DEFAULT_LIMIT as fallback in getQuotaForTier', () => {
      const invalidTiers = ['invalid', null, undefined, '', 123, {}, []];
      
      invalidTiers.forEach(tier => {
        const quota = getQuotaForTier(tier);
        expect(quota).toBe(QUOTA_CONFIG.DEFAULT_LIMIT);
      });
    });
  });

  describe('Type safety', () => {
    it('should return numbers from getQuotaForTier', () => {
      const tiers = ['free', 'pro', 'enterprise', 'invalid'];
      
      tiers.forEach(tier => {
        const quota = getQuotaForTier(tier);
        expect(typeof quota).toBe('number');
        expect(Number.isFinite(quota)).toBe(true);
      });
    });

    it('should return strings from getTierForQuota', () => {
      const quotas = [3, 25, 100, 50, 0, -1];
      
      quotas.forEach(quota => {
        const tier = getTierForQuota(quota);
        expect(typeof tier).toBe('string');
        expect(tier.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle boundary values correctly', () => {
      // Test values just below and above tier limits
      expect(getTierForQuota(2)).toBe('custom');
      expect(getTierForQuota(3)).toBe('free');
      expect(getTierForQuota(4)).toBe('custom');
      
      expect(getTierForQuota(24)).toBe('custom');
      expect(getTierForQuota(25)).toBe('pro');
      expect(getTierForQuota(26)).toBe('custom');
      
      expect(getTierForQuota(99)).toBe('custom');
      expect(getTierForQuota(100)).toBe('enterprise');
      expect(getTierForQuota(101)).toBe('custom');
    });

    it('should handle very large numbers', () => {
      const largeQuota = getQuotaForTier('enterprise');
      expect(largeQuota).toBeLessThan(Number.MAX_SAFE_INTEGER);
      
      const tier = getTierForQuota(Number.MAX_SAFE_INTEGER);
      expect(tier).toBe('custom');
    });

    it('should handle special string values', () => {
      const specialStrings = ['Free', 'FREE', 'Pro', 'PRO', 'Enterprise', 'ENTERPRISE'];
      
      specialStrings.forEach(str => {
        const quota = getQuotaForTier(str);
        // Should return default for case-mismatched strings
        expect(quota).toBe(QUOTA_CONFIG.DEFAULT_LIMIT);
      });
    });
  });

  describe('Documentation and maintainability', () => {
    it('should have all constants documented in the config object', () => {
      // Verify all expected properties exist
      const expectedProperties = [
        'FREE_TIER_LIMIT',
        'PRO_TIER_LIMIT',
        'ENTERPRISE_TIER_LIMIT',
        'DEFAULT_LIMIT'
      ];
      
      expectedProperties.forEach(prop => {
        expect(QUOTA_CONFIG).toHaveProperty(prop);
      });
    });

    it('should not have unexpected properties in QUOTA_CONFIG', () => {
      const expectedProperties = [
        'FREE_TIER_LIMIT',
        'PRO_TIER_LIMIT',
        'ENTERPRISE_TIER_LIMIT',
        'DEFAULT_LIMIT'
      ];
      
      const actualProperties = Object.keys(QUOTA_CONFIG);
      expect(actualProperties.sort()).toEqual(expectedProperties.sort());
    });
  });
});
