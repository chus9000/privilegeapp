/**
 * Event Creation Module
 * Handles event creation with question selection and validation
 * Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 15.6, 15.7
 */

let currentUser = null;
let disabledQuestions = [];
let createdEventUrl = '';
let createdEventPin = '';

/**
 * Initialize event creation page on load
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📝 Event creation page loaded');
    
    // Initialize AuthManager
    if (window.AuthManager) {
        await window.AuthManager.initialize();
        
        // Check authentication - redirect if not authenticated
        if (!window.AuthManager.isAuthenticated()) {
            console.log('⚠️ User not authenticated, redirecting to landing page');
            window.location.href = '/';
            return;
        }
        
        currentUser = window.AuthManager.getCurrentUser();
        console.log('✅ User authenticated:', currentUser.email);
    } else {
        console.error('❌ AuthManager not available');
        window.location.href = '/';
        return;
    }
    
    // Initialize disabled questions from localStorage
    const stored = localStorage.getItem('disabledQuestions');
    disabledQuestions = stored ? JSON.parse(stored) : [];
    console.log('📋 Loaded disabled questions:', disabledQuestions.length);
    
    // Set up event listeners
    setupEventListeners();
    
    // Update question counter
    updateQuestionCounter();
});

/**
 * Set up event listeners for form interactions
 */
function setupEventListeners() {
    // Form submission
    const form = document.getElementById('eventCreationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Character counter for title
    const titleInput = document.getElementById('eventTitle');
    if (titleInput) {
        titleInput.addEventListener('input', updateCharCounter);
        titleInput.addEventListener('blur', () => {
            // Show validation error on blur if field is empty (Requirement 15.6)
            const titleError = document.getElementById('titleError');
            if (titleInput.value.trim() === '') {
                titleError.textContent = 'Event title is required';
                titleError.style.display = 'block';
            }
        });
        titleInput.addEventListener('focus', () => {
            // Clear error on focus to allow user to correct
            const titleError = document.getElementById('titleError');
            if (titleError.textContent === 'Event title is required') {
                titleError.style.display = 'none';
            }
        });
    }
    
    // Review questions button
    const reviewBtn = document.getElementById('reviewQuestionsBtn');
    if (reviewBtn) {
        reviewBtn.addEventListener('click', showQuestionsModal);
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.location.href = '/app';
        });
    }
    
    // Modal buttons
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideQuestionsModal);
    }
    
    const cancelQuestionsBtn = document.getElementById('cancelQuestionsBtn');
    if (cancelQuestionsBtn) {
        cancelQuestionsBtn.addEventListener('click', hideQuestionsModal);
    }
    
    const saveQuestionsBtn = document.getElementById('saveQuestionsBtn');
    if (saveQuestionsBtn) {
        saveQuestionsBtn.addEventListener('click', saveQuestionSelection);
    }
    
    // Success view buttons
    const goToDashboardBtn = document.getElementById('goToDashboardBtn');
    if (goToDashboardBtn) {
        goToDashboardBtn.addEventListener('click', () => {
            window.location.href = '/app';
        });
    }
    
    const createAnotherBtn = document.getElementById('createAnotherBtn');
    if (createAnotherBtn) {
        createAnotherBtn.addEventListener('click', resetForm);
    }
    
    const copyUrlBtn = document.getElementById('copyUrlBtn');
    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', () => copyToClipboard(createdEventUrl, 'Link copied!'));
    }
    
    const copyPinBtn = document.getElementById('copyPinBtn');
    if (copyPinBtn) {
        copyPinBtn.addEventListener('click', () => copyToClipboard(createdEventPin, 'PIN copied!'));
    }
}

/**
 * Update character counter for event title
 * Also provides real-time validation feedback (Requirement 15.6)
 */
function updateCharCounter() {
    const titleInput = document.getElementById('eventTitle');
    const charCount = document.getElementById('charCount');
    const titleError = document.getElementById('titleError');
    
    if (titleInput && charCount) {
        const length = titleInput.value.length;
        charCount.textContent = length;
        
        // Real-time validation feedback (Requirement 15.6)
        if (length === 0 && titleInput.value !== titleInput.defaultValue) {
            // Only show error if user has interacted with the field
            if (document.activeElement !== titleInput && titleInput.value === '') {
                titleError.textContent = 'Event title is required';
                titleError.style.display = 'block';
            }
        } else if (length > 100) {
            titleError.textContent = 'Event title must be 100 characters or less';
            titleError.style.display = 'block';
        } else {
            titleError.style.display = 'none';
        }
    }
}

/**
 * Update question counter display
 */
