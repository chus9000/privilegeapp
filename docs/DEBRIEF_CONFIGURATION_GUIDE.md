# Debrief Configuration Guide

This guide explains how to configure the multi-theme privilege analysis system in the debrief engine.

## Overview

The debrief system now supports intersectional privilege analysis, allowing questions to be analyzed across multiple privilege dimensions (identity, economic, safety, social, access) rather than just one.

## Configuration File

Configuration is managed in `config/debrief-config.js`:

```javascript
export const debriefConfig = {
    maxThemesPerResponse: 2,
    explanationStyle: 'nuanced',
    secondaryThemeThreshold: 0.3,
    questionOverrides: {}
};
```

## Configuration Options

### `maxThemesPerResponse`

Controls how many privilege themes to include in each response explanation.

- `1`: Single theme (focused, backward compatible)
- `2`: Dual themes (nuanced intersectional analysis) - **Default**
- `5`: All relevant themes (comprehensive)

**Example:**
```javascript
maxThemesPerResponse: 1  // Simple, focused explanations
maxThemesPerResponse: 2  // Balanced intersectional analysis
```

### `explanationStyle`

Determines the format and depth of explanations.

- `'focused'`: Single theme, concise explanation (uses only primary theme)
- `'nuanced'`: Blended explanation showing how 2 themes intersect - **Default**
- `'comprehensive'`: Multi-section breakdown of all relevant themes

**Example Output:**

**Focused:**
```
Your answer suggests you have an advantage in this area. How your identity 
is perceived and treated varies across communities, cultures, and even 
day-to-day interactions. Understanding identity-based privilege allows you 
to amplify marginalized voices and challenge biases when you encounter them.
```

**Nuanced:**
```
Your answer suggests you have an advantage in this area. This question 
touches on both identity and safety: how your identity is perceived affects 
whether you feel secure in public spaces, and these feelings can shift based 
on where you are and the social climate around you. Understanding these 
intersecting privileges empowers you to amplify marginalized voices and 
advocate for more inclusive, protective environments for everyone.
```

**Comprehensive:**
```
Your answer suggests you have an advantage in this area. This question 
reveals intersecting dimensions of privilege:

Identity: How your identity is perceived and treated varies across 
communities, cultures, and even day-to-day interactions.

Safety: Feelings of safety can change based on where you live, who you 
are with, and the social climate around you.

These privileges are interconnected — your identity directly impacts your 
sense of safety in public spaces. Being aware of these advantages empowers 
you to stand up for those who feel unsafe, amplify marginalized voices, 
and advocate for environments where everyone can move freely without fear.
```

### `questionOverrides`

Allows manual configuration for specific questions.

**Example:**
```javascript
questionOverrides: {
    'Have you ever feared for your safety based on your identity?': {
        themes: ['identity', 'safety'],
        style: 'comprehensive'
    },
    'Have you worried about affording dinner with friends?': {
        themes: ['economic', 'social'],
        style: 'nuanced'
    }
}
```

## Privilege Themes

The system identifies five privilege dimensions:

1. **Identity**: Race, gender, orientation, representation
2. **Economic**: Financial stability, employment, resources
3. **Safety**: Physical security, freedom from violence/harassment
4. **Social**: Support networks, family, community connections
5. **Access**: Healthcare, education, cultural resources, opportunities

## How Theme Detection Works

The system analyzes question text for keywords to identify relevant themes:

- Questions can match multiple themes (e.g., "feared for safety based on race" → identity + safety)
- Themes are detected independently, not in a waterfall
- The first N themes (based on `maxThemesPerResponse`) are used
- Default fallback is 'social' if no themes match

## Common Configuration Scenarios

### Simple, Accessible Explanations
```javascript
{
    maxThemesPerResponse: 1,
    explanationStyle: 'focused'
}
```

### Balanced Intersectional Analysis (Recommended)
```javascript
{
    maxThemesPerResponse: 2,
    explanationStyle: 'nuanced'
}
```

### Deep Educational Experience
```javascript
{
    maxThemesPerResponse: 5,
    explanationStyle: 'comprehensive'
}
```

### Mixed Approach
```javascript
{
    maxThemesPerResponse: 2,
    explanationStyle: 'nuanced',
    questionOverrides: {
        // Use comprehensive for particularly complex questions
        'Question text here': {
            style: 'comprehensive'
        }
    }
}
```

## Testing Your Configuration

After modifying the config, test the debrief output:

1. Complete a quiz in free-play or event mode
2. Review the "Your Responses" section on the results page
3. Check that explanations match your expected style and depth
4. Adjust `maxThemesPerResponse` or `explanationStyle` as needed

## Backward Compatibility

The system is fully backward compatible:

- Default config (`nuanced` with 2 themes) provides enhanced analysis
- Setting `maxThemesPerResponse: 1` and `explanationStyle: 'focused'` replicates the original single-theme behavior
- All existing tests pass with the new system

## Future Enhancements

The `secondaryThemeThreshold` parameter is reserved for future use with a theme scoring system that would allow fine-grained control over which secondary themes are included based on relevance scores.
