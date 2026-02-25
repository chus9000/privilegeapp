/**
 * Free Play Analytics Module
 * 
 * Provides aggregated analytics for free play mode without showing individual participants.
 * Calculates score statistics, percentiles, and per-question response distributions.
 * 
 * Requirements: 2.8, 2.9, 2A.1, 2A.2, 2A.4
 */

/**
 * Load all free play responses from Firebase
 * Requirements: 15.5 - Log errors to console with context
 * @returns {Promise<Array>} Array of participant objects with score and answers
 */
async function loadFreePlayResponses() {
    try {
        console.log('[Analytics] Loading free play responses from Firebase...');
        
        // Load the freeplay event data
        const freeplayData = await window.FirebaseAPI.loadEvent('freeplay');
        
        if (!freeplayData || !freeplayData.participants) {
            console.log('⚠️ No free play responses found');
            return [];
        }
        
        console.log(`✅ Loaded ${freeplayData.participants.length} free play responses`);
        return freeplayData.participants;
        
    } catch (error) {
        // Requirements: 15.5 - Log Firebase errors to console for debugging
        console.error('❌ Firebase operation failed: loadFreePlayResponses', {
            operation: 'loadEvent',
            eventId: 'freeplay',
            error: error.message,
            errorCode: error.code,
            stack: error.stack
        });
        return [];
    }
}

/**
 * Calculate score statistics from all responses
 * @param {Array} responses - Array of participant objects
 * @returns {Object} Statistics object with mean, median, min, max, and distribution
 */
function calculateScoreStats(responses) {
    if (!responses || responses.length === 0) {
        return {
            mean: 0,
            median: 0,
            mode: 0,
            min: 0,
            max: 0,
            distribution: []
        };
    }
    
    // Extract scores
    const scores = responses.map(r => r.score);
    
    // Calculate mean
    const sum = scores.reduce((acc, score) => acc + score, 0);
    const mean = sum / scores.length;
    
    // Calculate median
    const sortedScores = [...scores].sort((a, b) => a - b);
    const median = sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
        : sortedScores[Math.floor(sortedScores.length / 2)];
    
    // Calculate min and max
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    
    // Calculate distribution (count of each score)
    const scoreFrequency = {};
    scores.forEach(score => {
        scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
    });
    
    // Calculate mode (most frequent score)
    const maxFrequency = Math.max(...Object.values(scoreFrequency));
    const modes = Object.keys(scoreFrequency).filter(score => scoreFrequency[score] === maxFrequency).map(Number);
    const mode = modes.length === 1 ? modes[0] : modes[0]; // Use first mode if multiple
    
    // Convert to array format for histogram
    const distribution = Object.entries(scoreFrequency)
        .map(([score, count]) => ({ score: parseInt(score), count }))
        .sort((a, b) => a.score - b.score);
    
    console.log('[Analytics] Score statistics:', { mean, median, mode, min, max, totalResponses: responses.length });
    
    return {
        mean: Math.round(mean * 10) / 10, // Round to 1 decimal place
        median,
        mode,
        min,
        max,
        distribution
    };
}

/**
 * Calculate percentile for user's score compared to all scores
 * @param {number} userScore - The user's score
 * @param {Array} allScores - Array of all scores
 * @returns {number} Percentile (0-100)
 */
function calculatePercentile(userScore, allScores) {
    if (!allScores || allScores.length === 0) {
        return 0;
    }
    
    // Count how many scores are less than or equal to the user's score
    const scoresLessThanOrEqual = allScores.filter(score => score <= userScore).length;
    
    // Calculate percentile
    const percentile = (scoresLessThanOrEqual / allScores.length) * 100;
    
    console.log(`📊 Percentile calculation: ${scoresLessThanOrEqual} out of ${allScores.length} scores <= ${userScore} = ${percentile.toFixed(1)}%`);
    
    return Math.round(percentile);
}

/**
 * Calculate per-question response statistics
 * @param {Array} responses - Array of participant objects with answers
 * @returns {Array} Array of question statistics with yes/no counts and percentages
 */
function calculateQuestionStats(responses) {
    if (!responses || responses.length === 0) {
        return [];
    }
    
    // Get questions from global questions array
    if (typeof questions === 'undefined') {
        console.error('❌ Questions array not found');
        return [];
    }
    
    const totalResponses = responses.length;
    const questionStats = [];
    
    // Calculate stats for each question
    questions.forEach((question, index) => {
        let yesCount = 0;
        let noCount = 0;
        
        // Count yes/no responses for this question
        responses.forEach(response => {
            if (!response.answers) return;
            
            // Handle both object format {16: 1} and array format
            let answer;
            if (Array.isArray(response.answers)) {
                answer = response.answers[index];
            } else {
                answer = response.answers[index.toString()] || response.answers[index];
            }
            
            if (answer === 1) {
                yesCount++;
            } else if (answer === 0) {
                noCount++;
            }
        });
        
        // Calculate percentages
        const answeredCount = yesCount + noCount;
        const yesPercentage = answeredCount > 0 ? (yesCount / answeredCount) * 100 : 0;
        const noPercentage = answeredCount > 0 ? (noCount / answeredCount) * 100 : 0;
        
        questionStats.push({
            questionIndex: index,
            questionText: question.text,
            questionValue: question.value,
            yesCount,
            noCount,
            yesPercentage: Math.round(yesPercentage),
            noPercentage: Math.round(noPercentage)
        });
    });
    
    console.log(`📊 Calculated question statistics for ${questionStats.length} questions`);
    
    return questionStats;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadFreePlayResponses,
        calculateScoreStats,
        calculatePercentile,
        calculateQuestionStats
    };
}

// Also expose globally for browser use
if (typeof window !== 'undefined') {
    window.loadFreePlayResponses = loadFreePlayResponses;
    window.calculateScoreStats = calculateScoreStats;
    window.calculatePercentile = calculatePercentile;
    window.calculateQuestionStats = calculateQuestionStats;
}
