const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../extension/settings.js');

const extensionFile = name => fs.readFileSync(path.join(__dirname, '..', 'extension', name), 'utf8');
const channels = value => value.split(',').map(Number);
const luminance = rgb => channels(rgb).map(channel => {
  const value = channel / 255;
  return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}).reduce((sum, channel, i) => sum + channel * [.2126, .7152, .0722][i], 0);

test('corrupted stored preferences cannot produce unsafe or unusable CSS values', () => {
  assert.deepEqual(XGlass.normalize({ accent: 'url(https://example.com)', enabled: 'false', blur: Infinity, opacity: -10, cards: null, lite: true, sidebar: 'true' }), { ...XGlass.defaults, opacity: 0, lite: true });
  assert.equal(XGlass.normalize({ blur: 200, opacity: 200 }).blur, 40);
  assert.equal(XGlass.normalize({ blur: 200, opacity: 200 }).opacity, 90);
  assert.deepEqual(XGlass.normalize(null), XGlass.defaults);
  assert.equal(XGlass.normalize({ accent: 'ocean' }).sidebar, false);
});

test('Amber defaults and explicit zero effects survive storage normalization', () => {
  const initial = XGlass.normalize();
  assert.equal(initial.accent, 'amber');
  assert.equal(initial.tint, 50);
  assert.equal(initial.blur, 10);
  assert.equal(initial.opacity, 0);
  assert.deepEqual(XGlass.normalize(JSON.parse(JSON.stringify(initial))), initial);
  assert.equal(XGlass.normalize(JSON.parse(JSON.stringify({ ...initial, blur: 0 }))).blur, 0);
  assert.equal(XGlass.normalize({ blur: -1 }).blur, 0);
  assert.equal(XGlass.normalize({ accent: 'ocean', tint: 75, blur: 18, opacity: 49 }).blur, 18);
});

test('default preferences are exactly the shipped baseline', () => {
  assert.deepEqual({ ...XGlass.defaults }, { enabled: true, accent: 'amber', customColor: '#97a7ff', tint: 50, blur: 10, opacity: 0, cards: true, lite: false, sidebar: false });
  assert.ok(Object.isFrozen(XGlass.defaults));
  assert.equal(XGlass.storageKey, 'xGlass');
});

test('disabling and valid customizations survive normalization', () => {
  const value = { enabled: false, accent: 'ocean', blur: 12, opacity: 75, cards: false, lite: true, sidebar: true };
  assert.deepEqual(XGlass.normalize(value), { ...XGlass.defaults, ...value });
});

test('preferences saved by earlier versions keep their values', () => {
  // Before custom colors and tint, and before the sidebar toggle.
  const legacy = { enabled: true, accent: 'rose', blur: 18, opacity: 49, cards: false, lite: false };
  assert.deepEqual(XGlass.normalize(legacy), { ...XGlass.defaults, ...legacy });
  assert.equal(XGlass.normalize({ accent: 'aurora', blur: 27 }).sidebar, false);
});

test('custom colors are strict hexadecimal and retain saved preferences', () => {
  assert.equal(XGlass.normalize({ accent: 'custom', customColor: '#0F8', tint: 150 }).customColor, '#00ff88');
  assert.equal(XGlass.normalize({ accent: 'custom', customColor: '#0F8', tint: 150 }).tint, 100);
  for (const customColor of ['red', 'url(https://example.com)', '#123456; color:red', '#12345678', null]) {
    assert.equal(XGlass.normalize({ customColor }).customColor, XGlass.defaults.customColor);
  }
  assert.equal(XGlass.normalize({ tint: NaN }).tint, XGlass.defaults.tint);
  const old = XGlass.normalize({ accent: 'ocean', blur: 28, opacity: 35, sidebar: false });
  assert.equal(old.accent, 'ocean'); assert.equal(old.blur, 28); assert.equal(old.opacity, 35);
});

