# Development

## Source layout

| Directory | Purpose |
| --- | --- |
| `extension/` | Directly loadable Chrome extension: manifest, runtime, styles and settings popup |
| `tests/` | Node tests, synthetic DOM fixtures and browser regression suites |
| `scripts/` | Preview builder, local server, source checks and release packaging |
| `scripts/preview/` | Sample content, demo styles and a local Chrome storage adapter |
| `public/` | Generated demo and browser runners; ignored by Git |
| `dist/` | Generated release archives; ignored by Git |

The extension itself has no build step. The preview builder reads the manifest and uses the actual extension CSS and JavaScript, replacing Chrome storage with a local browser adapter. Demo preferences never affect the installed extension.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run check` | Check JavaScript syntax, manifest assets, matching versions and obvious private-data patterns |
| `npm test` | Run Node tests |
| `npm run build:preview` | Generate the demo, popup preview, layout fixture and browser runners |
| `npm run dev` | Build and serve previews on the provided `PORT` |
| `npm run package` | Validate sources and create an extension-only ZIP with its license |

Use unlocalhost to launch and expose the project:

```sh
unlocalhost --yes setup . --slug xglow --features https,dev
unlocalhost up xglow
unlocalhost status xglow
unlocalhost url xglow
```

For an already registered project, inspect its saved process and endpoint before changing the configuration. The extension does not use this development server at runtime.

## Browser regression suites

After building and starting the demo, open the following paths on its local URL. Each page appends a `#test-result` JSON block with `passed` and either `checks` or `error`.

| Page | Coverage |
| --- | --- |
| `/layout.test.html` | Main layout, native surfaces, media, sidebar preferences and fixed background |
| `/centering.test.html` | Navigation/feed centering in real iframe viewports: 1920, 1000, 700 and 390 px |
| `/navigation-thread.test.html` | SPA navigation, connected posts and detail reply flow |
| `/conversation-frame.test.html` | Shared conversation frame, virtualized/recycled cells and resized media |
| `/search.test.html` | Search field, dropdown clipping, focus and theme restoration |
| `/chat.test.html` | Open shadow roots, chat layout, drafts and remounts using sample messages |
| `/compact-nav.test.html` | Compact dock dimensions, alignment and active routes |
| `/reply-composer.test.html` | Closed/expanded reply composer, draft preservation and native media backgrounds |
| `/post-spacing.test.html` | Initial author visibility and respect for user scrolling |

Run suites in separate tabs. The centering suite creates child fixtures and shares the demo storage key, so run it independently from interactive settings changes. Other runners use isolated storage keys.

The synthetic fixtures catch layout regressions without using real account content. Also inspect changed selectors on the corresponding X route because X may update its DOM independently of the fixtures.

## Integration constraints

- Theme overrides are gated by the root `data-xlg` attribute so disabling the extension restores native appearance.
- The settings namespace is `XGlow`. The storage key `xGlass` and DOM markers `data-xlg-*` remain stable across the rebrand so existing installations retain their preferences.
- Virtualized cells keep their native position, transforms and heights. Conversation backgrounds span the relevant cells without inserting layout wrappers.
- Fixed navigation, fullscreen image viewers and dropdowns must retain their native containing blocks. Applying a backdrop filter to the wrong ancestor can change positioning.
- Post-detail replies keep native connection lines and flow. Glass surfaces apply to the composer and permission notices rather than each reply.
- Search suggestion surfaces must be identified before native background cleanup, and allowed to extend outside toolbar bounds.
- X Chat uses open shadow roots. Injected styling is local to each host, follows preferences and is restored if removed.
- Initial post-anchor correction stops after user interaction. Never reset scroll during ordinary browsing.
- Selectors should use semantic roles or stable test IDs where possible; keep necessary native class selectors documented.

## Release preparation

Keep the version consistent across `extension/manifest.json`, `package.json` and the popup version label. Run source checks, Node tests and relevant browser suites before packaging.

Generated pages, release output, screenshots and private working notes are ignored. Packaging includes only the contents of `extension/` plus `LICENSE`; no account-specific fixture or local artifact belongs in the ZIP.

GitHub Actions runs source checks, Node tests, preview generation and packaging on Node 20 and 24. Browser suites remain a separate browser validation step.
