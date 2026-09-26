<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { APP_TITLE, BIG_FIVE, MIRROR, TIERS } from '../content/texts.ru';
import type { Group, Tier } from '../content/types';
import CopyButton from '../components/CopyButton.vue';
import ImportBackup from '../components/ImportBackup.vue';
import ProgressBar from '../components/ProgressBar.vue';
import SaveIndicator from '../components/SaveIndicator.vue';
import { continueTarget, groupProgress } from '../lib/answers';
import { downloadBackup } from '../lib/backup';
import { groupMinutes, partsOf, questionById, questionsOf, tierMinutes, tierQuestions } from '../lib/content';
import { answeredCount } from '../lib/exportMd';
import { daysSince, hours, plural } from '../lib/format';
import { isAnswered, type MirrorValue } from '../lib/model';
import { resetAll, setTier, state, storageInfo } from '../lib/store';

const router = useRouter();
const tier = computed(() => state.profile.tier);
const total = computed(() => tierQuestions(tier.value).length);
const answered = computed(() => answeredCount(state, tier.value));
const parts = computed(() => partsOf(tier.value));
const cont = computed(() => continueTarget(state, tier.value));
const complete = computed(() => total.value > 0 && answered.value === total.value);

const nextTier = computed<Tier | null>(() => (tier.value < 3 ? ((tier.value + 1) as Tier) : null));
const deepen = computed(() =>
  nextTier.value
    ? {
        tier: nextTier.value,
        add: tierQuestions(nextTier.value).length - total.value,
        minutes: tierMinutes(nextTier.value) - tierMinutes(tier.value),
      }
    : null,
);

const lastBackupDays = computed(() => daysSince(state.lastBackupAt));
const backupDue = computed(() => answered.value > 0 && lastBackupDays.value >= 7);

const mirrorQ = questionById.get('C74');
const mirrorCount = computed(
  () =>
    ((state.answers.C74?.value as MirrorValue | undefined)?.entries ?? []).filter((e) => (e.who + e.strengths + e.weakness).trim())
      .length,
);
const showMirror = computed(() => !!mirrorQ && mirrorQ.tier <= tier.value && mirrorCount.value < 3);

const nav = navigator as Navigator & { standalone?: boolean };
const iosSafari =
  /iP(hone|ad|od)/.test(navigator.userAgent) && !nav.standalone && !window.matchMedia('(display-mode: standalone)').matches;

function groupLink(g: Group): string {
  const qs = questionsOf(g.id, tier.value);
  const q = qs.find((x) => !isAnswered(x, state.answers[x.id])) ?? qs[0];
  return q ? `/g/${g.id}/q/${q.id}` : '/map';
}

const STATUS = { new: 'не начата', progress: 'в процессе', done: 'готово' } as const;

