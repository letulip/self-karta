import { createRouter, createWebHashHistory } from 'vue-router';
import { state } from './lib/store';

// Hash-маршруты: GitHub Pages отдаёт 404 на «глубокие» пути, а #/… всегда открывает index.html.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: () => (state.profile.onboarded ? '/map' : '/start') },
    { path: '/start', component: () => import('./views/StartView.vue') },
    { path: '/map', component: () => import('./views/MapView.vue') },
    { path: '/g/:group(\\d+)/q/:qid', component: () => import('./views/QuestionView.vue'), props: true },
    { path: '/g/:group(\\d+)/done', component: () => import('./views/GroupDoneView.vue'), props: true },
    { path: '/export', component: () => import('./views/ExportView.vue') },
    { path: '/rules', component: () => import('./views/RulesView.vue') },
    { path: '/big5', component: () => import('./views/BigFiveView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

// До прохождения стартового экрана ведём на него: цель и маршрут нужны всем остальным экранам.
router.beforeEach((to) => {
  if (!state.profile.onboarded && to.path !== '/start' && to.path !== '/rules') return '/start';
});
