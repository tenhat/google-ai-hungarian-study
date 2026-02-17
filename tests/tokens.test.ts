import { describe, it, expect } from 'vitest';
import { UserTokens, TOKEN_COSTS, FREE_TOKEN_MONTHLY_LIMIT } from '../types';

// getCurrentYearMonth ヘルパー (useTokens.ts と同じロジック)
function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// トークン消費ロジックの純粋関数テスト
// (useTokens.ts 内のロジックを抽出してテスト可能にする)
function consumeTokensLogic(
  tokens: UserTokens,
  cost: number
): { success: boolean; newTokens: UserTokens } {
  const total = tokens.freeTokens + tokens.paidTokens;
  if (total < cost) {
    return { success: false, newTokens: tokens };
  }

  let newFree = tokens.freeTokens;
  let newPaid = tokens.paidTokens;

  if (newFree >= cost) {
    newFree -= cost;
  } else {
    const remaining = cost - newFree;
    newFree = 0;
    newPaid -= remaining;
  }

  return {
    success: true,
    newTokens: {
      freeTokens: newFree,
      paidTokens: newPaid,
      lastResetDate: tokens.lastResetDate,
      totalUsed: tokens.totalUsed + cost,
    },
  };
}

// 残高チェックの純粋関数
function hasEnoughTokens(tokens: UserTokens, cost: number): boolean {
  return (tokens.freeTokens + tokens.paidTokens) >= cost;
}

// 月初リセットロジックの純粋関数
function checkMonthlyReset(tokens: UserTokens, currentMonth: string): UserTokens {
  if (tokens.lastResetDate !== currentMonth) {
    return {
      ...tokens,
      freeTokens: FREE_TOKEN_MONTHLY_LIMIT,
      lastResetDate: currentMonth,
    };
  }
  return tokens;
}

describe('トークン定数', () => {
  it('FREE_TOKEN_MONTHLY_LIMIT は100', () => {
    expect(FREE_TOKEN_MONTHLY_LIMIT).toBe(100);
  });

  it('TOKEN_COSTS が全AI機能をカバーしている', () => {
    expect(TOKEN_COSTS.chatResponse).toBe(3);
    expect(TOKEN_COSTS.grammarCorrection).toBe(1);
    expect(TOKEN_COSTS.wordTranslation).toBe(1);
    expect(TOKEN_COSTS.dailyQuestion).toBe(2);
    expect(TOKEN_COSTS.imageChatResponse).toBe(5);
    expect(TOKEN_COSTS.translation).toBe(3);
  });
});

describe('トークン消費ロジック', () => {
  it('無料トークンが十分な場合、無料トークンから消費される', () => {
    const tokens: UserTokens = {
      freeTokens: 50,
      paidTokens: 10,
      lastResetDate: getCurrentYearMonth(),
      totalUsed: 0,
    };
    const result = consumeTokensLogic(tokens, 3);
    
    expect(result.success).toBe(true);
    expect(result.newTokens.freeTokens).toBe(47);
    expect(result.newTokens.paidTokens).toBe(10); // 有料は減らない
    expect(result.newTokens.totalUsed).toBe(3);
  });

  it('無料トークンが不足する場合、残りを有料トークンから消費する', () => {
    const tokens: UserTokens = {
      freeTokens: 2,
      paidTokens: 10,
      lastResetDate: getCurrentYearMonth(),
      totalUsed: 5,
    };
    const result = consumeTokensLogic(tokens, 5);
    
    expect(result.success).toBe(true);
    expect(result.newTokens.freeTokens).toBe(0);
    expect(result.newTokens.paidTokens).toBe(7); // 10 - (5 - 2) = 7
    expect(result.newTokens.totalUsed).toBe(10);
  });

  it('両方合わせても不足する場合、消費は失敗する', () => {
    const tokens: UserTokens = {
      freeTokens: 2,
      paidTokens: 1,
      lastResetDate: getCurrentYearMonth(),
      totalUsed: 97,
    };
    const result = consumeTokensLogic(tokens, 5);
    
    expect(result.success).toBe(false);
    expect(result.newTokens.freeTokens).toBe(2); // 変更なし
    expect(result.newTokens.paidTokens).toBe(1); // 変更なし
  });

  it('コスト0のときは常に成功する', () => {
    const tokens: UserTokens = {
      freeTokens: 0,
      paidTokens: 0,
      lastResetDate: getCurrentYearMonth(),
      totalUsed: 100,
    };
    const result = consumeTokensLogic(tokens, 0);
    
    expect(result.success).toBe(true);
    expect(result.newTokens.totalUsed).toBe(100);
  });

  it('無料トークンがちょうどコストと同じ場合', () => {
    const tokens: UserTokens = {
      freeTokens: 3,
      paidTokens: 5,
      lastResetDate: getCurrentYearMonth(),
      totalUsed: 10,
    };
    const result = consumeTokensLogic(tokens, 3);
    
    expect(result.success).toBe(true);
    expect(result.newTokens.freeTokens).toBe(0);
    expect(result.newTokens.paidTokens).toBe(5); // 有料は減らない
  });
});

describe('残高チェック', () => {
  it('十分なトークンがある場合はtrueを返す', () => {
    const tokens: UserTokens = {
      freeTokens: 50,
      paidTokens: 10,
      lastResetDate: getCurrentYearMonth(),
      totalUsed: 0,
    };
    expect(hasEnoughTokens(tokens, 5)).toBe(true);
  });

  it('無料+有料の合計がコスト以上ならtrueを返す', () => {
    const tokens: UserTokens = {
      freeTokens: 2,
      paidTokens: 3,
      lastResetDate: getCurrentYearMonth(),
      totalUsed: 0,
    };
    expect(hasEnoughTokens(tokens, 5)).toBe(true);
  });

  it('合計がコスト未満ならfalseを返す', () => {
    const tokens: UserTokens = {
      freeTokens: 2,
      paidTokens: 2,
      lastResetDate: getCurrentYearMonth(),
      totalUsed: 0,
    };
    expect(hasEnoughTokens(tokens, 5)).toBe(false);
  });
});

describe('月初リセット', () => {
  it('同じ月ならリセットしない', () => {
    const currentMonth = getCurrentYearMonth();
    const tokens: UserTokens = {
      freeTokens: 30,
      paidTokens: 5,
      lastResetDate: currentMonth,
      totalUsed: 70,
    };
    const result = checkMonthlyReset(tokens, currentMonth);
    
    expect(result.freeTokens).toBe(30); // 変更なし
    expect(result.paidTokens).toBe(5);
  });

  it('異なる月ならfreeTokensをリセットする', () => {
    const tokens: UserTokens = {
      freeTokens: 10,
      paidTokens: 5,
      lastResetDate: '2025-12',
      totalUsed: 90,
    };
    const currentMonth = '2026-01';
    const result = checkMonthlyReset(tokens, currentMonth);
    
    expect(result.freeTokens).toBe(FREE_TOKEN_MONTHLY_LIMIT); // 100にリセット
    expect(result.paidTokens).toBe(5); // 有料は変化なし
    expect(result.lastResetDate).toBe('2026-01');
    expect(result.totalUsed).toBe(90); // 累計は維持
  });

  it('年をまたいでもリセットされる', () => {
    const tokens: UserTokens = {
      freeTokens: 0,
      paidTokens: 0,
      lastResetDate: '2025-12',
      totalUsed: 200,
    };
    const result = checkMonthlyReset(tokens, '2026-01');
    
    expect(result.freeTokens).toBe(FREE_TOKEN_MONTHLY_LIMIT);
    expect(result.lastResetDate).toBe('2026-01');
  });
});
