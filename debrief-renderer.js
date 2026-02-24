/**
 * Debrief Renderer Module
 * 
 * Renders personalized debrief sections for the results page.
 * Displays score meaning, response analysis, and integrates with existing ally tips.
 */

import {
    categorizePrivilegeScore,
    generateScoreDebrief,
    selectResponsesForAnalysis,
    generateResponseExplanation
} from './debrief-engine.js';

/**
 * Render stat cards showing score comparisons
 * @param {number} userScore - Participant's score
 * @param {Object} stats - Statistics object with median, mean, etc.
 * @param {number} percentile - User's percentile ranking
 * @param {number} totalParticipants - Total number of participants
 * @param {number} lessPrivilegedCount - Number of participants with lower scores
 * @returns {string} HTML string for stat cards
 */
export function renderStatCards(userScore, stats = {}, percentile = null, totalParticipants = 0, lessPrivilegedCount = 0) {
    const median = stats.median || 0;
    const mean = stats.mean || 0;
    const mode = stats.mode || mean; // Fallback to mean if mode not provided
    
    // Calculate differences
    const vsMedian = userScore - median;
    const vsMode = userScore - mode;
    
    // Format differences with + or - sign
    const formatDiff = (diff) => {
        if (diff > 0) return `+${diff}`;
        return `${diff}`;
    };
    
    // Calculate percentage differences
    const vsMedianPercent = median !== 0 ? Math.round((vsMedian / Math.abs(median)) * 100) : 0;
    const vsModePercent = mode !== 0 ? Math.round((vsMode / Math.abs(mode)) * 100) : 0;
    
    return `<div class="stat-cards-container">
        <div class="stat-card stat-card-primary">
            <div class="stat-card-label">TOTAL SCORE</div>
            <div class="stat-card-value">${formatDiff(userScore)}</div>
            <div class="stat-card-badge">RELATIVE INDEX</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            </div>
            <div class="stat-card-label">VS. OTHERS</div>
            <div class="stat-card-value">${totalParticipants > 1 ? `${lessPrivilegedCount}/${totalParticipants}` : '0/1'}</div>
            <div class="stat-card-subtitle">participants</div>
            <div class="stat-card-description">${totalParticipants > 1 ? 'are less privileged than you' : 'you are the first participant'}</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon stat-card-icon-orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <div class="stat-card-label">VS. MODE</div>
            <div class="stat-card-value">${formatDiff(vsMode)} points</div>
            <div class="stat-card-subtitle stat-card-subtitle-orange">${Math.abs(vsModePercent)}% ${vsMode >= 0 ? 'above' : 'below'} common</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon stat-card-icon-green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="20" x2="12" y2="10"></line>
                    <line x1="18" y1="20" x2="18" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="16"></line>
                </svg>
            </div>
            <div class="stat-card-label">VS. MEDIAN</div>
            <div class="stat-card-value">${formatDiff(vsMedian)} points</div>
            <div class="stat-card-subtitle stat-card-subtitle-green">${Math.abs(vsMedianPercent)}% ${vsMedian >= 0 ? 'above' : 'below'} average</div>
        </div>
    </div>`;
}

/**
 * Render score meaning section
 * @param {Object} debrief - Debrief object from generateScoreDebrief with title, message, and category
 * @returns {string} HTML string for score meaning section
 */
export function renderScoreMeaning(debrief) {
    if (!debrief || typeof debrief !== 'object') {
        console.warn('[debrief-renderer] renderScoreMeaning: invalid debrief object, using fallback');
        return `<div class="debrief-section score-meaning" data-category="neutral">
    <h2>Understanding Your Score</h2>
    <div class="debrief-content" data-category="neutral" data-category-label="Your Experience">
        <h3>Understanding Your Score</h3>
        <p>Your score reflects your unique combination of circumstances and experiences.</p>
    </div>
</div>`;
    }

    const title = debrief.title || '';
    const message = debrief.message || '';
    const category = debrief.category || 'neutral';
    
    // Category labels for badge
    const categoryLabels = {
        'low': 'Your Journey',
        'neutral': 'Mixed Experience',
        'high': 'Your Advantages'
    };
    const categoryLabel = categoryLabels[category] || 'Your Experience';

    return `<div class="debrief-section score-meaning" data-category="${category}">
    <h2>Understanding Your Score</h2>
    <div class="debrief-content" data-category="${category}" data-category-label="${categoryLabel}">
        <h3>${title}</h3>
        <p>${message}</p>
    </div>
</div>`;
}

/**
 * Render response analysis section
 * @param {Array} analyzedResponses - Array of analyzed response objects
 * @returns {string} HTML string for response analysis section
 */
export function renderResponseAnalysis(analyzedResponses) {
    const responses = Array.isArray(analyzedResponses) ? analyzedResponses : [];

    const cards = responses.map(response => {
        const questionText = response.questionText || '';
        const answerText = response.userAnswerText || (response.userAnswer === 1 ? 'Yes' : 'No');
        const explanation = response.explanation || '';

        return `        <div class="response-card">
            <div class="question-text">${questionText}</div>
            <div class="your-answer">Your answer: ${answerText}</div>
            <div class="explanation">${explanation}</div>
        </div>`;
    }).join('\n');

    return `<div class="debrief-section response-analysis">
    <h2>Understanding Privilege in Context</h2>
    <div class="response-cards">
${cards}
    </div>
</div>`;
}

/**
 * Render complete debrief UI for free play mode.
 * Orchestrates debrief engine calls and assembles all sections.
 *
 * @param {number} score - Participant's score
 * @param {Object|Array} answers - Participant's answers
 * @param {number} min - Spectrum minimum
 * @param {number} max - Spectrum maximum
 * @param {Array} [questionsArr] - Questions array; falls back to global `questions` if omitted
 * @param {Object} [analyticsData] - Optional analytics data for stat cards {stats, percentile, totalParticipants}
 * @returns {string} HTML string wrapped in a .debrief-container div
 *
 * Requirements: 12.1, 12.2, 12.3
 */
