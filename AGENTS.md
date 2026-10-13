# Agent instructions

Read [CONTRIBUTING.md](CONTRIBUTING.md) before editing this repository. For theme or appearance work, also read [docs/THEMES.md](docs/THEMES.md), the canonical theme contract, and the integration constraints in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#integration-constraints).

## Theme work

- Register themes in `XGlow.themeDefinitions` in `extension/settings.js`. Use its existing palette interface, capability flag and Chat shapes. The popup generates the catalog; do not add theme-specific popup controls or a separate theme registry.
- Keep themes and colors independent. Colorable themes use the shared presets and HEX picker. Fixed-palette themes declare `supportsAccent: false`; the shared popup handles visibility, animation, focus and restoration of the saved accent.
- HUD intentionally retains its fixed red/cyan palette, with a slightly darker teal in light mode for text contrast. Do not make it colorable, recolor existing themes, rename stored IDs or change defaults as a side effect of adding a theme. Only change these behaviors when the task explicitly requests it.
- Keep the settings panel neutral. Theme choices must not change its colors, fonts, shapes or layout. Theme cards contain an icon and name, without descriptions or previews.
- Card surfaces are always part of enabled themes. Do not reintroduce a cards toggle. Preserve connected conversation frames and the native flow of post-detail replies.
- A theme-only change should normally touch the registry/palette, one stylesheet, the manifest, relevant tests and documentation. Reuse existing DOM markers and shared runtime behavior; introduce new runtime behavior only when the task includes it.
- Scope every new theme rule to `html[data-xlg][data-xlg-theme="theme-id"]`. Do not put theme rules in `popup.css`, modify global browser layout, force virtualized cell geometry, clip dropdowns, or move native media into new containing blocks.
- Keep runtime assets local and dependency-free. Do not add requests, analytics, remote fonts/code, new permissions, or account actions as part of a theme.

## Validation and handoff

- Run `npm run check` and `npm test`. Run relevant browser suites and inspect the new theme using the validation matrix in `docs/THEMES.md`. State which checks ran and whether real X was verified.
- Before creating or updating a theme PR, run `npm run test:themes` and inspect its report. Run `npm ci` and install the browser with `npx playwright install --only-shell chromium` when needed. Do not skip failing themes, weaken checks, or claim success with a failing report. Fix failures within the authorized scope; explicitly report existing failures when preserving the affected behavior is a task constraint.
- Use **unlocalhost CLI** to start previews. Inspect the existing registration before changing its process or port; give isolated worktrees their own slug. Follow [development commands](docs/DEVELOPMENT.md#commands).
- Keep fixtures generic. Never commit real chats, account-specific screenshots, credentials, machine paths or generated output.
- Reload the unpacked extension and the X tab before live verification. Enable only one copy of XGlow during that check.
- Preserve contributor commits and attribution. Do not push, merge, bump versions, publish or create releases unless the current task authorizes those actions. A local check or package test is not publication.
