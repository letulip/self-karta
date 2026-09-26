<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { DELEGATE_MARK } from '../content/texts.ru';
import type { Question } from '../content/types';
import { plural } from '../lib/format';
import { wordCount } from '../lib/model';
import AutoTextarea from './AutoTextarea.vue';

defineProps<{ question: Question }>();
const model = defineModel<string>({ required: true });

const words = computed(() => wordCount(model.value));
const TEMPLATE = 'Тезис: \nЭпизод: \nМоя роль: \nРезультат: ';

const box = ref<InstanceType<typeof AutoTextarea>>();
const delegated = computed(() => model.value.includes(DELEGATE_MARK));

async function append(text: string) {
  model.value = model.value.trim() ? `${model.value.trim()}\n\n${text}` : text;
  await nextTick();
  box.value?.focus();
}

const insertTemplate = () => append(TEMPLATE);
// Честное «оставляю разбору» лучше выдуманного ответа: промпт разберёт такие вопросы первыми.
const delegate = () => append(`${DELEGATE_MARK} `);
</script>

<template>
  <div>
    <AutoTextarea
      :id="`answer-${question.id}`"
      ref="box"
      v-model="model"
      label="Ответ"
      placeholder="Твой ответ — лучше историей и примером"
      :rows="6"
    />
    <div class="row spread meta">
      <span class="row">
        <button type="button" class="btn ghost small" @click="insertTemplate">Шаблон: тезис → эпизод → роль → результат</button>
        <button v-if="!delegated" type="button" class="btn ghost small" @click="delegate">Оставить разбору</button>
      </span>
      <small>{{ words }} {{ plural(words, 'слово', 'слова', 'слов') }}</small>
    </div>
    <p v-if="delegated" class="muted small-note">Вопрос отмечен для разбора. Допиши, что мешает ответить, — так разбор будет точнее.</p>
    <p v-else-if="words > 0 && words < 20" class="nudge">Добавишь конкретный пример? Истории работают лучше прилагательных.</p>
  </div>
</template>

<style scoped>
.meta { margin-top: 6px; }
.nudge { margin-top: 8px; font-size: 0.92rem; color: var(--warn); }
.small-note { margin-top: 8px; font-size: 0.92rem; }
</style>
