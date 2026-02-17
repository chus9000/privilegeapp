# Route Guard Usage Guide

## Overview

The Route Guard utility (`route-guard.js`) provides a centralized way to protect authenticated routes in the application. It checks if a user is authenticated before allowing access to protected pages and redirects to the landing page if not authenticated.

## Protected Routes

The following routes require authentication:
- `/app` - Event Dashboard
- `/app/` - Event Dashboard (with trailing slash)
- `/app/index.html` - Event Dashboard (explicit)
- `/app/create` - Event Creation
- `/app/create.html` - Event Creation (explicit)

## Public Routes

The following routes are accessible without authentication:
- `/` - Landing Page
- `/app/questions.html` - Questions Page (Free Play or Event)
- `/app/results.html` - Results Page (Free Play or Event)
- `/app/spectrum.html` - Spectrum Visualization

## How to Use

### Method 1: Using the Route Guard (Recommended)

Add the route guard script to your HTML page and call it on page load:

```html
<!-- In your HTML head or before closing body tag -->
<script src="../auth-manager.js"></script>
<script src="../route-guard.js"></script>
<script>
    // In your page initialization
    document.addEventListener('DOMContentLoaded', async () => {
        // Guard the route - will redirect if not authenticated
        const isAuthenticated = await window.RouteGuard.guard();
        
        if (!isAuthenticated) {
            // User was redirected, stop execution
            return;
        }
        
        // User is authenticated, continue with page logic
        console.log('User authenticated, loading page...');
        // ... rest of your page initialization
    });
</script>
```

### Method 2: Manual Authentication Check (Current Implementation)

The current implementation in `dashboard.js` manually checks authentication:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize AuthManager
    if (window.AuthManager) {
        await window.AuthManager.initialize();
        
        // Check authentication
        if (!window.AuthManager.isAuthenticated()) {
            console.log('⚠️ User not authenticated, redirecting to landing page');
            window.location.href = '/';
            return;
        }
        
        // User is authenticated, continue...
    }
});
```

### Method 3: Using guardOnLoad Helper

For simpler integration:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // Guard the route on page load
    if (!await window.RouteGuard.guardOnLoad()) {
        return; // User was redirected
    }
    
    // User is authenticated, continue with page logic
    initializePage();
});
```

## Integration Example

Here's how to update the dashboard page to use the route guard:

### Update `app/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Dashboard - Privilege Spectrum</title>
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <!-- Page content here -->
    
    <!-- Scripts -->
    <script src="../auth-manager.js"></script>
    <script src="../route-guard.js"></script>
    <script src="../firebase-config.js" type="module"></script>
    <script src="dashboard.js" type="module"></script>
</body>
</html>
```

### Update `app/dashboard.js`

```javascript
/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Dashboard page loaded');
    
    // Guard the route - will redirect if not authenticated
    if (!await window.RouteGuard.guardOnLoad()) {
        return; // User was redirected
    }
    
    // User is authenticated, get current user
    currentUser = window.AuthManager.getCurrentUser();
    console.log('✅ User authenticated:', currentUser.email);
    
    // Load user's events
    await loadEvents();
    
    // Set up event listeners
    setupEventListeners();
});
```

## Features

### Automatic Redirection

When a user tries to access a protected route without authentication, they are automatically redirected to the landing page (`/`).

### Intended Path Storage

The route guard stores the intended destination in `sessionStorage` so that after successful login, the user can be redirected back to their original destination:

```javascript
// After successful login in landing.js
const intendedPath = window.RouteGuard.getIntendedPath();
if (intendedPath) {
    window.location.href = intendedPath;
} else {
    window.location.href = '/app'; // Default to dashboard
}
```

### Public Route Detection

The route guard automatically detects public routes (questions, results, spectrum) and allows access without authentication checks.

## API Reference

### `RouteGuard.initialize()`

Initializes the route guard and AuthManager.

```javascript
await window.RouteGuard.initialize();
```

### `RouteGuard.guard()`

Checks authentication and redirects if necessary. Returns `true` if authenticated, `false` if redirected.

```javascript
const isAuthenticated = await window.RouteGuard.guard();
```

### `RouteGuard.guardOnLoad()`

Convenience method for guarding routes on page load. Same as `guard()`.

```javascript
const isAuthenticated = await window.RouteGuard.guardOnLoad();
```

### `RouteGuard.isProtectedRoute()`

Checks if the current route requires authentication.

```javascript
const isProtected = window.RouteGuard.isProtectedRoute();
```

### `RouteGuard.getIntendedPath()`

Gets and clears the stored intended path after login.

```javascript
const path = window.RouteGuard.getIntendedPath();
```

## Testing

Unit tests are available in `test/route-guard.unit.test.js`. Run them with:

```bash
npm test -- test/route-guard.unit.test.js
```

## Requirements

Validates Requirement 10.9:
> WHEN a user navigates to an authenticated route without authentication, THE System SHALL redirect to the Landing_Page with Google_Auth prompt
