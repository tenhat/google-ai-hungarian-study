import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Word, WordProgress, WordStatus } from '../types';
import { INITIAL_WORDS, INITIAL_EASINESS, MIN_EASINESS, CORRECT_ANSWER_THRESHOLD, LEARNING_INTERVALS } from '../constants';

interface WordBankContextType {
  words: Word[];
  progress: Map<string, WordProgress>;
  getWordById: (id: string) => Word | undefined;
  getWordsForQuiz: (count: number) => Word[];
  getWordsForReviewChallenge: () => Word[];
  updateWordProgress: (wordId: string, correct: boolean) => void;
  resetWordProgress: (wordId: string) => void;
  addNewWord: (hungarian: string, japanese: string, example?: { sentence: string, translation: string }) => void;
  getStats: () => { newCount: number, learningCount: number, masteredCount: number };
  loading: boolean;
  markAsMastered: (wordId: string) => void;
  updateWord: (word: Word) => void;
  deleteWord: (wordId: string) => void;
  markAsLearning: (wordId: string) => void;
  quizSessionSize: number;
  setQuizSessionSize: (size: number) => void;
}

const WordBankContext = createContext<WordBankContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_WORDS = 'hungarian-study-tenju-words';
const LOCAL_STORAGE_KEY_PROGRESS = 'hungarian-study-tenju-progress';
const LOCAL_STORAGE_KEY_SETTINGS = 'hungarian-study-tenju-settings';

