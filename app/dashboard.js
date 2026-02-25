/**
 * Event Dashboard Module
 * Handles event listing and management for authenticated users
 * Requirements: 4.1, 4.2, 4.4, 4.5, 4.6
 */

let currentUser = null;
let events = [];
let realTimeListener = null; // Store the cleanup function for real-time listener

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Dashboard page loaded');
    
    // Initialize AuthManager
    if (!window.AuthManager) {
        console.error('❌ AuthManager not available');
        showSignInUI();
        return;
    }
    
    console.log('🔍 Calling AuthManager.initialize()...');
    await window.AuthManager.initialize();
    console.log('🔍 AuthManager.initialize() completed');
    
    // Set up an auth state listener to handle auth changes
    window.AuthManager.onAuthStateChanged((user) => {
        console.log('🔍 Dashboard received auth state change:', user ? user.email : 'NULL');
        
        if (user) {
            currentUser = user;
            console.log('✅ User authenticated:', currentUser.email);
            
            // Hide sign-in UI and show dashboard
            const signInRequired = document.getElementById('signInRequired');
            if (signInRequired) {
                signInRequired.style.display = 'none';
            }
            
            // Show dashboard elements
            const dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader) {
                dashboardHeader.style.display = 'flex';
            }
            
            // Show Create New Event button in header
            const createNewEventBtnHeader = document.getElementById('createNewEventBtnHeader');
            if (createNewEventBtnHeader) {
                createNewEventBtnHeader.style.display = 'inline-block';
            }
            
            // Load user's events
            loadEvents();
            
            // Initialize quota banner
            initializeQuotaBanner();
            
            // Set up event listeners (only once)
            if (!window.dashboardListenersSetup) {
                setupEventListeners();
                window.dashboardListenersSetup = true;
            }
        } else {
            console.log('⚠️ User not authenticated, showing sign-in UI');
            currentUser = null;
            showSignInUI();
        }
    });
});

/**
 * Show sign-in UI when user is not authenticated
 */
function showSignInUI() {
    // Hide dashboard elements
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        dashboardHeader.style.display = 'none';
    }
    
    // Hide Create New Event button in header
    const createNewEventBtnHeader = document.getElementById('createNewEventBtnHeader');
    if (createNewEventBtnHeader) {
        createNewEventBtnHeader.style.display = 'none';
    }
    
    document.getElementById('eventsContainer').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    
    // Show sign-in required UI
    const signInRequired = document.getElementById('signInRequired');
    signInRequired.style.display = 'flex';
    
    // Set up sign-in button (only once)
    const signInBtn = document.getElementById('signInBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    
    if (signInBtn && !signInBtn.dataset.listenerAttached) {
        signInBtn.dataset.listenerAttached = 'true';
        signInBtn.addEventListener('click', async () => {
            try {
                signInBtn.textContent = 'Signing in...';
                signInBtn.disabled = true;
                
                await window.AuthManager.signInWithGoogle();
                
                // Sign-in successful - the auth state listener will handle the UI update
                console.log('✅ Sign-in successful, waiting for auth state change...');
                
            } catch (error) {
                console.error('❌ Sign-in error:', error);
                alert(error.message || 'Sign-in failed. Please try again.');
                signInBtn.textContent = 'Sign in with Google';
                signInBtn.disabled = false;
            }
        });
    }
    
    if (backToHomeBtn && !backToHomeBtn.dataset.listenerAttached) {
        backToHomeBtn.dataset.listenerAttached = 'true';
        backToHomeBtn.addEventListener('click', () => {
            window.location.href = '../';
        });
    }
}

/**
 * Set up event listeners for dashboard actions
 */
function setupEventListeners() {
    const createNewEventBtn = document.getElementById('createNewEventBtn');
    const createFirstEventBtn = document.getElementById('createFirstEventBtn');
    
    if (createNewEventBtn) {
        createNewEventBtn.addEventListener('click', navigateToCreate);
    }
    
    if (createFirstEventBtn) {
        createFirstEventBtn.addEventListener('click', navigateToCreate);
    }
}

