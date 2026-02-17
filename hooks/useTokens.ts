import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserTokens, FREE_TOKEN_MONTHLY_LIMIT } from '../types';

// トークン情報のデフォルト値
const DEFAULT_TOKENS: UserTokens = {
  freeTokens: FREE_TOKEN_MONTHLY_LIMIT,
  paidTokens: 0,
  lastResetDate: getCurrentYearMonth(),
  totalUsed: 0,
};

// 現在の年月を "YYYY-MM" 形式で取得
function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

interface TokenContextType {
  tokens: UserTokens;
  loading: boolean;
  hasEnoughTokens: (cost: number) => boolean;
  consumeTokens: (cost: number) => Promise<boolean>;
  totalRemaining: number;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<UserTokens>(DEFAULT_TOKENS);
  const [loading, setLoading] = useState(true);

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
            
            // 月初リセットチェック
            const currentMonth = getCurrentYearMonth();
            if (loadedTokens.lastResetDate !== currentMonth) {
              loadedTokens = {
                ...loadedTokens,
                freeTokens: FREE_TOKEN_MONTHLY_LIMIT,
                lastResetDate: currentMonth,
              };
              // Firestoreにリセット結果を保存
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
    { value: { tokens, loading, hasEnoughTokens, consumeTokens, totalRemaining } },
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
