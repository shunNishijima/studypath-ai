'use client';

import { useState, useEffect, useRef } from 'react';
import { GRADES, STREAMS, SUBJECTS, MOCK_EXAMS, EXAM_TYPES } from '@/lib/constants';
import { getCurrentWeek, formatDate, getDayLabel, calcWeekSummary, calcStreak, getSubjectEmoji, getSubjectColor, generateId } from '@/lib/utils';
import type { UserProfile, Todo, StudyPlan, AppView, Goal } from '@/types';

const STORAGE = 'studypath_v3';

function save(key: string, data: unknown) {
  try { localStorage.setItem(`${STORAGE}_${key}`, JSON.stringify(data)); } catch {}
}
function load<T>(key: string): T | null {
  try { const d = localStorage.getItem(`${STORAGE}_${key}`); return d ? JSON.parse(d) : null; } catch { return null; }
}

// ─── Bottom Navigation ───
function BottomNav({ view, onNavigate, hasPlan }: { view: AppView; onNavigate: (v: AppView) => void; hasPlan: boolean }) {
  if (!hasPlan) return null;
  const items: { id: AppView; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'ホーム', icon: '🏠' },
    { id: 'weekly', label: 'カレンダー', icon: '📅' },
    { id: 'plan', label: 'プラン', icon: '🗺️' },
    { id: 'chat', label: 'AI相談', icon: '💬' },
  ];
  return (
    <nav className="bottom-nav">
      <div className="max-w-lg mx-auto flex justify-around">
        {items.map(it => (
          <button key={it.id} onClick={() => onNavigate(it.id)}
            className={`flex flex-col items-center gap-1 px-4 py-1 ${view === it.id ? 'tab-active' : 'text-[var(--text3)]'}`}>
            <span className="text-lg">{it.icon}</span>
            <span className="text-[10px] font-medium">{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─── Onboarding ───
function Onboarding({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<UserProfile>({
    grade: '', stream: '', weekdayHours: '', weekendHours: '',
    subjects: ['英語'], scores: {}, goals: [{ school: '', faculty: '', examType: '一般入試', priority: 1 }],
  });

  const totalSteps = 4;
  const avail = [...SUBJECTS.common, ...(SUBJECTS[p.stream] || SUBJECTS['文系'])];
  const toggleSub = (s: string) => {
    if (s === '英語') return;
    setP({ ...p, subjects: p.subjects.includes(s) ? p.subjects.filter(x => x !== s) : [...p.subjects, s] });
  };

  const addGoal = () => setP({ ...p, goals: [...p.goals, { school: '', faculty: '', examType: '一般入試', priority: p.goals.length + 1 }] });
  const updGoal = (i: number, f: keyof Goal, v: string | number) => {
    const g = [...p.goals]; g[i] = { ...g[i], [f]: v }; setP({ ...p, goals: g });
  };
  const rmGoal = (i: number) => setP({ ...p, goals: p.goals.filter((_, j) => j !== i) });

  const updScore = (sub: string, f: string, v: string) => {
    setP({ ...p, scores: { ...p.scores, [sub]: { ...(p.scores[sub] || {}), [f]: v } } });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white text-lg">📚</div>
          <div>
            <h1 className="text-lg font-bold">StudyPath AI</h1>
            <p className="text-xs text-[var(--text3)]">受験の最短ルートをAIが作成</p>
          </div>
        </div>
        {/* Progress */}
        <div className="flex gap-2 mb-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-[var(--accent)]' : 'bg-[var(--bg3)]'}`} />
          ))}
        </div>
        <p className="text-xs text-[var(--text3)]">ステップ {step + 1} / {totalSteps}</p>
      </div>

      <div className="flex-1 px-5 pb-8">
        {/* Step 0: Basic info */}
        {step === 0 && (
          <div className="fade-up space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">まずは基本情報から 🎓</h2>
              <p className="text-sm text-[var(--text2)]">学年と文理を教えてください</p>
            </div>
            <div>
              <label className="text-xs text-[var(--text2)] mb-2 block">学年</label>
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map(g => (
                  <button key={g} onClick={() => setP({ ...p, grade: g })}
                    className={`chip ${p.grade === g ? 'active' : ''}`}>{g}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text2)] mb-2 block">文理</label>
              <div className="grid grid-cols-2 gap-2">
                {STREAMS.map(s => (
                  <button key={s} onClick={() => setP({ ...p, stream: s, subjects: ['英語'] })}
                    className={`chip ${p.stream === s ? 'active' : ''}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text2)] mb-2 block">平日の学習時間</label>
                <select value={p.weekdayHours} onChange={e => setP({ ...p, weekdayHours: e.target.value })}>
                  <option value="">選択</option>
                  {['1時間', '2時間', '3時間', '4時間', '5時間以上'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text2)] mb-2 block">休日の学習時間</label>
                <select value={p.weekendHours} onChange={e => setP({ ...p, weekendHours: e.target.value })}>
                  <option value="">選択</option>
                  {['2時間', '3時間', '4時間', '5時間', '6時間', '8時間以上'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" disabled={!p.grade || !p.stream || !p.weekdayHours || !p.weekendHours}
              onClick={() => setStep(1)}>次へ →</button>
          </div>
        )}

        {/* Step 1: Subject selection */}
        {step === 1 && (
          <div className="fade-up space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">受験科目を選ぼう ✏️</h2>
              <p className="text-sm text-[var(--text2)]">実際に受験で使う科目だけ選んでね</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {avail.map(s => (
                <button key={s} onClick={() => toggleSub(s)}
                  className={`chip ${p.subjects.includes(s) ? 'active' : ''}`}>
                  {getSubjectEmoji(s)} {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text3)]">{p.subjects.length}科目選択中</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep(0)}>← 戻る</button>
              <button className="btn-primary flex-[2]" disabled={p.subjects.length < 2} onClick={() => setStep(2)}>次へ →</button>
            </div>
          </div>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <div className="fade-up space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">志望校を設定 🎯</h2>
              <p className="text-sm text-[var(--text2)]">目標がハッキリしてるほど、プランの精度UP</p>
            </div>
            <div className="space-y-3">
              {p.goals.map((g, i) => (
                <div key={i} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[var(--accent)]">第{i + 1}志望</span>
                    {i > 0 && <button onClick={() => rmGoal(i)} className="text-xs text-[var(--text3)]">削除</button>}
                  </div>
                  <div className="space-y-2">
                    <input placeholder="大学名" value={g.school} onChange={e => updGoal(i, 'school', e.target.value)} />
                    <input placeholder="学部・学科" value={g.faculty} onChange={e => updGoal(i, 'faculty', e.target.value)} />
                    <select value={g.examType} onChange={e => updGoal(i, 'examType', e.target.value)}>
                      {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            {p.goals.length < 3 && (
              <button onClick={addGoal} className="text-sm text-[var(--accent)] flex items-center gap-1">
                + 志望校を追加
              </button>
            )}
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep(1)}>← 戻る</button>
              <button className="btn-primary flex-[2]" disabled={!p.goals.some(g => g.school)} onClick={() => setStep(3)}>次へ →</button>
            </div>
          </div>
        )}

        {/* Step 3: Scores */}
        {step === 3 && (
          <div className="fade-up space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">成績を入力 📊</h2>
              <p className="text-sm text-[var(--text2)]">わかる範囲でOK！AIがギャップを分析するよ</p>
            </div>
            <div className="card">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--text3)] mb-1 block">総合偏差値</label>
                  <input type="number" placeholder="52" value={p.totalDeviation || ''} onChange={e => setP({ ...p, totalDeviation: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text3)] mb-1 block">模試名</label>
                  <input placeholder="河合全統マーク" value={p.examName || ''} onChange={e => setP({ ...p, examName: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {p.subjects.map(sub => (
                <div key={sub} className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{getSubjectEmoji(sub)}</span>
                    <span className="text-sm font-medium">{sub}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-[var(--text3)]">偏差値</label>
                      <input type="number" placeholder="55" value={p.scores[sub]?.deviation || ''} onChange={e => updScore(sub, 'deviation', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text3)]">得点</label>
                      <input type="number" placeholder="72" value={p.scores[sub]?.score || ''} onChange={e => updScore(sub, 'score', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text3)]">満点</label>
                      <input type="number" placeholder="100" value={p.scores[sub]?.maxScore || ''} onChange={e => updScore(sub, 'maxScore', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-[var(--text2)] mb-2 block">次の模試の予定</label>
              <div className="flex flex-wrap gap-2">
                {MOCK_EXAMS.map(m => (
                  <button key={m} onClick={() => setP({ ...p, nextExam: m })}
                    className={`chip text-xs ${p.nextExam === m ? 'active' : ''}`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep(2)}>← 戻る</button>
              <button className="btn-primary flex-[2]" onClick={() => onComplete(p)}>
                🚀 AIプランを生成！
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ───
function Dashboard({ todos, profile, streak, onToggle, onNavigate }: {
  todos: Todo[];
  profile: UserProfile;
  streak: number;
  onToggle: (id: string) => void;
  onNavigate: (v: AppView) => void;
}) {
  const week = getCurrentWeek();
  const summary = calcWeekSummary(todos, week);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTodos = todos.filter(t => t.dueDate === todayStr);
  const pct = summary.totalTodos > 0 ? Math.round(summary.completedTodos / summary.totalTodos * 100) : 0;

  return (
    <div className="px-5 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-up">
        <div>
          <p className="text-sm text-[var(--text2)]">おかえり 👋</p>
          <h1 className="text-xl font-bold">今日のミッション</h1>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-[var(--accent-glow)] px-3 py-1.5 rounded-full">
              <span className="streak-fire">🔥</span>
              <span className="text-sm font-bold text-[var(--accent)]">{streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Weekly progress */}
      <div className="card card-glow mb-5 fade-up-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">今週の進捗</span>
          <span className="text-2xl font-bold text-[var(--accent)]">{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--text3)]">
          <span>{summary.completedTodos}/{summary.totalTodos} 完了</span>
          <span>{Math.round(summary.completedMinutes / 60 * 10) / 10}h / {Math.round(summary.totalMinutes / 60 * 10) / 10}h</span>
        </div>
      </div>

      {/* Subject breakdown */}
      {Object.keys(summary.bySubject).length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2 fade-up-2" style={{ scrollbarWidth: 'none' }}>
          {Object.entries(summary.bySubject).map(([sub, data]) => (
            <div key={sub} className="flex-shrink-0 card !p-3 min-w-[100px]">
              <span className="text-lg">{getSubjectEmoji(sub)}</span>
              <p className="text-xs text-[var(--text2)] mt-1 truncate">{sub}</p>
              <p className="text-sm font-bold">{data.completed}/{data.total}</p>
            </div>
          ))}
        </div>
      )}

      {/* Today's todos */}
      <div className="fade-up-3">
        <h2 className="text-sm font-medium text-[var(--text2)] mb-3">
          📋 今日のクエスト ({todayTodos.filter(t => t.status === 'done').length}/{todayTodos.length})
        </h2>
        {todayTodos.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-sm text-[var(--text2)]">今日のクエストはクリア済み！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTodos.map(todo => (
              <div key={todo.id} className={`todo-card ${todo.status === 'done' ? 'done' : ''}`}
                onClick={() => onToggle(todo.id)}>
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    todo.status === 'done' ? 'bg-[var(--success)] border-[var(--success)]' : 'border-[var(--border)]'
                  }`}>
                    {todo.status === 'done' && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${todo.status === 'done' ? 'line-through text-[var(--text3)]' : ''}`}>{todo.task}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[var(--text3)]">{getSubjectEmoji(todo.subject)} {todo.subject}</span>
                      <span className="text-[10px] text-[var(--text3)]">⏱ {todo.estimatedMinutes}分</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mt-6 fade-up-4">
        <button className="card !p-4 text-left" onClick={() => onNavigate('weekly')}>
          <span className="text-lg">📅</span>
          <p className="text-sm font-medium mt-1">週間カレンダー</p>
          <p className="text-[10px] text-[var(--text3)]">今週の予定を確認</p>
        </button>
        <button className="card !p-4 text-left" onClick={() => onNavigate('chat')}>
          <span className="text-lg">💬</span>
          <p className="text-sm font-medium mt-1">AIに相談</p>
          <p className="text-[10px] text-[var(--text3)]">計画の修正・相談</p>
        </button>
      </div>
    </div>
  );
}

// ─── Weekly Calendar ───
function WeeklyCalendar({ todos, onToggle }: { todos: Todo[]; onToggle: (id: string) => void }) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().split('T')[0];
  });
  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="px-5 pt-8 pb-24">
      <h1 className="text-xl font-bold mb-1 fade-up">📅 週間カレンダー</h1>
      <p className="text-sm text-[var(--text2)] mb-5 fade-up">{formatDate(days[0])}（月）〜 {formatDate(days[6])}（日）</p>

      <div className="space-y-3">
        {days.map((day, i) => {
          const dayTodos = todos.filter(t => t.dueDate === day);
          const isToday = day === todayStr;
          return (
            <div key={day} className={`cal-day ${isToday ? 'today' : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-[var(--accent)] text-white' : 'text-[var(--text2)]'}`}>
                    {getDayLabel(day)}
                  </span>
                  <span className="text-xs text-[var(--text3)]">{formatDate(day)}</span>
                </div>
                <span className="text-[10px] text-[var(--text3)]">
                  {dayTodos.filter(t => t.status === 'done').length}/{dayTodos.length}
                </span>
              </div>
              {dayTodos.length === 0 ? (
                <p className="text-xs text-[var(--text3)] italic">タスクなし</p>
              ) : (
                <div className="space-y-1">
                  {dayTodos.map(todo => (
                    <div key={todo.id} className="flex items-center gap-2 cursor-pointer" onClick={() => onToggle(todo.id)}>
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${todo.status === 'done' ? 'bg-[var(--success)]' : 'border border-[var(--border)]'}`} />
                      <span className={`text-xs truncate ${todo.status === 'done' ? 'line-through text-[var(--text3)]' : ''}`}>
                        {getSubjectEmoji(todo.subject)} {todo.task}
                      </span>
                      <span className="text-[10px] text-[var(--text3)] ml-auto flex-shrink-0">{todo.estimatedMinutes}分</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Plan View ───
function PlanView({ plan, onGenerate }: { plan: StudyPlan | null; onGenerate: (type: 'long_term' | 'mock_exam', mockName?: string) => void }) {
  const [genType, setGenType] = useState<'long_term' | 'mock_exam'>('long_term');
  const [mockName, setMockName] = useState('');

  return (
    <div className="px-5 pt-8 pb-24">
      <h1 className="text-xl font-bold mb-5 fade-up">🗺️ 学習プラン</h1>

      {/* Generate buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6 fade-up-1">
        <button className="card !p-4 text-center" onClick={() => onGenerate('long_term')}>
          <span className="text-2xl">🏔️</span>
          <p className="text-sm font-medium mt-2">長期プラン生成</p>
          <p className="text-[10px] text-[var(--text3)]">合格までのルート</p>
        </button>
        <button className="card !p-4 text-center" onClick={() => {
          const name = prompt('模試名を入力（例: 7月模試）');
          if (name) onGenerate('mock_exam', name);
        }}>
          <span className="text-2xl">🎯</span>
          <p className="text-sm font-medium mt-2">模試対策生成</p>
          <p className="text-[10px] text-[var(--text3)]">直近の模試に向けて</p>
        </button>
      </div>

      {/* Current plan display */}
      {plan && (
        <div className="fade-up-2">
          <h2 className="text-sm font-medium text-[var(--text2)] mb-3">
            {plan.type === 'long_term' ? '📈 長期プラン' : `🎯 模試対策: ${plan.mockExamName}`}
          </h2>
          <div className="space-y-3">
            {plan.phases.map((phase, i) => (
              <div key={i} className="card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium">{phase.name}</span>
                </div>
                <p className="text-xs text-[var(--text2)] mb-1">{formatDate(phase.startDate)} 〜 {formatDate(phase.endDate)}</p>
                <p className="text-xs text-[var(--text3)]">{phase.targetDescription}</p>
                <div className="flex gap-1 mt-2">
                  {phase.focusSubjects.map(s => (
                    <span key={s} className="text-[10px] bg-[var(--bg3)] px-2 py-0.5 rounded-full">{getSubjectEmoji(s)} {s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chat View ───
function ChatView({ profile, todos }: { profile: UserProfile; todos: Todo[] }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const summary = calcWeekSummary(todos, getCurrentWeek());
  const context = `学年: ${profile.grade}, 文理: ${profile.stream}, 科目: ${profile.subjects.join('・')}, 今週の完了率: ${summary.totalTodos > 0 ? Math.round(summary.completedTodos / summary.totalTodos * 100) : 0}%`;

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], context }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let aiText = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            aiText += JSON.parse(data).content || '';
            setMessages(prev => {
              const m = [...prev];
              m[m.length - 1] = { role: 'assistant', content: aiText };
              return m;
            });
          } catch {}
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度試してください。' }]);
    }
    setStreaming(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="px-5 pt-8 pb-3">
        <h1 className="text-xl font-bold fade-up">💬 AIコーチに相談</h1>
        <p className="text-xs text-[var(--text3)] fade-up">計画の修正、勉強法、やる気が出ない時…なんでもOK</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-12 fade-up">
            <p className="text-3xl mb-3">🤖</p>
            <p className="text-sm text-[var(--text2)]">何でも聞いてね！</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['英語の勉強法を教えて', '今週の計画を見直したい', 'やる気が出ない…'].map(q => (
                <button key={q} className="chip text-xs" onClick={() => { setInput(q); }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={m.role === 'user' ? 'chat-user' : 'chat-ai'}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 pb-24 pt-2 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="メッセージを入力..."
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            className="flex-1 !rounded-full !px-4 !py-3 !text-sm" />
          <button onClick={send} disabled={!input.trim() || streaming}
            className="w-11 h-11 rounded-full bg-[var(--accent)] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-30">
            <span className="text-sm">↑</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading Screen ───
function Loading({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 bg-[var(--bg)] z-50 flex flex-col items-center justify-center gap-4">
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-3 h-3 rounded-full bg-[var(--accent)]"
            style={{ animation: `pulse-ring 1.4s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <p className="text-sm text-[var(--text2)]">{message}</p>
    </div>
  );
}

// ─── Main App ───
export default function Home() {
  const [view, setView] = useState<AppView>('onboarding');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const p = load<UserProfile>('profile');
    const t = load<Todo[]>('todos');
    const pl = load<StudyPlan>('plan');
    if (p) setProfile(p);
    if (t) setTodos(t);
    if (pl) setPlan(pl);
    if (p && t && t.length > 0) setView('dashboard');
  }, []);

  // Save to localStorage on change
  useEffect(() => { if (profile) save('profile', profile); }, [profile]);
  useEffect(() => { save('todos', todos); }, [todos]);
  useEffect(() => { if (plan) save('plan', plan); }, [plan]);

  const streak = calcStreak(todos);

  const handleOnboardingComplete = async (p: UserProfile) => {
    setProfile(p);
    await generatePlan(p, 'long_term');
  };

  const generatePlan = async (p: UserProfile, type: 'long_term' | 'mock_exam', mockName?: string) => {
    setLoading(type === 'long_term' ? '🏔️ 合格ルートを計算中...' : '🎯 模試対策を作成中...');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p, planType: type, mockExamName: mockName }),
      });
      if (!res.ok) throw new Error('Plan generation failed');
      const data = await res.json();

      const newTodos: Todo[] = (data.todos || []).map((t: Partial<Todo>, i: number) => ({
        ...t,
        id: generateId(),
        status: 'pending' as const,
        weekOf: t.dueDate ? (() => { const d = new Date(t.dueDate!); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]; })() : getCurrentWeek(),
        order: t.order || i,
      }));

      const newPlan: StudyPlan = {
        id: generateId(),
        type,
        createdAt: new Date().toISOString(),
        phases: data.phases || [],
        todos: newTodos,
        mockExamName: mockName,
      };

      setPlan(newPlan);
      setTodos(prev => [...prev.filter(t => t.status === 'done'), ...newTodos]); // keep completed, replace pending
      setView('dashboard');
    } catch (e) {
      alert('プラン生成に失敗しました。もう一度お試しください。');
      console.error(e);
    }
    setLoading('');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? {
        ...t,
        status: t.status === 'done' ? 'pending' : 'done',
        completedAt: t.status === 'done' ? undefined : new Date().toISOString(),
      } : t
    ));
  };

  if (loading) return <Loading message={loading} />;

  return (
    <>
      {view === 'onboarding' && <Onboarding onComplete={handleOnboardingComplete} />}
      {view === 'dashboard' && profile && (
        <Dashboard todos={todos} profile={profile} streak={streak} onToggle={toggleTodo} onNavigate={setView} />
      )}
      {view === 'weekly' && <WeeklyCalendar todos={todos} onToggle={toggleTodo} />}
      {view === 'plan' && <PlanView plan={plan} onGenerate={(type, mockName) => profile && generatePlan(profile, type, mockName)} />}
      {view === 'chat' && profile && <ChatView profile={profile} todos={todos} />}
      <BottomNav view={view} onNavigate={setView} hasPlan={!!plan} />
    </>
  );
}
