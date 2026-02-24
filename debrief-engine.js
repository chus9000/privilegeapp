/**
 * Debrief Engine Module
 *
 * Provides core logic for personalized results debriefing including:
 * - Score categorization into privilege levels
 * - Debrief message generation
 * - Response selection and analysis
 * - Multi-dimensional privilege theme identification
 */

import { debriefConfig } from './config/debrief-config.js';

/**
 * Calculate normalized position of score within range
 * @param {number} score - Participant's privilege score
 * @param {number} min - Minimum possible score
 * @param {number} max - Maximum possible score
 * @returns {number} Normalized value between 0 and 1
 */
export function normalizeScore(score, min, max) {
    // Coerce inputs to numbers; fall back to 0 for score, 0/1 for min/max
    const numScore = Number(score);
    const numMin = Number(min);
    const numMax = Number(max);

    if (isNaN(numScore) || isNaN(numMin) || isNaN(numMax)) {
        console.warn('[debrief-engine] normalizeScore received non-numeric input:', { score, min, max });
        return 0.5;
    }

    // Handle edge case where min equals max
    if (numMin === numMax) {
        return 0.5;
    }

    // Log warning for out-of-range scores before clamping
    if (numScore < numMin || numScore > numMax) {
        console.warn('[debrief-engine] Score out of range, clamping:', { score: numScore, min: numMin, max: numMax });
    }
    
    // Clamp score to valid range
    const clampedScore = Math.max(numMin, Math.min(numMax, numScore));
    
    // Calculate normalized position
    return (clampedScore - numMin) / (numMax - numMin);
}

/**
 * Format a score with appropriate sign prefix
 * @param {number} score - The score to format
 * @returns {string} Formatted score: "+N" for positive, "-N" for negative, "0" for zero
 */
export function formatScore(score) {
    const num = Number(score);
    if (isNaN(num)) {
        console.warn('[debrief-engine] formatScore received non-numeric input:', score);
        return '0';
    }
    if (num > 0) return `+${num}`;
    if (num < 0) return `${num}`;
    return '0';
}



/**
 * Categorize a score into privilege levels
 * Uses 40-20-40 split: bottom 40% = low, middle 20% = neutral, top 40% = high
 * 
 * @param {number} score - Participant's privilege score
 * @param {number} min - Minimum possible score in spectrum
 * @param {number} max - Maximum possible score in spectrum
 * @returns {string} Category: 'low', 'neutral', or 'high'
 */
export function categorizePrivilegeScore(score, min, max) {
    const normalized = normalizeScore(score, min, max);
    
    // Apply 40-20-40 split
    if (normalized > 0.6) {
        return 'high';
    } else if (normalized < 0.4) {
        return 'low';
    } else {
        return 'neutral';
    }
}
/**
 * Generate score meaning debrief message based on privilege category
 *
 * @param {string} category - Privilege category ('low', 'neutral', 'high')
 * @param {number} score - Participant's score for context
 * @returns {Object} Debrief object with title and message
 */
export function generateScoreDebrief(category, score) {
    const debriefMessages = {
        low: {
            title: "Your Journey and Resilience",
            message: "Your score reflects a starting context with more challenges than many others face. The progress you've made and the resilience you've shown in navigating these obstacles is a testament to your strength. Your experiences give you unique insights that can help others understand different perspectives."
        },
        neutral: {
            title: "Understanding Your Mixed Experience",
            message: "Your score reflects a mix of advantages and challenges—this is intersectionality in action. You likely have privilege in some contexts while facing obstacles in others. This unique position helps you understand both sides and makes you especially effective at building bridges between different experiences."
        },
        high: {
            title: "Using Your Advantages to Help Others",
            message: "Your score reflects circumstances that have been easier compared to what many others face. These advantages are like superpowers—you can use them to open doors, amplify voices, and create opportunities for others. Your privilege comes with the opportunity to be a powerful ally."
        }
    };

    // Return the appropriate debrief message for the category
    const debrief = debriefMessages[category];

    if (!debrief) {
        // Fallback for invalid category
        return {
            title: "Understanding Your Score",
            message: "Your score reflects your unique combination of circumstances and experiences. Everyone's journey is different, and understanding privilege helps us support each other better."
        };
    }

    return {
        title: debrief.title,
        message: debrief.message,
        category: category
    };
}

