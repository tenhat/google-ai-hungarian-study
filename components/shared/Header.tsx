
import React from 'react';
import { BookMarked } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        <BookMarked className="text-blue-600" size={32} />
        <h1 className="text-xl font-bold text-slate-800">
          Hungarian Study <span className="text-blue-600">Tenju</span>
        </h1>
      </div>
    </header>
  );
};

export default Header;