/**
 * Load events by creator ID from Firebase
 * Requirements: 4.1, 4.5, 15.2, 15.5
 */
async function loadEvents() {
    console.log('📥 Loading events for user:', currentUser.uid);
    
    // Show loading state
    showLoadingState();
    
    try {
        // Load events from Firebase
        events = await window.FirebaseAPI.loadEventsByCreator(currentUser.uid);
        
        console.log('✅ Loaded', events.length, 'events');
        
        // Hide loading state
        hideLoadingState();
        
        // Render events or show empty state
        if (events.length === 0) {
            showEmptyState();
        } else {
            renderEventsList(events);
        }
    } catch (error) {
        // Requirements: 15.2, 15.5 - Log Firebase errors with context and show user-friendly message
        console.error('❌ Firebase operation failed: loadEventsByCreator', {
            operation: 'loadEventsByCreator',
            userId: currentUser.uid,
            error: error.message,
            errorCode: error.code,
            stack: error.stack
        });
        hideLoadingState();
        // Requirements: 15.2 - Display retry option to user
        showError('Failed to load events. Please check your connection and try again.', () => {
            console.log('🔄 User requested retry...');
            loadEvents();
        });
    }
}

/**
 * Render events list with title, date, participant count, link
 * Requirements: 4.2
 */
function renderEventsList(eventsList) {
    console.log('🎨 Rendering events list:', eventsList.length, 'events');
    
    const eventsContainer = document.getElementById('eventsContainer');
    const emptyState = document.getElementById('emptyState');
    
    // Hide empty state
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Clear container
    eventsContainer.innerHTML = '';
    
    // Sort events by creation date (newest first)
    const sortedEvents = [...eventsList].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
    });
    
    // Check if at quota limit
    const isAtLimit = window.QuotaStateManager ? 
        window.QuotaStateManager.getState().eventCount >= 3 : false;
    
    // Render each event
    sortedEvents.forEach(event => {
        const eventCard = createEventCard(event, isAtLimit);
        eventsContainer.appendChild(eventCard);
    });
    
    // Initialize Lucide icons after all cards are added to DOM
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Show container
    eventsContainer.style.display = 'grid';
}

/**
 * Create event card element
 * Requirements: 4.2
 */
