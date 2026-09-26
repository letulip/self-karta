<script setup lang="ts">
import { computed } from 'vue';
import type { Question } from '../content/types';
import { plural } from '../lib/format';
import { wordCount } from '../lib/model';
import AutoTextarea from './AutoTextarea.vue';

defineProps<{ question: Question }>();
const model = defineModel<string>({ required: true });

const words = computed(() => wordCount(model.value));
const TEMPLATE = 'Тезис: \nЭпизод: \nМоя роль: \nРезультат: ';

function insertTemplate() {
  model.value = model.value.trim() ? `${model.value.trim()}\n\n${TEMPLATE}` : TEMPLATE;
}
</script>

<template>
  <div>
    <AutoTextarea
      :id="`answer-${question.id}`"
      v-model="model"
      label="Ответ"
      placeholder="Твой ответ — лучше историей и примером"
      :rows="6"
    />
    <div class="row spread meta">
      <button type="button" class="btn ghost small" @click="insertTemplate">Шаблон: тезис → эпизод → роль → результат</button>
      <small>{{ words }} {{ plural(words, 'слово', 'слова', 'слов') }}</small>
    </div>
    <p v-if="words > 0 && words < 20" class="nudge">Добавишь конкретный пример? Истории работают лучше прилагательных.</p>
  </div>
</template>

<style scoped>
.meta { margin-top: 6px; }
.nudge { margin-top: 8px; font-size: 0.92rem; color: var(--warn); }
</style>
