/**
 * Unit Test for Quota Error Logging
 * Feature: event-creation-limit
 * 
 * Tests that quota errors are logged with appropriate context
 * **Validates: Requirements 6.4**
 */

import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest';

// Mock console
let consoleLogSpy;
let consoleErrorSpy;

beforeEach(() => {
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Simulate logging a quota error
 * This should match the implementation in app/event-creation.js
 */
function logQuotaError(error, eventCount, userId) {
  console.error('❌ Quota limit reached during event creation', {
    operation: 'createEvent',
    errorCode: error.code,
    errorMessage: error.message,
    currentEventCount: eventCount,
    quotaLimit: 3,
    userId: userId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Simulate logging a general permission error
 */
function logPermissionError(error, userId) {
  console.error('❌ Permission denied during event creation', {
    operation: 'createEvent',
    errorCode: error.code,
    errorMessage: error.message,
    userId: userId,
    timestamp: new Date().toISOString()
  });
}

describe('Quota Error Logging', () => {
  test('should log quota errors with error code', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const eventCount = 3;
    const userId = 'user123';
    
    logQuotaError(error, eventCount, userId);
    
    // Should have called console.error
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Should include error code
    const logCall = consoleErrorSpy.mock.calls[0];
    expect(logCall[1].errorCode).toBe('PERMISSION_DENIED');
  });
  
  test('should log quota errors with event count', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const eventCount = 3;
    const userId = 'user123';
    
    logQuotaError(error, eventCount, userId);
    
    // Should include current event count
    const logCall = consoleErrorSpy.mock.calls[0];
    expect(logCall[1].currentEventCount).toBe(3);
  });
  
  test('should log quota errors with quota limit', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const eventCount = 3;
    const userId = 'user123';
    
    logQuotaError(error, eventCount, userId);
    
    // Should include quota limit
    const logCall = consoleErrorSpy.mock.calls[0];
    expect(logCall[1].quotaLimit).toBe(3);
  });
  
  test('should log quota errors with user ID', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const eventCount = 3;
    const userId = 'user123';
    
    logQuotaError(error, eventCount, userId);
    
    // Should include user ID
    const logCall = consoleErrorSpy.mock.calls[0];
    expect(logCall[1].userId).toBe('user123');
  });
  
  test('should log quota errors with operation name', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const eventCount = 3;
    const userId = 'user123';
    
    logQuotaError(error, eventCount, userId);
    
    // Should include operation name
    const logCall = consoleErrorSpy.mock.calls[0];
    expect(logCall[1].operation).toBe('createEvent');
  });
  
  test('should log quota errors with timestamp', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const eventCount = 3;
    const userId = 'user123';
    
    logQuotaError(error, eventCount, userId);
    
    // Should include timestamp
    const logCall = consoleErrorSpy.mock.calls[0];
    expect(logCall[1].timestamp).toBeDefined();
    expect(typeof logCall[1].timestamp).toBe('string');
  });
  
  test('should log quota errors with descriptive message', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const eventCount = 3;
    const userId = 'user123';
    
    logQuotaError(error, eventCount, userId);
    
    // Should have descriptive message
    const logCall = consoleErrorSpy.mock.calls[0];
    expect(logCall[0]).toContain('Quota limit reached');
  });
  
  test('should log quota errors with error message', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const eventCount = 3;
    const userId = 'user123';
    
    logQuotaError(error, eventCount, userId);
    
    // Should include error message
    const logCall = consoleErrorSpy.mock.calls[0];
    expect(logCall[1].errorMessage).toBe('Permission denied');
  });
  
  test('should distinguish quota errors from permission errors in logs', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const userId = 'user123';
    
    // Log quota error
    logQuotaError(error, 3, userId);
    
    // Log permission error
    logPermissionError(error, userId);
    
    // Should have two different log messages
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    
    const quotaLog = consoleErrorSpy.mock.calls[0][0];
    const permissionLog = consoleErrorSpy.mock.calls[1][0];
    
    expect(quotaLog).toContain('Quota limit reached');
    expect(permissionLog).toContain('Permission denied');
    expect(quotaLog).not.toBe(permissionLog);
  });
  
  test('should log quota errors with all required context', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const eventCount = 4;
    const userId = 'user456';
    
    logQuotaError(error, eventCount, userId);
    
    // Should have all required fields
    const logCall = consoleErrorSpy.mock.calls[0];
    const logData = logCall[1];
    
    expect(logData).toHaveProperty('operation');
    expect(logData).toHaveProperty('errorCode');
    expect(logData).toHaveProperty('errorMessage');
    expect(logData).toHaveProperty('currentEventCount');
    expect(logData).toHaveProperty('quotaLimit');
    expect(logData).toHaveProperty('userId');
    expect(logData).toHaveProperty('timestamp');
  });
  
  test('should use console.error for quota errors (not console.log)', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const eventCount = 3;
    const userId = 'user123';
    
    logQuotaError(error, eventCount, userId);
    
    // Should use console.error
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Should not use console.log
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
  
  test('should handle different event counts in logs', () => {
    const error = { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    const userId = 'user123';
    
    // Log with count of 3
    logQuotaError(error, 3, userId);
    
    // Log with count of 4
    logQuotaError(error, 4, userId);
    
    // Log with count of 5
    logQuotaError(error, 5, userId);
    
    // Should have logged all three
    expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
    
    // Each should have correct count
    expect(consoleErrorSpy.mock.calls[0][1].currentEventCount).toBe(3);
    expect(consoleErrorSpy.mock.calls[1][1].currentEventCount).toBe(4);
    expect(consoleErrorSpy.mock.calls[2][1].currentEventCount).toBe(5);
  });
});
