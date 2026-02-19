# React Hooks (`useEffect`) ベストプラクティス監査レポート

> **監査日:** 2026-02-18  
> **対象:** 全コンポーネント・カスタムフック（8ファイル・19箇所）  
> **基準:** React公式ドキュメント（[You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect), [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects), [Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies)）

---

## 総合評価: ⭐⭐⭐⭐ (良好)

外部システム連携（Firebase Auth、Firestore、localStorage、Speech API）の同期にEffectを正しく使用しており、致命的なアンチパターンは見当たらなかった。以下に改善余地のある箇所をまとめる。

---

## 🔴 要対応（2件）

### 1. `Chat.tsx` — データフェッチのクリーンアップ欠如

- **箇所:** `components/Chat.tsx` L60-88（デイリー質問取得Effect）
- **問題:** `async`でAPI呼び出しを行っているが、`ignore`フラグや`AbortController`によるクリーンアップがない。React Strict Modeや高速なマウント/アンマウントで**レースコンディション**が発生する可能性がある。
- **改善案:**

```diff
  useEffect(() => {
    if (!isHistoryLoaded) return;
+   let ignore = false;
    const fetchDailyQuestion = async () => {
      // ... API呼び出し ...
-     setMessages(prev => [...prev, aiMessage]);
+     if (!ignore) {
+       setMessages(prev => [...prev, aiMessage]);
+     }
    };
    fetchDailyQuestion();
+   return () => { ignore = true; };
  }, [isHistoryLoaded]);
```

### 2. `Quiz.tsx` — 初期化Effectの依存配列が不完全

- **箇所:** `components/Quiz.tsx` L50-84（クイズアイテム初期化Effect）
- **問題:** 依存配列が`[words.length]`だが、Effect内で`words`配列の中身を参照している。`words`の内容が変わっても`length`が同一であれば再実行されず、**データ不整合**のリスクがある。ESLint `exhaustive-deps`ルール違反。
- **改善案:** 依存配列を`[words]`に変更し、ガード条件（`quizItems.length === 0`）で不要な再初期化を防ぐ。

---

## 🟡 改善推奨（6件）

### 3. `ReviewChallenge.tsx` — Effectチェーンの統合

- **箇所:** `components/ReviewChallenge.tsx` L47-57（進捗保存）+ L60-65（完了時削除）
- **問題:** `isFinished`が`true`になると2つのEffectが連鎖的に発火する**Effectチェーン**パターン。
- **改善案:** L47のEffect内に`isFinished`判定を統合し、完了時は保存ではなく削除を行う。L60-65のEffectは削除可能。

```diff
  // 進捗を保存する
  useEffect(() => {
-   if (hasStarted && !isFinished && quizWords.length > 0) {
+   if (!hasStarted) return;
+   if (isFinished) {
+     localStorage.removeItem(STORAGE_KEY);
+     setSavedProgress(null);
+     return;
+   }
+   if (quizWords.length > 0) {
      const progress: ChallengeProgress = { /* ... */ };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }, [hasStarted, isFinished, quizWords, currentIndex, correctCount, incorrectCount]);
-
- // 完了時に進捗を削除（このEffect全体を削除可能）
- useEffect(() => {
-   if (isFinished) {
-     localStorage.removeItem(STORAGE_KEY);
-     setSavedProgress(null);
-   }
- }, [isFinished]);
```

### 4. `Quiz.tsx` — 音声再生をイベントハンドラに移動

- **箇所:** `components/Quiz.tsx` L191-196
- **問題:** `currentWord`変化時にEffectで音声再生しているが、これはユーザーの「次へ」アクションの結果。React公式は「ユーザーインタラクションの結果はイベントハンドラで処理」を推奨している。
- **改善案:** `handleNext`関数内で次の単語設定後に`playAudio()`を呼ぶ。Strict Modeでの二重再生防止にもなる。

### 5. `Chat.tsx` — localStorage保存のデバウンス

- **箇所:** `components/Chat.tsx` L53-57
- **問題:** `messages`が変更される度に`JSON.stringify` + localStorage書き込みが即時発生する。
- **改善案:** `setTimeout` + クリーンアップでデバウンスし、不要な書き込みを削減。

