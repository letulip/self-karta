<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  ABOUT,
  APP_TITLE,
  GOAL_QUESTION,
  GOALS,
  MAX_GOALS,
  PACE,
  PRIVACY,
  RULES,
  TIER_QUESTION,
} from '../content/texts.ru';
import type { Tier } from '../content/types';
import ImportBackup from '../components/ImportBackup.vue';
import TierPicker from '../components/TierPicker.vue';
import { setTier, state } from '../lib/store';

const router = useRouter();
const onboarded = computed(() => state.profile.onboarded);
const goals = computed(() => state.profile.goals);
const limitReached = computed(() => goals.value.length >= MAX_GOALS);

// Советуем самый глубокий маршрут из подходящих под выбранные цели.
const recommended = computed<Tier | undefined>(() => {
  const tiers = GOALS.filter((g) => goals.value.includes(g.id)).map((g) => g.tier);
  return tiers.length ? (Math.max(...tiers) as Tier) : undefined;
});

// Пока человек сам не выбрал маршрут, он следует за целями.
const tierTouched = ref(onboarded.value);
const tier = computed({
  get: () => state.profile.tier,
  set: (t: Tier) => {
    tierTouched.value = true;
    setTier(t);
  },
});
watch(recommended, (t) => {
  if (t && !tierTouched.value) setTier(t);
});

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
      <div>
        <h2 id="goal-h">
          {{ GOAL_QUESTION.title }} <span class="choose">({{ GOAL_QUESTION.choose }})</span>
        </h2>
        <p class="muted">{{ GOAL_QUESTION.hint }}</p>
      </div>
      <div class="options" role="group" aria-labelledby="goal-h">
        <label
          v-for="g in GOALS"
          :key="g.id"
          class="option"
          :class="{ on: goals.includes(g.id), off: limitReached && !goals.includes(g.id) }"
        >
          <input
            v-model="state.profile.goals"
            type="checkbox"
            :value="g.id"
            :disabled="limitReached && !goals.includes(g.id)"
          />
          <span>{{ g.label }}</span>
        </label>
      </div>
      <p v-if="limitReached" class="muted small" role="status">{{ GOAL_QUESTION.limit }}</p>
      <div v-if="goals.includes('other')">
        <label for="goal-other">Своими словами</label>
        <input id="goal-other" v-model="state.profile.goalOther" type="text" />
      </div>
      <div>
        <label for="good-result">{{ GOAL_QUESTION.resultLabel }}</label>
        <input id="good-result" v-model="state.profile.goodResult" type="text" placeholder="Например: понять, куда двигаться дальше" />
      </div>
    </section>

    <section class="stack" aria-labelledby="tier-h">
      <h2 id="tier-h">
        {{ TIER_QUESTION.title }} <span class="choose">({{ TIER_QUESTION.choose }})</span>
      </h2>
      <p class="pace">{{ PACE }}</p>
      <TierPicker
        v-model="tier"
        :recommended="recommended"
        :recommended-label="goals.length > 1 ? 'подходит под цели' : 'подходит под цель'"
      />
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
.choose { font-size: 0.9rem; font-weight: 400; color: var(--muted); }
.options { display: grid; gap: 8px; }
.option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  font-weight: 400;
  cursor: pointer;
}
.option input { width: 20px; height: 20px; margin: 2px 0 0; accent-color: var(--accent); flex: none; }
.option.on { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); background: var(--accent-soft); font-weight: 600; }
.option.off { opacity: 0.55; cursor: not-allowed; }
.small { font-size: 0.9rem; margin: 0; }
.pace {
  margin: 0;
  padding: 10px 14px;
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  border-radius: 0 10px 10px 0;
}
</style>
