/**
 * Spectrum Visualization Module
 * 
 * Handles the rendering and interaction logic for the spectrum page.
 * Displays participants positioned on a dynamic privilege spectrum.
 * 
 * Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');
let eventData;

// Global variables for search functionality
let allParticipants = [];
let currentSearchTerm = '';

// Dynamic spectrum configuration
let spectrumConfig = {
    min: -25,
    max: 25,
    colorInterval: 5
};

// Set up real-time updates for Firebase
let realTimeListener = null;

// Load event data from Firebase or localStorage
loadEventData();

/**
 * Load event data from Firebase with localStorage fallback
 */
async function loadEventData() {
    console.log('🔍 Loading event data for ID:', eventId);
    
    // Try Firebase first - this is the primary source for cross-device data
    try {
        console.log('🔥 Attempting Firebase load...');
        eventData = await window.FirebaseAPI.loadEvent(eventId);
        if (eventData && eventData.participants && eventData.participants.length > 0) {
            console.log('✅ Spectrum loaded from Firebase:', eventData.participants.length, 'participants');
            setupRealTimeUpdates();
            loadSpectrum();
            return;
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
    
    const localEventData = JSON.parse(localStorageData || 'null');
    if (localEventData && localEventData.participants && localEventData.participants.length > 0) {
        console.log('✅ Spectrum loaded from localStorage fallback:', localEventData.participants.length, 'participants');
        eventData = localEventData;
        setupLocalStoragePolling();
        loadSpectrum();
        return;
    }
    
    // Final fallback - no data found anywhere
    console.error('💥 CRITICAL: No event data found anywhere!');
    document.body.innerHTML = '<div class="container"><div class="card"><h1>Event not found</h1><p>Event ID: ' + eventId + '</p></div></div>';
}

/**
 * Set up Firebase real-time updates
 */
function setupRealTimeUpdates() {
    if (window.FirebaseAPI && window.FirebaseAPI.onEventUpdate) {
        console.log('🔄 Setting up real-time updates...');
        realTimeListener = window.FirebaseAPI.onEventUpdate(eventId, (updatedEventData) => {
            if (updatedEventData && hasParticipantChanges(eventData, updatedEventData)) {
                console.log('🆕 Participant changes detected, updating spectrum...');
                const hadNewParticipants = hasNewParticipants(eventData, updatedEventData);
                eventData = updatedEventData;
                refreshSpectrum(hadNewParticipants);
            }
        });
    } else {
        setupPolling();
    }
}

/**
 * Set up localStorage polling for changes
 */
function setupLocalStoragePolling() {
    setInterval(() => {
        const updatedData = JSON.parse(localStorage.getItem(`event_${eventId}`) || 'null');
        if (updatedData && hasParticipantChanges(eventData, updatedData)) {
            console.log('🆕 Participant changes detected in localStorage, updating spectrum...');
            const hadNewParticipants = hasNewParticipants(eventData, updatedData);
            eventData = updatedData;
            refreshSpectrum(hadNewParticipants);
        }
    }, 3000);
}

/**
 * Set up Firebase polling as fallback
 */
function setupPolling() {
    setInterval(async () => {
        try {
            const updatedData = await window.FirebaseAPI.loadEvent(eventId);
            
            if (updatedData && (!updatedData.participants || updatedData.participants.length === 0)) {
                const individualParticipants = await window.FirebaseAPI.loadParticipantsFromIndividualDocs(eventId);
                if (individualParticipants && individualParticipants.length > 0) {
                    updatedData.participants = individualParticipants;
                }
            }
            
            if (updatedData && hasParticipantChanges(eventData, updatedData)) {
                console.log('🆕 Participant changes detected via polling, updating spectrum...');
                const hadNewParticipants = hasNewParticipants(eventData, updatedData);
                eventData = updatedData;
                refreshSpectrum(hadNewParticipants);
            }
        } catch (error) {
            // Silently handle polling errors
        }
    }, 5000);
}

/**
 * Refresh spectrum display with new data
 */
function refreshSpectrum(showNewParticipantNotification = false) {
    allParticipants = [...eventData.participants];
    
    setTimeout(() => {
        renderParticipants();
        updateSearchCount();
    }, 100);
    
    if (showNewParticipantNotification) {
        showUpdateNotification();
    }
}

/**
 * Show notification for new participants
 */
function showUpdateNotification() {
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
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Helper function to detect participant changes
 */
function hasParticipantChanges(oldData, newData) {
    if (!oldData || !newData) return true;
    if (oldData.participants.length !== newData.participants.length) return true;
    
    const oldIds = new Set(oldData.participants.map(p => p.id));
    const newIds = new Set(newData.participants.map(p => p.id));
    
    if (oldIds.size !== newIds.size) return true;
    for (let id of oldIds) {
        if (!newIds.has(id)) return true;
    }
    for (let id of newIds) {
        if (!oldIds.has(id)) return true;
    }
    
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

/**
 * Helper function to detect if new participants were added
 */
function hasNewParticipants(oldData, newData) {
    if (!oldData || !newData) return false;
    return newData.participants.length > oldData.participants.length;
}

/**
 * Calculate dynamic spectrum range based on event's enabled questions
 * Requirements: 7.5
 */
function calculateDynamicSpectrumRange() {
    if (typeof questions === 'undefined') {
        console.warn('Questions array not found, using default spectrum range');
        return spectrumConfig;
    }
    
    let eventQuestions = [];
    let disabledQuestions = [];
    
    if (eventData && eventData.disabledQuestions && Array.isArray(eventData.disabledQuestions)) {
        disabledQuestions = eventData.disabledQuestions;
        console.log('📋 Using disabled questions from event data:', disabledQuestions);
    } else {
        console.log('📋 Event has no stored disabled questions, inferring from participant answers...');
        
        if (eventData && eventData.participants && eventData.participants.length > 0) {
            const answeredQuestionIndices = new Set();
            eventData.participants.forEach(participant => {
                if (participant.answers) {
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
            
            disabledQuestions = [];
            for (let i = 0; i < questions.length; i++) {
                if (!answeredQuestionIndices.has(i)) {
                    disabledQuestions.push(i);
                }
            }
        }
    }
    
    eventQuestions = questions.filter((_, index) => !disabledQuestions.includes(index));
    
    console.log(`📊 Event uses ${eventQuestions.length} out of ${questions.length} total questions`);
    
    let positiveSum = 0;
    let negativeSum = 0;
    
    eventQuestions.forEach((question) => {
        if (question.value > 0) {
            positiveSum += question.value;
        } else {
            negativeSum += Math.abs(question.value);
        }
    });
    
    const maxSum = Math.max(positiveSum, negativeSum);
    
    console.log(`🔍 Calculation details: positiveSum=${positiveSum}, negativeSum=${negativeSum}, maxSum=${maxSum}`);
    
    let min, max, colorInterval;
    
    if (maxSum >= 20 && maxSum <= 25) {
        min = -25;
        max = 25;
        colorInterval = 5;
    } else if (maxSum >= 15 && maxSum <= 19) {
        min = -20;
        max = 20;
        colorInterval = 4;
    } else if (maxSum >= 10 && maxSum <= 14) {
        min = -15;
        max = 15;
        colorInterval = 3;
    } else if (maxSum >= 5 && maxSum <= 9) {
        min = -10;
        max = 10;
        colorInterval = 2;
    } else if (maxSum >= 1 && maxSum <= 4) {
        min = -5;
        max = 5;
        colorInterval = 1;
    } else {
        min = -25;
        max = 25;
        colorInterval = 5;
    }
    
    console.log(`🎯 Dynamic spectrum range for event: ${min} to ${max} (color interval: ${colorInterval})`);
    
    return { min, max, colorInterval };
}

/**
 * Update spectrum bar with dynamic range and labels
 * Requirements: 7.4
 */
function updateSpectrumBar() {
    const spectrumBar = document.querySelector('.spectrum-bar');
    if (!spectrumBar) return;
    
    const existingElements = spectrumBar.querySelectorAll('.spectrum-section, .spectrum-line, .spectrum-zero-line');
    existingElements.forEach(element => element.remove());
    
    const { min, max, colorInterval } = spectrumConfig;
    const range = max - min;
    
    const sections = [];
    for (let value = min; value < max; value += colorInterval) {
        sections.push({
            start: value,
            end: value + colorInterval,
            midpoint: value + (colorInterval / 2)
        });
    }
    
    console.log(`📏 Creating spectrum sections:`, sections.map(s => `${s.start} to ${s.end}`));
    
    sections.forEach(sectionData => {
        const section = document.createElement('div');
        section.className = 'spectrum-section';
        section.setAttribute('data-start', sectionData.start.toString());
        section.setAttribute('data-end', sectionData.end.toString());
        
        const startPosition = ((sectionData.start - min) / range) * 100;
        const endPosition = ((sectionData.end - min) / range) * 100;
        const width = endPosition - startPosition;
        
        section.style.left = `${startPosition}%`;
        section.style.width = `${width}%`;
        
        let sectionNumber;
        if (sectionData.start < 0) {
            sectionNumber = sectionData.start.toString();
        } else if (sectionData.start === 0) {
            sectionNumber = `+${sectionData.end}`;
        } else {
            sectionNumber = `+${sectionData.end}`;
        }
        section.textContent = sectionNumber;
        
        const colorClass = getColorClassForSection(sectionData.midpoint, colorInterval);
        if (colorClass) {
            section.classList.add(colorClass);
        }
        
        spectrumBar.appendChild(section);
    });
    
    if (min <= 0 && max >= 0) {
        const zeroLine = document.createElement('div');
        zeroLine.className = 'spectrum-zero-line';
        zeroLine.setAttribute('data-value', '0');
        
        const position = ((0 - min) / range) * 100;
        zeroLine.style.left = `${position}%`;
        
        spectrumBar.appendChild(zeroLine);
    }
    
    updateSpectrumColors(min, max, colorInterval);
}

/**
 * Get color class for a section based on its distance from center
 */
function getColorClassForSection(sectionMidpoint, colorInterval) {
    const distanceFromCenter = Math.abs(sectionMidpoint);
    const segmentIndex = Math.floor(distanceFromCenter / colorInterval);
    
    const colors = ['spectrum-red', 'spectrum-orange', 'spectrum-yellow', 'spectrum-green', 'spectrum-blue'];
    const colorIndex = Math.min(segmentIndex, colors.length - 1);
    
    return colors[colorIndex];
}

/**
 * Update spectrum colors based on dynamic intervals
 */
function updateSpectrumColors(min, max, colorInterval) {
    const existingStyle = document.getElementById('dynamic-spectrum-colors');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'dynamic-spectrum-colors';
    
    const totalSegments = Math.ceil(Math.max(Math.abs(min), Math.abs(max)) / colorInterval);
    
    const colorMap = [
        '#F5C1B6', // Red (closest to center)
        '#F5D1B6', // Orange
        '#F0F5B6', // Yellow
        '#B6F5DE', // Green
        '#B6C1F5'  // Blue (furthest from center)
    ];
    
    let css = `
        .spectrum-bar {
            background: none !important;
        }
        
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
        
        .spectrum-section[data-start^="-"] {
            justify-content: flex-start;
            padding-left: 8px;
        }
        
        .spectrum-section[data-start="0"] {
            justify-content: flex-end;
            padding-right: 8px;
        }
        
        .spectrum-section:not([data-start^="-"]):not([data-start="0"]) {
            justify-content: flex-end;
            padding-right: 8px;
        }
    `;
    
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
}

/**
 * Center spectrum on zero position for mobile devices
 * Requirement: 12.4
 */
function centerSpectrumOnZero() {
    if (window.innerWidth <= 920) {
        const spectrumContainer = document.querySelector('.spectrum-container');
        if (spectrumContainer) {
            const spectrumWidth = 1024;
            const viewportWidth = window.innerWidth;
            
            const zeroPosition = spectrumWidth * 0.5;
            const centerPosition = zeroPosition - (viewportWidth / 2);
            
            setTimeout(() => {
                spectrumContainer.scrollLeft = centerPosition;
            }, 50);
        }
    }
}

/**
 * Main function to load and render spectrum
 * Requirements: 7.2, 7.3, 7.6
 */
function loadSpectrum() {
    document.getElementById('eventTitle').textContent = eventData.title;
    
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
    
    // Highlight current participant
    highlightCurrentParticipant();
}

/**
 * Render participants on the spectrum
 * Requirements: 7.3, 7.6
 */
function renderParticipants() {
    const spectrumBar = document.querySelector('.spectrum-bar');
    
    const existingParticipants = spectrumBar.querySelectorAll('.participant-marker');
    existingParticipants.forEach(p => p.remove());
    
    const sortedParticipants = [...allParticipants].sort((a, b) => a.score - b.score);
    
    const participantRows = allocateDynamicRows(sortedParticipants);
    
    participantRows.forEach((data, participant) => {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant-marker';
        participantDiv.setAttribute('data-participant-id', participant.id);
        participantDiv.setAttribute('data-row', data.row);
        
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

/**
 * Allocate participants to rows using round-robin distribution
 * Requirements: 7.3
 */
function allocateDynamicRows(sortedParticipants) {
    const participantRows = new Map();
    const { min, max } = spectrumConfig;
    const range = max - min;
    
    console.log(`🚀 Starting simple round-robin allocation for ${sortedParticipants.length} participants across 20 rows`);
    console.log(`📏 Using dynamic range: ${min} to ${max} (total range: ${range})`);
    
    sortedParticipants.forEach((participant, index) => {
        const clampedScore = Math.max(min, Math.min(max, participant.score));
        
        let scorePercentage;
        
        if (clampedScore === 0) {
            scorePercentage = ((0 - min) / range) * 100;
        } else {
            scorePercentage = ((clampedScore - min) / range) * 100;
        }
        
        const assignedRow = index % 20;
        
        console.log(`👤 ${participant.name} (${participant.score}) → Row ${assignedRow}, Position: ${scorePercentage.toFixed(1)}%`);
        
        participantRows.set(participant, {
            row: assignedRow,
            position: scorePercentage
        });
    });
    
    return participantRows;
}

/**
 * Highlight current participant on the spectrum
 * Requirement: 7.7
 */
function highlightCurrentParticipant() {
    if (!eventId) {
        console.log('❌ No event ID available, cannot highlight current participant');
        return;
    }
    
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
        
        const foundParticipant = allParticipants.find(p => p.id === participant.id);
        if (!foundParticipant) {
            console.log('❌ Current participant not found in spectrum');
            return;
        }
        
        // Add visual highlight to current participant's marker
        const participantMarker = document.querySelector(`.participant-marker[data-participant-id="${participant.id}"]`);
        if (participantMarker) {
            participantMarker.classList.add('current-participant');
            console.log('🎯 Highlighted current participant on spectrum');
        }
        
    } catch (error) {
        console.error('❌ Error highlighting current participant:', error);
    }
}

/**
 * Set up search functionality
 * Requirement: 7.2
 */
function setupSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    const searchToggle = document.getElementById('searchToggle');
    const searchContainer = document.getElementById('searchContainer');
    
    if (!searchInput || !searchToggle || !searchContainer) return;
    
    searchToggle.addEventListener('click', () => {
        const isVisible = searchContainer.style.display !== 'none';
        
        if (isVisible) {
            searchContainer.style.display = 'none';
            searchToggle.classList.remove('active');
            searchInput.value = '';
            handleSearchInput({ target: { value: '' } });
        } else {
            searchContainer.style.display = 'block';
            searchToggle.classList.add('active');
            setTimeout(() => searchInput.focus(), 100);
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!searchToggle.contains(e.target) && !searchContainer.contains(e.target)) {
            searchContainer.style.display = 'none';
            searchToggle.classList.remove('active');
        }
    });
    
    searchInput.removeEventListener('input', handleSearchInput);
    searchInput.removeEventListener('keyup', handleSearchInput);
    
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keyup', handleSearchInput);
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            handleSearchInput({ target: { value: '' } });
            searchContainer.style.display = 'none';
            searchToggle.classList.remove('active');
        }
    });
}

/**
 * Handle search input changes
 */
function handleSearchInput(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    currentSearchTerm = searchTerm;
    
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
    
    updateSearchCount(visibleCount, allParticipants.length);
}

/**
 * Check if participant matches search term
 */
function doesParticipantMatchSearch(participant, searchTerm) {
    if (!searchTerm) return true;
    
    const name = participant.name.toLowerCase();
    const score = participant.score.toString();
    const avatar = participant.avatar.toLowerCase();
    
    return name.includes(searchTerm) || 
           score.includes(searchTerm) || 
           avatar.includes(searchTerm);
}

/**
 * Update search results count
 */
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

/**
 * Modal functionality for participant details
 */
function showParticipantModal(participantId) {
    const participant = allParticipants.find(p => p.id === participantId);
    if (!participant) return;
    
    const stats = calculateParticipantStats(participant);
    
    document.getElementById('modalAvatar').textContent = participant.avatar;
    document.getElementById('modalName').textContent = participant.name;
    document.getElementById('modalScore').textContent = `Score: ${participant.score > 0 ? '+' : ''}${participant.score}`;
    
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
    
    document.getElementById('participantModal').style.display = 'block';
}

/**
 * Calculate participant statistics for modal display
 */
function calculateParticipantStats(participant) {
    const scores = allParticipants.map(p => p.score);
    const totalParticipants = scores.length;
    
    const lessPrivilegedCount = scores.filter(score => score < participant.score).length;
    
    const scoreFrequency = {};
    scores.forEach(score => {
        scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
    });
    const maxFrequency = Math.max(...Object.values(scoreFrequency));
    const modes = Object.keys(scoreFrequency).filter(score => scoreFrequency[score] === maxFrequency).map(Number);
    const mode = modes[0];
    
    const sortedScores = [...scores].sort((a, b) => a - b);
    const median = sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
        : sortedScores[Math.floor(sortedScores.length / 2)];
    
    const modeDifference = participant.score - mode;
    const medianDifference = participant.score - median;
    
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

/**
 * Close participant modal
 */
function closeModal() {
    document.getElementById('participantModal').style.display = 'none';
}

/**
 * Handle window resize to re-center spectrum
 */
window.addEventListener('resize', () => {
    if (eventData) {
        centerSpectrumOnZero();
    }
});

/**
 * Clean up listener when page unloads
 */
window.addEventListener('beforeunload', () => {
    if (realTimeListener && typeof realTimeListener === 'function') {
        realTimeListener();
    }
});

/**
 * Set up event listeners when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Back to results button
    const backToResultsBtn = document.getElementById('backToResultsBtn');
    if (backToResultsBtn) {
        backToResultsBtn.addEventListener('click', () => {
            window.location.href = `./results.html?id=${eventId}`;
        });
    }
    
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
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});
