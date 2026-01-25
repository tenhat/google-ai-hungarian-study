import React, { useState, useEffect, useMemo } from 'react';
import { useWordBank } from '../hooks/useWordBank';
import { Word, QuizMode } from '../types';
import { ArrowRight, Volume2, Check, X, CheckCircle } from 'lucide-react';

const Quiz: React.FC = () => {
  const { words, getWordsForQuiz, updateWordProgress, getWordById, progress, markAsMastered } = useWordBank();
  const [quizWords, setQuizWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>(QuizMode.HuToJp);

  const currentWord = useMemo(() => quizWords[currentIndex], [quizWords, currentIndex]);

  useEffect(() => {
    // Only load quiz words if we don't have them yet and words are loaded
    if (quizWords.length === 0 && words.length > 0) {
      const dueWords = getWordsForQuiz(10);
      setQuizWords(dueWords);
      setCurrentIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length]);

  useEffect(() => {
    if (currentWord) {
      // Determine quiz mode and generate options for the new word in one go
      // to ensure consistency and prevent state changes on re-renders for the same question.
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
    if(currentIndex < quizWords.length - 1) {
        setCurrentIndex(prev => prev + 1);
    } else {
        // Quiz finished, reshuffle
        const dueWords = getWordsForQuiz(10);
        setQuizWords(dueWords);
        setCurrentIndex(0);
    }
  };

  const handleAnswer = (option: string) => {
    if (selectedOption) return; // Prevent multiple answers

    setSelectedOption(option);
    const correctAnswer = quizMode === QuizMode.HuToJp ? currentWord.japanese : currentWord.hungarian;
    const wasCorrect = option === correctAnswer;
    setIsCorrect(wasCorrect);
    updateWordProgress(currentWord.id, wasCorrect);

    if (wasCorrect) {
        setTimeout(() => {
            handleNext();
        }, 500);
    }
  };

  const handleMastered = () => {
    if (selectedOption) return; // Prevent if already answered
    markAsMastered(currentWord.id);
    handleNext();
  };

  const playAudio = () => {
      if (!currentWord) return;
      const utterance = new SpeechSynthesisUtterance(currentWord.hungarian);
      utterance.lang = 'hu-HU';
      window.speechSynthesis.speak(utterance);
  };

  if (quizWords.length === 0) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center text-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-green-600">All Done!</h2>
            <p className="text-slate-500 mt-2">今日復習する単語はありません。素晴らしい！</p>
        </div>
      </div>
    );
  }

  if (!currentWord) return null;

  const question = quizMode === QuizMode.HuToJp ? currentWord.hungarian : currentWord.japanese;
  const correctAnswer = quizMode === QuizMode.HuToJp ? currentWord.japanese : currentWord.hungarian;
  const wordProgress = progress.get(currentWord.id);
  const wordContext = getWordById(currentWord.id)?.context;


  return (
    <div className="flex-grow flex flex-col justify-center p-4">
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="relative p-4 rounded-lg bg-white shadow-md">
                <div className="absolute top-2 right-2 text-xs text-slate-400 font-semibold">
                    {currentIndex + 1} / {quizWords.length}
                </div>
                 {wordContext && <div className="text-sm text-blue-500 font-semibold mb-4">{wordContext}</div>}
                <div className="text-center">
                    <p className="text-slate-500 mb-2">{quizMode === QuizMode.HuToJp ? 'Hungarian' : 'Japanese'}</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-800">{question}</h2>
                    {quizMode === QuizMode.HuToJp && (
                        <button 
                            onClick={playAudio}
                            className="mt-2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                            <Volume2 size={24} />
                        </button>
                    )}
                </div>
                {currentWord.example && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-lg max-w-md w-full text-center">
                    <p className="text-lg font-medium text-slate-700 mb-1">{currentWord.example.sentence}</p>
                    <p className="text-sm text-slate-500">{currentWord.example.translation}</p>
                  </div>
                )}
            </div>

            <div className="flex justify-end">
                <button 
                  onClick={handleMastered}
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
                  title="Already know this word? Skip it."
                >
                    <CheckCircle size={20} />
                    <span>I know this</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleAnswer(option)}
                        disabled={!!selectedOption}
                        className={`p-4 rounded-lg text-lg font-semibold text-left transition-all duration-200
                        ${selectedOption === null ? 'bg-white shadow hover:bg-slate-50 hover:shadow-lg' : ''}
                        ${selectedOption !== null && option === correctAnswer ? 'bg-green-100 text-green-800 border-2 border-green-400' : ''}
                        ${selectedOption === option && !isCorrect ? 'bg-red-100 text-red-800 border-2 border-red-400' : ''}
                        ${selectedOption !== null && option !== correctAnswer && selectedOption !== option ? 'bg-slate-100 text-slate-500' : ''}
                        `}
                    >
                        {option}
                    </button>
                ))}
            </div>

            {selectedOption && (
                <div className={`p-4 rounded-lg flex items-center justify-between ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="flex items-center gap-4">
                        {isCorrect ? <Check className="text-green-600" size={32} /> : <X className="text-red-600" size={32} />}
                        <div>
                            <p className={`font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>{isCorrect ? 'Correct!' : 'Incorrect'}</p>
                            {!isCorrect && <p className="text-red-700">Correct answer: {correctAnswer}</p>}
                        </div>
                    </div>
                    {!isCorrect && (
                        <button onClick={handleNext} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center gap-2">
                            Next <ArrowRight size={20} />
                        </button>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default Quiz;
