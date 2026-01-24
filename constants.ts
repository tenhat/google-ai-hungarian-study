
import { Word } from './types';

export const INITIAL_WORDS: Word[] = [
  { id: 'word_001', hungarian: 'alma', japanese: 'りんご' },
  { id: 'word_002', hungarian: 'kutya', japanese: '犬' },
  { id: 'word_003', hungarian: 'ház', japanese: '家' },
  { id: 'word_004', hungarian: 'könyv', japanese: '本' },
  { id: 'word_005', hungarian: 'asztal', japanese: 'テーブル' },
  { id: 'word_006', hungarian: 'szék', japanese: '椅子' },
  { id: 'word_007', hungarian: 'víz', japanese: '水' },
  { id: 'word_008', hungarian: 'kenyér', japanese: 'パン' },
  { id: 'word_009', hungarian: 'autó', japanese: '車' },
  { id: 'word_010', hungarian: 'város', japanese: '街' },
  { id: 'word_011', hungarian: 'utca', japanese: '通り' },
  { id: 'word_012', hungarian: 'iskola', japanese: '学校' },
  { id: 'word_013', hungarian: 'tanuló', japanese: '学生' },
  { id: 'word_014', hungarian: 'tanár', japanese: '先生' },
  { id: 'word_015', hungarian: 'barát', japanese: '友達' },
  { id: 'word_016', hungarian: 'enni', japanese: '食べる' },
  { id: 'word_017', hungarian: 'inni', japanese: '飲む' },
  { id: 'word_018', hungarian: 'látni', japanese: '見る' },
  { id: 'word_019', hungarian: 'menni', japanese: '行く' },
  { id: 'word_020', hungarian: 'jönni', japanese: '来る' },
];

// SM-2 Algorithm Constants
export const INITIAL_EASINESS = 2.5;
export const MIN_EASINESS = 1.3;
export const CORRECT_ANSWER_THRESHOLD = 3; // Grade 3-5 is correct
export const LEARNING_INTERVALS = [1, 6]; // in days for the first two correct repetitions
