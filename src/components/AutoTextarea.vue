<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { revealCaret } from '../lib/caret';

const model = defineModel<string>({ required: true });
defineProps<{ id?: string; placeholder?: string; rows?: number; label?: string }>();

const el = ref<HTMLTextAreaElement>();

// Поле растёт вместе с текстом: длинные ответы удобнее писать без внутренней прокрутки.
function fit() {
  const t = el.value;
  if (!t) return;
  // Сжатие до auto на миг укорачивает страницу, и браузер сбрасывает прокрутку — возвращаем её на место.
  const y = window.scrollY;
  t.style.height = 'auto';
  t.style.height = `${t.scrollHeight + 2}px`;
  if (window.scrollY !== y) window.scrollTo(0, y);
  // Поле выросло уже после того, как браузер показал курсор: строка с ним могла уйти под панель или клавиатуру.
  revealCaret(t);
}

onMounted(fit);
watch(model, () => nextTick(fit));
defineExpose({ focus: () => el.value?.focus() });
</script>

<template>
  <textarea
    :id="id"
    ref="el"
    v-model="model"
    :placeholder="placeholder"
    :rows="rows ?? 4"
    :aria-label="label"
    @input="fit"
  />
</template>
