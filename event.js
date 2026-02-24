const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');
const isFreePlayMode = eventId === 'freeplay';
let eventData;
let participant;

// Debug logging
console.log('🔍 DEBUG: URL params:', window.location.search);
console.log('🔍 DEBUG: eventId:', eventId);
console.log('🔍 DEBUG: isFreePlayMode:', isFreePlayMode);

// Wait for DOM to be ready before loading event data
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadEventData);
} else {
    // DOM is already ready
    loadEventData();
}

async function loadEventData() {
    // Handle free play mode
    if (isFreePlayMode) {
        console.log('🎮 Free play mode detected');
        // Create a virtual event for free play with all questions enabled
        eventData = {
            title: 'Free Play',
            pin: null, // No PIN needed for free play
            disabledQuestions: [],
            participants: []
        };
        // Skip PIN entry and go directly to questions
        document.getElementById('pinContainer').style.display = 'none';
        document.getElementById('eventContent').style.display = 'block';
        loadEvent();
        return;
    }
    
    // Requirement 6.4: Load event's custom question set from Firebase
    // Try Firebase first for regular events
    try {
        eventData = await window.FirebaseAPI.loadEvent(eventId);
        if (eventData) {
            console.log('✅ Event loaded from Firebase:', eventData.title);
            
            // Verify event has required fields (Requirement 6.1)
            if (!eventData.pin) {
                console.error('❌ Event missing PIN field');
                showEventError('Event configuration is invalid. Please contact the event creator.');
                return;
            }
        } else {
            console.log('⚠️ Event not found in Firebase');
        }
    } catch (error) {
        // Requirements: 15.2, 15.5 - Log Firebase errors with context
        console.error('❌ Firebase operation failed: loadEvent', {
            operation: 'loadEvent',
            eventId: eventId,
            error: error.message,
            errorCode: error.code,
            stack: error.stack
        });
        // Continue to localStorage fallback
    }
    
    // Fallback to localStorage
    if (!eventData) {
        eventData = JSON.parse(localStorage.getItem(`event_${eventId}`) || 'null');
        if (eventData) {
            console.log('📁 Event loaded from localStorage:', eventData.title);
        }
    }
    
    // Requirement 15.3: Display "Event not found" message
    if (!eventData) {
        console.error('❌ Event not found for ID:', eventId);
        showEventError(`Event not found (ID: ${eventId})`);
    } else {
        // Event exists, show PIN entry screen (Requirement 6.1)
        setupPinEntry();
    }
}

/**
 * Display event error message
 * Requirement 15.3: Display error when event not found
 */
function showEventError(message) {
    document.body.innerHTML = `
        <div class="logo-header event-logo">
            <div class="logo-small">            
                <div class="logo-small-line-2">Privilege</div>
                <div class="logo-small-line-3">Spectrum</div>
            </div>
        </div>
        <div class="container">
            <div class="card">
                <h1>⚠️ Error</h1>
                <p>${message}</p>
                <button onclick="window.location.href='../'">Return to Home</button>
            </div>
        </div>
    `;
}

