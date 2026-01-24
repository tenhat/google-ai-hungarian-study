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

import { doc, setDoc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

export const WordBankProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Map<string, WordProgress>>(new Map());
  const { user } = useAuth();

  // Load logic depends on auth state
  useEffect(() => {
    const loadData = async () => {
        if (user) {
            // Load from Firestore
            try {
                const wordsSnapshot = await getDocs(collection(db, `users/${user.uid}/words`));
                const loadedWords: Word[] = [];
                const loadedProgress: WordProgress[] = [];

                wordsSnapshot.forEach(doc => {
                    const data = doc.data();
                    loadedWords.push(data.word as Word);
                    loadedProgress.push(data.progress as WordProgress);
                });

                if (loadedWords.length > 0) {
                    setWords(loadedWords);
                    const progressMap = new Map<string, WordProgress>();
                    loadedProgress.forEach(p => progressMap.set(p.wordId, p));
                    setProgress(progressMap);
                } else {
                     // Initial seed for new user if needed, or keeping empty
                     // For now, let's seed with INITIAL_WORDS if empty
                     console.log("No data found for user, seeding initial data...");
                     // Note: We might want to migrate local data here, but for now let's just use initial or empty
                     setWords(INITIAL_WORDS);
                     const progressMap = new Map<string, WordProgress>();
                     INITIAL_WORDS.forEach((word: Word) => {
                         progressMap.set(word.id, {
                             wordId: word.id,
                             status: WordStatus.New,
                             easiness: INITIAL_EASINESS,
                             interval: 0,
                             repetitions: 0,
                             nextReviewDate: new Date().toISOString(),
                             lastCorrect: null
                         });
                     });
                     setProgress(progressMap);
                     // Sync initial data to Firestore
                     const batch = writeBatch(db);
                     INITIAL_WORDS.forEach((word: Word) => {
                         const p = progressMap.get(word.id);
                         const ref = doc(db, `users/${user.uid}/words`, word.id);
                         batch.set(ref, { word, progress: p });
                     });
                     await batch.commit();
                }

            } catch (error) {
                console.error("Error loading data from Firestore:", error);
            }
        } else {
            // Load logic for local storage (existing logic)
            const storedWords = localStorage.getItem(LOCAL_STORAGE_KEY_WORDS);
            const initialWords = storedWords ? JSON.parse(storedWords) : INITIAL_WORDS;
            setWords(initialWords);

            const storedProgress = localStorage.getItem(LOCAL_STORAGE_KEY_PROGRESS);
            const progressMap = new Map<string, WordProgress>();
            if (storedProgress) {
                const parsedProgress = JSON.parse(storedProgress);
                parsedProgress.forEach((p: WordProgress) => progressMap.set(p.wordId, p));
            }

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
        }
    };

    loadData();
  }, [user]);

  // Sync logic
  useEffect(() => {
    if (words.length === 0) return;

    if (user) {
        // Sync to Firestore is handled in action methods for optimization usually,
        // but to keep it simple and consistent with local storage 'effect' style:
        // Actually, syncing entire arrays to Firestore on every change is inefficient and costly.
        // We should update Firestore only when data changes in actions (addNewWord, updateWordProgress).
        // So we will remove this effect for user-logged-in case and move logic to actions.
        // BUT, keeping local storage sync for fallback/offline is fine? 
        // Let's implement specific updates in actions for Firestore.
    } else {
        localStorage.setItem(LOCAL_STORAGE_KEY_WORDS, JSON.stringify(words));
        if (progress.size > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY_PROGRESS, JSON.stringify(Array.from(progress.values())));
        }
    }
  }, [words, progress, user]);


  // Helper to sync single item to Firestore
  const syncToFirestore = async (word: Word, wordProgress: WordProgress) => {
      if (!user) return;
      try {
          await setDoc(doc(db, `users/${user.uid}/words`, word.id), {
              word,
              progress: wordProgress
          });
      } catch (e) {
          console.error("Error syncing to Firestore", e);
      }
  };

  const getWordById = useCallback((id: string) => {
    return words.find(w => w.id === id);
  }, [words]);
  
  const getStats = useCallback(() => {
    let newCount = 0;
    let learningCount = 0;
    let masteredCount = 0;
    
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
      .filter((p: WordProgress) => new Date(p.nextReviewDate) <= now)
      .sort((a: WordProgress, b: WordProgress) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
    
    const wordIdsToQuiz = dueWords.slice(0, count).map((p: WordProgress) => p.wordId);
    
    return words.filter(word => wordIdsToQuiz.includes(word.id));
  }, [words, progress]);
  
  const updateWordProgress = useCallback((wordId: string, correct: boolean) => {
    const currentProgress = progress.get(wordId);
    if (!currentProgress) return;
    const currentWord = words.find(w => w.id === wordId);
    if (!currentWord) return;

    const newProgress = { ...currentProgress };
    const quality = correct ? 5 : 1; 

    if (quality >= CORRECT_ANSWER_THRESHOLD) { 
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
    } else { 
        newProgress.lastCorrect = false;
        newProgress.repetitions = 0;
        newProgress.interval = 0;
        newProgress.status = WordStatus.Learning;
    }

    newProgress.easiness = Math.max(MIN_EASINESS, newProgress.easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    const now = new Date();
    now.setDate(now.getDate() + newProgress.interval);
    newProgress.nextReviewDate = now.toISOString();

    if(newProgress.interval > 30) { 
        newProgress.status = WordStatus.Mastered;
    }

    setProgress(new Map(progress.set(wordId, newProgress)));
    
    // Sync
    if (user) {
        syncToFirestore(currentWord, newProgress);
    }
  }, [progress, words, user]);

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
    
    // Sync
    if (user) {
        syncToFirestore(newWord, newProgressItem);
    }
  }, [words, user]);

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
