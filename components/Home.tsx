
import React, { useState } from 'react';
import { View, WordStatus } from '../types';
import { useWordBank } from '../hooks/useWordBank';
import { BrainCircuit, MessageSquare, CheckCircle, Clock, Star, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import WordList from './WordList';

interface HomeProps {
  setCurrentView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ setCurrentView }) => {
  const { t } = useTranslation();
  const { getStats, getWordsForQuiz, loading, quizSessionSize, setQuizSessionSize } = useWordBank();
  const [selectedStatus, setSelectedStatus] = useState<WordStatus | null>(null);
  
  const stats = getStats();
  const dueWordsCount = getWordsForQuiz(100).length; // Get all due words

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center p-4">
        <Loader className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 mt-4 font-medium">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col justify-center items-center p-4 space-y-8 animate-fade-in relative">
      <div className="text-center animate-slide-up">
        <h2 className="text-3xl font-bold text-slate-800">Üdvözöljük!</h2>
        <p className="text-slate-500 mt-2">{t('home.title')}</p>
      </div>

      <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-xl border border-slate-100 space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <h3 className="text-lg font-bold text-center text-slate-700 border-b pb-2">{t('review.progress')}</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <StatCard 
            icon={<Star size={24} className="text-yellow-500" />} 
            label={t('home.new')}
            value={stats.newCount} 
            delay="200ms" 
            onClick={() => setSelectedStatus(WordStatus.New)}
          />
          <StatCard 
            icon={<Clock size={24} className="text-orange-500" />} 
            label={t('home.learning')}
            value={stats.learningCount} 
            delay="300ms" 
            onClick={() => setSelectedStatus(WordStatus.Learning)}
          />
          <StatCard 
            icon={<CheckCircle size={24} className="text-green-500" />} 
            label={t('home.mastered')}
            value={stats.masteredCount} 
            delay="400ms" 
            onClick={() => setSelectedStatus(WordStatus.Mastered)}
          />
        </div>
      </div>

      <div className="w-full max-w-md bg-white p-5 rounded-xl shadow-lg border border-slate-100 animate-slide-up" style={{ animationDelay: '150ms' }}>
        <p className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
          <BrainCircuit size={18} className="text-indigo-500" />
          {t('quiz.sessionSize')}
        </p>
        <div className="flex justify-between gap-2">
          {[5, 10, 20, 50].map((size) => (
            <button
              key={size}
              onClick={() => setQuizSessionSize(size)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all border-2 
                ${quizSessionSize === size 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105' 
                  : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 hover:border-slate-200'}`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>



      <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionButton
          icon={<BrainCircuit size={32} />}
          title={t('home.startQuiz')}
          subtitle={t('home.subtitle_quiz', { count: dueWordsCount }) || `${dueWordsCount} words due`}
          onClick={() => setCurrentView(View.Quiz)}
          className="bg-gradient-to-br from-blue-600 to-indigo-600 hover:shadow-blue-200"
          badge={dueWordsCount > 0 ? dueWordsCount.toString() : undefined}
          delay="500ms"
        />
        <ActionButton
          icon={<MessageSquare size={32} />}
          title={t('home.aiChat')}
          subtitle={t('home.subtitle_chat') || "Conversation Practice"}
          onClick={() => setCurrentView(View.Chat)}
          className="bg-gradient-to-br from-purple-600 to-fuchsia-600 hover:shadow-purple-200"
          delay="600ms"
        />
        <ActionButton
          icon={<BrainCircuit size={32} className="rotate-180" />}
          title={t('home.reviewChallenge')}
          subtitle={t('home.subtitle_review') || "Speed Quiz"}
          onClick={() => setCurrentView(View.ReviewChallenge)}
          className="bg-gradient-to-br from-orange-500 to-amber-500 hover:shadow-orange-200"
          delay="700ms"
        />
        <ActionButton
          icon={<Clock size={32} />}
          title={t('home.listeningMode')}
          subtitle={t('home.subtitle_listening') || "Auto Playback"}
          onClick={() => setCurrentView(View.ListeningMode)}
          className="bg-gradient-to-br from-teal-500 to-emerald-500 hover:shadow-teal-200"
          delay="800ms"
        />
      </div>

      {selectedStatus && (
        <WordList status={selectedStatus} onClose={() => setSelectedStatus(null)} />
      )}
    </div>
  );
};

// 統計カードコンポーネント (アニメーション対応)
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    delay?: string;
    onClick: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, delay, onClick }) => (
    <div 
      onClick={onClick}
      className="flex flex-col items-center p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-slide-up"
      style={{ animationDelay: delay, animationFillMode: 'backwards' }}
    >
        {icon}
        <span className="text-2xl font-bold text-slate-800 mt-1">{value}</span>
        <span className="text-sm text-slate-500">{label}</span>
    </div>
);


interface ActionButtonProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  className: string; // グラデーションクラスを受け取る
  badge?: string;
  delay?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, title, subtitle, onClick, className, badge, delay }) => (
  <button
    onClick={onClick}
    className={`relative text-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:-translate-y-1 animate-scale-in ${className}`}
    style={{ animationDelay: delay, animationFillMode: 'backwards' }}
  >
    {badge && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md animate-pulse-subtle">
        {badge}
      </span>
    )}
    <div className="mb-3 p-3 bg-white/20 rounded-full backdrop-blur-sm">{icon}</div>
    <h3 className="text-xl font-bold tracking-tight">{title}</h3>
    <p className="text-sm opacity-90 font-medium mt-1">{subtitle}</p>
  </button>
);

export default Home;
