/**
 * Score Page Module
 * 
 * Displays personalized debrief for the session participant who completed the questions.
 * Implements session-based access control and navigation to results pages.
 * 
 * Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.5, 4.2, 4.3, 7.1, 7.2, 7.3
 */

/**
 * Get event context from URL and sessionStorage
 * Requirements: 2.1, 2.2
 * @returns {Object} Object with eventId and participantId
 */
function getEventContext() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    const participantId = sessionStorage.getItem(`participant_${eventId}`);
    
    console.log('[Score] Event context:', { eventId, participantId });
    
    return { eventId, participantId };
}

/**
 * Validate that user is the session participant
 * Requirements: 2.1, 2.2, 8.2
 * @param {string} eventId - Event ID
 * @param {string} participantId - Participant ID from session
 * @returns {boolean} True if access is valid
 */
async function validateAccess(eventId, participantId) {
    if (!eventId) {
        console.warn('[Score] No event ID provided');
        redirectToHome();
        return false;
    }
    
    if (!participantId) {
        console.warn('[Score] No session participant found for event:', eventId);
        redirectToResults(eventId);
        return false;
    }
    
    console.log('[Score] Access validated for participant:', participantId);
    return true;
}

/**
 * Redirect to results page
 * Requirements: 2.2, 8.5
 * @param {string} eventId - Event ID
 */
function redirectToResults(eventId) {
    console.log('[Score] Redirecting to results page');
    window.location.href = `./results.html?id=${eventId}`;
}

/**
 * Redirect to home page
 */
function redirectToHome() {
    console.log('[Score] Redirecting to home page');
    window.location.href = '../';
}

/**
 * Load participant data from Firebase/localStorage
 * Requirements: 7.1, 7.4
 * @param {string} eventId - Event ID
 * @param {string} participantId - Participant ID
 * @returns {Promise<Object|null>} Participant data or null if not found
 */
async function loadParticipantData(eventId, participantId) {
    console.log('[Score] Loading participant data:', { eventId, participantId });
    
    try {
        // Load event data
        const eventData = await window.FirebaseAPI.loadEvent(eventId);
        
        if (!eventData || !eventData.participants) {
            console.warn('[Score] Event data not found in Firebase, trying localStorage');
            
            // Fallback to localStorage
            const localData = localStorage.getItem(`event_${eventId}`);
            if (localData) {
                const parsedData = JSON.parse(localData);
                if (parsedData && parsedData.participants) {
                    const participant = parsedData.participants.find(p => p.id === participantId);
                    if (participant) {
                        console.log('[Score] Participant loaded from localStorage');
                        return participant;
                    }
                }
            }
            
            console.error('[Score] Participant not found in Firebase or localStorage');
            return null;
        }
        
        // Find participant in event data
        const participant = eventData.participants.find(p => p.id === participantId);
        
        if (!participant) {
            console.error('[Score] Participant not found in event data:', {
                eventId,
                participantId,
                availableParticipants: eventData.participants.map(p => p.id)
            });
            return null;
        }
        
        console.log('[Score] Participant loaded successfully:', participant.name);
        return participant;
        
    } catch (error) {
        console.error('[Score] Error loading participant data:', error);
        console.error('[Score] Load error details:', {
            message: error.message,
            eventId,
            participantId
        });
        
        // Fallback to localStorage
        try {
            const localData = localStorage.getItem(`event_${eventId}`);
            if (localData) {
                const parsedData = JSON.parse(localData);
                if (parsedData && parsedData.participants) {
                    const participant = parsedData.participants.find(p => p.id === participantId);
                    if (participant) {
                        console.log('[Score] Participant loaded from localStorage fallback');
                        return participant;
                    }
                }
            }
        } catch (localError) {
            console.error('[Score] Error loading from localStorage:', localError);
        }
        
        return null;
    }
}

/**
 * Get spectrum configuration (min/max range)
 * Requirements: 7.1, 7.2
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Object with min and max values
 */