function setupPinEntry() {
    // Display event title on PIN screen
    document.getElementById('eventTitlePin').textContent = eventData.title;
    
    // Check if participant already exists for this event
    const savedParticipant = localStorage.getItem(`participant_${eventId}`);
    if (savedParticipant) {
        participant = JSON.parse(savedParticipant);
        // Store session participant ID for score page access validation
        storeSessionParticipant(eventId, participant.id);
        document.getElementById('pinContainer').style.display = 'none';
        document.getElementById('eventContent').style.display = 'block';
        loadEvent();
        return;
    }
    
    // Track failed PIN attempts for rate limiting
    let failedAttempts = 0;
    const MAX_ATTEMPTS = 5;
    
    document.getElementById('submitPin').addEventListener('click', () => {
        const enteredPin = document.getElementById('pinInput').value.trim();
        
        // Requirement 15.6: Validate required field
        if (!enteredPin) {
            showPinError('Please enter a PIN');
            return;
        }
        
        console.log('Entered PIN:', enteredPin, 'Expected:', eventData.pin);
        
        // Verify PIN (Requirements 6.2, 6.3)
        if (enteredPin === eventData.pin.toString()) {
            console.log('✅ PIN correct, loading event...');
            clearPinError();
            document.getElementById('pinContainer').style.display = 'none';
            document.getElementById('eventContent').style.display = 'block';
            loadEvent();
        } else {
            console.log('❌ PIN incorrect');
            failedAttempts++;
            
            // Rate limiting after max attempts (Requirement 15.4)
            if (failedAttempts >= MAX_ATTEMPTS) {
                showPinError('Too many failed attempts. Please wait a moment before trying again.');
                document.getElementById('submitPin').disabled = true;
                document.getElementById('pinInput').disabled = true;
                
                // Re-enable after 30 seconds
                setTimeout(() => {
                    document.getElementById('submitPin').disabled = false;
                    document.getElementById('pinInput').disabled = false;
                    failedAttempts = 0;
                    clearPinError();
                }, 30000);
            } else {
                showPinError('Invalid PIN. Please try again.');
            }
            
            document.getElementById('pinInput').value = '';
            document.getElementById('pinInput').focus();
        }
    });
    
    // Allow Enter key to submit PIN
    document.getElementById('pinInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('submitPin').click();
        }
    });
}

/**
 * Display PIN error message
 * Requirement 6.3, 15.6: Display error on incorrect PIN and validate required fields
 */
