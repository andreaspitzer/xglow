# Contributing

Keep changes focused and explain the affected page and resulting behavior. Include the viewport and appearance settings when reporting layout issues.

For new themes or changes to appearance, follow the [theme contribution contract](docs/THEMES.md). It defines the registry, palette capabilities, neutral settings, CSS gates and validation matrix. Coding agents must also follow [AGENTS.md](AGENTS.md).

Before submitting a change:

1. Run `npm run check` and `npm test`.
2. Generate the preview with `npm run build:preview` and run the relevant [browser regression suites](docs/DEVELOPMENT.md#browser-regression-suites).
3. For DOM selector changes, verify the affected route on X without posting or changing account data.

Before opening a theme PR, run `npm ci`, install the test browser once with `npx playwright install --only-shell chromium`, and run `npm run test:themes`. This discovers themes from the registry, checks palette behavior and rendered layouts, and produces sample screenshots in `artifacts/themes/report`. Resolve failures before opening the PR; do not lower assertions, skip a theme or approve screenshots merely to obtain a passing run. Record any existing failure explicitly if the task forbids changing that behavior.

Preserve saved preferences, native media behavior, keyboard focus, drafts and the geometry of virtualized lists. Add regression coverage for behavior changes; avoid tests that only repeat CSS declarations. Keep runtime code dependency-free and leave comments where they explain an X-specific constraint.

Use generic accounts and sample content in fixtures. Do not commit screenshots from private conversations, local paths, credentials, generated output or session notes.