```diff
  useEffect(() => {
    if (isHistoryLoaded) {
-     localStorage.setItem('hungarian-study-tenju-chat-history', JSON.stringify(messages));
+     const timer = setTimeout(() => {
+       localStorage.setItem('hungarian-study-tenju-chat-history', JSON.stringify(messages));
+     }, 300);
+     return () => clearTimeout(timer);
    }
  }, [messages, isHistoryLoaded]);
```

### 6. `useWordBank.ts` — Sync Effectの空ブロック整理

- **箇所:** `hooks/useWordBank.ts` L212-229
- **問題:** `user`がログイン中の場合、`if (user)`ブロック内にコメントのみで実行コードがない。
- **改善案:** ログイン中はearly returnし、未ログイン時のlocalStorage同期のみを残す。

```diff
  useEffect(() => {
    if (words.length === 0) return;
-   if (user) {
-     // 長いコメント...
-   } else {
+   if (user) return; // Firestoreはアクション内で個別同期
+
      localStorage.setItem(LOCAL_STORAGE_KEY_WORDS, JSON.stringify(words));
      if (progress.size > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY_PROGRESS, JSON.stringify(Array.from(progress.values())));
      }
-   }
  }, [words, progress, user]);
```

### 7. `Translate.tsx` — SpeechRecognitionの再生成回避

- **箇所:** `components/Translate.tsx` L90-143
- **問題:** `direction`変更のたびにSpeechRecognitionインスタンスをゼロから生成している。`lang`プロパティ更新だけで十分（`toggleListening`内で既に実行済み）。
- **改善案:** 初期化は`[]`（マウント時のみ）で行い、`direction`変更時はref経由で`lang`を更新。

### 8. `Quiz.tsx` — `useMemo`未使用のオプション生成

- **箇所:** `components/Quiz.tsx` L86-101
- **問題:** `useEffect` + `setState`で選択肢を生成しているが、`ReviewChallenge.tsx`では同等の処理を`useMemo`で実行しており統一感がない。`useEffect` + `setState`パターンは不要な再レンダリングを発生させる。
- **改善案:** `ReviewChallenge.tsx`と同様に`useMemo`パターンへ変更。

---

## 🟢 問題なし（11件）

| ファイル | 行 | 用途 | 評価 |
|---------|-----|------|------|
| `contexts/AuthContext.tsx` | 18-24 | Firebase Auth購読 + クリーンアップ | ✅ 模範的 |
| `hooks/useTokens.ts` | 67-137 | Firestoreからトークン読み込み | ✅ `[user]`依存で適切 |
| `hooks/useWordBank.ts` | 42-209 | Firestore / localStorage読み込み | ✅ `[user]`依存で適切 |
| `components/Chat.tsx` | 35-37 | メッセージ更新時の自動スクロール | ✅ DOM同期として適切 |
| `components/Chat.tsx` | 40-50 | チャット履歴のlocalStorage読込 | ✅ 初期化用途 |
| `components/Chat.tsx` | 60-88 | デイリー質問の取得 | ✅ 外部API同期（※クリーンアップは要追加） |
| `components/ReviewChallenge.tsx` | 34-44 | localStorage進捗読込 | ✅ 初期化用途 |
| `components/Translate.tsx` | 146-152 | i18n言語変更時の翻訳方向リセット | ✅ 外部状態同期 |
| `components/ListeningMode.tsx` | 58-66 | 単語取得 + マウント管理 | ✅ クリーンアップあり |
| `components/ListeningMode.tsx` | 158-168 | 再生シーケンス制御 | ✅ 外部API (Speech) 同期 |
| `components/ListeningMode.tsx` | 200-204 | アンマウント時クリーンアップ | ✅ 適切 |

---

## 対応優先度

| 優先度 | 件数 | 内容 |
|--------|------|------|
| 🔴 要対応 | 2 | レースコンディション防止、依存配列修正 |
| 🟡 改善推奨 | 6 | Effectチェーン統合、イベントハンドラ移行、パフォーマンス改善 |
| 🟢 問題なし | 11 | 外部システム同期、初期化、クリーンアップ |

🔴の2件（`Chat.tsx`のクリーンアップ欠如と`Quiz.tsx`の依存配列不備）は潜在的なバグの原因となるため、優先的に対応を推奨する。