function showPinError(message) {
    const errorDiv = document.getElementById('pinError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

/**
 * Clear PIN error message
 */
function clearPinError() {
    const errorDiv = document.getElementById('pinError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

async function loadEvent() {
    // Hide title for free play mode, show for regular events
    const eventTitleElement = document.getElementById('eventTitle');
    if (isFreePlayMode) {
        eventTitleElement.style.display = 'none';
    } else {
        eventTitleElement.textContent = eventData.title;
    }
    
    // Use disabled questions from event data if available, otherwise fall back to current localStorage
    let disabledQuestions = [];
    if (eventData.disabledQuestions && Array.isArray(eventData.disabledQuestions)) {
        // Use the disabled questions that were saved with this specific event
        disabledQuestions = eventData.disabledQuestions;
        console.log('📋 Using disabled questions from event data:', disabledQuestions);
    } else {
        // Fallback for older events that don't have disabled questions stored
        disabledQuestions = JSON.parse(localStorage.getItem('disabledQuestions') || '[]');
        eventData.disabledQuestions = disabledQuestions;
        console.log('📋 Fallback: Using current disabled questions for older event:', disabledQuestions);
        
        // Save updated event data
        localStorage.setItem(`event_${eventId}`, JSON.stringify(eventData));
        
        // Also try to save to Firebase if available
        if (window.FirebaseAPI && window.FirebaseAPI.saveEvent) {
            try {
                await window.FirebaseAPI.saveEvent(eventId, eventData);
                console.log('✅ Disabled questions saved to Firebase');
            } catch (error) {
                // Requirements: 15.2, 15.5 - Log Firebase errors with context
                console.error('❌ Firebase operation failed: saveEvent (disabled questions)', {
                    operation: 'saveEvent',
                    eventId: eventId,
                    error: error.message,
                    errorCode: error.code,
                    stack: error.stack
                });
                // Continue - localStorage save already succeeded
            }
        }
    }
    
    // Use existing participant or generate new one
    if (!participant) {
        participant = generateParticipant();
        localStorage.setItem(`participant_${eventId}`, JSON.stringify(participant));
        
        // Add new participant to event data and save to Firebase
        const existingIndex = eventData.participants.findIndex(p => p.id === participant.id);
        if (existingIndex === -1) {
            eventData.participants.push(participant);
            // Don't call updateParticipant here to avoid async issues during initial load
            localStorage.setItem(`event_${eventId}`, JSON.stringify(eventData));
        }
    } else {
        // For existing participants, ensure they have an ID (backward compatibility)
        if (!participant.id) {
            participant.id = generateUniqueId();
            localStorage.setItem(`participant_${eventId}`, JSON.stringify(participant));
        }
        
        // For existing participants, ensure they have a timestamp (backward compatibility)
        if (!participant.createdAt) {
            participant.createdAt = new Date().toISOString();
            localStorage.setItem(`participant_${eventId}`, JSON.stringify(participant));
        }
    }
    
    // Store session participant ID for score page access validation
    storeSessionParticipant(eventId, participant.id);
    
    // Hide participant card for free play mode (anonymous)
    if (isFreePlayMode) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
        }
        // Make main content full width for free play
        const eventLayout = document.querySelector('.event-layout');
        if (eventLayout) {
            eventLayout.style.display = 'block';
        }
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.maxWidth = '800px';
            mainContent.style.margin = '0 auto';
        }
    } else {
        // Show participant info for regular events
        document.getElementById('participantName').textContent = participant.name;
        document.getElementById('participantAvatar').textContent = participant.avatar;
    }
    
    const questionsContainer = document.getElementById('questionsContainer');
    
    // Filter out disabled questions
    const enabledQuestions = questions.filter((_, index) => !disabledQuestions.includes(index));
    
    enabledQuestions.forEach((question, displayIndex) => {
        const originalIndex = questions.indexOf(question);
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-block';
        questionDiv.style.animationDelay = `${displayIndex * 0.05}s`;
        questionDiv.innerHTML = `
            <div class="question-header-row">
                <span class="question-number-badge">${displayIndex + 1}</span>
                <h4>${question.text}</h4>
            </div>
            <div class="question-options">
                <div class="question-option" onclick="selectAnswer(${originalIndex}, 1, this)" id="q${originalIndex}_yes">
                    <span>Yes</span>
                </div>
                <div class="question-option" onclick="selectAnswer(${originalIndex}, 0, this)" id="q${originalIndex}_no">
                    <span>No</span>
                </div>
            </div>
        `;
        questionsContainer.appendChild(questionDiv);
    });
    
    // Update progress text with actual enabled question count
    const enabledCount = questions.length - disabledQuestions.length;
    document.getElementById('progressText').textContent = `0/${enabledCount} completed`;
    
    // Build results link with relative path
    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    document.getElementById('resultsLink').href = `./score.html?id=${eventId}`;
    
    // Restore answers after questions are rendered
    restoreAnswers();
    
    // Initialize progress after loading questions
    initializeProgress();
}

function selectAnswer(questionIndex, answer, element) {
    participant.answers = participant.answers || {};
    participant.answers[questionIndex] = answer;
    
    // Update selection state
    document.getElementById(`q${questionIndex}_yes`).classList.remove('selected');
    document.getElementById(`q${questionIndex}_no`).classList.remove('selected');
    element.classList.add('selected');
    
    // Update number badge to answered state
    const questionBlock = element.closest('.question-block');
    if (questionBlock) {
        const badge = questionBlock.querySelector('.question-number-badge');
        if (badge) badge.classList.add('answered');
    }
    
    // Calculate score
    participant.score = 0;
    questions.forEach((question, index) => {
        if (participant.answers[index] === 1) {
            // "Yes" answer: add the question value (positive or negative)
            participant.score += question.value;
        }
        // "No" answer: add nothing (0 points)
    });
    
    updateProgress();
    updateParticipant();
}

function updateProgress() {
    const answered = Object.keys(participant.answers || {}).length;
    // Use the disabled questions from this specific event, not current localStorage
    const disabledQuestions = eventData.disabledQuestions || [];
    const total = questions.length - disabledQuestions.length;
    const percentage = (answered / total) * 100;
    
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `${answered}/${total} completed`;
    
    // Update percentage display
    const percentageEl = document.getElementById('progressPercentage');
    if (percentageEl) {
        percentageEl.textContent = `${Math.round(percentage)}%`;
    }
    
    // Check if all questions answered
    const resultsLink = document.getElementById('resultsLink');
    if (answered === total) {
        resultsLink.classList.remove('disabled');
        resultsLink.style.pointerEvents = 'auto';
    }
}

function restoreAnswers() {
    // Restore answers and update UI after questions are rendered
    if (participant && participant.answers) {
        Object.keys(participant.answers).forEach(questionIndex => {
            const answer = participant.answers[questionIndex];
            const selectedElement = document.getElementById(`q${questionIndex}_${answer === 1 ? 'yes' : 'no'}`);
            if (selectedElement) {
                selectedElement.classList.add('selected');
                // Restore badge answered state
                const questionBlock = selectedElement.closest('.question-block');
                if (questionBlock) {
                    const badge = questionBlock.querySelector('.question-number-badge');
                    if (badge) badge.classList.add('answered');
                }
            }
        });
    }
}

function initializeProgress() {
    // Initialize progress on page load
    if (participant && participant.answers) {
        updateProgress();
    }
}

/**
 * Helper function to sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Update participant data with retry logic
 * Saves participant responses to Firebase with exponential backoff retry
 * Requirements: 6.6
 */
async function updateParticipant() {
    console.log('🔄 updateParticipant called for:', isFreePlayMode ? 'Free Play' : participant.name, 'Score:', participant.score);
    console.log('🔄 Current eventData participants:', eventData.participants.length);
    
    // Update local eventData first
    const existingIndex = eventData.participants.findIndex(p => p.id === participant.id);
    if (existingIndex >= 0) {
        console.log('🔄 Updating existing participant at index:', existingIndex);
        eventData.participants[existingIndex] = participant;
    } else {
        console.log('➕ Adding new participant to eventData');
        eventData.participants.push(participant);
    }
    
    console.log('📊 Updated eventData participants count:', eventData.participants.length);
    console.log('📊 All participants:', eventData.participants.map(p => ({ name: p.name || 'Anonymous', score: p.score })));
    
    // Save to localStorage immediately for offline functionality
    console.log('💾 Saving to localStorage...');
    localStorage.setItem(`event_${eventId}`, JSON.stringify(eventData));
    localStorage.setItem(`participant_${eventId}`, JSON.stringify(participant));
    console.log('✅ Saved to localStorage');
    
    // Handle Firebase save differently for free play mode
    if (isFreePlayMode) {
        // For free play, save anonymous response (only score and answers) with retry
        await saveFreePlayResponseWithRetry(participant);
    } else {
        // For regular events, use the standard updateParticipant method with retry
        await saveParticipantWithRetry(eventId, participant);
    }
}

/**
 * Save participant data to Firebase with retry logic
 * Implements exponential backoff for failed save attempts
 * Requirements: 6.6, 15.2, 15.5
 * @param {string} eventId - The event ID
 * @param {object} participant - The participant data
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 */
async function saveParticipantWithRetry(eventId, participant, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔥 Attempting Firebase update (attempt ${attempt}/${maxRetries})...`);
            const success = await window.FirebaseAPI.updateParticipant(eventId, participant);
            
            if (success) {
                console.log('✅ Participant updated in Firebase successfully');
                return true;
            } else {
                console.warn(`⚠️ Firebase participant update returned false (attempt ${attempt}/${maxRetries})`);
                
                if (attempt === maxRetries) {
                    console.error('❌ Failed to save participant after maximum retries');
                    return false;
                }
                
                // Exponential backoff: 2^attempt seconds
                const backoffMs = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
                await sleep(backoffMs);
            }
        } catch (error) {
            // Requirements: 15.2, 15.5 - Log Firebase errors with context
            console.error(`❌ Firebase operation failed: updateParticipant (attempt ${attempt}/${maxRetries})`, {
                operation: 'updateParticipant',
                eventId: eventId,
                participantId: participant.id,
                participantName: participant.name,
                attempt: attempt,
                maxRetries: maxRetries,
                error: error.message,
                errorCode: error.code,
                stack: error.stack
            });
            
            // Check for permission denied - don't retry
            if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                console.error('❌ Permission denied - stopping retries');
                // Requirements: 15.1 - Display user-friendly error message
                showErrorNotification('Unable to save your responses. Please check your connection and try again.');
                return false;
            }
            
            if (attempt === maxRetries) {
                console.error('❌ Failed to save participant after maximum retries');
                // Requirements: 15.2 - Display retry option to user
                showErrorNotification(
                    'Failed to save your responses. Your answers are saved locally.',
                    () => {
                        // Retry callback - attempt to save again
                        console.log('🔄 User requested retry...');
                        saveParticipantWithRetry(eventId, participant, maxRetries);
                    }
                );
                return false;
            }
            
            // Exponential backoff: 2^attempt seconds
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
            await sleep(backoffMs);
        }
    }
    
    return false;
}

/**
 * Save free play response to Firebase with retry logic
 * Implements exponential backoff for failed save attempts
 * Requirements: 2.7, 6.6, 15.2, 15.5
 * @param {object} participant - The participant data
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 */
async function saveFreePlayResponseWithRetry(participant, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🎮 Saving free play response to Firebase (attempt ${attempt}/${maxRetries})...`);
            const success = await saveFreePlayResponse(participant);
            
            if (success) {
                console.log('✅ Free play response saved to Firebase successfully');
                return true;
            } else {
                console.warn(`⚠️ Free play response save returned false (attempt ${attempt}/${maxRetries})`);
                
                if (attempt === maxRetries) {
                    console.error('❌ Failed to save free play response after maximum retries, but saved locally');
                    return false;
                }
                
                // Exponential backoff: 2^attempt seconds
                const backoffMs = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
                await sleep(backoffMs);
            }
        } catch (error) {
            // Requirements: 15.2, 15.5 - Log Firebase errors with context
            console.error(`❌ Firebase operation failed: saveFreePlayResponse (attempt ${attempt}/${maxRetries})`, {
                operation: 'saveFreePlayResponse',
                participantId: participant.id,
                attempt: attempt,
                maxRetries: maxRetries,
                error: error.message,
                errorCode: error.code,
                stack: error.stack
            });
            
            if (attempt === maxRetries) {
                console.error('❌ Failed to save free play response after maximum retries, but saved locally');
                return false;
            }
            
            // Exponential backoff: 2^attempt seconds
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
            await sleep(backoffMs);
        }
    }
    
    return false;
}