/**
 * Select responses for analysis based on educational value
 * Prioritizes high-value questions and balances positive/negative values
 * 
 * @param {Object|Array} answers - Participant's answers (object with question indices as keys, or array)
 * @param {Array} questions - All quiz questions
 * @param {number} count - Number of responses to select (default: 4)
 * @returns {Array} Selected questions with analysis data
 */
export function selectResponsesForAnalysis(answers, questions, count = 4) {
    // Handle missing or invalid inputs
    if (!answers) {
        console.warn('[debrief-engine] selectResponsesForAnalysis: missing answer data, skipping response analysis');
        return [];
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        console.warn('[debrief-engine] selectResponsesForAnalysis: missing or invalid question data, skipping response analysis');
        return [];
    }

    // Clamp count to valid range 3-5
    const targetCount = Math.max(3, Math.min(5, count));

    // Build answered questions list, handling both array and object formats
    const answeredQuestions = questions
        .map((question, index) => {
            let rawAnswer = Array.isArray(answers)
                ? answers[index]
                : (answers[index.toString()] ?? answers[index]);

            // Attempt conversion for invalid answer formats
            if (rawAnswer !== 0 && rawAnswer !== 1) {
                if (rawAnswer == null) {
                    // null/undefined means unanswered — leave as-is
                    rawAnswer = undefined;
                } else {
                    const converted = Number(rawAnswer);
                    if (converted === 0 || converted === 1) {
                        rawAnswer = converted;
                    } else if (rawAnswer === true || rawAnswer === 'true' || rawAnswer === 'yes' || rawAnswer === 'Yes') {
                        rawAnswer = 1;
                    } else if (rawAnswer === false || rawAnswer === 'false' || rawAnswer === 'no' || rawAnswer === 'No') {
                        rawAnswer = 0;
                    } else {
                        console.warn('[debrief-engine] Invalid answer format at index', index, ':', rawAnswer);
                        rawAnswer = undefined;
                    }
                }
            }

            return {
                questionIndex: index,
                questionText: question.text,
                questionValue: question.value,
                userAnswer: rawAnswer
            };
        })
        .filter(q => q.userAnswer === 0 || q.userAnswer === 1);

    // No answered questions means nothing to select
    if (answeredQuestions.length === 0) {
        return [];
    }

    // Separate into high-value (|value| >= 1) and low-value questions
    const highValue = answeredQuestions.filter(q => Math.abs(q.questionValue) >= 1);

    // Use high-value questions as primary pool; fall back to all answered if not enough
    let pool = highValue.length >= 3 ? highValue : answeredQuestions;

    // If pool is smaller than target, return what we have (could be < 3)
    if (pool.length <= targetCount) {
        return pool.sort((a, b) => a.questionIndex - b.questionIndex);
    }

    // Separate into positive and negative value questions for balanced selection
    const positiveValueQuestions = pool.filter(q => q.questionValue > 0);
    const negativeValueQuestions = pool.filter(q => q.questionValue < 0);
    // Questions with value === 0 go into a neutral bucket
    const zeroValueQuestions = pool.filter(q => q.questionValue === 0);

    const selected = [];
    const halfCount = Math.floor(targetCount / 2);

    if (positiveValueQuestions.length >= halfCount && negativeValueQuestions.length >= halfCount) {
        // Enough of both — select evenly, then fill remainder from whichever has more
        selected.push(...positiveValueQuestions.slice(0, halfCount));
        selected.push(...negativeValueQuestions.slice(0, targetCount - halfCount));
        // If we still need more (e.g. one side didn't have enough for the remainder), fill from the other
        if (selected.length < targetCount) {
            const usedPositive = selected.filter(q => q.questionValue > 0).length;
            const usedNegative = selected.filter(q => q.questionValue < 0).length;
            const remainingPositive = positiveValueQuestions.slice(usedPositive);
            const remainingNegative = negativeValueQuestions.slice(usedNegative);
            const remaining = [...remainingPositive, ...remainingNegative, ...zeroValueQuestions];
            selected.push(...remaining.slice(0, targetCount - selected.length));
        }
    } else if (positiveValueQuestions.length < halfCount) {
        // Not enough positive — take all positive, fill with negative, then zero
        selected.push(...positiveValueQuestions);
        const remaining = targetCount - selected.length;
        selected.push(...negativeValueQuestions.slice(0, remaining));
        if (selected.length < targetCount) {
            selected.push(...zeroValueQuestions.slice(0, targetCount - selected.length));
        }
    } else {
        // Not enough negative — take all negative, fill with positive, then zero
        selected.push(...negativeValueQuestions);
        const remaining = targetCount - selected.length;
        selected.push(...positiveValueQuestions.slice(0, remaining));
        if (selected.length < targetCount) {
            selected.push(...zeroValueQuestions.slice(0, targetCount - selected.length));
        }
    }

    // Sort by question index for consistent ordering
    return selected.sort((a, b) => a.questionIndex - b.questionIndex);
}


