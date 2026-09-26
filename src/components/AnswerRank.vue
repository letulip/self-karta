<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Question } from '../content/types';
import type { RankValue } from '../lib/model';
import AutoTextarea from './AutoTextarea.vue';

const props = defineProps<{ question: Question }>();
const model = defineModel<RankValue>({ required: true });

const rankings = computed(() => props.question.rankings ?? [{ key: 'order', label: 'Порядок' }]);
const active = ref(rankings.value[0]?.key ?? 'order');
const allItems = computed(() => [...(props.question.items ?? []), ...model.value.custom]);
const newItem = ref('');

// Порядок пользователя + пункты, которых в нём ещё нет (например, только что добавленные).
function orderOf(key: string): string[] {
  const saved = (model.value.orders[key] ?? []).filter((x) => allItems.value.includes(x));
  return [...saved, ...allItems.value.filter((x) => !saved.includes(x))];
}
const touched = (key: string) => (model.value.orders[key]?.length ?? 0) > 0;

function setOrder(key: string, order: string[]) {
  model.value = { ...model.value, orders: { ...model.value.orders, [key]: order } };
}

function move(key: string, i: number, delta: number) {
  const order = orderOf(key);
  const j = i + delta;
  if (j < 0 || j >= order.length) return;
  const a = order[i];
  const b = order[j];
  if (a === undefined || b === undefined) return;
  order[i] = b;
  order[j] = a;
  setOrder(key, order);
}

function addCustom() {
  const label = newItem.value.trim();
  if (!label || allItems.value.includes(label)) return;
  model.value = { ...model.value, custom: [...model.value.custom, label] };
  newItem.value = '';
}

function removeCustom(label: string) {
  const orders = Object.fromEntries(Object.entries(model.value.orders).map(([k, o]) => [k, o.filter((x) => x !== label)]));
  model.value = { ...model.value, custom: model.value.custom.filter((x) => x !== label), orders };
}

const followUp = computed({
  get: () => model.value.followUp,
  set: (v: string) => (model.value = { ...model.value, followUp: v }),
});
</script>

<template>
  <div class="rank">
    <div v-if="rankings.length > 1" class="tabs" role="tablist">
      <button
        v-for="r in rankings"
        :key="r.key"
        type="button"
        role="tab"
        class="btn small"
        :class="{ primary: active === r.key }"
        :aria-selected="active === r.key"
        @click="active = r.key"
      >
        {{ r.label }}
      </button>
    </div>
    <template v-for="r in rankings" :key="r.key">
      <div v-show="active === r.key">
        <p class="muted small">
          {{ r.label }}: сверху — самое важное. Двигай стрелками.
          <span v-if="!touched(r.key)">Если порядок уже верный — подтверди кнопкой внизу.</span>
        </p>
        <ol class="items">
          <li v-for="(item, i) in orderOf(r.key)" :key="item">
            <span class="pos">{{ i + 1 }}</span>
            <span class="label">{{ item }}</span>
            <button type="button" class="btn small" :aria-label="`${item}: выше`" :disabled="i === 0" @click="move(r.key, i, -1)">↑</button>
            <button
              type="button"
              class="btn small"
              :aria-label="`${item}: ниже`"
              :disabled="i === orderOf(r.key).length - 1"
              @click="move(r.key, i, 1)"
            >
              ↓
            </button>
            <button
              v-if="model.custom.includes(item)"
              type="button"
              class="btn ghost small"
              :aria-label="`Удалить: ${item}`"
              @click="removeCustom(item)"
            >
              ×
            </button>
          </li>
        </ol>
        <button v-if="!touched(r.key)" type="button" class="btn small" @click="setOrder(r.key, orderOf(r.key))">
          Порядок верный
        </button>
      </div>
    </template>
    <form v-if="question.allowCustom" class="row add" @submit.prevent="addCustom">
      <input v-model="newItem" type="text" placeholder="Своя ценность, которой нет в списке" aria-label="Добавить свой пункт" />
      <button type="submit" class="btn small">Добавить</button>
    </form>
    <div v-if="question.followUp" class="follow">
      <label :for="`follow-${question.id}`">{{ question.followUp }}</label>
      <AutoTextarea :id="`follow-${question.id}`" v-model="followUp" :rows="4" />
    </div>
  </div>
</template>

<style scoped>
.small { font-size: 0.92rem; }
.tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.items { list-style: none; padding: 0; margin: 0 0 12px; }
.items li { display: flex; align-items: center; gap: 6px; padding: 6px 0; border-bottom: 1px solid var(--line); margin: 0; }
.pos { width: 1.6em; color: var(--muted); text-align: right; font-size: 0.9rem; }
.label { flex: 1; }
.items .btn { min-height: 36px; min-width: 40px; padding: 4px 8px; }
.add { margin-top: 12px; flex-wrap: nowrap; }
.follow { margin-top: 16px; }
</style>
