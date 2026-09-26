import { describe, expect, it } from 'vitest';
import { defaultState } from '../../src/lib/model';
import {
  loadState,
  memoryStorage,
  mergeStates,
  normalizeState,
  parseBackup,
  saveRaw,
  serializeBackup,
  STORAGE_KEY,
  type StorageLike,
} from '../../src/lib/storage';

function withAnswer(id: string, value: string, updatedAt: number) {
  const s = defaultState(1000);
  s.answers[id] = { value, updatedAt };
  return s;
}

describe('хранилище', () => {
  it('пустое хранилище даёт чистое состояние', () => {
    const { state, recoveredCorrupt } = loadState(memoryStorage());
    expect(state.answers).toEqual({});
    expect(state.profile.onboarded).toBe(false);
    expect(recoveredCorrupt).toBe(false);
  });

  it('записанное читается обратно без потерь', () => {
    const storage = memoryStorage();
    const s = withAnswer('C1', 'Лего и конструкторы', 5);
    s.profile.tier = 1;
    expect(saveRaw(storage, JSON.stringify(s))).toEqual({ ok: true });
    const { state } = loadState(storage);
    expect(state.answers.C1?.value).toBe('Лего и конструкторы');
    expect(state.profile.tier).toBe(1);
  });

  it('битые данные не затираются, а откладываются под отдельный ключ', () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, '{"answers": ');
    const { state, recoveredCorrupt } = loadState(storage);
    expect(recoveredCorrupt).toBe(true);
    expect(state.answers).toEqual({});
    const keys: string[] = [];
    const probe: StorageLike = { ...storage, setItem: (k, v) => (keys.push(k), storage.setItem(k, v)) };
    probe.setItem(STORAGE_KEY, '{');
    loadState(probe);
    expect(keys.some((k) => k.startsWith(`${STORAGE_KEY}:corrupt:`))).toBe(true);
  });

  it('переполнение хранилища возвращает ошибку, а не падает', () => {
    const full: StorageLike = {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(saveRaw(full, '{}')).toEqual({ ok: false, error: 'quota' });
  });

  it('при слиянии побеждает более свежий ответ, остальные сохраняются', () => {
    const local = withAnswer('C1', 'старый', 10);
    local.answers.C2 = { value: 'только здесь', updatedAt: 5 };
    const incoming = withAnswer('C1', 'новый', 20);
    incoming.answers.C3 = { value: 'только в файле', updatedAt: 1 };
    const { state, stats } = mergeStates(local, incoming);
    expect(state.answers.C1?.value).toBe('новый');
    expect(state.answers.C2?.value).toBe('только здесь');
    expect(state.answers.C3?.value).toBe('только в файле');
    expect(stats).toEqual({ incoming: 2, local: 2, taken: 2 });
  });

  it('пустой, но более новый ответ не создаётся простым открытием вопроса', () => {
    const local = withAnswer('C1', 'заполнено', 10);
    const { state } = mergeStates(local, defaultState(99));
    expect(state.answers.C1?.value).toBe('заполнено');
  });

  it('бэкап проходит путь туда и обратно', () => {
    const s = withAnswer('G23', 'ранжирование', 7);
    s.profile.goals = ['job', 'pivot'];
    const back = parseBackup(serializeBackup(s));
    expect(back.answers.G23?.value).toBe('ранжирование');
    expect(back.profile.goals).toEqual(['job', 'pivot']);
  });

  it('чужой файл даёт понятную ошибку', () => {
    expect(() => parseBackup('не json')).toThrow('не получилось прочитать JSON');
    expect(() => parseBackup('{"hello": 1}')).toThrow('нет ответов');
  });

  it('одна цель из первой версии переносится в список, мусор и лишнее отбрасываются', () => {
    expect(normalizeState({ answers: {}, profile: { goal: 'energy' } })?.profile.goals).toEqual(['energy']);
    const many = normalizeState({ answers: {}, profile: { goals: ['self', 'nope', 'self', 'job', 'pivot', 'business'] } });
    expect(many?.profile.goals).toEqual(['self', 'job', 'pivot']);
  });

  it('мусорные ключи ответов отбрасываются', () => {
    const s = normalizeState({ answers: { C1: { value: 'ok', updatedAt: 1 }, __proto__x: { value: 1 }, X9: { value: 'no' } } });
    expect(Object.keys(s?.answers ?? {})).toEqual(['C1']);
  });
});
