/**
 * Landing Page Module
 * Handles mode selection and navigation
 * Requirements: 1.3, 1.4, 1.5
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏠 Landing page loaded');
    
    // Initialize AuthManager
    if (window.AuthManager) {
        await window.AuthManager.initialize();
        checkAuthSession();
    }
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Set up event listeners for mode selection buttons
 */
function setupEventListeners() {
    const freePlayBtn = document.getElementById('freePlayBtn');
    const createEventBtn = document.getElementById('createEventBtn');
    
    if (freePlayBtn) {
        freePlayBtn.addEventListener('click', onFreePlayClick);
    }
    
    if (createEventBtn) {
        createEventBtn.addEventListener('click', onCreateEventClick);
    }
}

/**
 * Handle "Free Play" button click
 * Navigate to /app/questions.html?id=freeplay
 * Requirement: 1.3, 10.4
 */
function onFreePlayClick() {
    console.log('🎯 Free Play mode selected');
    window.location.href = '/app/questions.html?id=freeplay';
}

/**
 * Handle "Create Event" button click
 * Trigger Google sign-in
 * Requirement: 1.4
 */
async function onCreateEventClick() {
    console.log('🎪 Create Event mode selected');
    
    try {
        // Show loading state
        const createEventBtn = document.getElementById('createEventBtn');
        const originalText = createEventBtn.textContent;
        createEventBtn.textContent = 'Signing in...';
        createEventBtn.disabled = true;
        
        // Trigger Google sign-in
        const user = await window.AuthManager.signInWithGoogle();
        
        if (user) {
            console.log('✅ Authentication successful, navigating to dashboard');
            // Navigate to event dashboard
            window.location.href = '/app';
        } else {
            console.log('⚠️ Authentication cancelled by user');
            // Restore button state
            createEventBtn.textContent = originalText;
            createEventBtn.disabled = false;
        }
    } catch (error) {
        console.error('❌ Authentication error:', error);
        
        // Show error message
        alert(error.message || 'Authentication failed. Please try again.');
        
        // Restore button state
        const createEventBtn = document.getElementById('createEventBtn');
        createEventBtn.textContent = 'Sign in with Google';
        createEventBtn.disabled = false;
    }
}

/**
 * Check for existing auth session on page load
 * If authenticated, show option to go to dashboard
 * Requirement: 1.5
 */
function checkAuthSession() {
    if (window.AuthManager && window.AuthManager.isAuthenticated()) {
        const user = window.AuthManager.getCurrentUser();
        console.log('✅ User already authenticated:', user.email);
        
        // Update the "Create Event" button to show "Go to Dashboard"
        const createEventBtn = document.getElementById('createEventBtn');
        if (createEventBtn) {
            createEventBtn.innerHTML = `
                <span class="btn-text">Go to Dashboard</span>
                <span class="btn-subtext">Manage your events</span>
            `;
            createEventBtn.onclick = () => {
                window.location.href = '/app';
            };
        }
    }
}

console.log('🏠 Landing page module loaded');
