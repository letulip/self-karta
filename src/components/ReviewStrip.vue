<script setup lang="ts">
import { computed, ref } from 'vue';
import { REVIEWS } from '../content/reviews.ru';

const base = import.meta.env.BASE_URL;
const src = (img: string) => `${base}reviews/${img}`;

const dialog = ref<HTMLDialogElement>();
const index = ref(0);
const current = computed(() => REVIEWS[index.value] ?? REVIEWS[0]!);

function open(i: number) {
  index.value = i;
  dialog.value?.showModal();
}

function step(delta: number) {
  index.value = (index.value + delta + REVIEWS.length) % REVIEWS.length;
}

// Клик по затемнению вокруг картинки закрывает просмотр, как и Esc.
function onDialogClick(e: MouseEvent) {
  if (e.target === dialog.value) dialog.value?.close();
}
</script>

<template>
  <div class="reviews">
    <h3>Отзывы клиентов <span class="muted">· {{ REVIEWS.length }}</span></h3>
    <ul class="strip" aria-label="Скриншоты отзывов из Telegram">
      <li v-for="(r, i) in REVIEWS" :key="r.img">
        <button type="button" class="thumb" :aria-label="`Открыть крупно: ${r.alt}`" @click="open(i)">
          <img :src="src(r.img)" :alt="r.alt" :width="r.width" :height="r.height" loading="lazy" decoding="async" />
        </button>
      </li>
    </ul>
    <details>
      <summary>Отзывы текстом</summary>
      <blockquote v-for="r in REVIEWS" :key="r.img" class="text">{{ r.text }}</blockquote>
    </details>

    <dialog ref="dialog" class="lightbox" aria-label="Отзыв крупно" @click="onDialogClick">
      <div class="frame">
        <img :src="src(current.img)" :alt="current.alt" :width="current.width" :height="current.height" />
        <div class="controls">
          <button type="button" class="btn small" aria-label="Предыдущий отзыв" @click="step(-1)">←</button>
          <span class="muted">{{ index + 1 }} / {{ REVIEWS.length }}</span>
          <button type="button" class="btn small" aria-label="Следующий отзыв" @click="step(1)">→</button>
          <button type="button" class="btn small primary" @click="dialog?.close()">Закрыть</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.reviews h3 { margin-bottom: 8px; }
.strip {
  list-style: none;
  margin: 0 -16px;
  padding: 4px 16px 12px;
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}
.strip li { margin: 0; flex: none; scroll-snap-align: start; }
.thumb {
  display: block;
  width: 168px;
  height: 240px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface-2);
  cursor: zoom-in;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
.text { margin: 10px 0; padding-left: 12px; border-left: 3px solid var(--line); font-size: 0.95rem; }
.lightbox {
  padding: 0;
  border: none;
  background: transparent;
  max-width: min(720px, 100vw);
  max-height: 100vh;
}
.lightbox::backdrop { background: rgb(0 0 0 / 75%); }
.frame { display: grid; gap: 8px; padding: 8px; }
.frame img { max-width: 100%; max-height: calc(100vh - 96px); width: auto; height: auto; margin: 0 auto; border-radius: 10px; }
.controls { display: flex; gap: 8px; align-items: center; justify-content: center; }
.controls .muted { color: #ddd; }
</style>
