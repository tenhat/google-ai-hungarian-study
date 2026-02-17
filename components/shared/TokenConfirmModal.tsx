import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, AlertTriangle, X } from 'lucide-react';
import { useTokens } from '../../hooks/useTokens';

interface TokenConfirmModalProps {
  cost: number;
  featureName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const LOCAL_STORAGE_KEY_SKIP_CONFIRM = 'hungarian-study-tenju-skip-token-confirm';

// 確認スキップの設定をlocalStorageから読み取る
export function shouldSkipConfirm(): boolean {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY_SKIP_CONFIRM) === 'true';
  } catch {
    return false;
  }
}

const TokenConfirmModal: React.FC<TokenConfirmModalProps> = ({ cost, featureName, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const { tokens, totalRemaining, hasEnoughTokens } = useTokens();
  const [skipFuture, setSkipFuture] = useState(false);
  const insufficientTokens = !hasEnoughTokens(cost);

  const handleConfirm = () => {
    if (skipFuture) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_SKIP_CONFIRM, 'true');
      } catch { /* ignore */ }
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
        {/* ヘッダー */}
        <div className={`p-5 text-center ${insufficientTokens ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full mb-3 backdrop-blur-sm">
            {insufficientTokens ? <AlertTriangle size={28} className="text-white" /> : <Coins size={28} className="text-white" />}
          </div>
          <h3 className="text-lg font-bold text-white">
            {insufficientTokens ? t('tokens.insufficient') : t('tokens.confirmTitle')}
          </h3>
        </div>

        {/* コンテンツ */}
        <div className="p-5 space-y-4">
          {insufficientTokens ? (
            <p className="text-center text-slate-600 text-sm">
              {t('tokens.insufficientMessage')}
            </p>
          ) : (
            <>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{t('tokens.feature')}</span>
                  <span className="font-semibold text-slate-700">{featureName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{t('tokens.cost')}</span>
                  <span className="font-bold text-indigo-600">🪙 {cost}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm">
                  <span className="text-slate-500">{t('tokens.remaining')}</span>
                  <span className="font-semibold text-slate-700">
                    🪙 {tokens.freeTokens}
                    {tokens.paidTokens > 0 && <span className="text-amber-500 ml-1">(+{tokens.paidTokens})</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{t('tokens.afterUse')}</span>
                  <span className="font-semibold text-emerald-600">🪙 {totalRemaining - cost}</span>
                </div>
              </div>

              {/* 今後表示しないチェックボックス */}
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipFuture}
                  onChange={(e) => setSkipFuture(e.target.checked)}
                  className="rounded border-slate-300"
                />
                {t('tokens.dontShowAgain')}
              </label>
            </>
          )}
        </div>

        {/* ボタン */}
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            {t('tokens.cancel')}
          </button>
          {!insufficientTokens && (
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm hover:shadow-lg transition-all"
            >
              {t('tokens.confirm')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenConfirmModal;
