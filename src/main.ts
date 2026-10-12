import { createApp } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import { installCaretKeeper } from './lib/caret';
import { router } from './router';
import './styles/base.css';

// Новая версия после деплоя включается сразу при открытии: service worker перезагружает страницу,
// а автосейв сбрасывается на pagehide, так что недописанный ответ не теряется.
registerSW({ immediate: true });

// После деплоя на Pages остаются только файлы новой сборки: если старая вкладка не нашла свой кусок кода,
// перезагружаемся на новую версию вместо сломанной навигации.
window.addEventListener('vite:preloadError', () => window.location.reload());

// Поле ввода не прячется под панелью «Назад / Далее» и клавиатурой телефона.
installCaretKeeper();

createApp(App).use(router).mount('#app');
