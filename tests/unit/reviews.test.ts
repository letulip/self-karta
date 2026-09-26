import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REVIEWS } from '../../src/content/reviews.ru';

describe('отзывы', () => {
  it('у каждого отзыва есть картинка, размеры, подпись и текст', () => {
    for (const r of REVIEWS) {
      expect(existsSync(`public/reviews/${r.img}`), r.img).toBe(true);
      expect(r.width * r.height, r.img).toBeGreaterThan(0);
      expect(r.alt.length, r.img).toBeGreaterThan(10);
      expect(r.text.length, r.img).toBeGreaterThan(80);
    }
    expect(new Set(REVIEWS.map((r) => r.img)).size).toBe(REVIEWS.length);
  });
});
