// Браузер прокручивает поле с курсором только до нижнего края экрана, а там курсор закрывают
// закреплённая панель «Назад / Далее» и клавиатура. Доводим прокрутку сами: курсор — над ними.
const GAP = 12;

type TextField = HTMLTextAreaElement | HTMLInputElement;

const isTextField = (el: Element | null): el is TextField =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && ['text', 'url', 'search', 'email', 'tel'].includes(el.type));

// Стили, от которых зависит перенос строк: зеркальный блок с ними раскладывает текст так же, как поле.
const MIRRORED = [
  'boxSizing', 'width', 'borderStyle',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch',
  'letterSpacing', 'wordSpacing', 'lineHeight', 'textTransform', 'textIndent', 'tabSize',
] as const;

// Нижний край строки с курсором, в координатах экрана.
function caretBottom(field: TextField): number {
  const rect = field.getBoundingClientRect();
  if (field instanceof HTMLInputElement) return rect.bottom;
  const style = getComputedStyle(field);
  const mirror = document.createElement('div');
  for (const prop of MIRRORED) mirror.style[prop] = style[prop];
  Object.assign(mirror.style, {
    position: 'absolute',
    top: '0',
    left: '-9999px',
    visibility: 'hidden',
    height: 'auto',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  });
  mirror.textContent = field.value.slice(0, field.selectionEnd ?? field.value.length);
  const marker = mirror.appendChild(document.createElement('span'));
  marker.textContent = '​';
  document.body.appendChild(mirror);
  const bottom = parseFloat(style.borderTopWidth) + marker.offsetTop + marker.offsetHeight;
  mirror.remove();
  return rect.top + bottom - field.scrollTop;
}

// Нижняя граница видимой области: верх клавиатуры или панели, если панель видна над клавиатурой.
function visibleBottom(): number {
  const vv = window.visualViewport;
  let limit = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const bar = document.querySelector('.bottombar')?.getBoundingClientRect();
  if (bar && bar.height > 0 && bar.top < limit) limit = bar.top;
  return limit;
}

export function revealCaret(el: Element | null = document.activeElement): void {
  if (!isTextField(el) || el !== document.activeElement) return;
  const overflow = caretBottom(el) + GAP - visibleBottom();
  if (overflow > 0) window.scrollBy(0, overflow);
}

// Фокус и открытие клавиатуры: браузер подтягивает поле к краю экрана — поправляем после него.
export function installCaretKeeper(): void {
  let frame = 0;
  const later = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => revealCaret());
  };
  document.addEventListener('focusin', later);
  window.visualViewport?.addEventListener('resize', later);
  window.addEventListener('resize', later);
}
