# Hungarian Study Tenju

Google Gemini AIを活用した、インタラクティブなハンガリー語学習Webアプリケーションです。
単語レベルに基づいたランダムな学習ではなく、**自分の身の回りで実際に使う言葉を集め、オリジナルの単語帳を作成すること**で、効率的かつ実践的にハンガリー語を習得することを目指しています。
AI講師とのチャット、文法解説付きの翻訳、画像解析による学習など、多彩な機能であなたの学習をサポートします。

## 主な機能

### 🤖 AIチャット (Chat)
AI講師とハンガリー語で会話練習ができます。
- 自然な会話を通じた学習
- 初心者〜中級者向けのレベル調整
- 過去の会話履歴に基づいた文脈理解

### 🌐 翻訳 & 解説 (Translate)
単なる翻訳だけでなく、学習に役立つ深い洞察を提供します。
- 日英 ⇔ ハンガリー語 の双方向翻訳
- **文法解説:** 重要な文法ポイント（格変化、動詞活用など）を簡潔に説明
- **重要単語:** 文章内のキーワードを抽出し、例文付きで紹介

### 📷 画像で学習 (Image Analysis)
アップロードした画像をAIが解析し、ハンガリー語で描写します。
- 写真に写っている物体や状況をハンガリー語で説明
- 画像内のテキスト（もしあれば）の転記と解説
- 視覚情報と結びついた語彙学習

### 🧠 クイズと学習アルゴリズム (Quiz & Spaced Repetition)
忘却曲線に基づいた**分散学習（Spaced Repetition）アルゴリズム**を採用し、効率的な記憶の定着をサポートします。

#### 出題ロジック詳細
- **SM-2アルゴリズムベース:** スーパーメモ法（SM-2）をベースに、ハンガリー語学習向けに調整したアルゴリズムを使用。
- **復習間隔:** 
    - 新しい単語や間違えた単語は、短い間隔（1日後、3日後、7日後...）で再出題されます。
    - 正解し続けると、単語の「易しさ（Easiness Factor）」が上昇し、復習間隔が徐々に長くなります。
    - 60日以上間隔が空くようになった単語は「習得済み（Mastered）」とみなされます。
- **出題形式:**
    - ハンガリー語 → 日本語
    - 日本語 → ハンガリー語
    - ランダムな順序で出題され、記憶の定着を多角的にテストします。

### ✍️ 文法添削 (Grammar Correction)
チャットや翻訳機能では、あなたの入力したハンガリー語をAIがリアルタイムで添削します。
- **自動修正:** 文法的な誤りがある場合、正しい表現を提示します。
- **解説:** なぜ間違っているのか、簡潔な日本語で理由を説明（例：「目的語なので -t をつけます」）。

### 🎧 リスニング (Listening Mode)
音声を通じたリスニング学習機能を提供します。

### 🎯 復習チャレンジ (Review Challenge)
苦手な単語や過去に間違えた問題を重点的に復習できます。

## 技術スタック

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, Lucide React
- **Backend / Auth:** Firebase (Authentication, Firestore)
- **AI:** Google Gemini API (gemini-2.5-flash)
- **I18n:** react-i18next (日本語/英語 UI対応)

## セットアップ手順

### 前提条件
- Node.js (v18以上推奨)
- Firebaseアカウント
- Google Cloud Project (Gemini API用)

### インストール

```bash
npm install
```

### 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の変数を設定してください。

```env
# Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.storage.firebaseapp.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` (またはターミナルに表示されるURL) にアクセスしてください。

## ライセンス

このプロジェクトは学習・研究目的で開発されています。
