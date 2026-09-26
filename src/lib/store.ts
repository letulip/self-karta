// Единственное состояние приложения: реактивное, с автосейвом и синхронизацией между вкладками.
import { reactive, watch } from 'vue';
import type { Tier } from '../content/types';
import { defaultState, type AnswerValue, type KartaState } from './model';
import { getStorage, loadState, mergeStates, normalizeState, saveRaw, STORAGE_KEY, type MergeStats } from './storage';

const { storage, persistent } = getStorage();
const loaded = loadState(storage);

export const state = reactive<KartaState>(loaded.state);

export const storageInfo = reactive({ persistent, recoveredCorrupt: loaded.recoveredCorrupt });

export const saveStatus = reactive<{ savedAt: number | null; error: 'quota' | 'unavailable' | null; pending: boolean }>({
  savedAt: null,
  error: null,
  pending: false,
});

let timer: ReturnType<typeof setTimeout> | undefined;
let lastWritten = storage.getItem(STORAGE_KEY) ?? '';

function write() {
  timer = undefined;
  saveStatus.pending = false;
  const json = JSON.stringify(state);
  if (json === lastWritten) return;
  const res = saveRaw(storage, json);
  if (res.ok) {
    lastWritten = json;
    saveStatus.savedAt = Date.now();
    saveStatus.error = null;
  } else {
    saveStatus.error = res.error;
  }
}

export function flushSave() {
  if (timer !== undefined) {
    clearTimeout(timer);
    write();
  }
}

watch(
  state,
  () => {
    saveStatus.pending = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(write, 500);
  },
  { deep: true },
);

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });
  // Та же страница открыта в другой вкладке: вливаем её свежие ответы, ничего не затирая.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue || e.newValue === lastWritten) return;
    try {
      const incoming = normalizeState(JSON.parse(e.newValue));
      if (!incoming) return;
      lastWritten = e.newValue;
      Object.assign(state, mergeStates(state, incoming).state);
    } catch {
      /* чужие или битые данные — игнорируем */
    }
  });
}

const touch = () => (state.updatedAt = Date.now());

export function setAnswer(qid: string, value: AnswerValue) {
  const prev = state.answers[qid];
  state.answers[qid] = { ...prev, value, updatedAt: Date.now() };
  touch();
}

export function toggleFlag(qid: string) {
  const rec = state.answers[qid];
  if (rec) rec.flagged = !rec.flagged;
  else state.answers[qid] = { value: '', updatedAt: Date.now(), flagged: true };
  touch();
}

export function setTier(tier: Tier) {
  state.profile.tier = tier;
  touch();
}

export function setPosition(group: number, qid: string) {
  state.position = { group, qid };
}

export function markBackup() {
  state.lastBackupAt = Date.now();
}

export function importState(incoming: KartaState): MergeStats {
  const { state: merged, stats } = mergeStates(state, incoming);
  Object.assign(state, merged);
  return stats;
}

export function resetAll() {
  if (timer !== undefined) clearTimeout(timer);
  storage.removeItem(STORAGE_KEY);
  Object.assign(state, defaultState());
  lastWritten = '';
  write();
}

// Просим браузер не вытеснять данные сайта. Гарантий нет, поэтому бэкап всё равно нужен.
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* API нет — не страшно */
  }
}
