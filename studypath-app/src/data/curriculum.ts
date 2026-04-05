import curriculumData from './curriculum.json';

export interface CurriculumStep {
  name: string;
  isBoss: boolean;
}

export interface CurriculumMaterial {
  id: string;
  name: string;
  subject: string;
  prerequisite: string;
  totalSteps: number;
  steps: CurriculumStep[];
}

export type CurriculumDB = Record<string, CurriculumMaterial[]>;

export const CURRICULUM: CurriculumDB = curriculumData as CurriculumDB;

/** Get materials for a specific subject */
export function getMaterialsForSubject(subject: string): CurriculumMaterial[] {
  const baseSubject = subject.replace(/\(.*\)/, '').replace(/（.*）/, '');
  return CURRICULUM[subject] || CURRICULUM[baseSubject] || [];
}

/** Get all materials for a list of subjects (deduplicated) */
export function getMaterialsForSubjects(subjects: string[]): CurriculumMaterial[] {
  const seen = new Set<string>();
  const result: CurriculumMaterial[] = [];
  for (const sub of subjects) {
    for (const mat of getMaterialsForSubject(sub)) {
      if (!seen.has(mat.id)) {
        seen.add(mat.id);
        result.push(mat);
      }
    }
  }
  return result;
}

/** Build a summary string of the curriculum for the AI prompt */
export function buildCurriculumPrompt(subjects: string[]): string {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const sub of subjects) {
    const mats = getMaterialsForSubject(sub);
    if (mats.length === 0) continue;
    const baseSubject = sub.replace(/\(.*\)/, '').replace(/（.*）/, '');
    if (seen.has(baseSubject)) continue;
    seen.add(baseSubject);

    lines.push(`\n### ${baseSubject}`);
    for (const mat of mats) {
      const bossCount = mat.steps.filter(s => s.isBoss).length;
      const stepNames = mat.steps.slice(0, 6).map(s => s.name).join(' → ');
      const suffix = mat.steps.length > 6 ? ' → ...' : '';
      lines.push(`- **${mat.name}** (全${mat.totalSteps}ステップ, ボス${bossCount}回)`);
      lines.push(`  前提: ${mat.prerequisite}`);
      lines.push(`  ステップ: ${stepNames}${suffix}`);
    }
  }
  return lines.join('\n');
}
