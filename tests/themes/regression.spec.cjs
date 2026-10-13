const { test, expect } = require('@playwright/test');
const { failOnPageErrors } = require('./helpers.cjs');

for (const suite of ['layout', 'conversation-frame', 'navigation-thread', 'search', 'chat', 'compact-nav', 'centering', 'reply-composer', 'post-spacing']) {
  test(`shared runtime: ${suite}`, async ({ page }) => {
    const errors = failOnPageErrors(page);
    await page.goto(`/${suite}.test.html`);
    await expect(page.locator('#test-result')).toBeAttached({ timeout: 15000 });
    const result = JSON.parse(await page.locator('#test-result').textContent());
    expect(result.passed, result.error).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
    errors();
  });
}
