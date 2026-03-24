# StudyPath AI - 受験学習プランナー

「何をしたらいいかわからない」学生のために、目標を入力するだけで具体的なアクションプランを生成するWebアプリです。

## アーキテクチャ

```
[ブラウザ] → [Cloudflare Workers プロキシ] → [OpenAI API]
  (GitHub Pages)    (APIキーはここに隠れる)      (GPT-4.1 Nano)
```

- フロントエンド: GitHub Pages（静的HTML）
- プロキシ: Cloudflare Workers（APIキーをサーバー側に隠蔽）
- LLM: OpenAI GPT-4.1 Nano

## セットアップ手順

### 1. Cloudflare Workers プロキシをデプロイ（先にやる）

`studypath-proxy/` フォルダで作業します。

```bash
cd studypath-proxy

# 依存インストール
npm install

# Cloudflareにログイン（ブラウザが開きます）
npx wrangler login

# OpenAI APIキーをSecretとして登録
npx wrangler secret put OPENAI_API_KEY
# → プロンプトが出たら sk-... のキーを貼り付けてEnter

# デプロイ
npm run deploy
```

デプロイ成功すると以下のようなURLが表示されます：
```
https://studypath-proxy.<your-subdomain>.workers.dev
```

### 2. フロントエンドにプロキシURLを設定

`studypath-ai/index.html` の先頭付近にある `PROXY_URL` を書き換えます：

```javascript
const PROXY_URL = 'https://studypath-proxy.YOUR_SUBDOMAIN.workers.dev';
//                                        ^^^^^^^^^^^^^^ ここを自分のに変更
```

### 3. GitHub Pages にデプロイ

```bash
cd studypath-ai

git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<username>/studypath-ai.git
git branch -M main
git push -u origin main
```

GitHub → Settings → Pages → Source: main / root → Save

### 4. CORS制限を設定（推奨）

`studypath-proxy/wrangler.toml` の `ALLOWED_ORIGIN` を自分のGitHub PagesのURLに変更：

```toml
[vars]
ALLOWED_ORIGIN = "https://yourname.github.io"
```

再デプロイ：
```bash
cd studypath-proxy
npm run deploy
```

## ファイル構成

```
studypath-ai/          ← GitHub Pagesにデプロイ
├── index.html         # アプリ本体
└── README.md

studypath-proxy/       ← Cloudflare Workersにデプロイ
├── src/index.js       # プロキシ本体
├── wrangler.toml      # Cloudflare設定
├── package.json
├── .gitignore
└── README.md
```

## 月額コスト

| サービス | 料金 |
|---------|------|
| GitHub Pages | $0 |
| Cloudflare Workers Free | $0 (100K req/day) |
| OpenAI GPT-4.1 Nano | ~$2/月 (1000人×8回) |
| **合計** | **~$2/月** |

## セキュリティ

- OpenAI APIキーは Cloudflare Workers の Secret に保存（ブラウザに露出しない）
- CORS制限で自分のドメインからのリクエストのみ許可
- レート制限（デフォルト: 10 req/min/IP）でAPI乱用を防止
- 使用可能モデルをホワイトリストで制限（コスト暴走防止）

## ライセンス

MIT
