export const GRADES = ['高1', '高2', '高3', '浪人'] as const;
export const STREAMS = ['文系', '理系'] as const;
export const EXAM_TYPES = ['一般入試', '共通テスト利用', '総合型選抜', '学校推薦'] as const;

export const SUBJECTS: Record<string, string[]> = {
  common: ['英語'],
  文系: ['国語(現代文)', '国語(古文)', '国語(漢文)', '数学IA', '数学IIB', '日本史', '世界史', '地理', '政治経済', '倫理', '現代社会'],
  理系: ['国語(現代文)', '国語(古文)', '数学IA', '数学IIB', '数学III', '物理', '化学', '生物', '地学', '情報'],
};

export const MOCK_EXAMS = [
  '5月模試', '6月模試', '7月模試', '8月模試',
  '10月模試', '11月模試', '12月模試', '共通テスト本番', 'その他',
] as const;

export const SYSTEM_PROMPT = `あなたは日本の大学受験指導に精通した学習コーチAIです。
Takechiyo塾のカリキュラムデータに基づいて学習プランを作成します。

## 最重要ルール
- **カリキュラムの教材とステップに完全に従うこと**。自分で教材を考案しない。
- 各todoは必ずカリキュラム内の教材（materialId）とステップ番号（stepIndex）を指定すること
- 生徒が選択した受験科目のみについてプランを作成すること
- 科目別成績データを最大限活用し、弱点科目に多くの時間を配分すること
- 週次スケジュールは学習可能時間を超えないこと
- 教材の前提条件（prerequisite）を尊重し、順番通りに配置すること

## クエストタイプ
- **normal**: 通常のステップ（例: 英単語1~100を覚える）
- **boss**: 突破テスト・実力テスト。ボス戦として特別扱い
- **checkpoint**: フェーズの区切りとなる復習・まとめ

## タスク名のルール
- RPGのクエスト風に書く（例:「英単語100語の壁を突破せよ！」「数学IAダンジョン第1章を攻略！」）
- ボス戦は特に盛り上がる名前に（例:「【BOSS】英単語1~600突破テストに挑め！」）
- チェックポイントは「【復習】」で始める

## 出力は必ず指定のJSON形式に従うこと`;

export const PLAN_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    analysis: {
      type: "string" as const,
      description: "現状分析と志望校とのギャップ（3-5文）"
    },
    phases: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          startDate: { type: "string" as const },
          endDate: { type: "string" as const },
          targetDescription: { type: "string" as const },
          focusSubjects: { type: "array" as const, items: { type: "string" as const } },
        },
        required: ["name", "startDate", "endDate", "targetDescription", "focusSubjects"],
        additionalProperties: false,
      },
    },
    todos: {
      type: "array" as const,
      description: "カリキュラムに基づいたTodoリスト（最低20個、最大50個）",
      items: {
        type: "object" as const,
        properties: {
          subject: { type: "string" as const },
          unit: { type: "string" as const, description: "教材内の章・セクション名" },
          task: { type: "string" as const, description: "クエスト風のタスク名" },
          material: { type: "string" as const, description: "カリキュラムの教材名（そのまま）" },
          materialId: { type: "string" as const, description: "カリキュラムの教材ID（例: 英語_01）" },
          stepIndex: { type: "number" as const, description: "カリキュラムのステップ番号（0始まり）" },
          questType: { type: "string" as const, enum: ["normal", "boss", "checkpoint"], description: "クエストタイプ" },
          estimatedMinutes: { type: "number" as const },
          dueDate: { type: "string" as const, description: "YYYY-MM-DD形式" },
          phase: { type: "string" as const },
          order: { type: "number" as const },
        },
        required: ["subject", "unit", "task", "material", "materialId", "stepIndex", "questType", "estimatedMinutes", "dueDate", "phase", "order"],
        additionalProperties: false,
      },
    },
    encouragement: {
      type: "string" as const,
      description: "RPG風の励ましメッセージ（冒険の始まり風に2-3文）"
    },
  },
  required: ["analysis", "phases", "todos", "encouragement"],
  additionalProperties: false,
};
