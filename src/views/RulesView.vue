<script setup lang="ts">
import { RULES } from '../content/texts.ru';
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <RouterLink to="/map" class="btn ghost small">← Карта</RouterLink>
    </div>
  </header>
  <main class="page stack">
    <h1>Как отвечать</h1>
    <section v-for="r in RULES" :key="r.title" class="card">
      <h2>{{ r.title }}</h2>
      <p>{{ r.text }}</p>
    </section>
  </main>
</template>