/**
 * Save anonymous free play response to Firebase
 * Saves only score and answers (no name/avatar) to /events/freeplay/participants/
 * Requirements: 2.7, 15.5
 */
async function saveFreePlayResponse(participant) {
    try {
        // Create anonymous response with only score and answers
        const anonymousResponse = {
            id: participant.id,
            score: participant.score,
            answers: participant.answers,
            createdAt: participant.createdAt
        };
        
        console.log('🎮 Saving anonymous response:', anonymousResponse);
        
        // Save to Firebase at /events/freeplay/participants/{participantId}
        const url = `${window.FIREBASE_CONFIG.databaseURL}/events/freeplay/participants/${participant.id}.json`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(anonymousResponse)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            // Requirements: 15.5 - Log Firebase errors with context
            console.error('❌ Firebase operation failed: saveFreePlayResponse', {
                operation: 'PUT',
                url: url,
                participantId: participant.id,
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText
            });
            return false;
        }
        
        console.log('✅ Free play response saved successfully');
        return true;
    } catch (error) {
        // Requirements: 15.5 - Log Firebase errors with context
        console.error('❌ Firebase operation failed: saveFreePlayResponse', {
            operation: 'PUT',
            participantId: participant.id,
            error: error.message,
            errorCode: error.code,
            stack: error.stack
        });
        return false;
    }
}