function confirmReset() {
  if (confirm('Удалить все ответы с этого устройства? Это нельзя отменить. Если нужен бэкап — сначала скачай его.')) {
    resetAll();
    router.push('/start');
  }
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <strong>{{ APP_TITLE }}</strong>
      <SaveIndicator />
    </div>
  </header>
  <main class="page stack">
    <div v-if="!storageInfo.persistent" class="card danger" role="alert">
      Браузер не даёт сохранять данные (возможно, приватный режим). Ответы пропадут при закрытии вкладки — скачивай бэкап.
    </div>
    <div v-if="storageInfo.recoveredCorrupt" class="card warn" role="alert">
      Сохранённые ответы не получилось прочитать — их копия отложена, а здесь начат чистый лист. Восстанови ответы из бэкапа.
    </div>

    <section class="card stack">
      <div class="row spread">
        <h1>Маршрут «{{ TIERS[tier].name }}»</h1>
        <RouterLink to="/start" class="btn ghost small">Цель и маршрут</RouterLink>
      </div>
      <div>
        <div class="row spread">
          <span>Отвечено {{ answered }} из {{ total }}</span>
          <span class="muted">{{ hours(tierMinutes(tier)) }} на весь маршрут</span>
        </div>
        <ProgressBar :value="answered" :max="total" label="Прогресс маршрута" />
      </div>
      <RouterLink :to="cont" class="btn primary" data-testid="continue">
        {{ answered === 0 ? 'Начать с первой группы' : complete ? 'К выгрузке и разбору' : 'Продолжить' }}
      </RouterLink>
    </section>

    <section v-if="complete && deepen" class="card soft stack">
      <h2>Маршрут пройден</h2>
      <p>
        Хочешь глубже? «{{ TIERS[deepen.tier].name }}» добавит {{ deepen.add }}
        {{ plural(deepen.add, 'вопрос', 'вопроса', 'вопросов') }} ({{ hours(deepen.minutes) }}). Все ответы засчитаются.
      </p>
      <p class="muted">{{ TIERS[deepen.tier].outcome }}</p>
      <div class="row">
        <button type="button" class="btn primary" @click="setTier(deepen.tier)">Углубиться</button>
        <RouterLink to="/export" class="btn">К выгрузке</RouterLink>
      </div>
    </section>

    <section v-if="backupDue" class="card warn stack" role="status">
      <p>
        {{ state.lastBackupAt ? `Последний бэкап — ${lastBackupDays} дн. назад.` : 'Бэкапа ещё нет.' }}
        Safari стирает данные сайта, если на него неделю не заходить. Скачай файл — это минута.
      </p>
      <button type="button" class="btn" @click="downloadBackup">Скачать бэкап</button>
    </section>

    <section v-if="iosSafari" class="card soft">
      <strong>Совет для iPhone и iPad.</strong> «Поделиться» → «На экран Домой»: так тест станет приложением, и Safari не
      сотрёт ответы.
    </section>

    <section v-if="showMirror && mirrorQ" class="card stack">
      <h2>Сделай сегодня: опрос 3–5 человек</h2>
      <p>{{ MIRROR.intro }}</p>
      <div class="row">
        <CopyButton :text="MIRROR.template" label="Скопировать сообщение" small />
        <RouterLink :to="`/g/${mirrorQ.group}/q/${mirrorQ.id}`" class="btn small">Записать ответы ({{ mirrorCount }})</RouterLink>
      </div>
    </section>

    <section v-for="p in parts" :key="p.id" class="stack" :aria-labelledby="`part-${p.id}`">
      <div>
        <h2 :id="`part-${p.id}`">Часть {{ p.id }}. {{ p.title }}</h2>
        <p class="muted sub">{{ p.subtitle }}</p>
      </div>
      <ul class="groups">
        <li v-for="g in p.groups" :key="g.id">
          <RouterLink :to="groupLink(g)" class="group card" :data-testid="`group-${g.id}`">
            <span class="g-title">{{ g.id }}. {{ g.title }}</span>
            <span class="g-meta">
              <span class="tag" :class="{ accent: groupProgress(state, g.id, tier).status === 'done' }">
                {{ STATUS[groupProgress(state, g.id, tier).status as keyof typeof STATUS] }}
              </span>
              {{ groupProgress(state, g.id, tier).answered }} / {{ groupProgress(state, g.id, tier).total }} ·
              {{ hours(groupMinutes(g, tier)) }}
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <section class="card stack">
      <h2>{{ BIG_FIVE.title }}</h2>
      <p>{{ BIG_FIVE.text }}</p>
      <RouterLink to="/big5" class="btn small">
        {{ state.bigFive.resultUrl.trim() ? 'Ссылка на результат добавлена ✓' : 'Как пройти и приложить результат' }}
      </RouterLink>
    </section>

    <section class="stack">
      <RouterLink to="/export" class="btn primary">Выгрузка и разбор</RouterLink>
      <div class="row">
        <RouterLink to="/rules" class="btn">Как отвечать</RouterLink>
        <button type="button" class="btn" @click="downloadBackup">Скачать бэкап</button>
      </div>
      <ImportBackup label="Восстановить из бэкапа" />
      <button type="button" class="btn ghost danger" @click="confirmReset">Удалить все мои ответы с этого устройства</button>
    </section>
  </main>
</template>

<style scoped>
.sub { margin: 0; }
.groups { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.groups li { margin: 0; }
.group { display: flex; flex-direction: column; gap: 4px; text-decoration: none; color: var(--text); padding: 12px 14px; }
.group:hover { border-color: var(--accent); }
.g-title { font-weight: 600; }
.g-meta { color: var(--muted); font-size: 0.9rem; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>
