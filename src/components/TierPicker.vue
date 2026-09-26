<script setup lang="ts">
import { TIERS } from '../content/texts.ru';
import type { Tier } from '../content/types';
import { tierMinutes, tierQuestions } from '../lib/content';
import { hours, plural } from '../lib/format';

const model = defineModel<Tier>({ required: true });
defineProps<{ recommended?: Tier }>();

const tiers: Tier[] = [1, 2, 3];
const count = (t: Tier) => tierQuestions(t).length;
const sessions = (t: Tier) => Math.max(1, Math.round(tierMinutes(t) / 30));
</script>

<template>
  <div class="tiers" role="radiogroup" aria-label="Маршрут">
    <button
      v-for="t in tiers"
      :key="t"
      type="button"
      role="radio"
      class="tier card"
      :class="{ on: model === t }"
      :aria-checked="model === t"
      @click="model = t"
    >
      <span class="row spread">
        <strong>{{ TIERS[t].name }}</strong>
        <span v-if="recommended === t" class="tag accent">подходит под цель</span>
      </span>
      <span class="muted">
        {{ count(t) }} {{ plural(count(t), 'вопрос', 'вопроса', 'вопросов') }} · {{ hours(tierMinutes(t)) }} в сумме —
        это {{ sessions(t) }} {{ plural(sessions(t), 'сессия', 'сессии', 'сессий') }} по полчаса
      </span>
      <span class="outcome">{{ TIERS[t].outcome }}</span>
    </button>
    <p class="muted small">Уровни вложены друг в друга: перейти глубже можно в любой момент, ответы засчитаются.</p>
  </div>
</template>

<style scoped>
.tiers { display: grid; gap: 10px; }
.tier { display: grid; gap: 4px; text-align: left; font: inherit; color: inherit; cursor: pointer; }
.tier.on { border: 2px solid var(--accent); background: var(--accent-soft); }
.outcome { font-size: 0.95rem; }
.small { font-size: 0.9rem; margin: 0; }
</style>
