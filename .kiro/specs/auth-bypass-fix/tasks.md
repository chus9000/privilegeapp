# Implementation Plan: Authentication Bypass Fix

## Overview

This plan addresses the critical authentication bypass vulnerability by replacing mock authentication with real Firebase Authentication, enforcing route protection, and ensuring proper session validation. Tasks are organized to fix the core authentication first, then integrate route protection, and finally add comprehensive testing.

## Tasks

- [x] 1. Replace mock authentication with Firebase Auth SDK
  - [x] 1.1 Remove all mock authentication code from auth-manager.js
    - Remove mockUser generation logic
    - Remove fake token creation
    - Remove auto-success authentication flow
    - _Requirements: 1.1, 1.4_
  
  - [x] 1.2 Import and initialize Firebase Auth SDK
    - Import Firebase Auth from CDN or npm
    - Initialize Firebase Auth with config from firebase-config.js
    - Create GoogleAuthProvider instance
    - Set up onAuthStateChanged listener
    - _Requirements: 8.1, 8.4_
  
  - [x] 1.3 Implement real Google OAuth sign-in
    - Replace mock signInWithGoogle with Firebase signInWithPopup
    - Use GoogleAuthProvider for OAuth
    - Store real user credentials and tokens
    - Handle success, cancellation, and error cases
    - _Requirements: 1.1, 1.2, 8.2_
  
  - [x] 1.4 Implement proper token validation and refresh
    - Update isAuthenticated to validate token expiration
    - Update getIdToken to use Firebase user.getIdToken(forceRefresh)
    - Implement automatic token refresh on expiration
    - Clear session if refresh fails
    - _Requirements: 1.5, 4.1, 4.2, 4.3_
  
  - [x] 1.5 Implement proper sign-out with Firebase
    - Update signOut to call Firebase auth.signOut()
    - Clear localStorage and memory
    - Notify all auth state listeners
    - _Requirements: 4.5, 8.3_
  
  - [x] 1.6 Write unit tests for AuthManager
    - Test Firebase initialization (8.1)
    - Test signInWithPopup is called with GoogleAuthProvider (8.2)
    - Test error messages for network, cancellation, unknown errors (6.1, 6.2, 6.3)
    - Test signOut calls Firebase signOut (8.3)
    - Test onAuthStateChanged listener setup (8.4)
    - Test getIdToken with forceRefresh (8.5)
    - Test authentication logging (7.1, 7.2, 7.4)
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_


- [x] 2. Integrate route guard into protected pages
  - [x] 2.1 Add route-guard.js script to app/index.html
    - Add script tag for route-guard.js before dashboard.js
    - Add script tag for auth-manager.js before route-guard.js
    - Ensure correct load order
    - _Requirements: 2.4, 3.1_
  
  - [x] 2.2 Add route-guard.js script to app/create.html
    - Add script tag for route-guard.js before event-creation.js
    - Add script tag for auth-manager.js before route-guard.js
    - Ensure correct load order
    - _Requirements: 2.4, 3.2_
  
  - [x] 2.3 Add route guard check to dashboard.js
    - Call RouteGuard.guardOnLoad() at start of DOMContentLoaded
    - Stop execution if guard returns false
    - Keep existing inline auth check as defense-in-depth
    - _Requirements: 2.1, 3.3, 3.5_
  
  - [x] 2.4 Add route guard check to event-creation.js
    - Call RouteGuard.guardOnLoad() at start of DOMContentLoaded
    - Stop execution if guard returns false
    - Add inline auth check similar to dashboard
    - _Requirements: 2.1, 3.3, 3.5_
  
  - [x] 2.5 Write unit tests for route guard integration
    - Test script load order in HTML files (2.4, 3.1, 3.2)
    - Test access denial logging (7.3)
    - Test silent redirect behavior (6.4)
    - Test intended path storage
    - _Requirements: 2.4, 3.1, 3.2, 6.4, 7.3_

- [x] 3. Checkpoint - Verify authentication and route protection
  - Ensure all tests pass, ask the user if questions arise.


