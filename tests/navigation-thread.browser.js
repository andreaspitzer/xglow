/* Simulates X's empty loading main, replacement shells and connected replies. */
(async () => {
  const checks = [];
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const root = document.documentElement;
  const main = document.querySelector('main[role="main"]');
  const header = document.querySelector('header[role="banner"]');
  const nav = document.querySelector('[data-xlg-nav]');
  const originalPath = location.pathname;
  await chrome.storage.local.set({ xGlass: {} }); await wait(250);
  const startLeft = nav.getBoundingClientRect().left;
  const navIsStill = () => Math.abs(nav.getBoundingClientRect().left - startLeft) < .5;
  const oldShell = main.firstElementChild;
  try {
    oldShell.remove();
    const spinner = document.createElement('div'); spinner.textContent = 'Loading…'; main.append(spinner);
    for (let i = 0; i < 6; i++) {
      await frame();
      check(navIsStill() && main.getBoundingClientRect().width === 600, `Loading: menu still at frame ${i}`);
    }
    const replacement = oldShell.cloneNode(true);
    replacement.querySelectorAll('*').forEach(element => [...element.attributes].filter(attribute => attribute.name.startsWith('data-xlg')).forEach(attribute => element.removeAttribute(attribute.name)));
    replacement.removeAttribute('data-xlg-column-shell');
    spinner.replaceWith(replacement);
    await frame();
    check(navIsStill() && replacement.getBoundingClientRect().width === 600, 'New containers are centered on the first frame');
    check(getComputedStyle(header.firstElementChild).transitionDuration === '0s', 'No width animation on the menu container');
    // X may keep the header mounted while it replaces the whole main element.
    const replacementMain = main.cloneNode(true);
    replacementMain.removeAttribute('data-xlg-main');
    main.replaceWith(replacementMain);
    await frame();
    check(navIsStill() && replacementMain.getBoundingClientRect().width === 600, 'Replacing main does not move the menu on the first frame');
    replacementMain.replaceWith(main);
    replacement.replaceWith(oldShell);
    await wait(100);

    const content = main.querySelector('[data-testid="primaryColumn"] > div');
    content.append(document.getElementById('reply-fixture').content.cloneNode(true));
    await wait(100);
    const connected = [...content.querySelectorAll('.reply-group article')];
    const isolated = content.querySelector('article:not(:has(.r-m5arl1))');
    const connector = content.querySelector('.reply-down');
    const plain = article => {
      const style = getComputedStyle(article);
      return style.borderRadius === '0px' && style.margin === '0px' && style.padding === '0px 16px' && style.backdropFilter === 'none' && style.boxShadow === 'none';
    };
    check(connected.every(article => getComputedStyle(article).borderRadius === '0px' && getComputedStyle(article).margin === '0px' && getComputedStyle(article).backdropFilter === 'none'), 'Connected posts do not become separate cards');
    check(content.querySelectorAll('[data-xlg-conversation]').length === 1, 'A single glass frame holds the whole timeline sequence');
    check(getComputedStyle(isolated).borderRadius === '22px', 'Isolated posts keep their glass cards');
    check(getComputedStyle(connector).backgroundColor === 'rgb(51, 54, 57)' && connector.getBoundingClientRect().width === 2, 'The connector keeps its native color and width');

    history.pushState(null, '', '/fixture/status/123');
    isolated.setAttribute('tabindex', '-1');
    content.append(document.createElement('span'));
    await frame(); await wait(100);
    check(root.hasAttribute('data-xlg-thread'), 'SPA navigation recognizes the post page');
    check([...content.querySelectorAll('article')].every(article => getComputedStyle(article).backdropFilter === 'none' && getComputedStyle(article).borderRadius === '0px'), 'No separate cards on the post page');
    check(getComputedStyle(connected[0].closest('.cell-shell')).borderBottomColor === 'rgb(47, 51, 54)', 'The post page keeps native separators');
    check(getComputedStyle(isolated).marginTop === '0px' && getComputedStyle(isolated).paddingTop === '12px', 'The opened post keeps native spacing with no extra gap under the header');
    await chrome.storage.local.set({ xGlass: { lite: true } }); await wait(100);
    check(connected.every(plain) && getComputedStyle(isolated).backgroundColor === 'rgba(0, 0, 0, 0)', 'Lightweight mode does not bring cards back on the post page');
    history.pushState(null, '', originalPath); content.append(document.createElement('span')); await wait(100);
    check(!root.hasAttribute('data-xlg-thread') && getComputedStyle(isolated).borderRadius === '22px', 'Returning to the timeline restores cards on isolated posts');
    content.querySelector('.reply-group').remove(); isolated.removeAttribute('tabindex'); isolated.removeAttribute('data-xlg-focused');
    await chrome.storage.local.set({ xGlass: {} }); await wait(100);
    return checks;
  } finally {
    history.replaceState(null, '', originalPath);
    if (!main.isConnected) header.after(main);
    if (!oldShell.isConnected) main.replaceChildren(oldShell);
    await chrome.storage.local.set({ xGlass: {} });
  }
})()
