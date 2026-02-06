
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
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック (10MB制限 - リサイズ前)
    if (file.size > 10 * 1024 * 1024) {
      alert('画像サイズが大きすぎます。10MB以下の画像を選択してください。');
      return;
    }

    try {
      // 画像をリサイズ・圧縮してbase64に変換
      const resizedDataUrl = await resizeImage(file, 800, 0.7);
      setSelectedImage(resizedDataUrl);
      setImageMimeType('image/jpeg'); // リサイズ後は常にJPEG
    } catch (error) {
      console.error('Error resizing image:', error);
      alert('画像の処理に失敗しました。別の画像をお試しください。');
    }
  };

  // 画像リサイズ・圧縮関数
  const resizeImage = (file: File, maxSize: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // アスペクト比を維持してリサイズ
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // JPEG形式で圧縮してbase64に変換
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      
      // FileReaderで画像を読み込み
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // 画像送信処理
  const handleImageSend = async () => {
    if (!selectedImage || isLoading) return;

    // base64データ部分を抽出（data:image/jpeg;base64, を除去）
    const base64Data = selectedImage.split(',')[1];
    // MIMEタイプをローカル変数に保持（ステートクリア前に取得）
    const mimeType = imageMimeType || 'image/jpeg';
    
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
      // ローカル変数のmimeTypeを使用
      const { text: aiResponseText, translation, segments } = await getImageChatResponse(base64Data, mimeType);

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
            // Even if a segment is found, it might contain multiple sentences.
            // We verify by trying to extract a more specific sentence from the segment text.
            const refinedSentence = extractSentence(matchingSegment.hungarian, cleanedWord);
            
            extractedSentence = refinedSentence || matchingSegment.hungarian.trim();
            extractedTranslation = matchingSegment.japanese.trim();
        }
    } 
    
    // 2. Fallback to heuristic extraction if segments failed or missing
    if (!extractedSentence) {
        extractedSentence = extractSentence(fullText, cleanedWord);
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
    <div className="flex flex-col h-full max-h-[80vh] bg-white rounded-2xl shadow-xl border border-slate-200 relative animate-fade-in overflow-hidden">
      {/* ヘッダーバー */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md animate-pulse-subtle">
                <Sparkles size={16} />
            </div>
            <h2 className="text-lg font-bold text-slate-700 tracking-tight">AI Chat Partner</h2>
        </div>
        <button
          onClick={handleClearHistory}
          className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all duration-300"
          title="履歴を削除"
        >
          <Trash2 size={18} />
        </button>
      </div>
      
      <div className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60 animate-fade-in">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Sparkles size={32} className="text-slate-300" />
                </div>
                <p className="text-sm font-medium">会話を始めましょう (Kezdjünk beszélgetni!)</p>
            </div>
        )}
        {messages.map((message, index) => (
          <div 
            key={message.id} 
            className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {message.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md transform translate-y-[-4px]">
                    <Sparkles size={16} />
                </div>
            )}
            <div className={`max-w-[85%] md:max-w-md lg:max-w-lg p-4 rounded-2xl shadow-sm transition-all hover:shadow-md ${
                message.role === 'user' 
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm' 
                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'
            }`}>
              {/* 画像がある場合は表示 */}
              {message.imageUrl && (
                <div className="mb-3 overflow-hidden rounded-lg border border-white/20">
                    <img 
                    src={message.imageUrl} 
                    alt="送信した画像" 
                    className="max-w-full w-full h-auto object-cover transform hover:scale-105 transition-transform duration-500"
                    />
                </div>
              )}
              <p className="leading-relaxed text-[15px]">
                {message.role === 'model' 
                 ? message.text.split(/([a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ0-9]+)/g).map((part, i) => {
                    const isWord = /^[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ0-9]+$/.test(part);
                    if (isWord) {
                        return (
                            <span 
                                key={i} 
                                onClick={() => handleWordClick(part, message.text, message.translation, message.segments)} 
                                className="cursor-pointer hover:bg-yellow-200/50 hover:text-yellow-700 rounded px-0.5 inline-block transition-colors duration-200 border-b border-transparent hover:border-yellow-400"
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
                  <p className="mt-3 text-sm text-slate-500 border-t border-slate-100 pt-2 flex items-start gap-2">
                      <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider mt-0.5">JP</span>
                      <span className="opacity-90">{message.translation}</span>
                  </p>
              )}
              {message.role === 'user' && message.correction && (
                <div className={`mt-3 p-3 rounded-xl text-sm border ${message.correction.isCorrect ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>
                  {message.correction.isCorrect ? (
                    <div className="flex items-center gap-2 font-medium">
                      <div className="bg-emerald-100 p-1 rounded-full"><CheckCircle size={14} className="text-emerald-600" /></div>
                      <span>自然で正確な表現です！</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
					  <div className="flex items-center gap-2 font-medium border-b border-amber-100 pb-2 mb-1">
                         <div className="bg-amber-100 p-1 rounded-full"><AlertCircle size={14} className="text-amber-600" /></div>
                         <span>より良い表現があります</span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium flex items-center gap-2 text-amber-900">
                            <span className="text-xs bg-amber-200 px-1.5 rounded text-amber-800">改善案</span>
                            {message.correction.correctedSentence}
                        </p>
                        <p className="text-xs opacity-90 pl-1 border-l-2 border-amber-200">{message.correction.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex items-end gap-2 justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                    <Sparkles size={16} className="animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm rounded-bl-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-medium">考え中...</p>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* 画像プレビュー */}
      {selectedImage && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 backdrop-blur-sm animate-slide-up">
          <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative group">
                <img 
                src={selectedImage} 
                alt="プレビュー" 
                className="w-20 h-20 object-cover rounded-lg border border-slate-100"
                />
                <div className="absolute inset-0 bg-black/10 rounded-lg group-hover:bg-black/20 transition-colors" />
            </div>
            
            <div className="flex flex-col gap-2 flex-grow justify-center">
              <p className="text-sm font-medium text-slate-700">この画像を送信しますか？</p>
              <div className="flex gap-2">
                <button 
                  onClick={handleImageSend}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none transition-all text-sm font-bold flex items-center gap-1"
                >
                  <Send size={14} /> 送信
                </button>
                <button 
                  onClick={handleCancelImage}
                  className="px-4 py-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-slate-100 bg-white z-20">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
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
            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95"
            title="画像をアップロード"
          >
            <Camera size={22} />
          </label>
          
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="ハンガリー語でメッセージを入力..."
            className="flex-grow p-3 bg-slate-50 border-transparent focus:bg-white border focus:border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-50/50 focus:outline-none transition-all placeholder:text-slate-400 text-slate-700"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className={`p-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center
                ${!userInput.trim() || isLoading ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-200 hover:shadow-blue-300'}
            `}
            disabled={isLoading || !userInput.trim()}
          >
            <Send size={20} className={userInput.trim() && !isLoading ? 'animate-pulse-subtle' : ''}/>
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
