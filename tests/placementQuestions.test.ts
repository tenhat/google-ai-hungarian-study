import { describe, it, expect } from 'vitest';
import { calculateLevel, PLACEMENT_QUESTIONS } from '../data/placementQuestions';

describe('placementQuestions', () => {
  it('should have exactly 20 questions', () => {
    expect(PLACEMENT_QUESTIONS).toHaveLength(20);
  });

  describe('calculateLevel', () => {
    it('should return A1 for scores 0-5', () => {
      expect(calculateLevel(0)).toBe('A1');
      expect(calculateLevel(3)).toBe('A1');
      expect(calculateLevel(5)).toBe('A1');
    });

    it('should return A2 for scores 6-10', () => {
      expect(calculateLevel(6)).toBe('A2');
      expect(calculateLevel(8)).toBe('A2');
      expect(calculateLevel(10)).toBe('A2');
    });

    it('should return B1 for scores 11-15', () => {
      expect(calculateLevel(11)).toBe('B1');
      expect(calculateLevel(13)).toBe('B1');
      expect(calculateLevel(15)).toBe('B1');
    });

    it('should return B2 for scores 16-18', () => {
      expect(calculateLevel(16)).toBe('B2');
      expect(calculateLevel(17)).toBe('B2');
      expect(calculateLevel(18)).toBe('B2');
    });

    it('should return C1 for scores 19-20', () => {
      expect(calculateLevel(19)).toBe('C1');
      expect(calculateLevel(20)).toBe('C1');
      expect(calculateLevel(25)).toBe('C1'); // 念のため20以上でもC1を返すことを確認
    });
  });
});