/**
 * Identify the privilege theme of a question based on its text content.
 * Used internally to generate contextual explanations.
 *
 * @param {string} questionText - The question text
 * @returns {string} Theme identifier: 'economic', 'safety', 'identity', 'social', 'access'
 */
/**
 * Identify all privilege themes present in a question based on its text content.
 * Returns an array of themes to support intersectional analysis.
 *
 * @param {string} questionText - The question text
 * @returns {string[]} Array of theme identifiers: 'economic', 'safety', 'identity', 'social', 'access'
 */
function identifyPrivilegeThemes(questionText) {
    const themes = [];
    const text = (questionText || '').toLowerCase();

    // Identity indicators — checked first because identity questions often also
    // mention fear/violence, which would otherwise match the safety bucket.
    if (
        text.includes('race') || text.includes('gender') || text.includes('orientation') ||
        text.includes('skin color') || text.includes('mannerism') || text.includes('speech') ||
        text.includes('romantic partner') || text.includes('marry') || text.includes('affection') ||
        text.includes('representation') || text.includes('only person')
    ) {
        themes.push('identity');
    }

    // Economic / financial indicators
    if (
        text.includes('money') || text.includes('financial') || text.includes('loan') ||
        text.includes('clothes') || text.includes('dinner') || text.includes('vacation') ||
        text.includes('food') || text.includes('laid off') || text.includes('unemploy') ||
        text.includes('job') || text.includes('hired') || text.includes('work night')
    ) {
        themes.push('economic');
    }

    // Safety indicators
    if (
        text.includes('fear') || text.includes('assault') || text.includes('violence') ||
        text.includes('safe') || text.includes('police') || text.includes('walking home') ||
        text.includes('bullied') || text.includes('uncomfortable') || text.includes('confront')
    ) {
        themes.push('safety');
    }

    // Access / opportunity indicators
    if (
        text.includes('doctor') || text.includes('college') || text.includes('education') ||
        text.includes('book') || text.includes('travel') || text.includes('language') ||
        text.includes('culture') || text.includes('history') || text.includes('religious') ||
        text.includes('time off')
    ) {
        themes.push('access');
    }

    // Social / family / support
    if (
        text.includes('family') || text.includes('parent') || text.includes('friend') ||
        text.includes('support') || text.includes('relationship') || text.includes('community')
    ) {
        themes.push('social');
    }

    // Default to social if no themes identified
    return themes.length > 0 ? themes : ['social'];
}

/**
 * Get theme-specific context about how privilege changes over time.
 * @param {string} theme - Theme identifier
 * @returns {string} Context description
 */
function getThemeChangeContext(theme) {
    const contexts = {
        economic: 'Financial circumstances can shift due to job changes, economic conditions, or life events — what feels stable today may not always be.',
        safety: 'Feelings of safety can change based on where you live, who you are with, and the social climate around you.',
        identity: 'How your identity is perceived and treated varies across communities, cultures, and even day-to-day interactions.',
        social: 'Social support systems can strengthen or weaken over time depending on relationships, geography, and life transitions.',
        access: 'Access to resources like healthcare, education, and cultural connection depends on where you are and what systems are available to you.'
    };
    return contexts[theme] || contexts.social;
}

/**
 * Get theme-specific ally connection message.
 * @param {string} theme - Theme identifier
 * @returns {string} Ally connection message
 */
function getThemeAllyConnection(theme) {
    const connections = {
        economic: 'Being aware of economic privilege helps you support others facing financial hardship through mentorship, advocacy, or simply understanding their reality.',
        safety: 'Recognizing safety as a privilege empowers you to stand up for those who feel unsafe and to advocate for more inclusive, protective environments.',
        identity: 'Understanding identity-based privilege allows you to amplify marginalized voices and challenge biases when you encounter them.',
        social: 'Awareness of social privilege helps you extend your support network to those who may lack strong connections or family backing.',
        access: 'Recognizing access as a privilege motivates you to help remove barriers and share opportunities with those who face them.'
    };
    return connections[theme] || connections.social;
}

