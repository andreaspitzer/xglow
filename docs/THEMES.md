# Theme contribution contract

This is the canonical contract for theme contributions, including work by coding agents. It defines the shared interface and the behavior every theme must preserve. Read it alongside [Contributing](../CONTRIBUTING.md) and the [DOM integration constraints](DEVELOPMENT.md#integration-constraints).

## Current design

`XGlow.themeDefinitions` in [settings.js](../extension/settings.js) is the single registry. Its keys are stable preference IDs; the popup generates a card for every registered theme. The runtime exposes the selected ID as `data-xlg-theme` on the root, computes its palette and applies its Chat shape.

| Theme ID | Appearance | Colors | Chat shape |
| --- | --- | --- | --- |
| `glass` | Liquid Glass | Shared presets and custom HEX | `rounded` |
| `cyberpunk` | Cyberpunk Neon | Shared presets and HEX, with a derived second accent | `square` |
| `hud` | Cyberpunk HUD | Fixed red/cyan palette, with darker teal in light mode for text contrast | `cut` |

Theme and accent are independent preferences. Switching themes preserves the selected accent. A fixed palette ignores that accent without overwriting it; returning to a colorable theme restores the color controls and the saved selection. The shared popup animates the whole color section, including HEX controls, and makes hidden controls inert. Reduced-motion preferences disable the animation.

All settings surfaces remain neutral. Theme cards show an icon and name only. Cards are part of every enabled theme; post-detail replies retain X's connected flow. Defaults remain Liquid Glass, Amber, 50% tint, 10 px blur and 0% opacity.

## Register a theme

Add a frozen entry to `themeDefinitions` in `extension/settings.js`, plus its palette function and a local stylesheet. Add the stylesheet to `content_scripts[0].css` in the manifest, keeping `glass.css` first. Registration generates the popup card and validates stored theme IDs automatically; it does not load CSS automatically.

```js
paper: Object.freeze({
  label: 'Paper',
  stylesheet: 'paper.css',
  icon: 'M4 3h16v18H4zM8 7h8M8 11h8',
  marker: null,
  chatShape: 'rounded',
  supportsAccent: true,
  palette: paperPalette
})
```

The example illustrates registration, not a complete theme: implement `paperPalette` and its stylesheet before using it.

| Field | Contract |
| --- | --- |
| Registry key | Unique lowercase ID, starting with a letter; remaining characters may be letters, digits or hyphens. Keep it stable after shipping. |
| `label` | Short readable name shown on the card. No description or preview. |
| `icon` | Local SVG path data in a 24 × 24 view box. |
| `stylesheet` | Unique local `.css` filename, listed in the manifest. |
| `supportsAccent` | Explicit boolean. `true` uses the shared color picker; `false` hides it and requires a fixed palette. |
| `chatShape` | One of `rounded`, `square` or `cut`. A cut shape must define `--xlg-clip`. |
| `marker` | `null` for new themes. Existing themes retain legacy markers for compatibility. |
| `palette` | Pure function `(settings, tone, rgb, controlEnd)` returning the shared palette object. |

Use the existing palette implementations as references. A theme-only contribution should normally touch `settings.js`, its stylesheet, `manifest.json`, tests and documentation. Do not add another picker, storage key, observer, route implementation or settings layout.

## Palette interface

The function receives normalized preferences, X's `light` or `dark` tone, the selected accent as three numeric RGB channels, and `controlEnd`, a readable accent variant for dark-text controls. `controlEnd` does not guarantee contrast for every text color: verify the colors the theme actually uses.

Return exactly the shared keys below. Values must be finite and valid CSS values, with no network references or side effects.

| Keys | Format and role |
| --- | --- |
| `accent`, `interfaceAccent`, `secondary` | Comma-separated integer RGB channels in 0–255: raw accent, readable interface accent and optional partner color. |
| `controlStart`, `controlEnd` | RGB channels for the primary button gradient or solid fill. |
| `base` | RGB channels for themed surfaces. |
| `glowSecondary`, `glowTertiary` | RGB channels for additional background light sources. |
| `hex`, `interfaceHex` | Lowercase six-digit HEX values for the raw and interface accents. |
| `background` | `rgb(r, g, b)` for the page canvas. |
| `border` | `rgba(r, g, b, alpha)` for shared borders. |
| `glowOpacity`, `glowSecondaryOpacity`, `glowTertiaryOpacity` | Numeric strings in 0–1. Zero tint must make all glow opacities zero. |

For `supportsAccent: true`, `hex` reflects the selected preset or custom HEX. Derive accents from the inputs, including tint. For `false`, the palette is identical across accent/HEX choices at the same tone and tint. It can still respond to tint, blur, opacity and light/dark appearance. Do not overwrite the user's accent to enforce a fixed palette.

Palette functions must not access the DOM, storage, network, clock or random state. Keep the schema and normalized preferences stable; introducing a new shared token or setting is a separate architectural change, not an incidental theme addition.

## CSS and runtime boundaries

Start every new theme selector with its scope:

```css
html[data-xlg][data-xlg-theme="paper"] [data-xlg-toolbar] {
  border-radius: 12px;
  background: rgba(var(--xlg-base), .92);
}
```

- The `data-xlg` gate must be present so disabling XGlow restores X. Reuse markers such as `data-xlg-toolbar`, `data-xlg-panel` and `data-xlg-conversation`.
- Use `--xlg-*` properties. Give theme-only tokens a distinct prefix such as `--xlg-paper-*`; use the shared palette for accent and surface colors.
- New themes use the generic theme-ID scope. `data-xlg-cyber` and `data-xlg-hud` are legacy gates, retained for the existing themes.
- Keep `glass.css` as the shared layout/base. Do not rewrite other themes or popup styling when adding a theme.
- Do not load external CSS, fonts or images. Use local assets and system-font fallbacks; do not add `@import` or `@font-face`. CSS nesting is not part of this contract; use explicit selectors compatible with the manifest's minimum Chrome version.
- Keyframes, if necessary, use `xlg-theme-id-*` names. Use them only within gated rules, respect reduced motion, and avoid continuous decorative animation by default.
- Preserve native dimensions and transforms of virtualized cells, connected thread lines, input focus and drafts. Do not add separate cards to every detail reply.
- Keep dropdowns free of clipping and native media/fullscreen positioning intact. Restrict backdrop filters to the existing surface layers.
- Chat styling lives in open shadow roots. It inherits the shared palette and registered shape; a new theme must not create a separate Chat controller.
- No telemetry, requests, remote code, permissions or account actions belong in a theme contribution.

## Validation and PR evidence

Before a theme PR, run `npm ci`, install the browser once with `npx playwright install --only-shell chromium`, and run `npm run test:themes`. This runs source and Node checks, builds the current fixtures, tests every registered theme, and writes an HTML report with sample screenshots and failure traces. Start/register the local preview through unlocalhost as documented in [Development](DEVELOPMENT.md#commands); CI uses an isolated fixture server. See [automated theme checks](DEVELOPMENT.md#automated-theme-checks) for coverage and report commands. A failing run must be resolved or explicitly reported as an existing constrained issue; never suppress a failure to open a theme PR.

Reload both the unpacked extension and X before additional live checks, and enable only one XGlow copy.

| Check | Expected behavior |
| --- | --- |
| Light and dark X appearance | Readable text, controls and focus indicators. |
| Colorable theme: all presets, custom black/white/saturated HEX | Palette changes correctly; controls remain readable. |
| Fixed theme: switching from presets and custom HEX | Color panel closes, becomes unfocusable, and saved accent is retained. |
| Return to a colorable theme; rapid switching; reduced motion | Controls return with their saved state; transitions settle correctly. |
| Tint 0/50/100; blur 0/40; opacity 0/90; lightweight mode | Valid values, no unwanted glow at zero tint, usable surfaces. |
| Home, notifications, profile, search suggestions and dropdowns | Aligned surfaces, visible overlays, no unexpected gaps or clipping. |
| Post details and connected timeline threads | Shared frames and native reply flow remain intact. |
| Chat and narrow viewports | Correct shape, readable header, preserved draft and message layout. |
| Extension disabled and native image/video viewer | Native appearance and positioning restored. |

Use the relevant [browser suites](DEVELOPMENT.md#browser-regression-suites) as regression coverage. Add meaningful tests for new palette or geometry behavior. Automated checks cover registration, palette values and capabilities, CSS gates, manifest coverage and neutral settings; they do not prove visual quality on real X.

In a theme PR, state its ID and color capability, list checks actually run, and include screenshots made with sample content for light/dark and representative viewport sizes. State whether actual X and Chat were verified. Preserve contributor attribution; do not bundle unrelated settings redesigns, default changes, releases or permission changes.
