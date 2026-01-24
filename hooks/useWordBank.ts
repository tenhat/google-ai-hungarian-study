import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Word, WordProgress, WordStatus } from '../types';
import { INITIAL_WORDS, INITIAL_EASINESS, MIN_EASINESS, CORRECT_ANSWER_THRESHOLD, LEARNING_INTERVALS } from '../constants';

interface WordBankContextType {
  words: Word[];
  progress: Map<string, WordProgress>;
  getWordById: (id: string) => Word | undefined;
  getWordsForQuiz: (count: number) => Word[];
  updateWordProgress: (wordId: string, correct: boolean) => void;
  addNewWord: (hungarian: string, japanese: string) => void;
  getStats: () => { newCount: number, learningCount: number, masteredCount: number };
}

const WordBankContext = createContext<WordBankContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_WORDS = 'hungarian-study-tenju-words';
const LOCAL_STORAGE_KEY_PROGRESS = 'hungarian-study-tenju-progress';

export const WordBankProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Map<string, WordProgress>>(new Map());

  useEffect(() => {
    // Load words
    const storedWords = localStorage.getItem(LOCAL_STORAGE_KEY_WORDS);
    const initialWords = storedWords ? JSON.parse(storedWords) : INITIAL_WORDS;
    setWords(initialWords);

    // Load progress
    const storedProgress = localStorage.getItem(LOCAL_STORAGE_KEY_PROGRESS);
    const progressMap = new Map<string, WordProgress>();
    if (storedProgress) {
        const parsedProgress = JSON.parse(storedProgress);
        parsedProgress.forEach((p: WordProgress) => progressMap.set(p.wordId, p));
    }

    // Initialize progress for any new words from the initial list
    initialWords.forEach((word: Word) => {
      if (!progressMap.has(word.id)) {
        progressMap.set(word.id, {
          wordId: word.id,
          status: WordStatus.New,
          easiness: INITIAL_EASINESS,
          interval: 0,
          repetitions: 0,
          nextReviewDate: new Date().toISOString(),
          lastCorrect: null
        });
      }
    });

    setProgress(progressMap);
  }, []);

  useEffect(() => {
    if (words.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY_WORDS, JSON.stringify(words));
    }
  }, [words]);

  useEffect(() => {
    if (progress.size > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PROGRESS, JSON.stringify(Array.from(progress.values())));
    }
  }, [progress]);

  const getWordById = useCallback((id: string) => {
    return words.find(w => w.id === id);
  }, [words]);
  
  const getStats = useCallback(() => {
    let newCount = 0;
    let learningCount = 0;
    let masteredCount = 0;
    
    // FIX: Added explicit type to prevent type inference issues.
    progress.forEach((p: WordProgress) => {
        if(p.status === WordStatus.New) newCount++;
        if(p.status === WordStatus.Learning) learningCount++;
        if(p.status === WordStatus.Mastered) masteredCount++;
    });

    return { newCount, learningCount, masteredCount };
  }, [progress]);

  const getWordsForQuiz = useCallback((count: number): Word[] => {
    const now = new Date();
    const dueWords = Array.from(progress.values())
      // FIX: Added explicit type to callback parameter to fix type inference issue.
      .filter((p: WordProgress) => new Date(p.nextReviewDate) <= now)
      // FIX: Added explicit types to callback parameters to fix type inference issue.
      .sort((a: WordProgress, b: WordProgress) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
    
    // FIX: Added explicit type to callback parameter to fix type inference issue.
    const wordIdsToQuiz = dueWords.slice(0, count).map((p: WordProgress) => p.wordId);
    
    return words.filter(word => wordIdsToQuiz.includes(word.id));
  }, [words, progress]);
  
  const updateWordProgress = useCallback((wordId: string, correct: boolean) => {
    const currentProgress = progress.get(wordId);
    if (!currentProgress) return;

    const newProgress = { ...currentProgress };
    const quality = correct ? 5 : 1; // Grade 5 for correct, 1 for incorrect

    if (quality >= CORRECT_ANSWER_THRESHOLD) { // Correct answer
        newProgress.lastCorrect = true;
        if (newProgress.repetitions === 0) {
            newProgress.interval = LEARNING_INTERVALS[0];
        } else if (newProgress.repetitions === 1) {
            newProgress.interval = LEARNING_INTERVALS[1];
        } else {
            newProgress.interval = Math.ceil(newProgress.interval * newProgress.easiness);
        }
        newProgress.repetitions += 1;
        newProgress.status = WordStatus.Learning;
    } else { // Incorrect answer
        newProgress.lastCorrect = false;
        newProgress.repetitions = 0;
        newProgress.interval = LEARNING_INTERVALS[0];
        newProgress.status = WordStatus.Learning;
    }

    newProgress.easiness = Math.max(MIN_EASINESS, newProgress.easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    const now = new Date();
    now.setDate(now.getDate() + newProgress.interval);
    newProgress.nextReviewDate = now.toISOString();

    if(newProgress.interval > 30) { // Consider mastered if interval is > 30 days
        newProgress.status = WordStatus.Mastered;
    }

    setProgress(new Map(progress.set(wordId, newProgress)));
  }, [progress]);

  const addNewWord = useCallback((hungarian: string, japanese: string) => {
    const existingWord = words.find(w => w.hungarian.toLowerCase() === hungarian.toLowerCase());
    if (existingWord) return;

    const newWord: Word = {
        id: `word_${new Date().getTime()}`,
        hungarian,
        japanese,
        context: "AIチャットで登場"
    };

    const newProgressItem: WordProgress = {
        wordId: newWord.id,
        status: WordStatus.New,
        easiness: INITIAL_EASINESS,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date().toISOString(),
        lastCorrect: null,
        addedFromChat: true
    };

    setWords(prevWords => [...prevWords, newWord]);
    setProgress(prevProgress => new Map(prevProgress.set(newWord.id, newProgressItem)));
  }, [words]);

  const contextValue = { words, progress, getWordById, getWordsForQuiz, updateWordProgress, addNewWord, getStats };
  return React.createElement(WordBankContext.Provider, { value: contextValue }, children);
};

export const useWordBank = (): WordBankContextType => {
  const context = useContext(WordBankContext);
  if (context === undefined) {
    throw new Error('useWordBank must be used within a WordBankProvider');
  }
  return context;
};
