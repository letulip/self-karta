// Чтение, запись, проверка и слияние состояния. Без Vue — чтобы тестировать отдельно.
import { GOALS, MAX_GOALS, type GoalId } from '../content/texts.ru';
import { defaultState, SCHEMA, type AnswerRecord, type KartaState } from './model';

const GOAL_IDS = new Set<string>(GOALS.map((g) => g.id));

export const STORAGE_KEY = 'self-karta:v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SaveResult = { ok: true } | { ok: false; error: 'quota' | 'unavailable' };

export function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

// localStorage может отсутствовать или бросать исключения (приватный режим, запрет сайтов).
export function getStorage(): { storage: StorageLike; persistent: boolean } {
  try {
    const ls = globalThis.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { storage: ls, persistent: true };
  } catch {
    return { storage: memoryStorage(), persistent: false };
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

// Приводит сырые данные (из хранилища или бэкапа) к текущей схеме. null — если это не наши данные.
export function normalizeState(raw: unknown): KartaState | null {
  if (!isObj(raw) || !isObj(raw.answers)) return null;
  const base = defaultState(num(raw.createdAt, Date.now()));
  const p = isObj(raw.profile) ? raw.profile : {};
  const tier = p.tier === 1 || p.tier === 2 || p.tier === 3 ? p.tier : base.profile.tier;
  const answers: Record<string, AnswerRecord> = {};
  for (const [id, rec] of Object.entries(raw.answers)) {
    if (!/^[CG]\d{1,3}$/.test(id) || !isObj(rec) || rec.value === undefined) continue;
    answers[id] = {
      value: rec.value as AnswerRecord['value'],
      updatedAt: num(rec.updatedAt, 0),
      ...(rec.flagged === true ? { flagged: true } : {}),
    };
  }
  // Первая версия хранила одну цель в profile.goal — переносим её в список.
  const rawGoals: unknown[] = Array.isArray(p.goals) ? p.goals : typeof p.goal === 'string' ? [p.goal] : [];
  const valid = rawGoals.filter((g): g is GoalId => typeof g === 'string' && GOAL_IDS.has(g));
  const goals = [...new Set(valid)].slice(0, MAX_GOALS);
  const bf = isObj(raw.bigFive) ? raw.bigFive : {};
  const pos = isObj(raw.position) ? raw.position : null;
  return {
    schema: SCHEMA,
    createdAt: base.createdAt,
    updatedAt: num(raw.updatedAt, base.createdAt),
    profile: {
      name: str(p.name),
      goals,
      goalOther: str(p.goalOther),
      goodResult: str(p.goodResult),
      tier,
      onboarded: p.onboarded === true,
    },
    answers,
    bigFive: { resultUrl: str(bf.resultUrl), notes: str(bf.notes), updatedAt: num(bf.updatedAt, 0) },
    lastBackupAt: typeof raw.lastBackupAt === 'number' ? raw.lastBackupAt : null,
    position: pos && typeof pos.group === 'number' && typeof pos.qid === 'string' ? { group: pos.group, qid: pos.qid } : null,
  };
}

export function loadState(storage: StorageLike): { state: KartaState; recoveredCorrupt: boolean } {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return { state: defaultState(), recoveredCorrupt: false };
  try {
    const state = normalizeState(JSON.parse(raw));
    if (state) return { state, recoveredCorrupt: false };
  } catch {
    /* ниже */
  }
  // Не затираем то, что не смогли прочитать: откладываем копию под отдельный ключ.
  try {
    storage.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, raw);
  } catch {
    /* места нет — оставляем как есть */
  }
  return { state: defaultState(), recoveredCorrupt: true };
}

export function saveRaw(storage: StorageLike, json: string): SaveResult {
  try {
    storage.setItem(STORAGE_KEY, json);
    return { ok: true };
  } catch (e) {
    const name = (e as { name?: string }).name ?? '';
    return { ok: false, error: /quota/i.test(name) ? 'quota' : 'unavailable' };
  }
}

export interface MergeStats { incoming: number; local: number; taken: number }

// Слияние по ответам: у каждого вопроса побеждает более свежая версия. Ничего не теряется молча.
export function mergeStates(local: KartaState, incoming: KartaState): { state: KartaState; stats: MergeStats } {
  const answers = { ...local.answers };
  let taken = 0;
  for (const [id, rec] of Object.entries(incoming.answers)) {
    const mine = answers[id];
    if (!mine || rec.updatedAt > mine.updatedAt) {
      answers[id] = rec;
      taken++;
    }
  }
  const profile = local.profile.onboarded ? local.profile : incoming.profile;
  const bigFive = incoming.bigFive.updatedAt > local.bigFive.updatedAt ? incoming.bigFive : local.bigFive;
  const state: KartaState = {
    ...local,
    createdAt: Math.min(local.createdAt, incoming.createdAt),
    updatedAt: Math.max(local.updatedAt, incoming.updatedAt),
    profile,
    answers,
    bigFive,
    lastBackupAt: Math.max(local.lastBackupAt ?? 0, incoming.lastBackupAt ?? 0) || null,
    position: local.position ?? incoming.position,
  };
  return {
    state,
    stats: { incoming: Object.keys(incoming.answers).length, local: Object.keys(local.answers).length, taken },
  };
}

export function serializeBackup(state: KartaState, now = Date.now()): string {
  return JSON.stringify({ app: 'self-karta', kind: 'backup', exportedAt: now, state }, null, 1);
}

export function parseBackup(text: string): KartaState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Это не файл бэкапа: не получилось прочитать JSON.');
  }
  const payload = isObj(raw) && raw.app === 'self-karta' ? raw.state : raw;
  const state = normalizeState(payload);
  if (!state) throw new Error('В файле нет ответов «Карты экспертности».');
  return state;
}
