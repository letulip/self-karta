<script setup lang="ts">
import { ref } from 'vue';
import { copyText } from '../lib/share';

const props = defineProps<{ text: string | (() => string); label: string; primary?: boolean; small?: boolean }>();
const state = ref<'idle' | 'ok' | 'fail'>('idle');

async function copy() {
  const ok = await copyText(typeof props.text === 'function' ? props.text() : props.text);
  state.value = ok ? 'ok' : 'fail';
  setTimeout(() => (state.value = 'idle'), 2000);
}
</script>

<template>
  <button type="button" class="btn" :class="{ primary, small }" @click="copy">
    {{ state === 'ok' ? 'Скопировано ✓' : state === 'fail' ? 'Не получилось — выдели вручную' : label }}
  </button>
</template>
