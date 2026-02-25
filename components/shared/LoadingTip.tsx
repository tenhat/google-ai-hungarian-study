import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

const TIPS = [
  "レベル診断を行うと、翻訳時にそのレベルの次のレベルの単語を中心に利用するようになります。"
];

interface LoadingTipProps {
  className?: string;
}

export const LoadingTip: React.FC<LoadingTipProps> = ({ className = "" }) => {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  if (!tip) return null;

  return (
    <div className={`mt-3 p-3 bg-indigo-50 text-indigo-800 text-sm rounded-lg flex items-start gap-2 animate-fade-in border border-indigo-100 shadow-sm ${className}`}>
      <Sparkles size={16} className="mt-0.5 shrink-0 text-indigo-500" />
      <p className="font-medium leading-relaxed">{tip}</p>
    </div>
  );
};
