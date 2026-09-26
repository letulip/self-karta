import type { Question, Tier } from '../content/types';
import { groupsOf, questionsOf } from './content';
import { isAnswered, type AnswerValue, type KartaState } from './model';

// Пустое значение для отображения. В хранилище попадает только после ввода,
// иначе пустой ответ с новой датой перетёр бы заполненный при слиянии бэкапов.
export function emptyValue(q: Question): AnswerValue {
  switch (q.kind) {
    case 'text':
      return '';
    case 'list':
      return { rows: [] };
    case 'rate':
      return { scores: {} };
    case 'rank':
      return { orders: {}, custom: [], followUp: '' };
    case 'fields':
      return { values: {} };
    case 'mirror':
      return { entries: [] };
  }
}

export function groupProgress(state: KartaState, groupId: number, tier: Tier) {
  const qs = questionsOf(groupId, tier);
  const answered = qs.filter((q) => isAnswered(q, state.answers[q.id])).length;
  return { answered, total: qs.length, status: answered === 0 ? 'new' : answered === qs.length ? 'done' : 'progress' };
}

export function firstUnanswered(state: KartaState, tier: Tier): Question | undefined {
  for (const g of groupsOf(tier)) {
    const q = questionsOf(g.id, tier).find((x) => !isAnswered(x, state.answers[x.id]));
    if (q) return q;
  }
  return undefined;
}

// Куда ведёт «Продолжить»: на последний открытый вопрос, если он не отвечен, иначе на первый пустой.
export function continueTarget(state: KartaState, tier: Tier): string {
  const pos = state.position;
  if (pos) {
    const q = questionsOf(pos.group, tier).find((x) => x.id === pos.qid);
    if (q && !isAnswered(q, state.answers[q.id])) return `/g/${q.group}/q/${q.id}`;
  }
  const q = firstUnanswered(state, tier);
  return q ? `/g/${q.group}/q/${q.id}` : '/export';
}
