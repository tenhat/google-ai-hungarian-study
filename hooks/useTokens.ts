import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserTokens, FREE_TOKEN_WEEKLY_LIMIT } from '../types';

// 現在の日付を "YYYY-MM-DD" 形式で取得
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// トークン情報のデフォルト値
const DEFAULT_TOKENS: UserTokens = {
  freeTokens: FREE_TOKEN_WEEKLY_LIMIT,
  paidTokens: 0,
  lastResetDate: getCurrentDateString(),
  totalUsed: 0,
};

interface TokenContextType {
  tokens: UserTokens;
  loading: boolean;
  hasEnoughTokens: (cost: number) => boolean;
  consumeTokens: (cost: number) => Promise<boolean>;
  totalRemaining: number;
  daysUntilReset: number; // 次回リセットまでの日数
  nextResetDate: Date;    // 次回リセット日
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

// 次回リセット日と残り日数の計算
export const calculateResetInfo = (lastResetDateStr: string, now: Date = new Date()) => {
  const lastReset = new Date(lastResetDateStr);
  
  // 日付が無効な場合は今日を基準にする
  if (isNaN(lastReset.getTime())) {
    const nextReset = new Date(now);
    nextReset.setDate(now.getDate() + 7);
    return { nextResetDate: nextReset, daysUntilReset: 7 };
  }

  const nextReset = new Date(lastReset);
  nextReset.setDate(nextReset.getDate() + 7);
  
  // 日付部分だけで比較するために時間をリセット
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextResetDay = new Date(nextReset.getFullYear(), nextReset.getMonth(), nextReset.getDate());
  
  const diffTime = nextResetDay.getTime() - today.getTime();
  const daysUntilReset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // 期限切れの場合は0日（即時リセット対象だが、表示上は0）
  return { nextResetDate: nextReset, daysUntilReset: Math.max(0, daysUntilReset) };
};

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<UserTokens>(DEFAULT_TOKENS);
  const [loading, setLoading] = useState(true);



  const { nextResetDate, daysUntilReset } = calculateResetInfo(tokens.lastResetDate);

  // Firestoreからトークン情報を読み込み
  useEffect(() => {
    if (!user) {
      setTokens(DEFAULT_TOKENS);
      setLoading(false);
      return;
    }

    const loadTokens = async () => {
      try {
        const tokenDocRef = doc(db, 'users', user.uid);
        const tokenDoc = await getDoc(tokenDocRef);

        if (tokenDoc.exists()) {
          const data = tokenDoc.data();
          if (data.tokens) {
            let loadedTokens: UserTokens = data.tokens;
            let needsUpdate = false;
            
            // 旧形式 (YYYY-MM) からの移行チェック
            // YYYY-MM は7文字、YYYY-MM-DD は10文字
            if (loadedTokens.lastResetDate.length === 7) {
              // 月次管理だったデータを強制的に今日リセット扱いに更新して、週次サイクルを開始する
              loadedTokens = {
                ...loadedTokens,
                freeTokens: FREE_TOKEN_WEEKLY_LIMIT,
                lastResetDate: getCurrentDateString(),
              };
              needsUpdate = true;
            } else {
              // 週次リセットチェック
              const lastReset = new Date(loadedTokens.lastResetDate);
              const now = new Date();
              const diffTime = now.getTime() - lastReset.getTime();
              const diffDays = diffTime / (1000 * 60 * 60 * 24);

              // 7日以上経過していたらリセット
              if (diffDays >= 7) {
                loadedTokens = {
                  ...loadedTokens,
                  freeTokens: FREE_TOKEN_WEEKLY_LIMIT,
                  lastResetDate: getCurrentDateString(),
                };
                needsUpdate = true;
              }
            }

            if (needsUpdate) {
              await setDoc(tokenDocRef, { tokens: loadedTokens }, { merge: true });
            }

            setTokens(loadedTokens);
          } else {
            // トークンフィールドが存在しない場合、デフォルトで初期化
            await setDoc(tokenDocRef, { tokens: DEFAULT_TOKENS }, { merge: true });
            setTokens(DEFAULT_TOKENS);
          }
        } else {
          // ドキュメント自体が存在しない場合
          await setDoc(tokenDocRef, { tokens: DEFAULT_TOKENS }, { merge: true });
          setTokens(DEFAULT_TOKENS);
        }
      } catch (error) {
        console.error('トークン情報の読み込みに失敗:', error);
        setTokens(DEFAULT_TOKENS);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, [user]);

  // 残高チェック
  const hasEnoughTokens = useCallback((cost: number): boolean => {
    return (tokens.freeTokens + tokens.paidTokens) >= cost;
  }, [tokens]);

  // トークン消費（無料→有料の優先順）
  const consumeTokens = useCallback(async (cost: number): Promise<boolean> => {
    if (!user) return false;
    if (!hasEnoughTokens(cost)) return false;

    let newFree = tokens.freeTokens;
    let newPaid = tokens.paidTokens;

    // 無料トークンから先に消費
    if (newFree >= cost) {
      newFree -= cost;
    } else {
      // 無料が足りない場合、残りを有料から引く
      const remaining = cost - newFree;
      newFree = 0;
      newPaid -= remaining;
    }

    const newTokens: UserTokens = {
      freeTokens: newFree,
      paidTokens: newPaid,
      lastResetDate: tokens.lastResetDate,
      totalUsed: tokens.totalUsed + cost,
    };

    setTokens(newTokens);

    // Firestoreに同期
    try {
      const tokenDocRef = doc(db, 'users', user.uid);
      await setDoc(tokenDocRef, { tokens: newTokens }, { merge: true });
    } catch (error) {
      console.error('トークン残高の更新に失敗:', error);
    }

    return true;
  }, [user, tokens, hasEnoughTokens]);

  // 合計残高
  const totalRemaining = tokens.freeTokens + tokens.paidTokens;

  return React.createElement(
    TokenContext.Provider,
    { value: { tokens, loading, hasEnoughTokens, consumeTokens, totalRemaining, daysUntilReset, nextResetDate } },
    children
  );
};

export const useTokens = () => {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useTokens must be used within a TokenProvider');
  }
  return context;
};

