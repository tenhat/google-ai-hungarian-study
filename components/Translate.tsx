
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getTranslation, getWordTranslation } from '../services/geminiService';
import { TranslationResult } from '../types';
import { Languages, Send, Loader2, BookOpen, ListChecks, Mic, MicOff, ArrowRightLeft } from 'lucide-react';
import { useWordBank } from '../hooks/useWordBank';

// Web Speech API の型定義
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const Translate: React.FC = () => {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [direction, setDirection] = useState<'ja_to_hu' | 'hu_to_ja'>('ja_to_hu');
  const { addNewWord } = useWordBank();

  // 音声入力用State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // モーダル用State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [japaneseMeaning, setJapaneseMeaning] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [exampleTranslation, setExampleTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // 音声認識の初期化
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = direction === 'ja_to_hu' ? 'ja-JP' : 'hu-HU'; // 言語切り替え

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('音声認識エラー:', event.error);
        setIsListening(false);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInputText(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [direction]); // direction が変わったら再設定

  // 音声入力の開始/停止
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    // 現在の言語設定を確実に反映
    if (!isListening) {
        recognitionRef.current.lang = direction === 'ja_to_hu' ? 'ja-JP' : 'hu-HU';
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('音声認識の開始に失敗:', error);
      }
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const translationResult = await getTranslation(inputText, direction);
      setResult(translationResult);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 言語切り替え
  const toggleDirection = () => {
    setDirection(prev => prev === 'ja_to_hu' ? 'hu_to_ja' : 'ja_to_hu');
    setResult(null);
    setInputText('');
  };

  // ハンガリー語単語をクリック可能にする関数
  // exampleSentence: 例文として使用する文
  // exampleTranslation: 例文の日本語訳
  const renderClickableText = (
    text: string, 
    exampleSentence?: string, 
    exampleTranslation?: string
  ) => {
    return text.split(/([a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]+)/g).map((part, i) => {
      const isWord = /^[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]+$/.test(part);
      if (isWord) {
        return (
          <span
            key={i}
            onClick={() => handleWordClick(
              part, 
              text,
              exampleSentence || text, 
              exampleTranslation || ""
            )}
            className="cursor-pointer hover:bg-yellow-200 rounded px-0.5 inline-block"
            role="button"
            tabIndex={0}
          >
            {part}
          </span>
        );
      } else {
        return <span key={i}>{part}</span>;
      }
    });
  };

  const handleWordClick = async (
    word: string, 
    contextText: string,
    exampleSentenceArg: string,
    exampleTranslationArg: string
  ) => {
    const cleanedWord = word.replace(/[.,!?()]/g, '').toLowerCase();
    if (!cleanedWord) return;

    setSelectedWord(cleanedWord);
    setJapaneseMeaning('');
    
    // 渡された例文情報をそのまま使用
    setExampleSentence(exampleSentenceArg);
    setExampleTranslation(exampleTranslationArg);

    // APIで翻訳を取得
    setIsTranslating(true);
    setIsModalOpen(true);

    try {
      const translation = await getWordTranslation(cleanedWord, contextText);
      setJapaneseMeaning(translation);
    } catch (error) {
      console.error('Translation failed', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveWord = () => {
    if (selectedWord && japaneseMeaning) {
      addNewWord(
        selectedWord,
        japaneseMeaning,
        exampleSentence && exampleTranslation
          ? { sentence: exampleSentence, translation: exampleTranslation }
          : undefined
      );
      setIsModalOpen(false);
    }
  };

    return (
    <div className="flex flex-col h-full max-h-[80vh] bg-white rounded-xl shadow-xl border border-slate-200 relative overflow-hidden transition-all duration-300">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Languages className="text-indigo-600" size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {direction === 'ja_to_hu' ? t('translate.titleJaToHu') : t('translate.titleHuToJa')}
          </h2>
        </div>
        <button
          onClick={toggleDirection}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-300 transform hover:rotate-180 active:scale-95"
          title={t('translate.swap')}
        >
          <ArrowRightLeft size={20} />
        </button>
      </div>

      {/* 入力エリア */}
      <div className="p-5 border-b border-slate-100 bg-white group focus-within:bg-slate-50/30 transition-colors">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={direction === 'ja_to_hu' ? t('translate.placeholderJa') : t('translate.placeholderHu')}
            className="w-full p-4 pr-14 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none resize-none bg-slate-50 focus:bg-white shadow-sm transition-all text-lg leading-relaxed text-slate-700 placeholder:text-slate-400"
            rows={3}
            disabled={isLoading || isListening}
          />
          {/* 音声入力ボタン */}
          {speechSupported && (
            <button
              onClick={toggleListening}
              disabled={isLoading}
              className={`absolute right-3 bottom-3 p-2.5 rounded-full transition-all duration-200 shadow-sm border ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse-subtle border-red-400 ring-4 ring-red-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md hover:scale-105'
              } disabled:opacity-50 disabled:hover:scale-100`}
              title={isListening ? t('translate.listeningStop') : t('translate.listeningStart')}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}
        </div>
        {/* 音声入力中の表示 */}
        {isListening && (
          <div className="mt-3 flex items-center gap-2 text-red-500 text-sm font-medium animate-fade-in pl-1">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
            {t('translate.listeningActive', { lang: direction === 'ja_to_hu' ? t('common.japanese') : t('common.hungarian') })}
          </div>
        )}
        <button
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim()}
          className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-md hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2.5 tracking-wide active:scale-98"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              {t('translate.translatingButton')}
            </>
          ) : (
            <>
              <Send size={20} className="transform -rotate-45" />
              {t('translate.translateButton')}
            </>
          )}
        </button>
      </div>

      {/* 結果表示エリア */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {result && (
          <div className="space-y-6 pb-6 w-full">
            {/* 翻訳結果 */}
            <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-indigo-500 animate-slide-up ring-1 ring-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl filter drop-shadow-sm">{direction === 'ja_to_hu' ? '🇭🇺' : '🇯🇵'}</span>
                <h3 className="font-bold text-indigo-900 text-lg">
                    {direction === 'ja_to_hu' ? t('translate.resultHu') : t('translate.resultJa')}
                </h3>
              </div>
              <p className="text-xl text-slate-800 leading-relaxed font-medium">
                {direction === 'ja_to_hu' 
                    ? renderClickableText(result.hungarian, result.hungarian, inputText)
                    : (result.japanese || result.explanation) /* フォールバック */
                }
              </p>
            </div>

            {/* 活用・文法解説 */}
            <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-fuchsia-500 animate-slide-up ring-1 ring-slate-100" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 bg-fuchsia-100 rounded-lg">
                  <BookOpen className="text-fuchsia-600" size={20} />
                </div>
                <h3 className="font-bold text-fuchsia-900">{t('translate.grammar')}</h3>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-base">
                {renderClickableText(result.explanation, result.hungarian, inputText)}
              </p>
            </div>

            {/* 重要単語 */}
            {result.importantWords.length > 0 && (
              <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-emerald-500 animate-slide-up ring-1 ring-slate-100" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <ListChecks className="text-emerald-600" size={20} />
                  </div>
                  <h3 className="font-bold text-emerald-900">{t('translate.importantWords')}</h3>
                </div>
                <div className="space-y-3">
                  {result.importantWords.map((word, index) => (
                    <div
                      key={index}
                      className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors animate-scale-in"
                      style={{ animationDelay: `${250 + index * 50}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="flex items-baseline gap-3 mb-1.5 flex-wrap">
                        <span className="font-bold text-emerald-700 text-lg">
                          {renderClickableText(word.hungarian, word.example.sentence, word.example.translation)}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="text-slate-800 font-medium">{word.japanese}</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100 mt-2">
                        <p className="text-sm text-slate-700 mb-1">
                          <span className="text-slate-400 mr-2 text-xs uppercase tracking-wider font-bold">{t('translate.example')}</span>
                          {renderClickableText(word.example.sentence, word.example.sentence, word.example.translation)}
                        </p>
                        <p className="text-sm text-slate-500 pl-8">
                          {word.example.translation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Languages size={48} className="mb-4" />
            <p>{direction === 'ja_to_hu' ? t('translate.emptyStateJa') : t('translate.emptyStateHu')}</p>
          </div>
        )}
      </div>

      {/* 単語追加モーダル */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50 rounded-xl">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {t('chat.addWordTitle', { word: selectedWord })}
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {t('chat.meaningLabel')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={japaneseMeaning}
                  onChange={(e) => setJapaneseMeaning(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none pr-8"
                  placeholder={isTranslating ? t('chat.translating') : t('chat.meaningPlaceholder')}
                  autoFocus
                />
                {isTranslating && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="animate-spin text-slate-400" size={16} />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {t('chat.exampleLabel')}
              </label>
              <textarea
                value={exampleSentence}
                onChange={(e) => setExampleSentence(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                rows={2}
                placeholder={t('chat.examplePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {t('chat.exampleMeaningLabel')}
              </label>
              <textarea
                value={exampleTranslation}
                onChange={(e) => setExampleTranslation(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                rows={2}
                placeholder={t('chat.exampleMeaningPlaceholder')}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveWord}
                disabled={!japaneseMeaning.trim() || isTranslating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
              >
                {t('chat.add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Translate;
