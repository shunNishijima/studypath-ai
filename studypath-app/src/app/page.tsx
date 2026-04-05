'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { GRADES, STREAMS, SUBJECTS, MOCK_EXAMS, EXAM_TYPES } from '@/lib/constants';
import { getCurrentWeek, formatDate, getDayLabel, calcWeekSummary, calcStreak, getSubjectEmoji, generateId } from '@/lib/utils';
import type { UserProfile, Todo, StudyPlan, AppView, Goal, DungeonProgress } from '@/types';

const STORAGE = 'studypath_v3';

function save(key: string, data: unknown) {
  try { localStorage.setItem(`${STORAGE}_${key}`, JSON.stringify(data)); } catch {}
}
function load<T>(key: string): T | null {
  try { const d = localStorage.getItem(`${STORAGE}_${key}`); return d ? JSON.parse(d) : null; } catch { return null; }
}

// ─── Helpers ───

function getQuestIcon(questType?: string): string {
  switch (questType) {
    case 'boss': return '👹';
    case 'checkpoint': return '🏁';
    default: return '⚔️';
  }
}

function getQuestBorder(questType?: string): string {
  switch (questType) {
    case 'boss': return 'border-l-4 border-l-red-500';
    case 'checkpoint': return 'border-l-4 border-l-yellow-500';
    default: return 'border-l-4 border-l-[var(--accent)]';
  }
}

/** Calculate dungeon (material) progress from todos */
function calcDungeonProgress(todos: Todo[]): DungeonProgress[] {
  const byMaterial = new Map<string, { todos: Todo[]; materialName: string; subject: string }>();
  for (const t of todos) {
    if (!t.materialId) continue;
    if (!byMaterial.has(t.materialId)) {
      byMaterial.set(t.materialId, { todos: [], materialName: t.material, subject: t.subject });
    }
    byMaterial.get(t.materialId)!.todos.push(t);
  }

  const dungeons: DungeonProgress[] = [];
  for (const [materialId, { todos: mTodos, materialName, subject }] of byMaterial) {
    const maxStep = Math.max(...mTodos.map(t => t.stepIndex ?? 0));
    const completedSteps = new Set(mTodos.filter(t => t.status === 'done').map(t => t.stepIndex)).size;
    const currentStep = Math.min(...mTodos.filter(t => t.status !== 'done').map(t => t.stepIndex ?? 0));
    dungeons.push({
      materialId,
      materialName,
      subject,
      totalSteps: maxStep + 1,
      completedSteps,
      currentStepIndex: currentStep,
    });
  }
  return dungeons.sort((a, b) => {
    const aProgress = a.completedSteps / a.totalSteps;
    const bProgress = b.completedSteps / b.totalSteps;
    if (aProgress === 1 && bProgress !== 1) return 1;
    if (bProgress === 1 && aProgress !== 1) return -1;
    return bProgress - aProgress;
  });
}

