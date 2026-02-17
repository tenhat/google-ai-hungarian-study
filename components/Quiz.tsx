import React, { useState, useEffect, useMemo } from 'react';
import { useWordBank } from '../hooks/useWordBank';
import { Word, QuizMode } from '../types';
import { ArrowRight, Volume2, Check, X, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';


const highlightWordInSentence = (sentence: string, wordToHighlight: string) => {
  if (!sentence || !wordToHighlight) return sentence;
  
  const escapedWord = wordToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedWord})`, 'gi');
  const parts = sentence.split(regex);

  return (
    <span>
      {parts.map((part, index) => 
        part.toLowerCase() === wordToHighlight.toLowerCase() ? (
          <span key={index} className="bg-yellow-200 text-yellow-800 font-bold px-1 rounded-sm mx-0.5">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};

const Quiz: React.FC = () => {
  const { t } = useTranslation();
  const { words, getWordsForQuiz, updateWordProgress, getWordById, progress, markAsMastered, loading } = useWordBank();
  
  interface QuizItem {
    word: Word;
    type: 'word_only' | 'with_example';
  }

  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>(QuizMode.HuToJp);

  const currentItem = useMemo(() => quizItems[currentIndex], [quizItems, currentIndex]);
  const currentWord = useMemo(() => currentItem?.word, [currentItem]);

  useEffect(() => {
    // Only load quiz words if we don't have them yet and words are loaded
    if (quizItems.length === 0 && words.length > 0) {
      const dueWords = getWordsForQuiz(10);
      
      // Generate Quiz Items
      const newQuizItems: QuizItem[] = [];
      
      for (const word of dueWords) {
          // 1. Add item with example (if exists)
          if (word.example) {
              const exampleItem: QuizItem = { word, type: 'with_example' };
              // Insert at random position
              const indexA = Math.floor(Math.random() * (newQuizItems.length + 1));
              newQuizItems.splice(indexA, 0, exampleItem);
              
              // 2. Add word-only item (must be after example item)
              const wordItem: QuizItem = { word, type: 'word_only' };
              // Random position between indexA + 1 and end
              const minIndexB = indexA + 1;
              const indexB = Math.floor(Math.random() * (newQuizItems.length - minIndexB + 1)) + minIndexB;
              newQuizItems.splice(indexB, 0, wordItem);
          } else {
              // No example, just add word item at random position
              const wordItem: QuizItem = { word, type: 'word_only' };
              const index = Math.floor(Math.random() * (newQuizItems.length + 1));
              newQuizItems.splice(index, 0, wordItem);
          }
      }

      setQuizItems(newQuizItems);
      setCurrentIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length]);

  useEffect(() => {
    if (currentWord) {
      // Determine quiz mode
      const newQuizMode = QuizMode.HuToJp;
      setQuizMode(newQuizMode);

      const correctAnswer = newQuizMode === QuizMode.HuToJp ? currentWord.japanese : currentWord.hungarian;
      const incorrectOptions = words
        .filter(w => w.id !== currentWord.id)
        .map(w => newQuizMode === QuizMode.HuToJp ? w.japanese : w.hungarian)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      setOptions([correctAnswer, ...incorrectOptions].sort(() => 0.5 - Math.random()));
    }
  }, [currentWord, words]);

  const handleNext = () => {
    setSelectedOption(null);
    setIsCorrect(null);
    if(currentIndex < quizItems.length - 1) {
        setCurrentIndex(prev => prev + 1);
    } else {
        // Quiz finished, reload new set
        setQuizItems([]);
        setCurrentIndex(0);
    }
    // 画面を一番上にスクロール（iOS Safari対応）
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleAnswer = (option: string) => {
    if (selectedOption) return; // Prevent multiple answers

    setSelectedOption(option);
    const correctAnswer = quizMode === QuizMode.HuToJp ? currentWord.japanese : currentWord.hungarian;
    const wasCorrect = option === correctAnswer;
    setIsCorrect(wasCorrect);
    updateWordProgress(currentWord.id, wasCorrect);
    playAudio();

    if (wasCorrect) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#3b82f6', '#fbbf24', '#f87171']
      });
    }
  };

  const handleMastered = () => {
    if (selectedOption) return; // Prevent if already answered
    markAsMastered(currentWord.id);
    handleNext();
  };

  const handleGiveUp = () => {
    if (selectedOption) return;
    
    // Mark as incorrect
    setSelectedOption('__GIVE_UP__'); // Special value to indicate give up
    setIsCorrect(false);
    updateWordProgress(currentWord.id, false);
    // 画面を一番上にスクロール（iOS Safari対応）
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const playAudio = () => {
      if (!currentWord) return;

      const speak = () => {
          const utterance = new SpeechSynthesisUtterance(currentWord.hungarian);
          utterance.lang = 'hu-HU';
          
          // Explicitly find and set Hungarian voice
          const voices = window.speechSynthesis.getVoices();
          // Try exact match first, then prefix match
          const huVoice = voices.find(v => v.lang === 'hu-HU' || v.lang === 'hu_HU') || 
                          voices.find(v => v.lang.startsWith('hu'));
                          
          if (huVoice) {
              utterance.voice = huVoice;
          } else {
              console.warn("Hungarian voice not found in available voices:", voices.map(v => v.lang));
          }

          window.speechSynthesis.speak(utterance);
      };

      // Chrome/iOS requires handling async voice loading
      if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
              speak();
              window.speechSynthesis.onvoiceschanged = null;
          };
      } else {
          speak();
      }
  };

  useEffect(() => {
    if (currentWord && quizMode === QuizMode.HuToJp) {
        playAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord]);


  if (loading || (quizItems.length === 0 && words.length > 0)) {
     // Show loading or empty state if needed
     return <div className="text-center p-4">{t('common.loading')}</div>; 
  }

  if (quizItems.length === 0) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center text-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg animate-scale-in">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">{t('quiz.completedTitle')}</h2>
          <p className="text-slate-500">{t('quiz.allReviewed')}</p>
        </div>
      </div>
    );
  }

  if (!currentItem) return null;

  const question = quizMode === QuizMode.HuToJp ? currentWord.hungarian : currentWord.japanese;
  const correctAnswer = quizMode === QuizMode.HuToJp ? currentWord.japanese : currentWord.hungarian;
  const wordProgress = progress.get(currentWord.id);
  const wordContext = getWordById(currentWord.id)?.context;


  return (
    <div className="flex-grow flex flex-col justify-center p-2 animate-fade-in">
        <div 
          key={currentIndex} // キー変更でアニメーション再発火
          className="w-full max-w-xl mx-auto space-y-3 animate-slide-up"
        >
            <div className="relative p-4 rounded-xl bg-white shadow-xl border border-slate-100 ring-1 ring-slate-50">
                <div className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                    {currentIndex + 1} / {quizItems.length}
                </div>
                 {wordContext && <div className="text-xs text-blue-600 font-bold mb-2 tracking-wide bg-blue-50 inline-block px-1.5 py-0.5 rounded">{wordContext}</div>}
                <div className="text-center py-2">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{quizMode === QuizMode.HuToJp ? t('common.hungarian') : t('common.japanese')}</p>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">{question}</h2>
                    {quizMode === QuizMode.HuToJp && (
                        <button 
                            onClick={playAudio}
                            className="mt-2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                        >
                            <Volume2 size={20} />
                        </button>
                    )}
                </div>
                {currentWord.example && currentItem.type === 'with_example' && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 max-w-md w-full text-center mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
                    <p className="text-sm font-medium text-slate-700 mb-1 leading-relaxed">{highlightWordInSentence(currentWord.example.sentence, currentWord.hungarian)}</p>
                    {selectedOption && <p className="text-[10px] text-slate-500 border-t border-slate-200 pt-1 mt-1">{currentWord.example.translation}</p>}
                  </div>
                )}
            </div>

            <div className="flex justify-end -mt-1">
                <button 
                  onClick={handleMastered}
                  className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors text-xs"
                  title={t('quiz.skipTooltip')}
                >
                    <CheckCircle size={16} />
                    <span>{t('quiz.mastered')}</span>
                </button>
            </div>

            {/* 選択済みの場合は選択肢を非表示にする（結果表示スペース確保のため） */}
            {!selectedOption && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleAnswer(option)}
                            disabled={!!selectedOption}
                            className={`p-3.5 rounded-lg text-base font-bold text-left transition-all duration-200 border-2
                            bg-white border-transparent shadow-sm hover:shadow-md hover:border-indigo-200 hover:scale-[1.01] active:scale-[0.99]
                            `}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}

            {!selectedOption && (
                <div className="flex justify-center mt-4">
                    <button 
                        onClick={handleGiveUp}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 font-medium px-4 py-1.5 rounded-full hover:bg-slate-100 transition-colors text-xs"
                    >
                        <HelpCircle size={16} />
                        <span>{t('quiz.unknown')}</span>
                    </button>
                </div>
            )}

            {selectedOption && (
                <div className={`p-4 rounded-xl flex flex-col items-center justify-between shadow-lg animate-scale-in border mt-2 
                    ${isCorrect 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                        : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200 animate-shake'
                    }`}>
                    <div className="flex items-center gap-3 w-full mb-3">
                        <div className={`p-2 rounded-full shadow-sm flex-shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {isCorrect ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-lg font-black truncate ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                {isCorrect ? t('quiz.correct') : t('quiz.incorrect')}
                            </p>
                            {!isCorrect && (
                                <p className="text-red-700 text-sm font-medium mt-0.5 truncate">
                                    {t('quiz.correctAnswerPrefix')} <span className="font-bold border-b border-red-300 ml-1">{correctAnswer}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={handleNext} 
                        className={`w-full font-bold py-3 px-8 rounded-lg shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm
                            ${isCorrect 
                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-100' 
                                : 'bg-slate-800 hover:bg-slate-900 text-white'
                            }`}
                        autoFocus
                    >
                        <span>{t('quiz.next')}</span> <ArrowRight size={18} />
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default Quiz;
