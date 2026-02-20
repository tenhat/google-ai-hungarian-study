export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface PlacementQuestion {
  id: string;
  level: CEFRLevel;
  question: string;         // 問題文 (例: 私は日本人です)
  options: string[];        // 選択肢4つ
  correctAnswer: string;    // 正解の文字列
  explanation?: string;     // 簡単な解説
}

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // A1 (Beginner) - 5問
  {
    id: 'a1-1',
    level: 'A1',
    question: '「こんにちは」はハンガリー語で何と言いますか？',
    options: ['Viszlát', 'Szia', 'Köszönöm', 'Igen'],
    correctAnswer: 'Szia',
    explanation: 'Szia は親しい人に対する「こんにちは」や「さようなら」です。'
  },
  {
    id: 'a1-2',
    level: 'A1',
    question: '「私は日本人です」の正しい訳を選んでください。',
    options: ['Japán vagyok.', 'Japán van.', 'Japánok vagyunk.', 'Japán leszek.'],
    correctAnswer: 'Japán vagyok.',
    explanation: '「私は〜です」は「〜 vagyok」となります。'
  },
  {
    id: 'a1-3',
    level: 'A1',
    question: '「Köszönöm szépen.」の意味を選んでください。',
    options: ['どういたしまして。', 'ありがとうございます。', 'ごめんなさい。', 'さようなら。'],
    correctAnswer: 'ありがとうございます。',
    explanation: 'Köszönöm は「ありがとう」、szépen をつけると「どうもありがとう（美しく）」と丁寧になります。'
  },
  {
    id: 'a1-4',
    level: 'A1',
    question: '「水をお願いします」と言いたい時、どれを使いますか？',
    options: ['Vizet kérek.', 'Víz kérem.', 'Vizet kérem.', 'Víz kérek.'],
    correctAnswer: 'Vizet kérek.',
    explanation: '「水を」は対格で vizet。「（不特定のものを）お願いします/欲しいです」は kérek を使います。'
  },
  {
    id: 'a1-5',
    level: 'A1',
    question: '「どこに行きますか？(Hova ... ?)」の空欄に入るのは？',
    options: ['mész', 'megyünk', 'mentek', 'mennek'],
    correctAnswer: 'mész',
    explanation: '「（君は）行く」は mész です。'
  },

  // A2 (Elementary) - 5問
  {
    id: 'a2-1',
    level: 'A2',
    question: '「私はブダペストに住んでいます」の正しい訳を選んでください。',
    options: ['Budapestben élek.', 'Budapesten élek.', 'Budapestre élek.', 'Budapestől élek.'],
    correctAnswer: 'Budapesten élek.',
    explanation: 'ブダペストなどハンガリーの多くの都市「〜で(in)」は -en/-on/-ön などの接尾辞（上格）を使います。'
  },
  {
    id: 'a2-2',
    level: 'A2',
    question: '「Ez a könyv _____ jobb. (この本はそれより良い)」の空欄に入るのは？',
    options: ['abból', 'annál', 'ahhoz', 'azzal'],
    correctAnswer: 'annál',
    explanation: '比較級「〜よりも(than)」は -nál/-nél を使います。az(あれ) + nál = annál。'
  },
  {
    id: 'a2-3',
    level: 'A2',
    question: '「Hány óra _____? (今何時ですか)」の空欄に入るのは？',
    options: ['van', 'lesz', 'volt', 'vagy'],
    correctAnswer: 'van',
    explanation: '時刻を尋ねる時は「Hány óra van?」と言います。'
  },
  {
    id: 'a2-4',
    level: 'A2',
    question: '「友達と一緒に映画館へ行きました」の訳を選んでください。',
    options: ['A barátommal mentem a moziba.', 'A barátomnak mentem a moziba.', 'A barátomtól mentem a moziba.', 'A barátomhoz mentem a moziba.'],
    correctAnswer: 'A barátommal mentem a moziba.',
    explanation: '「〜と一緒に(with)」は -val/-vel を使います（barátom + mal）。'
  },
  {
    id: 'a2-5',
    level: 'A2',
    question: 'A: Kérsz még egy kávét?  B: Nem, köszönöm, _____ nem kérek.',
    options: ['még', 'már', 'mindig', 'soha'],
    correctAnswer: 'már',
    explanation: '「もう〜ない (not anymore)」は már nem を使います。'
  },

  // B1 (Intermediate) - 5問
  {
    id: 'b1-1',
    level: 'B1',
    question: '「彼はいつも遅れて来る」の正しい訳はどれですか？',
    options: ['Ő mindig késik.', 'Ő mindig későn.', 'Ő mindig elkésik.', 'Ő mindig késik el.'],
    correctAnswer: 'Ő mindig késik.',
    explanation: '習慣的な動作には動詞 késik（遅れる）を使います。elkésik は「遅刻してしまう」という完了的な意味合いが強くなります。'
  },
  {
    id: 'b1-2',
    level: 'B1',
    question: '「あの本を読んだら、きっと気に入るだろう」',
    options: ['Ha elolvastad azt a könyvet, biztosan tetszeni fog.', 'Ha olvasod azt a könyvet, biztosan tetszik.', 'Ha elolvasod azt a könyvet, biztosan tetszeni fog.', 'Ha olvastad azt a könyvet, biztosan tetszeni fog.'],
    correctAnswer: 'Ha elolvasod azt a könyvet, biztosan tetszeni fog.',
    explanation: '条件節（もし〜なら）の未来の出来事は、完了を表す前綴り付きの現在形（elolvasod）を使います。'
  },
  {
    id: 'b1-3',
    level: 'B1',
    question: '「Nem tudom, (hogy) mikor _____ meg az eredményt. (結果がいつ分かるか分からない)」',
    options: ['tudjuk', 'tudjuk meg', 'megtudjuk', 'megtudjuk meg'],
    correctAnswer: 'tudjuk meg',
    explanation: '疑問詞（mikor）が前綴り付き動詞の前にある場合、前綴り（meg）は動詞（tudjuk）の後ろに分離します。'
  },
  {
    id: 'b1-4',
    level: 'B1',
    question: '「この車はあの車より2倍高い」の訳を選んでください。',
    options: ['Ez az autó kétszer drága, mint az.', 'Ez az autó kétszer olyan drága, mint az.', 'Ez az autó két olyan drága, mint az.', 'Ez az autó kétszer drágább, mint az.'],
    correctAnswer: 'Ez az autó kétszer olyan drága, mint az.',
    explanation: '「〜倍〜だ」は [倍数] + olyan + [形容詞] + mint ... という構文を使います。'
  },
  {
    id: 'b1-5',
    level: 'B1',
    question: '「Szeretném, _____ eljönnél hozzánk. (うちに来てほしいな)」',
    options: ['ha', 'hogy', 'mert', 'amikor'],
    correctAnswer: 'ha',
    explanation: '「（誰かに）〜してほしい」という願望を表す場合、Szeretném, ha + [条件法] をよく使います。'
  },

  // B2 (Upper Intermediate) - 3問
  {
    id: 'b2-1',
    level: 'B2',
    question: '「雨が降っているにもかかわらず、私たちは散歩に出かけた」',
    options: ['Annak ellenére, hogy esett az eső, elmentünk sétálni.', 'Mivel esett az eső, elmentünk sétálni.', 'Esett az eső, mégis elmentünk sétáljunk.', 'Azelőtt, hogy esett az eső, elmentünk sétálni.'],
    correctAnswer: 'Annak ellenére, hogy esett az eső, elmentünk sétálni.',
    explanation: '「〜にもかかわらず」は annak ellenére, hogy 〜 を使います。'
  },
  {
    id: 'b2-2',
    level: 'B2',
    question: '「Bárcsak _____ időben! (もっと早く着いていればなあ！)」',
    options: ['megérkeztünk', 'megérkezzünk', 'megérkeztünk volna', 'meg fogunk érkezni'],
    correctAnswer: 'megérkeztünk volna',
    explanation: '過去の事実に反する強い願望・後悔（〜であればよかったのに）は、Bárcsak + 条件法過去（過去形 + volna）を使います。'
  },
  {
    id: 'b2-3',
    level: 'B2',
    question: '「Éppen azon _____, hogy felhívjalak. (ちょうど君に電話しようと思っていたところだ)」',
    options: ['voltam', 'gondolkoztam', 'jártam', 'akartam'],
    correctAnswer: 'voltam',
    explanation: 'Éppen azon voltam, hogy... は「まさに〜しようとしていたところだ」という熟語的な表現です。'
  },

  // C1 (Advanced) - 2問
  {
    id: 'c1-1',
    level: 'C1',
    question: '「Ami a nyelvtudást _____, nagyon sokat fejlődött. (語学力に関して言えば、彼は随分上達した)」',
    options: ['tartozik', 'illeti', 'vonatkozik', 'érinti'],
    correctAnswer: 'illeti',
    explanation: 'Ami ...-t illeti で「〜に関して言えば、〜については(as regards ...)」という決まり文句です。'
  },
  {
    id: 'c1-2',
    level: 'C1',
    question: '「Nem volt olyan ember a teremben, aki ne _____ volna megdöbbenve. (部屋には驚愕していない者は一人もいなかった)」',
    options: ['lett', 'legyen', 'van', 'lett volna'],
    correctAnswer: 'lett',
    explanation: '「〜でない者はいなかった」のような強い否定の複文では「ne + 条件法（または接続法）」が使われます。文全体が過去の事態であり、ここでは「lett volna」の部分のうち、選択肢には「lett」が入ります（後に volna があるため）。'
  }
];

export function calculateLevel(score: number): CEFRLevel {
  if (score <= 5) return 'A1';
  if (score <= 10) return 'A2';
  if (score <= 15) return 'B1';
  if (score <= 18) return 'B2';
  return 'C1';
}
