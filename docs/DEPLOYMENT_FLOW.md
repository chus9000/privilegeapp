# Deployment Flow Diagram

## Overview

This document explains the complete deployment flow from local development to production.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Local Files                                                     │
│  ├── firebase-config.js  ← Update with Firebase credentials     │
│  ├── firebase-security-rules.json                               │
│  └── Application code                                           │
│                                                                  │
│  ↓ Test locally (open index.html)                               │
│                                                                  │
│  ↓ git add . && git commit && git push                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                          GITHUB                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Repository (main branch)                                        │
│  ├── Source code                                                │
│  ├── Tests                                                      │
│  └── .github/workflows/deploy.yml                               │
│                                                                  │
│  ↓ Push triggers GitHub Actions                                 │
│                                                                  │
│  GitHub Actions Workflow                                         │
│  ├── Checkout code                                              │
│  ├── Setup Node.js                                              │
│  ├── Install dependencies                                       │
│  ├── Run tests                                                  │
│  └── Deploy to gh-pages branch                                  │
│                                                                  │
│  ↓ Deployment complete                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      GITHUB PAGES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Static Hosting                                                  │
│  └── https://username.github.io/repo/                           │
│                                                                  │
│  ↓ Users access the app                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         FIREBASE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Firebase Authentication                                         │
│  ├── Email/Password sign-in                                     │
│  └── User management                                            │
│                                                                  │
│  Firebase Realtime Database                                      │
│  ├── /events/{eventId}                                          │
│  │   ├── title, pin, creatorId                                  │
│  │   ├── participants[]                                         │
│  │   └── disabledQuestions[]                                    │
│  └── /users/{userId}                                            │
│      └── email, displayName, createdAt                          │
│                                                                  │
│  Security Rules                                                  │
│  └── Enforce access control                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### User Authentication Flow

```
User Browser                    GitHub Pages                Firebase Auth
     │                               │                            │
     │──── Load app ────────────────>│                            │
     │<─── HTML/JS/CSS ──────────────│                            │
     │                               │                            │
     │──── Sign up/Login ────────────┼───────────────────────────>│
     │                               │                            │
     │<─── Auth token ───────────────┼────────────────────────────│
     │                               │                            │
```

### Event Creation Flow

```
User Browser              GitHub Pages              Firebase RTDB
     │                         │                          │
     │─── Create event ───────>│                          │
     │                         │                          │
     │                         │─── POST /events/{id} ───>│
     │                         │    (with auth token)     │
     │                         │                          │
     │                         │<─── Success ─────────────│
     │<─── Event created ──────│                          │
     │                         │                          │
```

### Real-time Updates Flow

```
Participant A            GitHub Pages            Firebase RTDB            Participant B
     │                        │                        │                        │
     │─── Submit answer ─────>│                        │                        │
     │                        │─── Update data ───────>│                        │
     │                        │                        │                        │
     │                        │                        │<─── Poll for updates ──│
     │                        │                        │                        │
     │                        │                        │─── New data ──────────>│
     │                        │                        │                        │
```

## Deployment Steps

### 1. Firebase Setup

```
Developer                Firebase Console              Firebase CLI
    │                           │                            │
    │─── Create project ───────>│                            │
    │─── Enable Auth ──────────>│                            │
    │─── Create RTDB ──────────>│                            │
    │                           │                            │
    │─── firebase deploy ───────┼───────────────────────────>│
    │                           │                            │
    │                           │<─── Deploy rules ──────────│
    │                           │                            │
```

### 2. GitHub Deployment

```
Developer              GitHub Repo              GitHub Actions           GitHub Pages
    │                       │                         │                       │
    │─── git push ─────────>│                         │                       │
    │                       │                         │                       │
    │                       │─── Trigger workflow ───>│                       │
    │                       │                         │                       │
    │                       │                         │─── Run tests ────────>│
    │                       │                         │                       │
    │                       │                         │─── Deploy ───────────>│
    │                       │                         │                       │
    │<─── Deployment complete ──────────────────────────────────────────────│
    │                       │                         │                       │
```

## Security Flow

### Security Rules Enforcement

```
Client Request          GitHub Pages          Firebase RTDB          Security Rules
      │                      │                      │                      │
      │─── Write data ──────>│                      │                      │
      │                      │─── PUT request ─────>│                      │
      │                      │    (with auth)       │                      │
      │                      │                      │─── Validate ────────>│
      │                      │                      │                      │
      │                      │                      │<─── Allow/Deny ──────│
      │                      │                      │                      │
      │                      │<─── Response ────────│                      │
      │<─── Success/Error ───│                      │                      │
      │                      │                      │                      │
```

## Monitoring & Debugging

### Error Tracking Flow

```
User Browser          GitHub Pages          Browser Console          Firebase Console
     │                     │                       │                        │
     │─── Action ─────────>│                       │                        │
     │                     │                       │                        │
     │                     │─── Error ────────────>│                        │
     │                     │                       │                        │
     │                     │                       │─── Log error ─────────>│
     │                     │                       │                        │
```

## Continuous Deployment

```
┌──────────────┐
│ Code Change  │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  git commit  │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   git push   │
└──────┬───────┘
       │
       ↓
┌──────────────────┐
│ GitHub Actions   │
│ - Checkout       │
│ - Install deps   │
│ - Run tests      │
│ - Deploy         │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  GitHub Pages    │
│  (Production)    │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  Users access    │
│  updated app     │
└──────────────────┘
```

## Rollback Process

If deployment fails or issues are found:

```
1. Identify issue
   ↓
2. Fix in local branch
   ↓
3. Test locally
   ↓
4. Commit fix
   ↓
5. Push to main
   ↓
6. GitHub Actions auto-deploys fix
   ↓
7. Verify fix in production
```

Or for immediate rollback:

```
1. Go to GitHub Actions
   ↓
2. Find last successful deployment
   ↓
3. Re-run that workflow
   ↓
4. Previous version restored
```

## Environment Variables

```
Development              GitHub Secrets           Production
     │                         │                       │
     │                         │                       │
  .env.local                   │                       │
     │                         │                       │
     │─── Push to GitHub ─────>│                       │
     │                         │                       │
     │                         │─── Inject at build ──>│
     │                         │                       │
```

## Best Practices

1. **Always test locally first**
   - Open index.html in browser
   - Check console for errors
   - Test all features

2. **Use feature branches**
   - Create branch for new features
   - Test thoroughly
   - Merge to main when ready

3. **Monitor deployments**
   - Check GitHub Actions for success
   - Verify app loads correctly
   - Check Firebase Console for data

4. **Keep secrets secure**
   - Never commit real credentials
   - Use GitHub Secrets for sensitive data
   - Rotate keys regularly

5. **Backup data**
   - Export Firebase data regularly
   - Keep local backups
   - Document recovery procedures
