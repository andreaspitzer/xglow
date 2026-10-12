/* Compact dock: the icon-only rail X shows on narrow viewports and on Chat. */
(async () => {
  const checks = [];
  const check = (ok, text) => { if (!ok) throw new Error(text); checks.push(text); };
  const wait = () => new Promise(resolve => setTimeout(resolve, 350));
  const shell = document.querySelector('.fixed-nav');
  const original = shell.firstElementChild, path = location.pathname;
  const inner = document.getElementById('compact-nav-fixture').content.firstElementChild.cloneNode(true);
  shell.replaceChild(inner, original);
  history.replaceState(null, '', '/i/chat');
  await chrome.storage.local.set({ xGlass: {} }); await wait();
  const center = () => { const rect = shell.getBoundingClientRect(); return rect.left + rect.width / 2; };
  const isCentered = element => { const rect = element.getBoundingClientRect(); return Math.abs(rect.left + rect.width / 2 - center()) < 1; };
  const controls = [...inner.querySelectorAll('nav a, nav button, h1 a, [data-testid="SideNav_NewTweet_Button"], [data-testid="SideNav_AccountSwitcher_Button"]')];
  check(shell.hasAttribute('data-xlg-nav-compact') && shell.getBoundingClientRect().width === 68, 'A 68px rail is detected even on a large viewport');
  check(getComputedStyle(inner).paddingLeft === '8px' && getComputedStyle(shell, '::before').left === '2px', 'The frame leaves room for the icons without widening the layout');
  check(controls.every(isCentered), 'Logo, navigation, Post and account share the same center');
  check(controls.every(element => element.getBoundingClientRect().width === 48), 'Native minimum sizes of the logo and Post wrapper do not distort the controls');
  check([...inner.querySelectorAll('nav a, nav button')].every(element => element.getBoundingClientRect().width === 48), 'Every item has a 48px wide hit area');
  check([...inner.querySelectorAll('nav a > div, nav button > div')].every(element => getComputedStyle(element).borderRadius === '16px'), 'Items use rounded surfaces matching the dock');
  const chat = inner.querySelector('a[href="/i/chat"]');
  check(chat.hasAttribute('data-xlg-nav-current') && getComputedStyle(chat.firstElementChild).backgroundColor !== 'rgba(0, 0, 0, 0)', 'The active section is highlighted even without X’s aria-current');
  check([...inner.querySelectorAll('nav svg')].every(icon => icon.getBoundingClientRect().width === 24 && isCentered(icon)), 'Icons keep their native size and centering');
  check(document.documentElement.scrollWidth === innerWidth, 'The dock adds no horizontal overflow');
  if (location.host && window.compactNavDemo) return checks;
  history.replaceState(null, '', '/home');
  inner.querySelector('h1').append(document.createElement('span')); await wait();
  check(!chat.hasAttribute('data-xlg-nav-current') && inner.querySelector('nav a[href="/home"]').hasAttribute('data-xlg-nav-current'), 'Navigating moves the active highlight');
  inner.style.width = '275px'; await wait();
  check(!shell.hasAttribute('data-xlg-nav-compact') && getComputedStyle(inner).paddingLeft === '24px', 'The expanded menu keeps its own padding');
  inner.style.width = '68px'; await wait();
  check(shell.hasAttribute('data-xlg-nav-compact'), 'The dock returns when the menu collapses again');
  await chrome.storage.local.set({ xGlass: { enabled: false } }); await wait();
  check(getComputedStyle(inner).paddingLeft === '0px' && !chat.hasAttribute('aria-current'), 'Disabling the theme restores the native geometry');
  shell.replaceChild(original, inner);
  history.replaceState(null, '', path);
  await chrome.storage.local.set({ xGlass: {} }); await wait();
  return checks;
})()