/**
 * Get theme display name for comprehensive explanations.
 * @param {string} theme - Theme identifier
 * @returns {string} Display name
 */
function getThemeDisplayName(theme) {
    const names = {
        economic: 'Economic',
        safety: 'Safety',
        identity: 'Identity',
        social: 'Social',
        access: 'Access'
    };
    return names[theme] || 'Social';
}

/**
 * Generate a single-theme explanation (focused style).
 * @param {string} theme - Primary theme
 * @param {boolean} hasPrivilege - Whether answer indicates privilege
 * @returns {string} Explanation text
 */
function generateSingleThemeExplanation(theme, hasPrivilege) {
    const privilegeStarters = [
        'Your answer suggests you have an advantage in this area — something not everyone can take for granted.',
        'This response indicates a form of privilege that many people don\'t experience.',
        'Your answer points to an advantage that isn\'t universally shared.',
        'This reflects an area where you benefit from circumstances others may not have.'
    ];

    const challengeStarters = [
        'Your answer reflects a challenge in this area — a reality that many people share but is often invisible to those who don\'t experience it.',
        'This response reveals a barrier that affects many but often goes unnoticed by those who don\'t face it.',
        'Your answer highlights a difficulty that\'s common yet frequently overlooked by those with different experiences.',
        'This reflects an obstacle that many navigate, though it may be invisible to those who don\'t encounter it.'
    ];

    const privilegeReveal = hasPrivilege
        ? privilegeStarters[Math.floor(Math.random() * privilegeStarters.length)]
        : challengeStarters[Math.floor(Math.random() * challengeStarters.length)];

    const change = getThemeChangeContext(theme);
    const ally = getThemeAllyConnection(theme);

    return `${privilegeReveal} ${change} ${ally}`;
}

/**
 * Generate a nuanced explanation blending two themes (intersectional).
 * @param {string[]} themes - Array of 2 themes
 * @param {boolean} hasPrivilege - Whether answer indicates privilege
 * @returns {string} Explanation text
 */
function generateNuancedExplanation(themes, hasPrivilege) {
    const [theme1, theme2] = themes;

    const privilegeStarters = [
        'Your answer suggests you have an advantage in this area — something not everyone can take for granted.',
        'This response indicates a form of privilege that many people don\'t experience.',
        'Your answer points to an advantage that isn\'t universally shared.'
    ];

    const challengeStarters = [
        'Your answer reflects a challenge in this area — a reality that many people share but is often invisible to those who don\'t experience it.',
        'This response reveals a barrier that affects many but often goes unnoticed by those who don\'t face it.',
        'Your answer highlights a difficulty that\'s common yet frequently overlooked by those with different experiences.'
    ];

    const privilegeReveal = hasPrivilege
        ? privilegeStarters[Math.floor(Math.random() * privilegeStarters.length)]
        : challengeStarters[Math.floor(Math.random() * challengeStarters.length)];

    // Intersectional connection templates
    const intersectionalConnections = {
        'identity-safety': 'how your identity is perceived affects whether you feel secure in public spaces, and these feelings can shift based on where you are and the social climate around you',
        'identity-economic': 'identity-based discrimination can create economic barriers, and financial circumstances can affect how your identity is perceived and treated',
        'identity-social': 'how your identity is perceived shapes your social connections and support systems, which in turn can strengthen or weaken over time',
        'identity-access': 'your identity affects access to resources and opportunities, and these access points depend on what systems are available to you',
        'economic-safety': 'financial stability affects your sense of safety and security, and both can change based on life circumstances and where you live',
        'economic-social': 'financial constraints can limit social participation, which affects your support networks and sense of belonging',
        'economic-access': 'economic circumstances determine access to resources like healthcare and education, creating interconnected barriers or advantages',
        'safety-social': 'feeling safe in your environment affects your ability to build social connections, and both depend on your community and relationships',
        'safety-access': 'safety concerns can limit access to opportunities and resources, and both vary based on where you are and what systems exist',
        'social-access': 'social support networks affect access to opportunities and resources, and both can strengthen or weaken based on life transitions'
    };

    // Create key for lookup (order-independent)
    const key1 = `${theme1}-${theme2}`;
    const key2 = `${theme2}-${theme1}`;
    const connection = intersectionalConnections[key1] || intersectionalConnections[key2] ||
        `these dimensions of privilege intersect in complex ways that vary across different contexts and life circumstances`;

    // Combine ally messages from both themes
    const ally1 = getThemeAllyConnection(theme1);
    const ally2 = getThemeAllyConnection(theme2);

    // Create a blended ally message
    const allyBlend = hasPrivilege
        ? `Understanding these intersecting privileges empowers you to ${ally1.split('helps you ')[1]?.split('.')[0] || 'support others'} and ${ally2.split('helps you ')[1]?.split('.')[0] || 'create positive change'}.`
        : `Recognizing these interconnected challenges helps you advocate for systemic change and support others facing similar barriers.`;

    return `${privilegeReveal} This question touches on both ${theme1} and ${theme2}: ${connection}. ${allyBlend}`;
}

