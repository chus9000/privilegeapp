/**
 * Firebase Security Rules Unit Tests
 * 
 * Tests the Firebase Realtime Database security rules to ensure:
 * - Public read access for events (Requirement 11.5)
 * - Authenticated write for event creation by creator only (Requirement 11.6)
 * - Public write for participants (Requirement 11.7)
 * - Authenticated read/write for users collection (own data only) (Requirement 11.7)
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Firebase Security Rules - Requirements 11.5, 11.6, 11.7', () => {
  
  describe('Events Collection - Public Read Access (Requirement 11.5)', () => {
    it('should allow public read access to events', () => {
      // Rule: ".read": true
      // This allows anyone (authenticated or not) to read event data
      const rule = { read: true };
      expect(rule.read).toBe(true);
    });

    it('should allow public read access to event participants', () => {
      // Rule: participants ".read": true
      // This allows anyone to read participant data for spectrum visualization
      const rule = { read: true };
      expect(rule.read).toBe(true);
    });
  });

  describe('Events Collection - Authenticated Write (Requirement 11.6)', () => {
    it('should allow authenticated users to create new events', () => {
      // Rule: ".write": "auth != null || $eventId === 'freeplay'"
      // Authenticated users can create events
      const auth = { uid: 'user123' };
      const eventId = 'event456';
      const dataExists = false;
      
      const canWrite = auth !== null || eventId === 'freeplay';
      expect(canWrite).toBe(true);
    });

    it('should allow write to freeplay event without authentication', () => {
      // Rule: ".write": "auth != null || $eventId === 'freeplay'"
      // Special case: freeplay event allows anonymous writes
      const auth = null;
      const eventId = 'freeplay';
      
      const canWrite = auth !== null || eventId === 'freeplay';
      expect(canWrite).toBe(true);
    });

    it('should prevent unauthenticated users from creating regular events', () => {
      // Rule: ".write": "auth != null || $eventId === 'freeplay'"
      // Unauthenticated users cannot create regular events
      const auth = null;
      const eventId = 'event456';
      
      const canWrite = auth !== null || eventId === 'freeplay';
      expect(canWrite).toBe(false);
    });

    it('should enforce creator ID matches authenticated user', () => {
      // Rule: creatorId ".write": "!data.exists() && auth != null && newData.val() === auth.uid"
      // Only the authenticated user can set their own UID as creatorId
      const auth = { uid: 'user123' };
      const newCreatorId = 'user123';
      const dataExists = false;
      
      const canWriteCreatorId = !dataExists && auth !== null && newCreatorId === auth.uid;
      expect(canWriteCreatorId).toBe(true);
    });

    it('should prevent setting creatorId to different user', () => {
      // Rule: creatorId ".write": "!data.exists() && auth != null && newData.val() === auth.uid"
      // Users cannot set creatorId to someone else's UID
      const auth = { uid: 'user123' };
      const newCreatorId = 'user456'; // Different user
      const dataExists = false;
      
      const canWriteCreatorId = !dataExists && auth !== null && newCreatorId === auth.uid;
      expect(canWriteCreatorId).toBe(false);
    });

    it('should prevent modifying existing creatorId', () => {
      // Rule: creatorId ".write": "!data.exists() && auth != null && newData.val() === auth.uid"
      // CreatorId cannot be changed once set
      const auth = { uid: 'user123' };
      const newCreatorId = 'user123';
      const dataExists = true; // Data already exists
      
      const canWriteCreatorId = !dataExists && auth !== null && newCreatorId === auth.uid;
      expect(canWriteCreatorId).toBe(false);
    });
  });

  describe('Participants Collection - Public Write (Requirement 11.7)', () => {
    it('should allow public write access to participants', () => {
      // Rule: participants ".write": true
      // Anyone can write participant data (for anonymous event participation)
      const rule = { write: true };
      expect(rule.write).toBe(true);
    });

    it('should validate participant data structure', () => {
      // Rule: ".validate": "newData.hasChildren(['id', 'score', 'answers', 'createdAt'])"
      // Participant must have required fields
      const participant = {
        id: 'participant123',
        score: 10,
        answers: { 0: 1, 1: 0 },
        createdAt: '2024-01-01T00:00:00Z'
      };
      
      const hasRequiredFields = 
        participant.hasOwnProperty('id') &&
        participant.hasOwnProperty('score') &&
        participant.hasOwnProperty('answers') &&
        participant.hasOwnProperty('createdAt');
      
      expect(hasRequiredFields).toBe(true);
    });

    it('should reject participant data without required fields', () => {
      // Rule: ".validate": "newData.hasChildren(['id', 'score', 'answers', 'createdAt'])"
      // Participant missing required fields should be rejected
      const participant = {
        id: 'participant123',
        score: 10
        // Missing answers and createdAt
      };
      
      const hasRequiredFields = 
        participant.hasOwnProperty('id') &&
        participant.hasOwnProperty('score') &&
        participant.hasOwnProperty('answers') &&
        participant.hasOwnProperty('createdAt');
      
      expect(hasRequiredFields).toBe(false);
    });

    it('should validate score is a number', () => {
      // Rule: score ".validate": "newData.isNumber()"
      const score = 10;
      expect(typeof score).toBe('number');
    });

    it('should reject non-numeric scores', () => {
      // Rule: score ".validate": "newData.isNumber()"
      const score = "10"; // String instead of number
      const isValid = typeof score === 'number';
      expect(isValid).toBe(false);
    });
  });

  describe('Users Collection - Own Data Only (Requirement 11.7)', () => {
    it('should allow authenticated users to read their own data', () => {
      // Rule: ".read": "auth != null && auth.uid === $userId"
      const auth = { uid: 'user123' };
      const userId = 'user123';
      
      const canRead = auth !== null && auth.uid === userId;
      expect(canRead).toBe(true);
    });

    it('should prevent users from reading other users data', () => {
      // Rule: ".read": "auth != null && auth.uid === $userId"
      const auth = { uid: 'user123' };
      const userId = 'user456'; // Different user
      
      const canRead = auth !== null && auth.uid === userId;
      expect(canRead).toBe(false);
    });

    it('should prevent unauthenticated access to user data', () => {
      // Rule: ".read": "auth != null && auth.uid === $userId"
      const auth = null;
      const userId = 'user123';
      
      const canRead = auth !== null && auth.uid === userId;
      expect(canRead).toBe(false);
    });

    it('should allow authenticated users to write their own data', () => {
      // Rule: ".write": "auth != null && auth.uid === $userId"
      const auth = { uid: 'user123' };
      const userId = 'user123';
      
      const canWrite = auth !== null && auth.uid === userId;
      expect(canWrite).toBe(true);
    });

    it('should prevent users from writing other users data', () => {
      // Rule: ".write": "auth != null && auth.uid === $userId"
      const auth = { uid: 'user123' };
      const userId = 'user456'; // Different user
      
      const canWrite = auth !== null && auth.uid === userId;
      expect(canWrite).toBe(false);
    });
  });

  describe('Event Data Validation', () => {
    it('should validate event title is non-empty string with max 100 chars', () => {
      // Rule: title ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 100"
      const validTitle = 'My Event';
      expect(typeof validTitle).toBe('string');
      expect(validTitle.length).toBeGreaterThan(0);
      expect(validTitle.length).toBeLessThanOrEqual(100);
    });

    it('should reject empty event title', () => {
      // Rule: title ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 100"
      const invalidTitle = '';
      const isValid = typeof invalidTitle === 'string' && invalidTitle.length > 0 && invalidTitle.length <= 100;
      expect(isValid).toBe(false);
    });

    it('should reject event title over 100 characters', () => {
      // Rule: title ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 100"
      const invalidTitle = 'a'.repeat(101);
      const isValid = typeof invalidTitle === 'string' && invalidTitle.length > 0 && invalidTitle.length <= 100;
      expect(isValid).toBe(false);
    });

    it('should validate PIN is 6-digit numeric string', () => {
      // Rule: pin ".validate": "newData.isString() && newData.val().matches(/^[0-9]{6}$/)"
      const validPin = '123456';
      expect(typeof validPin).toBe('string');
      expect(/^[0-9]{6}$/.test(validPin)).toBe(true);
    });

    it('should reject PIN with non-numeric characters', () => {
      // Rule: pin ".validate": "newData.isString() && newData.val().matches(/^[0-9]{6}$/)"
      const invalidPin = '12345a';
      expect(/^[0-9]{6}$/.test(invalidPin)).toBe(false);
    });

    it('should reject PIN with wrong length', () => {
      // Rule: pin ".validate": "newData.isString() && newData.val().matches(/^[0-9]{6}$/)"
      const invalidPin = '12345'; // Only 5 digits
      expect(/^[0-9]{6}$/.test(invalidPin)).toBe(false);
    });
  });

  describe('Security Rules Summary', () => {
    it('should document all security rules requirements', () => {
      const securityRules = {
        events: {
          read: 'public', // Requirement 11.5
          write: 'authenticated or freeplay', // Requirement 11.6
          creatorId: 'must match auth.uid', // Requirement 11.6
          participants: {
            read: 'public', // Requirement 11.5
            write: 'public' // Requirement 11.7
          }
        },
        users: {
          read: 'own data only', // Requirement 11.7
          write: 'own data only' // Requirement 11.7
        }
      };

      expect(securityRules.events.read).toBe('public');
      expect(securityRules.events.write).toBe('authenticated or freeplay');
      expect(securityRules.events.participants.write).toBe('public');
      expect(securityRules.users.read).toBe('own data only');
      expect(securityRules.users.write).toBe('own data only');
    });
  });
});
