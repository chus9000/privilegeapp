/**
 * Route Guard Utility
 * Checks authentication for protected routes and redirects to landing page if not authenticated
 * Requirements: 10.9
 */

class RouteGuard {
    constructor() {
        this.authManager = null;
        this.initialized = false;
    }

    /**
     * Initialize the route guard with AuthManager
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) {
            console.log('🛡️ RouteGuard already initialized');
            return;
        }

        try {
            console.log('🛡️ Initializing RouteGuard...');
            
            // Wait for AuthManager to be available
            if (!window.AuthManager) {
                throw new Error('AuthManager not available');
            }
            
            this.authManager = window.AuthManager;
            await this.authManager.initialize();
            
            this.initialized = true;
            console.log('✅ RouteGuard initialized');
        } catch (error) {
            console.error('❌ RouteGuard initialization failed:', error);
            throw error;
        }
    }

    /**
     * Check if the current route requires authentication
     * Protected routes: /app, /app/create, /app/index.html, /app/create.html
     * Public routes: /app/questions.html, /app/results.html, /app/spectrum.html
     * @returns {boolean} True if route requires authentication
     */
    isProtectedRoute() {
        const path = window.location.pathname;
        
        // Protected routes
        const protectedRoutes = [
            '/app',
            '/app/',
            '/app/index.html',
            '/app/create',
            '/app/create.html'
        ];
        
        // Check if current path matches any protected route
        return protectedRoutes.some(route => {
            // Exact match or starts with route (for /app matching /app/index.html)
            return path === route || (route === '/app' && path.startsWith('/app') && !this.isPublicAppRoute(path));
        });
    }

    /**
     * Check if the route is a public app route (questions, results, spectrum)
     * @param {string} path - The path to check
     * @returns {boolean} True if route is public
     */
    isPublicAppRoute(path) {
        const publicRoutes = [
            '/app/questions.html',
            '/app/results.html',
            '/app/spectrum.html'
        ];
        
        return publicRoutes.some(route => path === route);
    }

    /**
     * Guard the current route - check authentication and redirect if necessary
     * @returns {Promise<boolean>} True if user is authenticated, false if redirected
     */
    async guard() {
        try {
            // Initialize if not already done
            if (!this.initialized) {
                await this.initialize();
            }

            // Check if current route is protected
            if (!this.isProtectedRoute()) {
                console.log('🛡️ Route is public, no authentication required');
                return true;
            }

            console.log('🛡️ Checking authentication for protected route...');

            // Check if user is authenticated
            if (!this.authManager.isAuthenticated()) {
                console.log('⚠️ User not authenticated, redirecting to landing page');
                this.redirectToLanding();
                return false;
            }

            console.log('✅ User authenticated, access granted');
            return true;
        } catch (error) {
            console.error('❌ Route guard error:', error);
            this.redirectToLanding();
            return false;
        }
    }

    /**
     * Redirect to landing page
     */
    redirectToLanding() {
        // Store the intended destination for post-login redirect (optional)
        const intendedPath = window.location.pathname + window.location.search;
        if (intendedPath !== '/') {
            sessionStorage.setItem('intended_path', intendedPath);
        }
        
        window.location.href = '/';
    }

    /**
     * Get the intended path after login (if stored)
     * @returns {string|null} The intended path or null
     */
    getIntendedPath() {
        const path = sessionStorage.getItem('intended_path');
        if (path) {
            sessionStorage.removeItem('intended_path');
        }
        return path;
    }

    /**
     * Convenience method to guard a route on page load
     * Usage: await routeGuard.guardOnLoad();
     * @returns {Promise<boolean>} True if authenticated, false if redirected
     */
    async guardOnLoad() {
        return await this.guard();
    }
}

// Create singleton instance
const routeGuard = new RouteGuard();

// Export for use in other modules
window.RouteGuard = routeGuard;

console.log('🛡️ RouteGuard module loaded');
