const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');
const isFreePlayMode = eventId === 'freeplay';
let eventData;

// Hide spectrum immediately for free play mode (before page renders)
if (isFreePlayMode) {
    // Add CSS to hide spectrum container immediately
    const style = document.createElement('style');
    style.textContent = `
        .spectrum-container { display: none !important; }
        .header-search { display: none !important; }
    `;
    document.head.appendChild(style);
}

// Load event data from Firebase or localStorage
loadEventData();

// Set up real-time updates for Firebase
let realTimeListener = null;

async function loadEventData() {
    console.log('🔍 Loading event data for ID:', eventId);
    
    // Try Firebase first - this is the primary source for cross-device data
    try {
        console.log('🔥 Attempting Firebase load...');
        eventData = await window.FirebaseAPI.loadEvent(eventId);
        if (eventData && eventData.participants && eventData.participants.length > 0) {
            console.log('✅ Results loaded from Firebase:', eventData.participants.length, 'participants');
            console.log('📊 Firebase event data:', JSON.stringify(eventData, null, 2));
            setupRealTimeUpdates();
            console.log('📊 Proceeding to load results with Firebase data');
            loadResults();
            return; // Use Firebase data and exit - don't override with localStorage
        } else {
            console.log('⚠️ Event not found in Firebase or no participants - trying localStorage fallback');
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
        console.log('📁 Falling back to localStorage...');
    }
    
    // Only use localStorage as fallback if Firebase has no data
    console.log('📁 Checking localStorage for fallback data...');
    const localStorageData = localStorage.getItem(`event_${eventId}`);
    console.log('📁 Raw localStorage data:', localStorageData);
    
    const localEventData = JSON.parse(localStorageData || 'null');
    if (localEventData && localEventData.participants && localEventData.participants.length > 0) {
        console.log('✅ Results loaded from localStorage fallback:', localEventData.participants.length, 'participants');
        console.log('📊 localStorage event data:', JSON.stringify(localEventData, null, 2));
        eventData = localEventData;
        setupLocalStoragePolling();
        console.log('📊 Proceeding to load results with localStorage data');
        loadResults();
        return;
    }
    
    // Final fallback - no data found anywhere
    console.error('💥 CRITICAL: No event data found anywhere!');
    console.log('🔍 Debug info:', {
        eventId: eventId,
        currentURL: window.location.href,
        localStorage_keys: Object.keys(localStorage),
        firebase_available: typeof window.FirebaseAPI !== 'undefined'
    });
    document.body.innerHTML = '<div class="container"><div class="card"><h1>Event not found</h1><p>Event ID: ' + eventId + '</p><p>Check console for debug information</p></div></div>';
}

function setupRealTimeUpdates() {
    // Set up Firebase real-time listener if available
    if (window.FirebaseAPI && window.FirebaseAPI.onEventUpdate) {
        console.log('🔄 Setting up real-time updates...');
        realTimeListener = window.FirebaseAPI.onEventUpdate(eventId, (updatedEventData) => {
            if (updatedEventData && hasParticipantChanges(eventData, updatedEventData)) {
                console.log('🆕 Participant changes detected, updating results...');
                const hadNewParticipants = hasNewParticipants(eventData, updatedEventData);
                eventData = updatedEventData;
                refreshResults(hadNewParticipants);
            }
        });
    } else {
        // Fallback to polling every 5 seconds
        setupPolling();
    }
}

function setupLocalStoragePolling() {
    // Poll localStorage every 3 seconds for changes
    setInterval(() => {
        const updatedData = JSON.parse(localStorage.getItem(`event_${eventId}`) || 'null');
        if (updatedData && hasParticipantChanges(eventData, updatedData)) {
            console.log('🆕 Participant changes detected in localStorage, updating results...');
            const hadNewParticipants = hasNewParticipants(eventData, updatedData);
            eventData = updatedData;
            refreshResults(hadNewParticipants);
        }
    }, 3000);
}

function setupPolling() {
    // Poll Firebase every 5 seconds as fallback
    setInterval(async () => {
        try {
            const updatedData = await window.FirebaseAPI.loadEvent(eventId);
            
            // If main event document is empty, try individual documents
            if (updatedData && (!updatedData.participants || updatedData.participants.length === 0)) {
                console.log('🔄 Main event document empty, checking individual documents...');
                const individualParticipants = await window.FirebaseAPI.loadParticipantsFromIndividualDocs(eventId);
                if (individualParticipants && individualParticipants.length > 0) {
                    updatedData.participants = individualParticipants;
                }
            }
            
            if (updatedData && hasParticipantChanges(eventData, updatedData)) {
                console.log('🆕 Participant changes detected via polling, updating results...');
                const hadNewParticipants = hasNewParticipants(eventData, updatedData);
                eventData = updatedData;
                refreshResults(hadNewParticipants);
            }
        } catch (error) {
            // Silently handle polling errors
        }
    }, 5000);
}

function refreshResults(showNewParticipantNotification = false) {
    // Update stored participants data
    allParticipants = [...eventData.participants];
    
    // Re-render participants with new data
    setTimeout(() => {
        renderParticipants();
        updateSearchCount();
    }, 100);
    
    // Only show notification if there are actually new participants
    if (showNewParticipantNotification) {
        showUpdateNotification();
    }
}

function showUpdateNotification() {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = `New participant joined! (${eventData.participants.length} total)`;
    
    // Add animation keyframes
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function centerSpectrumOnZero() {
    // Only apply centering on mobile devices (width <= 920px)
    if (window.innerWidth <= 920) {
        const spectrumContainer = document.querySelector('.spectrum-container');
        if (spectrumContainer) {
            // Calculate the scroll position to center on 0
            // The spectrum is 1024px wide on mobile, center (0 position) is at 512px
            const spectrumWidth = 1024;
            const viewportWidth = window.innerWidth;
            
            // Center position should show 0 in the middle of the viewport
            // 0 is at 50% of the spectrum width, so scroll to center that position
            const zeroPosition = spectrumWidth * 0.5; // 512px
            const centerPosition = zeroPosition - (viewportWidth / 2);
            
            // Use setTimeout to ensure DOM is ready and apply centering
            setTimeout(() => {
                spectrumContainer.scrollLeft = centerPosition;
            }, 50);
        }
    }
}

// Handle window resize to re-center if needed
window.addEventListener('resize', () => {
    if (eventData) {
        centerSpectrumOnZero();
    }
});

// Helper function to detect participant changes
function hasParticipantChanges(oldData, newData) {
    if (!oldData || !newData) return true;
    if (oldData.participants.length !== newData.participants.length) return true;
    
    // Create sets of participant IDs for comparison
    const oldIds = new Set(oldData.participants.map(p => p.id));
    const newIds = new Set(newData.participants.map(p => p.id));
    
    // Check if any participants were added or removed
    if (oldIds.size !== newIds.size) return true;
    for (let id of oldIds) {
        if (!newIds.has(id)) return true;
    }
    for (let id of newIds) {
        if (!oldIds.has(id)) return true;
    }
    
    // Check for score, name, or avatar changes
    for (let i = 0; i < oldData.participants.length; i++) {
        const oldParticipant = oldData.participants[i];
        const newParticipant = newData.participants.find(p => p.id === oldParticipant.id);
        
        if (!newParticipant || 
            oldParticipant.score !== newParticipant.score || 
            oldParticipant.name !== newParticipant.name ||
            oldParticipant.avatar !== newParticipant.avatar) {
            return true;
        }
    }
    
    return false;
}

// Helper function to detect if new participants were added (not just changes)
function hasNewParticipants(oldData, newData) {
    if (!oldData || !newData) return false;
    
    // Only return true if the participant count increased
    return newData.participants.length > oldData.participants.length;
}

// Clean up listener when page unloads
window.addEventListener('beforeunload', () => {
    if (realTimeListener && typeof realTimeListener === 'function') {
        realTimeListener();
    }
});

// Global variables for search functionality
let allParticipants = [];
let currentSearchTerm = '';

// Dynamic spectrum configuration
let spectrumConfig = {
    min: -25,
    max: 25,
    colorInterval: 5
};

// Calculate dynamic spectrum range based on event's selected questions
function calculateDynamicSpectrumRange() {
    if (typeof questions === 'undefined') {
        console.warn('Questions array not found, using default spectrum range');
        return spectrumConfig;
    }
    
    // Get the questions that were actually used in this event
    let eventQuestions = [];
    
    // Use disabled questions from event data if available, otherwise infer from participant answers
    let disabledQuestions = [];
    
    // First, try to get disabled questions from event data if available
    if (eventData && eventData.disabledQuestions && Array.isArray(eventData.disabledQuestions)) {
        disabledQuestions = eventData.disabledQuestions;
        console.log('📋 Using disabled questions from event data:', disabledQuestions);
    } else {
        // Fallback: infer from participant answers (for older events without stored disabled questions)
        console.log('📋 Event has no stored disabled questions, inferring from participant answers...');
        
        if (eventData && eventData.participants && eventData.participants.length > 0) {
            // Get all question indices that have been answered by any participant
            const answeredQuestionIndices = new Set();
            eventData.participants.forEach(participant => {
                if (participant.answers) {
                    // Handle both object format {16: 1} and array format [null, null, ..., 1, 0, ...]
                    if (Array.isArray(participant.answers)) {
                        participant.answers.forEach((answer, index) => {
                            if (answer !== null && answer !== undefined) {
                                answeredQuestionIndices.add(index);
                            }
                        });
                    } else {
                        Object.keys(participant.answers).forEach(index => {
                            answeredQuestionIndices.add(parseInt(index));
                        });
                    }
                }
            });
            
            console.log('📋 All answered question indices:', Array.from(answeredQuestionIndices).sort((a, b) => a - b));
            console.log('📋 Total questions in questions.js:', questions.length);
            
            // Assume questions not answered by anyone were disabled
            disabledQuestions = [];
            for (let i = 0; i < questions.length; i++) {
                if (!answeredQuestionIndices.has(i)) {
                    disabledQuestions.push(i);
                }
            }
            console.log('📋 Inferred disabled questions from participant answers:', disabledQuestions);
        } else {
            // Last resort: use empty array (all questions enabled)
            console.log('📋 No participant data available, assuming all questions were enabled');
            disabledQuestions = [];
        }
    }
    
    // Filter out disabled questions to get the event's actual question set
    eventQuestions = questions.filter((_, index) => !disabledQuestions.includes(index));
    
    console.log(`📊 Event uses ${eventQuestions.length} out of ${questions.length} total questions`);
    console.log(`📊 Enabled questions (indices):`, questions.map((_, index) => index).filter(index => !disabledQuestions.includes(index)));
    
    // Calculate sum of positive and negative values for event's enabled questions only
    let positiveSum = 0;
    let negativeSum = 0;
    
    eventQuestions.forEach((question, index) => {
        console.log(`📊 Question ${questions.indexOf(question)}: "${question.text}" = ${question.value}`);
        if (question.value > 0) {
            positiveSum += question.value;
        } else {
            negativeSum += Math.abs(question.value);
        }
    });
    
    console.log(`📊 Event question analysis: Positive sum: ${positiveSum}, Negative sum: ${negativeSum}`);
    
    // Use the higher sum to determine range
    const maxSum = Math.max(positiveSum, negativeSum);
    
    console.log(`🔍 Calculation details: positiveSum=${positiveSum}, negativeSum=${negativeSum}, maxSum=${maxSum}`);
    
    // Use the higher sum to determine the predefined range
    let min, max, colorInterval;
    
    if (maxSum >= 20 && maxSum <= 25) {
        min = -25;
        max = 25;
        colorInterval = 5; // Sections every 5 points
        console.log(`📏 Range 20-25: Using -25 to +25 (sections every 5 points)`);
    } else if (maxSum >= 15 && maxSum <= 19) {
        min = -20;
        max = 20;
        colorInterval = 4; // Sections every 4 points
        console.log(`📏 Range 15-19: Using -20 to +20 (sections every 4 points)`);
    } else if (maxSum >= 10 && maxSum <= 14) {
        min = -15;
        max = 15;
        colorInterval = 3; // Sections every 3 points
        console.log(`📏 Range 10-14: Using -15 to +15 (sections every 3 points)`);
    } else if (maxSum >= 5 && maxSum <= 9) {
        min = -10;
        max = 10;
        colorInterval = 2; // Sections every 2 points
        console.log(`📏 Range 5-9: Using -10 to +10 (sections every 2 points)`);
    } else if (maxSum >= 1 && maxSum <= 4) {
        min = -5;
        max = 5;
        colorInterval = 1; // Sections every 1 point
        console.log(`📏 Range 1-4: Using -5 to +5 (sections every 1 point)`);
    } else {
        // Fallback to default
        min = -25;
        max = 25;
        colorInterval = 5;
        console.log(`📏 Fallback: Using -25 to +25`);
    }
    
    console.log(`🎯 Dynamic spectrum range for event: ${min} to ${max} (color interval: ${colorInterval})`);
    
    return {
        min,
        max,
        colorInterval
    };
}

// Update spectrum bar with dynamic range and labels
function updateSpectrumBar() {
    const spectrumBar = document.querySelector('.spectrum-bar');
    if (!spectrumBar) return;
    
    // Clear existing spectrum elements
    const existingElements = spectrumBar.querySelectorAll('.spectrum-section, .spectrum-line, .spectrum-zero-line');
    existingElements.forEach(element => element.remove());
    
    const { min, max, colorInterval } = spectrumConfig;
    const range = max - min;
    
    // Create sections for each interval
    const sections = [];
    for (let value = min; value < max; value += colorInterval) {
        sections.push({
            start: value,
            end: value + colorInterval,
            midpoint: value + (colorInterval / 2)
        });
    }
    
    console.log(`📏 Creating spectrum sections:`, sections.map(s => `${s.start} to ${s.end}`));
    
    // Create colored sections
    sections.forEach(sectionData => {
        const section = document.createElement('div');
        section.className = 'spectrum-section';
        section.setAttribute('data-start', sectionData.start.toString());
        section.setAttribute('data-end', sectionData.end.toString());
        
        // Position and size the section
        const startPosition = ((sectionData.start - min) / range) * 100;
        const endPosition = ((sectionData.end - min) / range) * 100;
        const width = endPosition - startPosition;
        
        section.style.left = `${startPosition}%`;
        section.style.width = `${width}%`;
        
        // Add section number text - show the start value instead of end value for negative sections
        let sectionNumber;
        if (sectionData.start < 0) {
            // For negative sections, show the start value (e.g., -15, -12, -9, etc.)
            sectionNumber = sectionData.start.toString();
        } else if (sectionData.start === 0) {
            // For the section that starts at 0, show the end value with +
            sectionNumber = `+${sectionData.end}`;
        } else {
            // For positive sections, show the end value with +
            sectionNumber = `+${sectionData.end}`;
        }
        section.textContent = sectionNumber;
        
        // Add color class based on distance from center
        const colorClass = getColorClassForSection(sectionData.midpoint, colorInterval);
        if (colorClass) {
            section.classList.add(colorClass);
        }
        
        spectrumBar.appendChild(section);
    });
    
    // Create only the zero line (no other lines) - without the "0" text
    if (min <= 0 && max >= 0) {
        const zeroLine = document.createElement('div');
        zeroLine.className = 'spectrum-zero-line';
        zeroLine.setAttribute('data-value', '0');
        
        // Position the zero line
        const position = ((0 - min) / range) * 100;
        zeroLine.style.left = `${position}%`;
        
        spectrumBar.appendChild(zeroLine);
    }
    
    // Update CSS custom properties for dynamic color intervals
    updateSpectrumColors(min, max, colorInterval);
}

// Get color class for a section based on its distance from center
function getColorClassForSection(sectionMidpoint, colorInterval) {
    // Calculate distance from center (0)
    const distanceFromCenter = Math.abs(sectionMidpoint);
    
    // Determine which color segment based on distance
    const segmentIndex = Math.floor(distanceFromCenter / colorInterval);
    
    // Color progression from center outward: red (closest) -> orange -> yellow -> green -> blue (furthest)
    const colors = ['spectrum-red', 'spectrum-orange', 'spectrum-yellow', 'spectrum-green', 'spectrum-blue'];
    const colorIndex = Math.min(segmentIndex, colors.length - 1);
    
    return colors[colorIndex];
}

// Update spectrum colors based on dynamic intervals
function updateSpectrumColors(min, max, colorInterval) {
    // Remove existing dynamic styles
    const existingStyle = document.getElementById('dynamic-spectrum-colors');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // Create new dynamic color styles
    const style = document.createElement('style');
    style.id = 'dynamic-spectrum-colors';
    
    const totalSegments = Math.ceil(Math.max(Math.abs(min), Math.abs(max)) / colorInterval);
    
    // Color progression from center outward as specified by user
    const colorMap = [
        '#F5C1B6', // Red (closest to center)
        '#F5D1B6', // Orange
        '#F0F5B6', // Yellow
        '#B6F5DE', // Green
        '#B6C1F5'  // Blue (furthest from center)
    ];
    
    let css = `
        /* Remove any background from spectrum bar to show individual sections */
        .spectrum-bar {
            background: none !important;
        }
        
        /* Zero line styling - central line at 0 */
        .spectrum-zero-line {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #333 !important;
            transform: translateX(-50%);
            z-index: 10;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 8px;
            font-size: 2.5rem;
            font-weight: 700;
            color: rgba(0, 0, 0, 0.6);
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
        }
        
        /* Colored sections with numbers */
        .spectrum-section {
            position: absolute;
            top: 0;
            bottom: 0;
            z-index: 1;
            display: flex;
            align-items: flex-start;
            padding-top: 8px;
            font-size: 2.5rem;
            font-weight: 700;
            color: rgba(0, 0, 0, 0.6);
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
        }
        
        /* Position negative numbers closer to their right boundary (closer to zero) */
        .spectrum-section[data-start^="-"] {
            justify-content: flex-start;
            padding-left: 8px;
        }
        
        /* Position positive numbers closer to their left boundary (closer to zero) */
        .spectrum-section[data-start="0"] {
            justify-content: flex-end;
            padding-right: 8px;
        }
        
        /* Position other positive sections closer to their left boundary (closer to zero) */
        .spectrum-section:not([data-start^="-"]):not([data-start="0"]) {
            justify-content: flex-end;
            padding-right: 8px;
        }
    `;
    
    // Generate CSS for each color segment with solid colors
    for (let segment = 0; segment < totalSegments; segment++) {
        const backgroundColor = colorMap[Math.min(segment, colorMap.length - 1)];
        
        css += `
            .spectrum-section.spectrum-${segment === 0 ? 'red' : segment === 1 ? 'orange' : segment === 2 ? 'yellow' : segment === 3 ? 'green' : 'blue'} {
                background-color: ${backgroundColor} !important;
            }
        `;
    }
    
    style.textContent = css;
    document.head.appendChild(style);
    
    console.log(`🎨 Applied dynamic color intervals: ${colorInterval} points per color segment`);
    console.log(`🎨 Color progression: ${colorMap.slice(0, totalSegments).join(' -> ')}`);
}

function loadResults() {
    // Check if we're in free play mode
    if (isFreePlayMode) {
        console.log('🎮 Free play mode detected - rendering analytics instead of spectrum');
        renderFreePlayAnalytics();
        return;
    }
    
    document.getElementById('eventTitle').textContent = eventData.title + ' - Results';

    // Show "View Spectrum" button for event mode
    const viewSpectrumBtn = document.getElementById('viewSpectrumBtn');
    if (viewSpectrumBtn) {
        viewSpectrumBtn.style.display = 'block';
    }

    // Calculate dynamic spectrum configuration
    spectrumConfig = calculateDynamicSpectrumRange();
    
    // Update spectrum bar with dynamic range
    updateSpectrumBar();
    
    // Center spectrum on 0 position for mobile devices
    centerSpectrumOnZero();
    
    // Store all participants for search functionality
    allParticipants = [...eventData.participants];
    
    // Apply dynamic row allocation and render participants
    renderParticipants();
    
    // Set up search functionality
    setupSearchFunctionality();
    
    // Update search results count
    updateSearchCount();
    
    // Show current participant's modal automatically
    showCurrentParticipantModal();
}

function renderParticipants() {
    const spectrumBar = document.querySelector('.spectrum-bar');
    
    // Clear existing participants
    const existingParticipants = spectrumBar.querySelectorAll('.participant-marker');
    existingParticipants.forEach(p => p.remove());
    
    // Sort participants by score for consistent ordering
    const sortedParticipants = [...allParticipants].sort((a, b) => a.score - b.score);
    
    // Simple round-robin allocation across 20 rows
    const participantRows = allocateDynamicRows(sortedParticipants);
    
    // Create participant elements
    participantRows.forEach((data, participant) => {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant-marker';
        participantDiv.setAttribute('data-participant-id', participant.id);
        
        // Set row data attribute for positioning
        participantDiv.setAttribute('data-row', data.row);
        
        // Apply search filter if active
        const matchesSearch = doesParticipantMatchSearch(participant, currentSearchTerm);
        if (currentSearchTerm && !matchesSearch) {
            participantDiv.classList.add('filtered-out');
        }
        
        participantDiv.innerHTML = `
            <div class="participant-container" style="left: ${data.position}%" onclick="showParticipantModal('${participant.id}')">
                <div class="participant-avatar">${participant.avatar}</div>
                <div class="participant-name-label">${participant.name} (${participant.score > 0 ? '+' : ''}${participant.score})</div>
            </div>
        `;
        
        spectrumBar.appendChild(participantDiv);
    });
}

function allocateDynamicRows(sortedParticipants) {
    const participantRows = new Map();
    const { min, max, colorInterval } = spectrumConfig;
    const range = max - min;
    
    console.log(`🚀 Starting simple round-robin allocation for ${sortedParticipants.length} participants across 20 rows`);
    console.log(`📏 Using dynamic range: ${min} to ${max} (total range: ${range})`);
    
    // Simple round-robin distribution across exactly 20 rows
    sortedParticipants.forEach((participant, index) => {
        // Calculate position based on dynamic score range
        // Clamp score to the dynamic range to handle edge cases
        const clampedScore = Math.max(min, Math.min(max, participant.score));
        
        // Position participants correctly within the spectrum range
        let scorePercentage;
        
        if (clampedScore === 0) {
            // Score 0: position on the zero line (center)
            scorePercentage = ((0 - min) / range) * 100;
        } else {
            // For non-zero scores, position them proportionally within the range
            // Simple linear positioning: score relative to the total range
            scorePercentage = ((clampedScore - min) / range) * 100;
        }
        
        // Round-robin: cycle through rows 0-19
        const assignedRow = index % 20;
        
        console.log(`👤 ${participant.name} (${participant.score}) → Row ${assignedRow}, Position: ${scorePercentage.toFixed(1)}%`);
        
        participantRows.set(participant, {
            row: assignedRow,
            position: scorePercentage
        });
    });
    
    return participantRows;
}


function setupSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    const searchToggle = document.getElementById('searchToggle');
    const searchContainer = document.getElementById('searchContainer');
    
    if (!searchInput || !searchToggle || !searchContainer) return;
    
    // Toggle search container visibility
    searchToggle.addEventListener('click', () => {
        const isVisible = searchContainer.style.display !== 'none';
        
        if (isVisible) {
            // Hide search
            searchContainer.style.display = 'none';
            searchToggle.classList.remove('active');
            // Clear search when hiding
            searchInput.value = '';
            handleSearchInput({ target: { value: '' } });
        } else {
            // Show search
            searchContainer.style.display = 'block';
            searchToggle.classList.add('active');
            // Focus on input
            setTimeout(() => searchInput.focus(), 100);
        }
    });
    
    // Close search when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchToggle.contains(e.target) && !searchContainer.contains(e.target)) {
            searchContainer.style.display = 'none';
            searchToggle.classList.remove('active');
        }
    });
    
    // Remove existing event listeners to prevent duplicates
    searchInput.removeEventListener('input', handleSearchInput);
    searchInput.removeEventListener('keyup', handleSearchInput);
    
    // Add search event listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keyup', handleSearchInput);
    
    // Clear search on escape key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            handleSearchInput({ target: { value: '' } });
            searchContainer.style.display = 'none';
            searchToggle.classList.remove('active');
        }
    });
}

