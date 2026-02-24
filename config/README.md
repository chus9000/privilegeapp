# Configuration Directory

This directory contains centralized configuration files for the application.

## Files

### quota-config.js

Centralized quota constants for the event creation limit feature.

**Purpose:**
- Single source of truth for quota limits
- Easy modification of quota values
- Support for future tiered licensing (free/pro/enterprise)

**Usage:**

```javascript
// Import in ES6 modules
import { QUOTA_CONFIG, getQuotaForTier } from '../config/quota-config.js';

// Use the constants
const limit = QUOTA_CONFIG.FREE_TIER_LIMIT;  // 3
const proLimit = getQuotaForTier('pro');     // 25
```

**Related Documentation:**
- [docs/QUOTA_CONFIGURATION_GUIDE.md](../docs/QUOTA_CONFIGURATION_GUIDE.md)

### debrief-config.js

Configuration for multi-theme privilege analysis in quiz results.

**Purpose:**
- Control how many privilege themes are analyzed per question
- Choose explanation style (focused, nuanced, comprehensive)
- Override specific questions with custom analysis
- Support intersectional privilege analysis

**Usage:**

```javascript
// Import in ES6 modules
import { debriefConfig } from '../config/debrief-config.js';

// Use in debrief generation
const explanation = generateResponseExplanation(question, answer, debriefConfig);
```

**Quick Configuration:**

```javascript
export const debriefConfig = {
    maxThemesPerResponse: 2,        // 1-5 themes per question
    explanationStyle: 'nuanced',    // 'focused' | 'nuanced' | 'comprehensive'
    questionOverrides: {}           // Custom per-question settings
};
```

**Related Files:**
- `debrief-config.examples.js` - Ready-to-use example configurations
- [docs/DEBRIEF_CONFIGURATION_GUIDE.md](../docs/DEBRIEF_CONFIGURATION_GUIDE.md) - Complete guide

### debrief-config.examples.js

Example configurations for different use cases:
- **Focused**: Simple, single-theme explanations (original behavior)
- **Nuanced**: Balanced intersectional analysis (default, recommended)
- **Comprehensive**: Deep multi-theme analysis
- **Mixed**: Custom approach with per-question overrides
- **Identity-focused**: Emphasis on identity and intersectionality
- **Economic justice-focused**: Emphasis on economic inequality

## Adding New Configuration Files

When adding new configuration files to this directory:

1. **Use clear naming:** `feature-config.js` format
2. **Export constants:** Use named exports for easy importing
3. **Add documentation:** Include JSDoc comments explaining each constant
4. **Update this README:** Add a section describing the new config file
5. **Create guide if needed:** For complex configurations, create a guide in `docs/`

## Best Practices

- **Centralize constants:** Don't hardcode values in multiple places
- **Document changes:** Explain what each constant controls
- **Version control:** Commit config changes with clear messages
- **Environment-specific:** Use environment variables for secrets (never commit secrets)
- **Validation:** Add validation functions for config values
- **Defaults:** Always provide sensible default values

## Security Notes

- **Never commit secrets:** API keys, passwords, tokens should use environment variables
- **Use .env files:** For local development secrets (add to .gitignore)
- **Document requirements:** Clearly document which config values are required
- **Validate inputs:** Add validation for user-provided config values
