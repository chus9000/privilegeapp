/**
 * App Header Module
 * Handles user menu and header interactions for authenticated pages
 */

/**
 * Initialize app header with user info and event listeners
 */
function initializeAppHeader() {
    console.log('🎯 Initializing app header');
    
    // Set up user menu toggle
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = userDropdown.style.display === 'block';
            userDropdown.style.display = isVisible ? 'none' : 'block';
            userMenuBtn.classList.toggle('active', !isVisible);
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.style.display = 'none';
                userMenuBtn.classList.remove('active');
            }
        });
    }
    
    // Set up create event button
    const createNewEventBtnHeader = document.getElementById('createNewEventBtnHeader');
    if (createNewEventBtnHeader) {
        createNewEventBtnHeader.addEventListener('click', () => {
            // Get the base path for the app directory
            const currentPath = window.location.pathname;
            const basePath = currentPath.includes('/app/') 
                ? currentPath.substring(0, currentPath.indexOf('/app/') + 5)
                : '/app/';
            window.location.href = basePath + 'create.html';
        });
    }
    
    // Set up sign out button
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                if (window.AuthManager) {
                    await window.AuthManager.signOut();
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('❌ Sign out error:', error);
                alert('Failed to sign out. Please try again.');
            }
        });
    }
    
    // Update user info if AuthManager is available
    if (window.AuthManager) {
        // Wait a bit for AuthManager to initialize
        setTimeout(() => {
            updateHeaderUserInfo();
            
            // Listen for auth state changes
            if (window.AuthManager.onAuthStateChanged) {
                window.AuthManager.onAuthStateChanged((user) => {
                    if (user) {
                        updateHeaderUserInfo();
                    }
                });
            }
        }, 100);
    }
}

/**
 * Update user info in header
 */
function updateHeaderUserInfo() {
    const user = window.AuthManager ? window.AuthManager.getCurrentUser() : null;
    
    if (!user) return;
    
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const userEmailDropdown = document.getElementById('userEmailDropdown');
    
    if (userName) {
        // Use display name or extract name from email
        const displayName = user.displayName || user.email.split('@')[0];
        userName.textContent = displayName;
    }
    
    if (userAvatar && user.photoURL) {
        userAvatar.src = user.photoURL;
        userAvatar.style.display = 'block';
    }
    
    if (userEmailDropdown) {
        userEmailDropdown.textContent = user.email;
    }
}

// Auto-initialize when DOM is ready, but only if header elements exist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('userMenuBtn')) {
            initializeAppHeader();
        }
    });
} else {
    if (document.getElementById('userMenuBtn')) {
        initializeAppHeader();
    }
}

console.log('🎯 App header module loaded');
