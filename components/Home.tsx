
import React from 'react';
import { View } from '../types';
import { useWordBank } from '../hooks/useWordBank';
import { BrainCircuit, MessageSquare, CheckCircle, Clock, Star, Loader } from 'lucide-react';

interface HomeProps {
  setCurrentView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ setCurrentView }) => {
  const { getStats, getWordsForQuiz, loading } = useWordBank();
  const stats = getStats();
  const dueWordsCount = getWordsForQuiz(100).length; // Get all due words

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center p-4">
        <Loader className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 mt-4 font-medium">Loading your progress...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col justify-center items-center p-4 space-y-8 animate-fade-in">
      <div className="text-center animate-slide-up">
        <h2 className="text-3xl font-bold text-slate-800">Üdvözöljük!</h2>
        <p className="text-slate-500 mt-2">Welcome to your Hungarian learning dashboard.</p>
      </div>

      <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-xl border border-slate-100 space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <h3 className="text-lg font-bold text-center text-slate-700 border-b pb-2">学習状況</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <StatCard icon={<Star size={24} className="text-yellow-500" />} label="New" value={stats.newCount} delay="200ms" />
          <StatCard icon={<Clock size={24} className="text-orange-500" />} label="Learning" value={stats.learningCount} delay="300ms" />
          <StatCard icon={<CheckCircle size={24} className="text-green-500" />} label="Mastered" value={stats.masteredCount} delay="400ms" />
        </div>
      </div>

      <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionButton
          icon={<BrainCircuit size={32} />}
          title="単語クイズ"
          subtitle={`${dueWordsCount} words to review`}
          onClick={() => setCurrentView(View.Quiz)}
          className="bg-gradient-to-br from-blue-600 to-indigo-600 hover:shadow-blue-200"
          badge={dueWordsCount > 0 ? dueWordsCount.toString() : undefined}
          delay="500ms"
        />
        <ActionButton
          icon={<MessageSquare size={32} />}
          title="AIチャット"
          subtitle="Practice speaking"
          onClick={() => setCurrentView(View.Chat)}
          className="bg-gradient-to-br from-purple-600 to-fuchsia-600 hover:shadow-purple-200"
          delay="600ms"
        />
      </div>
    </div>
  );
};

// 統計カードコンポーネント (アニメーション対応)
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    delay?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, delay }) => (
    <div 
      className="flex flex-col items-center p-2 rounded-lg hover:bg-slate-50 transition-colors animate-slide-up"
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
