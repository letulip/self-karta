<script setup lang="ts">
import { computed, ref } from 'vue';
import { downloadBackup } from '../lib/backup';
import { groupById, nextGroup, questionsOf } from '../lib/content';
import { isAnswered } from '../lib/model';
import { state } from '../lib/store';

const props = defineProps<{ group: string }>();
const g = computed(() => groupById.get(Number(props.group)));
const tier = computed(() => state.profile.tier);
const qs = computed(() => (g.value ? questionsOf(g.value.id, tier.value) : []));
const answered = computed(() => qs.value.filter((q) => isAnswered(q, state.answers[q.id])));
const skipped = computed(() => qs.value.filter((q) => !isAnswered(q, state.answers[q.id])));
const flagged = computed(() => qs.value.filter((q) => state.answers[q.id]?.flagged));
const next = computed(() => (g.value ? nextGroup(g.value.id, tier.value) : undefined));
const nextFirst = computed(() => (next.value ? questionsOf(next.value.id, tier.value)[0] : undefined));
const backedUp = ref(false);

function backup() {
  downloadBackup();
  backedUp.value = true;
}
</script>

<template>
  <main v-if="g" class="page stack">
    <h1>«{{ g.title }}»: {{ skipped.length ? 'пройдено частично' : 'готово' }}</h1>
    <p>Отвечено {{ answered.length }} из {{ qs.length }}.</p>

    <section v-if="skipped.length" class="card soft">
      <h2>Без ответа</h2>
      <ul>
        <li v-for="q in skipped" :key="q.id">
          <RouterLink :to="`/g/${q.group}/q/${q.id}`">{{ q.id }}. {{ q.text }}</RouterLink>
        </li>
      </ul>
    </section>
    <section v-if="flagged.length" class="card soft">
      <h2>Отмечено «вернуться позже»</h2>
      <ul>
        <li v-for="q in flagged" :key="q.id">
          <RouterLink :to="`/g/${q.group}/q/${q.id}`">{{ q.id }}. {{ q.text }}</RouterLink>
        </li>
      </ul>
    </section>

    <section class="card stack">
      <h2>Сохрани бэкап</h2>
      <p>Один файл со всеми ответами. Пригодится, если браузер очистит данные или захочется продолжить на другом устройстве.</p>
      <button type="button" class="btn" @click="backup">{{ backedUp ? 'Бэкап скачан ✓' : 'Скачать бэкап' }}</button>
    </section>

    <RouterLink v-if="next && nextFirst" :to="`/g/${next.id}/q/${nextFirst.id}`" class="btn primary">
      Следующая группа: «{{ next.title }}»
    </RouterLink>
    <RouterLink v-else to="/export" class="btn primary">Все группы маршрута открыты — к выгрузке</RouterLink>
    <RouterLink to="/map" class="btn">К карте групп</RouterLink>
  </main>
</template>
