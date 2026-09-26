import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AnswerList from '../../src/components/AnswerList.vue';
import { questionById } from '../../src/lib/content';
import type { ListValue } from '../../src/lib/model';

const C11 = questionById.get('C11')!;

function paste(el: Element, text: string) {
  const ev = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clipboardData', { value: { getData: () => text } });
  el.dispatchEvent(ev);
}

describe('список навыков', () => {
  it('пустой список ничего не пишет в ответ, пока не начали вводить', () => {
    const w = mount(AnswerList, { props: { question: C11, modelValue: { rows: [] } } });
    expect(w.findAll('input')).toHaveLength(1);
    expect(w.emitted('update:modelValue')).toBeUndefined();
  });

  it('вставка списком разбивается на пункты и чистит маркеры', async () => {
    const w = mount(AnswerList, { props: { question: C11, modelValue: { rows: [] } } });
    paste(w.find('input').element, '- Vue\n- TypeScript\n3) Playwright\n\n');
    const [[value]] = w.emitted('update:modelValue') as [[ListValue]];
    expect(value.rows.map((r) => r.cells.item)).toEqual(['Vue', 'TypeScript', 'Playwright']);
  });

  it('строка через запятые тоже становится списком', () => {
    const w = mount(AnswerList, { props: { question: C11, modelValue: { rows: [] } } });
    paste(w.find('input').element, 'Figma, SQL, Docker');
    const [[value]] = w.emitted('update:modelValue') as [[ListValue]];
    expect(value.rows).toHaveLength(3);
  });
});
