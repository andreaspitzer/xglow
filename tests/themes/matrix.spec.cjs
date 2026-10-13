const { test, expect } = require('@playwright/test');
const { themes, fixture, apply, settle, attachScreenshot, failOnPageErrors } = require('./helpers.cjs');

for (const [theme, definition] of themes) {
  test.describe(definition.label, () => {
    test('colors, contrast and effect limits', async ({ page }, info) => {
      const errors = failOnPageErrors(page);
      const tone = info.project.use.colorScheme;
      await fixture(page, theme, tone);
      const colors = [
        ...Object.keys(XGlow.accents).map(accent => ({ accent })),
        ...['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#808080'].map(customColor => ({ accent: 'custom', customColor }))
      ];
      for (const color of colors) {
        // Opaque surfaces give a known background for numeric contrast checks.
        await apply(page, { theme, ...color, tint: 100, opacity: 90 });
        const expected = XGlow.palette({ theme, ...color, tint: 100, opacity: 90 }, tone);
        const actual = await page.evaluate(() => {
          const root = getComputedStyle(document.documentElement);
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d');
          const rgb = color => {
            if (!CSS.supports('color', color)) throw new Error(`Invalid rendered color: ${color}`);
            context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
            return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
          };
          const luminance = value => value.map(channel => {
            const c = channel / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
          }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
          const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
          const base = rgb(`rgb(${root.getPropertyValue('--xlg-base')})`);
          const text = rgb(getComputedStyle(document.querySelector('[data-testid=tweetText] span')).color);
          const name = rgb(getComputedStyle(document.querySelector('[data-testid=User-Name] span')).color);
          const buttonText = rgb(getComputedStyle(document.querySelector('[data-testid=tweetButtonInline] span')).color);
          return {
            accent: root.getPropertyValue('--xlg-accent-rgb').trim(),
            primary: root.getPropertyValue('--xlg-ui-accent-rgb').trim(),
            secondary: root.getPropertyValue('--xlg-secondary-rgb').trim(),
            textContrast: contrast(text, base), nameContrast: contrast(name, base),
            buttonContrast: Math.min(...['--xlg-control-start-rgb', '--xlg-control-end-rgb'].map(key => contrast(buttonText, rgb(`rgb(${root.getPropertyValue(key)})`)))),
            overflow: document.documentElement.scrollWidth > innerWidth
          };
        });
        expect(actual.accent).toBe(expected.accent);
        expect(actual.primary).toBe(expected.interfaceAccent);
        expect(actual.secondary).toBe(expected.secondary);
        expect(actual.textContrast, `${theme} ${tone} ${JSON.stringify(color)} post text`).toBeGreaterThanOrEqual(4.5);
        expect(actual.nameContrast, `${theme} ${tone} ${JSON.stringify(color)} author name`).toBeGreaterThanOrEqual(4.5);
        expect(actual.buttonContrast, `${theme} ${tone} ${JSON.stringify(color)} button text`).toBeGreaterThanOrEqual(4.5);
        expect(actual.overflow).toBe(false);
      }
      for (const settings of [
        { tint: 0, blur: 0, opacity: 0 },
        { tint: 100, blur: 40, opacity: 90 },
        { lite: true, blur: 40, opacity: 0 }
      ]) {
        await apply(page, { theme, ...settings });
        const actual = await page.evaluate(() => {
          const root = getComputedStyle(document.documentElement);
          return { blur: root.getPropertyValue('--xlg-blur'), opacity: root.getPropertyValue('--xlg-opacity'), glow: root.getPropertyValue('--xlg-glow-opacity'), filter: getComputedStyle(document.querySelector('article')).backdropFilter };
        });
        if (settings.tint === 0) expect(Number(actual.glow)).toBe(0);
        if (settings.blur !== undefined) expect(actual.blur).toBe(`${settings.blur}px`);
        if (settings.opacity !== undefined) expect(Number(actual.opacity)).toBe(settings.opacity / 100);
        if (settings.lite) expect(actual.filter).toBe('none');
        if (settings.blur === 0) expect(actual.filter).not.toMatch(/blur\((?!0px\))[^)]+\)/);
      }
      await apply(page, { theme });
      await attachScreenshot(page, info, `${theme}-${tone}-${info.project.use.viewport.width}px`);
      await apply(page, { theme, enabled: false });
      await expect(page.locator('html')).not.toHaveAttribute('data-xlg', '');
      expect(await page.locator('article').evaluate(element => getComputedStyle(element).backdropFilter)).toBe('none');
      errors();
    });

    test('surfaces, search dropdown, connected replies and disabled state', async ({ page }, info) => {
      const errors = failOnPageErrors(page);
      await fixture(page, theme, info.project.use.colorScheme);
      const geometry = await page.evaluate(() => {
        const nav = document.querySelector('[data-xlg-nav]').getBoundingClientRect();
        const feed = document.querySelector('[data-testid=primaryColumn]').getBoundingClientRect();
        return { centerError: Math.abs((nav.left + feed.right) / 2 - innerWidth / 2), overlap: nav.right > feed.left + 1, right: feed.right, width: innerWidth };
      });
      expect(geometry.centerError).toBeLessThan(1);
      expect(geometry.overlap).toBe(false);
      expect(geometry.right).toBeLessThanOrEqual(geometry.width + 1);
      await page.evaluate(() => {
        const content = document.querySelector('[data-testid=primaryColumn] > div');
        content.append(document.querySelector('#notification-fixture').content.cloneNode(true));
        content.append(document.querySelector('#reply-fixture').content.cloneNode(true));
        content.querySelector('.toolbar').replaceWith(document.querySelector('#search-toolbar-fixture').content.cloneNode(true));
      });
      await expect(page.locator('[data-xlg-conversation]')).toHaveCount(1);
      await expect(page.locator('[data-xlg-search-popup]')).toHaveCount(1);
      await page.locator('[aria-label="Search query"]').focus();
      await settle(page);
      const result = await page.evaluate(() => {
        const popup = document.querySelector('[role=listbox]');
        const option = popup.querySelector('[role=option]');
        const rect = option.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 4);
        const connector = document.querySelector('.reply-down');
        const notification = document.querySelector('[data-testid=notification]').getBoundingClientRect();
        return { clickable: popup.contains(hit), connectorWidth: connector.getBoundingClientRect().width, notificationFits: notification.left >= 0 && notification.right <= innerWidth, popupFits: popup.getBoundingClientRect().right <= innerWidth };
      });
      expect(result).toEqual({ clickable: true, connectorWidth: 2, notificationFits: true, popupFits: true });
      // Shared surfaces every theme inherits: themes may restyle them, not break them.
      const shared = await page.evaluate(() => {
        const bar = document.querySelector('.search-toolbar').getBoundingClientRect();
        const field = document.querySelector('.search-field').getBoundingClientRect();
        const tabs = document.querySelector('.search-toolbar [role=tablist]').getBoundingClientRect();
        const back = document.querySelector('[data-testid=app-bar-back]').getBoundingClientRect();
        const settings = document.querySelector('[data-testid=settingsAppBar]').getBoundingClientRect();
        const tab = document.querySelector('.search-toolbar [role=tab][aria-selected=true]');
        const pill = getComputedStyle(tab, '::before'), tabStyle = getComputedStyle(tab);
        const selected = pill.content !== 'none'
          ? (parseFloat(pill.top) > 0 && pill.backgroundColor !== 'rgba(0, 0, 0, 0)' ? 'inset pill' : 'broken pill')
          : (tabStyle.backgroundImage !== 'none' || tabStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? 'theme treatment' : 'not highlighted');
        const newPosts = document.querySelector('[data-xlg-new-posts]'), row = newPosts.getBoundingClientRect(), rowPill = getComputedStyle(newPosts, '::before');
        const card = document.querySelector('article[data-testid=tweet]'), cardStyle = getComputedStyle(card);
        const link = document.querySelector('header nav a');
        link.focus();
        const focus = { visible: link.matches(':focus-visible'), link: getComputedStyle(link).outlineStyle, pill: getComputedStyle(link.firstElementChild).outlineStyle };
        link.blur();
        return {
          insets: [field.top - bar.top, tabs.top - field.bottom, back.left - bar.left, bar.right - settings.right, field.left - back.right],
          selected,
          newPostsGaps: [row.top + parseFloat(rowPill.top) - document.querySelector('[data-xlg-composer]').getBoundingClientRect().bottom, card.getBoundingClientRect().top - (row.bottom - parseFloat(rowPill.bottom))],
          cardGap: parseFloat(cardStyle.marginTop) + parseFloat(cardStyle.marginBottom),
          focus
        };
      });
      expect(shared.insets, `${theme} search header insets`).toEqual([8, 8, 8, 8, 8]);
      expect(['inset pill', 'theme treatment'], `${theme} selected search tab: ${shared.selected}`).toContain(shared.selected);
      expect(shared.newPostsGaps, `${theme} new-posts pill spacing`).toEqual([shared.cardGap, shared.cardGap]);
      expect(shared.focus, `${theme} navigation focus ring`).toEqual({ visible: true, link: 'none', pill: 'solid' });
      await page.evaluate(() => {
        const content = document.querySelector('[data-testid=primaryColumn] > div');
        content.append(document.querySelector('#unread-notification-fixture').content.cloneNode(true));
      });
      await expect(page.locator('[data-xlg-unread]')).toHaveCount(1);
      const menuLayer = await page.evaluate(() => {
        document.body.append(document.querySelector('#menu-fixture').content.cloneNode(true));
        const layer = getComputedStyle(document.querySelector('.menu-layer'));
        const result = { background: layer.backgroundColor, shadow: layer.boxShadow, overflow: layer.overflow };
        document.querySelector('.menu-layer').remove();
        return result;
      });
      expect(menuLayer, `${theme} menu layer behind the themed dropdown`).toEqual({ background: 'rgba(0, 0, 0, 0)', shadow: 'none', overflow: 'visible' });
      await page.evaluate(() => document.body.append(document.querySelector('#modal-fixture').content.cloneNode(true)));
      await expect(page.locator('[data-xlg-modal]')).toHaveCount(1);
      const modal = await page.evaluate(() => {
        const panel = getComputedStyle(document.querySelector('.modal-panel'));
        const result = { radius: panel.borderTopLeftRadius === getComputedStyle(document.querySelector('[data-xlg-panel]')).borderTopLeftRadius, opaque: panel.backgroundColor === 'rgb(20, 20, 20)', blur: getComputedStyle(document.querySelector('[data-testid=mask]')).backdropFilter.includes('blur') };
        document.querySelector('#layers').remove();
        return result;
      });
      expect(modal, `${theme} centered modal: same shape as the theme's panels, themed surface, blurred page`).toEqual({ radius: true, opaque: false, blur: true });
      for (const lite of [false, true]) {
        await apply(page, { theme, lite });
        const layers = await page.evaluate(() => ['.unread-notification', '.hovered-notification'].map(selector => getComputedStyle(document.querySelector(selector)).backgroundImage));
        const tint = /^linear-gradient\(rgba\(\d+, \d+, \d+, 0\.16\)/;
        expect(layers[0], `${theme} lite=${lite} unread tint`).toMatch(tint);
        expect(layers[1], `${theme} lite=${lite} read notification`).not.toMatch(tint);
      }
      await apply(page, { theme });
      await page.evaluate(() => {
        history.pushState(null, '', '/sample/status/123');
        document.querySelector('[data-testid=primaryColumn]').append(document.createElement('span'));
      });
      await expect(page.locator('html')).toHaveAttribute('data-xlg-thread', '');
      const articles = await page.locator('article').evaluateAll(items => items.map(item => ({ radius: getComputedStyle(item).borderRadius, filter: getComputedStyle(item).backdropFilter })));
      expect(articles.every(item => item.radius === '0px' && item.filter === 'none')).toBe(true);
      await apply(page, { theme, enabled: false });
      await expect(page.locator('[data-xlg-conversation]')).toHaveCount(0);
      expect(await page.locator('[role=listbox]').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(0, 0, 0)');
      errors();
    });

    test('Chat shape, drafts, native bubbles and restored native appearance', async ({ page }, info) => {
      const errors = failOnPageErrors(page);
      await fixture(page, theme, info.project.use.colorScheme);
      await page.evaluate(() => {
        const primary = document.querySelector('[data-testid=primaryColumn]');
        primary.innerHTML = '<div><div data-testid="xchatEmbedRoute"></div></div>';
        const host = primary.querySelector('[data-testid=xchatEmbedRoute]');
        host.attachShadow({ mode: 'open' }).innerHTML = `<style>
          *{box-sizing:border-box}[data-xchat-root]{height:100%;background:#000;color:#eee}
          [data-testid=dm-container]{position:relative;height:100dvh}
          [data-testid=dm-conversation-header]{height:70px;padding:16px}
          [data-testid=dm-composer-container]{position:absolute;bottom:0;left:0;right:0;padding:16px}
          [data-testid=dm-composer-input-container]{padding:8px;background:#191919;border-radius:24px}
          textarea{width:100%;height:36px;background:transparent;color:inherit}
          [data-testid=sample-bubble]{width:160px;padding:12px;margin:16px;background:#1e9cf1;border-radius:20px}
        </style><div data-xchat-root><div data-testid="dm-container"><header data-testid="dm-conversation-header">Sample conversation</header><div data-testid="sample-bubble">Sample message</div><div data-testid="dm-composer-container"><div data-testid="dm-composer-input-container"><textarea aria-label="Sample message draft"></textarea></div></div></div></div>`;
        history.pushState(null, '', '/i/chat');
      });
      const host = page.locator('[data-testid=xchatEmbedRoute]');
      await expect(host).toHaveAttribute('data-xlg-chat', '');
      const input = host.locator('textarea');
      await input.fill('Sample draft');
      const measure = () => host.evaluate(element => {
        const shadow = element.shadowRoot;
        const container = shadow.querySelector('[data-testid=dm-container]');
        const frame = getComputedStyle(container, '::before');
        const input = shadow.querySelector('textarea').getBoundingClientRect();
        return { radius: frame.borderRadius, clip: frame.clipPath, filter: frame.backdropFilter, containerFilter: getComputedStyle(container).backdropFilter, inputFits: input.left >= 0 && input.right <= innerWidth && input.bottom <= innerHeight, bubble: getComputedStyle(shadow.querySelector('[data-testid=sample-bubble]')).backgroundColor };
      });
      await expect.poll(async () => (await measure()).filter).toContain('blur');
      const style = await measure();
      expect(style.inputFits).toBe(true);
      expect(style.bubble).toBe('rgb(30, 156, 241)');
      expect(style.containerFilter).toBe('none');
      if (definition.chatShape === 'rounded') expect(style.radius).not.toBe('0px');
      else expect(style.radius).toBe('0px');
      if (definition.chatShape === 'cut') expect(style.clip).toContain('polygon');
      await apply(page, { theme, lite: true });
      expect((await measure()).filter).toBe('none');
      await apply(page, { theme, enabled: false });
      await expect(input).toHaveValue('Sample draft');
      expect(await host.evaluate(element => getComputedStyle(element.shadowRoot.querySelector('[data-xchat-root]')).backgroundColor)).toBe('rgb(0, 0, 0)');
      errors();
    });
  });
}
