<script setup lang="ts">
import { computed } from 'vue';
import type { Question } from '../content/types';
import { questionById } from '../lib/content';
import type { ListValue, RateValue } from '../lib/model';
import { state } from '../lib/store';

const props = defineProps<{ question: Question }>();
const model = defineModel<RateValue>({ required: true });

const source = computed(() => (props.question.source ? questionById.get(props.question.source) : undefined));
const rows = computed(() => {
  const v = props.question.source ? (state.answers[props.question.source]?.value as ListValue | undefined) : undefined;
  return (v?.rows ?? []).filter((r) => (r.cells.item ?? '').trim());
});
const min = computed(() => props.question.scale?.min ?? 1);
const max = computed(() => props.question.scale?.max ?? 10);
const points = computed(() => Array.from({ length: max.value - min.value + 1 }, (_, i) => min.value + i));
const hi = computed(() => props.question.scale?.highlightFrom ?? Infinity);
const teachCount = computed(() => rows.value.filter((r) => (model.value.scores[r.id] ?? 0) >= hi.value).length);

function setScore(id: string, n: number) {
  model.value = { scores: { ...model.value.scores, [id]: n } };
}
</script>

<template>
  <div v-if="!rows.length" class="card warn">
    Сначала выпиши навыки в вопросе {{ source?.id }} — здесь появится список для оценки.
    <RouterLink v-if="source" :to="`/g/${source.group}/q/${source.id}`">Перейти к {{ source.id }}</RouterLink>
  </div>
  <div v-else class="rate">
    <p class="muted small">
      {{ min }} — только начинаю, {{ max }} — эксперт. {{ hi }}+ значит «{{ question.scale?.highlightLabel }}».
      Сейчас таких: {{ teachCount }}.
    </p>
    <div v-for="r in rows" :key="r.id" class="rate-row">
      <div class="name">
        {{ r.cells.item }}
        <span v-if="(model.scores[r.id] ?? 0) >= hi" class="tag accent">{{ question.scale?.highlightLabel }}</span>
      </div>
      <div class="scale" role="radiogroup" :aria-label="`Оценка: ${r.cells.item}`">
        <button
          v-for="n in points"
          :key="n"
          type="button"
          role="radio"
          :aria-checked="model.scores[r.id] === n"
          :class="{ on: model.scores[r.id] === n, hi: n >= hi }"
          @click="setScore(r.id, n)"
        >
          {{ n }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.small { font-size: 0.92rem; }
.rate-row { padding: 10px 0; border-bottom: 1px solid var(--line); }
.name { font-weight: 600; margin-bottom: 6px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.scale { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
.scale button {
  min-height: 36px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  border-radius: 8px;
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
}
.scale button.hi { border-color: color-mix(in srgb, var(--accent) 40%, var(--line)); }
.scale button.on { background: var(--accent); border-color: var(--accent); color: var(--accent-contrast); font-weight: 700; }
</style>