async function getSpectrumConfig(eventId) {
    console.log('[Score] Getting spectrum config for event:', eventId);
    
    try {
        // Load event data to get disabled questions
        const eventData = await window.FirebaseAPI.loadEvent(eventId);
        
        let disabledQuestions = [];
        if (eventData && eventData.disabledQuestions) {
            disabledQuestions = eventData.disabledQuestions;
        } else {
            // Fallback to localStorage
            const localData = localStorage.getItem(`event_${eventId}`);
            if (localData) {
                const parsedData = JSON.parse(localData);
                if (parsedData && parsedData.disabledQuestions) {
                    disabledQuestions = parsedData.disabledQuestions;
                }
            }
        }
        
        // Calculate spectrum range based on enabled questions
        const enabledQuestions = questions.filter((_, index) => !disabledQuestions.includes(index));
        
        let positiveSum = 0;
        let negativeSum = 0;
        
        enabledQuestions.forEach(question => {
            if (question.value > 0) {
                positiveSum += question.value;
            } else {
                negativeSum += Math.abs(question.value);
            }
        });
        
        const maxSum = Math.max(positiveSum, negativeSum);
        
        // Determine range based on maxSum
        let min, max;
        if (maxSum >= 20 && maxSum <= 25) {
            min = -25;
            max = 25;
        } else if (maxSum >= 15 && maxSum <= 19) {
            min = -20;
            max = 20;
        } else if (maxSum >= 10 && maxSum <= 14) {
            min = -15;
            max = 15;
        } else if (maxSum >= 5 && maxSum <= 9) {
            min = -10;
            max = 10;
        } else if (maxSum >= 1 && maxSum <= 4) {
            min = -5;
            max = 5;
        } else {
            min = -25;
            max = 25;
        }
        
        console.log('[Score] Spectrum config:', { min, max });
        return { min, max };
        
    } catch (error) {
        console.error('[Score] Error getting spectrum config:', error);
        // Return default range
        return { min: -25, max: 25 };
    }
}

/**
 * Get analytics data for stat cards
 * Requirements: 7.1, 7.2, 7.4
 * @param {string} eventId - Event ID
 * @param {number} userScore - User's score
 * @returns {Promise<Object|null>} Analytics data or null if unavailable
 */
async function getAnalyticsData(eventId, userScore) {
    console.log('[Score] Getting analytics data for event:', eventId);
    
    try {
        // Handle free play mode - load all freeplay responses for aggregate analytics
        if (eventId === 'freeplay') {
            console.log('[Score] Free play mode - loading aggregate analytics');
            
            // Import free-play analytics module
            const { loadFreePlayResponses, calculateScoreStats, calculatePercentile } = await import('../free-play-analytics.js');
            
            // Load all freeplay responses
            const responses = await loadFreePlayResponses();
            
            if (!responses || responses.length === 0) {
                console.log('[Score] No freeplay responses found - showing basic stats');
                return {
                    stats: {
                        mean: userScore,
                        median: userScore,
                        mode: userScore
                    },
                    percentile: 50,
                    totalParticipants: 1,
                    lessPrivilegedCount: 0
                };
            }
            
            // Calculate aggregate statistics
            const stats = calculateScoreStats(responses);
            const allScores = responses.map(r => r.score);
            const percentile = calculatePercentile(userScore, allScores);
            const lessPrivilegedCount = allScores.filter(s => s < userScore).length;
            
            console.log('[Score] Freeplay analytics calculated:', {
                totalParticipants: responses.length,
                stats,
                percentile
            });
            
            return {
                stats,
                percentile,
                totalParticipants: responses.length,
                lessPrivilegedCount
            };
        }
        
        // Load event data
        const eventData = await window.FirebaseAPI.loadEvent(eventId);
        
        if (!eventData || !eventData.participants || eventData.participants.length === 0) {
            console.warn('[Score] No participants found for analytics - showing basic stats');
            return {
                stats: {
                    mean: userScore,
                    median: userScore,
                    mode: userScore
                },
                percentile: 50,
                totalParticipants: 1,
                lessPrivilegedCount: 0
            };
        }
        
        const participants = eventData.participants;
        
        // If only one participant, still show their score in stats
        if (participants.length === 1) {
            console.log('[Score] Only one participant - showing basic stats');
            return {
                stats: {
                    mean: userScore,
                    median: userScore,
                    mode: userScore
                },
                percentile: 50,
                totalParticipants: 1,
                lessPrivilegedCount: 0
            };
        }
        
        const scores = participants.map(p => p.score);
        
        // Calculate statistics
        const sortedScores = [...scores].sort((a, b) => a - b);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const median = sortedScores.length % 2 === 0
            ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
            : sortedScores[Math.floor(sortedScores.length / 2)];
        
        // Calculate mode
        const scoreFrequency = {};
        scores.forEach(score => {
            scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
        });
        const maxFrequency = Math.max(...Object.values(scoreFrequency));
        const modes = Object.keys(scoreFrequency).filter(score => scoreFrequency[score] === maxFrequency).map(Number);
        const mode = modes[0];
        
        // Calculate percentile
        const lessPrivilegedCount = scores.filter(s => s < userScore).length;
        const percentile = Math.round((lessPrivilegedCount / scores.length) * 100);
        
        const analyticsData = {
            stats: {
                mean: Math.round(mean * 10) / 10,
                median,
                mode
            },
            percentile,
            totalParticipants: participants.length,
            lessPrivilegedCount
        };
        
        console.log('[Score] Analytics data calculated:', analyticsData);
        return analyticsData;
        
    } catch (error) {
        console.error('[Score] Error getting analytics data:', error);
        console.error('[Score] Analytics error details:', {
            message: error.message,
            eventId,
            userScore
        });
        // Return null to allow debrief to render without analytics
        return null;
    }
}

