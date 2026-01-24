
import React from 'react';
import { View } from '../types';
import { useWordBank } from '../hooks/useWordBank';
import { BrainCircuit, MessageSquare, CheckCircle, Clock, Star } from 'lucide-react';

interface HomeProps {
  setCurrentView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ setCurrentView }) => {
  const { getStats, getWordsForQuiz } = useWordBank();
  const stats = getStats();
  const dueWordsCount = getWordsForQuiz(100).length; // Get all due words

  return (
    <div className="flex-grow flex flex-col justify-center items-center p-4 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800">Üdvözöljük!</h2>
        <p className="text-slate-500 mt-2">Welcome to your Hungarian learning dashboard.</p>
      </div>

      <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-4">
        <h3 className="text-lg font-bold text-center text-slate-700 border-b pb-2">学習状況</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <StatCard icon={<Star size={24} className="text-yellow-500" />} label="New" value={stats.newCount} />
          <StatCard icon={<Clock size={24} className="text-orange-500" />} label="Learning" value={stats.learningCount} />
          <StatCard icon={<CheckCircle size={24} className="text-green-500" />} label="Mastered" value={stats.masteredCount} />
        </div>
      </div>

      <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionButton
          icon={<BrainCircuit size={32} />}
          title="単語クイズ"
          subtitle={`${dueWordsCount} words to review`}
          onClick={() => setCurrentView(View.Quiz)}
          className="bg-blue-600 hover:bg-blue-700"
          badge={dueWordsCount > 0 ? dueWordsCount.toString() : undefined}
        />
        <ActionButton
          icon={<MessageSquare size={32} />}
          title="AIチャット"
          subtitle="Practice speaking"
          onClick={() => setCurrentView(View.Chat)}
          className="bg-purple-600 hover:bg-purple-700"
        />
      </div>
    </div>
  );
};

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
    <div className="flex flex-col items-center">
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
  className: string;
  badge?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, title, subtitle, onClick, className, badge }) => (
  <button
    onClick={onClick}
    className={`relative text-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center transition-transform transform hover:scale-105 ${className}`}
  >
    {badge && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
        {badge}
      </span>
    )}
    <div className="mb-2">{icon}</div>
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-sm opacity-80">{subtitle}</p>
  </button>
);

export default Home;
