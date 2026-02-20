import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroContextType {
  mode: PomodoroMode;
  timeLeft: number;
  isRunning: boolean;
  cyclesCompleted: number;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipTimer: () => void;
}

const pomodoroDurations = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const POMODORO_CYCLES_BEFORE_LONG_BREAK = 4;

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const PomodoroProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<PomodoroMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(pomodoroDurations.work);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  // 学習時間をFirestoreに保存する関数
  const saveStudySession = useCallback(async (durationSeconds: number) => {
    if (!user) return; // ログインしていない場合は保存しない
    if (durationSeconds <= 0) return;

    try {
      const durationMinutes = Math.round(durationSeconds / 60);
      if (durationMinutes === 0) return; // 1分未満は記録しない

      const newSession = {
        date: new Date().toISOString(),
        durationMinutes,
        type: 'pomodoro_work',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'users', user.uid, 'study_sessions'), newSession);
      console.log('Study session saved:', newSession);
    } catch (error) {
      console.error('Error saving study session:', error);
    }
  }, [user]);

  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(pomodoroDurations[mode]);
  };

  const skipTimer = () => {
    // スキップされた場合、実際に経過した時間を記録
    if (mode === 'work') {
      const elapsedSeconds = pomodoroDurations.work - timeLeft;
      saveStudySession(elapsedSeconds);
    }
    handleTimerComplete();
  };

  const handleTimerComplete = useCallback(() => {
    let nextMode: PomodoroMode = 'work';
    let nextCycles = cyclesCompleted;

    if (mode === 'work') {
      nextCycles = cyclesCompleted + 1;
      
      // 作業タイマーが自然に0になった場合の記録（25分まるごと）
      if (timeLeft === 0) {
        saveStudySession(pomodoroDurations.work);
      }

      if (nextCycles % POMODORO_CYCLES_BEFORE_LONG_BREAK === 0) {
        nextMode = 'longBreak';
      } else {
        nextMode = 'shortBreak';
      }
    } else if (mode === 'shortBreak' || mode === 'longBreak') {
      nextMode = 'work';
    }

    setMode(nextMode);
    setTimeLeft(pomodoroDurations[nextMode]);
    setCyclesCompleted(nextCycles);
    setIsRunning(false); // タイマー終了時は自動停止（ユーザーが開始を押すまで待つ）
  }, [mode, cyclesCompleted, timeLeft, saveStudySession]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, handleTimerComplete]);

  return (
    <PomodoroContext.Provider
      value={{
        mode,
        timeLeft,
        isRunning,
        cyclesCompleted,
        startTimer,
        pauseTimer,
        resetTimer,
        skipTimer,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
};
