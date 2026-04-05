# StudyPath AI - Project Context

## Overview
Next.js (App Router) + TypeScript の受験学習管理アプリ。Takechiyo塾のカリキュラムデータに基づき、AIが学習プランを生成し、RPG/クエスト風のゲーミフィケーションで学習を進める。

## Tech Stack
- **Framework**: Next.js 14 (App Router), TypeScript
- **AI**: OpenAI API (gpt-4.1-nano) via `openai` SDK
- **Storage**: localStorage (key prefix: `studypath_v3`)
- **Styling**: Tailwind CSS + CSS variables (ダークテーマ)
- **Deploy**: standalone output mode

## Architecture
```
studypath-app/
  src/
    app/
      page.tsx          # Single-page app (all views in one file)
      api/
        generate/route.ts  # Plan generation API
        chat/route.ts      # AI chat streaming API
    data/
      curriculum.json   # Takechiyo塾カリキュラムDB (104教材, 1131ステップ)
      curriculum.ts     # Curriculum type definitions & helpers
    lib/
      constants.ts      # System prompt, JSON schema, static data
      utils.ts          # Date, week, streak calculation helpers
    types/
      index.ts          # All TypeScript interfaces
```

## Key Design Decisions

### Data Model
- **Plans**: `Record<string, StudyPlan>` - `long_term` と `mock_exam` を別々に保持
- **Todos**: 全タスクを単一の `Todo[]` 配列で管理、`planType` フィールドで所属プランを区別
- **Curriculum**: Excel → JSON変換済み。教材(material) → ステップ(step) の階層構造
- **Gamification**: Todo に `questType` (normal/boss/checkpoint), `materialId`, `stepIndex` を持たせ教材進捗を追跡

### Plan Generation Flow
1. ユーザーのプロフィール + 選択科目を取得
2. `buildCurriculumPrompt()` で該当科目のカリキュラムデータをプロンプトに注入
3. OpenAI API (structured output / json_schema) でプラン生成
4. 新しいtodoは同じ `planType` の既存todoのみ置き換え（他のプランのtodoは保持）

### Views (AppView type)
- `onboarding`: 初回セットアップ (4ステップ)
- `dashboard`: ホーム画面 (レベル, 統計, 今日のクエスト, 次のクエスト)
- `weekly`: 週間カレンダー
- `plan`: 冒険の地図 (科目別進捗 / 長期プラン / 模試対策 タブ切替)
- `chat`: AIコーチ相談 (ストリーミング)
- `profile`: ステータス編集 (成績・偏差値・志望校を後から更新可能)

## Environment
- `.env.local` に `OPENAI_API_KEY` を設定
- Firebase設定もあるが現在は未使用 (将来のデータ永続化用)

## Important Notes
- OpenAI structured output (strict mode) では全objectに `additionalProperties: false` が必須
- カリキュラムデータの教材名・ステップ名はExcelそのまま。AIに自由に教材を考案させない
- localStorage のみでデータ保持。ブラウザクリアで消える
