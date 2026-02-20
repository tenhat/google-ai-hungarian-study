import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Brain, Coffee } from 'lucide-react';
import { usePomodoro } from '../../contexts/PomodoroContext';

const PomodoroTimer: React.FC = () => {
  const { mode, timeLeft, isRunning, cyclesCompleted, startTimer, pauseTimer, resetTimer, skipTimer } = usePomodoro();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'work':
        return <Brain size={16} className="text-blue-600" />;
      case 'shortBreak':
      case 'longBreak':
        return <Coffee size={16} className="text-orange-500" />;
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case 'work': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'shortBreak': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'longBreak': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-colors ${getModeColor()}`}>
      <div className="flex items-center justify-center p-1 bg-white/50 rounded-full">
        {getModeIcon()}
      </div>
      
      <div className="flex flex-col items-center justify-center min-w-[3rem]">
        <span className="text-sm font-bold leading-none tracking-wider">
          {formatTime(timeLeft)}
        </span>
        <div className="flex gap-0.5 mt-0.5">
           {[...Array(4)].map((_, i) => (
             <div 
               key={i} 
               className={`w-1 h-1 rounded-full ${i < (cyclesCompleted % 4) ? 'bg-current opacity-80' : 'bg-current opacity-20'}`} 
             />
           ))}
        </div>
      </div>

      <div className="flex items-center gap-1 border-l pl-2 ml-1 border-current/20">
        {isRunning ? (
          <button onClick={pauseTimer} className="p-1 hover:bg-black/5 rounded-full transition-colors" title="Pause">
            <Pause size={14} className="fill-current" />
          </button>
        ) : (
          <button onClick={startTimer} className="p-1 hover:bg-black/5 rounded-full transition-colors" title="Start">
            <Play size={14} className="fill-current" />
          </button>
        )}
        <button onClick={resetTimer} className="p-1 hover:bg-black/5 rounded-full transition-colors" title="Reset">
          <RotateCcw size={14} />
        </button>
        <button onClick={skipTimer} className="p-1 hover:bg-black/5 rounded-full transition-colors" title="Skip">
          <FastForward size={14} />
        </button>
      </div>
    </div>
  );
};

export default PomodoroTimer;
