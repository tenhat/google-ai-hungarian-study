
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
}

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
  explanation: string;         // 活用・文法解説
  importantWords: {
    hungarian: string;
    japanese: string;
    example: {
      sentence: string;
      translation: string;
    };
  }[];
}
