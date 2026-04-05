// ─── Core types ───

export interface UserProfile {
  grade: string;
  stream: string;
  weekdayHours: string;
  weekendHours: string;
  subjects: string[];
  totalDeviation?: string;
  examName?: string;
  nextExam?: string;
  scores: Record<string, SubjectScore>;
  goals: Goal[];
}

export interface SubjectScore {
  deviation?: string;
  score?: string;
  maxScore?: string;
}

export interface Goal {
  school: string;
  faculty: string;
  examType: string;
  priority: number;
}

export interface Todo {
  id: string;
  subject: string;
  unit: string;
  task: string;
  material: string;
  estimatedMinutes: number;
  dueDate: string;
  weekOf: string;
  status: 'pending' | 'in_progress' | 'done' | 'skipped';
  completedAt?: string;
  order: number;
  phase: string;
}

export interface Phase {
  name: string;
  startDate: string;
  endDate: string;
  targetDescription: string;
  focusSubjects: string[];
}

export interface StudyPlan {
  id: string;
  type: 'long_term' | 'mock_exam';
  createdAt: string;
  phases: Phase[];
  todos: Todo[];
  mockExamName?: string;
  mockExamDate?: string;
}

export interface WeekSummary {
  weekOf: string;
  totalTodos: number;
  completedTodos: number;
  totalMinutes: number;
  completedMinutes: number;
  bySubject: Record<string, { total: number; completed: number }>;
}

export type AppView = 'onboarding' | 'dashboard' | 'plan' | 'weekly' | 'chat';
