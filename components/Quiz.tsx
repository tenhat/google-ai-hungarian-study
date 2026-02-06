import React, { useState, useEffect, useMemo } from 'react';
import { useWordBank } from '../hooks/useWordBank';
import { Word, QuizMode } from '../types';
import { ArrowRight, Volume2, Check, X, CheckCircle, HelpCircle } from 'lucide-react';

const Quiz: React.FC = () => {
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

  if (loading || (quizItems.length === 0 && words.length > 0)) {
     // Show loading or empty state if needed
  }

  if (quizItems.length === 0) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center text-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-green-600">All Done!</h2>
            <p className="text-slate-500 mt-2">今日復習する単語はありません。素晴らしい！</p>
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
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{quizMode === QuizMode.HuToJp ? 'Hungarian' : 'Japanese'}</p>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-800 tracking-tight">{question}</h2>
                    {quizMode === QuizMode.HuToJp && (
                        <button 
                            onClick={playAudio}
                            className="mt-2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                        >
                            <Volume2 size={20} />
                        </button>
                    )}
                </div>
                {/* Only show example if word has one AND current item type is 'with_example' */}
                {currentWord.example && currentItem.type === 'with_example' && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 max-w-md w-full text-center mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
                    <p className="text-base font-medium text-slate-700 mb-1 leading-relaxed">{currentWord.example.sentence}</p>
                    {selectedOption && <p className="text-xs text-slate-500 border-t border-slate-200 pt-1 mt-1">{currentWord.example.translation}</p>}
                  </div>
                )}
            </div>

            <div className="flex justify-end -mt-1">
                <button 
                  onClick={handleMastered}
                  className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors text-xs"
                  title="Already know this word? Skip it."
                >
                    <CheckCircle size={16} />
                    <span>I know this</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleAnswer(option)}
                        disabled={!!selectedOption}
                        className={`p-3.5 rounded-lg text-base font-bold text-left transition-all duration-200 border-2
                        ${selectedOption === null ? 'bg-white border-transparent shadow-sm hover:shadow-md hover:border-indigo-200 hover:scale-[1.01] active:scale-[0.99]' : ''}
                        ${selectedOption !== null && option === correctAnswer ? 'bg-green-100 text-green-800 border-green-500 shadow-none' : ''}
                        ${selectedOption === option && !isCorrect ? 'bg-red-100 text-red-800 border-red-500 shadow-none' : ''}
                        ${selectedOption !== null && option !== correctAnswer && selectedOption !== option ? 'bg-slate-50 text-slate-400 border-transparent opacity-50' : ''}
                        `}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {option}
                    </button>
                ))}
            </div>

            {!selectedOption && (
                <div className="flex justify-center mt-4">
                    <button 
                        onClick={handleGiveUp}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 font-medium px-4 py-1.5 rounded-full hover:bg-slate-100 transition-colors text-xs"
                    >
                        <HelpCircle size={16} />
                        <span>I don't know</span>
                    </button>
                </div>
            )}

            {selectedOption && (
                <div className={`p-4 rounded-xl flex items-center justify-between shadow-lg animate-scale-in ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${isCorrect ? 'bg-green-200' : 'bg-red-200'}`}>
                            {isCorrect ? <Check className="text-green-700" size={20} /> : <X className="text-red-700" size={20} />}
                        </div>
                        <div>
                            <p className={`text-base font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>{isCorrect ? 'Correct!' : 'Incorrect'}</p>
                            {!isCorrect && <p className="text-red-700 text-sm font-medium">Correct answer: <span className="font-bold">{correctAnswer}</span></p>}
                        </div>
                    </div>
                    <button 
                        onClick={handleNext} 
                        className="bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg shadow-md hover:bg-blue-700 hover:shadow-blue-300 hover:scale-105 transition-all flex items-center gap-1.5 text-sm"
                        autoFocus
                    >
                        Next <ArrowRight size={18} />
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default Quiz;