function createEventCard(event, isAtLimit = false) {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.dataset.eventId = event.id;
    
    // Format date
    const createdDate = event.createdAt ? new Date(event.createdAt) : new Date();
    const formattedDate = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    // Get participant count
    const participantCount = event.participants ? event.participants.length : 0;
    
    // Get question count - total questions (35) minus disabled questions
    const TOTAL_QUESTIONS = 35; // Total number of questions in questions.js
    const disabledCount = event.disabledQuestions ? event.disabledQuestions.length : 0;
    const questionCount = TOTAL_QUESTIONS - disabledCount;
    
    // Build event URL - use relative path from current location
    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    const eventUrl = `${window.location.origin}${basePath}/questions.html?id=${event.id}`;
    
    // Determine if duplicate button should be disabled
    const duplicateDisabled = isAtLimit ? 'disabled' : '';
    const duplicateClass = isAtLimit ? 'btn-disabled' : '';
    
    card.innerHTML = `
        <div class="event-card-header">
            <h3 class="event-title" title="${escapeHtml(event.title)}">${escapeHtml(event.title)}</h3>
            <div class="event-date">${formattedDate}</div>
        </div>
        
        <div class="event-card-body">
            <div class="event-stats">
                <div class="event-stat">
                    <span class="stat-icon"><i data-lucide="users"></i></span>
                    <span class="stat-value">${participantCount}</span>
                    <span class="stat-label">Participants</span>
                </div>
                <div class="event-stat">
                    <span class="stat-icon"><i data-lucide="help-circle"></i></span>
                    <span class="stat-value">${questionCount}</span>
                    <span class="stat-label">Questions</span>
                </div>
            </div>
            
            <div class="event-link-container">
                <input type="text" 
                       class="event-link-input" 
                       value="${eventUrl}" 
                       readonly>
                <button class="btn btn-icon btn-tertiary" 
                        data-url="${eventUrl}"
                        title="Copy link">
                    <i data-lucide="clipboard-copy"></i>
                </button>
            </div>
            
            <div class="event-pin-container">
                <input type="text" 
                       class="event-pin-input" 
                       value="${event.pin}" 
                       readonly>
                <button class="btn btn-icon btn-tertiary" 
                        data-pin="${event.pin}"
                        title="Copy PIN">
                    <i data-lucide="clipboard-copy"></i>
                </button>
            </div>
        </div>
        
        <div class="event-card-footer">
            <button class="btn btn-primary btn-sm" data-event-id="${event.id}">
                View Details
            </button>
            <button class="btn btn-success btn-sm ${duplicateClass}" data-event-id="${event.id}" ${duplicateDisabled}>
                Duplicate
            </button>
            <button class="btn btn-danger btn-sm" data-event-id="${event.id}">
                Delete
            </button>
        </div>
    `;
    
    // Add event listeners
    const copyBtn = card.querySelector('.btn-icon[data-url]');
    copyBtn.addEventListener('click', () => copyEventLink(eventUrl));
    
    const copyPinBtn = card.querySelector('.btn-icon[data-pin]');
    copyPinBtn.addEventListener('click', () => copyEventPin(event.pin));
    
    const viewDetailsBtn = card.querySelector('.btn-primary[data-event-id]');
    viewDetailsBtn.addEventListener('click', () => navigateToEventDetails(event.id));
    
    const duplicateBtn = card.querySelector('.btn-success[data-event-id]');
    if (!isAtLimit) {
        duplicateBtn.addEventListener('click', () => handleDuplicateEvent(event.id));
    }
    
    const deleteBtn = card.querySelector('.btn-danger[data-event-id]');
    deleteBtn.addEventListener('click', () => handleDeleteEvent(event.id, event.title));
    
    return card;
}

/**
 * Copy event link to clipboard
 * Requirements: 4.4
 */
function copyEventLink(url) {
    console.log('📋 Copying event link:', url);
    
    // Use Clipboard API
    navigator.clipboard.writeText(url).then(() => {
        console.log('✅ Link copied to clipboard');
        showToast('Link copied to clipboard!');
    }).catch(err => {
        console.error('❌ Failed to copy link:', err);
        
        // Fallback: select the input
        const input = document.querySelector(`input[value="${url}"]`);
        if (input) {
            input.select();
            document.execCommand('copy');
            showToast('Link copied to clipboard!');
        }
    });
}

/**
 * Copy event PIN to clipboard
 * Requirements: 4.4
 */
function copyEventPin(pin) {
    console.log('📋 Copying event PIN:', pin);
    
    // Use Clipboard API
    navigator.clipboard.writeText(pin).then(() => {
        console.log('✅ PIN copied to clipboard');
        showToast('PIN copied to clipboard!');
    }).catch(err => {
        console.error('❌ Failed to copy PIN:', err);
        
        // Fallback: select the input
        const input = document.querySelector(`input[value="${pin}"]`);
        if (input) {
            input.select();
            document.execCommand('copy');
            showToast('PIN copied to clipboard!');
        }
    });
}

/**
 * Navigate to event creation page
 * Requirements: 4.4
 */
function navigateToCreate() {
    console.log('➕ Navigating to event creation');
    window.location.href = './create.html';
}

/**
 * Navigate to event details view
 * Requirements: 4.5, 8.1, 8.2, 8.3, 8.4
 */
async function navigateToEventDetails(eventId) {
    console.log('👁️ Opening event details modal:', eventId);
    
    // Find the event in the loaded events
    const event = events.find(e => e.id === eventId);
    
    if (!event) {
        console.error('❌ Event not found:', eventId);
        showError('Event not found');
        return;
    }
    
    // Show the modal
    showEventDetailsModal(event);
}

