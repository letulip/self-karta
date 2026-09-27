<script setup lang="ts">
import { TIERS } from '../content/texts.ru';
import type { Tier } from '../content/types';
import { tierMinutes, tierQuestions } from '../lib/content';
import { hours, plural, sessionRange } from '../lib/format';

const model = defineModel<Tier>({ required: true });
defineProps<{ recommended?: Tier; recommendedLabel?: string }>();

const tiers: Tier[] = [1, 2, 3];
const count = (t: Tier) => tierQuestions(t).length;
const sessions = (t: Tier) => sessionRange(tierMinutes(t));
const sessionsLabel = (t: Tier) => {
  const [min, max] = sessions(t);
  return min === max ? `${max}` : `${min}–${max}`;
};
</script>

<template>
  <div class="tiers">
    <label v-for="t in tiers" :key="t" class="tier card" :class="{ on: model === t }">
      <span class="head">
        <input v-model="model" type="radio" name="tier" :value="t" />
        <strong>{{ TIERS[t].name }}</strong>
        <span v-if="recommended === t" class="tag accent">{{ recommendedLabel ?? 'подходит под цель' }}</span>
      </span>
      <span class="muted">
        {{ count(t) }} {{ plural(count(t), 'вопрос', 'вопроса', 'вопросов') }} · {{ hours(tierMinutes(t)) }} в сумме —
        это {{ sessionsLabel(t) }} {{ plural(sessions(t)[1], 'подход', 'подхода', 'подходов') }} по 30–40 минут
      </span>
      <span class="outcome">{{ TIERS[t].outcome }}</span>
    </label>
    <p class="muted small">Уровни вложены друг в друга: перейти глубже можно в любой момент, ответы засчитаются.</p>
  </div>
</template>

<style scoped>
.tiers { display: grid; gap: 10px; }
.tier { display: grid; gap: 4px; margin: 0; font-weight: 400; cursor: pointer; }
.tier.on { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); background: var(--accent-soft); }
.head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.head input { width: 20px; height: 20px; margin: 0; accent-color: var(--accent); flex: none; }
.tier > .muted, .outcome { padding-left: 30px; }
.outcome { font-size: 0.95rem; }
.small { font-size: 0.9rem; margin: 0; }
</style>
