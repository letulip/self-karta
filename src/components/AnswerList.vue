<script setup lang="ts">
import { computed, nextTick } from 'vue';
import type { Question } from '../content/types';
import { plural } from '../lib/format';
import { uid, type ListRow, type ListValue } from '../lib/model';

const props = defineProps<{ question: Question }>();
const model = defineModel<ListValue>({ required: true });

const cols = computed(() => props.question.columns ?? []);
const textCols = computed(() => cols.value.filter((c) => c.type === 'text'));
const triCols = computed(() => cols.value.filter((c) => c.type === 'tri'));
// Пустая строка-черновик не пишется в хранилище, пока в неё ничего не ввели.
const DRAFT = '__draft__';
const rows = computed<ListRow[]>(() =>
  model.value.rows.length ? model.value.rows : [{ id: DRAFT, cells: {} }],
);
const filledCount = computed(() => model.value.rows.filter((r) => Object.values(r.cells).some((c) => c.trim())).length);
const TRI = [
  { v: '+', label: '+', title: 'заряжает' },
  { v: '0', label: '0', title: 'нейтрально' },
  { v: '-', label: '−', title: 'истощает' },
];

function commit(next: ListRow[]) {
  model.value = { rows: next };
}

function setCell(row: ListRow, key: string, value: string) {
  if (row.id === DRAFT) return commit([{ id: uid(), cells: { [key]: value } }]);
  commit(model.value.rows.map((r) => (r.id === row.id ? { ...r, cells: { ...r.cells, [key]: value } } : r)));
}

async function addRow() {
  const id = uid();
  commit([...model.value.rows, { id, cells: {} }]);
  await nextTick();
  document.querySelector<HTMLInputElement>(`[data-row="${id}"] input`)?.focus();
}

function removeRow(row: ListRow) {
  commit(model.value.rows.filter((r) => r.id !== row.id));
}

// Вставка списком: каждая строка (или пункт через запятую) становится отдельной строкой списка.
function onPaste(e: ClipboardEvent, row: ListRow, key: string) {
  const text = e.clipboardData?.getData('text') ?? '';
  let items = text.split(/\r?\n|;|•/);
  if (items.length < 2 && (text.match(/,/g) ?? []).length >= 2) items = text.split(',');
  items = items.map((s) => s.replace(/^\s*(?:[-*–]|\d+[.)])\s*/, '').trim()).filter(Boolean);
  if (items.length < 2) return;
  e.preventDefault();
  const [first, ...rest] = items;
  const base = row.id === DRAFT ? [] : model.value.rows;
  const current = row.id === DRAFT ? { id: uid(), cells: {} } : row;
  const updated = { ...current, cells: { ...current.cells, [key]: `${current.cells[key] ?? ''}${first}` } };
  const others = rest.map((item) => ({ id: uid(), cells: { [key]: item } }));
  const idx = base.findIndex((r) => r.id === row.id);
  commit(idx >= 0 ? [...base.slice(0, idx), updated, ...others, ...base.slice(idx + 1)] : [...base, updated, ...others]);
}
</script>

<template>
  <div class="list">
    <p v-if="question.id === 'C11'" class="muted small">
      Можно вставить готовый список целиком — каждая строка станет отдельным пунктом.
    </p>
    <div v-for="(row, i) in rows" :key="row.id" class="item" :data-row="row.id">
      <span class="num" aria-hidden="true">{{ i + 1 }}</span>
      <div class="fields">
        <input
          v-for="c in textCols"
          :key="c.key"
          type="text"
          :value="row.cells[c.key] ?? ''"
          :placeholder="c.label"
          :aria-label="`${c.label}, строка ${i + 1}`"
          @input="setCell(row, c.key, ($event.target as HTMLInputElement).value)"
          @paste="onPaste($event, row, c.key)"
        />
        <div v-for="c in triCols" :key="c.key" class="tri" role="group" :aria-label="c.label">
          <button
            v-for="t in TRI"
            :key="t.v"
            type="button"
            class="btn small"
            :class="{ on: row.cells[c.key] === t.v }"
            :aria-pressed="row.cells[c.key] === t.v"
            :title="t.title"
            @click="setCell(row, c.key, row.cells[c.key] === t.v ? '' : t.v)"
          >
            {{ t.label }} <span class="t-label">{{ t.title }}</span>
          </button>
        </div>
      </div>
      <button
        v-if="row.id !== '__draft__'"
        type="button"
        class="btn ghost small remove"
        :aria-label="`Удалить строку ${i + 1}`"
        @click="removeRow(row)"
      >
        ×
      </button>
    </div>
    <div class="row spread">
      <button type="button" class="btn small" @click="addRow">+ Добавить строку</button>
      <small class="muted">
        {{ filledCount }} {{ plural(filledCount, 'пункт', 'пункта', 'пунктов') }}<template v-if="question.suggestedRows">
          · ориентир {{ question.suggestedRows }}</template
        >
      </small>
    </div>
  </div>
</template>

<style scoped>
.small { font-size: 0.92rem; }
.item { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 10px; }
.num { width: 1.6em; padding-top: 12px; color: var(--muted); font-size: 0.85rem; text-align: right; flex: none; }
.fields { flex: 1; display: grid; gap: 6px; }
.tri { display: flex; gap: 6px; flex-wrap: wrap; }
.tri .btn { min-height: 36px; font-weight: 600; }
.tri .btn.on { background: var(--accent); color: var(--accent-contrast); border-color: var(--accent); }
.t-label { font-weight: 400; font-size: 0.8rem; }
.remove { font-size: 1.3rem; line-height: 1; padding-top: 10px; }
</style>
