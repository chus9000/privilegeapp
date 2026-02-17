/**
 * Ally Tips Module
 * 
 * Provides educational content about being a better ally based on privilege score.
 * Tips are categorized by privilege level: high, neutral, or low.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

/**
 * Ally tips content organized by category
 */
const allyTips = {
    highPrivilege: [
        "Use your privilege to amplify marginalized voices",
        "Educate yourself on systemic inequalities",
        "Speak up when you witness discrimination",
        "Support organizations working for equity",
        "Examine your own biases regularly"
    ],
    neutral: [
        "Recognize that privilege is intersectional",
        "Listen to diverse perspectives",
        "Acknowledge both your privileges and challenges",
        "Build coalitions across different communities",
        "Continue learning about social justice"
    ],
    lowPrivilege: [
        "Connect with supportive communities",
        "Practice self-care and set boundaries",
        "Share your story when you feel safe",
        "Seek out resources and support systems",
        "Remember that your experiences are valid"
    ]
};

/**
 * Categorize score based on spectrum range
 * @param {number} score - The user's privilege score
 * @param {number} min - Minimum possible score
 * @param {number} max - Maximum possible score
 * @returns {string} Category: 'highPrivilege', 'neutral', or 'lowPrivilege'
 */
function categorizeScore(score, min, max) {
    const range = max - min;
    const normalizedScore = (score - min) / range; // 0 to 1
    
    // High privilege: score > 60% of max
    if (normalizedScore > 0.6) {
        return 'highPrivilege';
    }
    // Low privilege: score < 40% of max (which is -60% from center in a symmetric range)
    else if (normalizedScore < 0.4) {
        return 'lowPrivilege';
    }
    // Neutral: between 40% and 60%
    else {
        return 'neutral';
    }
}

/**
 * Get ally tips for a given score
 * @param {number} score - The user's privilege score
 * @param {number} min - Minimum possible score (default: -25)
 * @param {number} max - Maximum possible score (default: 25)
 * @returns {Array<string>} Array of ally tips
 */
function getTipsForScore(score, min = -25, max = 25) {
    const category = categorizeScore(score, min, max);
    return allyTips[category];
}

/**
 * Render ally tips UI
 * @param {Array<string>} tips - Array of tip strings
 * @param {string} category - Category name for styling
 * @returns {string} HTML string for ally tips section
 */
function renderTips(tips, category) {
    const categoryTitles = {
        highPrivilege: 'Using Your Privilege to Support Others',
        neutral: 'Understanding Intersectionality',
        lowPrivilege: 'Self-Advocacy and Community Building'
    };
    
    const title = categoryTitles[category] || 'Ally Tips';
    
    const tipsHTML = tips.map(tip => `
        <li class="ally-tip-item"><span class="ally-tip-bullet">•</span> ${tip}</li>
    `).join('');
    
    return `
        <div class="ally-tips-section">
            <h2>💡 ${title}</h2>
            <p class="ally-tips-intro">Based on your privilege awareness, here are some ways to be a better ally:</p>
            <ul class="ally-tips-list">
                ${tipsHTML}
            </ul>
        </div>
    `;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getTipsForScore,
        categorizeScore,
        renderTips,
        allyTips
    };
}
