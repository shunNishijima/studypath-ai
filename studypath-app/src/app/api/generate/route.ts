import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { SYSTEM_PROMPT, PLAN_JSON_SCHEMA } from '@/lib/constants';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile, planType, mockExamName } = body;

    const userPrompt = buildUserPrompt(profile, planType, mockExamName);

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'study_plan',
          strict: true,
          schema: PLAN_JSON_SCHEMA,
        },
      },
      temperature: 0.7,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response');

    const plan = JSON.parse(content);
    return NextResponse.json(plan);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Generate plan error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildUserPrompt(profile: Record<string, unknown>, planType: string, mockExamName?: string): string {
  const scores = profile.scores as Record<string, Record<string, string>> || {};
  const scoreLines = ((profile.subjects as string[]) || []).map((sub: string) => {
    const s = scores[sub];
    if (!s?.deviation && !s?.score) return `- ${sub}: 未入力`;
    return `- ${sub}: 偏差値${s.deviation || '?'} / 得点${s.score || '?'}/${s.maxScore || '?'}`;
  }).join('\n');

  const goals = (profile.goals as Array<Record<string, string>>) || [];
  const today = new Date().toISOString().split('T')[0];

  let instruction = '';
  if (planType === 'mock_exam') {
    instruction = `## リクエスト
次の模試「${mockExamName}」に向けた短期集中対策プランを作成してください。
今日の日付: ${today}
残り期間を逆算して、現実的に伸ばせる科目を優先度順にTodo化してください。
Todoのdue_dateは今日から模試日までの期間内で設定してください。`;
  } else {
    instruction = `## リクエスト
志望校合格に向けた長期学習プランを作成してください。
今日の日付: ${today}
受験日までを逆算して、フェーズ分け → マイルストーン → 日次Todoに分解してください。
Todoのdue_dateは今日から受験日までの期間で設定してください。
最初の2週間分は特に具体的なTodo（20個以上）を生成してください。`;
  }

  return `## 生徒情報
- 学年: ${profile.grade}
- 文理: ${profile.stream}
- 平日学習時間: ${profile.weekdayHours}
- 休日学習時間: ${profile.weekendHours}
- 総合偏差値: ${profile.totalDeviation || '未入力'}
- 直近の模試: ${profile.examName || '未入力'}

## 志望校
${goals.filter((g: Record<string, string>) => g.school).map((g: Record<string, string>, i: number) => `- 第${i + 1}志望: ${g.school} ${g.faculty}（${g.examType}）`).join('\n')}

## 受験科目（これ以外の科目は一切含めないでください）
${((profile.subjects as string[]) || []).join('、')}

## 科目別成績
${scoreLines}

${instruction}

JSONで出力してください。taskフィールドはゲームのクエスト風に書いてください（例: 「英単語100語の壁を突破せよ！」「長文読解ダンジョンに挑戦」）。`;
}