function handleSearchInput(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    currentSearchTerm = searchTerm;
    
    // Apply search filter to all participants
    const participantMarkers = document.querySelectorAll('.participant-marker');
    let visibleCount = 0;
    
    participantMarkers.forEach(marker => {
        const participantId = marker.getAttribute('data-participant-id');
        const participant = allParticipants.find(p => p.id === participantId);
        
        if (participant) {
            const matches = doesParticipantMatchSearch(participant, searchTerm);
            
            if (searchTerm === '' || matches) {
                marker.classList.remove('filtered-out');
                visibleCount++;
            } else {
                marker.classList.add('filtered-out');
            }
        }
    });
    
    // Update search results count
    updateSearchCount(visibleCount, allParticipants.length);
}

function doesParticipantMatchSearch(participant, searchTerm) {
    if (!searchTerm) return true;
    
    const name = participant.name.toLowerCase();
    const score = participant.score.toString();
    const avatar = participant.avatar.toLowerCase();
    
    return name.includes(searchTerm) || 
           score.includes(searchTerm) || 
           avatar.includes(searchTerm);
}

function updateSearchCount(visibleCount = null, totalCount = null) {
    const searchCountElement = document.getElementById('searchCount');
    if (!searchCountElement) return;
    
    if (visibleCount === null) {
        visibleCount = allParticipants.length;
        totalCount = allParticipants.length;
    }
    
    if (currentSearchTerm) {
        searchCountElement.textContent = `${visibleCount} of ${totalCount} participants`;
        searchCountElement.style.display = 'block';
    } else {
        searchCountElement.textContent = `${totalCount} participants`;
        searchCountElement.style.display = 'block';
    }
}

