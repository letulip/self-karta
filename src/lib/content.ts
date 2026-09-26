// Производные структуры поверх банка вопросов: что видно на маршруте, порядок, соседи.
import { groups, parts, questions } from '../content/questions.ru';
import type { Group, Question, Tier } from '../content/types';

export const questionById = new Map(questions.map((q) => [q.id, q]));
export const groupById = new Map(groups.map((g) => [g.id, g]));

export const inTier = (q: Question, tier: Tier) => q.tier <= tier;

export function questionsOf(groupId: number, tier: Tier): Question[] {
  return questions.filter((q) => q.group === groupId && inTier(q, tier));
}

export function groupsOf(tier: Tier): Group[] {
  return groups.filter((g) => questionsOf(g.id, tier).length > 0);
}

export function partsOf(tier: Tier) {
  return parts
    .map((p) => ({ ...p, groups: groupsOf(tier).filter((g) => g.part === p.id) }))
    .filter((p) => p.groups.length > 0);
}

export function tierQuestions(tier: Tier): Question[] {
  return questions.filter((q) => inTier(q, tier));
}

// Минуты группы на маршруте: пропорционально числу видимых вопросов.
export function groupMinutes(g: Group, tier: Tier): number {
  const all = questions.filter((q) => q.group === g.id).length;
  return Math.max(5, Math.round((g.minutes * questionsOf(g.id, tier).length) / all / 5) * 5);
}

export function tierMinutes(tier: Tier): number {
  const exact = groups.reduce((sum, g) => {
    const all = questions.filter((q) => q.group === g.id).length;
    return sum + (g.minutes * questionsOf(g.id, tier).length) / all;
  }, 0);
  return Math.round(exact);
}

export function neighbours(groupId: number, qid: string, tier: Tier) {
  const list = questionsOf(groupId, tier);
  const i = list.findIndex((q) => q.id === qid);
  return { index: i, total: list.length, prev: list[i - 1], next: list[i + 1] };
}

export function nextGroup(groupId: number, tier: Tier): Group | undefined {
  const list = groupsOf(tier);
  return list[list.findIndex((g) => g.id === groupId) + 1];
}
