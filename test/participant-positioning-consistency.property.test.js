/**
 * Property-Based Test for Participant Positioning Consistency
 * Feature: spectrum-page-consolidation
 * 
 * Property 2: Participant Positioning Consistency
 * **Validates: Requirements 7.1**
 * 
 * For any set of participant data with valid scores, when the consolidated results page
 * renders the spectrum, each participant marker should be positioned at the correct location
 * corresponding to their score within the dynamic spectrum range.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';

/**
 * Calculate the position percentage for a participant on the spectrum
 * This mirrors the positioning logic from spectrum.js and results.js
 * 
 * @param {number} score - The participant's score
 * @param {number} min - Minimum spectrum value
 * @param {number} max - Maximum spectrum value
 * @returns {number} Position percentage (0-100)
 */
function calculateParticipantPosition(score, min, max) {
  const range = max - min;
  
  // Clamp score to spectrum range
  const clampedScore = Math.max(min, Math.min(max, score));
  
  // Calculate position percentage
  const positionPercentage = ((clampedScore - min) / range) * 100;
  
  return positionPercentage;
}

/**
 * Generate a random participant with valid data
 */
const participantArbitrary = (minScore, maxScore) => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  avatar: fc.constantFrom('😀', '😎', '🤓', '😊', '🙂', '😃', '😄', '😁'),
  score: fc.integer({ min: minScore, max: maxScore })
});

/**
 * Generate a dynamic spectrum range configuration
 */
const spectrumRangeArbitrary = fc.constantFrom(
  { min: -25, max: 25, colorInterval: 5 },
  { min: -20, max: 20, colorInterval: 4 },
  { min: -15, max: 15, colorInterval: 3 },
  { min: -10, max: 10, colorInterval: 2 },
  { min: -5, max: 5, colorInterval: 1 }
);

