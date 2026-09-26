#!/usr/bin/env node
// Проверка перед релизом: ни один фрагмент личных ответов не должен попасть в код или сборку.
// Личные файлы в репозиторий не кладутся — путь к ним передаётся аргументом:
//   npm run leak-check -- ~/path/to/private-answers
// Ответом считается текст после строки «**Ответ:**» до разделителя «---» или следующего заголовка.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const privateDir = process.argv[2];
if (!privateDir) {
  console.error('Укажи папку с личными .md-файлами: npm run leak-check -- <папка>');
  process.exit(2);
}

const SHINGLE = 40;
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

const answers = [];
for (const file of walk(privateDir, ['.md'])) {
  let grab = false;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.trim().startsWith('**Ответ')) {
      grab = true;
      const rest = line.split('**Ответ:**')[1]?.trim();
      if (rest) answers.push(rest);
      continue;
    }
    if (grab && (line.trim() === '---' || line.startsWith('#'))) grab = false;
    if (grab && line.trim()) answers.push(line.trim());
  }
}

const root = new URL('..', import.meta.url).pathname;
const targets = walk(root, ['.ts', '.vue', '.js', '.html', '.css', '.json', '.md', '.webmanifest']).filter(
  (p) => !p.includes('/test-results/') && !p.includes('/playwright-report/'),
);
const haystack = norm(targets.map((p) => readFileSync(p, 'utf8')).join('\n'));

let leaks = 0;
for (const a of answers.map(norm)) {
  for (let i = 0; i + SHINGLE <= a.length; i += SHINGLE / 2) {
    const piece = a.slice(i, i + SHINGLE);
    if (haystack.includes(piece)) {
      leaks++;
      console.error(`Утечка: «${piece}»`);
      break;
    }
  }
}

console.log(`Проверено строк ответов: ${answers.length}, файлов проекта: ${targets.length}, совпадений: ${leaks}.`);
process.exit(leaks ? 1 : 0);
