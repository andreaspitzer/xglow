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
  assert.deepEqual(XGlow.normalize({ accent: 'url(https://example.com)', enabled: 'false', blur: Infinity, opacity: -10, cards: null, lite: true, sidebar: 'true' }), { ...XGlow.defaults, opacity: 0, lite: true });
  assert.equal(XGlow.normalize({ blur: 200, opacity: 200 }).blur, 40);
  assert.equal(XGlow.normalize({ blur: 200, opacity: 200 }).opacity, 90);
  assert.deepEqual(XGlow.normalize(null), XGlow.defaults);
  assert.equal(XGlow.normalize({ accent: 'ocean' }).sidebar, false);
});

test('Amber defaults and explicit zero effects survive storage normalization', () => {
  const initial = XGlow.normalize();
  assert.equal(initial.accent, 'amber');
  assert.equal(initial.tint, 50);
  assert.equal(initial.blur, 10);
  assert.equal(initial.opacity, 0);
  assert.deepEqual(XGlow.normalize(JSON.parse(JSON.stringify(initial))), initial);
  assert.equal(XGlow.normalize(JSON.parse(JSON.stringify({ ...initial, blur: 0 }))).blur, 0);
  assert.equal(XGlow.normalize({ blur: -1 }).blur, 0);
  assert.equal(XGlow.normalize({ accent: 'ocean', tint: 75, blur: 18, opacity: 49 }).blur, 18);
});

test('default preferences are exactly the shipped baseline', () => {
  assert.deepEqual({ ...XGlow.defaults }, { enabled: true, accent: 'amber', customColor: '#97a7ff', tint: 50, blur: 10, opacity: 0, lite: false, sidebar: false, theme: 'glass' });
  assert.ok(Object.isFrozen(XGlow.defaults));
  assert.equal(XGlow.storageKey, 'xGlass');
});

test('disabling and valid customizations survive normalization', () => {
  const value = { enabled: false, accent: 'ocean', blur: 12, opacity: 75, lite: true, sidebar: true };
  assert.deepEqual(XGlow.normalize(value), { ...XGlow.defaults, ...value });
});

test('legacy preferences retain appearance settings and discard the retired cards toggle', () => {
  // Before custom colors and tint, and before the sidebar toggle.
  const legacy = { enabled: true, accent: 'rose', blur: 18, opacity: 49, cards: false, lite: false };
  const retained = { enabled: true, accent: 'rose', blur: 18, opacity: 49, lite: false };
  assert.deepEqual(XGlow.normalize(legacy), { ...XGlow.defaults, ...retained });
  assert.ok(!('cards' in XGlow.normalize(legacy)));
  assert.equal(XGlow.normalize({ accent: 'aurora', blur: 27 }).sidebar, false);
});

test('custom colors are strict hexadecimal and retain saved preferences', () => {
  assert.equal(XGlow.normalize({ accent: 'custom', customColor: '#0F8', tint: 150 }).customColor, '#00ff88');
  assert.equal(XGlow.normalize({ accent: 'custom', customColor: '#0F8', tint: 150 }).tint, 100);
  for (const customColor of ['red', 'url(https://example.com)', '#123456; color:red', '#12345678', null]) {
    assert.equal(XGlow.normalize({ customColor }).customColor, XGlow.defaults.customColor);
  }
  assert.equal(XGlow.normalize({ tint: NaN }).tint, XGlow.defaults.tint);
  const old = XGlow.normalize({ accent: 'ocean', blur: 28, opacity: 35, sidebar: false });
  assert.equal(old.accent, 'ocean'); assert.equal(old.blur, 28); assert.equal(old.opacity, 35);
});

test('theme hues affect every surface while zero tint stays neutral in both tones', () => {
  const green = XGlow.palette({ accent: 'forest', tint: 100 }), red = XGlow.palette({ accent: 'ruby', tint: 100 });
  assert.ok(channels(green.base)[1] > channels(green.base)[0]);
  assert.ok(channels(red.base)[0] > channels(red.base)[1]);
  assert.notEqual(green.background, red.background);
  assert.equal(XGlow.palette({ accent: 'forest', tint: 0 }).base, XGlow.palette({ accent: 'ruby', tint: 0 }).base);
  assert.equal(XGlow.palette({ tint: 0 }).glowOpacity, '0');
  const light = XGlow.palette({ accent: 'custom', customColor: '#22c55e' }, 'light');
  assert.equal(light.hex, '#22c55e'); assert.ok(channels(light.base).every(channel => channel > 240));
});