function generateParticipant() {
    // For free play mode, generate anonymous participant without name/avatar
    if (isFreePlayMode) {
        return {
            id: generateUniqueId(),
            score: 0,
            answers: {},
            createdAt: new Date().toISOString()
        };
    }
    
    // For regular events, generate participant with name and avatar
    const adjectives = ['Happy', 'Clever', 'Brave', 'Gentle', 'Swift', 'Bright', 'Calm', 'Bold', 'Kind', 'Wise', 'Fierce', 'Loyal', 'Noble', 'Agile', 'Strong', 'Silent', 'Wild', 'Proud', 'Free', 'Sharp',
    'Mighty', 'Peaceful', 'Graceful', 'Steady', 'Nimble', 'Daring', 'Keen', 'Pure', 'Valiant', 'Smooth'];
    const nouns = ['Tiger', 'Eagle', 'Wolf', 'Bear', 'Fox', 'Lion', 'Owl', 'Deer', 'Hawk', 'Panda', 'Falcon', 'Dolphin', 'Jaguar', 'Lynx', 'Raven', 'Cougar', 'Dragon', 'Phoenix', 'Leopard', 'Cobra',
    'Panther', 'Cheetah', 'Falcon', 'Elephant', 'Whale', 'Gazelle', 'Griffin', 'Stallion', 'Serpent', 'Condor'];
    const avatars = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🐸', '🐵', '🦄', '🐨', '🐰', '🦊', '🐮', '🐷', '🐔', '🦅', '🦉', '🦋', '🐢',
    '🐘', '🦒', '🦓', '🦘', '🦬', '🦃', '🦚', '🦩', '🐧', '🐬'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return {
        id: generateUniqueId(),
        name: `${adjective} ${noun}`,
        avatar: avatars[Math.floor(Math.random() * avatars.length)],
        score: 0,
        answers: {},
        createdAt: new Date().toISOString()
    };
}