test('theme hues affect every surface while zero tint stays neutral in both tones', () => {
  const green = XGlass.palette({ accent: 'forest', tint: 100 }), red = XGlass.palette({ accent: 'ruby', tint: 100 });
  assert.ok(channels(green.base)[1] > channels(green.base)[0]);
  assert.ok(channels(red.base)[0] > channels(red.base)[1]);
  assert.notEqual(green.background, red.background);
  assert.equal(XGlass.palette({ accent: 'forest', tint: 0 }).base, XGlass.palette({ accent: 'ruby', tint: 0 }).base);
  assert.equal(XGlass.palette({ tint: 0 }).glowOpacity, '0');
  const light = XGlass.palette({ accent: 'custom', customColor: '#22c55e' }, 'light');
  assert.equal(light.hex, '#22c55e'); assert.ok(channels(light.base).every(channel => channel > 240));
});

test('black and white custom themes retain readable controls', () => {
  const text = luminance('17,27,51');
  for (const customColor of ['#000000', '#ffffff', '#0000ff', '#ff0000']) {
    const dark = XGlass.palette({ accent: 'custom', customColor });
    assert.ok((luminance(dark.controlEnd) + .05) / (text + .05) >= 4.5);
    assert.ok((luminance(dark.controlStart) + .05) / (text + .05) >= 4.5);
    assert.ok(luminance(dark.interfaceAccent) >= .25);
    assert.ok(luminance(XGlass.palette({ accent: 'custom', customColor }, 'light').interfaceAccent) <= .3);
  }
});

test('stylesheet fallbacks and popup accent match the default palette', () => {
  const css = extensionFile('glass.css');
  const token = name => css.match(new RegExp(`${name}:\\s*([^;]+);`))[1].trim();
  const palette = XGlass.palette(XGlass.defaults);
  const normalizeNumbers = value => value.replace(/\s+/g, '').replace(/(^|,)\./g, '$10.');
  assert.equal(normalizeNumbers(token('--xlg-accent-rgb')), normalizeNumbers(palette.accent));
  assert.equal(normalizeNumbers(token('--xlg-control-start-rgb')), normalizeNumbers(palette.controlStart));
  assert.equal(normalizeNumbers(token('--xlg-base')), normalizeNumbers(palette.base));
  assert.equal(normalizeNumbers(token('--xlg-glow-secondary-rgb')), normalizeNumbers(palette.glowSecondary));
  assert.equal(normalizeNumbers(token('--xlg-glow-tertiary-rgb')), normalizeNumbers(palette.glowTertiary));
  assert.equal(Number(token('--xlg-glow-opacity')), Number(palette.glowOpacity));
  assert.equal(token('--xlg-bg'), palette.background.replace(/rgb\((\d+), (\d+), (\d+)\)/, (_, ...rgb) => '#' + rgb.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('')));
  assert.equal(normalizeNumbers(token('--xlg-border')), normalizeNumbers(palette.border));
  assert.equal(token('--xlg-blur'), `${XGlass.defaults.blur}px`);
  assert.equal(Number(token('--xlg-opacity')), XGlass.defaults.opacity / 100);
  assert.match(extensionFile('popup.css'), new RegExp(`--accent:\\s*${palette.interfaceHex};`));
});

test('popup offers every accent and every stored preference', () => {
  const html = extensionFile('popup.html');
  for (const accent of [...Object.keys(XGlass.accents), 'custom']) assert.match(html, new RegExp(`data-accent="${accent}"`));
  for (const id of ['enabled', 'tint', 'blur', 'opacity', 'cards', 'lite', 'sidebar', 'customColor', 'customHex']) assert.match(html, new RegExp(`id="${id}"`));
  for (const [id, max] of [['tint', 100], ['blur', 40], ['opacity', 90]]) assert.match(html, new RegExp(`id="${id}" type="range" min="0" max="${max}"`));
});

test('manifest loads only local files and limits injection to X/Twitter', () => {
  const manifest = JSON.parse(extensionFile('manifest.json'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.ok(manifest.content_scripts[0].matches.every(pattern => /^https:\/\/(www\.)?(x|twitter)\.com\/\*$/.test(pattern)));
  for (const file of [...manifest.content_scripts[0].css, ...manifest.content_scripts[0].js, manifest.action.default_popup]) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'extension', file)));
  }
  assert.match(extensionFile('popup.html'), new RegExp(`id="version">${manifest.version.replaceAll('.', '\\.')}<`));
});
