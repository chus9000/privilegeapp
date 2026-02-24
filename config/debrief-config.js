/**
 * Configuration for debrief generation and privilege theme analysis.
 * 
 * This config controls how privilege themes are identified and explained
 * in the personalized debrief responses.
 */

export const debriefConfig = {
    /**
     * Maximum number of privilege themes to include in each response explanation.
     * 
     * - 1: Single theme (focused, backward compatible)
     * - 2: Dual themes (nuanced intersectional analysis)
     * - 5: All relevant themes (comprehensive)
     * 
     * @type {number}
     */
    maxThemesPerResponse: 2,

    /**
     * Style of explanation to generate.
     * 
     * - 'focused': Single theme, concise (uses only primary theme)
     * - 'nuanced': Blended explanation for 2 themes showing intersectionality
     * - 'comprehensive': Multi-section breakdown of all relevant themes
     * 
     * @type {'focused' | 'nuanced' | 'comprehensive'}
     */
    explanationStyle: 'nuanced',

    /**
     * Minimum relevance score (0-1) for including secondary themes.
     * Currently not implemented but reserved for future scoring system.
     * 
     * @type {number}
     */
    secondaryThemeThreshold: 0.3,

    /**
     * Manual overrides for specific questions.
     * Key can be question text hash, ID, or exact text match.
     * 
     * Example:
     * {
     *   'Have you ever feared...': {
     *     themes: ['identity', 'safety'],
     *     style: 'comprehensive'
     *   }
     * }
     * 
     * @type {Object.<string, {themes?: string[], style?: string}>}
     */
    questionOverrides: {}
};
