import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const ANSWER = 'Часами собирал модели из конструктора и разбирал старые часы, чтобы понять, как они устроены';

async function onboard(page: Page, goal = 'Найти работу', tier = 'Эскиз') {
  await page.goto('./');
  await page.getByRole('radio', { name: new RegExp(goal) }).click();
  await page.getByRole('radio', { name: new RegExp(tier) }).click();
  await page.getByTestId('start').click();
  await expect(page).toHaveURL(/#\/map$/);
}

async function answerFirst(page: Page) {
  await page.getByTestId('continue').click();
  await expect(page).toHaveURL(/#\/g\/1\/q\/C1$/);
  await page.getByLabel('Ответ').fill(ANSWER);
  await expect(page.getByTestId('save-status')).toContainText('✓');
}

test('ответ сохраняется и переживает перезагрузку', async ({ page }) => {
  await onboard(page);
  await answerFirst(page);
  await page.reload();
  await expect(page.getByLabel('Ответ')).toHaveValue(ANSWER);
});

test('«Далее» ведёт по группе маршрута к итогу группы', async ({ page }) => {
  await onboard(page);
  await answerFirst(page);
  await page.getByTestId('next').click();
  await expect(page).toHaveURL(/#\/g\/1\/q\/C4$/);
  await page.getByTestId('next').click();
  await expect(page).toHaveURL(/#\/g\/1\/done$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('пройдено частично');
  await page.getByRole('link', { name: /Следующая группа/ }).click();
  await expect(page).toHaveURL(/#\/g\/2\/q\/C3$/);
});

test('бэкап восстанавливается на «другом устройстве»', async ({ page, browser }) => {
  await onboard(page);
  await answerFirst(page);
  await page.goto('./#/map');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Скачать бэкап' }).first().click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^karta-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const other = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const page2 = await other.newPage();
  await page2.goto('./');
  await page2.getByTestId('import-input').setInputFiles((await download.path())!);
  await page2.getByRole('button', { name: 'Объединить' }).click();
  await expect(page2).toHaveURL(/#\/map$/);
  await page2.goto('./#/g/1/q/C1');
  await expect(page2.getByLabel('Ответ')).toHaveValue(ANSWER);
  await other.close();
});

test('выгрузка: файл с ответами и промпт под цель', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await onboard(page);
  await answerFirst(page);
  await page.goto('./#/export');
  await expect(page.getByTestId('task-select')).toHaveValue('job');
  await expect(page.getByTestId('prompt')).toHaveValue(/Задача — «Поиск работы»/);

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-md').click()]);
  const md = await readFile((await download.path())!, 'utf8');
  expect(md).toContain('#### C1. Какие занятия в детстве');
  expect(md).toContain(ANSWER);
  expect(md).toContain('**Зачем мне этот тест:** Найти работу');

  await page.getByRole('button', { name: 'Скопировать промпт', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Задача — «Поиск работы»');
});

test('список навыков: вставка списком и оценка 1–10', async ({ page }) => {
  await onboard(page);
  await page.goto('./#/g/3/q/C11');
  await page.getByPlaceholder('Навык').first().focus();
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/plain', '- Vue\n- SQL\n- Figma');
    document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByPlaceholder('Навык')).toHaveCount(3);
  await expect(page.getByPlaceholder('Навык').nth(1)).toHaveValue('SQL');

  await page.getByTestId('next').click();
  await expect(page).toHaveURL(/#\/g\/3\/q\/C12$/);
  await page.getByRole('radiogroup', { name: 'Оценка: Vue' }).getByRole('radio', { name: '9' }).click();
  await expect(page.getByText('могу учить других', { exact: true })).toBeVisible();
});

test('Big Five: предупреждение про ссылку с бланком', async ({ page }) => {
  await onboard(page);
  await page.goto('./#/big5');
  await page.getByLabel(/Ссылка на результат/).fill('https://psytests.org/result?v=abc&b=xyz');
  await expect(page.getByRole('alert')).toContainText('ссылка с бланком');
  await page.getByLabel(/Ссылка на результат/).fill('https://psytests.org/result?v=abc');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('ни одной ошибки в консоли на всех экранах (включая CSP)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page, 'Понять себя', 'Атлас');
  for (const route of ['#/map', '#/g/3/q/C11', '#/g/6/q/G23', '#/g/13/q/C59', '#/g/16/q/C74', '#/g/19/q/C92', '#/export', '#/big5', '#/rules']) {
    await page.goto(`./${route}`);
    await expect(page.locator('main')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('доступность: без серьёзных нарушений', async ({ page }) => {
  await page.goto('./');
  for (const route of ['#/start']) {
    await page.goto(`./${route}`);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  }
  await onboard(page);
  for (const route of ['#/map', '#/g/1/q/C1', '#/g/13/q/C59', '#/export']) {
    await page.goto(`./${route}`);
    await expect(page.locator('main')).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${route}: ${v.id}`)).toEqual([]);
  }
});

test('«Оставить разбору» помечает вопрос, и пометка попадает в выгрузку', async ({ page }) => {
  await onboard(page);
  await page.getByTestId('continue').click();
  await page.getByRole('button', { name: 'Оставить разбору' }).click();
  await expect(page.getByLabel('Ответ')).toBeFocused();
  await page.keyboard.type('не понимаю, что считать увлечением');
  await expect(page.getByLabel('Ответ')).toHaveValue('Оставляю для разбора: не понимаю, что считать увлечением');
  await expect(page.getByRole('button', { name: 'Оставить разбору' })).toHaveCount(0);
  await page.goto('./#/export');
  await expect(page.getByTestId('prompt')).toHaveValue(/«Оставляю для разбора:»/);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-md').click()]);
  expect(await readFile((await download.path())!, 'utf8')).toContain('Оставляю для разбора: не понимаю');
});
