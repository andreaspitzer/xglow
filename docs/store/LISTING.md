# Chrome Web Store submission

This file contains ready-to-use English listing copy and permission explanations. It is not a record of an approved or published Chrome Web Store item.

## Listing

**Name:** X Liquid Glass

**Summary:** A liquid glass look for X. Local preferences, no external services.

**Language:** English

**Suggested category:** Make Chrome Yours → Themes & Colors, if available in the dashboard. This is a site-styling extension, not a Chrome browser theme.

**Homepage:** https://github.com/monteduro/x-liquid-glass

**Support:** https://github.com/monteduro/x-liquid-glass/issues

**Privacy policy:** https://github.com/monteduro/x-liquid-glass/blob/main/docs/PRIVACY.md

### Detailed description

Give X a liquid glass look with translucent cards, soft reflections and rounded surfaces. Keep your familiar feed and make its appearance your own.

• Choose from seven color presets or enter any HEX color.
• Adjust tint, blur and glass opacity independently.
• Hide the right sidebar for a focused, centered timeline, or bring it back with one toggle.
• Enjoy glass styling across Home, notifications, profile covers and Chat.
• Keep connected timeline posts together in one frame and preserve the familiar flow of post-detail replies.
• Follow X's light or dark appearance, with an optional lightweight mode.

Changes apply instantly from the extension's Appearance panel. Defaults are Amber, 50% tint, 10 px blur and 0% glass opacity. Reset returns to those defaults.

Your preferences stay on your device. No analytics, ads, external services or separate account are required. The extension does not post, reply, follow accounts or send messages for you.

X Liquid Glass is free and open source under the MIT license. It is independently developed and is not affiliated with X Corp. X may change its website, which can occasionally require theme updates.

## Privacy practices

### Single purpose

Customize the visual appearance of X (formerly Twitter) with a locally configured liquid glass theme, including colors, glass effects and sidebar layout.

### Storage permission justification

The storage permission saves appearance preferences in chrome.storage.local and restores them when the popup or an X page opens. No page content or account data is stored.

### Site access justification

Content scripts must run on x.com and twitter.com, including their www subdomains, to apply CSS and identify the page elements that need styling. All processing happens locally. The extension does not request unrelated site access or transmit page content.

### Remote code

No remote code is used. All JavaScript and CSS are included in the extension package. The extension makes no network requests of its own.

### Data collection

No user data is collected or transmitted to the developer. Appearance preferences are stored only on the user's device. The code inspects page structure locally for styling; it does not collect or store website content or browsing history.

The publisher must review the dashboard's exact disclosure and certification wording before submitting. Local page access should be described consistently with this policy.

## Reviewer test instructions

1. Install the extension and open https://x.com using the reviewer's own X account, if X requires sign-in. The extension itself has no account, login or paid features.
2. Open the extension popup. Check the default Amber color, 50% tint, 10 px blur and 0% opacity.
3. Change a preset or choose Custom and enter a HEX color. Adjust effects; the page updates immediately.
4. Enable and disable Right sidebar. The timeline remains centered when that column is hidden.
5. Browse Home, notifications, a profile, a post with replies and Chat. The extension only changes presentation.
6. Click Reset to restore defaults. Switch Liquid Glass off to restore X's native appearance.

No developer credentials or access to a personal account are required or provided.

## Upload files

- Extension ZIP: build with `npm run package`; upload the versioned archive in `dist/`.
- Store icon: `extension/icons/icon-128.png`.
- Small promotional tile: `docs/store/promo-440x280.png`.
- Screenshots: `docs/store/home-1280x800.png` and `docs/store/notifications-1280x800.png`.

The screenshots use the owner-supplied images already published in the README. They show customized settings. The Review button visible in Home belongs to another extension and is not a feature of X Liquid Glass.

To regenerate the committed artwork, install ImageMagick and run `npm run build:store`. This optional export is separate from extension packaging and does not add a runtime dependency.

## Submission state

Prepared locally. Not yet uploaded, submitted, reviewed or published in the Chrome Web Store. GitHub availability does not imply Store approval.

Official references: [publish](https://developer.chrome.com/docs/webstore/publish), [images](https://developer.chrome.com/docs/webstore/images), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).
