/* Opened post: the native header flow and X's automatic anchor must both
   show the author, and the inline reply notice gets a glass surface. */
(async () => {
  const checks = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const content = document.querySelector('[data-testid="primaryColumn"] > div');
  // The native toolbar exists before the runtime marks it on its first frame.
  const toolbar = content.querySelector('.toolbar');
  const composer = content.querySelector('.composer');
  const oldPath = location.pathname;
  const cell = document.createElement('div'); cell.setAttribute('data-testid', 'cellInnerDiv');
  cell.innerHTML = '<article data-testid="tweet" tabindex="-1"><div data-testid="User-Name">Author</div><p>Post opened from the timeline</p>' +
    '<div role="status" aria-live="polite"><svg data-testid="icon" viewBox="0 0 24 24" width="20" height="20"></svg><span dir="ltr">People the author mentioned can reply</span></div></article>';
  // Global toasts share the role but live outside the post.
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = '<svg data-testid="icon" viewBox="0 0 24 24" width="20" height="20"></svg><span>Copied to clipboard</span>';
  try {
    await chrome.storage.local.set({ xGlass: {} });
    history.pushState(null, '', '/spacing/status/123');
    content.insertBefore(cell, composer);
    document.body.append(toast);
    window.scrollTo(0, 0); await wait(120);
    const author = cell.querySelector('[data-testid="User-Name"]');
    const gap = () => author.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom;
    check(gap() >= 12 && gap() <= 30, 'Entering at the top: author visible without a large gap above the post');

    const notice = cell.querySelector('[role="status"]');
    const noticeStyle = getComputedStyle(notice);
    check(notice.hasAttribute('data-xlg-reply-notice') && noticeStyle.borderRadius === '16px' && noticeStyle.padding === '12px 14px' && noticeStyle.margin === '12px 0px', 'The inline reply notice gets a rounded glass surface');
    check(!toast.hasAttribute('data-xlg-reply-notice'), 'Global toasts are left native');

    window.scrollTo(0, author.getBoundingClientRect().top + window.scrollY - 30); await wait(300);
    check(Math.abs(gap() - 12) < 1, 'The automatic anchor under the header is corrected to 12px');
    window.dispatchEvent(new WheelEvent('wheel'));
    window.scrollTo(0, 90); const position = window.scrollY; await wait(500);
    check(window.scrollY === position, 'After a user scroll the position stays under the user’s control');
    return checks;
  } finally {
    cell.remove(); toast.remove(); history.replaceState(null, '', oldPath); window.scrollTo(0, 0);
    await chrome.storage.local.set({ xGlass: {} });
  }
})()
