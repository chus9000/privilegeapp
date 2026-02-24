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
        "Use your privilege to amplify marginalized voices.",
        "Educate yourself on systemic inequalities.",
        "Speak up when you witness discrimination.",
        "Support organizations working for equity.",
        "Examine your own biases regularly."
    ],
    neutral: [
        "Recognize that privilege is intersectional.",
        "Listen to diverse perspectives.",
        "Acknowledge both your privileges and challenges.",
        "Build coalitions across different communities.",
        "Continue learning about social justice"
    ],
    lowPrivilege: [
        "Connect with supportive communities.",
        "Practice self-care and set boundaries.",
        "Share your story when you feel safe.",
        "Seek out resources and support systems.",
        "Remember that your experiences are valid."
    ]
};

/**
 * Learning resources organized by category
 */
const learningResources = {
    highPrivilege: [
        { title: "5 Tips For Being An Ally by Franchesca Ramsey", url: "https://www.youtube.com/watch?v=_dg86g-QlM0&t=9s" },
        { title: "Guide to Allyship", url: "https://guidetoallyship.com/" },
        { title: "Students Learn A Powerful Lesson About Privilege", url: "https://www.youtube.com/watch?v=2KlmvmuxzYE"}
    ],
    neutral: [        
        { title: "Kimberlé Crenshaw: Key Concepts", url: "https://www.ted.com/talks/kimberle_crenshaw_the_urgency_of_intersectionality" },
        { title: "Racial equity tools", url: "https://www.racialequitytools.org/resources/fundamentals/core-concepts/intersectionality" },
        { title: "The Intersectionality Toolkit", url: "https://www.unwomen.org/sites/default/files/2022-01/Intersectionality-resource-guide-and-toolkit-en.pdf" }
    ],
    lowPrivilege: [
        { title: "Trauma Survivors", url: "https://www.fortraumasurvivors.com/" },
        { title: "Building Community While Keeping Safe", url: "https://www.psychologytoday.com/us/blog/compassionate-feminism/202411/building-community-while-keeping-safe" },
        { title: "Amplifying Marginalized Voices: Why It Matters", url: "https://eccles.utah.edu/news/amplifying-marginalized-voices-why-it-matters/" }
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
 * Get learning resources for a given category
 * @param {string} category - Category name
 * @returns {Array<Object>} Array of resource objects
 */
function getResourcesForCategory(category) {
    return learningResources[category] || learningResources.neutral;
}

/**
 * Render ally tips UI with learning resources
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
    
    const resources = getResourcesForCategory(category);
    
    const tipsHTML = tips.map(tip => `
        <li class="ally-tip-item">
            <span class="ally-tip-bullet">✓</span>
            <span class="ally-tip-text">${tip}</span>
        </li>
    `).join('');
    
    const resourcesHTML = resources.map(resource => `
        <a href="${resource.url}" target="_blank" rel="noopener noreferrer" class="resource-item">
            <div class="resource-title">
                ${resource.title}
                <span class="resource-arrow">↗</span>
            </div>
        </a>
    `).join('');
    
    return `
        <div class="ally-tips-section">
            <div class="ally-tips-container">
                <div class="ally-tips-left">
                    <h2>💡 ${title}</h2>
                    <p class="ally-tips-intro">Based on your privilege status, here are some practical tips for you:</p>
                    <ul class="ally-tips-list">
                        ${tipsHTML}
                    </ul>
                </div>
                <div class="learning-resources">
                    <h3>Learning Resources</h3>
                    <div class="resource-list">
                        ${resourcesHTML}
                    </div>
                    <p class="resource-note">Recommended based on your specific assessment results.</p>
                </div>
            </div>
        </div>
    `;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getTipsForScore,
        categorizeScore,
        renderTips,
        getResourcesForCategory,
        allyTips,
        learningResources
    };
}