// ─── Bottom Navigation ───
function BottomNav({ view, onNavigate, hasPlan }: { view: AppView; onNavigate: (v: AppView) => void; hasPlan: boolean }) {
  if (!hasPlan) return null;
  const items: { id: AppView; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'ホーム', icon: '🏠' },
    { id: 'weekly', label: 'カレンダー', icon: '📅' },
    { id: 'plan', label: 'プラン', icon: '🗺️' },
    { id: 'chat', label: 'AI相談', icon: '💬' },
    { id: 'profile', label: 'ステータス', icon: '👤' },
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
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white text-lg">📚</div>
          <div>
            <h1 className="text-lg font-bold">StudyPath AI</h1>
            <p className="text-xs text-[var(--text3)]">受験の最短ルートをAIが作成</p>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-[var(--accent)]' : 'bg-[var(--bg3)]'}`} />
          ))}
        </div>
        <p className="text-xs text-[var(--text3)]">ステップ {step + 1} / {totalSteps}</p>
      </div>

      <div className="flex-1 px-5 pb-8">
        {step === 0 && (
          <div className="fade-up space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">まずは基本情報から</h2>
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
                  {['2時間', '3時間', '4時間', '5時���', '6時間', '8時間以上'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" disabled={!p.grade || !p.stream || !p.weekdayHours || !p.weekendHours}
              onClick={() => setStep(1)}>次へ →</button>
          </div>
        )}

        {step === 1 && (
          <div className="fade-up space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">受験科目を選ぼう</h2>
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

        {step === 2 && (
          <div className="fade-up space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">志望校を設定</h2>
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

        {step === 3 && (
          <div className="fade-up space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">成績を入力</h2>
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
                冒険を始める！
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Todo Card ───
function TodoCard({ todo, onToggle }: { todo: Todo; onToggle: (id: string) => void }) {
  const isDone = todo.status === 'done';
  const isBoss = todo.questType === 'boss';
  const isCheckpoint = todo.questType === 'checkpoint';

  return (
    <div className={`todo-card ${isDone ? 'done' : ''} ${getQuestBorder(todo.questType)}`}
      onClick={() => onToggle(todo.id)}>
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
          isDone ? 'bg-[var(--success)] border-[var(--success)]' :
          isBoss ? 'border-red-500' :
          isCheckpoint ? 'border-yellow-500' :
          'border-[var(--border)]'
        }`}>
          {isDone ? <span className="text-white text-[10px]">✓</span> :
           <span className="text-[10px]">{getQuestIcon(todo.questType)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isBoss && <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">BOSS</span>}
            {isCheckpoint && <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded">復習</span>}
          </div>
          <p className={`text-sm mt-0.5 ${isDone ? 'line-through text-[var(--text3)]' : isBoss ? 'font-bold' : ''}`}>
            {todo.task}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-[var(--text3)]">{getSubjectEmoji(todo.subject)} {todo.subject}</span>
            <span className="text-[10px] text-[var(--text3)]">{todo.material}</span>
            <span className="text-[10px] text-[var(--text3)] ml-auto">{todo.estimatedMinutes}分</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dungeon Progress Card ───
function DungeonCard({ dungeon }: { dungeon: DungeonProgress }) {
  const pct = dungeon.totalSteps > 0 ? Math.round(dungeon.completedSteps / dungeon.totalSteps * 100) : 0;
  const isCleared = pct === 100;

  return (
    <div className={`card !p-3 min-w-[160px] flex-shrink-0 ${isCleared ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{isCleared ? '🏆' : getSubjectEmoji(dungeon.subject)}</span>
        <span className="text-xs font-medium truncate">{dungeon.materialName}</span>
      </div>
      <div className="progress-track !h-2">
        <div className={`progress-fill ${isCleared ? '!bg-[var(--success)]' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-[var(--text3)]">{dungeon.completedSteps}/{dungeon.totalSteps}</span>
        <span className={`text-[10px] font-bold ${isCleared ? 'text-[var(--success)]' : 'text-[var(--accent)]'}`}>
          {isCleared ? 'CLEAR!' : `${pct}%`}
        </span>
      </div>
    </div>
  );
}

// ─── Dashboard ───
function Dashboard({ todos, streak, onToggle, onNavigate }: {
  todos: Todo[];
  streak: number;
  onToggle: (id: string) => void;
  onNavigate: (v: AppView) => void;
}) {
  const week = getCurrentWeek();
  const summary = calcWeekSummary(todos, week);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTodos = todos.filter(t => t.dueDate === todayStr).sort((a, b) => {
    // Boss quests last, then by order
    if (a.questType === 'boss' && b.questType !== 'boss') return 1;
    if (b.questType === 'boss' && a.questType !== 'boss') return -1;
    return a.order - b.order;
  });
  const pct = summary.totalTodos > 0 ? Math.round(summary.completedTodos / summary.totalTodos * 100) : 0;

  // Dungeon progress
  const dungeons = useMemo(() => calcDungeonProgress(todos), [todos]);
  const activeDungeons = dungeons.filter(d => d.completedSteps < d.totalSteps);
  const clearedDungeons = dungeons.filter(d => d.completedSteps >= d.totalSteps);

  // Overall quest stats
  const totalQuests = todos.length;
  const doneQuests = todos.filter(t => t.status === 'done').length;
  const bossQuests = todos.filter(t => t.questType === 'boss');
  const clearedBosses = bossQuests.filter(t => t.status === 'done').length;

  // Level calculation (1 level per 5 completed quests)
  const level = Math.floor(doneQuests / 5) + 1;
  const xpInLevel = doneQuests % 5;

  return (
    <div className="px-5 pt-8 pb-24">
      {/* Header with level */}
      <div className="flex items-center justify-between mb-5 fade-up">
        <div>
          <p className="text-sm text-[var(--text2)]">おかえり！冒険者</p>
          <h1 className="text-xl font-bold">Lv.{level} の冒険</h1>
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

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 mb-5 fade-up-1">
        <div className="card !p-3 text-center">
          <p className="text-lg font-bold text-[var(--accent)]">{doneQuests}/{totalQuests}</p>
          <p className="text-[10px] text-[var(--text3)]">クエスト</p>
        </div>
        <div className="card !p-3 text-center">
          <p className="text-lg font-bold text-red-400">{clearedBosses}/{bossQuests.length}</p>
          <p className="text-[10px] text-[var(--text3)]">ボス討伐</p>
        </div>
        <div className="card !p-3 text-center">
          <p className="text-lg font-bold text-[var(--success)]">{clearedDungeons.length}/{dungeons.length}</p>
          <p className="text-[10px] text-[var(--text3)]">教材クリア</p>
        </div>
      </div>

      {/* XP progress to next level */}
      <div className="card card-glow mb-5 fade-up-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium">Lv.{level} → Lv.{level + 1}</span>
          <span className="text-xs text-[var(--accent)]">{xpInLevel}/5 XP</span>
        </div>
        <div className="progress-track !h-2">
          <div className="progress-fill" style={{ width: `${xpInLevel / 5 * 100}%` }} />
        </div>
      </div>

      {/* Weekly progress */}
      <div className="card mb-5 fade-up-2">
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

      {/* Active dungeons */}
      {activeDungeons.length > 0 && (
        <div className="mb-5 fade-up-2">
          <h2 className="text-sm font-medium text-[var(--text2)] mb-3">📖 攻略中のダンジョン</h2>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {activeDungeons.map(d => <DungeonCard key={d.materialId} dungeon={d} />)}
          </div>
        </div>
      )}

      {/* Today's quests */}
      <div className="fade-up-3">
        <h2 className="text-sm font-medium text-[var(--text2)] mb-3">
          今日のクエスト ({todayTodos.filter(t => t.status === 'done').length}/{todayTodos.length})
        </h2>
        {todayTodos.length === 0 ? (
          <div className="card text-center py-6 mb-3">
            <p className="text-2xl mb-1">✅</p>
            <p className="text-sm text-[var(--text2)]">今日の分はクリア済み！</p>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            {todayTodos.map(todo => (
              <TodoCard key={todo.id} todo={todo} onToggle={onToggle} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming quests - show next pending tasks beyond today */}
      {(() => {
        const upcomingTodos = todos
          .filter(t => t.status !== 'done' && t.dueDate > todayStr)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.order - b.order)
          .slice(0, 8);
        if (upcomingTodos.length === 0) return null;

        const todayAllDone = todayTodos.length > 0 && todayTodos.every(t => t.status === 'done');
        return (
          <div className="fade-up-3 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-[var(--text2)]">
                {todayAllDone ? '先に進もう！' : '次のクエスト'}
              </h2>
              {todayAllDone && (
                <span className="text-[10px] bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full font-medium">
                  前倒しOK
                </span>
              )}
            </div>
            <div className="space-y-2">
              {upcomingTodos.map(todo => (
                <div key={todo.id} className="relative">
                  <div className="absolute left-0 top-0 text-[9px] text-[var(--text3)] bg-[var(--bg3)] px-1.5 py-0.5 rounded-br-lg rounded-tl-lg z-10">
                    {formatDate(todo.dueDate)}
                  </div>
                  <TodoCard todo={todo} onToggle={onToggle} />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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

// ���── Weekly Calendar ───
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
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        todo.status === 'done' ? 'bg-[var(--success)]' :
                        todo.questType === 'boss' ? 'border-2 border-red-500' :
                        'border border-[var(--border)]'
                      }`} />
                      <span className={`text-xs truncate ${todo.status === 'done' ? 'line-through text-[var(--text3)]' : ''}`}>
                        {todo.questType === 'boss' ? '👹 ' : ''}{getSubjectEmoji(todo.subject)} {todo.task}
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
function PlanView({ plans, todos, onGenerate }: {
  plans: Record<string, StudyPlan>;
  todos: Todo[];
  onGenerate: (type: 'long_term' | 'mock_exam', mockName?: string) => void;
}) {
  const longTerm = plans['long_term'] || null;
  const mockExam = plans['mock_exam'] || null;
  const dungeons = useMemo(() => calcDungeonProgress(todos), [todos]);
  const [activeTab, setActiveTab] = useState<'overview' | 'long_term' | 'mock_exam'>('overview');

  // Group dungeons by subject
  const dungeonsBySubject = useMemo(() => {
    const grouped: Record<string, DungeonProgress[]> = {};
    for (const d of dungeons) {
      const sub = d.subject;
      if (!grouped[sub]) grouped[sub] = [];
      grouped[sub].push(d);
    }
    return grouped;
  }, [dungeons]);

  // Calculate per-subject overall progress
  const subjectProgress = useMemo(() => {
    const result: Record<string, { done: number; total: number }> = {};
    for (const [sub, ds] of Object.entries(dungeonsBySubject)) {
      const total = ds.reduce((s, d) => s + d.totalSteps, 0);
      const done = ds.reduce((s, d) => s + d.completedSteps, 0);
      result[sub] = { done, total };
    }
    return result;
  }, [dungeonsBySubject]);

  // Determine current phase based on today's date
  const getCurrentPhaseIndex = (plan: StudyPlan) => {
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < plan.phases.length; i++) {
      if (today >= plan.phases[i].startDate && today <= plan.phases[i].endDate) return i;
    }
    return 0;
  };

  const renderMilestones = (plan: StudyPlan, label: string) => {
    const currentIdx = getCurrentPhaseIndex(plan);
    const today = new Date().toISOString().split('T')[0];
    return (
      <div className="mb-6">
        <h2 className="text-sm font-medium text-[var(--text2)] mb-3">{label}</h2>
        {/* Timeline */}
        <div className="relative">
          {plan.phases.map((phase, i) => {
            const isPast = today > phase.endDate;
            const isCurrent = i === currentIdx;
            const phaseTodos = todos.filter(t => t.phase === phase.name);
            const phaseDone = phaseTodos.filter(t => t.status === 'done').length;
            const phasePct = phaseTodos.length > 0 ? Math.round(phaseDone / phaseTodos.length * 100) : 0;

            return (
              <div key={i} className="flex gap-3 mb-4 last:mb-0">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                    isPast ? 'bg-[var(--success)] text-white' :
                    isCurrent ? 'bg-[var(--accent)] text-white ring-2 ring-[var(--accent)]/30' :
                    'bg-[var(--bg3)] text-[var(--text3)]'
                  }`}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  {i < plan.phases.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[20px] ${isPast ? 'bg-[var(--success)]' : 'bg-[var(--bg3)]'}`} />
                  )}
                </div>
                {/* Content */}
                <div className={`card !p-3 flex-1 ${isCurrent ? 'card-glow' : ''} ${isPast ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${isCurrent ? 'text-[var(--accent)]' : ''}`}>
                      {isCurrent && '▶ '}{phase.name}
                    </span>
                    {phaseTodos.length > 0 && (
                      <span className="text-[10px] font-bold text-[var(--accent)]">{phasePct}%</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text3)] mb-1">{formatDate(phase.startDate)} 〜 {formatDate(phase.endDate)}</p>
                  <p className="text-[10px] text-[var(--text2)]">{phase.targetDescription}</p>
                  {phaseTodos.length > 0 && (
                    <div className="progress-track !h-1 mt-2">
                      <div className="progress-fill" style={{ width: `${phasePct}%` }} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {phase.focusSubjects.map(s => (
                      <span key={s} className="text-[10px] bg-[var(--bg3)] px-1.5 py-0.5 rounded-full">{getSubjectEmoji(s)} {s}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="px-5 pt-8 pb-24">
      <h1 className="text-xl font-bold mb-4 fade-up">冒険の地図</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[var(--bg2)] rounded-lg p-1 fade-up-1">
        {([
          { id: 'overview' as const, label: '科目別進捗' },
          ...(longTerm ? [{ id: 'long_term' as const, label: '長期プラン' }] : []),
          ...(mockExam ? [{ id: 'mock_exam' as const, label: '模試対策' }] : []),
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-xs py-2 rounded-md transition-all ${activeTab === tab.id ? 'bg-[var(--bg3)] font-medium' : 'text-[var(--text3)]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6 fade-up-1">
        <button className="card !p-3 text-center" onClick={() => onGenerate('long_term')}>
          <span className="text-xl">🏔️</span>
          <p className="text-xs font-medium mt-1">長期プラン{longTerm ? '再生成' : '生成'}</p>
        </button>
        <button className="card !p-3 text-center" onClick={() => {
          const name = prompt('模試名を入力（例: 7月模試）');
          if (name) onGenerate('mock_exam', name);
        }}>
          <span className="text-xl">🎯</span>
          <p className="text-xs font-medium mt-1">模試対策{mockExam ? '再生成' : '生成'}</p>
        </button>
      </div>

      {/* Overview tab - by subject */}
      {activeTab === 'overview' && (
        <div className="fade-up-2">
          {Object.entries(dungeonsBySubject).map(([subject, subDungeons]) => {
            const sp = subjectProgress[subject];
            const subPct = sp.total > 0 ? Math.round(sp.done / sp.total * 100) : 0;
            return (
              <div key={subject} className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{getSubjectEmoji(subject)}</span>
                  <span className="text-sm font-medium flex-1">{subject}</span>
                  <span className="text-xs font-bold text-[var(--accent)]">{subPct}%</span>
                </div>
                <div className="progress-track !h-1.5 mb-3">
                  <div className="progress-fill" style={{ width: `${subPct}%` }} />
                </div>
                <div className="space-y-1.5 pl-2 border-l-2 border-[var(--bg3)]">
                  {subDungeons.map(d => {
                    const pct = d.totalSteps > 0 ? Math.round(d.completedSteps / d.totalSteps * 100) : 0;
                    const isCleared = pct === 100;
                    return (
                      <div key={d.materialId} className={`flex items-center gap-2 py-1 ${isCleared ? 'opacity-50' : ''}`}>
                        <span className="text-[10px]">{isCleared ? '🏆' : pct > 0 ? '📖' : '📕'}</span>
                        <span className="text-xs flex-1 truncate">{d.materialName}</span>
                        <div className="w-16">
                          <div className="progress-track !h-1">
                            <div className={`progress-fill ${isCleared ? '!bg-[var(--success)]' : ''}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className={`text-[10px] w-8 text-right font-medium ${isCleared ? 'text-[var(--success)]' : 'text-[var(--text3)]'}`}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Long-term plan tab */}
      {activeTab === 'long_term' && longTerm && (
        <div className="fade-up-2">
          {renderMilestones(longTerm, '📈 マイルストーン')}
        </div>
      )}

      {/* Mock exam plan tab */}
      {activeTab === 'mock_exam' && mockExam && (
        <div className="fade-up-2">
          {renderMilestones(mockExam, `🎯 模試対策: ${mockExam.mockExamName}`)}
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
  const context = `学年: ${profile.grade}, 文理: ${profile.stream}, 科目: ${profile.subjects.join('・')}, 今���の完了率: ${summary.totalTodos > 0 ? Math.round(summary.completedTodos / summary.totalTodos * 100) : 0}%`;

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
    } catch {
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

// ─── Profile Editor ───
function ProfileEditor({ profile, onSave }: {
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
}) {
  const [p, setP] = useState<UserProfile>({ ...profile });
  const [saved, setSaved] = useState(false);

  const avail = [...SUBJECTS.common, ...(SUBJECTS[p.stream] || SUBJECTS['文系'])];
  const toggleSub = (s: string) => {
    if (s === '英語') return;
    setP({ ...p, subjects: p.subjects.includes(s) ? p.subjects.filter(x => x !== s) : [...p.subjects, s] });
  };

  const updScore = (sub: string, f: string, v: string) => {
    setP({ ...p, scores: { ...p.scores, [sub]: { ...(p.scores[sub] || {}), [f]: v } } });
  };

  const updGoal = (i: number, f: keyof Goal, v: string | number) => {
    const g = [...p.goals]; g[i] = { ...g[i], [f]: v }; setP({ ...p, goals: g });
  };
  const addGoal = () => setP({ ...p, goals: [...p.goals, { school: '', faculty: '', examType: '一般入試', priority: p.goals.length + 1 }] });
  const rmGoal = (i: number) => setP({ ...p, goals: p.goals.filter((_, j) => j !== i) });

  const handleSave = () => {
    onSave(p);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-5 pt-8 pb-24">
      <h1 className="text-xl font-bold mb-5 fade-up">👤 ステータス</h1>

      {/* Basic info */}
      <div className="card mb-4 fade-up-1">
        <h2 className="text-sm font-medium mb-3">基本情報</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-[var(--text3)] mb-1 block">学年</label>
            <div className="flex flex-wrap gap-1">
              {GRADES.map(g => (
                <button key={g} onClick={() => setP({ ...p, grade: g })}
                  className={`chip text-xs ${p.grade === g ? 'active' : ''}`}>{g}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text3)] mb-1 block">文理</label>
            <div className="flex gap-1">
              {STREAMS.map(s => (
                <button key={s} onClick={() => setP({ ...p, stream: s })}
                  className={`chip text-xs ${p.stream === s ? 'active' : ''}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[var(--text3)] mb-1 block">平日学習時間</label>
            <select value={p.weekdayHours} onChange={e => setP({ ...p, weekdayHours: e.target.value })} className="text-xs">
              {['1時間', '2時間', '3時間', '4時間', '5時間以上'].map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text3)] mb-1 block">休日学習時間</label>
            <select value={p.weekendHours} onChange={e => setP({ ...p, weekendHours: e.target.value })} className="text-xs">
              {['2時間', '3時間', '4時間', '5時間', '6時間', '8時間以上'].map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Subjects */}
      <div className="card mb-4 fade-up-1">
        <h2 className="text-sm font-medium mb-3">受験科目</h2>
        <div className="flex flex-wrap gap-1.5">
          {avail.map(s => (
            <button key={s} onClick={() => toggleSub(s)}
              className={`chip text-xs ${p.subjects.includes(s) ? 'active' : ''}`}>
              {getSubjectEmoji(s)} {s}
            </button>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div className="card mb-4 fade-up-2">
        <h2 className="text-sm font-medium mb-3">志望校</h2>
        <div className="space-y-3">
          {p.goals.map((g, i) => (
            <div key={i} className="bg-[var(--bg2)] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-[var(--accent)]">第{i + 1}志望</span>
                {i > 0 && <button onClick={() => rmGoal(i)} className="text-[10px] text-[var(--text3)]">削除</button>}
              </div>
              <div className="space-y-1.5">
                <input placeholder="大学名" value={g.school} onChange={e => updGoal(i, 'school', e.target.value)} className="text-xs" />
                <input placeholder="学部・学科" value={g.faculty} onChange={e => updGoal(i, 'faculty', e.target.value)} className="text-xs" />
                <select value={g.examType} onChange={e => updGoal(i, 'examType', e.target.value)} className="text-xs">
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
        {p.goals.length < 3 && (
          <button onClick={addGoal} className="text-xs text-[var(--accent)] mt-2">+ 志望校を追加</button>
        )}
      </div>

      {/* Scores */}
      <div className="card mb-4 fade-up-2">
        <h2 className="text-sm font-medium mb-3">成績・偏差値</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-[var(--text3)] mb-1 block">総合偏差値</label>
            <input type="number" placeholder="52" value={p.totalDeviation || ''} onChange={e => setP({ ...p, totalDeviation: e.target.value })} className="text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text3)] mb-1 block">模試名</label>
            <input placeholder="河合全統マーク" value={p.examName || ''} onChange={e => setP({ ...p, examName: e.target.value })} className="text-xs" />
          </div>
        </div>
        <div className="space-y-2">
          {p.subjects.map(sub => (
            <div key={sub} className="bg-[var(--bg2)] rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">{getSubjectEmoji(sub)}</span>
                <span className="text-xs font-medium">{sub}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[10px] text-[var(--text3)]">偏差値</label>
                  <input type="number" placeholder="55" value={p.scores[sub]?.deviation || ''} onChange={e => updScore(sub, 'deviation', e.target.value)} className="text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text3)]">得点</label>
                  <input type="number" placeholder="72" value={p.scores[sub]?.score || ''} onChange={e => updScore(sub, 'score', e.target.value)} className="text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text3)]">満点</label>
                  <input type="number" placeholder="100" value={p.scores[sub]?.maxScore || ''} onChange={e => updScore(sub, 'maxScore', e.target.value)} className="text-xs" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next exam */}
      <div className="card mb-6 fade-up-3">
        <h2 className="text-sm font-medium mb-3">次の模試</h2>
        <div className="flex flex-wrap gap-1.5">
          {MOCK_EXAMS.map(m => (
            <button key={m} onClick={() => setP({ ...p, nextExam: m })}
              className={`chip text-xs ${p.nextExam === m ? 'active' : ''}`}>{m}</button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="space-y-3 fade-up-3">
        <button className="btn-primary w-full" onClick={handleSave}>
          {saved ? '保存しました！' : 'ステータスを保存'}
        </button>
        <p className="text-[10px] text-[var(--text3)] text-center">
          保存後、プランタブからプランを再生成すると新しい成績が反映されます
        </p>
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
  const [plans, setPlans] = useState<Record<string, StudyPlan>>({});
  const [loading, setLoading] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const p = load<UserProfile>('profile');
    const t = load<Todo[]>('todos');
    const pl = load<Record<string, StudyPlan>>('plans') || (() => {
      const old = load<StudyPlan>('plan');
      return old ? { [old.type]: old } : {};
    })();
    if (p) setProfile(p);
    if (t) setTodos(t);
    if (Object.keys(pl).length > 0) setPlans(pl);
    if (p && t && t.length > 0) setView('dashboard');
  }, []);

  // Save to localStorage on change
  useEffect(() => { if (profile) save('profile', profile); }, [profile]);
  useEffect(() => { save('todos', todos); }, [todos]);
  useEffect(() => { if (Object.keys(plans).length > 0) save('plans', plans); }, [plans]);

  const streak = calcStreak(todos);

  const handleOnboardingComplete = async (p: UserProfile) => {
    setProfile(p);
    await generatePlan(p, 'long_term');
  };

  const generatePlan = async (p: UserProfile, type: 'long_term' | 'mock_exam', mockName?: string) => {
    setLoading(type === 'long_term' ? '🏔️ 冒険ルートを計算中...' : '🎯 模試対策クエストを作成中...');
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
        planType: type,
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

      setPlans(prev => ({ ...prev, [type]: newPlan }));
      setTodos(prev => [...prev.filter(t => t.planType !== type), ...newTodos]);
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
        <Dashboard todos={todos} streak={streak} onToggle={toggleTodo} onNavigate={setView} />
      )}
      {view === 'weekly' && <WeeklyCalendar todos={todos} onToggle={toggleTodo} />}
      {view === 'plan' && <PlanView plans={plans} todos={todos} onGenerate={(type, mockName) => profile && generatePlan(profile, type, mockName)} />}
      {view === 'chat' && profile && <ChatView profile={profile} todos={todos} />}
      {view === 'profile' && profile && (
        <ProfileEditor profile={profile} onSave={setProfile} />
      )}
      <BottomNav view={view} onNavigate={setView} hasPlan={Object.keys(plans).length > 0} />
    </>
  );
}
