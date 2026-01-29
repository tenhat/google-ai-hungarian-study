import { describe, it, expect, vi, beforeEach } from 'vitest';
import { INITIAL_WORDS, INITIAL_EASINESS, MIN_EASINESS, CORRECT_ANSWER_THRESHOLD, LEARNING_INTERVALS } from '../constants';

describe('constants.ts', () => {
  describe('INITIAL_WORDS', () => {
    it('should have more than 0 words', () => {
      expect(INITIAL_WORDS.length).toBeGreaterThan(0);
    });

    it('each word should have required properties', () => {
      INITIAL_WORDS.forEach(word => {
        expect(word.id).toBeDefined();
        expect(word.hungarian).toBeDefined();
        expect(word.japanese).toBeDefined();
      });
    });

    it('should have unique ids', () => {
      const ids = INITIAL_WORDS.map(w => w.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('SM-2 Algorithm Constants', () => {
    it('should have valid INITIAL_EASINESS', () => {
      expect(INITIAL_EASINESS).toBe(2.5);
    });

    it('should have valid MIN_EASINESS', () => {
      expect(MIN_EASINESS).toBe(1.3);
      expect(MIN_EASINESS).toBeLessThan(INITIAL_EASINESS);
    });

    it('should have valid CORRECT_ANSWER_THRESHOLD', () => {
      expect(CORRECT_ANSWER_THRESHOLD).toBe(3);
    });

    it('should have valid LEARNING_INTERVALS', () => {
      expect(LEARNING_INTERVALS).toEqual([1, 6]);
      expect(LEARNING_INTERVALS[0]).toBe(1);
      expect(LEARNING_INTERVALS[1]).toBe(6);
    });
  });
});

describe('SM-2 Algorithm Logic', () => {
  // Test easiness calculation
  const calculateEasiness = (currentEasiness: number, quality: number): number => {
    return Math.max(MIN_EASINESS, currentEasiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  };

  it('should increase easiness for correct answers (quality 5)', () => {
    const newEasiness = calculateEasiness(INITIAL_EASINESS, 5);
    expect(newEasiness).toBeGreaterThan(INITIAL_EASINESS);
  });

  it('should decrease easiness for incorrect answers (quality 1)', () => {
    const newEasiness = calculateEasiness(INITIAL_EASINESS, 1);
    expect(newEasiness).toBeLessThan(INITIAL_EASINESS);
  });

  it('should never go below MIN_EASINESS', () => {
    let easiness = INITIAL_EASINESS;
    // Simulate many incorrect answers
    for (let i = 0; i < 20; i++) {
      easiness = calculateEasiness(easiness, 1);
    }
    expect(easiness).toBeGreaterThanOrEqual(MIN_EASINESS);
  });

  // Test interval calculation
  const calculateInterval = (repetitions: number, interval: number, easiness: number): number => {
    if (repetitions === 0) {
      return LEARNING_INTERVALS[0];
    } else if (repetitions === 1) {
      return LEARNING_INTERVALS[1];
    } else {
      return Math.ceil(interval * easiness);
    }
  };

  it('should return 1 day interval for first repetition', () => {
    const interval = calculateInterval(0, 0, INITIAL_EASINESS);
    expect(interval).toBe(1);
  });

  it('should return 6 days interval for second repetition', () => {
    const interval = calculateInterval(1, 1, INITIAL_EASINESS);
    expect(interval).toBe(6);
  });

  it('should multiply by easiness for subsequent repetitions', () => {
    const interval = calculateInterval(2, 6, 2.5);
    expect(interval).toBe(15); // 6 * 2.5 = 15
  });
});
