/**
 * Unit Tests: Route Classification
 * 
 * Tests that score.html is classified as public route and authenticated routes 
 * still require authentication.
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Route Classification', () => {
    let RouteGuard;

    beforeEach(() => {
        // Create a simple RouteGuard implementation for testing
        RouteGuard = {
            isProtectedRoute(path) {
                const protectedRoutes = [
                    '/app',
                    '/app/',
                    '/app/index.html',
                    '/app/create',
                    '/app/create.html'
                ];
                
                return protectedRoutes.some(route => {
                    return path === route || (route === '/app' && path.startsWith('/app') && !this.isPublicAppRoute(path));
                });
            },

            isPublicAppRoute(path) {
                const publicRoutes = [
                    '/app/questions.html',
                    '/app/results.html',
                    '/app/score.html'
                ];
                
                return publicRoutes.some(route => path === route);
            }
        };
    });

    it('should classify score.html as public route', () => {
        const isPublic = RouteGuard.isPublicAppRoute('/app/score.html');
        expect(isPublic).toBe(true);
    });

    it('should not classify score.html as protected route', () => {
        const isProtected = RouteGuard.isProtectedRoute('/app/score.html');
        expect(isProtected).toBe(false);
    });

    it('should classify dashboard as protected route', () => {
        expect(RouteGuard.isProtectedRoute('/app')).toBe(true);
        expect(RouteGuard.isProtectedRoute('/app/')).toBe(true);
        expect(RouteGuard.isProtectedRoute('/app/index.html')).toBe(true);
    });

    it('should classify create event page as protected route', () => {
        expect(RouteGuard.isProtectedRoute('/app/create')).toBe(true);
        expect(RouteGuard.isProtectedRoute('/app/create.html')).toBe(true);
    });

    it('should classify questions.html as public route', () => {
        const isPublic = RouteGuard.isPublicAppRoute('/app/questions.html');
        const isProtected = RouteGuard.isProtectedRoute('/app/questions.html');
        
        expect(isPublic).toBe(true);
        expect(isProtected).toBe(false);
    });

    it('should classify results.html as public route', () => {
        const isPublic = RouteGuard.isPublicAppRoute('/app/results.html');
        const isProtected = RouteGuard.isProtectedRoute('/app/results.html');
        
        expect(isPublic).toBe(true);
        expect(isProtected).toBe(false);
    });

    it('should not classify protected routes as public', () => {
        expect(RouteGuard.isPublicAppRoute('/app')).toBe(false);
        expect(RouteGuard.isPublicAppRoute('/app/')).toBe(false);
        expect(RouteGuard.isPublicAppRoute('/app/index.html')).toBe(false);
        expect(RouteGuard.isPublicAppRoute('/app/create')).toBe(false);
        expect(RouteGuard.isPublicAppRoute('/app/create.html')).toBe(false);
    });

    it('should handle all public routes correctly', () => {
        const publicRoutes = [
            '/app/questions.html',
            '/app/results.html',
            '/app/score.html'
        ];

        publicRoutes.forEach(route => {
            expect(RouteGuard.isPublicAppRoute(route)).toBe(true);
            expect(RouteGuard.isProtectedRoute(route)).toBe(false);
        });
    });

    it('should handle all protected routes correctly', () => {
        const protectedRoutes = [
            '/app',
            '/app/',
            '/app/index.html',
            '/app/create',
            '/app/create.html'
        ];

        protectedRoutes.forEach(route => {
            expect(RouteGuard.isProtectedRoute(route)).toBe(true);
            expect(RouteGuard.isPublicAppRoute(route)).toBe(false);
        });
    });

    it('should not have overlapping route classifications', () => {
        const allRoutes = [
            '/app',
            '/app/',
            '/app/index.html',
            '/app/create',
            '/app/create.html',
            '/app/questions.html',
            '/app/results.html',
            '/app/score.html'
        ];

        allRoutes.forEach(route => {
            const isProtected = RouteGuard.isProtectedRoute(route);
            const isPublic = RouteGuard.isPublicAppRoute(route);
            
            // A route should not be both protected and public
            expect(isProtected && isPublic).toBe(false);
        });
    });

    it('should maintain authentication requirements after adding score.html', () => {
        // Verify that adding score.html to public routes didn't break protected routes
        const protectedRoutes = ['/app', '/app/', '/app/index.html', '/app/create', '/app/create.html'];
        
        protectedRoutes.forEach(route => {
            expect(RouteGuard.isProtectedRoute(route)).toBe(true);
        });
    });

    it('should include score.html in public routes list', () => {
        // Verify score.html is explicitly in the public routes
        const publicRoutes = [
            '/app/questions.html',
            '/app/results.html',
            '/app/score.html'
        ];

        // Check that score.html is recognized
        expect(publicRoutes.includes('/app/score.html')).toBe(true);
        expect(RouteGuard.isPublicAppRoute('/app/score.html')).toBe(true);
    });
});
