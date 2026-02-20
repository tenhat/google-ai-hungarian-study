import React, { useState } from 'react';
import { BookMarked, LogIn, LogOut, User, Globe, Coins, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTokens } from '../../hooks/useTokens';
import PomodoroTimer from './PomodoroTimer';

const Header: React.FC = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const { totalRemaining, loading: tokensLoading, daysUntilReset } = useTokens();
  const { t, i18n } = useTranslation();
  const [showTokenDetails, setShowTokenDetails] = useState(false);

  const toggleLanguage = () => {
    const currentLang = i18n.language;
    // i18next might return 'ja-JP' or 'en-US', so simple check or startswith
    const newLang = currentLang.startsWith('en') ? 'ja' : 'en';
    i18n.changeLanguage(newLang);
  };

  const toggleTokenDetails = () => {
    setShowTokenDetails(!showTokenDetails);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <BookMarked className="text-blue-600" size={32} />
            <h1 className="text-xl font-bold text-slate-800">{t('home.title')}</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <PomodoroTimer />
            
            <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1 p-2 text-slate-500 hover:text-blue-600 transition-colors rounded-lg hover:bg-slate-50 hidden md:flex"
                title="Switch Language"
            >
                <Globe size={20} />
                <span className="text-sm font-medium uppercase">{i18n.language.startsWith('en') ? 'EN' : 'JA'}</span>
            </button>

            {user ? (
                <div className="flex items-center gap-3 relative">
                    {!tokensLoading && (
                        <>
                            <button 
                                onClick={toggleTokenDetails}
                                className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full mr-1 shadow-sm border border-amber-200 hover:bg-amber-200 transition-colors hidden sm:flex"
                            >
                                <Coins size={16} className="fill-amber-500 text-amber-600" />
                                <span className="text-sm font-bold min-w-[1.5rem] text-center">{totalRemaining}</span>
                            </button>

                            {showTokenDetails && (
                                <>
                                    <div className="fixed inset-0 z-10 cursor-default" onClick={() => setShowTokenDetails(false)} />
                                    <div className="absolute top-12 right-0 z-20 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 p-5 animate-in fade-in zoom-in-95 duration-200 cursor-default">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-slate-800">{t('tokens.popoverTitle')}</h3>
                                            <button onClick={() => setShowTokenDetails(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-slate-600 text-sm">{t('tokens.remaining')}</span>
                                            <span className="font-bold text-amber-600 text-lg">{totalRemaining} <span className="text-sm font-normal text-slate-400">/ 100</span></span>
                                        </div>
                                        <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <p className="mb-1 leading-relaxed">{t('tokens.weeklyReset')}</p>
                                            <p className="font-medium text-indigo-600 flex items-center gap-1.5">
                                                <Coins size={14} />
                                                {t('tokens.daysRemaining', { days: daysUntilReset })}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                    <div className="flex items-center gap-2">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-slate-200" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                <User size={20} />
                            </div>
                        )}
                        <span className="text-sm text-slate-600 font-medium hidden lg:block">{user.displayName}</span>
                    </div>
                    <button 
                        onClick={logout} 
                        className="text-slate-500 hover:text-red-500 transition-colors hidden sm:block"
                        title="ログアウト"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={signInWithGoogle}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <LogIn size={18} />
                    <span className="hidden sm:inline">Googleでログイン</span>
                </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
