const { defineConfig } = require('@playwright/test');

if (!process.env.XGLOW_TEST_BASE_URL) throw new Error('Run npm run test:themes to prepare the fixture server.');

module.exports = defineConfig({
  testDir: './tests/themes',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: './artifacts/themes/results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/themes/report', open: 'never' }],
    ['json', { outputFile: 'artifacts/themes/report.json' }]
  ],
  use: {
    baseURL: process.env.XGLOW_TEST_BASE_URL,
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block'
  },
  projects: [
    ...['dark', 'light'].flatMap(colorScheme => [
      { name: `desktop-${colorScheme}`, testMatch: 'matrix.spec.cjs', use: { viewport: { width: 1440, height: 1000 }, colorScheme } },
      { name: `compact-${colorScheme}`, testMatch: 'matrix.spec.cjs', use: { viewport: { width: 700, height: 900 }, colorScheme } },
      { name: `narrow-${colorScheme}`, testMatch: 'matrix.spec.cjs', use: { viewport: { width: 390, height: 844 }, colorScheme } }
    ]),
    { name: 'settings', testMatch: 'popup.spec.cjs', use: { viewport: { width: 400, height: 600 }, reducedMotion: 'no-preference' } },
    { name: 'settings-reduced-motion', testMatch: 'popup.spec.cjs', use: { viewport: { width: 400, height: 600 }, reducedMotion: 'reduce' } },
    { name: 'regressions', testMatch: 'regression.spec.cjs', use: { viewport: { width: 1280, height: 900 } } }
  ]
});
