
import React, { useState, useRef, useEffect } from 'react';
import { getTranslation, getWordTranslation } from '../services/geminiService';
import { TranslationResult } from '../types';
import { Languages, Send, Loader2, BookOpen, ListChecks, Mic, MicOff } from 'lucide-react';
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
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
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
      recognition.lang = 'ja-JP'; // 日本語認識

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
  }, []);

  // 音声入力の開始/停止
  const toggleListening = () => {
    if (!recognitionRef.current) return;

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
      const translationResult = await getTranslation(inputText);
      setResult(translationResult);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsLoading(false);
    }
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
    <div className="flex flex-col h-full max-h-[80vh] bg-white rounded-xl shadow-lg border border-slate-200 relative">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <Languages className="text-blue-600" size={24} />
        <h2 className="text-lg font-bold text-slate-800">日本語 → ハンガリー語</h2>
      </div>

      {/* 入力エリア */}
      <div className="p-4 border-b border-slate-200">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="日本語を入力してください..."
            className="w-full p-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            rows={3}
            disabled={isLoading || isListening}
          />
          {/* 音声入力ボタン */}
          {speechSupported && (
            <button
              onClick={toggleListening}
              disabled={isLoading}
              className={`absolute right-2 bottom-2 p-2 rounded-full transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } disabled:opacity-50`}
              title={isListening ? '音声入力を停止' : '音声で入力'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}
        </div>
        {/* 音声入力中の表示 */}
        {isListening && (
          <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            音声を聞き取り中... 日本語で話してください
          </div>
        )}
        <button
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim()}
          className="mt-3 w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow hover:bg-blue-700 disabled:bg-slate-400 transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              翻訳中...
            </>
          ) : (
            <>
              <Send size={20} />
              翻訳する
            </>
          )}
        </button>
      </div>

      {/* 結果表示エリア */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {result && (
          <>
            {/* ハンガリー語翻訳 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🇭🇺</span>
                <h3 className="font-bold text-blue-800">ハンガリー語翻訳</h3>
              </div>
              <p className="text-lg text-slate-800">
                {renderClickableText(result.hungarian, result.hungarian, inputText)}
              </p>
            </div>

            {/* 活用・文法解説 */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="text-purple-600" size={20} />
                <h3 className="font-bold text-purple-800">活用・文法解説</h3>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">
                {renderClickableText(result.explanation, result.hungarian, inputText)}
              </p>
            </div>

            {/* 重要単語 */}
            {result.importantWords.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="text-green-600" size={20} />
                  <h3 className="font-bold text-green-800">重要単語</h3>
                </div>
                <div className="space-y-3">
                  {result.importantWords.map((word, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded-lg border border-green-200"
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-green-700">
                          {renderClickableText(word.hungarian, word.example.sentence, word.example.translation)}
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="text-slate-800">{word.japanese}</span>
                      </div>
                      <p className="text-sm text-slate-600">
                        例: {renderClickableText(word.example.sentence, word.example.sentence, word.example.translation)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {word.example.translation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!result && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Languages size={48} className="mb-4" />
            <p>日本語を入力して翻訳してください</p>
          </div>
        )}
      </div>

      {/* 単語追加モーダル */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50 rounded-xl">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              単語を追加: {selectedWord}
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                日本語の意味
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={japaneseMeaning}
                  onChange={(e) => setJapaneseMeaning(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none pr-8"
                  placeholder={isTranslating ? '翻訳中...' : '例: りんご'}
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
                例文
              </label>
              <textarea
                value={exampleSentence}
                onChange={(e) => setExampleSentence(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                rows={2}
                placeholder="例文を入力..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                例文の意味 (日本語)
              </label>
              <textarea
                value={exampleTranslation}
                onChange={(e) => setExampleTranslation(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                rows={2}
                placeholder="例文の日本語訳を入力..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveWord}
                disabled={!japaneseMeaning.trim() || isTranslating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Translate;
