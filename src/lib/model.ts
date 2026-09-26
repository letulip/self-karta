import type { Question, Tier } from '../content/types';
import type { GoalId } from '../content/texts.ru';

export const SCHEMA = 1;

export interface ListRow { id: string; cells: Record<string, string> }
export interface ListValue { rows: ListRow[] }
export interface RateValue { scores: Record<string, number> } // id строки списка → оценка
export interface RankValue { orders: Record<string, string[]>; custom: string[]; followUp: string }
export interface FieldsValue { values: Record<string, string> }
export interface MirrorEntry { id: string; who: string; strengths: string; weakness: string }
export interface MirrorValue { entries: MirrorEntry[] }
export type AnswerValue = string | ListValue | RateValue | RankValue | FieldsValue | MirrorValue;

export interface AnswerRecord { value: AnswerValue; updatedAt: number; flagged?: boolean }

export interface Profile {
  name: string;
  goal: GoalId | null;
  goalOther: string;
  goodResult: string;
  tier: Tier;
  onboarded: boolean;
}

export interface BigFiveData { resultUrl: string; notes: string; updatedAt: number }

export interface KartaState {
  schema: number;
  createdAt: number;
  updatedAt: number;
  profile: Profile;
  answers: Record<string, AnswerRecord>;
  bigFive: BigFiveData;
  lastBackupAt: number | null;
  position: { group: number; qid: string } | null;
}

export function defaultState(now = Date.now()): KartaState {
  return {
    schema: SCHEMA,
    createdAt: now,
    updatedAt: now,
    profile: { name: '', goal: null, goalOther: '', goodResult: '', tier: 2, onboarded: false },
    answers: {},
    bigFive: { resultUrl: '', notes: '', updatedAt: 0 },
    lastBackupAt: null,
    position: null,
  };
}

export function uid(): string {
  return globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);
}

const filled = (s: string | undefined) => !!s && s.trim().length > 0;

export function isAnswered(q: Question, rec: AnswerRecord | undefined): boolean {
  if (!rec) return false;
  const v = rec.value;
  switch (q.kind) {
    case 'text':
      return typeof v === 'string' && filled(v);
    case 'list':
      return (v as ListValue).rows?.some((r) => Object.values(r.cells).some(filled)) ?? false;
    case 'rate':
      return Object.keys((v as RateValue).scores ?? {}).length > 0;
    case 'rank': {
      const r = v as RankValue;
      return Object.values(r.orders ?? {}).some((o) => o.length > 0) || filled(r.followUp);
    }
    case 'fields':
      return Object.values((v as FieldsValue).values ?? {}).some(filled);
    case 'mirror':
      return (v as MirrorValue).entries?.some((e) => filled(e.who + e.strengths + e.weakness)) ?? false;
  }
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}