/**
 * Handle event deletion
 */
async function handleDeleteEvent(eventId, eventTitle) {
    // Show custom delete confirmation modal
    showDeleteModal(eventId, eventTitle);
}

/**
 * Show delete confirmation modal
 */
function showDeleteModal(eventId, eventTitle) {
    const modal = document.getElementById('deleteEventModal');
    const titleElement = document.getElementById('deleteEventTitle');
    
    // Set event title
    titleElement.textContent = `"${eventTitle}"`;
    
    // Store eventId for later use
    modal.dataset.eventId = eventId;
    
    // Show modal
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    
    // Click outside to close
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeDeleteModal();
        }
    };
    
    // Handle Escape key
    document.addEventListener('keydown', handleDeleteModalEscape);
}

/**
 * Handle Escape key for delete modal
 */
function handleDeleteModalEscape(e) {
    if (e.key === 'Escape') {
        closeDeleteModal();
    }
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    const modal = document.getElementById('deleteEventModal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    modal.dataset.eventId = '';
    document.removeEventListener('keydown', handleDeleteModalEscape);
}

/**
 * Confirm delete and remove event
 */
async function confirmDelete() {
    const modal = document.getElementById('deleteEventModal');
    const eventId = modal.dataset.eventId;
    
    // Close modal
    closeDeleteModal();
    
    console.log('🗑️ Deleting event:', eventId);

    try {
        const success = await window.DataManager.deleteEvent(eventId);

        if (success) {
            showToast('Event deleted successfully');
            // Reload events to update the list
            await loadEvents();
        } else {
            showError('Failed to delete event. Please try again.');
        }
    } catch (error) {
        console.error('❌ Failed to delete event:', error);
        showError('Failed to delete event. Please try again.');
    }
}

// Make modal functions available globally
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;

/**
 * Handle event duplication
 * Creates a copy of the event with a new ID and PIN but keeps the same questions
 */
async function handleDuplicateEvent(eventId) {
    console.log('📋 Duplicating event:', eventId);
    
    try {
        // Load the original event using FirebaseAPI
        const originalEvent = await window.FirebaseAPI.loadEvent(eventId);
        
        if (!originalEvent) {
            showError('Failed to load event for duplication.');
            return;
        }
        
        // Show custom modal to get new event name
        showRenameModal(originalEvent.title, eventId);
        
    } catch (error) {
        console.error('❌ Failed to duplicate event:', error);
        showError('Failed to duplicate event. Please try again.');
    }
}

/**
 * Show rename modal for duplicating event
 */
function showRenameModal(originalTitle, eventId) {
    const modal = document.getElementById('renameEventModal');
    const input = document.getElementById('renameEventInput');
    
    // Set default name
    input.value = `${originalTitle} (Copy)`;
    
    // Store eventId for later use
    modal.dataset.eventId = eventId;
    
    // Show modal
    modal.style.display = 'block';
    
    // Focus input and select text
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
    
    // Handle Enter key
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            confirmRename();
        }
    };
    
    // Handle Escape key
    input.onkeydown = (e) => {
        if (e.key === 'Escape') {
            closeRenameModal();
        }
    };
    
    // Click outside to close
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeRenameModal();
        }
    };
}

/**
 * Close rename modal
 */
