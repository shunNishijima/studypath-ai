# StudyPath AI - 受験学習プランナー

「何をしたらいいかわからない」学生のために、目標を入力するだけで具体的なアクションプランを生成するWebアプリです。

## デモ

1. `index.html` をブラウザで開く
2. OpenAI API キーを入力
3. 3ステップで情報を入力 → AIがプランを生成

## 機能

- **目標入力 → アクションプラン生成**: 志望校・学年・学力を入力するとAIが学習プランを作成
- **科目別学習ステップ提示**: 各科目の取り組み順序・教材・時間配分を提示
- **週次スケジュール化**: 曜日×時間帯の具体的な学習割り当て
- **タスク管理**: 「今日の最初の一歩」をチェックリストで管理
- **ストリーミング表示**: プラン生成をリアルタイムで表示
- **ローカル保存**: データはブラウザのlocalStorageに保存（サーバー不要）

## 技術構成

| レイヤー | 技術 | コスト |
|---------|------|--------|
| Frontend | React 18 + Tailwind CSS (CDN) | $0 |
| LLM | OpenAI GPT-4.1 Nano (API直接呼び出し) | ~$2/月 (1000人) |
| Hosting | GitHub Pages | $0 |
| Database | localStorage (ブラウザ) | $0 |
| **合計** | | **~$2/月** |

## GitHub Pages へのデプロイ

```bash
# 1. リポジトリを作成
git init
git add .
git commit -m "Initial commit"

# 2. GitHubにpush
git remote add origin https://github.com/<username>/studypath-ai.git
git branch -M main
git push -u origin main

# 3. GitHub Pages を有効化
# Settings → Pages → Source: "Deploy from a branch" → Branch: main, / (root) → Save
```

数分後に `https://<username>.github.io/studypath-ai/` でアクセス可能になります。

## カスタムドメイン（任意）

`CNAME` ファイルを作成してドメインを記載：
```
studypath.example.com
```

## セキュリティについて

- APIキーはブラウザの `localStorage` にのみ保存されます
- サーバーへの送信は OpenAI API エンドポイントのみです
- 生徒のデータはすべてブラウザローカルに保持されます

### 本番運用時の注意

ブラウザから直接 OpenAI API を呼ぶ場合、APIキーがユーザー側に露出します。
本番運用（不特定多数向け）では以下の対策を検討してください：

1. **APIキー制限**: OpenAI ダッシュボードで月次上限を設定
2. **プロキシAPI**: Cloudflare Workers や Vercel Edge Functions 経由で呼び出す
3. **認証付きバックエンド**: FastAPI + Supabase Auth に移行

MVP検証段階では、自分の生徒にAPIキーを共有するか、各自のキーを使ってもらう運用で十分です。

## プロンプトのカスタマイズ

`index.html` 内の `SYSTEM_PROMPT` 変数を編集することで、AIの振る舞いを調整できます。

```javascript
const SYSTEM_PROMPT = `あなたは日本の大学受験指導に精通した学習コーチAIです。
// ここを編集
`;
```

## ファイル構成

```
studypath-ai/
├── index.html    # アプリ本体（React + Tailwind、CDN読み込み）
└── README.md     # このファイル
```

## ライセンス

MIT