function updateQuestionCounter() {
    const totalQuestions = questions.length;
    const enabledQuestions = totalQuestions - disabledQuestions.length;
    
    const counterElement = document.getElementById('questionCount');
    if (counterElement) {
        counterElement.textContent = `(${enabledQuestions})`;
    }
}

/**
 * Show questions selection modal
 */
function showQuestionsModal() {
    console.log('📋 Opening questions modal');
    
    const modal = document.getElementById('questionsModal');
    const questionsList = document.getElementById('questionsList');
    
    if (!modal || !questionsList) {
        console.error('❌ Modal elements not found');
        return;
    }
    
    // Render questions list
    questionsList.innerHTML = questions.map((question, index) => {
        const isDisabled = disabledQuestions.includes(index);
        return `
            <div class="question-item ${isDisabled ? 'disabled' : 'enabled'}" data-index="${index}">
                <div class="question-text">${escapeHtml(question.text)}</div>
                <button type="button" class="toggle-question-btn" data-index="${index}">
                    ${isDisabled ? 'Enable' : 'Disable'}
                </button>
            </div>
        `;
    }).join('');
    
    // Add event listeners to toggle buttons
    const toggleButtons = questionsList.querySelectorAll('.toggle-question-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            toggleQuestion(index);
        });
    });
    
    // Update modal counter
    updateModalQuestionCounter();
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Hide questions selection modal
 */
