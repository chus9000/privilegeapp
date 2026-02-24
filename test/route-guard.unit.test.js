/**
 * Unit Tests for Route Guard Utility
 * Tests authentication checking and redirection for protected routes
 * Requirements: 10.9
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('RouteGuard - Unit Tests', () => {
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

    describe('isProtectedRoute', () => {
        it('should identify /app as protected route', () => {
            window.location.pathname = '/app';
            expect(routeGuard.isProtectedRoute()).toBe(true);
        });

        it('should identify /app/ as protected route', () => {
            window.location.pathname = '/app/';
            expect(routeGuard.isProtectedRoute()).toBe(true);
        });

        it('should identify /app/index.html as protected route', () => {
            window.location.pathname = '/app/index.html';
            expect(routeGuard.isProtectedRoute()).toBe(true);
        });

        it('should identify /app/create as protected route', () => {
            window.location.pathname = '/app/create';
            expect(routeGuard.isProtectedRoute()).toBe(true);
        });

        it('should identify /app/create.html as protected route', () => {
            window.location.pathname = '/app/create.html';
            expect(routeGuard.isProtectedRoute()).toBe(true);
        });

        it('should identify / as public route', () => {
            window.location.pathname = '/';
            expect(routeGuard.isProtectedRoute()).toBe(false);
        });

        it('should identify /app/questions.html as public route', () => {
            window.location.pathname = '/app/questions.html';
            expect(routeGuard.isProtectedRoute()).toBe(false);
        });

        it('should identify /app/results.html as public route', () => {
            window.location.pathname = '/app/results.html';
            expect(routeGuard.isProtectedRoute()).toBe(false);
        });

        it('should identify /app/score.html as public route', () => {
            window.location.pathname = '/app/score.html';
            expect(routeGuard.isProtectedRoute()).toBe(false);
        });

        it('should NOT identify /app/spectrum.html as public route', () => {
            // Requirement 5.3: spectrum.html removed from public routes after consolidation
            window.location.pathname = '/app/spectrum.html';
            expect(routeGuard.isProtectedRoute()).toBe(true);
        });
    });

    describe('guard - authenticated user', () => {
        beforeEach(() => {
            mockAuthManager.isAuthenticated.mockReturnValue(true);
            mockAuthManager.getCurrentUser.mockReturnValue({
                uid: 'user123',
                email: 'user@example.com'
            });
        });

        it('should allow access to protected route when authenticated', async () => {
            window.location.pathname = '/app';
            window.location.href = '/app';
            const result = await routeGuard.guard();
            expect(result).toBe(true);
            // Should not redirect - href should remain unchanged
            expect(window.location.href).toBe('/app');
        });

        it('should allow access to /app/create when authenticated', async () => {
            window.location.pathname = '/app/create';
            window.location.href = '/app/create';
            const result = await routeGuard.guard();
            expect(result).toBe(true);
            // Should not redirect - href should remain unchanged
            expect(window.location.href).toBe('/app/create');
        });

        it('should allow access to public routes without authentication check', async () => {
            window.location.pathname = '/app/questions.html';
            const result = await routeGuard.guard();
            expect(result).toBe(true);
            expect(mockAuthManager.isAuthenticated).not.toHaveBeenCalled();
        });
    });

    describe('guard - unauthenticated user', () => {
        beforeEach(() => {
            mockAuthManager.isAuthenticated.mockReturnValue(false);
            mockAuthManager.getCurrentUser.mockReturnValue(null);
        });

        it('should redirect to landing page when accessing /app without authentication', async () => {
            window.location.pathname = '/app';
            const result = await routeGuard.guard();
            expect(result).toBe(false);
            expect(window.location.href).toBe('/');
        });

        it('should redirect to landing page when accessing /app/create without authentication', async () => {
            window.location.pathname = '/app/create';
            const result = await routeGuard.guard();
            expect(result).toBe(false);
            expect(window.location.href).toBe('/');
        });

        it('should store intended path when redirecting from protected route', async () => {
            window.location.pathname = '/app/create';
            window.location.search = '?test=1';
            await routeGuard.guard();
            expect(sessionStorage.getItem('intended_path')).toBe('/app/create?test=1');
        });

        it('should not store intended path when redirecting from landing page', async () => {
            window.location.pathname = '/';
            await routeGuard.guard();
            expect(sessionStorage.getItem('intended_path')).toBeNull();
        });

        it('should allow access to public routes without authentication', async () => {
            window.location.pathname = '/app/questions.html';
            window.location.href = '/app/questions.html';
            const result = await routeGuard.guard();
            expect(result).toBe(true);
            // Should not redirect - href should remain unchanged
            expect(window.location.href).toBe('/app/questions.html');
        });

        it('should allow access to /app/results.html without authentication', async () => {
            window.location.pathname = '/app/results.html';
            const result = await routeGuard.guard();
            expect(result).toBe(true);
        });

        it('should allow access to /app/score.html without authentication', async () => {
            window.location.pathname = '/app/score.html';
            const result = await routeGuard.guard();
            expect(result).toBe(true);
        });
    });

    describe('getIntendedPath', () => {
        it('should return and clear stored intended path', () => {
            sessionStorage.setItem('intended_path', '/app/create');
            const path = routeGuard.getIntendedPath();
            expect(path).toBe('/app/create');
            expect(sessionStorage.getItem('intended_path')).toBeNull();
        });

        it('should return null when no intended path is stored', () => {
            const path = routeGuard.getIntendedPath();
            expect(path).toBeNull();
        });
    });

    describe('initialize', () => {
        it('should initialize AuthManager', async () => {
            await routeGuard.initialize();
            expect(mockAuthManager.initialize).toHaveBeenCalled();
            expect(routeGuard.initialized).toBe(true);
        });

        it('should not initialize twice', async () => {
            await routeGuard.initialize();
            await routeGuard.initialize();
            expect(mockAuthManager.initialize).toHaveBeenCalledTimes(1);
        });

        it('should throw error when AuthManager is not available', async () => {
            window.AuthManager = null;
            await expect(routeGuard.initialize()).rejects.toThrow('AuthManager not available');
        });
    });

    describe('guardOnLoad', () => {
        it('should call guard method', async () => {
            window.location.pathname = '/';
            const guardSpy = vi.spyOn(routeGuard, 'guard');
            await routeGuard.guardOnLoad();
            expect(guardSpy).toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should redirect to landing page on initialization error', async () => {
            mockAuthManager.initialize.mockRejectedValue(new Error('Init failed'));
            window.location.pathname = '/app';
            const result = await routeGuard.guard();
            expect(result).toBe(false);
            expect(window.location.href).toBe('/');
        });
    });
});
