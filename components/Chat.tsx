
import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse, getGrammarCorrection } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Send, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { useWordBank } from '../hooks/useWordBank';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addNewWord } = useWordBank();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
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
    const aiResponseText = await getChatResponse(messages, correctedSentence);

    const aiMessage: ChatMessage = {
      id: `model-${Date.now()}`,
      role: 'model',
      text: aiResponseText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsLoading(false);
  };
  
  /* モーダル用State */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [japaneseMeaning, setJapaneseMeaning] = useState('');

  const handleWordClick = (word: string) => {
    const cleanedWord = word.replace(/[.,!?]/g, '').toLowerCase();
    if (!cleanedWord) return;
    
    setSelectedWord(cleanedWord);
    setJapaneseMeaning(''); // リセット
    setIsModalOpen(true);
  };

  const handleSaveWord = () => {
    if (selectedWord && japaneseMeaning) {
        addNewWord(selectedWord, japaneseMeaning);
        setIsModalOpen(false);
        // 成功メッセージなどを表示しても良いが、今回はシンプルに閉じる
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-white rounded-xl shadow-lg border border-slate-200 relative">
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'model' && <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white flex-shrink-0"><Sparkles size={20} /></div>}
            <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${message.role === 'user' ? 'bg-blue-500 text-white rounded-br-lg' : 'bg-slate-200 text-slate-800 rounded-bl-lg'}`}>
              <p>
                {message.role === 'model' 
                 ? message.text.split(' ').map((word, i) => (
                    <span 
                        key={i} 
                        onClick={() => handleWordClick(word)} 
                        className="cursor-pointer hover:bg-yellow-200 rounded px-1 py-0.5 inline-block"
                        role="button"
                        tabIndex={0}
                    >
                        {word}{' '}
                    </span>
                 ))
                 : message.text
                }
              </p>
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
      <div className="p-4 border-t border-slate-200">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
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
                    <input 
                        type="text" 
                        value={japaneseMeaning}
                        onChange={(e) => setJapaneseMeaning(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="例: りんご"
                        autoFocus
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
                        disabled={!japaneseMeaning.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
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
