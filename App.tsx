import React, { useState } from 'react';
import Home from './components/Home';
import Quiz from './components/Quiz';
import Chat from './components/Chat';
import Translate from './components/Translate';
import ReviewChallenge from './components/ReviewChallenge';
import ListeningMode from './components/ListeningMode';
import { WordBankProvider } from './hooks/useWordBank';
import { View } from './types';
import Header from './components/shared/Header';
import { BrainCircuit, MessageSquare, HomeIcon, Languages, Target, Headphones } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<View>(View.Home);

  // ビュー切り替え時に画面上部にスクロール（iOS Safari対応）
  const handleViewChange = (view: View) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const renderView = () => {
    switch (currentView) {
      case View.Quiz:
        return <Quiz />;
      case View.Chat:
        return <Chat />;
      case View.Translate:
        return <Translate />;
      case View.ReviewChallenge:
        return <ReviewChallenge />;
      case View.ListeningMode:
        return <ListeningMode />;
      case View.Home:
      default:
        return <Home setCurrentView={handleViewChange} />;
    }
  };

  return (
    <AuthProvider>
      <WordBankProvider>
        <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto p-4 flex flex-col relative">
          <div key={currentView} className="flex-col flex flex-grow animate-fade-in">
            {renderView()}
          </div>
        </main>
        <nav className="sticky bottom-0 bg-white shadow-t border-t border-slate-200">
          <div className="container mx-auto flex justify-around p-2">
            <button
              onClick={() => handleViewChange(View.Home)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.Home ? 'text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <HomeIcon size={24} />
              <span className="text-xs font-medium">{t('nav.home')}</span>
            </button>
            <button
              onClick={() => handleViewChange(View.Quiz)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.Quiz ? 'text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <BrainCircuit size={24} />
              <span className="text-xs font-medium">{t('nav.quiz')}</span>
            </button>
            <button
              onClick={() => handleViewChange(View.ReviewChallenge)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.ReviewChallenge ? 'text-orange-500' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Target size={24} />
              <span className="text-xs font-medium">{t('nav.review')}</span>
            </button>
            <button
              onClick={() => handleViewChange(View.ListeningMode)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.ListeningMode ? 'text-teal-500' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Headphones size={24} />
              <span className="text-xs font-medium">{t('nav.listening')}</span>
            </button>
            <button
              onClick={() => handleViewChange(View.Translate)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.Translate ? 'text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Languages size={24} />
              <span className="text-xs font-medium">{t('nav.translate')}</span>
            </button>
            <button
              onClick={() => handleViewChange(View.Chat)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.Chat ? 'text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <MessageSquare size={24} />
              <span className="text-xs font-medium">{t('nav.chat')}</span>
            </button>
          </div>
        </nav>
      </div>
      </WordBankProvider>
    </AuthProvider>
  );
};

export default App;