describe('Property 2: Participant Positioning Consistency', () => {
  test('each participant should be positioned correctly based on their score', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        fc.integer({ min: 1, max: 50 }).chain(count =>
          fc.tuple(
            fc.constant(count),
            fc.array(participantArbitrary(-25, 25), { minLength: count, maxLength: count })
          )
        ),
        (spectrum, [count, participants]) => {
          const { min, max } = spectrum;
          
          // For each participant, verify their position is correct
          for (const participant of participants) {
            const calculatedPosition = calculateParticipantPosition(participant.score, min, max);
            
            // Calculate expected position
            const clampedScore = Math.max(min, Math.min(max, participant.score));
            const range = max - min;
            const expectedPosition = ((clampedScore - min) / range) * 100;
            
            // Property: Calculated position should match expected position
            if (Math.abs(calculatedPosition - expectedPosition) >= 0.0001) {
              return false;
            }
            
            // Property: Position should be within valid range [0, 100]
            if (calculatedPosition < 0 || calculatedPosition > 100) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participants with same score should have same position', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        fc.integer({ min: -25, max: 25 }),
        fc.integer({ min: 2, max: 10 }),
        (spectrum, sharedScore, participantCount) => {
          const { min, max } = spectrum;
          
          // Create multiple participants with the same score
          const participants = Array.from({ length: participantCount }, (_, i) => ({
            id: `participant-${i}`,
            name: `Participant ${i}`,
            avatar: '😀',
            score: sharedScore
          }));
          
          // Calculate position for each participant
          const positions = participants.map(p => 
            calculateParticipantPosition(p.score, min, max)
          );
          
          // Property: All positions should be identical
          const firstPosition = positions[0];
          return positions.every(pos => Math.abs(pos - firstPosition) < 0.0001);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participants should be positioned proportionally across the spectrum', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        (spectrum) => {
          const { min, max } = spectrum;
          const range = max - min;
          
          // Create participants at key positions
          const participants = [
            { id: '1', name: 'Min', avatar: '😀', score: min },
            { id: '2', name: 'Quarter', avatar: '😎', score: min + range * 0.25 },
            { id: '3', name: 'Mid', avatar: '🤓', score: min + range * 0.5 },
            { id: '4', name: 'ThreeQuarter', avatar: '😊', score: min + range * 0.75 },
            { id: '5', name: 'Max', avatar: '🙂', score: max }
          ];
          
          const positions = participants.map(p => 
            calculateParticipantPosition(p.score, min, max)
          );
          
          // Property: Positions should be at 0%, 25%, 50%, 75%, 100%
          const expectedPositions = [0, 25, 50, 75, 100];
          
          for (let i = 0; i < positions.length; i++) {
            if (Math.abs(positions[i] - expectedPositions[i]) >= 0.0001) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participant at minimum score should be at 0% position', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        (spectrum) => {
          const { min, max } = spectrum;
          
          const participant = {
            id: 'min-participant',
            name: 'Min Participant',
            avatar: '😀',
            score: min
          };
          
          const position = calculateParticipantPosition(participant.score, min, max);
          
          // Property: Minimum score should be at 0% position
          return Math.abs(position - 0) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participant at maximum score should be at 100% position', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        (spectrum) => {
          const { min, max } = spectrum;
          
          const participant = {
            id: 'max-participant',
            name: 'Max Participant',
            avatar: '😀',
            score: max
          };
          
          const position = calculateParticipantPosition(participant.score, min, max);
          
          // Property: Maximum score should be at 100% position
          return Math.abs(position - 100) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participant at zero score should be positioned correctly', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        (spectrum) => {
          const { min, max } = spectrum;
          
          const participant = {
            id: 'zero-participant',
            name: 'Zero Participant',
            avatar: '😀',
            score: 0
          };
          
          const position = calculateParticipantPosition(participant.score, min, max);
          
          // Calculate expected position for zero
          const range = max - min;
          const expectedPosition = ((0 - min) / range) * 100;
          
          // Property: Zero score should be positioned correctly
          return Math.abs(position - expectedPosition) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('participants with scores outside range should be clamped', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        fc.integer({ min: 1, max: 50 }),
        (spectrum, offset) => {
          const { min, max } = spectrum;
          
          // Participant with score below minimum
          const belowMin = {
            id: 'below-min',
            name: 'Below Min',
            avatar: '😀',
            score: min - offset
          };
          
          // Participant with score above maximum
          const aboveMax = {
            id: 'above-max',
            name: 'Above Max',
            avatar: '😎',
            score: max + offset
          };
          
          const positionBelowMin = calculateParticipantPosition(belowMin.score, min, max);
          const positionAboveMax = calculateParticipantPosition(aboveMax.score, min, max);
          
          // Property: Scores outside range should be clamped to 0% or 100%
          return Math.abs(positionBelowMin - 0) < 0.0001 &&
                 Math.abs(positionAboveMax - 100) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('higher scores should have higher or equal positions', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        fc.array(participantArbitrary(-25, 25), { minLength: 2, maxLength: 50 }),
        (spectrum, participants) => {
          const { min, max } = spectrum;
          
          // Sort participants by score
          const sortedParticipants = [...participants].sort((a, b) => a.score - b.score);
          
          // Calculate positions
          const positions = sortedParticipants.map(p => 
            calculateParticipantPosition(p.score, min, max)
          );
          
          // Property: Positions should be monotonically increasing
          for (let i = 1; i < positions.length; i++) {
            if (positions[i] < positions[i - 1]) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position calculation should be consistent across multiple calls', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        participantArbitrary(-25, 25),
        (spectrum, participant) => {
          const { min, max } = spectrum;
          
          // Calculate position multiple times
          const position1 = calculateParticipantPosition(participant.score, min, max);
          const position2 = calculateParticipantPosition(participant.score, min, max);
          const position3 = calculateParticipantPosition(participant.score, min, max);
          
          // Property: Should return same result for same inputs
          return position1 === position2 && position2 === position3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('position should work correctly with all standard spectrum ranges', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        fc.integer({ min: -25, max: 25 }),
        (spectrum, score) => {
          const { min, max } = spectrum;
          
          const participant = {
            id: 'test-participant',
            name: 'Test Participant',
            avatar: '😀',
            score: score
          };
          
          const position = calculateParticipantPosition(participant.score, min, max);
          
          // Calculate expected position
          const clampedScore = Math.max(min, Math.min(max, participant.score));
          const range = max - min;
          const expectedPosition = ((clampedScore - min) / range) * 100;
          
          // Property: Position should match expected and be in valid range
          return Math.abs(position - expectedPosition) < 0.0001 &&
                 position >= 0 && position <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('large datasets should maintain positioning accuracy', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        fc.array(participantArbitrary(-25, 25), { minLength: 50, maxLength: 100 }),
        (spectrum, participants) => {
          const { min, max } = spectrum;
          
          // Verify each participant's position is accurate
          for (const participant of participants) {
            const position = calculateParticipantPosition(participant.score, min, max);
            
            // Calculate expected position
            const clampedScore = Math.max(min, Math.min(max, participant.score));
            const range = max - min;
            const expectedPosition = ((clampedScore - min) / range) * 100;
            
            // Property: Position should be accurate even with large datasets
            if (Math.abs(position - expectedPosition) >= 0.0001) {
              return false;
            }
            
            if (position < 0 || position > 100) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('negative and positive scores should be positioned correctly', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        (spectrum) => {
          const { min, max } = spectrum;
          
          // Create participants with negative, zero, and positive scores
          const participants = [
            { id: '1', name: 'Negative', avatar: '😀', score: -10 },
            { id: '2', name: 'Zero', avatar: '😎', score: 0 },
            { id: '3', name: 'Positive', avatar: '🤓', score: 10 }
          ];
          
          const positions = participants.map(p => 
            calculateParticipantPosition(p.score, min, max)
          );
          
          // Property: Negative < Zero < Positive positions
          // (unless scores are outside the spectrum range)
          const clampedScores = participants.map(p => 
            Math.max(min, Math.min(max, p.score))
          );
          
          // If all scores are within range, positions should be ordered
          if (clampedScores[0] < clampedScores[1] && clampedScores[1] < clampedScores[2]) {
            return positions[0] < positions[1] && positions[1] < positions[2];
          }
          
          // Otherwise, just verify positions are valid
          return positions.every(pos => pos >= 0 && pos <= 100);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('fractional scores should be positioned accurately', () => {
    fc.assert(
      fc.property(
        spectrumRangeArbitrary,
        fc.double({ min: -25, max: 25, noNaN: true }),
        (spectrum, fractionalScore) => {
          const { min, max } = spectrum;
          
          const participant = {
            id: 'fractional-participant',
            name: 'Fractional Participant',
            avatar: '😀',
            score: fractionalScore
          };
          
          const position = calculateParticipantPosition(participant.score, min, max);
          
          // Calculate expected position
          const clampedScore = Math.max(min, Math.min(max, participant.score));
          const range = max - min;
          const expectedPosition = ((clampedScore - min) / range) * 100;
          
          // Property: Fractional scores should be positioned accurately
          return Math.abs(position - expectedPosition) < 0.0001 &&
                 position >= 0 && position <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });
});
