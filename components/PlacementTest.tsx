import React, { useState } from 'react';
import { View } from '../types';
import { PLACEMENT_QUESTIONS, calculateLevel } from '../data/placementQuestions';
import { useHungarianLevel } from '../hooks/useHungarianLevel';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface PlacementTestProps {
  setCurrentView: (view: View) => void;
}

const PlacementTest: React.FC<PlacementTestProps> = ({ setCurrentView }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const { saveLevel, loading, level: currentLevel } = useHungarianLevel();

  const currentQuestion = PLACEMENT_QUESTIONS[currentQuestionIndex];

  const handleAnswer = async (selectedOption: string) => {
    // 正解判定
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);

    // 次の問題へ、もしくは終了処理
    if (currentQuestionIndex < PLACEMENT_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setIsFinished(true);
      // レベル計算と保存
      const calculatedLevel = calculateLevel(newScore);
      try {
        await saveLevel(calculatedLevel);
      } catch (e) {
        console.error("Failed to save level", e);
      }
    }
  };

  const handleRetake = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setIsFinished(false);
  };

  if (isFinished) {
    const finalLevel = calculateLevel(score);
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-6 max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[60vh]">
        <CheckCircle2 size={64} className="text-green-500 mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-center">
          テスト完了！
        </h2>
        <div className="text-center space-y-2">
          <p className="text-lg text-slate-600">あなたの正答数: {score} / {PLACEMENT_QUESTIONS.length}</p>
          <p className="text-xl text-slate-700">判定されたハンガリー語レベル:</p>
          <div className="text-5xl font-black text-indigo-700 py-4 shadow-sm bg-indigo-50/50 rounded-xl my-4">
            {finalLevel}
          </div>
          <p className="text-sm text-slate-500">このレベルはマイページ等で確認でき、今後の学習の目安となります。</p>
        </div>
        
        <div className="flex gap-4 pt-6 w-full max-w-sm">
          <button
            onClick={() => setCurrentView(View.Home)}
            disabled={loading}
            className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            {loading ? '保存中...' : 'ホームへ戻る'}
          </button>
        </div>
        <button
          onClick={handleRetake}
          className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-4"
        >
          もう一度テストを受ける
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto w-full space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentView(View.Home)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          <span className="font-medium text-sm">戻る</span>
        </button>
        <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          問題 {currentQuestionIndex + 1} / {PLACEMENT_QUESTIONS.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-blue-600 h-full transition-all duration-300 ease-in-out"
          style={{ width: `${((currentQuestionIndex) / PLACEMENT_QUESTIONS.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
          {currentQuestion.question}
        </h2>

        <div className="flex flex-col gap-3">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(option)}
              className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-slate-700 font-medium text-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 active:scale-[0.98]"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlacementTest;