export function renderFreePlayDebrief(score, answers, min, max, questionsArr, analyticsData = null) {
    try {
        // Resolve questions: prefer explicit param, fall back to global
        const qs = questionsArr || (typeof questions !== 'undefined' ? questions : []);

        // 1. Render stat cards if analytics data is provided
        let statCardsHtml = '';
        console.log('[debrief-renderer] analyticsData:', analyticsData);
        if (analyticsData && analyticsData.stats) {
            console.log('[debrief-renderer] Rendering stat cards with:', {
                score,
                stats: analyticsData.stats,
                percentile: analyticsData.percentile,
                totalParticipants: analyticsData.totalParticipants,
                lessPrivilegedCount: analyticsData.lessPrivilegedCount
            });
            statCardsHtml = renderStatCards(
                score,
                analyticsData.stats,
                analyticsData.percentile,
                analyticsData.totalParticipants,
                analyticsData.lessPrivilegedCount || 0
            );
            console.log('[debrief-renderer] Stat cards HTML length:', statCardsHtml.length);
        } else {
            console.log('[debrief-renderer] No analytics data provided, skipping stat cards');
        }

        // 2. Categorize the score
        const category = categorizePrivilegeScore(score, min, max);

        // 3. Generate score debrief message
        const debrief = generateScoreDebrief(category, score);

        // 4. Select responses for analysis and generate explanations
        const selected = selectResponsesForAnalysis(answers, qs);
        const analyzedResponses = selected.map(item => {
            const explanation = generateResponseExplanation(
                { text: item.questionText, value: item.questionValue },
                item.userAnswer
            );
            return {
                ...item,
                userAnswerText: item.userAnswer === 1 ? 'Yes' : 'No',
                explanation
            };
        });

        // 5. Render sections in correct order: stat cards, score meaning, response analysis
        const scoreMeaningHtml = renderScoreMeaning(debrief);
        const responseAnalysisHtml = renderResponseAnalysis(analyzedResponses);

        return `<div class="debrief-container">
${statCardsHtml}
${scoreMeaningHtml}
${responseAnalysisHtml}
</div>`;
    } catch (error) {
        console.error('[debrief-renderer] renderFreePlayDebrief error:', error);
        return '<div class="debrief-container"><p class="debrief-error">Unable to load personalized debrief. Your results are still available above.</p></div>';
    }
}

/**
 * Render debrief UI for event mode modal.
 * Extracts score and answers from participant data and generates compact debrief sections.
 *
 * @param {Object} participant - Participant data with score and answers properties
 * @param {number} min - Spectrum minimum
 * @param {number} max - Spectrum maximum
 * @param {Array} [questionsArr] - Questions array; falls back to global `questions` if omitted
 * @param {Object} [analyticsData] - Optional analytics data for stat cards {stats, percentile, totalParticipants}
 * @returns {string} HTML string wrapped in a .debrief-container div
 *
 * Requirements: 13.1, 13.2, 13.3
 */
export function renderModalDebrief(participant, min, max, questionsArr, analyticsData = null) {
    try {
        const score = (participant && typeof participant.score === 'number') ? participant.score : 0;
        const answers = (participant && participant.answers) ? participant.answers : {};

        // Resolve questions: prefer explicit param, fall back to global
        const qs = questionsArr || (typeof questions !== 'undefined' ? questions : []);

        // 1. Render stat cards if analytics data is provided
        let statCardsHtml = '';
        console.log('[debrief-renderer] Modal analyticsData:', analyticsData);
        if (analyticsData && analyticsData.stats) {
            console.log('[debrief-renderer] Rendering modal stat cards with:', {
                score,
                stats: analyticsData.stats,
                percentile: analyticsData.percentile,
                totalParticipants: analyticsData.totalParticipants,
                lessPrivilegedCount: analyticsData.lessPrivilegedCount
            });
            statCardsHtml = renderStatCards(
                score,
                analyticsData.stats,
                analyticsData.percentile,
                analyticsData.totalParticipants,
                analyticsData.lessPrivilegedCount || 0
            );
            console.log('[debrief-renderer] Modal stat cards HTML length:', statCardsHtml.length);
        } else {
            console.log('[debrief-renderer] No analytics data provided for modal, skipping stat cards');
        }

        // 2. Categorize the score
        const category = categorizePrivilegeScore(score, min, max);

        // 3. Generate score debrief message
        const debrief = generateScoreDebrief(category, score);

        // 4. Select responses for analysis and generate explanations
        const selected = selectResponsesForAnalysis(answers, qs);
        const analyzedResponses = selected.map(item => {
            const explanation = generateResponseExplanation(
                { text: item.questionText, value: item.questionValue },
                item.userAnswer
            );
            return {
                ...item,
                userAnswerText: item.userAnswer === 1 ? 'Yes' : 'No',
                explanation
            };
        });

        // 5. Render sections in correct order: stat cards, score meaning, response analysis
        const scoreMeaningHtml = renderScoreMeaning(debrief);
        const responseAnalysisHtml = renderResponseAnalysis(analyzedResponses);

        return `<div class="debrief-container">
${statCardsHtml}
${scoreMeaningHtml}
${responseAnalysisHtml}
</div>`;
    } catch (error) {
        console.error('[debrief-renderer] renderModalDebrief error:', error);
        return '<div class="debrief-container"><p class="debrief-error">Unable to load personalized debrief. Your results are still available above.</p></div>';
    }
}
