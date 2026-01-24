
import React, { useState } from 'react';
import Home from './components/Home';
import Quiz from './components/Quiz';
import Chat from './components/Chat';
import { WordBankProvider } from './hooks/useWordBank';
import { View } from './types';
import Header from './components/shared/Header';
import { BrainCircuit, MessageSquare, HomeIcon } from 'lucide-react';

import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Home);

  const renderView = () => {
    switch (currentView) {
      case View.Quiz:
        return <Quiz />;
      case View.Chat:
        return <Chat />;
      case View.Home:
      default:
        return <Home setCurrentView={setCurrentView} />;
    }
  };

  return (
    <AuthProvider>
      <WordBankProvider>
        <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto p-4 flex flex-col">
          {renderView()}
        </main>
        <nav className="sticky bottom-0 bg-white shadow-t border-t border-slate-200">
          <div className="container mx-auto flex justify-around p-2">
            <button
              onClick={() => setCurrentView(View.Home)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.Home ? 'text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <HomeIcon size={24} />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button
              onClick={() => setCurrentView(View.Quiz)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.Quiz ? 'text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <BrainCircuit size={24} />
              <span className="text-xs font-medium">Quiz</span>
            </button>
            <button
              onClick={() => setCurrentView(View.Chat)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.Chat ? 'text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <MessageSquare size={24} />
              <span className="text-xs font-medium">AI Chat</span>
            </button>
          </div>
        </nav>
      </div>
      </WordBankProvider>
    </AuthProvider>
  );
};

export default App;
