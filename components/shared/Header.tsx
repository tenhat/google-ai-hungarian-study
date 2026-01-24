import React from 'react';
import { BookMarked, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, signInWithGoogle, logout } = useAuth();

  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <BookMarked className="text-blue-600" size={32} />
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">
            Hungarian Study <span className="text-blue-600">Tenju</span>
            </h1>
        </div>
        
        <div className="flex items-center gap-4">
            {user ? (
                <div className="flex items-center gap-3">
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