/**
 * Render participant header with avatar and name
 * Requirements: 1.3, 7.1
 * @param {Object} participant - Participant data
 */
function renderParticipantHeader(participant) {
    console.log('[Score] Rendering participant header');
    
    try {
        const headerHTML = `
            <div class="participant-info">
                <div class="participant-avatar-large">${participant.avatar || '😊'}</div>
                <h2 class="participant-name">${participant.name || 'Participant'}</h2>
            </div>
        `;
        
        const headerContainer = document.getElementById('participantHeader');
        if (headerContainer) {
            headerContainer.innerHTML = headerHTML;
            console.log('[Score] Participant header rendered successfully');
        } else {
            console.error('[Score] Participant header container not found in DOM');
        }
    } catch (error) {
        console.error('[Score] Error rendering participant header:', error);
        // Silently fail - header is supplementary
    }
}

/**
 * Render the complete debrief
 * Requirements: 1.3, 1.4, 7.2, 7.3, 7.4, 7.5
 * @param {Object} participant - Participant data
 * @param {string} eventId - Event ID
 * @param {Object} spectrumConfig - Spectrum min/max config
 */
async function renderDebrief(participant, eventId, spectrumConfig) {
    console.log('[Score] Rendering debrief for:', participant.name);
    
    try {
        // Validate participant data
        if (!participant || !participant.answers) {
            console.error('[Score] Missing participant data:', participant);
            showError('Unable to load your results. Your response data is missing.');
            return;
        }
        
        // Render participant header only in event mode (not in freeplay)
        const isFreePlay = eventId === 'freeplay';
        if (!isFreePlay) {
            renderParticipantHeader(participant);
        }
        
        // Get analytics data (may be null for free play or first participant)
        const analyticsData = await getAnalyticsData(eventId, participant.score);
        
        // Log if analytics unavailable (free play mode or first participant)
        if (!analyticsData) {
            console.log('[Score] Analytics data unavailable - displaying debrief without comparative statistics');
        }
        
        // Import debrief renderer
        const { renderFreePlayDebrief } = await import('../debrief-renderer.js');
        
        // Render debrief (handles null analyticsData gracefully)
        const debriefHTML = renderFreePlayDebrief(
            participant.score,
            participant.answers,
            spectrumConfig.min,
            spectrumConfig.max,
            questions,
            analyticsData
        );
        
        // Insert into container
        const debriefContainer = document.getElementById('debriefContainer');
        if (debriefContainer) {
            debriefContainer.innerHTML = debriefHTML;
            console.log('[Score] Debrief rendered successfully');
        } else {
            console.error('[Score] Debrief container not found in DOM');
            throw new Error('Debrief container element not found');
        }
        
    } catch (error) {
        console.error('[Score] Error rendering debrief:', error);
        // Log detailed error information without breaking the page
        console.error('[Score] Error details:', {
            message: error.message,
            stack: error.stack,
            participant: participant ? participant.id : 'unknown',
            eventId
        });
        showError('Unable to load your personalized debrief. Please try refreshing the page.');
    }
}