// Modal functionality
function showParticipantModal(participantId) {
    const participant = allParticipants.find(p => p.id === participantId);
    if (!participant) return;
    
    // Calculate statistics
    const stats = calculateParticipantStats(participant);
    
    // Populate modal content
    document.getElementById('modalAvatar').textContent = participant.avatar;
    document.getElementById('modalName').textContent = participant.name;
    document.getElementById('modalScore').textContent = `Score: ${participant.score > 0 ? '+' : ''}${participant.score}`;
    
    // Populate statistics
    document.getElementById('privilegeComparison').textContent = stats.privilegeComparison;
    document.getElementById('privilegeComparison').className = `stat-value ${stats.privilegeClass}`;
    
    document.getElementById('modeComparison').textContent = stats.modeComparison;
    document.getElementById('modeComparison').className = `stat-value ${stats.modeClass}`;
    
    document.getElementById('medianComparison').textContent = stats.medianComparison;
    document.getElementById('medianComparison').className = `stat-value ${stats.medianClass}`;
    
    // Add ally tips based on participant's score
    const { min, max } = spectrumConfig;
    const allyTipsArray = getTipsForScore(participant.score, min, max);
    const category = categorizeScore(participant.score, min, max);
    const allyTipsHTML = renderTips(allyTipsArray, category);
    
    const modalAllyTips = document.getElementById('modalAllyTips');
    if (modalAllyTips) {
        modalAllyTips.innerHTML = allyTipsHTML;
    }
    
    // Show modal
    document.getElementById('participantModal').style.display = 'block';
}

