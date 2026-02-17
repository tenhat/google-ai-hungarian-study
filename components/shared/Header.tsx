import React from 'react';
import { BookMarked, LogIn, LogOut, User, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTokens } from '../../hooks/useTokens';
import { Coins } from 'lucide-react';

const Header: React.FC = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const { totalRemaining, loading: tokensLoading } = useTokens();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const currentLang = i18n.language;
    // i18next might return 'ja-JP' or 'en-US', so simple check or startswith
    const newLang = currentLang.startsWith('en') ? 'ja' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <BookMarked className="text-blue-600" size={32} />
            <h1 className="text-xl font-bold text-slate-800">{t('home.title')}</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1 p-2 text-slate-500 hover:text-blue-600 transition-colors rounded-lg hover:bg-slate-50"
                title="Switch Language"
            >
                <Globe size={20} />
                <span className="text-sm font-medium uppercase">{i18n.language.startsWith('en') ? 'EN' : 'JA'}</span>
            </button>

            {user ? (
                <div className="flex items-center gap-3">
                    {!tokensLoading && (
                        <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full mr-1 shadow-sm border border-amber-200">
                            <Coins size={16} className="fill-amber-500 text-amber-600" />
                            <span className="text-sm font-bold min-w-[1.5rem] text-center">{totalRemaining}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-slate-200" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                <User size={20} />
                            </div>
                        )}
                        <span className="text-sm text-slate-600 font-medium hidden md:block">{user.displayName}</span>
                    </div>
                    <button 
                        onClick={logout} 
                        className="text-slate-500 hover:text-red-500 transition-colors"
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
                    <span>Googleでログイン</span>
                </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
