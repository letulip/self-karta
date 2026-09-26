<script setup lang="ts">
import { ref } from 'vue';
import type { KartaState } from '../lib/model';
import { mergeStates, parseBackup, type MergeStats } from '../lib/storage';
import { importState, state } from '../lib/store';
import { plural } from '../lib/format';

defineProps<{ label?: string }>();
const emit = defineEmits<{ imported: [MergeStats] }>();

const input = ref<HTMLInputElement>();
const pending = ref<{ incoming: KartaState; stats: MergeStats } | null>(null);
const error = ref('');
const done = ref('');

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = '';
  error.value = '';
  done.value = '';
  if (!file) return;
  try {
    const incoming = parseBackup(await file.text());
    pending.value = { incoming, stats: mergeStates(state, incoming).stats };
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function apply() {
  if (!pending.value) return;
  const stats = importState(pending.value.incoming);
  done.value = `Готово: взято ${stats.taken} ${plural(stats.taken, 'ответ', 'ответа', 'ответов')} из файла.`;
  pending.value = null;
  emit('imported', stats);
}
</script>

<template>
  <div class="import">
    <input
      ref="input"
      type="file"
      accept=".json,application/json"
      class="visually-hidden"
      aria-label="Файл бэкапа .json"
      tabindex="-1"
      data-testid="import-input"
      @change="onFile"
    />
    <button type="button" class="btn" @click="input?.click()">{{ label ?? 'Восстановить из файла' }}</button>
    <div v-if="pending" class="card soft confirm" role="alert">
      <p>
        В файле {{ pending.stats.incoming }} {{ plural(pending.stats.incoming, 'ответ', 'ответа', 'ответов') }}, здесь —
        {{ pending.stats.local }}. Возьмём из файла {{ pending.stats.taken }}: новые и более свежие. Остальное не тронем.
      </p>
      <div class="row">
        <button type="button" class="btn primary" @click="apply">Объединить</button>
        <button type="button" class="btn" @click="pending = null">Отмена</button>
      </div>
    </div>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <p v-if="done" class="ok" role="status">{{ done }}</p>
  </div>
</template>

<style scoped>
.confirm { margin-top: 10px; }
.err { color: var(--danger); margin-top: 8px; }
.ok { color: var(--ok); margin-top: 8px; }
</style>
