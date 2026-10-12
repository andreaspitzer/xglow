/* X Chat shadow-root fixture with placeholder content only. */
(async () => {
  const checks = [];
  const check = (ok, text) => { if (!ok) throw new Error(text); checks.push(text); };
  const wait = () => new Promise(resolve => setTimeout(resolve, 150));
  const primary = document.querySelector('[data-testid="primaryColumn"]');
  const old = primary.innerHTML, path = location.pathname;
  primary.innerHTML = '<div><div data-testid="xchatEmbedRoute"></div></div>';
  const host = primary.querySelector('[data-testid="xchatEmbedRoute"]');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    * { box-sizing: border-box }
    [data-xchat-root] { height: 100%; background: #000; color: #eee }
    [data-testid=dm-container] { display: flex; container-type: inline-size; height: 100dvh }
    [data-testid=dm-inbox-panel] { min-width: 400px; width: 35%; border-right: 1px solid #333 }
    [data-testid=dm-conversation-panel] { flex: 1; position: relative }
    [data-testid=dm-conversation-header] { height: 80px; padding: 16px }
    [data-testid=dm-search-input] { height: 40px; width: 90%; background: #141414; border: 0; border-radius: 30px }
    [data-testid=dm-message-scroller] { height: calc(100% - 80px); overflow: auto }
    [data-testid=dm-composer-container] { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px; isolation: isolate }
    [data-testid=dm-composer-input-container] { background: #191919; border-radius: 24px; padding: 8px }
    textarea { width: 100%; height: 32px; border: 0; background: transparent; color: inherit }
    [data-testid=message-demo] { margin: 16px 16px 16px auto; width: 180px; padding: 12px; background: #1e9cf1; border-radius: 20px }
    @container (width < 918px) { [data-testid=dm-inbox-panel] { display: none } }
  </style><div data-xchat-root="route"><div data-testid="dm-container">
    <section data-testid="dm-inbox-panel"><header>Sample chat</header><input data-testid="dm-search-input" placeholder="Search"><div data-testid="dm-conversation-item-example">Sample contact</div></section>
    <section data-testid="dm-conversation-panel"><header data-testid="dm-conversation-header">Sample conversation</header><div data-testid="dm-message-scroller"><div data-testid="message-demo">Sample message</div></div><div data-testid="dm-composer-container"><div data-testid="dm-composer-input-container"><textarea data-testid="dm-composer-textarea" placeholder="Message"></textarea></div></div></section>
  </div></div>`;
  history.replaceState(null, '', '/i/chat');
  await chrome.storage.local.set({ xGlass: { opacity: 35 } }); await wait();
  const container = shadow.querySelector('[data-testid=dm-container]');
  const input = shadow.querySelector('textarea');
  check(document.documentElement.hasAttribute('data-xlg-messages'), 'The Chat route gets a dedicated layout');
  const wide = container.getBoundingClientRect().width >= 918;
  check(document.querySelector('main').getBoundingClientRect().right <= innerWidth, 'The Chat layout stays within the viewport');
  check((getComputedStyle(shadow.querySelector('[data-testid=dm-inbox-panel]')).display !== 'none') === wide, 'The native breakpoint switches between one and two columns unforced');
  check(getComputedStyle(shadow.querySelector('[data-xchat-root]')).backgroundColor === 'rgba(0, 0, 0, 0)', 'The shadow root’s black background is removed');
  check(getComputedStyle(container, '::before').backdropFilter.includes('blur'), 'Chat has a single glass frame');
  check(getComputedStyle(container).backdropFilter === 'none', 'The blur stays on the pseudo-element without changing containing blocks');
  check(container.getBoundingClientRect().height === innerHeight - 24, 'The frame keeps top and bottom margins');
  check(input.getBoundingClientRect().bottom <= innerHeight - 12, 'The message field stays within the viewport');
  check(getComputedStyle(shadow.querySelector('[data-testid=dm-conversation-header]')).backgroundColor.includes('0.94'), 'The header stays readable over messages');
  check(getComputedStyle(shadow.querySelector('[data-testid=message-demo]')).backgroundColor === 'rgb(30, 156, 241)', 'Bubbles keep their native color and alignment');
  const bubble=shadow.querySelector('[data-testid=message-demo]').getBoundingClientRect();
  input.value = 'Local draft'; input.focus(); await wait();
  check(shadow.querySelector('[data-testid=dm-composer-input-container]').getBoundingClientRect().height > 0 && bubble.width === 180, 'Focus and draft do not distort messages');
  shadow.querySelector('style[data-xlg-chat-style]').remove(); await wait();
  check(shadow.querySelectorAll('style[data-xlg-chat-style]').length === 1, 'The stylesheet is restored without duplicates after a remount');
  await chrome.storage.local.set({ xGlass: { lite: true } }); await wait();
  check(getComputedStyle(container, '::before').backdropFilter === 'none', 'Lightweight mode applies inside the shadow root');
  await chrome.storage.local.set({ xGlass: { enabled: false } }); await wait();
  check(getComputedStyle(shadow.querySelector('[data-xchat-root]')).backgroundColor === 'rgb(0, 0, 0)' && getComputedStyle(container, '::before').content === 'none', 'Disabling the theme restores native Chat');
  check(input.value === 'Local draft', 'Theme changes preserve the draft');
  primary.innerHTML = old; history.replaceState(null, '', path);
  await chrome.storage.local.set({ xGlass: {} }); await wait();
  check(!document.documentElement.hasAttribute('data-xlg-messages') && document.querySelector('main').getBoundingClientRect().width <= 600, 'Returning to the feed restores the timeline width');
  return checks;
})()