/**
 * Render ally tips
 * Requirements: 1.3, 7.5
 * @param {number} score - User's score
 * @param {number} min - Spectrum minimum
 * @param {number} max - Spectrum maximum
 */
function renderAllyTips(score, min, max) {
    console.log('[Score] Rendering ally tips');
    
    try {
        const tips = getTipsForScore(score, min, max);
        const category = categorizeScore(score, min, max);
        const tipsHTML = renderTips(tips, category);
        
        const allyTipsContainer = document.getElementById('allyTipsContainer');
        if (allyTipsContainer) {
            allyTipsContainer.innerHTML = tipsHTML;
            console.log('[Score] Ally tips rendered successfully');
        } else {
            console.error('[Score] Ally tips container not found in DOM');
        }
        
    } catch (error) {
        console.error('[Score] Error rendering ally tips:', error);
        // Log error but don't break the page - ally tips are supplementary
        console.error('[Score] Ally tips error details:', {
            message: error.message,
            score,
            min,
            max
        });
        // Silently fail - debrief is more important than ally tips
    }
}

/**
 * Setup navigation button handlers
 * Requirements: 4.2, 4.3, 4.5
 * @param {string} eventId - Event ID
 */
function setupNavigation(eventId) {
    console.log('[Score] Setting up navigation for event:', eventId);
    
    const viewResultsBtn = document.getElementById('viewResultsBtn');
    const viewDetailedBtn = document.getElementById('viewDetailedBtn');
    const isFreePlay = eventId === 'freeplay';
    
    // Hide navigation buttons in free play mode (no group to compare with)
    if (isFreePlay) {
        console.log('[Score] Free play mode - hiding navigation buttons');
        if (viewResultsBtn) {
            viewResultsBtn.style.display = 'none';
        }
        if (viewDetailedBtn) {
            viewDetailedBtn.style.display = 'none';
        }
        return;
    }
    
    // Setup navigation for event mode
    if (viewResultsBtn) {
        viewResultsBtn.onclick = () => {
            console.log('[Score] Navigating to results page');
            window.location.href = `./results.html?id=${eventId}`;
        };
    }
    
    if (viewDetailedBtn) {
        viewDetailedBtn.onclick = () => {
            console.log('[Score] Navigating to detailed results page');
            window.location.href = `./detailed-results.html?id=${eventId}`;
        };
    }
}

/**
 * Show error message to user
 * Requirements: 7.4, 7.5
 * @param {string} message - Error message to display
 */
function showError(message) {
    const debriefContainer = document.getElementById('debriefContainer');
    if (debriefContainer) {
        debriefContainer.innerHTML = `
            <div class="error-message">
                <h2>⚠️ Error</h2>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
            </div>
        `;
    }
}

/**
 * Main initialization function
 * Requirements: 1.1, 2.1, 2.2, 7.1, 7.4, 7.5
 */
async function initialize() {
    console.log('[Score] Initializing score page');
    
    try {
        // Get event context
        const { eventId, participantId } = getEventContext();
        
        // Validate access
        const hasAccess = await validateAccess(eventId, participantId);
        if (!hasAccess) {
            return;
        }
        
        // Load participant data
        const participant = await loadParticipantData(eventId, participantId);
        if (!participant) {
            console.error('[Score] Failed to load participant data');
            showError('Unable to load your results. Your response data may not have been saved properly.');
            // Still setup navigation so user can navigate away
            setupNavigation(eventId);
            return;
        }
        
        // Get spectrum configuration
        const spectrumConfig = await getSpectrumConfig(eventId);
        
        // Render debrief (handles errors internally)
        await renderDebrief(participant, eventId, spectrumConfig);
        
        // Render ally tips (handles errors internally)
        renderAllyTips(participant.score, spectrumConfig.min, spectrumConfig.max);
        
        // Setup navigation
        setupNavigation(eventId);
        
        console.log('[Score] Initialization complete');
        
    } catch (error) {
        console.error('[Score] Initialization error:', error);
        console.error('[Score] Initialization error details:', {
            message: error.message,
            stack: error.stack
        });
        showError('An unexpected error occurred. Please try refreshing the page.');
        
        // Try to setup navigation even if initialization fails
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('id');
            if (eventId) {
                setupNavigation(eventId);
            }
        } catch (navError) {
            console.error('[Score] Failed to setup navigation:', navError);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
