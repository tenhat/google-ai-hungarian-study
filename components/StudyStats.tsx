import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useStudyStats } from '../hooks/useStudyStats';
import { Clock, TrendingUp, Calendar } from 'lucide-react';

const StudyStats: React.FC = () => {
  const { stats, loading, error } = useStudyStats();

  const totalMinutes = useMemo(() => {
    return stats.reduce((sum, day) => sum + day.durationMinutes, 0);
  }, [stats]);

  const averageMinutes = useMemo(() => {
    if (stats.length === 0) return 0;
    return Math.round(totalMinutes / stats.length);
  }, [totalMinutes, stats]);

  // 最新の学習日（今日）の色をハイライトするため
  const getBarColor = (index: number) => {
    return index === stats.length - 1 ? '#3b82f6' : '#94a3b8'; // tailwind blue-500 / slate-400
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg m-4">
        データの取得に失敗しました。
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto bg-gray-50 min-h-full pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">学習の記録</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <Clock size={18} />
            <span className="text-sm font-medium">直近1週間の総学習時間</span>
          </div>
          <div className="text-3xl font-bold tracking-tight text-gray-800">
            {Math.floor(totalMinutes / 60)}<span className="text-lg font-normal text-gray-500 ml-1">時間</span>
            {totalMinutes % 60}<span className="text-lg font-normal text-gray-500 ml-1">分</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <TrendingUp size={18} />
            <span className="text-sm font-medium">1日あたりの平均</span>
          </div>
          <div className="text-3xl font-bold tracking-tight text-gray-800">
            {averageMinutes}<span className="text-lg font-normal text-gray-500 ml-1">分</span>
          </div>
        </div>
      </div>

      {/* グラフカード */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calendar size={18} className="text-blue-500" />
            学習推移 (過去7日間)
          </h2>
        </div>
        <div className="h-64 w-full">
          {stats.some(d => d.durationMinutes > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="dateStr" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  unit="分"
                />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value}分`, '学習時間']}
                  labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar 
                  dataKey="durationMinutes" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40}
                  animationDuration={1000}
                >
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
              <Clock size={32} className="opacity-50" />
              <p>まだ学習記録がありません</p>
              <p className="text-sm">タイマーを使って学習を始めましょう！</p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default StudyStats;