- [x] 4. Add property-based tests for core security properties
  - [x] 4.1 Write property test for protected route enforcement
    - **Property 1: Protected routes enforce authentication**
    - Generate random protected routes
    - Verify route guard checks authentication before access
    - Run 100+ iterations
    - **Validates: Requirements 2.1, 3.3**
  
  - [x] 4.2 Write property test for unauthenticated redirect
    - **Property 2: Unauthenticated access triggers redirect**
    - Generate random protected routes with unauthenticated users
    - Verify redirect to landing page and intended path storage
    - Test with expired sessions as edge case
    - Run 100+ iterations
    - **Validates: Requirements 2.2, 2.3, 2.5**
  
  - [x] 4.3 Write property test for public route accessibility
    - **Property 3: Public routes remain accessible**
    - Generate random public routes (landing, questions, results, spectrum)
    - Verify access without authentication
    - Test with both authenticated and unauthenticated states
    - Run 100+ iterations
    - **Validates: Requirements 3.4, 5.4**
  
  - [x] 4.4 Write property test for token validation
    - **Property 4: Token validation prevents invalid sessions**
    - Generate random stored sessions (valid, invalid, expired)
    - Verify Auth_Manager validates tokens and rejects invalid ones
    - Run 100+ iterations
    - **Validates: Requirements 4.1, 4.4**
  
  - [x] 4.5 Write property test for credential storage
    - **Property 5: Successful authentication stores valid credentials**
    - Generate random successful OAuth responses
    - Verify credentials stored in memory and localStorage
    - Run 100+ iterations
    - **Validates: Requirements 1.2**
  
  - [x] 4.6 Write property test for failed authentication
    - **Property 6: Failed authentication prevents session creation**
    - Generate random auth failures (network, cancellation, errors)
    - Verify no session created or credentials stored
    - Run 100+ iterations
    - **Validates: Requirements 1.3**
  
  - [x] 4.7 Write property test for token refresh
    - **Property 7: Token refresh maintains authentication**
    - Generate random expired tokens
    - Verify refresh attempt and session clearing on failure
    - Run 100+ iterations
    - **Validates: Requirements 1.5, 4.2, 4.3**
  
  - [x] 4.8 Write property test for sign-out
    - **Property 8: Sign-out clears all session data**
    - Generate random authenticated users
    - Verify Firebase session revoked and localStorage cleared
    - Run 100+ iterations
    - **Validates: Requirements 4.5**
  
  - [x] 4.9 Write property test for execution stopping after redirect
    - **Property 9: Protected page logic stops after redirect**
    - Generate random protected routes with unauthenticated users
    - Verify no protected page logic executes after redirect
    - Run 100+ iterations
    - **Validates: Requirements 3.5**
  
  - [x] 4.10 Write property test for session persistence
    - **Property 10: Authenticated sessions persist across public routes**
    - Generate random public route navigations with authenticated users
    - Verify session remains valid and accessible
    - Run 100+ iterations
    - **Validates: Requirements 5.5**
  
  - [x] 4.11 Write property test for log security
    - **Property 11: No sensitive data in logs**
    - Generate random auth operations
    - Verify log output contains no tokens or sensitive credentials
    - Run 100+ iterations
    - **Validates: Requirements 7.5**


- [x] 5. Add integration tests for backward compatibility
  - [x] 5.1 Write integration test for landing page accessibility
    - Test landing page displays both buttons without auth
    - Verify no authentication required
    - _Requirements: 5.1_
  
  - [x] 5.2 Write integration test for free play mode
    - Test free play navigation without authentication
    - Verify questions page loads without auth
    - _Requirements: 5.2_
  
  - [x] 5.3 Write integration test for event participation
    - Test event access via PIN/URL without authentication
    - Verify participation works without auth
    - _Requirements: 5.3_
  
  - [x] 5.4 Write integration test for silent logout
    - Test token refresh failure triggers silent logout
    - Verify redirect to landing without error message
    - _Requirements: 6.5_

- [x] 6. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests verify backward compatibility with public features
- The fix maintains all existing functionality while securing protected routes
