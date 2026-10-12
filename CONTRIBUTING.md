# Contributing

Keep changes focused and explain the affected page and resulting behavior. Include the viewport and appearance settings when reporting layout issues.

Before submitting a change:

1. Run `npm run check` and `npm test`.
2. Generate the preview with `npm run build:preview` and run the relevant [browser regression suites](docs/DEVELOPMENT.md#browser-regression-suites).
3. For DOM selector changes, verify the affected route on X without posting or changing account data.

Preserve saved preferences, native media behavior, keyboard focus, drafts and the geometry of virtualized lists. Add regression coverage for behavior changes; avoid tests that only repeat CSS declarations. Keep runtime code dependency-free and leave comments where they explain an X-specific constraint.

Use generic accounts and sample content in fixtures. Do not commit screenshots from private conversations, local paths, credentials, generated output or session notes.
