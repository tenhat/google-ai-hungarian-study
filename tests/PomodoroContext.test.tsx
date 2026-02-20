import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PomodoroProvider, usePomodoro } from '../contexts/PomodoroContext';

// AuthContextをモック
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-id' }
  })
}));

// Firestore関連をモック
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock('../services/firebase', () => ({
  db: {}
}));

// テスト用コンポーネント
const TestComponent = () => {
  const {
    mode,
    timeLeft,
    isRunning,
    cyclesCompleted,
    startTimer,
    pauseTimer,
    resetTimer,
    skipTimer,
  } = usePomodoro();

  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="timeLeft">{timeLeft}</span>
      <span data-testid="isRunning">{isRunning.toString()}</span>
      <span data-testid="cyclesCompleted">{cyclesCompleted}</span>
      
      <button data-testid="start" onClick={startTimer}>Start</button>
      <button data-testid="pause" onClick={pauseTimer}>Pause</button>
      <button data-testid="reset" onClick={resetTimer}>Reset</button>
      <button data-testid="skip" onClick={skipTimer}>Skip</button>
    </div>
  );
};

const renderWithProvider = () => {
  return render(
    <PomodoroProvider>
      <TestComponent />
    </PomodoroProvider>
  );
};

describe('PomodoroContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初期状態が正しいこと', () => {
    renderWithProvider();
    
    expect(screen.getByTestId('mode').textContent).toBe('work');
    expect(screen.getByTestId('timeLeft').textContent).toBe('1500'); // 25 * 60
    expect(screen.getByTestId('isRunning').textContent).toBe('false');
    expect(screen.getByTestId('cyclesCompleted').textContent).toBe('0');
  });

  it('タイマーが開始・一時停止できること', () => {
    renderWithProvider();
    
    // Start
    fireEvent.click(screen.getByTestId('start'));
    expect(screen.getByTestId('isRunning').textContent).toBe('true');

    act(() => {
      vi.advanceTimersByTime(1000); // 1秒進める
    });
    
    expect(screen.getByTestId('timeLeft').textContent).toBe('1499');

    // Pause
    fireEvent.click(screen.getByTestId('pause'));
    expect(screen.getByTestId('isRunning').textContent).toBe('false');

    act(() => {
      vi.advanceTimersByTime(1000); // 一時停止中は進まない
    });
    
    expect(screen.getByTestId('timeLeft').textContent).toBe('1499');
  });

  it('リセットできること', () => {
    renderWithProvider();
    
    fireEvent.click(screen.getByTestId('start'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(screen.getByTestId('timeLeft').textContent).toBe('1495');
    
    fireEvent.click(screen.getByTestId('reset'));
    expect(screen.getByTestId('isRunning').textContent).toBe('false');
    expect(screen.getByTestId('timeLeft').textContent).toBe('1500');
  });

  it('skipTimerで次のモード（短い休憩）に遷移すること', () => {
    renderWithProvider();
    
    fireEvent.click(screen.getByTestId('skip'));
    
    expect(screen.getByTestId('mode').textContent).toBe('shortBreak');
    expect(screen.getByTestId('timeLeft').textContent).toBe('300'); // 5 * 60
    expect(screen.getByTestId('cyclesCompleted').textContent).toBe('1');
    expect(screen.getByTestId('isRunning').textContent).toBe('false'); // 自動停止
  });

  it('4サイクル目で長い休憩に遷移すること', () => {
    renderWithProvider();
    
    // 1(Work) -> 1(Break) -> 2(Work) -> 2(Break) -> 3(Work) -> 3(Break) -> 4(Work(次長い休憩))
    fireEvent.click(screen.getByTestId('skip')); // 1. Work -> Short Break
    fireEvent.click(screen.getByTestId('skip')); // 1. Short Break -> Work
    
    fireEvent.click(screen.getByTestId('skip')); // 2. Work -> Short Break
    fireEvent.click(screen.getByTestId('skip')); // 2. Short Break -> Work
    
    fireEvent.click(screen.getByTestId('skip')); // 3. Work -> Short Break
    fireEvent.click(screen.getByTestId('skip')); // 3. Short Break -> Work

    // 4回目のWorkを完了させる
    fireEvent.click(screen.getByTestId('skip')); 
    
    expect(screen.getByTestId('mode').textContent).toBe('longBreak');
    expect(screen.getByTestId('timeLeft').textContent).toBe('900'); // 15 * 60
    expect(screen.getByTestId('cyclesCompleted').textContent).toBe('4');
  });
});
