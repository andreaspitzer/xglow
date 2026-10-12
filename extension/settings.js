/* Preferences and palette, shared by the content script and the popup. */
globalThis.XGlow = (() => {
  const storageKey = 'xGlass';

  const defaults = Object.freeze({
    enabled: true,
    accent: 'amber',
    customColor: '#97a7ff',
    tint: 50,
    blur: 10,
    opacity: 0,
    cards: true,
    lite: false,
    sidebar: false
  });

  const accents = Object.freeze({
    aurora: '151, 167, 255',
    ocean: '91, 204, 232',
    forest: '72, 211, 151',
    ruby: '244, 92, 108',
    rose: '239, 157, 198',
    amber: '244, 185, 82',
    silver: '176, 193, 213'
  });

  const WHITE = [255, 255, 255];
  const BLACK = [0, 0, 0];

  /* Returns a lowercase #rrggbb color, or null for anything else. */
  function colorHex(value) {
    if (typeof value !== 'string') return null;
    const hex = value.trim().toLowerCase();
    if (/^#[\da-f]{6}$/.test(hex)) return hex;
    if (/^#[\da-f]{3}$/.test(hex)) return '#' + [...hex.slice(1)].map(char => char + char).join('');
    return null;
  }

  const clamp = (number, min, max, fallback) =>
    Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;

  const boolean = (value, fallback) => typeof value === 'boolean' ? value : fallback;

  /* Stored values may come from older versions or be corrupted: every field
     is validated independently, and missing fields take their default. */
  function normalize(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    return {
      enabled: boolean(value.enabled, defaults.enabled),
      accent: value.accent === 'custom' || Object.hasOwn(accents, value.accent) ? value.accent : defaults.accent,
      customColor: colorHex(value.customColor) || defaults.customColor,
      tint: clamp(value.tint, 0, 100, defaults.tint),
      blur: clamp(value.blur, 0, 40, defaults.blur),
      opacity: clamp(value.opacity, 0, 90, defaults.opacity),
      cards: boolean(value.cards, defaults.cards),
      lite: boolean(value.lite, defaults.lite),
      sidebar: boolean(value.sidebar, defaults.sidebar)
    };
  }

  /* Linear blend from `from` towards `to`; amount 1 returns `to`. */
  const mix = (from, to, amount) => from.map((channel, i) => Math.round(channel * (1 - amount) + to[i] * amount));

  /* WCAG relative luminance of an sRGB triplet. */
  const luminance = channels => channels.map(channel => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  }).reduce((total, channel, i) => total + channel * [.2126, .7152, .0722][i], 0);

  const toHex = channels => '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join('');

  const accentChannels = settings => settings.accent === 'custom'
    ? settings.customColor.slice(1).match(/../g).map(channel => parseInt(channel, 16))
    : accents[settings.accent].split(',').map(Number);

  /* Fades the accent towards `target` until `isReadable` holds, so very dark
     or very light custom colors still produce legible controls. */
  function readableVariant(rgb, target, isReadable) {
    let color = rgb, weight = 1;
    while (!isReadable(luminance(color)) && weight > 0) {
      weight -= .05;
      color = mix(target, rgb, Math.max(0, weight));
    }
    return color;
  }

  /* Derives every themed color from the accent, tint and X's own tone. */
  function palette(value, tone = 'dark') {
    const settings = normalize(value);
    const rgb = accentChannels(settings);
    const strength = settings.tint / 100;
    const light = tone === 'light';
    const base = mix(light ? WHITE : [18, 20, 24], rgb, strength * (light ? .08 : .24));
    const background = mix(light ? [238, 242, 246] : [8, 10, 14], rgb, strength * (light ? .16 : .09));
    // Primary buttons render dark text on the accent gradient.
    const controlEnd = readableVariant(rgb, WHITE, value => value >= .25);
    // Accents used as text or outlines must contrast with the page.
    const interfaceAccent = light ? readableVariant(rgb, BLACK, value => value <= .3) : controlEnd;
    return {
      accent: rgb.join(', '),
      hex: toHex(rgb),
      interfaceAccent: interfaceAccent.join(', '),
      interfaceHex: toHex(interfaceAccent),
      controlEnd: controlEnd.join(', '),
      controlStart: controlEnd.map(channel => Math.round(channel * .55 + 255 * .45)).join(', '),
      base: base.join(', '),
      background: `rgb(${background.join(', ')})`,
      glowSecondary: mix(WHITE, rgb, .88).join(', '),
      glowTertiary: mix(WHITE, rgb, .96).join(', '),
      glowOpacity: String(strength * .4),
      glowSecondaryOpacity: String(strength * .27),
      glowTertiaryOpacity: String(strength * .24),
      border: `rgba(${mix([235, 235, 235], rgb, .15).join(', ')}, ${light ? .72 : .16})`
    };
  }

  return { storageKey, defaults, accents, normalize, colorHex, palette };
})();
