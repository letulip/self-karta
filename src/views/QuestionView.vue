<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { TIERS } from '../content/texts.ru';
import AnswerFields from '../components/AnswerFields.vue';
import AnswerList from '../components/AnswerList.vue';
import AnswerMirror from '../components/AnswerMirror.vue';
import AnswerRank from '../components/AnswerRank.vue';
import AnswerRate from '../components/AnswerRate.vue';
import AnswerText from '../components/AnswerText.vue';
import SaveIndicator from '../components/SaveIndicator.vue';
import { emptyValue } from '../lib/answers';
import { parts } from '../content/questions.ru';
import { groupById, groupsOf, neighbours, questionById } from '../lib/content';
import type { AnswerValue } from '../lib/model';
import { requestPersistence, setAnswer, setPosition, state, toggleFlag } from '../lib/store';

const props = defineProps<{ group: string; qid: string }>();
const router = useRouter();

const q = computed(() => questionById.get(props.qid));
const g = computed(() => groupById.get(Number(props.group)));
const tier = computed(() => state.profile.tier);
const nb = computed(() => (q.value ? neighbours(q.value.group, q.value.id, tier.value) : null));

watchEffect(() => {
  if (!q.value || q.value.group !== Number(props.group)) router.replace('/map');
});

let persistAsked = false;
const value = computed<AnswerValue>({
  get: () => (q.value ? (state.answers[q.value.id]?.value ?? emptyValue(q.value)) : ''),
  set: (v) => {
    if (!q.value) return;
    setAnswer(q.value.id, v);
    if (!persistAsked) {
      persistAsked = true;
      void requestPersistence();
    }
  },
});

// Компонент выбирается по типу вопроса, значение приходит ровно того вида, который он ждёт.
const model = computed<any>({ get: () => value.value, set: (v: AnswerValue) => (value.value = v) });

watch(
  () => props.qid,
  () => q.value && setPosition(q.value.group, q.value.id),
  { immediate: true },
);

// На первом вопросе первой группы части показываем вступление к части.
const partIntro = computed(() => {
  if (!g.value || nb.value?.index !== 0) return '';
  const first = groupsOf(tier.value).find((x) => x.part === g.value!.part);
  return first?.id === g.value.id ? (parts.find((p) => p.id === g.value!.part)?.intro ?? '') : '';
});

const flagged = computed(() => !!(q.value && state.answers[q.value.id]?.flagged));
const answerComponent = computed(
  () =>
    ({ text: AnswerText, list: AnswerList, rate: AnswerRate, rank: AnswerRank, fields: AnswerFields, mirror: AnswerMirror })[
      q.value?.kind ?? 'text'
    ],
);

function next() {
  const n = nb.value?.next;
  router.push(n ? `/g/${n.group}/q/${n.id}` : `/g/${props.group}/done`);
}

function prev() {
  const p = nb.value?.prev;
  router.push(p ? `/g/${p.group}/q/${p.id}` : '/map');
}

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    next();
  }
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <template v-if="q && g && nb">
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink to="/map" class="btn ghost small">← Карта</RouterLink>
        <span class="muted where">{{ nb.index + 1 }}/{{ nb.total }} · {{ g.title }}</span>
        <SaveIndicator />
      </div>
    </header>
    <main class="page stack">
      <div v-if="partIntro" class="card soft">{{ partIntro }}</div>
      <div v-if="nb.index === 0 && g.intro" class="card soft">{{ g.intro }}</div>
      <div class="row">
        <span class="tag accent">{{ q.id }}</span>
        <span class="tag">{{ TIERS[q.tier].name }}</span>
        <span v-if="q.tier > tier" class="tag">вне выбранного маршрута</span>
      </div>
      <h1>{{ q.text }}</h1>
      <p v-if="q.hint" class="hint">{{ q.hint }}</p>
      <details v-if="q.angles?.length" class="angles">
        <summary>Ещё {{ q.angles.length === 1 ? 'один угол' : 'углы' }} этого вопроса</summary>
        <ul>
          <li v-for="a in q.angles" :key="a.from">{{ a.text }}</li>
        </ul>
      </details>
      <component :is="answerComponent" :key="q.id" v-model="model" :question="q" />
      <div>
        <button type="button" class="btn ghost small" :aria-pressed="flagged" @click="toggleFlag(q.id)">
          {{ flagged ? '★ Отмечено: вернусь позже' : '☆ Вернуться позже' }}
        </button>
      </div>
    </main>
    <nav class="bottombar" aria-label="Навигация по вопросам">
      <div class="bottombar-inner">
        <button type="button" class="btn" @click="prev">← Назад</button>
        <button type="button" class="btn primary grow" data-testid="next" @click="next">
          {{ nb.next ? 'Далее →' : 'Завершить группу' }}
        </button>
      </div>
    </nav>
  </template>
</template>

<style scoped>
.where { font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
.hint { color: var(--muted); }
.angles ul { margin-top: 8px; }
</style>
