<script setup lang="ts">
import { computed } from 'vue';
import { BIG_FIVE } from '../content/texts.ru';
import AutoTextarea from '../components/AutoTextarea.vue';
import { state } from '../lib/store';

const touch = () => (state.bigFive.updatedAt = Date.now());
const url = computed({
  get: () => state.bigFive.resultUrl,
  set: (v: string) => {
    state.bigFive.resultUrl = v;
    touch();
  },
});
const notes = computed({
  get: () => state.bigFive.notes,
  set: (v: string) => {
    state.bigFive.notes = v;
    touch();
  },
});

const parsed = computed(() => {
  try {
    return new URL(url.value.trim());
  } catch {
    return null;
  }
});
// Ссылка с бланком содержит параметр b — по ней видны все ответы теста.
const withBlank = computed(() => !!parsed.value?.searchParams.has('b'));
const foreign = computed(() => !!url.value.trim() && parsed.value?.hostname !== 'psytests.org');
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <RouterLink to="/map" class="btn ghost small">← Карта</RouterLink>
    </div>
  </header>
  <main class="page stack">
    <h1>{{ BIG_FIVE.title }}</h1>
    <p>{{ BIG_FIVE.text }}</p>
    <ol class="card">
      <li v-for="s in BIG_FIVE.steps" :key="s">{{ s }}</li>
    </ol>
    <a :href="BIG_FIVE.runUrl" target="_blank" rel="noopener noreferrer" class="btn primary">Пройти тест на psytests.org</a>
    <section class="card stack">
      <div>
        <label for="bf-notes">{{ BIG_FIVE.fields.notes }}</label>
        <AutoTextarea id="bf-notes" v-model="notes" :rows="6" placeholder="Экстраверсия (E) … Доброжелательность (A) …" />
      </div>
      <div>
        <label for="bf-url">{{ BIG_FIVE.fields.resultUrl }}</label>
        <input id="bf-url" v-model="url" type="url" inputmode="url" placeholder="https://psytests.org/result?v=…" />
        <p v-if="withBlank" class="warn" role="alert">
          Похоже, это ссылка с бланком (в ней есть параметр b=): по ней видны все твои ответы. Лучше вставить ссылку на
          результат без бланка.
        </p>
        <p v-else-if="foreign" class="warn" role="alert">Это не ссылка psytests.org — проверь, что скопирован нужный адрес.</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.warn { color: var(--warn); margin-top: 8px; }
</style>
