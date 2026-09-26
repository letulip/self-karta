<script setup lang="ts">
import { computed } from 'vue';
import { saveStatus, storageInfo } from '../lib/store';

const text = computed(() => {
  if (!storageInfo.persistent) return 'Хранилище недоступно: ответы пропадут при закрытии';
  if (saveStatus.error === 'quota') return 'Не сохранилось: нет места. Скачай бэкап';
  if (saveStatus.error) return 'Не сохранилось. Скачай бэкап';
  if (saveStatus.pending) return 'Сохраняю…';
  if (saveStatus.savedAt)
    return `✓ ${new Date(saveStatus.savedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  return '';
});
const bad = computed(() => !storageInfo.persistent || !!saveStatus.error);
</script>

<template>
  <span class="save" :class="{ bad }" role="status" aria-live="polite" data-testid="save-status" :title="text.startsWith('✓') ? 'Сохранено' : undefined">{{ text }}</span>
</template>

<style scoped>
.save { font-size: 0.85rem; color: var(--muted); white-space: nowrap; margin-left: auto; }
.save.bad { color: var(--danger); font-weight: 600; white-space: normal; text-align: right; }
</style>
