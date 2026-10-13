/* Runs in the layout fixture: geometry, surfaces, media and separators. */
(async () => {
  const checks = [];
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const settle = () => new Promise(resolve => setTimeout(resolve, 250));
  const root = document.documentElement;
  const nav = document.querySelector('.fixed-nav');
  const link = nav.querySelector('a');
  const content = document.querySelector('[data-testid="primaryColumn"] > div');
  const narrow = matchMedia('(max-width: 700px)').matches;
  const bounds = element => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  };

  await chrome.storage.local.set({ xGlass: { enabled: false } });
  await settle();
  const nativeNav = bounds(nav), nativeLink = bounds(link);
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
  const nativeDialogs = dialogs.map(bounds);
  await chrome.storage.local.set({ xGlass: {} });
  await settle();
  check(bounds(nav).width === nativeNav.width && bounds(nav).height === nativeNav.height, 'Navigation keeps its native width and height');
  check(bounds(link).height === nativeLink.height, 'Navigation links keep their height');
  const navInset = Number.parseFloat(getComputedStyle(nav, '::before').left);
  check(bounds(link).x - bounds(nav).x - navInset >= 8, 'Menu items have room inside the glass edge');
  check(JSON.stringify(dialogs.map(bounds)) === JSON.stringify(nativeDialogs), 'Dialogs keep native sizes and containing blocks');
  check(dialogs.every(dialog => getComputedStyle(dialog).backdropFilter === 'none'), 'Blur does not collapse the media viewer');
  check(nav.getBoundingClientRect().right <= document.querySelector('[data-testid="primaryColumn"]').getBoundingClientRect().left, 'Navigation does not cover the feed');
  check(getComputedStyle(document.querySelector('[data-xlg-composer]')).padding === '0px', 'The composer adds no padding to the native padding');
  const expectedSurface = `rgba(${XGlow.palette().base}, ${XGlow.defaults.opacity / 100})`;
  check(getComputedStyle(document.querySelector('[data-xlg-composer]')).backgroundColor === expectedSurface, 'A more specific selector does not cancel the composer surface');
  check(getComputedStyle(document.querySelector('[data-xlg-toolbar]')).backgroundColor === expectedSurface, 'The header surface is not cancelled');
  for (const selector of ['.native-toolbar-inner', '.composer-inner', '.composer-actions', '.suggestions', '.search-shell']) {
    check(getComputedStyle(document.querySelector(selector)).backgroundColor === 'rgba(0, 0, 0, 0)', `Opaque background removed: ${selector}`);
  }
  check(getComputedStyle(document.querySelector('.avatar')).backgroundColor === 'rgb(0, 0, 0)', 'The avatar background is preserved');
  check(getComputedStyle(document.querySelector('.photo')).backgroundColor === 'rgb(0, 0, 0)', 'The media background is preserved');
  check(getComputedStyle(document.querySelector('.cell-shell')).borderBottomColor === 'rgba(0, 0, 0, 0)', 'Cards show no second outer separator');
  check(!document.getElementById('footer-shell').hasAttribute('data-xlg-panel'), 'The footer is not mistaken for a panel');

  const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
  check(getComputedStyle(sidebar).display === 'none', 'The right sidebar is hidden by default');
  const primary = document.querySelector('[data-testid="primaryColumn"]');
  check(Math.abs((nav.getBoundingClientRect().left + primary.getBoundingClientRect().right) / 2 - document.documentElement.clientWidth / 2) < 1, 'Menu and feed are centered together while the sidebar is hidden');
  check(primary.getBoundingClientRect().width === 600, 'The feed keeps its 600px width without the sidebar');
  check(getComputedStyle(nav).display !== 'none', 'Hiding the sidebar keeps the navigation menu');
  await chrome.storage.local.set({ xGlass: { sidebar: true } }); await settle();
  check(getComputedStyle(sidebar).display !== 'none' && sidebar.getBoundingClientRect().width > 0, 'The toggle restores the sidebar on open pages');
  check(JSON.stringify(bounds(nav)) === JSON.stringify(nativeNav), 'Showing the sidebar restores the native navigation position');
  await chrome.storage.local.set({ xGlass: { sidebar: false } }); await settle();
  check(getComputedStyle(sidebar).display === 'none', 'The toggle can hide the sidebar again');
  await chrome.storage.local.set({ xGlass: { enabled: false } }); await settle();
  check(getComputedStyle(sidebar).display !== 'none', 'Disabling the extension restores native visibility');
  await chrome.storage.local.set({ xGlass: {} }); await settle();

  const toolbar = document.querySelector('[data-xlg-toolbar]');
  check(bounds(toolbar).y >= 12, 'The header has an initial top margin');

  // Inline "Show N posts" row: one action, aligned with the cards, native height.
  const newPostsCell = document.getElementById('new-posts-fixture');
  const newPosts = newPostsCell.querySelector('button');
  const card = document.querySelector('article[data-testid="tweet"]').getBoundingClientRect();
  const inset = narrow ? '6px' : '10px';
  check(newPosts.hasAttribute('data-xlg-new-posts') && getComputedStyle(newPosts).borderRadius === '16px' && getComputedStyle(newPosts).marginLeft === inset, 'The new-posts row gets an inset, rounded surface');
  check(Math.abs(newPosts.getBoundingClientRect().left - card.left) < 1 && Math.abs(newPosts.getBoundingClientRect().right - card.right) < 1 && newPosts.getBoundingClientRect().height === 48, 'The new-posts row aligns with the cards and keeps its native height');
  check(getComputedStyle(newPostsCell.firstElementChild).borderBottomColor === 'rgba(0, 0, 0, 0)', 'The new-posts row loses the native separator');
  const recycled = document.createElement('a'); recycled.href = '#recycled'; newPostsCell.firstElementChild.append(recycled); await settle();
  check(!newPosts.hasAttribute('data-xlg-new-posts'), 'A recycled cell with other content loses the new-posts marker');
  recycled.remove(); await settle();
  check(newPosts.hasAttribute('data-xlg-new-posts'), 'The marker returns when the cell is a new-posts row again');

  // Profile cover: aligned with the header and cards, only the link is clipped.
  const cover = document.createElement('a');
  cover.href = '/example/header_photo'; cover.style.cssText = 'display:block;position:relative;height:120px';
  content.insertBefore(cover, document.querySelector('.composer')); await settle();
  check(getComputedStyle(cover).marginLeft === inset && getComputedStyle(cover).borderRadius === (narrow ? '18px' : '22px') && getComputedStyle(cover).overflow === 'hidden', 'The profile cover follows the card grid and radius');
  check(getComputedStyle(cover, '::after').pointerEvents === 'none', 'The cover border does not intercept clicks');
  cover.remove();

  content.append(document.getElementById('notification-fixture').content.cloneNode(true));
  await settle();
  const notification = document.querySelector('article[data-testid="notification"]');
  const tweet = document.querySelector('article[data-testid="tweet"]');
  check(['backgroundColor', 'borderRadius', 'padding', 'margin', 'backdropFilter'].every(property => getComputedStyle(notification)[property] === getComputedStyle(tweet)[property]), 'Aggregated notifications and posts get the same glass card');
  check(getComputedStyle(document.querySelector('.notification-shell')).borderBottomColor === 'rgba(0, 0, 0, 0)', 'Aggregated notifications keep no outer separators');

  content.append(document.getElementById('unread-notification-fixture').content.cloneNode(true));
  await settle();
  const unread = document.querySelector('.unread-notification');
  const hovered = document.querySelector('.hovered-notification');
  const accent = getComputedStyle(root).getPropertyValue('--xlg-ui-accent-rgb').split(',').map(channel => channel.trim()).join(', ');
  const tinted = element => getComputedStyle(element).backgroundImage.startsWith(`linear-gradient(rgba(${accent}, 0.16)`);
  check(unread.hasAttribute('data-xlg-unread') && !hovered.hasAttribute('data-xlg-unread'), 'Only X\'s accent tint marks a notification as unread, not the gray hover overlay');
  check(tinted(unread) && !tinted(hovered) && !tinted(notification), 'Unread notifications keep an accent tint on the card surface');
  check(getComputedStyle(unread).borderTopColor !== getComputedStyle(hovered).borderTopColor, 'Unread notifications have an accent border');
  unread.classList.remove('r-1eltapf'); await settle();
  check(!unread.hasAttribute('data-xlg-unread') && !tinted(unread), 'A notification seen in place loses the unread tint');
  unread.classList.add('r-1eltapf'); await settle();

  const backgroundSize = getComputedStyle(root).backgroundSize;
  const spacer = document.createElement('div'); spacer.style.height = '5000px'; content.append(spacer);
  window.scrollTo(0, innerHeight + 800); await settle();
  check(bounds(toolbar).y === 12, 'The header keeps its top margin while scrolling');
  check(getComputedStyle(root).backgroundSize === backgroundSize && backgroundSize.split(',').every(size => size.trim() === `${innerWidth}px ${innerHeight}px`), 'The background stays viewport-sized as the list grows');
  check(getComputedStyle(root).backgroundAttachment.split(',').every(value => value.trim() === 'fixed'), 'Every background layer stays fixed while scrolling');
  check(document.body.getBoundingClientRect().bottom < 0 && getComputedStyle(document.body).backgroundImage === 'none' && getComputedStyle(root).backgroundImage.includes('radial-gradient'), 'Glows are painted on the page canvas and stay visible when body is off screen');
  window.scrollTo(0, 0); spacer.remove();

  await chrome.storage.local.set({ xGlass: { lite: true } });
  await settle();
  check(getComputedStyle(nav, '::before').backdropFilter === 'none', 'Lightweight mode also disables blur in the navigation');
  check(getComputedStyle(notification).backdropFilter === 'none', 'Lightweight mode also applies to aggregated notifications');
  check(tinted(unread) && !tinted(notification), 'Lightweight mode keeps the unread tint');
  await chrome.storage.local.set({ xGlass: { cards: false } }); await settle();
  check(getComputedStyle(notification).backdropFilter !== 'none' && getComputedStyle(notification).borderRadius === '22px', 'The retired cards preference cannot disable notification surfaces');
  await chrome.storage.local.set({ xGlass: {} });
  await settle();
  check(root.hasAttribute('data-xlg'), 'Theme restored after the checks');
  return checks;
})()