test('black and white custom themes retain readable controls', () => {
  const text = luminance('17,27,51');
  for (const customColor of ['#000000', '#ffffff', '#0000ff', '#ff0000']) {
    const dark = XGlow.palette({ accent: 'custom', customColor });
    assert.ok((luminance(dark.controlEnd) + .05) / (text + .05) >= 4.5);
    assert.ok((luminance(dark.controlStart) + .05) / (text + .05) >= 4.5);
    assert.ok(luminance(dark.interfaceAccent) >= .25);
    assert.ok(luminance(XGlow.palette({ accent: 'custom', customColor }, 'light').interfaceAccent) <= .3);
  }
});

test('stylesheet fallbacks match the default palette', () => {
  const css = extensionFile('glass.css');
  const token = name => css.match(new RegExp(`${name}:\\s*([^;]+);`))[1].trim();
  const palette = XGlow.palette(XGlow.defaults);
  const normalizeNumbers = value => value.replace(/\s+/g, '').replace(/(^|,)\./g, '$10.');
  assert.equal(normalizeNumbers(token('--xlg-accent-rgb')), normalizeNumbers(palette.accent));
  assert.equal(normalizeNumbers(token('--xlg-control-start-rgb')), normalizeNumbers(palette.controlStart));
  assert.equal(normalizeNumbers(token('--xlg-base')), normalizeNumbers(palette.base));
  assert.equal(normalizeNumbers(token('--xlg-glow-secondary-rgb')), normalizeNumbers(palette.glowSecondary));
  assert.equal(normalizeNumbers(token('--xlg-glow-tertiary-rgb')), normalizeNumbers(palette.glowTertiary));
  assert.equal(Number(token('--xlg-glow-opacity')), Number(palette.glowOpacity));
  assert.equal(token('--xlg-bg'), palette.background.replace(/rgb\((\d+), (\d+), (\d+)\)/, (_, ...rgb) => '#' + rgb.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('')));
  assert.equal(normalizeNumbers(token('--xlg-border')), normalizeNumbers(palette.border));
  assert.equal(token('--xlg-blur'), `${XGlow.defaults.blur}px`);
  assert.equal(Number(token('--xlg-opacity')), XGlow.defaults.opacity / 100);
});

test('popup offers every accent and every stored preference', () => {
  const html = extensionFile('popup.html');
  for (const accent of [...Object.keys(XGlow.accents), 'custom']) assert.match(html, new RegExp(`data-accent="${accent}"`));
  for (const id of ['enabled', 'tint', 'blur', 'opacity', 'lite', 'sidebar', 'themeOptions', 'customColor', 'customHex']) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /id="cards"/);
  for (const [id, max] of [['tint', 100], ['blur', 40], ['opacity', 90]]) assert.match(html, new RegExp(`id="${id}" type="range" min="0" max="${max}"`));
});

test('the theme defaults to glass and invalid values fall back to it', () => {
  assert.equal(XGlow.defaults.theme, 'glass');
  for (const id of ['glass', 'cyberpunk', 'hud']) assert.ok(XGlow.themes.includes(id));
  for (const theme of XGlow.themes) assert.equal(XGlow.normalize({ theme }).theme, theme);
  for (const theme of ['__unregistered__', 'HUD', '', 1, null, undefined, {}]) assert.equal(XGlow.normalize({ theme }).theme, 'glass');
  assert.equal(XGlow.normalize({ theme: 'hud' }).tint, XGlow.defaults.tint);
});

test('preferences from the cyberpunk toggle migrate to the theme choice', () => {
  assert.equal(XGlow.normalize({ cyberpunk: true }).theme, 'cyberpunk');
  assert.equal(XGlow.normalize({ cyberpunk: false }).theme, 'glass');
  assert.equal(XGlow.normalize({ cyberpunk: 'true' }).theme, 'glass');
  assert.equal(XGlow.normalize({ theme: 'hud', cyberpunk: true }).theme, 'hud');
  assert.ok(!('cyberpunk' in XGlow.normalize({ cyberpunk: true })));
  // Preferences saved before themes existed keep every value.
  const legacy = { enabled: true, accent: 'rose', blur: 18, opacity: 49, lite: false, sidebar: true };
  assert.deepEqual(XGlow.normalize(legacy), { ...XGlow.defaults, ...legacy });
});

test('every theme palette has the same keys and the glass palette is unchanged', () => {
  for (const tone of ['dark', 'light']) {
    const glass = XGlow.palette({ accent: 'ocean' }, tone);
    for (const theme of XGlow.themes) {
      const themed = XGlow.palette({ accent: 'ocean', theme }, tone);
      assert.deepEqual(Object.keys(themed).sort(), Object.keys(glass).sort());
      assert.ok(channels(themed.secondary).length === 3);
    }
    assert.deepEqual(XGlow.palette({ accent: 'ocean', theme: 'glass' }, tone), XGlow.palette({ accent: 'ocean' }, tone));
  }
});