function closeRenameModal() {
    const modal = document.getElementById('renameEventModal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    modal.dataset.eventId = '';
}

/**
 * Confirm rename and duplicate event
 */
async function confirmRename() {
    const modal = document.getElementById('renameEventModal');
    const input = document.getElementById('renameEventInput');
    const eventId = modal.dataset.eventId;
    const newEventName = input.value.trim();
    
    // Validate the name is not empty
    if (!newEventName) {
        showError('Event name cannot be empty.');
        input.focus();
        return;
    }
    
    // Check quota before duplicating
    if (window.QuotaStateManager) {
        const quotaState = window.QuotaStateManager.getState();
        const remainingQuota = quotaState.quotaLimit - quotaState.eventCount;
        
        if (remainingQuota <= 0) {
            closeRenameModal();
            showError('Cannot duplicate event. You have reached the limit of 3 events. Please delete an event first.');
            return;
        }
    }
    
    // Close modal
    closeRenameModal();
    
    try {
        // Load the original event
        const originalEvent = await window.FirebaseAPI.loadEvent(eventId);
        
        if (!originalEvent) {
            showError('Failed to load event for duplication.');
            return;
        }
        
        // Generate new ID and PIN
        const newEventId = generateEventId();
        const newPin = generatePin();
        
        // Create duplicated event with new ID and PIN
        const duplicatedEvent = {
            title: newEventName,
            pin: newPin,
            creatorId: currentUser.uid,
            createdAt: new Date().toISOString(),
            disabledQuestions: originalEvent.disabledQuestions || [],
            participants: [] // Reset participants for the new event
        };
        
        // Save the duplicated event using FirebaseAPI
        const success = await window.FirebaseAPI.saveEvent(newEventId, duplicatedEvent);
        
        if (success) {
            showToast('Event duplicated successfully!');
            // Reload events to show the new duplicate
            await loadEvents();
        } else {
            showError('Failed to duplicate event. Please try again.');
        }
    } catch (error) {
        console.error('❌ Failed to duplicate event:', error);
        showError('Failed to duplicate event. Please try again.');
    }
}

// Make modal functions available globally
window.closeRenameModal = closeRenameModal;
window.confirmRename = confirmRename;

/**
 * Generate unique event ID
 * @returns {string} Unique event ID
 */
function generateEventId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 9);
    return `${timestamp}_${randomStr}`;
}

/**
 * Generate random 6-digit PIN
 * @returns {string} 6-digit numeric PIN
 */
function generatePin() {
    const pin = Math.floor(100000 + Math.random() * 900000);
    return pin.toString();
}

/**
 * Handle sign out
 * Requirements: 15.1, 15.5
 */
async function handleSignOut() {
    console.log('👋 Signing out user');
    
    try {
        await window.AuthManager.signOut();
        console.log('✅ Sign out successful');
        window.location.href = '../';
    } catch (error) {
        // Requirements: 15.1, 15.5 - Log auth errors with context and show user-friendly message
        console.error('❌ Authentication operation failed: signOut', {
            operation: 'signOut',
            error: error.message,
            errorCode: error.code,
            stack: error.stack
        });
        showError('Failed to sign out. Please try again.');
    }
}

/**
 * Show empty state
 * Requirements: 4.6
 */
function showEmptyState() {
    console.log('📭 Showing empty state');
    
    const eventsContainer = document.getElementById('eventsContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (eventsContainer) {
        eventsContainer.style.display = 'none';
    }
    
    if (emptyState) {
        emptyState.style.display = 'flex';
    }
}

/**
 * Show loading state
 */
function showLoadingState() {
    const loadingState = document.getElementById('loadingState');
    const eventsContainer = document.getElementById('eventsContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingState) {
        loadingState.style.display = 'flex';
    }
    
    if (eventsContainer) {
        eventsContainer.style.display = 'none';
    }
    
    if (emptyState) {
        emptyState.style.display = 'none';
    }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    const loadingState = document.getElementById('loadingState');
    
    if (loadingState) {
        loadingState.style.display = 'none';
    }
}

/**
 * Show error message with optional retry button
 * Requirements: 15.2 - Display retry option to user
 * @param {string} message - Error message to display
 * @param {Function} onRetry - Optional callback function to execute when retry button is clicked
 */
