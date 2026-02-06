import React, { useState, useEffect, useMemo } from 'react';
import { useWordBank } from '../hooks/useWordBank';
import { Word } from '../types';
import { Trophy, RefreshCw, Volume2, ArrowRight, CheckCircle2, XCircle, Target, Play } from 'lucide-react';

const STORAGE_KEY = 'review-challenge-progress';

interface ChallengeProgress {
  wordIds: string[];
  currentIndex: number;
  correctCount: number;
  incorrectCount: number;
}

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
  const [savedProgress, setSavedProgress] = useState<ChallengeProgress | null>(null);

  const stats = getStats();
  const currentWord = quizWords[currentIndex];

  // 保存された進捗を読み込む
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const progress: ChallengeProgress = JSON.parse(saved);
        setSavedProgress(progress);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // 進捗を保存する
  useEffect(() => {
    if (hasStarted && !isFinished && quizWords.length > 0) {
      const progress: ChallengeProgress = {
        wordIds: quizWords.map(w => w.id),
        currentIndex,
        correctCount,
        incorrectCount,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }, [hasStarted, isFinished, quizWords, currentIndex, correctCount, incorrectCount]);

  // 完了時に進捗を削除
  useEffect(() => {
    if (isFinished) {
      localStorage.removeItem(STORAGE_KEY);
      setSavedProgress(null);
    }
  }, [isFinished]);

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

  // 保存された進捗から再開
  const resumeChallenge = () => {
    if (!savedProgress) return;
    
    const resumedWords = savedProgress.wordIds
      .map(id => words.find(w => w.id === id))
      .filter((w): w is Word => w !== undefined);
    
    if (resumedWords.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      setSavedProgress(null);
      return;
    }

    setQuizWords(resumedWords);
    setCurrentIndex(savedProgress.currentIndex);
    setCorrectCount(savedProgress.correctCount);
    setIncorrectCount(savedProgress.incorrectCount);
    setSelectedOption(null);
    setIsCorrect(null);
    setIsFinished(false);
    setHasStarted(true);
  };

  const startChallenge = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedProgress(null);
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
          <div className="flex flex-col gap-3">
            {savedProgress && (
              <button
                onClick={resumeChallenge}
                className="bg-orange-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <Play size={20} />
                続きから再開（{savedProgress.currentIndex + 1}/{savedProgress.wordIds.length}）
              </button>
            )}
            <button
              onClick={startChallenge}
              className={`${savedProgress ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-orange-500 text-white hover:bg-orange-600'} font-bold py-3 px-8 rounded-full shadow-lg transition-colors flex items-center gap-2`}
            >
              <Target size={20} />
              {savedProgress ? '最初から始める' : 'チャレンジ開始'}
            </button>
          </div>
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
    <div className="flex flex-col min-h-[60vh] p-3 bg-white rounded-xl shadow-xl border border-orange-50 animate-fade-in relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"></div>

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-orange-100 p-1.5 rounded-lg">
            <Target className="text-orange-600" size={20} />
          </div>
          <span className="font-bold text-slate-800 text-base">Review Challenge</span>
        </div>
        <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
          {currentIndex + 1} / {quizWords.length}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6 overflow-hidden shadow-inner">
        <div 
          className="bg-gradient-to-r from-orange-400 to-red-500 h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm"
          style={{ width: `${((currentIndex + 1) / quizWords.length) * 100}%` }}
        />
      </div>

      {/* 問題 */}
      {currentWord && (
        <div 
            key={currentIndex} // キー変更でアニメーション再発火
            className="flex-grow flex flex-col animate-slide-up"
        >
          <div className="text-center mb-6">
            <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">Translate into Hungarian</p>
            <p className="text-2xl md:text-4xl font-extrabold text-slate-800 mb-3 tracking-tight">
              {currentWord.japanese}
            </p>
            {currentWord.example && (
              <div className="inline-block bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                <p className="text-xs text-slate-600 italic flex items-center gap-1.5">
                  <span className="bg-orange-200 text-orange-800 text-[10px] px-1.5 rounded font-bold">HINT</span> 
                  {currentWord.example.translation}
                </p>
              </div>
            )}
          </div>

          {/* 選択肢 */}
          <div className="grid grid-cols-1 gap-2.5 mb-6">
            {options.map((option, index) => {
              const isSelected = selectedOption === option;
              const isCorrectAnswer = option === currentWord.hungarian;
              
              let buttonBaseClass = "p-3.5 rounded-lg border-2 text-left text-base font-bold transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden";
              let buttonStateClass = "";
              
              if (selectedOption) {
                if (isCorrectAnswer) {
                  buttonStateClass = "border-green-500 bg-green-50 text-green-800 shadow-md";
                } else if (isSelected) {
                  buttonStateClass = "border-red-500 bg-red-50 text-red-800 opacity-90";
                } else {
                  buttonStateClass = "border-transparent bg-slate-50 text-slate-400 opacity-50 contrast-50";
                }
              } else {
                buttonStateClass = "border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50/50 hover:shadow-md text-slate-700 shadow-sm";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  disabled={selectedOption !== null}
                  className={`${buttonBaseClass} ${buttonStateClass}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex justify-between items-center relative z-10">
                    <span>{option}</span>
                    {selectedOption && isCorrectAnswer && (
                        <CheckCircle2 className="text-green-600 animate-scale-in" size={20} />
                    )}
                    {selectedOption && isSelected && !isCorrectAnswer && (
                        <XCircle className="text-red-500 animate-scale-in" size={20} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 結果と次へ */}
          {selectedOption && (
            <div className="mt-auto animate-fade-in">
              <div className={`p-4 rounded-xl mb-4 shadow-md border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${isCorrect ? 'bg-green-200' : 'bg-red-200'}`}>
                        {isCorrect ? (
                        <CheckCircle2 className="text-green-700" size={20} />
                        ) : (
                        <XCircle className="text-red-700" size={20} />
                        )}
                    </div>
                    <div>
                        <span className={`text-base font-extrabold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                        {isCorrect ? 'Correct!' : 'Incorrect'}
                        </span>
                        {!isCorrect && (
                        <p className="text-xs text-red-700 font-medium mt-0.5">
                            Answer: <span className="font-bold">{currentWord.hungarian}</span>
                        </p>
                        )}
                    </div>
                  </div>
                  <button
                    onClick={playAudio}
                    className="p-2.5 rounded-lg hover:bg-white/50 text-slate-500 hover:text-orange-600 transition-all border border-transparent hover:border-orange-200 hover:shadow-sm"
                    title="Listen"
                  >
                    <Volume2 size={20} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-orange-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base"
                autoFocus
              >
                {currentIndex < quizWords.length - 1 ? (
                  <>
                    Next Question
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    Finish Challenge
                    <Trophy size={18} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewChallenge;
