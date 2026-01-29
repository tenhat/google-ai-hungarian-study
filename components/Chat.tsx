
import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse, getGrammarCorrection, getWordTranslation, getDailyQuestion, getImageChatResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Send, CheckCircle, AlertCircle, Sparkles, Loader2, Camera, X, Trash2 } from 'lucide-react';
import { useWordBank } from '../hooks/useWordBank';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const { addNewWord } = useWordBank();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 画像関連の状態
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load History
  useEffect(() => {
    const saved = localStorage.getItem('hungarian-study-tenju-chat-history');
    if (saved) {
        try {
            setMessages(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to parse chat history", e);
        }
    }
    setIsHistoryLoaded(true);
  }, []);

  // Save History
  useEffect(() => {
    if (isHistoryLoaded) {
        localStorage.setItem('hungarian-study-tenju-chat-history', JSON.stringify(messages));
    }
  }, [messages, isHistoryLoaded]);

  // Daily Question
  useEffect(() => {
    if (!isHistoryLoaded) return;

    let mounted = true;
    const fetchDailyQuestion = async () => {
        if (messages.length === 0) {
             setIsLoading(true);
             try {
                const dailyQ = await getDailyQuestion();
                if (mounted) {
                    setMessages([{
                        id: `model-daily-${Date.now()}`,
                        role: 'model',
                        text: dailyQ.text,
                        translation: dailyQ.translation,
                        segments: dailyQ.segments,
                        timestamp: Date.now()
                    }]);
                }
             } catch (e) {
                 console.error("Failed to fetch daily question", e);
             } finally {
                 if (mounted) setIsLoading(false);
             }
        }
    };
    fetchDailyQuestion();
    return () => { mounted = false; };
  }, [isHistoryLoaded]); // Only run when history load completes (messages dep removed to avoid loops, intentionally running once per load)
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userInput,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    const correction = await getGrammarCorrection(userInput);
    
    setMessages(prev => prev.map(msg => msg.id === userMessage.id ? {...msg, correction} : msg));

    const correctedSentence = correction.isCorrect ? userInput : (correction.correctedSentence || userInput);
    const { text: aiResponseText, translation, segments } = await getChatResponse(messages, correctedSentence);

    const aiMessage: ChatMessage = {
      id: `model-${Date.now()}`,
      role: 'model',
      text: aiResponseText,
      translation: translation,
      segments: segments,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsLoading(false);
  };

  // 画像選択処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック (5MB制限)
    if (file.size > 5 * 1024 * 1024) {
      alert('画像サイズが大きすぎます。5MB以下の画像を選択してください。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedImage(dataUrl);
      setImageMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  // 画像送信処理
  const handleImageSend = async () => {
    if (!selectedImage || isLoading) return;

    // base64データ部分を抽出（data:image/jpeg;base64, を除去）
    const base64Data = selectedImage.split(',')[1];
    
    const userMessage: ChatMessage = {
      id: `user-img-${Date.now()}`,
      role: 'user',
      text: '📷 画像を送信しました',
      imageUrl: selectedImage,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setSelectedImage(null);
    setImageMimeType('');
    setIsLoading(true);

    try {
      const { text: aiResponseText, translation, segments } = await getImageChatResponse(base64Data, imageMimeType);

      const aiMessage: ChatMessage = {
        id: `model-img-${Date.now()}`,
        role: 'model',
        text: aiResponseText,
        translation: translation,
        segments: segments,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage: ChatMessage = {
        id: `model-error-${Date.now()}`,
        role: 'model',
        text: 'Sajnos hiba történt a kép feldolgozása során.',
        translation: '画像の処理中にエラーが発生しました。',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // プレビューキャンセル
  const handleCancelImage = () => {
    setSelectedImage(null);
    setImageMimeType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // チャット履歴を初期化
  const handleClearHistory = () => {
    if (window.confirm('チャット履歴を削除しますか？この操作は取り消せません。')) {
      setMessages([]);
      localStorage.removeItem('hungarian-study-tenju-chat-history');
    }
  };
  
  /* モーダル用State */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [japaneseMeaning, setJapaneseMeaning] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [exampleTranslation, setExampleTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const extractSentence = (text: string, word: string): string => {
      // Simple splitting by punctuation. Can be improved.
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      const match = sentences.find(s => s.toLowerCase().includes(word.toLowerCase()));
      return match ? match.trim() : "";
  };

  const handleWordClick = async (word: string, fullText: string, translationText?: string, segments?: { hungarian: string; japanese: string; }[]) => {
    const cleanedWord = word.replace(/[.,!?()]/g, '').toLowerCase(); 
    if (!cleanedWord) return;
    
    setSelectedWord(cleanedWord);
    setJapaneseMeaning(''); 
    
    let extractedSentence = "";
    let extractedTranslation = "";

    // 1. Try to find in segments (Highest Priority)
    if (segments && segments.length > 0) {
        const matchingSegment = segments.find(seg => seg.hungarian.toLowerCase().includes(cleanedWord));
        if (matchingSegment) {
            extractedSentence = matchingSegment.hungarian.trim();
            extractedTranslation = matchingSegment.japanese.trim();
        }
    } 
    
    // 2. Fallback to heuristic extraction if segments failed or missing
    if (!extractedSentence) {
        extractedSentence = extractSentence(fullText, word);
        // Translation fallback logic
        if (translationText && extractedSentence) {
            const huSentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
            const jpSentences = translationText.match(/[^。！？]+[。！？]+/g) || [translationText];
            
            const index = huSentences.findIndex(s => s.includes(extractedSentence));
            if (index !== -1 && index < jpSentences.length) {
                extractedTranslation = jpSentences[index].trim();
            }
        }
    }

    setExampleSentence(extractedSentence);
    setExampleTranslation(extractedTranslation);

    setIsTranslating(true);
    setIsModalOpen(true);

    try {
        const translation = await getWordTranslation(cleanedWord, fullText);
        setJapaneseMeaning(translation);
    } catch (error) {
        console.error("Translation failed", error);
    } finally {
        setIsTranslating(false);
    }
  };

  const handleSaveWord = () => {
    if (selectedWord && japaneseMeaning) {
        addNewWord(selectedWord, japaneseMeaning, 
            (exampleSentence && exampleTranslation) ? { sentence: exampleSentence, translation: exampleTranslation } : undefined
        );
        setIsModalOpen(false);
        // 成功メッセージなどを表示しても良いが、今回はシンプルに閉じる
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-white rounded-xl shadow-lg border border-slate-200 relative">
      {/* ヘッダーバー */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
        <h2 className="text-sm font-medium text-slate-600">AIチャット</h2>
        <button
          onClick={handleClearHistory}
          className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
          title="履歴を削除"
        >
          <Trash2 size={18} />
        </button>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'model' && <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white flex-shrink-0"><Sparkles size={20} /></div>}
            <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${message.role === 'user' ? 'bg-blue-500 text-white rounded-br-lg' : 'bg-slate-200 text-slate-800 rounded-bl-lg'}`}>
              {/* 画像がある場合は表示 */}
              {message.imageUrl && (
                <img 
                  src={message.imageUrl} 
                  alt="送信した画像" 
                  className="max-w-full rounded-lg mb-2"
                />
              )}
              <p>
                {message.role === 'model' 
                 ? message.text.split(/([a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ0-9]+)/g).map((part, i) => {
                    const isWord = /^[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ0-9]+$/.test(part);
                    if (isWord) {
                        return (
                            <span 
                                key={i} 
                                onClick={() => handleWordClick(part, message.text, message.translation, message.segments)} 
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
                 })
                 : message.text
                }
              </p>
              {message.role === 'model' && message.translation && (
                  <p className="mt-2 text-sm text-slate-500 border-t border-slate-300 pt-1">
                      {message.translation}
                  </p>
              )}
              {message.role === 'user' && message.correction && (
                <div className={`mt-2 p-2 rounded-lg text-sm ${message.correction.isCorrect ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {message.correction.isCorrect ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle size={16} />
                      <span>Correct!</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 font-semibold">
                         <AlertCircle size={16} />
                         <span>Correction</span>
                      </div>
                      <p className="font-mono">{message.correction.correctedSentence}</p>
                      <p className="text-xs mt-1">{message.correction.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex items-end gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white flex-shrink-0"><Sparkles size={20} /></div>
                <div className="max-w-xs p-3 rounded-2xl bg-slate-200 rounded-bl-lg">
                    <div className="flex items-center gap-2 text-slate-500">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* 画像プレビュー */}
      {selectedImage && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-start gap-3">
            <img 
              src={selectedImage} 
              alt="プレビュー" 
              className="w-24 h-24 object-cover rounded-lg"
            />
            <div className="flex flex-col gap-2 flex-grow">
              <p className="text-sm text-slate-600">この画像を送信しますか？</p>
              <div className="flex gap-2">
                <button 
                  onClick={handleImageSend}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors text-sm"
                >
                  送信
                </button>
                <button 
                  onClick={handleCancelImage}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-slate-200">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* カメラボタン */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            ref={fileInputRef}
            className="hidden"
            id="camera-input"
          />
          <label 
            htmlFor="camera-input"
            className="bg-slate-100 text-slate-600 p-3 rounded-full hover:bg-slate-200 cursor-pointer transition-colors"
          >
            <Camera size={20} />
          </label>
          
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="ハンガリー語でメッセージを入力..."
            className="flex-grow p-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            disabled={isLoading}
          />
          <button type="submit" className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:bg-slate-400 transition-colors" disabled={isLoading || !userInput.trim()}>
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* 単語追加モーダル */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50 rounded-xl">
            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-800">単語を追加: {selectedWord}</h3>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">日本語の意味</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={japaneseMeaning}
                            onChange={(e) => setJapaneseMeaning(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none pr-8"
                            placeholder={isTranslating ? "翻訳中..." : "例: りんご"}
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
                    <label className="block text-sm font-medium text-slate-600 mb-1">例文 (自動抽出)</label>
                    <textarea 
                        value={exampleSentence}
                        onChange={(e) => setExampleSentence(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        rows={2}
                        placeholder="例文を入力..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">例文の意味 (日本語)</label>
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

export default Chat;
