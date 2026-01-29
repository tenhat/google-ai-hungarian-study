import React, { useState, useEffect, useMemo } from 'react';
import { useWordBank } from '../hooks/useWordBank';
import { Word } from '../types';
import { Trophy, RefreshCw, Volume2, ArrowRight, CheckCircle2, XCircle, Target } from 'lucide-react';

const ReviewChallenge: React.FC = () => {
  const { words, getWordsForReviewChallenge, resetWordProgress, getStats } = useWordBank();
  const [quizWords, setQuizWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const stats = getStats();
  const currentWord = quizWords[currentIndex];

  // 4択の選択肢を生成
  const options = useMemo(() => {
    if (!currentWord || quizWords.length < 4) return [];
    
    const correctAnswer = currentWord.hungarian;
    const wrongAnswers = words
      .filter(w => w.id !== currentWord.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.hungarian);
    
    return [...wrongAnswers, correctAnswer].sort(() => Math.random() - 0.5);
  }, [currentWord, words, quizWords.length]);

  const startChallenge = () => {
    const challengeWords = getWordsForReviewChallenge();
    setQuizWords(challengeWords);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsFinished(false);
    setHasStarted(true);
  };

  const handleAnswer = (option: string) => {
    if (selectedOption) return;

    setSelectedOption(option);
    const correctAnswer = currentWord.hungarian;
    const wasCorrect = option === correctAnswer;
    setIsCorrect(wasCorrect);

    if (wasCorrect) {
      setCorrectCount(prev => prev + 1);
      // 正解時は何もしない（間隔維持）
    } else {
      setIncorrectCount(prev => prev + 1);
      // 不正解時は間隔リセット
      resetWordProgress(currentWord.id);
    }
  };

  const handleNext = () => {
    if (currentIndex < quizWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      setIsFinished(true);
    }
  };

  const playAudio = () => {
    if (!currentWord) return;
    const utterance = new SpeechSynthesisUtterance(currentWord.hungarian);
    utterance.lang = 'hu-HU';
    window.speechSynthesis.speak(utterance);
  };

  // 開始前の画面
  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-white rounded-xl shadow-lg">
        <Target className="text-orange-500 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">復習チャレンジ</h2>
        <p className="text-slate-600 mb-6 text-center">
          学習中の単語を全てテストします。<br />
          日本語からハンガリー語を選んでください。
        </p>
        <div className="bg-orange-50 p-4 rounded-lg mb-6 text-center">
          <p className="text-lg font-bold text-orange-600">
            {stats.learningCount}単語
          </p>
          <p className="text-sm text-slate-500">出題対象</p>
        </div>
        {stats.learningCount === 0 ? (
          <p className="text-slate-500">学習中の単語がありません。まず通常Quizで単語を学習してください。</p>
        ) : (
          <button
            onClick={startChallenge}
            className="bg-orange-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <Target size={20} />
            チャレンジ開始
          </button>
        )}
      </div>
    );
  }

  // 結果画面
  if (isFinished) {
    const accuracy = quizWords.length > 0 ? Math.round((correctCount / quizWords.length) * 100) : 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-white rounded-xl shadow-lg">
        <Trophy className="text-yellow-500 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">チャレンジ完了！</h2>
        
        <div className="grid grid-cols-2 gap-4 my-6 w-full max-w-xs">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <CheckCircle2 className="text-green-500 mx-auto mb-2" size={32} />
            <p className="text-2xl font-bold text-green-600">{correctCount}</p>
            <p className="text-sm text-slate-500">正解</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <XCircle className="text-red-500 mx-auto mb-2" size={32} />
            <p className="text-2xl font-bold text-red-600">{incorrectCount}</p>
            <p className="text-sm text-slate-500">不正解</p>
          </div>
        </div>
        
        <p className="text-lg text-slate-600 mb-6">
          正答率: <span className="font-bold text-slate-800">{accuracy}%</span>
        </p>
        
        {incorrectCount > 0 && (
          <p className="text-sm text-orange-600 mb-4">
            ※ 不正解の{incorrectCount}単語は通常Quizで再出題されます
          </p>
        )}
        
        <button
          onClick={() => setHasStarted(false)}
          className="bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-full hover:bg-slate-300 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={20} />
          戻る
        </button>
      </div>
    );
  }

  // クイズ画面
  return (
    <div className="flex flex-col min-h-[60vh] p-4 bg-white rounded-xl shadow-lg">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="text-orange-500" size={24} />
          <span className="font-bold text-slate-800">復習チャレンジ</span>
        </div>
        <span className="text-sm text-slate-500">
          {currentIndex + 1} / {quizWords.length}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
        <div 
          className="bg-orange-500 h-2 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / quizWords.length) * 100}%` }}
        />
      </div>

      {/* 問題 */}
      {currentWord && (
        <>
          <div className="text-center mb-8">
            <p className="text-sm text-slate-500 mb-2">日本語</p>
            <p className="text-3xl font-bold text-slate-800 mb-4">
              {currentWord.japanese}
            </p>
            {currentWord.example && (
              <p className="text-sm text-slate-500 italic">
                ヒント: {currentWord.example.translation}
              </p>
            )}
          </div>

          {/* 選択肢 */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            {options.map((option, index) => {
              const isSelected = selectedOption === option;
              const isCorrectAnswer = option === currentWord.hungarian;
              let buttonClass = "p-4 rounded-lg border-2 text-left font-medium transition-all";
              
              if (selectedOption) {
                if (isCorrectAnswer) {
                  buttonClass += " border-green-500 bg-green-50 text-green-700";
                } else if (isSelected) {
                  buttonClass += " border-red-500 bg-red-50 text-red-700";
                } else {
                  buttonClass += " border-slate-200 text-slate-400";
                }
              } else {
                buttonClass += " border-slate-200 hover:border-orange-400 hover:bg-orange-50 text-slate-700";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  disabled={selectedOption !== null}
                  className={buttonClass}
                >
                  {option}
                  {selectedOption && isCorrectAnswer && (
                    <CheckCircle2 className="inline-block ml-2 text-green-500" size={20} />
                  )}
                  {selectedOption && isSelected && !isCorrectAnswer && (
                    <XCircle className="inline-block ml-2 text-red-500" size={20} />
                  )}
                </button>
              );
            })}
          </div>

          {/* 結果と次へ */}
          {selectedOption && (
            <div className="mt-auto">
              <div className={`p-4 rounded-lg mb-4 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="text-green-500" size={24} />
                    ) : (
                      <XCircle className="text-red-500" size={24} />
                    )}
                    <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {isCorrect ? '正解！' : '不正解'}
                    </span>
                  </div>
                  <button
                    onClick={playAudio}
                    className="p-2 rounded-full hover:bg-white/50"
                  >
                    <Volume2 size={20} className="text-slate-600" />
                  </button>
                </div>
                {!isCorrect && (
                  <p className="text-sm text-red-600 mt-2">
                    正解: {currentWord.hungarian}
                  </p>
                )}
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                {currentIndex < quizWords.length - 1 ? (
                  <>
                    次へ
                    <ArrowRight size={20} />
                  </>
                ) : (
                  <>
                    結果を見る
                    <Trophy size={20} />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewChallenge;
