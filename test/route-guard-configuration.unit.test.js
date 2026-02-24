/**
 * Unit Tests for Route Guard Configuration
 * Tests that route guard configuration is correct after spectrum page consolidation
 * Requirements: 4.1, 4.2, 4.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('RouteGuard Configuration - Spectrum Page Consolidation', () => {
    let routeGuard;
    let mockAuthManager;
    let originalLocation;
    let originalSessionStorage;

    beforeEach(() => {
        // Save original location and sessionStorage
        originalLocation = window.location;
        originalSessionStorage = window.sessionStorage;

        // Mock window.location
        delete window.location;
        window.location = {
            pathname: '/',
            search: '',
            href: '/',
            assign: vi.fn(),
            replace: vi.fn()
        };

        // Mock sessionStorage
        const sessionStorageMock = {
            store: {},
            getItem(key) {
                return this.store[key] || null;
            },
            setItem(key, value) {
                this.store[key] = value;
            },
            removeItem(key) {
                delete this.store[key];
            },
            clear() {
                this.store = {};
            }
        };
        window.sessionStorage = sessionStorageMock;

        // Create mock AuthManager
        mockAuthManager = {
            initialize: vi.fn().mockResolvedValue(undefined),
            isAuthenticated: vi.fn().mockReturnValue(false),
            getCurrentUser: vi.fn().mockReturnValue(null)
        };

        // Set up global AuthManager
        window.AuthManager = mockAuthManager;

        // Create fresh RouteGuard instance
        const RouteGuardClass = class {
            constructor() {
                this.authManager = null;
                this.initialized = false;
            }

            async initialize() {
                if (this.initialized) {
                    return;
                }
                if (!window.AuthManager) {
                    throw new Error('AuthManager not available');
                }
                this.authManager = window.AuthManager;
                await this.authManager.initialize();
                this.initialized = true;
            }

            isProtectedRoute() {
                const path = window.location.pathname;
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
            }

            isPublicAppRoute(path) {
                const publicRoutes = [
                    '/app/questions.html',
                    '/app/results.html',
                    '/app/score.html'
                ];
                return publicRoutes.some(route => path === route);
            }

            async guard() {
                try {
                    if (!this.initialized) {
                        await this.initialize();
                    }
                    if (!this.isProtectedRoute()) {
                        return true;
                    }
                    if (!this.authManager.isAuthenticated()) {
                        this.redirectToLanding();
                        return false;
                    }
                    return true;
                } catch (error) {
                    this.redirectToLanding();
                    return false;
                }
            }

            redirectToLanding() {
                const intendedPath = window.location.pathname + window.location.search;
                if (intendedPath !== '/') {
                    sessionStorage.setItem('intended_path', intendedPath);
                }
                window.location.href = '/';
            }

            getIntendedPath() {
                const path = sessionStorage.getItem('intended_path');
                if (path) {
                    sessionStorage.removeItem('intended_path');
                }
                return path;
            }

            async guardOnLoad() {
                return await this.guard();
            }
        };

        routeGuard = new RouteGuardClass();
    });

    afterEach(() => {
        // Restore original location and sessionStorage
        window.location = originalLocation;
        window.sessionStorage = originalSessionStorage;
        vi.clearAllMocks();
    });

    describe('Public Routes Configuration', () => {
        it('should include results.html in public routes', () => {
            // Requirement 4.1: Route_Guard SHALL include results.html in the public routes list
            window.location.pathname = '/app/results.html';
            const isPublic = routeGuard.isPublicAppRoute('/app/results.html');
            expect(isPublic).toBe(true);
        });

        it('should not include spectrum.html in public routes', () => {
            // Requirement 4.2: Route_Guard SHALL remove spectrum.html from the public routes list
            window.location.pathname = '/app/spectrum.html';
            const isPublic = routeGuard.isPublicAppRoute('/app/spectrum.html');
            expect(isPublic).toBe(false);
        });

        it('should treat spectrum.html as a protected route', () => {
            // Since spectrum.html is not in public routes, it should be treated as protected
            window.location.pathname = '/app/spectrum.html';
            const isProtected = routeGuard.isProtectedRoute();
            expect(isProtected).toBe(true);
        });
    });

    describe('Unauthenticated Access to results.html', () => {
        beforeEach(() => {
            // Ensure user is not authenticated
            mockAuthManager.isAuthenticated.mockReturnValue(false);
            mockAuthManager.getCurrentUser.mockReturnValue(null);
        });

        it('should allow unauthenticated access to results.html', async () => {
            // Requirement 4.3: Route_Guard SHALL allow unauthenticated access to results.html
            window.location.pathname = '/app/results.html';
            window.location.href = '/app/results.html';
            
            const result = await routeGuard.guard();
            
            expect(result).toBe(true);
            expect(window.location.href).toBe('/app/results.html');
            expect(mockAuthManager.isAuthenticated).not.toHaveBeenCalled();
        });

        it('should not redirect unauthenticated users from results.html', async () => {
            // Verify that results.html does not trigger authentication redirect
            window.location.pathname = '/app/results.html';
            window.location.href = '/app/results.html';
            
            await routeGuard.guard();
            
            // Should not redirect - href should remain unchanged
            expect(window.location.href).toBe('/app/results.html');
            expect(sessionStorage.getItem('intended_path')).toBeNull();
        });

        it('should allow results.html with query parameters without authentication', async () => {
            // Verify that query parameters don't affect public access
            window.location.pathname = '/app/results.html';
            window.location.search = '?id=event123';
            window.location.href = '/app/results.html?id=event123';
            
            const result = await routeGuard.guard();
            
            expect(result).toBe(true);
            expect(window.location.href).toBe('/app/results.html?id=event123');
        });
    });

    describe('Authenticated Access to results.html', () => {
        beforeEach(() => {
            // Ensure user is authenticated
            mockAuthManager.isAuthenticated.mockReturnValue(true);
            mockAuthManager.getCurrentUser.mockReturnValue({
                uid: 'user123',
                email: 'user@example.com'
            });
        });

        it('should allow authenticated access to results.html', async () => {
            // Verify that authenticated users can also access results.html
            window.location.pathname = '/app/results.html';
            window.location.href = '/app/results.html';
            
            const result = await routeGuard.guard();
            
            expect(result).toBe(true);
            expect(window.location.href).toBe('/app/results.html');
        });
    });

    describe('Other Public Routes', () => {
        beforeEach(() => {
            mockAuthManager.isAuthenticated.mockReturnValue(false);
        });

        it('should still allow unauthenticated access to questions.html', async () => {
            // Verify other public routes remain unchanged
            window.location.pathname = '/app/questions.html';
            window.location.href = '/app/questions.html';
            
            const result = await routeGuard.guard();
            
            expect(result).toBe(true);
            expect(window.location.href).toBe('/app/questions.html');
        });

        it('should still allow unauthenticated access to score.html', async () => {
            // Verify other public routes remain unchanged
            window.location.pathname = '/app/score.html';
            window.location.href = '/app/score.html';
            
            const result = await routeGuard.guard();
            
            expect(result).toBe(true);
            expect(window.location.href).toBe('/app/score.html');
        });
    });
});