// Counter to prevent same-millisecond collisions
let idCounter = 0;

function generateUniqueId() {
    // Multiple entropy sources for maximum uniqueness
    const timestamp = Date.now().toString(36);
    const performanceTime = performance.now().toString(36).replace('.', '');
    const randomPart1 = Math.random().toString(36).substr(2, 8);
    const randomPart2 = Math.random().toString(36).substr(2, 8);
    const counter = (++idCounter).toString(36);
    
    // Combine all entropy sources
    return `${timestamp}-${performanceTime}-${randomPart1}-${randomPart2}-${counter}`;
}
/**
 * Store session participant ID in sessionStorage
 * This allows the score page to verify the user is the session participant
 * Requirements: 2.3, 2.4
 * @param {string} eventId - The event ID
 * @param {string} participantId - The participant ID
 */
function storeSessionParticipant(eventId, participantId) {
    try {
        sessionStorage.setItem(`participant_${eventId}`, participantId);
        console.log('✅ Session participant stored:', participantId, 'for event:', eventId);
    } catch (error) {
        console.error('❌ Failed to store session participant:', error);
        // Fallback to localStorage if sessionStorage is unavailable
        try {
            localStorage.setItem(`session_participant_${eventId}`, participantId);
            console.log('✅ Session participant stored in localStorage (fallback)');
        } catch (fallbackError) {
            console.error('❌ Failed to store session participant in localStorage:', fallbackError);
        }
    }
}


/**
 * Show error notification to user
 * Requirements: 15.1, 15.2 - Display user-friendly error messages with retry option
 * @param {string} message - Error message to display
 * @param {Function} onRetry - Optional callback function to execute when retry button is clicked
 */