function calculateParticipantStats(participant) {
    const scores = allParticipants.map(p => p.score);
    const totalParticipants = scores.length;
    
    // Calculate how many participants have lower scores (less privileged)
    const lessPrivilegedCount = scores.filter(score => score < participant.score).length;
    
    // Calculate mode (most frequent score)
    const scoreFrequency = {};
    scores.forEach(score => {
        scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
    });
    const maxFrequency = Math.max(...Object.values(scoreFrequency));
    const modes = Object.keys(scoreFrequency).filter(score => scoreFrequency[score] === maxFrequency).map(Number);
    const mode = modes.length === 1 ? modes[0] : modes[0]; // Use first mode if multiple
    
    // Calculate median
    const sortedScores = [...scores].sort((a, b) => a - b);
    const median = sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
        : sortedScores[Math.floor(sortedScores.length / 2)];
    
    // Calculate differences
    const modeDifference = participant.score - mode;
    const medianDifference = participant.score - median;
    
    // Format results with "You are:" prefix
    const privilegeComparison = `${lessPrivilegedCount} participants out of ${totalParticipants} are less privileged than you`;
    
    const modeComparison = modeDifference === 0 
        ? "You scored exactly at the mode"
        : `${Math.abs(modeDifference)} points ${modeDifference > 0 ? 'above' : 'below'} the mode`;
    
    const medianComparison = medianDifference === 0 
        ? "You scored exactly at the median"
        : `${Math.abs(medianDifference)} points ${medianDifference > 0 ? 'above' : 'below'} the median`;
    
    return {
        privilegeComparison,
        modeComparison,
        medianComparison,
        privilegeClass: '',
        modeClass: '',
        medianClass: ''
    };
}

