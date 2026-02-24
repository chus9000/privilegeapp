/**
 * Example configurations for the debrief system.
 * 
 * Copy one of these configurations to debrief-config.js to use it.
 * See docs/DEBRIEF_CONFIGURATION_GUIDE.md for full documentation.
 */

// ============================================================================
// EXAMPLE 1: Simple, Focused Explanations (Original Behavior)
// ============================================================================
// Best for: Quick understanding, accessibility, younger audiences
export const focusedConfig = {
    maxThemesPerResponse: 1,
    explanationStyle: 'focused',
    secondaryThemeThreshold: 0.3,
    questionOverrides: {}
};

// ============================================================================
// EXAMPLE 2: Balanced Intersectional Analysis (Default/Recommended)
// ============================================================================
// Best for: Most users, educational settings, balanced depth
export const nuancedConfig = {
    maxThemesPerResponse: 2,
    explanationStyle: 'nuanced',
    secondaryThemeThreshold: 0.3,
    questionOverrides: {}
};

// ============================================================================
// EXAMPLE 3: Deep Educational Experience
// ============================================================================
// Best for: Advanced learners, workshops, detailed analysis
export const comprehensiveConfig = {
    maxThemesPerResponse: 5,
    explanationStyle: 'comprehensive',
    secondaryThemeThreshold: 0.3,
    questionOverrides: {}
};

// ============================================================================
// EXAMPLE 4: Mixed Approach with Overrides
// ============================================================================
// Best for: Custom experiences, specific educational goals
export const mixedConfig = {
    maxThemesPerResponse: 2,
    explanationStyle: 'nuanced',
    secondaryThemeThreshold: 0.3,
    questionOverrides: {
        // Use comprehensive for particularly complex intersectional questions
        'Can you show affection for your romantic partner in public without fear of ridicule or violence?': {
            themes: ['identity', 'safety'],
            style: 'comprehensive'
        },
        // Use focused for simpler questions
        'Did you come from a supportive family environment?': {
            themes: ['social'],
            style: 'focused'
        }
    }
};

// ============================================================================
// EXAMPLE 5: Identity-Focused Configuration
// ============================================================================
// Best for: Workshops specifically about identity and intersectionality
export const identityFocusedConfig = {
    maxThemesPerResponse: 3,
    explanationStyle: 'comprehensive',
    secondaryThemeThreshold: 0.3,
    questionOverrides: {
        // Ensure identity questions get comprehensive treatment
        'Can you make mistakes and not have people attribute your behavior to flaws in your racial/gender group?': {
            themes: ['identity', 'social'],
            style: 'comprehensive'
        }
    }
};

// ============================================================================
// EXAMPLE 6: Economic Justice Focus
// ============================================================================
// Best for: Workshops about economic inequality and class privilege
export const economicFocusedConfig = {
    maxThemesPerResponse: 2,
    explanationStyle: 'nuanced',
    secondaryThemeThreshold: 0.3,
    questionOverrides: {
        // Highlight economic-social intersections
        'Have you worried about being able to afford dinner with friends?': {
            themes: ['economic', 'social'],
            style: 'comprehensive'
        }
    }
};
