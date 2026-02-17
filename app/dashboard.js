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
    if (window.AuthManager) {
        await window.AuthManager.initialize();
        
        // Check authentication
        if (!window.AuthManager.isAuthenticated()) {
            console.log('⚠️ User not authenticated, redirecting to landing page');
            window.location.href = '/';
            return;
        }
        
        currentUser = window.AuthManager.getCurrentUser();
        console.log('✅ User authenticated:', currentUser.email);
        
        // Load user's events
        await loadEvents();
    } else {
        console.error('❌ AuthManager not available');
        window.location.href = '/';
    }
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Set up event listeners for dashboard actions
 */
function setupEventListeners() {
    const createNewEventBtn = document.getElementById('createNewEventBtn');
    const createFirstEventBtn = document.getElementById('createFirstEventBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    
    if (createNewEventBtn) {
        createNewEventBtn.addEventListener('click', navigateToCreate);
    }
    
    if (createFirstEventBtn) {
        createFirstEventBtn.addEventListener('click', navigateToCreate);
    }
    
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
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
    
    // Render each event
    sortedEvents.forEach(event => {
        const eventCard = createEventCard(event);
        eventsContainer.appendChild(eventCard);
    });
    
    // Show container
    eventsContainer.style.display = 'grid';
}

/**
 * Create event card element
 * Requirements: 4.2
 */
function createEventCard(event) {
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
    
    // Build event URL
    const eventUrl = `${window.location.origin}/app/questions.html?id=${event.id}`;
    
    card.innerHTML = `
        <div class="event-card-header">
            <h3 class="event-title">${escapeHtml(event.title)}</h3>
            <div class="event-date">${formattedDate}</div>
        </div>
        
        <div class="event-card-body">
            <div class="event-stats">
                <div class="event-stat">
                    <span class="stat-icon">👥</span>
                    <span class="stat-value">${participantCount}</span>
                    <span class="stat-label">Participants</span>
                </div>
                <div class="event-stat">
                    <span class="stat-icon">🔑</span>
                    <span class="stat-value">${event.pin}</span>
                    <span class="stat-label">PIN</span>
                </div>
            </div>
            
            <div class="event-link-container">
                <input type="text" 
                       class="event-link-input" 
                       value="${eventUrl}" 
                       readonly>
                <button class="copy-link-btn" 
                        data-url="${eventUrl}"
                        title="Copy link">
                    📋
                </button>
            </div>
        </div>
        
        <div class="event-card-footer">
            <button class="view-details-btn" data-event-id="${event.id}">
                View Details
            </button>
            <button class="delete-event-btn" data-event-id="${event.id}">
                Delete
            </button>
        </div>
    `;
    
    // Add event listeners
    const copyBtn = card.querySelector('.copy-link-btn');
    copyBtn.addEventListener('click', () => copyEventLink(eventUrl));
    
    const viewDetailsBtn = card.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', () => navigateToEventDetails(event.id));
    
    const deleteBtn = card.querySelector('.delete-event-btn');
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
 * Navigate to event creation page
 * Requirements: 4.4
 */
function navigateToCreate() {
    console.log('➕ Navigating to event creation');
    window.location.href = '/app/create';
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
    const confirmed = confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`);
    
    if (!confirmed) {
        return;
    }
    
    console.log('🗑️ Deleting event:', eventId);
    
    try {
        // TODO: Implement deleteEvent in FirebaseAPI
        // For now, just remove from local list and reload
        showToast('Event deletion will be implemented in a future task');
        
        // Reload events
        await loadEvents();
    } catch (error) {
        console.error('❌ Failed to delete event:', error);
        showError('Failed to delete event. Please try again.');
    }
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
        window.location.href = '/';
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
    
    // Get participants
    const participants = event.participants || [];
    const participantCount = participants.length;
    
    document.getElementById('detailsParticipantCount').textContent = participantCount;
    
    // Calculate and display statistics
    if (participantCount > 0) {
        const stats = calculateEventStatistics(participants);
        displayEventStatistics(stats);
        displayParticipantsList(participants);
        
        // Show participants list, hide no participants message
        document.getElementById('detailsParticipantsList').style.display = 'block';
        document.getElementById('detailsNoParticipants').style.display = 'none';
    } else {
        // No participants yet
        displayEmptyStatistics();
        
        // Hide participants list, show no participants message
        document.getElementById('detailsParticipantsList').style.display = 'none';
        document.getElementById('detailsNoParticipants').style.display = 'block';
    }
    
    // Set up view spectrum button
    const viewSpectrumBtn = document.getElementById('viewSpectrumBtn');
    viewSpectrumBtn.onclick = () => {
        window.location.href = `/app/spectrum.html?id=${event.id}`;
    };
    
    // Set up real-time updates for analytics
    // Requirements: 8.5, 8.6
    setupRealTimeAnalyticsUpdates(event.id);
    
    // Show the modal
    document.getElementById('eventDetailsModal').style.display = 'block';
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
 * Display participants list with scores
 * Requirements: 8.4
 */
function displayParticipantsList(participants) {
    const listContainer = document.getElementById('detailsParticipantsList');
    
    // Clear existing content
    listContainer.innerHTML = '';
    
    // Sort participants by score (highest to lowest)
    const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
    
    // Create participant items
    sortedParticipants.forEach((participant, index) => {
        const participantItem = document.createElement('div');
        participantItem.className = 'participant-item';
        
        const scoreValue = participant.score > 0 ? `+${participant.score}` : participant.score.toString();
        const rank = index + 1;
        
        participantItem.innerHTML = `
            <div class="participant-rank">#${rank}</div>
            <div class="participant-avatar">${participant.avatar}</div>
            <div class="participant-info">
                <div class="participant-name">${escapeHtml(participant.name)}</div>
                <div class="participant-score">Score: ${scoreValue}</div>
            </div>
        `;
        
        listContainer.appendChild(participantItem);
    });
}

/**
 * Close event details modal
 */
function closeEventDetailsModal() {
    document.getElementById('eventDetailsModal').style.display = 'none';
    
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
    
    // Update participant count
    document.getElementById('detailsParticipantCount').textContent = participantCount;
    
    // Update statistics and participants list
    if (participantCount > 0) {
        const stats = calculateEventStatistics(participants);
        displayEventStatistics(stats);
        displayParticipantsList(participants);
        
        // Show participants list, hide no participants message
        document.getElementById('detailsParticipantsList').style.display = 'block';
        document.getElementById('detailsNoParticipants').style.display = 'none';
    } else {
        // No participants yet
        displayEmptyStatistics();
        
        // Hide participants list, show no participants message
        document.getElementById('detailsParticipantsList').style.display = 'none';
        document.getElementById('detailsNoParticipants').style.display = 'block';
    }
    
    console.log('✅ Analytics display updated');
}

// Make closeEventDetailsModal available globally for onclick handlers
window.closeEventDetailsModal = closeEventDetailsModal;

console.log('📊 Dashboard module loaded');
