import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

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

  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(pomodoroDurations[mode]);
  };

  const skipTimer = () => {
    handleTimerComplete();
  };

  const handleTimerComplete = () => {
    let nextMode: PomodoroMode = 'work';
    let nextCycles = cyclesCompleted;

    if (mode === 'work') {
      nextCycles = cyclesCompleted + 1;
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
  };

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
  }, [isRunning, timeLeft]);

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
