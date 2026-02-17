import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordBank, WordBankProvider } from '../hooks/useWordBank';
import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';

// Mock Firebase
vi.mock('../services/firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ forEach: () => {} })),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn(() => Promise.resolve())
  })),
  deleteDoc: vi.fn()
}));

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: null })
}));

describe('Quiz Settings (useWordBank)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(WordBankProvider, null, children)
  );

  it('should have default session size of 10', () => {
    const { result } = renderHook(() => useWordBank(), { wrapper });
    expect(result.current.quizSessionSize).toBe(10);
  });

  it('should update session size and persist to localStorage', () => {
    const { result } = renderHook(() => useWordBank(), { wrapper });
    
    act(() => {
      result.current.setQuizSessionSize(20);
    });

    expect(result.current.quizSessionSize).toBe(20);
    const stored = localStorage.getItem('hungarian-study-tenju-settings');
    expect(stored).toBeDefined();
    expect(JSON.parse(stored!).quizSessionSize).toBe(20);
  });

  it('should load session size from localStorage on initialization', () => {
    localStorage.setItem('hungarian-study-tenju-settings', JSON.stringify({ quizSessionSize: 50 }));
    
    const { result } = renderHook(() => useWordBank(), { wrapper });
    
    expect(result.current.quizSessionSize).toBe(50);
  });

  it('getWordsForQuiz should respect the provided count', () => {
    const { result } = renderHook(() => useWordBank(), { wrapper });
    
    // Default INITIAL_WORDS should be loaded
    const words = result.current.getWordsForQuiz(5);
    expect(words.length).toBeLessThanOrEqual(5);
  });
});