import { doc, setDoc, getDoc, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

export const WordBankProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Map<string, WordProgress>>(new Map());
  const [quizSessionSize, setQuizSessionSizeState] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load logic depends on auth state
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
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

                // Check for missing INITIAL_WORDS (New words migration)
                const loadedWordIds = new Set(loadedWords.map(w => w.id));
                const missingWords = INITIAL_WORDS.filter(w => !loadedWordIds.has(w.id));

                if (missingWords.length > 0) {
                    console.log(`Found ${missingWords.length} missing words. Syncing to Firestore...`);
                    const batch = writeBatch(db);
                    
                    missingWords.forEach(word => {
                        const newProgress: WordProgress = {
                            wordId: word.id,
                            status: WordStatus.New,
                            easiness: INITIAL_EASINESS,
                            interval: 0,
                            repetitions: 0,
                            nextReviewDate: new Date().toISOString(),
                            lastCorrect: null,
                            addedFromChat: false
                        };
                        
                        // Add to local arrays to update state immediately
                        loadedWords.push(word);
                        loadedProgress.push(newProgress);

                        // Add to Firestore batch
                        const ref = doc(db, `users/${user.uid}/words`, word.id);
                        batch.set(ref, { word, progress: newProgress });
                    });

                    await batch.commit();
                    console.log("Missing words synced successfully.");
                }

                // Check for updates in existing words (e.g. added examples)
                const updatesNeeded: Word[] = [];
                INITIAL_WORDS.forEach(initialWord => {
                    const loadedWord = loadedWords.find(w => w.id === initialWord.id);
                    if (loadedWord) {
                        // Compare content (ignoring key order strictly, but JSON.stringify is usually fine for this simple data)
                        // To be safer, we can check specific fields or just overwrite if we trust INITIAL_WORDS is master for definitions
                        if (JSON.stringify(initialWord) !== JSON.stringify(loadedWord)) {
                            updatesNeeded.push(initialWord);
                        }
                    }
                });

                if (updatesNeeded.length > 0) {
                    console.log(`Found ${updatesNeeded.length} words needing updates. Syncing...`);
                    const batch = writeBatch(db);
                    updatesNeeded.forEach(word => {
                         // Update local state
                         const index = loadedWords.findIndex(w => w.id === word.id);
                         if (index !== -1) {
                             loadedWords[index] = word;
                         }

                         // Update Firestore
                         const ref = doc(db, `users/${user.uid}/words`, word.id);
                         batch.set(ref, { word }, { merge: true });
                    });
                    
                    if (missingWords.length === 0) {
                        // Only commit if we didn't just commit above (though they are separate batches, so it's fine)
                        // Actually, reusing specific batch variables in block scopes
                    }
                    await batch.commit();
                    console.log("Words updated successfully.");
                }

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

            // Load settings
            const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
            if (storedSettings) {
                try {
                    const settings = JSON.parse(storedSettings);
                    if (settings.quizSessionSize) {
                        setQuizSessionSizeState(settings.quizSessionSize);
                    }
                } catch (e) {
                    console.error("Error parsing settings from localStorage", e);
                }
            }
        }
        setLoading(false);
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
    
    const selectedWords = words.filter(word => wordIdsToQuiz.includes(word.id));
    
    // Fisher-Yates Shuffle implementation
    const shuffled = [...selectedWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }, [words, progress]);

  // 復習チャレンジ: Learning単語を全て取得
  const getWordsForReviewChallenge = useCallback((): Word[] => {
    const learningWordIds = Array.from(progress.values())
      .filter((p: WordProgress) => p.status === WordStatus.Learning)
      .map((p: WordProgress) => p.wordId);
    
    const selectedWords = words.filter(word => learningWordIds.includes(word.id));
    
    // Fisher-Yates Shuffle
    const shuffled = [...selectedWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }, [words, progress]);

  // 単語の進捗をリセット（復習チャレンジで不正解時）
  const resetWordProgress = useCallback((wordId: string) => {
    const currentProgress = progress.get(wordId);
    if (!currentProgress) return;
    const currentWord = words.find(w => w.id === wordId);
    if (!currentWord) return;

    const newProgress = { ...currentProgress };
    newProgress.lastCorrect = false;
    newProgress.repetitions = 0;
    newProgress.interval = 0;
    newProgress.nextReviewDate = new Date().toISOString(); // 今日に設定

    setProgress(new Map(progress.set(wordId, newProgress)));
    
    if (user) {
        syncToFirestore(currentWord, newProgress);
    }
  }, [progress, words, user]);

  
  const updateWordProgress = useCallback((wordId: string, correct: boolean) => {
    const currentProgress = progress.get(wordId);
    if (!currentProgress) return;
    const currentWord = words.find(w => w.id === wordId);
    if (!currentWord) return;

    const newProgress = { ...currentProgress };
    const quality = correct ? 5 : 1; 

    if (quality >= CORRECT_ANSWER_THRESHOLD) { 
        newProgress.lastCorrect = true;
        if (newProgress.repetitions < LEARNING_INTERVALS.length) {
            newProgress.interval = LEARNING_INTERVALS[newProgress.repetitions];
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

    if(newProgress.interval >= 60) { 
        newProgress.status = WordStatus.Mastered;
    }

    setProgress(new Map(progress.set(wordId, newProgress)));
    
    // Sync
    if (user) {
        syncToFirestore(currentWord, newProgress);
    }
  }, [progress, words, user]);

  const addNewWord = useCallback((hungarian: string, japanese: string, example?: { sentence: string, translation: string }) => {
    const existingWord = words.find(w => w.hungarian.toLowerCase() === hungarian.toLowerCase());
    if (existingWord) return;

    const newWord: Word = {
        id: `word_${new Date().getTime()}`,
        hungarian,
        japanese,
        context: "AIチャットで登場",
        example
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

  const markAsMastered = useCallback((wordId: string) => {
    const currentProgress = progress.get(wordId);
    if (!currentProgress) return;
    const currentWord = words.find(w => w.id === wordId);
    if (!currentWord) return;

    const newProgress = { ...currentProgress };
    newProgress.status = WordStatus.Mastered;
    newProgress.interval = 365; // Set to a year or long duration
    newProgress.easiness = 5.0; // Max easiness
    
    // Set next review to far future
    const now = new Date();
    now.setDate(now.getDate() + newProgress.interval);
    newProgress.nextReviewDate = now.toISOString();

    setProgress(new Map(progress.set(wordId, newProgress)));

    // Sync
    if (user) {
        syncToFirestore(currentWord, newProgress);
    }
  }, [progress, words, user]);

  const markAsLearning = useCallback((wordId: string) => {
    const currentProgress = progress.get(wordId);
    if (!currentProgress) return;
    const currentWord = words.find(w => w.id === wordId);
    if (!currentWord) return;

    const newProgress = { ...currentProgress };
    newProgress.status = WordStatus.Learning;
    newProgress.interval = 0;
    newProgress.easiness = Math.max(INITIAL_EASINESS, newProgress.easiness - 0.2); // Sligthly decrease easiness
    newProgress.repetitions = 0;
    newProgress.nextReviewDate = new Date().toISOString(); // Review immediately

    setProgress(new Map(progress.set(wordId, newProgress)));

    // Sync
    if (user) {
        syncToFirestore(currentWord, newProgress);
    }
  }, [progress, words, user]);

  const updateWord = useCallback((updatedWord: Word) => {
    setWords(prevWords => prevWords.map(w => w.id === updatedWord.id ? updatedWord : w));
    
    // Sync to Firestore
    if (user) {
        const wordProgress = progress.get(updatedWord.id);
        if (wordProgress) {
            syncToFirestore(updatedWord, wordProgress);
        }
    } else {
        // Local storage sync is handled by useEffect when 'words' changes
    }
  }, [progress, user]);

  const deleteWord = useCallback(async (wordId: string) => {
    setWords(prevWords => prevWords.filter(w => w.id !== wordId));
    setProgress(prevProgress => {
        const newProgress = new Map(prevProgress);
        newProgress.delete(wordId);
        return newProgress;
    });

    if (user) {
        try {
            await deleteDoc(doc(db, `users/${user.uid}/words`, wordId));
        } catch (error) {
            console.error("Error deleting word from Firestore:", error);
        }
    }
  }, [user]);

  const setQuizSessionSize = useCallback((size: number) => {
    setQuizSessionSizeState(size);
    // Persist immediately to localStorage
    const settings = { quizSessionSize: size };
    localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    
    // If user is logged in, we could sync to Firestore here in the future
    if (user) {
        // For now, let's just keep it in localStorage and optionally update user profile/settings
    }
  }, [user]);

  const contextValue = { words, progress, getWordById, getWordsForQuiz, getWordsForReviewChallenge, updateWordProgress, resetWordProgress, addNewWord, getStats, loading, markAsMastered, updateWord, deleteWord, markAsLearning, quizSessionSize, setQuizSessionSize };
  return React.createElement(WordBankContext.Provider, { value: contextValue }, children);
};

export const useWordBank = (): WordBankContextType => {
  const context = useContext(WordBankContext);
  if (context === undefined) {
    throw new Error('useWordBank must be used within a WordBankProvider');
  }
  return context;
};
