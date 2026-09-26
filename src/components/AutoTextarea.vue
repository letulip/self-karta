<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';

const model = defineModel<string>({ required: true });
defineProps<{ id?: string; placeholder?: string; rows?: number; label?: string }>();

const el = ref<HTMLTextAreaElement>();

// Поле растёт вместе с текстом: длинные ответы удобнее писать без внутренней прокрутки.
function fit() {
  const t = el.value;
  if (!t) return;
  t.style.height = 'auto';
  t.style.height = `${t.scrollHeight + 2}px`;
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