/**
 * Generate a comprehensive multi-section explanation for all themes.
 * @param {string[]} themes - Array of all relevant themes
 * @param {boolean} hasPrivilege - Whether answer indicates privilege
 * @returns {string} Explanation text with sections
 */
function generateComprehensiveExplanation(themes, hasPrivilege) {
    const privilegeStarters = [
        'Your answer suggests you have an advantage in this area — something not everyone can take for granted.',
        'This response indicates a form of privilege that many people don\'t experience.'
    ];

    const challengeStarters = [
        'Your answer reflects a challenge in this area — a reality that many people share but is often invisible to those who don\'t experience it.',
        'This response reveals a barrier that affects many but often goes unnoticed by those who don\'t face it.'
    ];

    const privilegeReveal = hasPrivilege
        ? privilegeStarters[Math.floor(Math.random() * privilegeStarters.length)]
        : challengeStarters[Math.floor(Math.random() * challengeStarters.length)];

    // Build theme sections
    const themeSections = themes.map(theme => {
        const name = getThemeDisplayName(theme);
        const context = getThemeChangeContext(theme);
        return `${name}: ${context}`;
    }).join('\n\n');

    // Combine all ally connections
    const allyMessages = themes.map(theme => getThemeAllyConnection(theme));
    const allyIntro = hasPrivilege
        ? 'These privileges are interconnected. Being aware of these advantages empowers you to'
        : 'These challenges are interconnected. Understanding these barriers helps you to';

    const allyList = allyMessages
        .map(msg => msg.split('helps you ')[1]?.split('.')[0] || msg.split('allows you to ')[1]?.split('.')[0] || 'create positive change')
        .join(', ');

    return `${privilegeReveal} This question reveals intersecting dimensions of privilege:\n\n${themeSections}\n\n${allyIntro} ${allyList}.`;
}

/**
 * Generate a contextual explanation for a participant's response to a question.
 *
 * Each explanation covers:
 * - What the answer reveals about privilege in that context
 * - How this aspect of privilege can change across situations
 * - Why this matters for understanding others' experiences
 * - Connection to being an ally
 *
 * Supports multi-theme analysis based on debriefConfig settings.
 *
 * @param {Object} question - Question object with `text` and `value` properties
 * @param {number} answer - Participant's answer (1 = Yes, 0 = No)
 * @param {Object} config - Optional config override (defaults to debriefConfig)
 * @returns {string} Contextual explanation string
 *
 * Requirements: 6.3, 8.1, 8.2, 8.3, 8.4
 */
export function generateResponseExplanation(question, answer, config = debriefConfig) {
    // Guard against missing/invalid inputs
    if (!question || typeof question.text !== 'string' || !question.text) {
        return 'This question explores an aspect of privilege that can vary greatly depending on your circumstances and environment.';
    }

    // Determine whether the answer indicates privilege in this context
    const questionValue = question.value || 0;
    const hasPrivilegeHere = (questionValue > 0 && answer === 1) || (questionValue < 0 && answer === 0);

    // Check for question-specific overrides
    const override = config.questionOverrides?.[question.text];
    let themes = override?.themes || identifyPrivilegeThemes(question.text);
    const style = override?.style || config.explanationStyle;

    // Apply maxThemesPerResponse limit
    const maxThemes = config.maxThemesPerResponse || 2;
    themes = themes.slice(0, maxThemes);

    // Generate explanation based on style and number of themes
    if (style === 'comprehensive' && themes.length > 1) {
        return generateComprehensiveExplanation(themes, hasPrivilegeHere);
    } else if (style === 'nuanced' && themes.length === 2) {
        return generateNuancedExplanation(themes, hasPrivilegeHere);
    } else {
        // Focused style or single theme
        return generateSingleThemeExplanation(themes[0], hasPrivilegeHere);
    }
}