function closeModal() {
    document.getElementById('participantModal').style.display = 'none';
}

// Navigation function for detailed results
function showDetailedResults() {
    if (!eventId) {
        console.error('No event ID available for navigation');
        return;
    }
    
    // Navigate to detailed results page
    window.location.href = `/app/detailed-results.html?id=${eventId}`;
}

// Navigation function for spectrum page
function viewSpectrum() {
    if (!eventId) {
        console.error('No event ID available for navigation');
        return;
    }
    
    // Navigate to spectrum page
    window.location.href = `/app/spectrum.html?id=${eventId}`;
}

// Function to automatically show current participant's modal
function showCurrentParticipantModal() {
    if (!eventId) {
        console.log('❌ No event ID available, cannot show current participant modal');
        return;
    }
    
    // Get current participant data from localStorage
    const currentParticipantData = localStorage.getItem(`participant_${eventId}`);
    if (!currentParticipantData) {
        console.log('❌ No current participant data found in localStorage');
        return;
    }
    
    try {
        const participant = JSON.parse(currentParticipantData);
        if (!participant || !participant.id) {
            console.log('❌ Invalid participant data or missing ID');
            return;
        }
        
        console.log('✅ Found current participant:', participant.name, 'with ID:', participant.id);
        
        // Check if this participant exists in the results
        const foundParticipant = allParticipants.find(p => p.id === participant.id);
        if (!foundParticipant) {
            console.log('❌ Current participant not found in results');
            return;
        }
        
        // Show the modal for the current participant
        console.log('🎯 Automatically showing modal for current participant:', foundParticipant.name);
        showParticipantModal(participant.id);
        
    } catch (error) {
        console.error('❌ Error parsing current participant data:', error);
    }
}

