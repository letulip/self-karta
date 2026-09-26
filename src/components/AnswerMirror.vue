<script setup lang="ts">
import { computed } from 'vue';
import { MIRROR } from '../content/texts.ru';
import type { Question } from '../content/types';
import { uid, type MirrorEntry, type MirrorValue } from '../lib/model';
import AutoTextarea from './AutoTextarea.vue';
import CopyButton from './CopyButton.vue';

const props = defineProps<{ question: Question }>();
const model = defineModel<MirrorValue>({ required: true });

const DRAFT = '__draft__';
const entries = computed<MirrorEntry[]>(() =>
  model.value.entries.length ? model.value.entries : [{ id: DRAFT, who: '', strengths: '', weakness: '' }],
);
const count = computed(() => model.value.entries.filter((e) => (e.who + e.strengths + e.weakness).trim()).length);
const min = computed(() => props.question.mirror?.min ?? 3);

function set(entry: MirrorEntry, key: 'who' | 'strengths' | 'weakness', value: string) {
  if (entry.id === DRAFT) {
    model.value = { entries: [{ ...entry, id: uid(), [key]: value }] };
    return;
  }
  model.value = { entries: model.value.entries.map((e) => (e.id === entry.id ? { ...e, [key]: value } : e)) };
}

function add() {
  model.value = { entries: [...model.value.entries, { id: uid(), who: '', strengths: '', weakness: '' }] };
}

function remove(entry: MirrorEntry) {
  model.value = { entries: model.value.entries.filter((e) => e.id !== entry.id) };
}
</script>

<template>
  <div class="mirror">
    <div class="card soft">
      <p>{{ MIRROR.intro }}</p>
      <p class="template">«{{ MIRROR.template }}»</p>
      <CopyButton :text="MIRROR.template" label="Скопировать сообщение" small />
    </div>
    <p class="muted small">Записывай ответы дословно. Вместо имён можно писать роль: «коллега», «друг», «бывший руководитель».</p>
    <fieldset v-for="(e, i) in entries" :key="e.id" class="card entry">
      <legend class="visually-hidden">Отзыв {{ i + 1 }}</legend>
      <div class="row spread">
        <strong>Отзыв {{ i + 1 }}</strong>
        <button v-if="e.id !== '__draft__'" type="button" class="btn ghost small" @click="remove(e)">Удалить</button>
      </div>
      <label :for="`m-who-${e.id}`">{{ MIRROR.entryLabels.who }}</label>
      <input :id="`m-who-${e.id}`" type="text" :value="e.who" @input="set(e, 'who', ($event.target as HTMLInputElement).value)" />
      <label :for="`m-str-${e.id}`">{{ MIRROR.entryLabels.strengths }}</label>
      <AutoTextarea :id="`m-str-${e.id}`" :model-value="e.strengths" :rows="3" @update:model-value="set(e, 'strengths', $event)" />
      <label :for="`m-weak-${e.id}`">{{ MIRROR.entryLabels.weakness }}</label>
      <input
        :id="`m-weak-${e.id}`"
        type="text"
        :value="e.weakness"
        @input="set(e, 'weakness', ($event.target as HTMLInputElement).value)"
      />
    </fieldset>
    <div class="row spread">
      <button type="button" class="btn small" @click="add">+ Ещё отзыв</button>
      <small class="muted">{{ count }} из {{ min }}–5</small>
    </div>
  </div>
</template>

<style scoped>
.small { font-size: 0.92rem; }
.template { font-style: italic; }
.entry { margin: 12px 0; border: 1px solid var(--line); }
.entry label { margin-top: 10px; font-weight: 500; font-size: 0.95rem; }
</style>
