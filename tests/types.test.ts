import { describe, it, expect } from 'vitest';
import { View, QuizMode, WordStatus } from '../types';

describe('types.ts', () => {
  describe('View enum', () => {
    it('should have correct View values', () => {
      expect(View.Home).toBe('Home');
      expect(View.Quiz).toBe('Quiz');
      expect(View.Chat).toBe('Chat');
      expect(View.Translate).toBe('Translate');
      expect(View.ReviewChallenge).toBe('ReviewChallenge');
    });

    it('should have 6 view types', () => {
      const viewValues = Object.values(View);
      expect(viewValues).toHaveLength(6);
    });
  });

  describe('QuizMode enum', () => {
    it('should have HuToJp and JpToHu modes', () => {
      expect(QuizMode.HuToJp).toBeDefined();
      expect(QuizMode.JpToHu).toBeDefined();
    });
  });

  describe('WordStatus enum', () => {
    it('should have correct status values', () => {
      expect(WordStatus.New).toBe('New');
      expect(WordStatus.Learning).toBe('Learning');
      expect(WordStatus.Mastered).toBe('Mastered');
    });

    it('should have 3 status types', () => {
      const statusValues = Object.values(WordStatus);
      expect(statusValues).toHaveLength(3);
    });
  });
});
