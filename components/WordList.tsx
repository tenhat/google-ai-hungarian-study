import React, { useState } from 'react';
import { Word, WordStatus } from '../types';
import { useWordBank } from '../hooks/useWordBank';
import { X, Edit2, Save, Volume2, Trash2, Check, RefreshCw } from 'lucide-react';

interface WordListProps {
  status: WordStatus;
  onClose: () => void;
}
// カラーマップ定義
const statusColors = {
    [WordStatus.New]: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    [WordStatus.Learning]: 'text-orange-600 bg-orange-50 border-orange-200',
    [WordStatus.Mastered]: 'text-green-600 bg-green-50 border-green-200',
};

const statusLabels = {
    [WordStatus.New]: '未習得の単語',
    [WordStatus.Learning]: '学習中',
    [WordStatus.Mastered]: '習得済み',
};

const WordList: React.FC<WordListProps> = ({ status, onClose }) => {
  const { words, progress, updateWord, deleteWord, markAsMastered, markAsLearning } = useWordBank();
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [deletingWord, setDeletingWord] = useState<Word | null>(null);

  // フィルタリング
  const filteredWords = words.filter(word => {
      const p = progress.get(word.id);
      return p && p.status === status;
  });

  // 編集用ステート
  const [editForm, setEditForm] = useState<{
      japanese: string;
      exampleSentence: string;
      exampleTranslation: string;
  }>({ japanese: '', exampleSentence: '', exampleTranslation: '' });

  const handleEditClick = (word: Word) => {
      setEditingWord(word);
      setEditForm({
          japanese: word.japanese,
          exampleSentence: word.example?.sentence || '',
          exampleTranslation: word.example?.translation || ''
      });
  };

  const handleSave = () => {
      if (!editingWord) return;
      
      const updatedWord: Word = {
          ...editingWord,
          japanese: editForm.japanese,
          example: (editForm.exampleSentence || editForm.exampleTranslation) ? {
              sentence: editForm.exampleSentence,
              translation: editForm.exampleTranslation
          } : undefined
      };
      
      updateWord(updatedWord);
      setEditingWord(null);
  };

  const playAudio = (text: string) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hu-HU';
      window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Header */}
            <div className={`p-4 border-b flex justify-between items-center ${statusColors[status].split(' ')[1]}`}>
                <h3 className={`text-xl font-bold ${statusColors[status].split(' ')[0]}`}>
                    {statusLabels[status]} ({filteredWords.length})
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                    <X size={24} className="text-slate-600" />
                </button>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredWords.length === 0 ? (
                    <div className="text-center text-slate-400 py-10">
                        <p>このカテゴリーにはまだ単語がありません。</p>
                    </div>
                ) : (
                    filteredWords.map(word => (
                        <div key={word.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-lg font-bold text-slate-800">{word.hungarian}</h4>
                                        <button onClick={() => playAudio(word.hungarian)} className="text-slate-400 hover:text-blue-500">
                                            <Volume2 size={16} />
                                        </button>
                                    </div>
                                    <p className="text-slate-600">{word.japanese}</p>
                                </div>
                                <button 
                                    onClick={() => handleEditClick(word)}
                                    className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                                {status === WordStatus.Learning && (
                                    <button
                                        onClick={() => markAsMastered(word.id)}
                                        className="text-slate-400 hover:text-green-600 p-2 hover:bg-green-50 rounded-lg transition-colors ml-1"
                                        title="Mark as Mastered"
                                    >
                                        <Check size={18} />
                                    </button>
                                )}
                                {status === WordStatus.Mastered && (
                                    <button
                                        onClick={() => markAsLearning(word.id)}
                                        className="text-slate-400 hover:text-orange-600 p-2 hover:bg-orange-50 rounded-lg transition-colors ml-1"
                                        title="学習中に戻す"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => setDeletingWord(word)}
                                    className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors ml-1"
                                    title="Delete word"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            {word.example && (
                                <div className="mt-2 pt-2 border-t border-slate-100 text-sm">
                                    <p className="text-slate-700 italic">"{word.example.sentence}"</p>
                                    <p className="text-slate-500 text-xs mt-0.5">{word.example.translation}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deletingWord && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                 <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-scale-in">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Trash2 className="text-red-500" size={24} />
                        </div>
                        <h4 className="text-lg font-bold text-slate-800">単語を削除しますか？</h4>
                        <p className="text-slate-600 mt-2">
                            本当に <span className="font-bold text-slate-800">"{deletingWord.hungarian}"</span> を削除してもよろしいですか？
                            この操作は取り消せません。
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={() => setDeletingWord(null)}
                            className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        >
                            キャンセル
                        </button>
                        <button 
                            onClick={() => {
                                deleteWord(deletingWord.id);
                                setDeletingWord(null);
                            }}
                            className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-md transition-colors font-medium"
                        >
                            削除
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Modal (Overlay) */}
        {editingWord && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-scale-in">
                    <h4 className="text-lg font-bold text-slate-800 border-b pb-2">
                        編集: <span className="text-blue-600">{editingWord.hungarian}</span>
                    </h4>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">日本語訳</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={editForm.japanese}
                            onChange={(e) => setEditForm({...editForm, japanese: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">例文 (ハンガリー語)</label>
                        <textarea 
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            rows={2}
                            value={editForm.exampleSentence}
                            onChange={(e) => setEditForm({...editForm, exampleSentence: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">例文の意味 (日本語)</label>
                        <textarea 
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            rows={2}
                            value={editForm.exampleTranslation}
                            onChange={(e) => setEditForm({...editForm, exampleTranslation: e.target.value})}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button 
                            onClick={() => setEditingWord(null)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            キャンセル
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 transition-colors"
                        >
                            <Save size={16} /> 保存
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default WordList;
