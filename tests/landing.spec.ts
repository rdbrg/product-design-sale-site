import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`layout and screenshots at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    const failures: string[] = [];
    const externalRequests: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4321') && !request.url().startsWith('data:')) externalRequests.push(request.url()); });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Проектирую цифровые продукты и помогаю автоматизировать работу бизнеса');
    await expect(page.locator('#contact-title')).toHaveText('Расскажите, что хотите запустить или улучшить');
    await expect(page.locator('.service')).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const overflow = await page.locator('main *').evaluateAll(elements => elements.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1);
    }).map(element => `${element.tagName}.${element.className}`));
    expect(overflow).toEqual([]);
    const folder = `artifacts/screenshots/${testInfo.project.name}-${width}`;
    await page.screenshot({ path: `${folder}-hero.png` });
    for (const id of ['services', 'experience', 'contact']) {
      await page.locator(`#${id}`).evaluate(element => element.scrollIntoView({ behavior: 'instant' }));
      await page.screenshot({ path: `${folder}-${id}.png` });
    }
    for (const image of await page.locator('.case img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBeTruthy();
    }
    await page.screenshot({ path: `${folder}-full.png`, fullPage: true });
    expect(await page.locator('.case img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBeTruthy();
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
    expect(externalRequests).toEqual([]);
  });
}

test('mobile menu, Escape, anchors and keyboard disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Меню' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.getByRole('navigation').getByRole('link', { name: 'Услуги', exact: true }).click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page).toHaveURL(/#services$/);
  await expect.poll(() => page.locator('#services').evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(72);
  const summary = page.locator('#audit summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#audit details')).toHaveAttribute('open', '');
  await page.keyboard.press('Space');
  await expect(page.locator('#audit details')).not.toHaveAttribute('open', '');
  const faq = page.locator('.faq-list summary').first();
  await faq.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.faq-list details').first()).toHaveAttribute('open', '');
});

test('clipboard success, manual fallback and analytics hooks', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const target = window as typeof window & { capturedText: string; capturedEvents: unknown[] };
    target.capturedEvents = [];
    window.addEventListener('rodberg:analytics', event => target.capturedEvents.push((event as CustomEvent).detail));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { target.capturedText = text; } } });
  });
  await page.getByRole('button', { name: 'Скопировать шаблон обращения' }).click();
  await expect(page.getByRole('status')).toContainText('Шаблон скопирован');
  expect(await page.evaluate(() => (window as typeof window & { capturedText: string }).capturedText)).toBe(await page.locator('#brief').inputValue());
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
  await page.getByRole('button', { name: 'Скопировать шаблон обращения' }).click();
  await expect(page.getByRole('status')).toContainText('Скопируйте его вручную');
  await expect(page.locator('#brief')).toBeFocused();
  expect(await page.locator('#brief').evaluate(element => (element as HTMLTextAreaElement).selectionEnd - (element as HTMLTextAreaElement).selectionStart)).toBeGreaterThan(100);
  await page.evaluate(() => {
    // Prevent external navigation while exercising the real click handlers.
    document.addEventListener('click', event => event.preventDefault(), { capture: true });
  });
  await page.locator('.hero [data-event="primary_cta"]').click();
  await page.locator('#audit [data-event="service_contact"]').click();
  await page.locator('.case-content [data-event="case_open"]').first().click();
  await page.locator('.contact-email').click();
  const events = await page.evaluate(() => (window as typeof window & { capturedEvents: { name: string }[] }).capturedEvents);
  expect(events.map(event => event.name)).toEqual(expect.arrayContaining(['template_copy', 'primary_cta', 'service_contact', 'case_open', 'telegram_click', 'email_click']));
  expect(JSON.stringify(events)).not.toContain('Здравствуйте');
});

test('semantics, contrast and metadata', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Продуктовый дизайн и автоматизация бизнеса — Вадим Родберг');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Вадим Родберг/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Проектирование B2B/);
  await expect(page.locator('a[href^="mailto:"]').first()).toHaveAttribute('href', 'mailto:vadimrodberg@gmail.com');
  await expect(page.locator('form')).toHaveCount(0);
  await page.locator('details').evaluateAll(elements => elements.forEach(element => element.setAttribute('open', '')));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
});

test('content available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.service')).toHaveCount(5);
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.locator('#audit summary').click();
  await expect(page.locator('#audit details')).toHaveAttribute('open', '');
  await expect(page.locator('#brief')).toHaveValue(/Здравствуйте, Вадим!/);
  await expect(page.getByRole('button', { name: 'Скопировать шаблон обращения' })).toBeHidden();
  await context.close();
});

test('reduced motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
});

test('native clipboard in Chromium', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Clipboard permissions are browser-specific; fallback is tested in both engines.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Скопировать шаблон обращения' }).click();
  await expect(page.getByRole('status')).toContainText('Шаблон скопирован');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.replaceAll('\r\n', '\n')).toBe(await page.locator('#brief').inputValue());
});

test('all anchors resolve and all CTA destinations are correct', async ({ page }) => {
  await page.goto('/');
  const invalidAnchors = await page.locator('a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute('href')!).filter(href => !document.querySelector(href)));
  expect(invalidAnchors).toEqual([]);
  for (const link of await page.locator('[data-event="primary_cta"], [data-event="service_contact"], [data-event="telegram_click"]').all()) {
    await expect(link).toHaveAttribute('href', 'https://t.me/VadimRodberg');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
});