function hideQuestionsModal() {
    const modal = document.getElementById('questionsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Toggle question enabled/disabled state
 * @param {number} index - Question index
 */
function toggleQuestion(index) {
    console.log('🔄 Toggling question:', index);
    
    if (disabledQuestions.includes(index)) {
        // Enable question (remove from disabled list)
        disabledQuestions = disabledQuestions.filter(i => i !== index);
    } else {
        // Disable question (add to disabled list)
        disabledQuestions.push(index);
    }
    
    // Save to localStorage
    localStorage.setItem('disabledQuestions', JSON.stringify(disabledQuestions));
    
    // Refresh modal display
    showQuestionsModal();
}

/**
 * Update modal question counter
 */
function updateModalQuestionCounter() {
    const totalQuestions = questions.length;
    const enabledQuestions = totalQuestions - disabledQuestions.length;
    
    const counterElement = document.getElementById('enabledQuestionsCounter');
    if (counterElement) {
        counterElement.textContent = `${enabledQuestions} questions enabled`;
    }
}

/**
 * Save question selection and close modal
 */
function saveQuestionSelection() {
    console.log('💾 Saving question selection');
    
    // Update main counter
    updateQuestionCounter();
    
    // Close modal
    hideQuestionsModal();
}

/**
 * Validate event configuration
 * Requirements: 5.1, 5.3, 15.6
 * @param {string} title - Event title
 * @param {number[]} disabledQuestionIndices - Array of disabled question indices
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateEvent(title, disabledQuestionIndices) {
    const errors = [];
    
    // Validate title
    if (!title || title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Event title is required' });
    }
    
    if (title.length > 100) {
        errors.push({ field: 'title', message: 'Event title must be 100 characters or less' });
    }
    
    // Validate minimum questions
    const totalQuestions = questions.length;
    const enabledQuestions = totalQuestions - disabledQuestionIndices.length;
    
    if (enabledQuestions < 5) {
        errors.push({ 
            field: 'questions', 
            message: `At least 5 questions must be enabled (currently ${enabledQuestions} enabled)` 
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Generate unique event ID
 * Requirements: 5.4
 * @returns {string} Unique event ID
 */
function generateEventId() {
    // Use timestamp + random string for uniqueness
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 9);
    return `${timestamp}_${randomStr}`;
}

/**
 * Generate 6-digit PIN
 * Requirements: 5.5
 * @returns {string} 6-digit numeric PIN
 */
function generatePin() {
    // Generate random 6-digit number (100000-999999)
    const pin = Math.floor(100000 + Math.random() * 900000);
    return pin.toString();
}

/**
 * Handle form submission
 * Requirements: 5.1, 5.6, 5.7, 5.8
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    console.log('📝 Form submitted');
    
    // Clear previous errors
    clearErrors();
    
    // Get form values
    const titleInput = document.getElementById('eventTitle');
    const title = titleInput.value.trim();
    
    // Validate event
    const validation = validateEvent(title, disabledQuestions);
    
    if (!validation.isValid) {
        console.log('❌ Validation failed:', validation.errors);
        displayErrors(validation.errors);
        return;
    }
    
    // Disable submit button to prevent double submission
    const submitBtn = document.getElementById('createEventBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
    }
    
    try {
        // Generate event ID and PIN
        const eventId = generateEventId();
        const pin = generatePin();
        
        console.log('🎫 Generated event ID:', eventId);
        console.log('🔑 Generated PIN:', pin);
        
        // Create event data
        const eventData = {
            title,
            pin,
            creatorId: currentUser.uid,
            createdAt: new Date().toISOString(),
            disabledQuestions: [...disabledQuestions],
            participants: []
        };
        
        // Save event to Firebase
        console.log('💾 Saving event to Firebase...');
        const success = await window.FirebaseAPI.saveEvent(eventId, eventData);
        
        if (!success) {
            throw new Error('Failed to save event to Firebase');
        }
        
        console.log('✅ Event created successfully');
        
        // Store event details for display
        createdEventUrl = `${window.location.origin}/questions.html?id=${eventId}`;
        createdEventPin = pin;
        
        // Show success view
        showEventCreated(createdEventUrl, pin);
        
    } catch (error) {
        // Requirements: 15.5, 15.7 - Log Firebase errors with context and show user-friendly message
        console.error('❌ Firebase operation failed: createEvent', {
            operation: 'saveEvent',
            title: title,
            disabledQuestionsCount: disabledQuestions.length,
            error: error.message,
            errorCode: error.code,
            stack: error.stack
        });
        
        // Show error message with retry option (Requirements: 15.2)
        displayErrors([{
            field: 'general',
            message: 'Failed to create event. Please check your connection and try again.'
        }], () => {
            console.log('🔄 User requested retry...');
            // Retry event creation
            createEvent();
        });
        
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Event';
        }
    }
}

/**
 * Display created event details
 * Requirements: 5.7
 * @param {string} eventUrl - Event URL
 * @param {string} pin - Event PIN
 */
function showEventCreated(eventUrl, pin) {
    console.log('🎉 Showing event created view');
    
    // Hide form
    const createForm = document.getElementById('createForm');
    if (createForm) {
        createForm.style.display = 'none';
    }
    
    // Show success view
    const eventCreated = document.getElementById('eventCreated');
    if (eventCreated) {
        eventCreated.style.display = 'block';
    }
    
    // Populate event details
    const urlInput = document.getElementById('eventUrl');
    if (urlInput) {
        urlInput.value = eventUrl;
    }
    
    const pinInput = document.getElementById('eventPin');
    if (pinInput) {
        pinInput.value = pin;
    }
}

/**
 * Display validation errors
 * Requirements: 15.6, 15.7
 * @param {Array} errors - Array of error objects
 * @param {Function} onRetry - Optional callback function for retry button on general errors
 */
function displayErrors(errors, onRetry = null) {
    errors.forEach(error => {
        if (error.field === 'title') {
            const errorElement = document.getElementById('titleError');
            if (errorElement) {
                errorElement.textContent = error.message;
                errorElement.style.display = 'block';
            }
        } else if (error.field === 'questions') {
            const errorElement = document.getElementById('questionsError');
            if (errorElement) {
                errorElement.textContent = error.message;
                errorElement.style.display = 'block';
            }
        } else if (error.field === 'general') {
            // Requirements: 15.2 - Display retry option for network errors
            showErrorNotification(error.message, onRetry);
        }
    });
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

/**
 * Clear all error messages
 */
function clearErrors() {
    const titleError = document.getElementById('titleError');
    if (titleError) {
        titleError.style.display = 'none';
        titleError.textContent = '';
    }
    
    const questionsError = document.getElementById('questionsError');
    if (questionsError) {
        questionsError.style.display = 'none';
        questionsError.textContent = '';
    }
}

/**
 * Reset form to create another event
 */
function resetForm() {
    console.log('🔄 Resetting form');
    
    // Hide success view
    const eventCreated = document.getElementById('eventCreated');
    if (eventCreated) {
        eventCreated.style.display = 'none';
    }
    
    // Show form
    const createForm = document.getElementById('createForm');
    if (createForm) {
        createForm.style.display = 'block';
    }
    
    // Clear form
    const form = document.getElementById('eventCreationForm');
    if (form) {
        form.reset();
    }
    
    // Reset disabled questions
    disabledQuestions = [];
    localStorage.setItem('disabledQuestions', JSON.stringify(disabledQuestions));
    
    // Update counters
    updateCharCounter();
    updateQuestionCounter();
    
    // Clear errors
    clearErrors();
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @param {string} message - Success message to display
 */
function copyToClipboard(text, message) {
    console.log('📋 Copying to clipboard:', text);
    
    navigator.clipboard.writeText(text).then(() => {
        console.log('✅ Copied to clipboard');
        showToast(message);
    }).catch(err => {
        console.error('❌ Failed to copy:', err);
        
        // Fallback: select the input
        const input = document.querySelector(`input[value="${text}"]`);
        if (input) {
            input.select();
            document.execCommand('copy');
            showToast(message);
        }
    });
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('📝 Event creation module loaded');