function showErrorNotification(message, onRetry = null) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        max-width: 350px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    // Create message container
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.marginBottom = onRetry ? '10px' : '0';
    notification.appendChild(messageDiv);
    
    // Add retry button if callback provided (Requirements: 15.2)
    if (onRetry) {
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry';
        retryButton.style.cssText = `
            background: white;
            color: #ef4444;
            border: none;
            padding: 6px 16px;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            margin-top: 8px;
        `;
        retryButton.onclick = () => {
            notification.remove();
            onRetry();
        };
        notification.appendChild(retryButton);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 8 seconds (longer if retry button present)
    const timeout = onRetry ? 8000 : 5000;
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, timeout);
}

// Available animal emojis for selection
const availableEmojis = [
    '🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🐸', '🐵', '🦄',
    '🐰', '🐨', '🐷', '🐮', '🐹', '🐭', '🐺', '🦝', '🦔', '🐧',
    '🐥', '🐣', '🐤', '🦆', '🦅', '🦉', '🦜', '🐢', '🐍', '🦎',
    '🐙', '🦑', '🦐', '🦀', '🐠', '🐟', '🐡', '🦈', '🐳', '🐋',
    '🦒', '🐘', '🦏', '🦛', '🐪', '🐫', '🦘', '🦌', '🐄', '🐂',
    '🐎', '🦓', '🐖', '🐏', '🐑', '🐐', '🦙', '🦥', '🐿️', '🦫'
];

// Name editing functionality
function editName() {
    const nameElement = document.getElementById('participantName');
    const nameInput = document.getElementById('nameInput');
    
    nameInput.value = nameElement.textContent;
    nameElement.style.display = 'none';
    nameInput.style.display = 'block';
    nameInput.focus();
    nameInput.select();
}

function saveName() {
    const nameElement = document.getElementById('participantName');
    const nameInput = document.getElementById('nameInput');
    
    const newName = nameInput.value.trim();
    if (newName && newName !== participant.name) {
        participant.name = newName;
        nameElement.textContent = newName;
        updateParticipant();
    }
    
    nameInput.style.display = 'none';
    nameElement.style.display = 'block';
}

function handleNameKeypress(event) {
    if (event.key === 'Enter') {
        saveName();
    } else if (event.key === 'Escape') {
        const nameElement = document.getElementById('participantName');
        const nameInput = document.getElementById('nameInput');
        
        nameInput.style.display = 'none';
        nameElement.style.display = 'block';
    }
}

// Emoji selector functionality
function openEmojiSelector() {
    const modal = document.getElementById('emojiModal');
    const emojiGrid = document.getElementById('emojiGrid');
    
    // Clear existing emojis
    emojiGrid.innerHTML = '';
    
    // Create emoji buttons
    availableEmojis.forEach(emoji => {
        const emojiButton = document.createElement('div');
        emojiButton.className = 'emoji-option';
        emojiButton.textContent = emoji;
        emojiButton.onclick = () => selectEmoji(emoji);
        
        // Highlight current emoji
        if (emoji === participant.avatar) {
            emojiButton.classList.add('selected');
        }
        
        emojiGrid.appendChild(emojiButton);
    });
    
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    
    // Add click-outside-to-dismiss handler (remove any existing listener first)
    modal.removeEventListener('click', handleEmojiModalClick);
    modal.addEventListener('click', handleEmojiModalClick);
}

function selectEmoji(emoji) {
    participant.avatar = emoji;
    document.getElementById('participantAvatar').textContent = emoji;
    updateParticipant();
    closeEmojiSelector();
}

function closeEmojiSelector() {
    const modal = document.getElementById('emojiModal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    // Remove click-outside handler when modal is closed
    modal.removeEventListener('click', handleEmojiModalClick);
}

/**
 * Handle click events on emoji modal (for click-outside-to-dismiss)
 */
function handleEmojiModalClick(event) {
    const modal = document.getElementById('emojiModal');
    if (event.target === modal) {
        closeEmojiSelector();
    }
}
