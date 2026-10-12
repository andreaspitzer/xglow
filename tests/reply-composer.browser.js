/* Inline reply composer with an avatar and opaque input wrappers, as on X. */
(async () => {
  const checks = [];
  const check = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  const settle = () => new Promise(resolve => setTimeout(resolve, 250));
  const root = document.documentElement;
  const originalPath = location.pathname;
  const composer = document.querySelector('.composer');
  const inner = composer.querySelector('.composer-inner');
  const editor = composer.querySelector('[data-testid="tweetTextarea_0"]');
  const actions = composer.querySelector('.composer-actions');
  const avatar = composer.querySelector('.avatar');
  const nativeText = editor.textContent;
  const transparent = element => getComputedStyle(element).backgroundColor === 'rgba(0, 0, 0, 0)';
  try {
    history.pushState(null, '', '/fixture/status/123');
    composer.setAttribute('data-testid', 'inline_reply_offscreen');
    actions.hidden = true; editor.textContent = 'Post your reply';
    composer.append(document.createElement('span'));
    await chrome.storage.local.set({ xGlass: {} }); await settle();
    check(root.hasAttribute('data-xlg-thread') && getComputedStyle(composer).borderRadius === '24px', 'The reply composer keeps its glass surface on post pages without cards');
    check(getComputedStyle(composer).padding === '8px' && avatar.getBoundingClientRect().left - composer.getBoundingClientRect().left >= 24, 'The reply composer adds inner spacing without changing the Home composer');
    check(transparent(inner), 'No black block in the collapsed composer with a real avatar');
    editor.focus(); editor.textContent = 'Test draft'; actions.hidden = false;
    const context = document.createElement('div'); context.style.background = '#000'; context.textContent = 'Replying to @example'; inner.prepend(context);
    await settle();
    check(transparent(inner) && transparent(context) && transparent(actions), 'The expanded composer and its “Replying to” context have no opaque backgrounds');
    check(document.activeElement === editor && editor.textContent === 'Test draft', 'Clearing surfaces keeps focus and draft');
    check(getComputedStyle(avatar).backgroundColor === 'rgb(0, 0, 0)' && avatar.querySelector('img').naturalWidth === 40, 'Avatar and image keep their background and content');
    check(composer.querySelectorAll('[data-xlg-composer]').length === 0, 'The composer has a single outer glass surface');
    await chrome.storage.local.set({ xGlass: { lite: true } }); await settle();
    check(getComputedStyle(composer).backdropFilter === 'none' && transparent(inner), 'Lightweight mode keeps the composer free of black blocks');
    await chrome.storage.local.set({ xGlass: { enabled: false } }); await settle();
    check(getComputedStyle(inner).backgroundColor === 'rgb(0, 0, 0)', 'Disabling the theme restores the native background');
    context.remove(); return checks;
  } finally {
    editor.blur(); editor.textContent = nativeText; actions.hidden = false;
    composer.removeAttribute('data-testid'); history.replaceState(null, '', originalPath);
    await chrome.storage.local.set({ xGlass: {} }); await settle();
  }
})()
