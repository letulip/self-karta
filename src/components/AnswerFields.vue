<script setup lang="ts">
import type { Question } from '../content/types';
import type { FieldsValue } from '../lib/model';
import AutoTextarea from './AutoTextarea.vue';

defineProps<{ question: Question }>();
const model = defineModel<FieldsValue>({ required: true });

function set(key: string, value: string) {
  model.value = { values: { ...model.value.values, [key]: value } };
}
</script>

<template>
  <div class="fields">
    <div v-for="f in question.fields" :key="f.key" class="field">
      <label :for="`f-${question.id}-${f.key}`">{{ f.label }}</label>
      <AutoTextarea
        :id="`f-${question.id}-${f.key}`"
        :model-value="model.values[f.key] ?? ''"
        :placeholder="f.placeholder"
        :rows="3"
        @update:model-value="set(f.key, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.field + .field { margin-top: 16px; }
</style>
