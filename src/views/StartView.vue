<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ABOUT, APP_TITLE, GOAL_QUESTION, GOALS, PACE, PRIVACY, RULES } from '../content/texts.ru';
import type { Tier } from '../content/types';
import ImportBackup from '../components/ImportBackup.vue';
import TierPicker from '../components/TierPicker.vue';
import { setTier, state } from '../lib/store';

const router = useRouter();
const onboarded = computed(() => state.profile.onboarded);
const recommended = computed(() => GOALS.find((g) => g.id === state.profile.goal)?.tier);

const tier = computed({
  get: () => state.profile.tier,
  set: (t: Tier) => setTier(t),
});

function pickGoal(id: (typeof GOALS)[number]['id']) {
  const wasDefault = !state.profile.goal;
  state.profile.goal = id;
  // Маршрут подстраиваем под цель только при первом выборе — дальше решает человек.
  const g = GOALS.find((x) => x.id === id);
  if (wasDefault && g && !onboarded.value) setTier(g.tier);
}

function start() {
  state.profile.onboarded = true;
  router.push('/map');
}
</script>

<template>
  <main class="page stack">
    <header>
      <h1>{{ APP_TITLE }}</h1>
      <p v-for="p in ABOUT" :key="p">{{ p }}</p>
    </header>

    <section class="card stack" aria-labelledby="goal-h">
      <h2 id="goal-h">{{ GOAL_QUESTION.title }}</h2>
      <p class="muted">{{ GOAL_QUESTION.hint }}</p>
      <div class="goals" role="radiogroup" aria-labelledby="goal-h">
        <button
          v-for="g in GOALS"
          :key="g.id"
          type="button"
          role="radio"
          class="goal"
          :class="{ on: state.profile.goal === g.id }"
          :aria-checked="state.profile.goal === g.id"
          @click="pickGoal(g.id)"
        >
          {{ g.label }}
        </button>
      </div>
      <div v-if="state.profile.goal === 'other'">
        <label for="goal-other">Своими словами</label>
        <input id="goal-other" v-model="state.profile.goalOther" type="text" />
      </div>
      <div>
        <label for="good-result">{{ GOAL_QUESTION.resultLabel }}</label>
        <input id="good-result" v-model="state.profile.goodResult" type="text" placeholder="Например: понять, куда двигаться дальше" />
      </div>
    </section>

    <section class="stack" aria-labelledby="tier-h">
      <h2 id="tier-h">Насколько глубоко идём?</h2>
      <p class="pace">{{ PACE }}</p>
      <TierPicker v-model="tier" :recommended="recommended" />
    </section>

    <section class="card stack">
      <div>
        <label for="name">Как тебя зовут? <span class="muted">(по желанию — для имени файла)</span></label>
        <input id="name" v-model="state.profile.name" type="text" autocomplete="given-name" />
      </div>
    </section>

    <section class="card soft" aria-labelledby="privacy-h">
      <h2 id="privacy-h">Где хранятся ответы</h2>
      <ul>
        <li v-for="p in PRIVACY" :key="p">{{ p }}</li>
      </ul>
    </section>

    <details class="card">
      <summary>Как отвечать — {{ RULES.length }} правил</summary>
      <ol>
        <li v-for="r in RULES" :key="r.title">
          <strong>{{ r.title }}.</strong> {{ r.text }}
        </li>
      </ol>
    </details>

    <section class="stack">
      <button type="button" class="btn primary" data-testid="start" @click="start">
        {{ onboarded ? 'Сохранить и вернуться к карте' : 'Начать' }}
      </button>
      <div v-if="!onboarded" class="card soft">
        <p>Есть бэкап с другого устройства? Восстанови ответы из файла.</p>
        <ImportBackup @imported="start" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.goals { display: grid; gap: 8px; }
.goal {
  text-align: left;
  font: inherit;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
.goal.on { border: 2px solid var(--accent); background: var(--accent-soft); font-weight: 600; }
.pace { margin: 0; padding: 10px 14px; border-left: 3px solid var(--accent); background: var(--accent-soft); border-radius: 0 10px 10px 0; }
</style>