function showError(message, onRetry = null) {
    // Create error notification element
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
 * Show toast notification
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
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show event details modal with analytics
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
function showEventDetailsModal(event) {
    console.log('📊 Showing event details modal for:', event.title);
    
    // Populate event information
    document.getElementById('detailsEventTitle').textContent = event.title;
    document.getElementById('detailsEventPin').textContent = event.pin;
    
    // Format date
    const createdDate = event.createdAt ? new Date(event.createdAt) : new Date();
    const formattedDate = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('detailsEventDate').textContent = formattedDate;
    
    // Number of questions selected for the event
    // Total questions is 35, subtract disabled questions
    const TOTAL_QUESTIONS = 35;
    const disabledCount = event.disabledQuestions ? event.disabledQuestions.length : 0;
    const questionCount = TOTAL_QUESTIONS - disabledCount;
    document.getElementById('detailsQuestionCount').textContent = questionCount;
    
    // Event link - just the event ID as a clickable link
    const eventUrl = `${window.location.origin}/app/event.html?id=${event.id}`;
    const linkElement = document.getElementById('detailsEventLink');
    linkElement.textContent = event.id;
    linkElement.href = eventUrl;
    
    // Get participants
    const participants = event.participants || [];
    const participantCount = participants.length;
    
    // Update score statistics title with participant count
    const statsTitle = document.getElementById('detailsScoreStatsTitle');
    statsTitle.textContent = `Score Statistics for ${participantCount} participant${participantCount !== 1 ? 's' : ''}`;
    
    // Calculate and display statistics
    if (participantCount > 0) {
        const stats = calculateEventStatistics(participants);
        displayEventStatistics(stats);
    } else {
        // No participants yet
        displayEmptyStatistics();
    }
    
    // Set up view spectrum button
    const viewSpectrumBtn = document.getElementById('viewSpectrumBtn');
    viewSpectrumBtn.onclick = () => {
        window.location.href = `./results.html?id=${event.id}`;
    };
    
    // Set up view detailed results button
    const viewDetailedResultsBtn = document.getElementById('viewDetailedResultsBtn');
    viewDetailedResultsBtn.onclick = () => {
        window.location.href = `./detailed-results.html?id=${event.id}`;
    };
    
    // Set up real-time updates for analytics
    // Requirements: 8.5, 8.6
    setupRealTimeAnalyticsUpdates(event.id);
    
    // Show the modal
    const modal = document.getElementById('eventDetailsModal');
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    
    // Add click-outside-to-dismiss handler (remove any existing listener first)
    modal.removeEventListener('click', handleEventDetailsModalClick);
    modal.addEventListener('click', handleEventDetailsModalClick);
}

/**
 * Handle click events on event details modal (for click-outside-to-dismiss)
 */
function handleEventDetailsModalClick(e) {
    const modal = document.getElementById('eventDetailsModal');
    if (e.target === modal) {
        closeEventDetailsModal();
    }
}

/**
 * Calculate event statistics (mean, median, mode, range)
 * Requirements: 8.3
 */
function calculateEventStatistics(participants) {
    if (!participants || participants.length === 0) {
        return null;
    }
    
    // Extract scores
    const scores = participants.map(p => p.score);
    
    // Calculate mean
    const sum = scores.reduce((acc, score) => acc + score, 0);
    const mean = sum / scores.length;
    
    // Calculate median
    const sortedScores = [...scores].sort((a, b) => a - b);
    const median = sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
        : sortedScores[Math.floor(sortedScores.length / 2)];
    
    // Calculate mode (most frequent score)
    const scoreFrequency = {};
    scores.forEach(score => {
        scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
    });
    
    const maxFrequency = Math.max(...Object.values(scoreFrequency));
    const modes = Object.keys(scoreFrequency)
        .filter(score => scoreFrequency[score] === maxFrequency)
        .map(Number);
    
    // If all scores appear with same frequency, there's no mode
    const mode = maxFrequency === 1 ? null : modes;
    
    // Calculate range
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    
    console.log('📊 Event statistics:', { mean, median, mode, min, max });
    
    return {
        mean: Math.round(mean * 10) / 10, // Round to 1 decimal place
        median,
        mode,
        min,
        max
    };
}

/**
 * Display event statistics in the modal
 * Requirements: 8.3
 */
function displayEventStatistics(stats) {
    if (!stats) {
        displayEmptyStatistics();
        return;
    }
    
    // Display mean
    const meanValue = stats.mean > 0 ? `+${stats.mean}` : stats.mean.toString();
    document.getElementById('detailsMeanScore').textContent = meanValue;
    
    // Display median
    const medianValue = stats.median > 0 ? `+${stats.median}` : stats.median.toString();
    document.getElementById('detailsMedianScore').textContent = medianValue;
    
    // Display mode
    if (stats.mode === null) {
        document.getElementById('detailsModeScore').textContent = 'No mode';
    } else if (Array.isArray(stats.mode)) {
        // Multiple modes
        const modeValues = stats.mode.map(m => m > 0 ? `+${m}` : m.toString()).join(', ');
        document.getElementById('detailsModeScore').textContent = modeValues;
    } else {
        const modeValue = stats.mode > 0 ? `+${stats.mode}` : stats.mode.toString();
        document.getElementById('detailsModeScore').textContent = modeValue;
    }
    
    // Display range
    const minValue = stats.min > 0 ? `+${stats.min}` : stats.min.toString();
    const maxValue = stats.max > 0 ? `+${stats.max}` : stats.max.toString();
    document.getElementById('detailsScoreRange').textContent = `${minValue} to ${maxValue}`;
}

/**
 * Display empty statistics when no participants
 */
function displayEmptyStatistics() {
    document.getElementById('detailsMeanScore').textContent = '-';
    document.getElementById('detailsMedianScore').textContent = '-';
    document.getElementById('detailsModeScore').textContent = '-';
    document.getElementById('detailsScoreRange').textContent = '-';
}

/**
 * Close event details modal
 */
function closeEventDetailsModal() {
    const modal = document.getElementById('eventDetailsModal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    
    // Remove click-outside handler when modal is closed
    modal.removeEventListener('click', handleEventDetailsModalClick);
    
    // Clean up real-time listener when modal is closed
    // Requirements: 8.6
    if (realTimeListener) {
        console.log('🧹 Cleaning up real-time analytics listener');
        realTimeListener();
        realTimeListener = null;
    }
}

/**
 * Set up real-time updates for event analytics
 * Requirements: 8.5, 8.6
 */
function setupRealTimeAnalyticsUpdates(eventId) {
    console.log('🔄 Setting up real-time analytics updates for event:', eventId);
    
    // Clean up any existing listener
    if (realTimeListener) {
        realTimeListener();
        realTimeListener = null;
    }
    
    // Check if FirebaseAPI supports real-time updates
    if (!window.FirebaseAPI || !window.FirebaseAPI.onEventUpdate) {
        console.warn('⚠️ Real-time updates not available');
        return;
    }
    
    // Set up real-time listener
    realTimeListener = window.FirebaseAPI.onEventUpdate(eventId, (updatedEventData) => {
        console.log('🆕 Real-time update received for event analytics');
        
        if (!updatedEventData) {
            console.warn('⚠️ Received null event data in real-time update');
            return;
        }
        
        // Update the event in the local events array
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex >= 0) {
            events[eventIndex] = {
                ...events[eventIndex],
                participants: updatedEventData.participants || []
            };
        }
        
        // Update analytics display
        updateAnalyticsDisplay(updatedEventData);
    });
    
    console.log('✅ Real-time analytics updates enabled');
}

/**
 * Update analytics display with new data
 * Requirements: 8.6
 */
function updateAnalyticsDisplay(eventData) {
    console.log('📊 Updating analytics display with new data');
    
    const participants = eventData.participants || [];
    const participantCount = participants.length;
    
    // Update score statistics title with participant count
    const statsTitle = document.getElementById('detailsScoreStatsTitle');
    statsTitle.textContent = `Score Statistics for ${participantCount} participant${participantCount !== 1 ? 's' : ''}`;
    
    // Update statistics
    if (participantCount > 0) {
        const stats = calculateEventStatistics(participants);
        displayEventStatistics(stats);
    } else {
        // No participants yet
        displayEmptyStatistics();
    }
    
    console.log('✅ Analytics display updated');
}

// Make closeEventDetailsModal available globally for onclick handlers
window.closeEventDetailsModal = closeEventDetailsModal;

console.log('📊 Dashboard module loaded');

/**
 * Update banner visibility based on event count
 * Requirements: 10.1, 10.4, 10.5
 * 
 * @param {number} eventCount - Current number of events
 */
function updateBannerVisibility(eventCount) {
    const banner = document.getElementById('quotaBanner');
    const QUOTA_LIMIT = 3;
    
    if (!banner) {
        console.warn('⚠️ Quota banner element not found');
        return;
    }
    
    // Show banner when at limit, hide otherwise
    if (eventCount >= QUOTA_LIMIT) {
        banner.style.display = 'block';
        console.log('📢 Quota banner shown (event count:', eventCount, ')');
    } else {
        banner.style.display = 'none';
        console.log('🔇 Quota banner hidden (event count:', eventCount, ')');
    }
}

/**
 * Initialize quota banner with QuotaStateManager
 * Requirements: 10.1, 10.4, 10.5
 */
async function initializeQuotaBanner() {
    console.log('🎗️ Initializing quota banner');
    
    if (!currentUser) {
        console.warn('⚠️ Cannot initialize quota banner: no current user');
        return;
    }
    
    // Check if QuotaStateManager is available
    if (!window.QuotaStateManager) {
        console.warn('⚠️ QuotaStateManager not available');
        return;
    }
    
    // Initialize QuotaStateManager if not already initialized
    if (!window.QuotaStateManager.state.userId) {
        await window.QuotaStateManager.initialize(currentUser.uid);
    }
    
    // Subscribe to quota state changes
    window.QuotaStateManager.subscribe((state) => {
        console.log('📊 Quota state changed:', state);
        updateBannerVisibility(state.eventCount);
        updateDashboardQuotaDisplay(state);
        updateHeaderButtonState(state);
    });
    
    // Update banner and quota display with current state
    const currentState = window.QuotaStateManager.getState();
    updateBannerVisibility(currentState.eventCount);
    updateDashboardQuotaDisplay(currentState);
    updateHeaderButtonState(currentState);
    
    console.log('✅ Quota banner initialized');
}

/**
 * Update dashboard quota display
 * Requirements: 3.1, 3.2
 * 
 * @param {Object} state - Quota state object
 */
function updateDashboardQuotaDisplay(state) {
    const quotaDisplay = document.getElementById('dashboardQuotaDisplay');
    const quotaText = document.getElementById('dashboardQuotaText');
    
    if (!quotaDisplay || !quotaText) {
        return;
    }
    
    // Show quota display
    quotaDisplay.style.display = 'block';
    
    // Update text
    const eventWord = state.eventCount === 1 ? 'event' : 'events';
    quotaText.textContent = `${state.eventCount} of ${state.quotaLimit} ${eventWord} created`;
    
    // Add visual indicator if at limit
    if (state.isAtLimit) {
        quotaDisplay.classList.add('at-limit');
    } else {
        quotaDisplay.classList.remove('at-limit');
    }
}

/**
 * Update header create button state based on quota
 * Requirements: 4.1, 4.2
 * 
 * @param {Object} state - Quota state object
 */
function updateHeaderButtonState(state) {
    const headerBtn = document.getElementById('createNewEventBtnHeader');
    
    if (!headerBtn) {
        return;
    }
    
    // Disable button when event count >= 3
    if (state.isAtLimit) {
        headerBtn.disabled = true;
        headerBtn.setAttribute('aria-disabled', 'true');
        headerBtn.title = 'You have reached the 3-event limit. Delete an event to create a new one.';
    } else {
        headerBtn.disabled = false;
        headerBtn.setAttribute('aria-disabled', 'false');
        headerBtn.title = 'Create a new event';
    }
}

// Make dismissBanner available globally for onclick handler
window.dismissBanner = dismissBanner;
