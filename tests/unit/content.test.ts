import { describe, expect, it } from 'vitest';
import { groups, parts, questions } from '../../src/content/questions.ru';
import { GOALS, TASKS } from '../../src/content/texts.ru';
import { groupMinutes, groupsOf, questionById, tierMinutes, tierQuestions } from '../../src/lib/content';
import { hours, sessionRange } from '../../src/lib/format';

const ids = (tier: 1 | 2 | 3) => new Set(tierQuestions(tier).map((q) => q.id));

describe('банк вопросов', () => {
  it('каждый из 200 исходных номеров учтён ровно один раз', () => {
    const seen = questions.flatMap((q) => [q.id, ...(q.merged ?? [])]);
    const expected = Array.from({ length: 100 }, (_, i) => [`C${i + 1}`, `G${i + 1}`]).flat();
    expect(seen).toHaveLength(200);
    expect(new Set(seen)).toEqual(new Set(expected));
  });

  it('маршруты вложены: Эскиз 45 ⊂ Карта 100 ⊂ Атлас 158', () => {
    expect(ids(1).size).toBe(45);
    expect(ids(2).size).toBe(100);
    expect(ids(3).size).toBe(158);
    for (const id of ids(1)) expect(ids(2).has(id)).toBe(true);
    for (const id of ids(2)) expect(ids(3).has(id)).toBe(true);
  });

  it('Карта — это ровно все вопросы C, Атлас добавляет вопросы G', () => {
    expect([...ids(2)].every((id) => id.startsWith('C'))).toBe(true);
    expect(questions.filter((q) => q.tier === 3).every((q) => q.id.startsWith('G'))).toBe(true);
  });

  it('у каждой группы есть часть и 5–10 вопросов', () => {
    const partIds = new Set(parts.map((p) => p.id));
    for (const g of groups) {
      expect(partIds.has(g.part)).toBe(true);
      const n = questions.filter((q) => q.group === g.id).length;
      expect(n, `группа ${g.id}`).toBeGreaterThanOrEqual(5);
      expect(n, `группа ${g.id}`).toBeLessThanOrEqual(10);
    }
    expect(groupsOf(1).map((g) => g.id)).not.toContain(8);
  });

  it('структурные поля настроены полностью', () => {
    for (const q of questions) {
      if (q.kind === 'list') expect(q.columns?.length, q.id).toBeGreaterThan(0);
      if (q.kind === 'rate') expect(questionById.get(q.source ?? '')?.kind, q.id).toBe('list');
      if (q.kind === 'rank') expect(q.items?.length, q.id).toBeGreaterThan(2);
      if (q.kind === 'fields') expect(q.fields?.length, q.id).toBeGreaterThan(1);
    }
  });

  it('формулировки нейтральны по роду', () => {
    const masc = /(?<!\p{L})(сделал|научился|довёл|накопил|оставил|назвал|посвятил|хотел|устал|проходил|перестал|освоил|применял|способен|мог бы|самому себе|надёжным|внимательным|конструктивным)(?!\p{L})/iu;
    for (const q of questions) {
      const texts = [q.text, q.hint ?? '', ...(q.angles ?? []).map((a) => a.text)];
      for (const t of texts) expect(t, q.id).not.toMatch(masc);
    }
  });

  it('«ещё углы» ссылаются только на слитые вопросы', () => {
    for (const q of questions) for (const a of q.angles ?? []) expect(q.merged, q.id).toContain(a.from);
  });

  it('каждая цель ведёт на существующую задачу разбора', () => {
    const tasks = new Set(TASKS.map((t) => t.id));
    for (const g of GOALS) expect(tasks.has(g.task), g.id).toBe(true);
  });

  it('время по реальному темпу: ~2, ~4 и ~6 ч — 3–4, 6–8 и 9–12 подходов по 30–40 минут', () => {
    const tiers = [1, 2, 3] as const;
    expect(tiers.map((t) => hours(tierMinutes(t)))).toEqual(['~2 ч', '~4 ч', '~6 ч']);
    expect(tiers.map((t) => sessionRange(tierMinutes(t)))).toEqual([[3, 4], [6, 8], [9, 12]]);
    // Время групп на карте складывается в ту же сумму, что показана у маршрута.
    for (const t of tiers) {
      const sum = groupsOf(t).reduce((s, g) => s + groupMinutes(g, t), 0);
      expect(hours(sum), `маршрут ${t}`).toBe(hours(tierMinutes(t)));
    }
  });
});