test('every registered theme honors its color capability and returns valid palette values', () => {
  const rgbKeys = ['accent', 'interfaceAccent', 'secondary', 'controlStart', 'controlEnd', 'base', 'glowSecondary', 'glowTertiary'];
  const opacityKeys = ['glowOpacity', 'glowSecondaryOpacity', 'glowTertiaryOpacity'];
  const validRgb = (value, context) => {
    assert.match(value, /^\d+,\s*\d+,\s*\d+$/, context);
    assert.ok(channels(value).every(channel => channel >= 0 && channel <= 255), context);
  };
  const keys = Object.keys(XGlow.palette()).sort();
  for (const [theme, definition] of Object.entries(XGlow.themeDefinitions)) {
    for (const tone of ['dark', 'light']) {
      for (const tint of [0, 50, 100]) {
        const fixed = XGlow.palette({ theme, tint }, tone);
        for (const accent of [...Object.keys(XGlow.accents), 'custom']) {
          for (const customColor of ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']) {
            const settings = { theme, tint, accent, customColor };
            const palette = XGlow.palette(settings, tone);
            const context = `${theme} ${tone} ${tint} ${accent} ${customColor}`;
            assert.deepEqual(Object.keys(palette).sort(), keys, context);
            for (const key of rgbKeys) validRgb(palette[key], `${context} ${key}`);
            for (const key of ['hex', 'interfaceHex']) assert.match(palette[key], /^#[\da-f]{6}$/, context);
            const background = palette.background.match(/^rgb\(([^)]+)\)$/);
            assert.ok(background, context);
            validRgb(background[1], context);
            const border = palette.border.match(/^rgba\((\d+,\s*\d+,\s*\d+),\s*([\d.]+)\)$/);
            assert.ok(border, context);
            validRgb(border[1], context);
            assert.ok(Number.isFinite(Number(border[2])) && Number(border[2]) >= 0 && Number(border[2]) <= 1, context);
            for (const key of opacityKeys) {
              assert.equal(typeof palette[key], 'string', context);
              const opacity = Number(palette[key]);
              assert.ok(Number.isFinite(opacity) && opacity >= 0 && opacity <= 1, context);
              if (tint === 0) assert.equal(opacity, 0, context);
            }
            if (definition.supportsAccent) {
              const selected = XGlow.palette({ ...settings, theme: 'glass' }, tone);
              assert.equal(palette.hex, selected.hex, context);
              assert.equal(palette.accent, selected.accent, context);
            } else {
              assert.deepEqual(palette, fixed, context);
            }
          }
        }
      }
    }
  }
});

test('the neon palette goes darker and pairs the accent with a second neon', () => {
  for (const tone of ['dark', 'light']) {
    const glass = XGlow.palette({ accent: 'ocean' }, tone), neon = XGlow.palette({ accent: 'ocean', theme: 'cyberpunk' }, tone);
    assert.notEqual(neon.secondary, neon.interfaceAccent);
    assert.notEqual(neon.background, glass.background);
    assert.equal(neon.hex, glass.hex);
  }
  const dark = XGlow.palette({ accent: 'forest', theme: 'cyberpunk' });
  assert.ok(Math.max(...channels(dark.base)) < 60 && luminance(dark.base) < .02);
  assert.equal(XGlow.palette({ theme: 'cyberpunk', tint: 0 }).glowOpacity, '0');
});

test('neon partner colors are vivid and distinct from every accent', () => {
  for (const accent of [...Object.keys(XGlow.accents), 'custom']) {
    for (const customColor of ['#000000', '#ffffff', '#808080', '#97a7ff']) {
      const settings = { accent, customColor, theme: 'cyberpunk' };
      const dark = XGlow.palette(settings), light = XGlow.palette(settings, 'light');
      assert.ok(channels(dark.secondary).every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255));
      assert.notEqual(dark.secondary, dark.accent);
      assert.ok(luminance(light.secondary) <= .3, `${accent} ${customColor} partner must be readable on light`);
      assert.ok(luminance(light.interfaceAccent) <= .3);
      assert.ok(luminance(dark.interfaceAccent) >= .25);
    }
  }
  // Amber pairs with cyan, as in the stylesheet fallback.
  assert.equal(XGlow.palette(XGlow.defaults).secondary, '41, 226, 255');
});

