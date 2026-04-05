import { Todo, WeekSummary } from '@/types';

export function getWeekOf(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return d.toISOString().split('T')[0];
}

export function getCurrentWeek(): string {
  return getWeekOf(new Date());
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function getDayLabel(dateStr: string): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[new Date(dateStr).getDay()];
}

export function calcWeekSummary(todos: Todo[], weekOf: string): WeekSummary {
  const weekTodos = todos.filter(t => t.weekOf === weekOf);
  const bySubject: Record<string, { total: number; completed: number }> = {};

  for (const t of weekTodos) {
    if (!bySubject[t.subject]) bySubject[t.subject] = { total: 0, completed: 0 };
    bySubject[t.subject].total++;
    if (t.status === 'done') bySubject[t.subject].completed++;
  }

  return {
    weekOf,
    totalTodos: weekTodos.length,
    completedTodos: weekTodos.filter(t => t.status === 'done').length,
    totalMinutes: weekTodos.reduce((s, t) => s + t.estimatedMinutes, 0),
    completedMinutes: weekTodos.filter(t => t.status === 'done').reduce((s, t) => s + t.estimatedMinutes, 0),
    bySubject,
  };
}

export function calcStreak(todos: Todo[]): number {
  const doneDates = new Set(
    todos.filter(t => t.status === 'done' && t.completedAt)
      .map(t => t.completedAt!.split('T')[0])
  );
  
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (doneDates.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function getSubjectColor(subject: string): string {
  const colors: Record<string, string> = {
    '英語': 'bg-blue-500',
    '国語': 'bg-pink-500',
    '国語(現代文)': 'bg-pink-500',
    '国語(古文)': 'bg-pink-400',
    '国語(漢文)': 'bg-pink-300',
    '数学IA': 'bg-amber-500',
    '数学IIB': 'bg-amber-600',
    '数学III': 'bg-amber-700',
    '物理': 'bg-emerald-500',
    '化学': 'bg-teal-500',
    '生物': 'bg-green-500',
    '地学': 'bg-cyan-500',
    '日本史': 'bg-red-400',
    '世界史': 'bg-orange-400',
    '地理': 'bg-lime-500',
    '政治経済': 'bg-violet-500',
    '倫理': 'bg-purple-400',
    '現代社会': 'bg-indigo-400',
    '情報': 'bg-sky-500',
  };
  return colors[subject] || 'bg-gray-500';
}

export function getSubjectEmoji(subject: string): string {
  const emojis: Record<string, string> = {
    '英語': '🌍',
    '国語(現代文)': '📖',
    '国語(古文)': '📜',
    '国語(漢文)': '🏯',
    '数学IA': '📐',
    '数学IIB': '📊',
    '数学III': '∫',
    '物理': '⚡',
    '化学': '🧪',
    '生物': '🧬',
    '地学': '🌏',
    '日本史': '⛩️',
    '世界史': '🗺️',
    '地理': '🧭',
    '政治経済': '📰',
    '倫理': '💭',
    '現代社会': '🏙️',
    '情報': '💻',
  };
  return emojis[subject] || '📚';
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