/**
 * Render free play analytics UI
 * Requirements: 2A.1, 2A.2, 2A.3, 2A.4, 2A.5, 2A.6, 2A.8
 */
async function renderFreePlayAnalytics() {
    console.log('📊 Rendering free play analytics...');
    
    // Hide title for free play mode
    const eventTitleElement = document.getElementById('eventTitle');
    if (eventTitleElement) {
        eventTitleElement.style.display = 'none';
    }
    
    // Hide spectrum container, search functionality, and View Spectrum button (not needed for free play)
    const spectrumContainer = document.querySelector('.spectrum-container');
    const searchToggle = document.getElementById('searchToggle');
    const viewSpectrumBtn = document.getElementById('viewSpectrumBtn');
    
    if (spectrumContainer) spectrumContainer.style.display = 'none';
    if (searchToggle) searchToggle.style.display = 'none';
    if (viewSpectrumBtn) viewSpectrumBtn.style.display = 'none';
    
    // Get current user's data from localStorage
    const currentParticipantData = localStorage.getItem(`participant_${eventId}`);
    if (!currentParticipantData) {
        console.error('❌ No current participant data found');
        renderEmptyState();
        return;
    }
    
    const currentParticipant = JSON.parse(currentParticipantData);
    const userScore = currentParticipant.score;
    const userAnswers = currentParticipant.answers;
    
    console.log('👤 Current user score:', userScore);
    console.log('👤 Current user answers:', userAnswers);
    
    // Load all free play responses
    const responses = await loadFreePlayResponses();
    
    // Check if this is the first participant
    if (responses.length === 0 || (responses.length === 1 && responses[0].id === currentParticipant.id)) {
        console.log('🎉 First participant!');
        renderFirstParticipantState(userScore);
        return;
    }
    
    // Calculate statistics
    const scoreStats = calculateScoreStats(responses);
    const allScores = responses.map(r => r.score);
    const percentile = calculatePercentile(userScore, allScores);
    const questionStats = calculateQuestionStats(responses);
    
    console.log('📊 Statistics calculated:', { scoreStats, percentile, questionStatsCount: questionStats.length });
    
    // Render analytics sections
    const resultsContent = document.querySelector('.results-content');
    if (!resultsContent) {
        console.error('❌ Results content container not found');
        return;
    }
    
    // Clear existing content
    resultsContent.innerHTML = '';
    
    // Get ally tips for user's score
    // Use default range of -25 to 25 for free play mode
    const allyTipsArray = getTipsForScore(userScore, -25, 25);
    const category = categorizeScore(userScore, -25, 25);
    const allyTipsHTML = renderTips(allyTipsArray, category);
    
    // Create analytics container
    const analyticsContainer = document.createElement('div');
    analyticsContainer.className = 'analytics-container';
    analyticsContainer.innerHTML = `
        <div class="analytics-section score-comparison">
            <h2>Your Score Comparison</h2>
            <div class="score-highlight">
                <div class="user-score-large">Your Score: ${userScore > 0 ? '+' : ''}${userScore}</div>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Percentile</div>
                    <div class="stat-value">${percentile}th</div>
                    <div class="stat-description">You scored higher than ${percentile}% of participants</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Mean Score</div>
                    <div class="stat-value">${scoreStats.mean > 0 ? '+' : ''}${scoreStats.mean}</div>
                    <div class="stat-description">Average score across all participants</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Median Score</div>
                    <div class="stat-value">${scoreStats.median > 0 ? '+' : ''}${scoreStats.median}</div>
                    <div class="stat-description">Middle score when sorted</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Score Range</div>
                    <div class="stat-value">${scoreStats.min} to ${scoreStats.max > 0 ? '+' : ''}${scoreStats.max}</div>
                    <div class="stat-description">Based on ${responses.length} responses</div>
                </div>
            </div>
            <div class="share-section">
                <p class="empty-state-tip">Share the quiz with friends to see how their privilege compares to yours.</p>
                <button class="share-quiz-btn" onclick="shareQuiz()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    Share Quiz
                </button>
            </div>
        </div>
        
        ${allyTipsHTML}
        
        <div class="analytics-section score-distribution">
            <h2>Score Distribution</h2>
            <div id="scoreHistogram"></div>
        </div>
        
        <div class="analytics-section question-comparison">
            <h2>Question-by-Question Comparison</h2>
            <div class="question-stats-container" id="questionStatsContainer"></div>
        </div>
    `;
    
    resultsContent.appendChild(analyticsContainer);
    
    // Render histogram
    renderScoreHistogram(scoreStats.distribution, userScore);
    
    // Render question comparison
    renderQuestionComparison(questionStats, userAnswers);
}