test('the HUD palette is fixed red and cyan whatever the accent, and stays legible', () => {
  const reference = XGlow.palette({ theme: 'hud' });
  for (const accent of [...Object.keys(XGlow.accents), 'custom']) {
    for (const tone of ['dark', 'light']) {
      const one = XGlow.palette({ accent, customColor: '#00ff00', theme: 'hud' }, tone);
      assert.deepEqual(one, XGlow.palette({ theme: 'hud' }, tone));
      assert.equal(one.controlEnd, one.secondary);
      assert.notEqual(one.interfaceAccent, one.secondary);
    }
  }
  const [red, , blue] = channels(reference.interfaceAccent);
  assert.ok(red > 200 && blue < 120 && luminance(reference.interfaceAccent) >= .25);
  const [cyanRed, cyanGreen] = channels(reference.secondary);
  assert.ok(cyanRed < 150 && cyanGreen > 200);
  const light = XGlow.palette({ theme: 'hud' }, 'light');
  assert.ok(luminance(light.interfaceAccent) <= .3 && luminance(light.secondary) <= .3);
  assert.ok(luminance(reference.base) < .02 && luminance(light.base) > .85);
  assert.equal(XGlow.palette({ theme: 'hud', tint: 0 }).glowOpacity, '0');
});

test('theme stylesheets are gated, loaded in order and fallbacks match', () => {
  const manifest = JSON.parse(extensionFile('manifest.json'));
  assert.deepEqual(manifest.content_scripts[0].css, Object.values(XGlow.themeDefinitions).map(theme => theme.stylesheet));
  const topLevel = list => {
    const parts = []; let depth = 0, start = 0;
    [...list].forEach((char, i) => {
      if (char === '(' || char === '[') depth++;
      if (char === ')' || char === ']') depth--;
      if (char === ',' && !depth) { parts.push(list.slice(start, i)); start = i + 1; }
    });
    return [...parts, list.slice(start)].map(part => part.trim());
  };
  for (const [id, theme] of Object.entries(XGlow.themeDefinitions)) {
    if (id === 'glass') continue;
    const file = theme.stylesheet;
    const gates = [`html[data-xlg][data-xlg-theme="${id}"]`, `html[data-xlg][data-xlg-theme='${id}']`, `html[data-xlg][data-xlg-theme=${id}]`];
    if (theme.marker) gates.push(`html[data-xlg][${theme.marker}]`);
    let css = extensionFile(file).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /@import\b|@font-face\b|url\(\s*['"]?(?:https?:|\/\/)/i, `${id}: theme assets must stay local`);
    for (const property of css.matchAll(/(--[\w-]+)\s*:/g)) assert.ok(property[1].startsWith('--xlg-'), `${id}: unnamespaced token ${property[1]}`);
    css = css.replace(/@keyframes\s+([\w-]+)\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, (block, name) => {
      assert.ok(name.startsWith(`xlg-${id}-`), `${id}: unnamespaced keyframe ${name}`);
      return '';
    });
    const preludes = css.replace(/\{[^{}]*\}/g, '\u0000').split('\u0000').map(part => part.replace(/@(?:media|supports|container|layer)[^{]*\{/g, '').replace(/\}/g, '').trim()).filter(Boolean);
    const selectors = preludes.flatMap(topLevel);
    assert.ok(selectors.length > 0, file);
    for (const selector of selectors) assert.ok(gates.some(gate => selector.startsWith(gate)), `Ungated selector in ${file}: ${selector}`);
  }
  const fallback = extensionFile('glass.css').match(/--xlg-secondary-rgb:\s*([^;]+);/)[1].trim();
  assert.equal(fallback.replace(/\s+/g, ''), XGlow.palette(XGlow.defaults).secondary.replace(/\s+/g, ''));
});

test('theme registry drives the catalog, palettes, style loading and Chat shapes', () => {
  assert.ok(Object.isFrozen(XGlow.themeDefinitions));
  assert.deepEqual(Object.keys(XGlow.themeDefinitions), [...XGlow.themes]);
  const stylesheets = Object.values(XGlow.themeDefinitions).map(theme => theme.stylesheet);
  assert.equal(new Set(stylesheets).size, stylesheets.length);
  for (const [id, theme] of Object.entries(XGlow.themeDefinitions)) {
    assert.match(id, /^[a-z][a-z0-9-]*$/);
    assert.ok(Object.isFrozen(theme));
    assert.ok(theme.label && theme.icon, id);
    assert.ok(['rounded', 'square', 'cut'].includes(theme.chatShape), id);
    assert.equal(typeof theme.supportsAccent, 'boolean', id);
    assert.equal(typeof theme.palette, 'function');
    assert.match(theme.stylesheet, /^[a-z][a-z0-9-]*\.css$/);
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'extension', theme.stylesheet)));
    if (theme.marker) assert.match(theme.marker, /^data-xlg-[a-z-]+$/);
  }
  const html = extensionFile('popup.html');
  assert.match(html, /<legend>Theme<\/legend>/);
  assert.match(html, /<legend>Color<\/legend>/);
  assert.match(html, /id="themeOptions"/);
  assert.match(html, /id="colors"/);
  assert.doesNotMatch(html, /neonAccent|neonControls/);
  assert.doesNotMatch(extensionFile('popup.css'), /data-theme/);
  assert.doesNotMatch(extensionFile('popup.js'), /document\.documentElement\.(dataset|style)/);
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
