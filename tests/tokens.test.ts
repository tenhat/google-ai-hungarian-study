import { describe, it, expect } from 'vitest';
import { UserTokens, TOKEN_COSTS, FREE_TOKEN_WEEKLY_LIMIT } from '../types';
import { calculateResetInfo } from '../hooks/useTokens';

// getCurrentDateString ヘルパー
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// トークン消費ロジックの純粋関数テスト
// (実装は useTokens.ts 内にあるが、exportしていないため、ロジック確認用にここに再定義)
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

describe('トークン定数', () => {
  it('FREE_TOKEN_WEEKLY_LIMIT は100', () => {
    expect(FREE_TOKEN_WEEKLY_LIMIT).toBe(100);
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
      lastResetDate: getCurrentDateString(),
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
      lastResetDate: getCurrentDateString(),
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
      lastResetDate: getCurrentDateString(),
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
      lastResetDate: getCurrentDateString(),
      totalUsed: 100,
    };
    const result = consumeTokensLogic(tokens, 0);
    
    expect(result.success).toBe(true);
    expect(result.newTokens.totalUsed).toBe(100);
  });
});

describe('週次リセットと日数計算 (calculateResetInfo)', () => {
  it('リセット直後 (0日経過) の場合、次回リセットまで7日', () => {
    const now = new Date('2023-10-01T10:00:00Z'); // 日曜日
    const lastResetDateStr = '2023-10-01'; // 同じ日
    
    const { daysUntilReset, nextResetDate } = calculateResetInfo(lastResetDateStr, now);
    // lastResetDateStrはYYYY-MM-DDのみなのでUTCとみなされるかローカルかによるが、
    // calculateResetInfo内では new Date(lastResetDateStr) している。
    // ISO文字列 (YYYY-MM-DD) はUTCとして解釈される。
    // 一方、now は new Date(...) で生成。
    // ロジック内の today, nextResetDay は年月日で生成し直しているので、時刻のズレは無視されるはず。
    
    expect(daysUntilReset).toBe(7);
    expect(nextResetDate.toISOString().startsWith('2023-10-08')).toBe(true);
  });

  it('1日経過した場合、次回リセットまで6日', () => {
    const now = new Date('2023-10-02T10:00:00Z'); // 月曜日
    const lastResetDateStr = '2023-10-01'; // 日曜日
    
    const { daysUntilReset } = calculateResetInfo(lastResetDateStr, now);
    
    expect(daysUntilReset).toBe(6);
  });

  it('6日経過した場合、次回リセットまで1日', () => {
    const now = new Date('2023-10-07T10:00:00Z');
    const lastResetDateStr = '2023-10-01';
    
    const { daysUntilReset } = calculateResetInfo(lastResetDateStr, now);
    
    expect(daysUntilReset).toBe(1);
  });

  it('7日経過 (リセット当日) の場合、表示上は0日 (即時リセット対象)', () => {
    const now = new Date('2023-10-08T10:00:00Z');
    const lastResetDateStr = '2023-10-01';
    
    const { daysUntilReset } = calculateResetInfo(lastResetDateStr, now);
    
    expect(daysUntilReset).toBe(0);
  });
  
  it('8日経過 (リセット遅れ) の場合も0日', () => {
    const now = new Date('2023-10-09T10:00:00Z');
    const lastResetDateStr = '2023-10-01';
    
    const { daysUntilReset } = calculateResetInfo(lastResetDateStr, now);
    
    expect(daysUntilReset).toBe(0);
  });

  it('無効な日付の場合は、今日を基準に7日後を返す', () => {
    const now = new Date('2023-10-01T10:00:00Z');
    const { daysUntilReset, nextResetDate } = calculateResetInfo('invalid-date', now);
    
    expect(daysUntilReset).toBe(7);
    // lastResetが無効 -> 今(10/1)から7日後 -> 10/8
    expect(nextResetDate.toISOString().startsWith('2023-10-08')).toBe(true);
  });
});