/**
 * Render score distribution histogram
 * Requirement: 2A.3
 */
function renderScoreHistogram(distribution, userScore) {
    const histogramContainer = document.getElementById('scoreHistogram');
    if (!histogramContainer) return;
    
    if (!distribution || distribution.length === 0) {
        histogramContainer.innerHTML = '<p class="empty-message">No distribution data available</p>';
        return;
    }
    
    // Find max count for scaling
    const maxCount = Math.max(...distribution.map(d => d.count));
    
    // Create histogram bars
    const histogramHTML = distribution.map(({ score, count }) => {
        const heightPercent = (count / maxCount) * 100;
        const isUserScore = score === userScore;
        
        return `
            <div class="histogram-bar-container">
                <div class="histogram-bar ${isUserScore ? 'user-score' : ''}" 
                     style="height: ${heightPercent}%"
                     title="${count} participant${count !== 1 ? 's' : ''} scored ${score}">
                    <span class="bar-count">${count}</span>
                </div>
                <div class="histogram-label ${isUserScore ? 'user-score-label' : ''}">${score > 0 ? '+' : ''}${score}</div>
                ${isUserScore ? '<div class="user-indicator">You</div>' : ''}
            </div>
        `;
    }).join('');
    
    histogramContainer.innerHTML = `<div class="histogram-chart">${histogramHTML}</div>`;
}

