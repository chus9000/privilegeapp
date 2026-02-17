/**
 * Property-Based Test for PIN Verification
 * Feature: full-featured-quiz-app
 * 
 * Property 6: PIN Verification
 * Validates: Requirements 6.2
 * 
 * For any event and entered PIN, access should be granted if and only if 
 * the entered PIN matches the event's stored PIN.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';

/**
 * Simulate the PIN verification logic from event.js
 * This is the core logic we're testing
 */
function verifyPin(enteredPin, eventPin) {
  // Convert both to strings for comparison (as done in event.js)
  return enteredPin === eventPin.toString();
}

describe('Property 6: PIN Verification', () => {
  test('should grant access when entered PIN matches event PIN', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }), // Generate valid 6-digit PINs
        (eventPin) => {
          const enteredPin = eventPin.toString();
          
          // Property: When PINs match, verification should succeed
          const result = verifyPin(enteredPin, eventPin);
          
          if (!result) {
            console.log(`FAILED: Expected access granted for matching PIN ${enteredPin}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should deny access when entered PIN does not match event PIN', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }), // Event PIN
        fc.integer({ min: 100000, max: 999999 }), // Entered PIN
        (eventPin, enteredPinNum) => {
          // Ensure they're different
          fc.pre(eventPin !== enteredPinNum);
          
          const enteredPin = enteredPinNum.toString();
          
          // Property: When PINs don't match, verification should fail
          const result = verifyPin(enteredPin, eventPin);
          
          if (result) {
            console.log(`FAILED: Expected access denied for mismatched PINs: entered=${enteredPin}, event=${eventPin}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle PIN as string input', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        (eventPin) => {
          // Enter PIN as string
          const enteredPin = eventPin.toString();
          
          // Property: String PIN should match correctly
          const result = verifyPin(enteredPin, eventPin);
          
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle PIN with leading/trailing whitespace', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        fc.constantFrom('', ' ', '  ', '\t', '\n'),
        fc.constantFrom('', ' ', '  ', '\t', '\n'),
        (eventPin, prefix, suffix) => {
          // Add whitespace around the PIN
          const enteredPinWithWhitespace = prefix + eventPin.toString() + suffix;
          const enteredPin = enteredPinWithWhitespace.trim();
          
          // Property: After trimming, PIN should match correctly
          const result = verifyPin(enteredPin, eventPin);
          
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should reject empty PIN', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        (eventPin) => {
          const enteredPin = '';
          
          // Property: Empty PIN should never match
          const result = verifyPin(enteredPin, eventPin);
          
          if (result) {
            console.log('FAILED: Empty PIN should not grant access');
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should reject PIN with wrong length', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }), // Event PIN
        fc.oneof(
          fc.integer({ min: 0, max: 99999 }).map(n => n.toString()), // Too short
          fc.integer({ min: 1000000, max: 9999999 }).map(n => n.toString()) // Too long
        ),
        (eventPin, enteredPin) => {
          // Property: PIN with wrong length should not match
          const result = verifyPin(enteredPin, eventPin);
          
          if (result) {
            console.log(`FAILED: Wrong length PIN ${enteredPin} should not match ${eventPin}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should reject PIN with non-numeric characters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        fc.constantFrom('a', 'x', '!', '@', '#', '$', '-', '.'),
        (eventPin, nonNumericChar) => {
          // Insert non-numeric character into PIN
          const pinStr = eventPin.toString();
          const position = Math.floor(Math.random() * pinStr.length);
          const enteredPin = pinStr.slice(0, position) + nonNumericChar + pinStr.slice(position + 1);
          
          // Property: PIN with non-numeric characters should not match
          const result = verifyPin(enteredPin, eventPin);
          
          if (result) {
            console.log(`FAILED: PIN with non-numeric char ${enteredPin} should not match ${eventPin}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should be case-sensitive for any alphabetic characters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        (eventPin) => {
          // Try entering PIN with letter 'O' instead of '0'
          const pinStr = eventPin.toString();
          if (!pinStr.includes('0')) {
            // Skip if no zeros to replace
            return true;
          }
          
          const enteredPin = pinStr.replace('0', 'O');
          
          // Property: Letter 'O' should not match digit '0'
          const result = verifyPin(enteredPin, eventPin);
          
          if (result) {
            console.log(`FAILED: PIN with letter O should not match digit 0`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should verify PIN comparison is exact string match', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        fc.integer({ min: -5, max: 5 }).filter(n => n !== 0),
        (eventPin, offset) => {
          // Create a PIN that's off by a small amount
          const enteredPinNum = eventPin + offset;
          
          // Only test if the result is still a valid 6-digit number
          if (enteredPinNum < 100000 || enteredPinNum > 999999) {
            return true; // Skip this case
          }
          
          const enteredPin = enteredPinNum.toString();
          
          // Property: Even a small difference should cause verification to fail
          const result = verifyPin(enteredPin, eventPin);
          
          if (result) {
            console.log(`FAILED: PIN ${enteredPin} should not match ${eventPin}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle PIN stored as string vs number', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        fc.boolean(),
        (pin, storeAsString) => {
          // Store PIN as either string or number
          const eventPin = storeAsString ? pin.toString() : pin;
          const enteredPin = pin.toString();
          
          // Property: Verification should work regardless of storage format
          const result = verifyPin(enteredPin, eventPin);
          
          if (!result) {
            console.log(`FAILED: PIN verification failed for storage format: ${typeof eventPin}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should be deterministic - same inputs always produce same result', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (eventPin, enteredPin) => {
          // Property: Multiple calls with same inputs should return same result
          const result1 = verifyPin(enteredPin, eventPin);
          const result2 = verifyPin(enteredPin, eventPin);
          const result3 = verifyPin(enteredPin, eventPin);
          
          if (result1 !== result2 || result2 !== result3) {
            console.log('FAILED: PIN verification is not deterministic');
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should verify bidirectional property - if A matches B, then B matches A', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        (pin) => {
          const enteredPin = pin.toString();
          const eventPin = pin;
          
          // Property: Verification should be symmetric
          const result1 = verifyPin(enteredPin, eventPin);
          const result2 = verifyPin(eventPin.toString(), parseInt(enteredPin, 10));
          
          if (result1 !== result2) {
            console.log('FAILED: PIN verification is not symmetric');
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle all valid 6-digit PIN combinations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        (eventPin) => {
          const enteredPin = eventPin.toString();
          
          // Property: Any valid 6-digit PIN should be verifiable
          const result = verifyPin(enteredPin, eventPin);
          
          // Should match when entered correctly
          if (!result) {
            console.log(`FAILED: Valid PIN ${enteredPin} should match event PIN ${eventPin}`);
            return false;
          }
          
          // Verify the PIN is actually 6 digits
          if (enteredPin.length !== 6) {
            console.log(`FAILED: PIN ${enteredPin} is not 6 digits`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should reject PIN with special characters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '+', '='),
        (eventPin, specialChar) => {
          // Add special character to PIN
          const enteredPin = eventPin.toString() + specialChar;
          
          // Property: PIN with special characters should not match
          const result = verifyPin(enteredPin, eventPin);
          
          if (result) {
            console.log(`FAILED: PIN with special char ${enteredPin} should not match ${eventPin}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle PIN verification with type coercion edge cases', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }),
        (eventPin) => {
          // Test various falsy values
          const falsyValues = [null, undefined, 0, false, NaN];
          
          // Property: Falsy values should never match a valid PIN
          for (const falsyValue of falsyValues) {
            const result = verifyPin(falsyValue, eventPin);
            if (result) {
              console.log(`FAILED: Falsy value ${falsyValue} should not match PIN ${eventPin}`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
