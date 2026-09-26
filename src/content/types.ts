export type Tier = 1 | 2 | 3; // 1 — Эскиз, 2 — Карта, 3 — Атлас
export type Kind = 'text' | 'list' | 'rate' | 'rank' | 'fields' | 'mirror';

export interface Part { id: number; title: string; subtitle: string; intro: string }
export interface Group { id: number; part: number; title: string; minutes: number; intro?: string }
export interface Angle { from: string; text: string }
export interface ListColumn { key: string; label: string; type: 'text' | 'tri' }
export interface Field { key: string; label: string; placeholder?: string }

export interface Question {
  id: string;            // исходный номер: C — «Карта экспертности», G — второй тест
  group: number;
  tier: Tier;            // минимальный маршрут, в котором вопрос виден
  text: string;
  hint?: string;
  merged?: string[];     // вопросы G, слитые с этим вопросом
  angles?: Angle[];      // их формулировки, показываются как «ещё угол»
  kind: Kind;
  columns?: ListColumn[];                    // list
  suggestedRows?: number;                    // list
  source?: string;                           // rate: вопрос-список, пункты которого оцениваются
  scale?: { min: number; max: number; highlightFrom?: number; highlightLabel?: string }; // rate
  items?: string[];                          // rank
  rankings?: { key: string; label: string }[]; // rank: несколько порядков одних и тех же пунктов
  allowCustom?: boolean;                     // rank: можно добавить свой пункт
  followUp?: string;                         // rank: текстовый вопрос после ранжирования
  fields?: Field[];                          // fields
  mirror?: { min: number; max: number };     // mirror: сколько отзывов просим
}
