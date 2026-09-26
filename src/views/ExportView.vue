<script setup lang="ts">
import { computed, ref } from 'vue';
import { AUTHOR, buildPrompt, GOALS, NEXT_STEPS, TASKS, TIERS, type TaskId } from '../content/texts.ru';
import CopyButton from '../components/CopyButton.vue';
import ProgressBar from '../components/ProgressBar.vue';
import { groupProgress } from '../lib/answers';
import { downloadBackup } from '../lib/backup';
import { partsOf, tierQuestions } from '../lib/content';
import { answeredCount, buildMarkdown, exportFileName, goalLabels } from '../lib/exportMd';
import { canShareFiles, downloadText, shareText } from '../lib/share';
import { state } from '../lib/store';

const tier = computed(() => state.profile.tier);
const total = computed(() => tierQuestions(tier.value).length);
const answered = computed(() => answeredCount(state, tier.value));
const partStats = computed(() =>
  partsOf(tier.value).map((p) => {
    const stats = p.groups.map((g) => groupProgress(state, g.id, tier.value));
    return {
      id: p.id,
      title: p.title,
      answered: stats.reduce((s, x) => s + x.answered, 0),
      total: stats.reduce((s, x) => s + x.total, 0),
    };
  }),
);

const hideEmpty = ref(false);
const md = computed(() => buildMarkdown(state, { hideEmpty: hideEmpty.value }));
const fileName = computed(() => exportFileName(state, 'md'));

// Разборы под выбранные цели, в порядке выбора: первый — по умолчанию.
const goalTasks = computed(() => [
  ...new Set(state.profile.goals.map((id) => GOALS.find((g) => g.id === id)?.task).filter((t): t is TaskId => !!t)),
]);
const task = ref<TaskId>(goalTasks.value[0] ?? 'full');
const taskTitle = (id: TaskId) => TASKS.find((t) => t.id === id)?.title ?? id;
const taskInfo = computed(() => TASKS.find((t) => t.id === task.value) ?? TASKS[0]!);
const prompt = computed(() =>
  buildPrompt({
    task: task.value,
    tier: tier.value,
    answered: answered.value,
    total: total.value,
    goals: goalLabels(state),
    goodResult: state.profile.goodResult.trim() || undefined,
  }),
);

const shareable = canShareFiles();
const download = () => downloadText(md.value, fileName.value, 'text/markdown;charset=utf-8');
const share = () => shareText(md.value, fileName.value, 'text/markdown');
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <RouterLink to="/map" class="btn ghost small">← Карта</RouterLink>
    </div>
  </header>
  <main class="page stack">
    <h1>Выгрузка и разбор</h1>

    <section class="card stack">
      <p>
        Маршрут «{{ TIERS[tier].name }}»: отвечено <strong>{{ answered }}</strong> из {{ total }}.
        <template v-if="answered < total">Пропущенные попадут в файл с пометкой «— пропущено» — это тоже данные.</template>
      </p>
      <div v-for="p in partStats" :key="p.id" class="part">
        <div class="row spread">
          <span>{{ p.title }}</span><span class="muted">{{ p.answered }} / {{ p.total }}</span>
        </div>
        <ProgressBar :value="p.answered" :max="p.total" :label="p.title" />
      </div>
    </section>

    <section class="card stack" aria-labelledby="file-h">
      <h2 id="file-h">1. Файл с ответами</h2>
      <div>
        <label for="export-name">Имя для файла <span class="muted">(по желанию)</span></label>
        <input id="export-name" v-model="state.profile.name" type="text" />
      </div>
      <label class="check"><input v-model="hideEmpty" type="checkbox" /> Не включать вопросы без ответа</label>
      <div class="row">
        <button type="button" class="btn primary" data-testid="download-md" @click="download">Скачать {{ fileName }}</button>
        <button v-if="shareable" type="button" class="btn" @click="share">Поделиться</button>
        <CopyButton :text="() => md" label="Скопировать ответы" />
      </div>
    </section>

    <section class="card stack" aria-labelledby="prompt-h">
      <h2 id="prompt-h">2. Промпт для разбора</h2>
      <div>
        <label for="task">Задача разбора</label>
        <select id="task" v-model="task" data-testid="task-select">
          <option v-for="t in TASKS" :key="t.id" :value="t.id">{{ t.title }}</option>
        </select>
        <p class="muted small">{{ taskInfo.gives }}. Промпт уже учитывает твои цели и маршрут.</p>
      </div>
      <div v-if="goalTasks.length > 1" class="card soft">
        <p class="small">Под твои цели подходят несколько разборов — их можно запустить по очереди на одном и том же файле:</p>
        <div class="row">
          <button
            v-for="t in goalTasks"
            :key="t"
            type="button"
            class="btn small"
            :class="{ primary: task === t }"
            :aria-pressed="task === t"
            @click="task = t"
          >
            {{ taskTitle(t) }}
          </button>
        </div>
      </div>
      <textarea :value="prompt" readonly rows="14" aria-label="Текст промпта" data-testid="prompt" />
      <div class="row">
        <CopyButton :text="() => prompt" label="Скопировать промпт" primary />
        <CopyButton :text="() => `${prompt}\n\n---\n\n${md}`" label="Промпт и ответы одним текстом" />
      </div>
    </section>

    <section class="card stack" aria-labelledby="next-h">
      <h2 id="next-h">3. {{ NEXT_STEPS.title }}</h2>
      <ol>
        <li v-for="s in NEXT_STEPS.steps" :key="s">{{ s }}</li>
      </ol>
      <ul class="tips">
        <li v-for="t in NEXT_STEPS.tips" :key="t">{{ t }}</li>
      </ul>
      <div class="card soft">
        {{ NEXT_STEPS.author }} {{ AUTHOR.name }}:
        <a :href="`https://t.me/${AUTHOR.telegram}`" target="_blank" rel="noopener noreferrer">Telegram @{{ AUTHOR.telegram }}</a>
        или <a :href="`mailto:${AUTHOR.email}`">{{ AUTHOR.email }}</a>.
      </div>
    </section>

    <section class="card soft stack">
      <h2>Бэкап для другого устройства</h2>
      <p>Файл .json переносит все ответы и отметки. Открой тест на другом устройстве и нажми «Восстановить из файла».</p>
      <button type="button" class="btn" @click="downloadBackup">Скачать бэкап</button>
    </section>
  </main>
</template>

<style scoped>
.part + .part { margin-top: 10px; }
.check { display: flex; gap: 8px; align-items: center; font-weight: 500; }
.small { font-size: 0.92rem; margin-top: 6px; }
textarea[readonly] { font-size: 0.9rem; background: var(--surface-2); }
.tips { color: var(--muted); font-size: 0.95rem; }
</style>
