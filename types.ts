
export interface Word {
  id: string;
  hungarian: string;
  japanese: string;
  context?: string;
  example?: {
    sentence: string;
    translation: string;
  };
}

export enum WordStatus {
  New = 'New',
  Learning = 'Learning',
  Mastered = 'Mastered',
}

export interface WordProgress {
  wordId: string;
  status: WordStatus;
  // SM-2 Algorithm parameters
  easiness: number; // EF: Easiness Factor
  interval: number; // I(n): Inter-repetition interval
  repetitions: number; // n: Repetitions count
  nextReviewDate: string;
  lastCorrect: boolean | null;
  addedFromChat?: boolean;
}

export enum View {
  Home = 'Home',
  Quiz = 'Quiz',
  Chat = 'Chat',
  Translate = 'Translate',
  ReviewChallenge = 'ReviewChallenge',
  ListeningMode = 'ListeningMode',
  PlacementTest = 'PlacementTest',
}

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export enum QuizMode {
  HuToJp,
  JpToHu,
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;  // base64 data URL形式で画像を保存
  translation?: string;
  segments?: { hungarian: string; japanese: string; }[];
  correction?: Correction;
  timestamp: number;
}

export interface Correction {
  isCorrect: boolean;
  correctedSentence?: string;
  explanation?: string;
}

export interface TranslationResult {
  hungarian: string;           // ハンガリー語翻訳
  japanese?: string;           // 日本語翻訳（ハンガリー語→日本語翻訳時に使用）
  english?: string;            // 英語翻訳（ハンガリー語→英語翻訳時に使用）

  explanation: string;         // 活用・文法解説
  importantWords: {
    hungarian: string;
    japanese?: string;
    english?: string;          // 英語訳
    example: {
      sentence: string;
      translation: string;
    };
  }[];
}

// --- トークン制 ---

export interface UserTokens {
  freeTokens: number;        // 現在の無料トークン残高
  paidTokens: number;        // 現在の有料トークン残高
  lastResetDate: string;     // 最後に無料トークンがリセットされた日付 (ISO 8601 YYYY-MM-DD)
  totalUsed: number;         // 累計消費トークン数（統計用）
}

// 各AI機能のトークン消費量
export const TOKEN_COSTS = {
  chatResponse: 3,          // AIチャット応答
  grammarCorrection: 1,     // 文法チェック
  wordTranslation: 1,       // 単語翻訳
  dailyQuestion: 2,         // デイリー質問生成
  imageChatResponse: 5,     // 画像解析
  translation: 3,           // 翻訳＋解説
} as const;

// 無料トークンの週間付与量
export const FREE_TOKEN_WEEKLY_LIMIT = 100;
