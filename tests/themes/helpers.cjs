const { expect } = require('@playwright/test');
require('../../extension/settings.js');

const themes = Object.entries(XGlow.themeDefinitions);

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function apply(page, settings) {
  await page.evaluate(value => chrome.storage.local.set({ xGlass: value }), settings);
  await expect(page.locator('html')).toHaveAttribute('data-xlg-theme', settings.theme || XGlow.defaults.theme);
  await settle(page);
}

async function fixture(page, theme, tone) {
  await page.goto('/layout-fixture.html');
  await page.evaluate(value => {
    document.body.style.backgroundColor = value === 'light' ? 'rgb(255,255,255)' : 'rgb(0,0,0)';
    document.body.style.color = value === 'light' ? 'rgb(15,20,25)' : 'rgb(231,233,234)';
  }, tone);
  await apply(page, { theme });
  await expect(page.locator('html')).toHaveAttribute('data-xlg-tone', tone);
  await expect(page.locator('[data-xlg-toolbar]')).toHaveCount(1);
}

async function attachScreenshot(page, info, name) {
  await info.attach(name, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
}

function failOnPageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return () => expect(errors, 'No uncaught browser errors').toEqual([]);
}

module.exports = { themes, apply, settle, fixture, attachScreenshot, failOnPageErrors };
