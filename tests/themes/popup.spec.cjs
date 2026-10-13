const { test, expect } = require('@playwright/test');
const { themes, attachScreenshot, failOnPageErrors } = require('./helpers.cjs');

async function appearance(page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const header = getComputedStyle(document.querySelector('h1'));
    const card = getComputedStyle(document.querySelector('[data-theme]'));
    return { background: root.backgroundColor, color: root.color, font: header.fontFamily, radius: card.borderRadius, clip: card.clipPath };
  });
}

test('theme capabilities hide colors and preserve settings across reopening', async ({ page }, info) => {
  const errors = failOnPageErrors(page);
  await page.goto('/popup-demo.html');
  await expect(page.locator('body')).toHaveClass('ready');
  const neutral = await appearance(page);
  await page.locator('[data-accent=custom]').click();
  await page.locator('#customHex').fill('#22c55e');
  await page.locator('#customHex').press('Tab');
  for (const [theme, definition] of themes) {
    await page.locator(`[data-theme="${theme}"]`).click();
    await expect(page.locator(`[data-theme="${theme}"]`)).toHaveAttribute('aria-pressed', 'true');
    const panel = page.locator('#colorOptions');
    await expect.poll(() => panel.evaluate(element => element.getBoundingClientRect().height > 0)).toBe(definition.supportsAccent);
    expect(await panel.evaluate(element => element.inert)).toBe(!definition.supportsAccent);
    await expect(panel).toHaveAttribute('aria-hidden', String(!definition.supportsAccent));
    expect(await appearance(page)).toEqual(neutral);
    expect(await page.locator(`[data-theme="${theme}"]`).evaluate(element => element.scrollWidth <= element.clientWidth), 'Theme names fit their cards').toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.keyboard.press('Tab');
    if (!definition.supportsAccent) expect(await panel.locator(':focus').count()).toBe(0);
    const saved = await page.evaluate(async () => (await chrome.storage.local.get()).xGlass);
    expect(saved.theme).toBe(theme);
    expect(saved.customColor).toBe('#22c55e');
    expect(saved.accent).toBe('custom');
    await attachScreenshot(page, info, `${theme}-settings`);
  }
  const colorable = themes.find(([, theme]) => theme.supportsAccent)[0];
  await page.locator(`[data-theme="${colorable}"]`).click();
  await expect(page.locator('#customControls')).toBeVisible();
  await expect(page.locator('#customHex')).toHaveValue('#22c55e');
  await page.reload();
  await expect(page.locator('#customHex')).toHaveValue('#22c55e');
  await expect(page.locator(`[data-theme="${colorable}"]`)).toHaveAttribute('aria-pressed', 'true');
  errors();
});

test('rapid theme switching, motion preference, keyboard tabs and reset', async ({ page }, info) => {
  await page.goto('/popup-demo.html');
  await expect(page.locator('body')).toHaveClass('ready');
  for (const [theme] of [...themes, ...themes]) await page.locator(`[data-theme="${theme}"]`).click();
  const final = themes.at(-1);
  await expect.poll(() => page.locator('#colorOptions').evaluate(element => element.getBoundingClientRect().height > 0)).toBe(final[1].supportsAccent);
  const duration = await page.locator('#colorOptions').evaluate(element => getComputedStyle(element).transitionDuration);
  if (info.project.use.reducedMotion === 'reduce') expect(duration).toBe('0s');
  else expect(duration).toContain('0.2s');
  await page.locator('#themesTab').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#detailsTab')).toBeFocused();
  await expect(page.locator('#detailsPanel')).toBeVisible();
  await expect(page.locator('#themesPanel')).toBeHidden();
  await page.locator('#blur').fill('30');
  await expect(page.locator('#blurValue')).toHaveText('30 px');
  await page.locator('#reset').click();
  const saved = await page.evaluate(async () => (await chrome.storage.local.get()).xGlass);
  expect(saved).toEqual({ ...XGlow.defaults });
  expect(await page.locator('#cards').count()).toBe(0);
  await attachScreenshot(page, info, 'fine-tune-settings');
});