/**
 * Render question-by-question comparison
 * Requirements: 2A.4, 2A.5, 2A.6
 */
function renderQuestionComparison(questionStats, userAnswers) {
    const container = document.getElementById('questionStatsContainer');
    if (!container) return;
    
    if (!questionStats || questionStats.length === 0) {
        container.innerHTML = '<p class="empty-message">No question data available</p>';
        return;
    }
    
    // Render each question's statistics
    const questionsHTML = questionStats.map(stat => {
        // Get user's answer for this question
        let userAnswer;
        if (Array.isArray(userAnswers)) {
            userAnswer = userAnswers[stat.questionIndex];
        } else {
            userAnswer = userAnswers[stat.questionIndex.toString()] || userAnswers[stat.questionIndex];
        }
        
        const userAnsweredYes = userAnswer === 1;
        const userAnsweredNo = userAnswer === 0;
        
        return `
            <div class="question-stat-card">
                <div class="question-text">${stat.questionText}</div>
                <div class="question-value">Point value: ${stat.questionValue > 0 ? '+' : ''}${stat.questionValue}</div>
                <div class="answer-distribution">
                    <div class="answer-bar-container">
                        <div class="answer-label ${userAnsweredYes ? 'user-answer' : ''}">
                            Yes ${userAnsweredYes ? '(You)' : ''}
                        </div>
                        <div class="answer-bar-wrapper">
                            <div class="answer-bar yes-bar" style="width: ${stat.yesPercentage}%">
                                <span class="answer-percentage">${stat.yesPercentage}%</span>
                            </div>
                        </div>
                    </div>
                    <div class="answer-bar-container">
                        <div class="answer-label ${userAnsweredNo ? 'user-answer' : ''}">
                            No ${userAnsweredNo ? '(You)' : ''}
                        </div>
                        <div class="answer-bar-wrapper">
                            <div class="answer-bar no-bar" style="width: ${stat.noPercentage}%">
                                <span class="answer-percentage">${stat.noPercentage}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = questionsHTML;
}

/**
 * Render empty state when no other participants exist
 * Requirement: 2A.8
 */
function renderFirstParticipantState(userScore) {
    const resultsContent = document.querySelector('.results-content');
    if (!resultsContent) return;
    
    // Get ally tips for user's score
    const allyTipsArray = getTipsForScore(userScore, -25, 25);
    const category = categorizeScore(userScore, -25, 25);
    const allyTipsHTML = renderTips(allyTipsArray, category);
    
    resultsContent.innerHTML = `
        <div class="analytics-container">
            <div class="analytics-section empty-state">
                <div class="empty-state-icon">🎉</div>
                <h2>You're the First Participant!</h2>
                <div class="user-score-large">Your Score: ${userScore > 0 ? '+' : ''}${userScore}</div>
                <p class="empty-state-message">
                    You're the first person to complete the free play quiz. 
                    Come back later to see how your score compares to others!
                </p>
                <p class="empty-state-tip">
                    Share the quiz with friends to see how their privilege compares to yours.
                </p>
                <button class="share-quiz-btn" onclick="shareQuiz()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    Share Quiz
                </button>
            </div>
            
            ${allyTipsHTML}
        </div>
    `;
}

/**
 * Render error state when participant data is missing
 */
function renderEmptyState() {
    const resultsContent = document.querySelector('.results-content');
    if (!resultsContent) return;
    
    resultsContent.innerHTML = `
        <div class="analytics-container">
            <div class="analytics-section empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h2>No Results Found</h2>
                <p class="empty-state-message">
                    We couldn't find your quiz results. Please try taking the quiz again.
                </p>
                <a href="/app/questions.html?id=freeplay" class="btn-primary">Take Quiz Again</a>
            </div>
        </div>
    `;
}

/**
 * Share quiz via Web Share API or clipboard fallback
 */
function shareQuiz() {
    const shareUrl = window.location.origin + '/app/questions.html?id=freeplay';
    const shareText = 'Take the Privilege Spectrum quiz and see how your privilege compares!';

    if (navigator.share) {
        navigator.share({
            title: 'Privilege Spectrum Quiz',
            text: shareText,
            url: shareUrl
        }).catch(() => {
            // User cancelled or error — fall back to clipboard
            copyToClipboard(shareUrl);
        });
    } else {
        copyToClipboard(shareUrl);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showShareNotification('Link copied to clipboard!');
    }).catch(() => {
        showShareNotification('Could not copy link');
    });
}

function showShareNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #6366f1;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Set up modal event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Close modal when clicking the close button
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside of it
    const modal = document.getElementById('participantModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // View Spectrum button event listener
    const viewSpectrumBtn = document.getElementById('viewSpectrumBtn');
    if (viewSpectrumBtn) {
        viewSpectrumBtn.addEventListener('click', viewSpectrum);
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});
