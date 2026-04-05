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

## 最重要ルール
- 生徒が選択した受験科目のみについてプランを作成すること。選択されていない科目は一切無視
- 科目別成績データを最大限活用し、弱点科目に多くの時間を配分すること
- 推奨教材は現在の偏差値帯に合った具体的な書名で挙げること
- 週次スケジュールは学習可能時間を超えないこと
- 出力は必ず指定のJSON形式に従うこと

## トーン
- 「勉強しなさい」ではなく「一緒にクリアしていこう」
- ゲームのクエストのように、達成感を感じられる表現を使う
- 小さな目標を多く設定し、完了の喜びを積み重ねられるようにする`;

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
      },
    },
    todos: {
      type: "array" as const,
      description: "日次レベルに分解されたTodoリスト（最低20個、最大50個）",
      items: {
        type: "object" as const,
        properties: {
          subject: { type: "string" as const },
          unit: { type: "string" as const },
          task: { type: "string" as const, description: "具体的で実行可能なタスク名。ゲームのクエスト風に" },
          material: { type: "string" as const, description: "具体的な教材名" },
          estimatedMinutes: { type: "number" as const },
          dueDate: { type: "string" as const, description: "YYYY-MM-DD形式" },
          phase: { type: "string" as const },
          order: { type: "number" as const },
        },
        required: ["subject", "unit", "task", "material", "estimatedMinutes", "dueDate", "phase", "order"],
      },
    },
    encouragement: {
      type: "string" as const,
      description: "励ましのメッセージ（2-3文）"
    },
  },
  required: ["analysis", "phases", "todos", "encouragement"],
};
