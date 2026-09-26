import { describe, expect, it } from 'vitest';
import { buildPrompt, TASKS } from '../../src/content/texts.ru';
import { answeredCount, buildMarkdown, exportFileName } from '../../src/lib/exportMd';
import { defaultState, type KartaState } from '../../src/lib/model';

function fixture(): KartaState {
  const s = defaultState(0);
  s.profile = { name: 'Саша', goals: ['job', 'self'], goalOther: '', goodResult: 'понять, куда откликаться', tier: 1, onboarded: true };
  const at = 1;
  s.answers.C1 = { value: 'Собирал модели из конструктора часами', updatedAt: at };
  s.answers.C11 = { value: { rows: [{ id: 'a', cells: { item: 'Vue' } }, { id: 'b', cells: { item: 'SQL | Postgres' } }] }, updatedAt: at };
  s.answers.C12 = { value: { scores: { a: 9, b: 5 } }, updatedAt: at };
  s.answers.C50 = { value: { rows: [{ id: 'r', cells: { item: 'Код-ревью', mark: '+' } }] }, updatedAt: at };
  s.answers.C59 = { value: { orders: { importance: ['Свобода', 'Мастерство'] }, custom: [], followUp: 'Ушёл ради свободы' }, updatedAt: at };
  s.answers.C74 = { value: { entries: [{ id: 'm', who: 'коллега', strengths: 'дотошность', weakness: 'нетерпеливость' }] }, updatedAt: at };
  s.answers.C92 = { value: { values: { safe: 'Найм', strange: 'Яхта' } }, updatedAt: at };
  s.answers.G41 = { value: 'Обычно я стратег', updatedAt: at }; // сверх маршрута Эскиз
  s.bigFive = { resultUrl: 'https://psytests.org/result?v=abc', notes: '', updatedAt: at };
  return s;
}

describe('выгрузка в Markdown', () => {
  const md = buildMarkdown(fixture(), { now: new Date('2026-10-01T10:00:00Z') });

  it('шапка: имя, маршрут, прогресс, цель', () => {
    expect(md).toContain('# Карта экспертности — Саша');
    expect(md).toContain('маршрут «Эскиз» · отвечено 7 из 45');
    expect(md).toContain('**Зачем мне этот тест:** Найти работу: позиционирование, резюме, собеседования; Понять себя');
    expect(md).toContain('**Хороший результат для меня:** понять, куда откликаться');
  });

  it('вопросы идут с номером, подсказкой и ответом', () => {
    expect(md).toContain('#### C1. Какие занятия в детстве и юности');
    expect(md).toContain('Собирал модели из конструктора часами');
    expect(md).toMatch(/#### C4\. [^\n]+\n(> [^\n]+\n)+\n— пропущено/);
  });

  it('структурные ответы — таблицами и списками', () => {
    expect(md).toContain('| SQL \\| Postgres | 5 |');
    expect(md).toContain('| Vue | 9 (могу учить других) |');
    expect(md).toContain('| Код-ревью | + заряжает |');
    expect(md).toContain('**По важности:** 1. Свобода; 2. Мастерство');
    expect(md).toContain('> **коллега**');
    expect(md).toContain('**Безопасный сценарий:** Найм');
  });

  it('ответы сверх маршрута не теряются, пустые вопросы других уровней не показываются', () => {
    expect(md).toContain('#### G41.');
    expect(md).not.toContain('#### G42.');
    expect(md).not.toContain('#### C2.');
  });

  it('Big Five — ссылкой в конце, после неё — подпись автора', () => {
    expect(md).toMatch(/Ссылка на результат: https:\/\/psytests\.org\/result\?v=abc\n\n---\n\nТест собрал Игорь/);
    expect(md.trimEnd().endsWith('почта ivladimirskiy@ya.ru.')).toBe(true);
  });

  it('комментарий к списку и оценке выводится; ответ одним комментарием засчитывается', () => {
    const s = fixture();
    s.answers.C11 = { value: { rows: [{ id: 'a', cells: { item: 'Vue' } }], comment: 'всё из LinkedIn' }, updatedAt: 1 };
    s.answers.C12 = { value: { scores: {}, comment: 'по веб-разработке мне будет что сказать' }, updatedAt: 1 };
    const out = buildMarkdown(s);
    expect(out).toContain('| Vue |\n\nКомментарий: всё из LinkedIn');
    expect(out).toMatch(/#### C12\.[^\n]+\n(> [^\n]+\n)+\nКомментарий: по веб-разработке/);
    expect(answeredCount(s, 1)).toBe(7);
  });

  it('можно скрыть вопросы без ответа', () => {
    const short = buildMarkdown(fixture(), { hideEmpty: true });
    expect(short).not.toMatch(/\n— пропущено\n/);
    expect(short).toContain('#### C1.');
  });

  it('счётчик и имя файла', () => {
    expect(answeredCount(fixture(), 1)).toBe(7);
    expect(exportFileName(fixture(), 'md', new Date('2026-10-01'))).toBe('karta-саша-2026-10-01.md');
    expect(exportFileName(fixture(), 'json', new Date('2026-10-01'))).toBe('karta-backup-2026-10-01.json');
  });
});

describe('промпты разбора', () => {
  it('каждая задача собирается с контекстом и правилами', () => {
    for (const t of TASKS) {
      const p = buildPrompt({ task: t.id, tier: 2, answered: 90, total: 100, goals: ['Найти работу', 'Понять себя'] });
      expect(p).toContain(`Задача — «${t.title}»`);
      expect(p).toContain('Зачем мне разбор: найти работу; понять себя.');
      expect(p).toContain('Маршрут «Карта», отвечено 90 из 100');
      expect(p).toContain('Не ставь диагнозов');
      expect(p).toContain('«Оставляю для разбора:»');
      expect(p).toContain('вопросы, которые я задаю тебе прямо в ответах');
      // Ассистент не должен рекламировать автора: контакты живут в интерфейсе и подписи файла.
      expect(p).not.toMatch(/letulip|ivladimirskiy|Игорь/);
      expect(p).toContain('с живым человеком: коучем, ментором или близким');
      expect(p).not.toMatch(/\n\n\n/);
    }
  });

  it('короткий маршрут просит пометить выводы как предварительные', () => {
    expect(buildPrompt({ task: 'full', tier: 1, answered: 40, total: 45 })).toContain('предварительные');
    expect(buildPrompt({ task: 'full', tier: 3, answered: 150, total: 158 })).toContain('сравни выводы двух методик');
  });
});
