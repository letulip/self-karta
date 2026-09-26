// Сборка единого Markdown-документа с вопросами и ответами — для разбора в ИИ-ассистенте или с человеком.
import { parts } from '../content/questions.ru';
import { GOALS, READING_GUIDE, TIERS, APP_TITLE } from '../content/texts.ru';
import type { Question, Tier } from '../content/types';
import { groupsOf, questionsOf, tierQuestions } from './content';
import {
  isAnswered,
  type FieldsValue,
  type KartaState,
  type ListValue,
  type MirrorValue,
  type RankValue,
  type RateValue,
} from './model';

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>').trim() || ' ';
const TRI: Record<string, string> = { '+': '+ заряжает', '0': '0 нейтрально', '-': '− истощает' };

export function goalLabels(state: KartaState): string[] {
  const p = state.profile;
  return p.goals
    .map((id) => (id === 'other' ? p.goalOther.trim() || 'другое' : (GOALS.find((g) => g.id === id)?.label ?? '')))
    .filter(Boolean);
}

export const goalText = (state: KartaState) => goalLabels(state).join('; ');

export function answeredCount(state: KartaState, tier: Tier): number {
  return tierQuestions(tier).filter((q) => isAnswered(q, state.answers[q.id])).length;
}

function renderAnswer(q: Question, state: KartaState): string {
  const v = state.answers[q.id]?.value;
  switch (q.kind) {
    case 'text':
      return (v as string).trim();
    case 'list': {
      const cols = q.columns ?? [];
      const rows = (v as ListValue).rows.filter((r) => Object.values(r.cells).some((c) => c.trim()));
      const head = `| ${cols.map((c) => c.label).join(' | ')} |\n| ${cols.map(() => '---').join(' | ')} |`;
      const body = rows.map(
        (r) => `| ${cols.map((c) => cell(c.type === 'tri' ? (TRI[r.cells[c.key] ?? ''] ?? '') : (r.cells[c.key] ?? ''))).join(' | ')} |`,
      );
      return [head, ...body].join('\n');
    }
    case 'rate': {
      const scores = (v as RateValue).scores;
      const source = q.source ? state.answers[q.source]?.value : undefined;
      const rows = source ? (source as ListValue).rows : [];
      const hi = q.scale?.highlightFrom ?? Infinity;
      const lines = rows
        .filter((r) => (r.cells.item ?? '').trim())
        .map((r) => {
          const s = scores[r.id];
          const mark = s !== undefined && s >= hi ? ` (${q.scale?.highlightLabel})` : '';
          return `| ${cell(r.cells.item ?? '')} | ${s ?? '—'}${mark} |`;
        });
      return ['| Навык | Уровень 1–10 |', '| --- | --- |', ...lines].join('\n');
    }
    case 'rank': {
      const r = v as RankValue;
      const out = (q.rankings ?? []).map((rk) => {
        const order = r.orders[rk.key] ?? [];
        return `**${rk.label}:** ${order.map((item, i) => `${i + 1}. ${item}`).join('; ')}`;
      });
      if (r.followUp.trim()) out.push(`**${q.followUp}**\n\n${r.followUp.trim()}`);
      return out.join('\n\n');
    }
    case 'fields': {
      const vals = (v as FieldsValue).values;
      return (q.fields ?? [])
        .filter((f) => vals[f.key]?.trim())
        .map((f) => `**${f.label}:** ${(vals[f.key] ?? '').trim()}`)
        .join('\n\n');
    }
    case 'mirror':
      return (v as MirrorValue).entries
        .filter((e) => (e.who + e.strengths + e.weakness).trim())
        .map((e) =>
          [
            `> **${e.who.trim() || 'Без подписи'}**`,
            `> Сильные стороны: ${e.strengths.trim() || '—'}`,
            `> Слабость: ${e.weakness.trim() || '—'}`,
          ].join('\n'),
        )
        .join('\n\n');
  }
}

export function buildMarkdown(state: KartaState, opts: { hideEmpty?: boolean; now?: Date } = {}): string {
  const tier = state.profile.tier;
  const now = opts.now ?? new Date();
  const total = tierQuestions(tier).length;
  const name = state.profile.name.trim();
  const out: string[] = [];
  out.push(`# ${APP_TITLE}${name ? ` — ${name}` : ''}`, '');
  out.push(
    `Выгружено ${now.toISOString().slice(0, 10)} · маршрут «${TIERS[tier].name}» · ` +
      `отвечено ${answeredCount(state, tier)} из ${total}`,
    '',
  );
  const goal = goalText(state);
  if (goal) out.push(`**Зачем мне этот тест:** ${goal}`, '');
  if (state.profile.goodResult.trim()) out.push(`**Хороший результат для меня:** ${state.profile.goodResult.trim()}`, '');
  out.push('## Как читать этот файл', '', ...READING_GUIDE.map((l) => `- ${l}`), '');

  // Вопросы маршрута плюс всё, на что ответили сверх него.
  const shown = (q: Question) => q.tier <= tier || isAnswered(q, state.answers[q.id]);
  for (const part of parts) {
    const partGroups = groupsOf(3).filter((g) => g.part === part.id);
    const blocks: string[] = [];
    for (const g of partGroups) {
      const qs = questionsOf(g.id, 3).filter(shown);
      const rendered: string[] = [];
      for (const q of qs) {
        const answered = isAnswered(q, state.answers[q.id]);
        if (!answered && opts.hideEmpty) continue;
        rendered.push(`#### ${q.id}. ${q.text}`);
        if (q.hint) rendered.push(`> ${q.hint}`);
        for (const a of q.angles ?? []) rendered.push(`> Ещё угол (${a.from}): ${a.text}`);
        rendered.push('', answered ? renderAnswer(q, state) : '— пропущено', '');
      }
      if (rendered.length) blocks.push(`### Группа ${g.id}. ${g.title}`, '', ...rendered);
    }
    if (blocks.length) out.push(`## Часть ${part.id}. ${part.title}`, '', ...blocks);
  }

  const bf = state.bigFive;
  if (bf.resultUrl.trim() || bf.notes.trim()) {
    out.push('## Big Five (IPIP-NEO-120)', '');
    if (bf.resultUrl.trim()) out.push(`Результат: ${bf.resultUrl.trim()}`, '');
    if (bf.notes.trim()) out.push(bf.notes.trim(), '');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export function exportFileName(state: KartaState, ext: 'md' | 'json', now = new Date()): string {
  const slug = state.profile.name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
  const date = now.toISOString().slice(0, 10);
  return ext === 'md' ? `karta${slug ? `-${slug}` : ''}-${date}.md` : `karta-backup-${date}.json`;
}

