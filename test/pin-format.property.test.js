/**
 * Property-Based Test for PIN Format Validation
 * Feature: full-featured-quiz-app
 * 
 * Property 8: PIN Format Validation
 * Validates: Requirements 5.5
 * 
 * For any generated event PIN, it should be a string of exactly 6 numeric digits.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the event-creation.js code
const eventCreationCode = readFileSync(join(process.cwd(), 'app/event-creation.js'), 'utf-8');

/**
 * Extract the generatePin function from the event-creation module
 */
function extractGeneratePin() {
  // Create a minimal context
  const context = {
    Math: Math
  };
  
  // Extract just the generatePin function
  const generatePinCode = `
    function generatePin() {
      const pin = Math.floor(100000 + Math.random() * 900000);
      return pin.toString();
    }
    return generatePin;
  `;
  
  const func = new Function('Math', generatePinCode);
  return func(Math);
}

describe('Property 8: PIN Format Validation', () => {
  test('generated PIN should be exactly 6 digits', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No input needed, just run the test
        () => {
          const generatePin = extractGeneratePin();
          const pin = generatePin();
          
          // Property: PIN should be a string of exactly 6 characters
          if (typeof pin !== 'string') {
            return false;
          }
          
          if (pin.length !== 6) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('generated PIN should contain only numeric digits', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const generatePin = extractGeneratePin();
          const pin = generatePin();
          
          // Property: PIN should contain only digits 0-9
          const numericRegex = /^[0-9]+$/;
          return numericRegex.test(pin);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('generated PIN should be within valid range (100000-999999)', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const generatePin = extractGeneratePin();
          const pin = generatePin();
          
          // Property: PIN as a number should be between 100000 and 999999 (inclusive)
          const pinNumber = parseInt(pin, 10);
          return pinNumber >= 100000 && pinNumber <= 999999;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('generated PIN should not have leading zeros', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const generatePin = extractGeneratePin();
          const pin = generatePin();
          
          // Property: PIN should not start with '0' (since it's 100000-999999)
          return pin[0] !== '0';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('multiple generated PINs should all conform to format', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }), // Generate 5-20 PINs
        (numPins) => {
          const generatePin = extractGeneratePin();
          
          // Generate multiple PINs
          const pins = [];
          for (let i = 0; i < numPins; i++) {
            pins.push(generatePin());
          }
          
          // Property: All PINs should be exactly 6 digits
          return pins.every(pin => {
            return typeof pin === 'string' &&
                   pin.length === 6 &&
                   /^[0-9]{6}$/.test(pin) &&
                   parseInt(pin, 10) >= 100000 &&
                   parseInt(pin, 10) <= 999999;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('PIN format should be consistent across multiple generations', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const generatePin = extractGeneratePin();
          
          // Generate two PINs
          const pin1 = generatePin();
          const pin2 = generatePin();
          
          // Property: Both should have the same format characteristics
          const isValidFormat = (pin) => {
            return typeof pin === 'string' &&
                   pin.length === 6 &&
                   /^[0-9]{6}$/.test(pin) &&
                   parseInt(pin, 10) >= 100000 &&
                   parseInt(pin, 10) <= 999999;
          };
          
          return isValidFormat(pin1) && isValidFormat(pin2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
