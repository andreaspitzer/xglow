/* Suggestions must remain visible and clickable beyond the sticky header. */
(async () => {
  const checks = [];
  const check = (ok, text) => { if (!ok) throw new Error(text); checks.push(text); };
  const wait = () => new Promise(resolve => setTimeout(resolve, 150));
  const content = document.querySelector('[data-testid="primaryColumn"] > div');
  const oldBar = content.querySelector('.toolbar');
  const bar = document.getElementById('search-toolbar-fixture').content.firstElementChild.cloneNode(true);
  const originalPath = location.pathname;
  oldBar.replaceWith(bar); history.replaceState(null, '', '/search?q=liquid%20glass');
  await chrome.storage.local.set({ xGlass: { opacity: 35 } }); await wait(); window.scrollTo(0, 0);
  const input = bar.querySelector('input'), field = bar.querySelector('.search-field');
  const before = field.getBoundingClientRect().height;
  input.focus(); await wait();
  const popup = bar.querySelector('[role="listbox"]');
  const option = popup.querySelector('[role="option"]');
  const rect = option.getBoundingClientRect();
  const popupStyle = getComputedStyle(popup);
  check(getComputedStyle(bar).overflow === 'visible' && popup.getBoundingClientRect().bottom > bar.getBoundingClientRect().bottom, 'The dropdown can extend beyond the sticky header');
  const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 4);
  check(popup.contains(hit), 'Suggestions are clickable beyond the header edge');
  check(popupStyle.backgroundColor.includes('0.94') && popupStyle.backdropFilter.includes('blur'), 'The dropdown stays readable at low glass opacity');
  check(getComputedStyle(option).backgroundColor === 'rgba(0, 0, 0, 0)' && !popup.hasAttribute('data-xlg-clear'), 'Cleanup removes inner backgrounds without clearing the panel');
  check(getComputedStyle(input).outlineStyle === 'none' && getComputedStyle(field).borderColor !== 'rgb(47, 51, 54)', 'Focus draws a single outline on the rounded field');
  check(field.getBoundingClientRect().height === before && before === 44, 'Focus keeps the field’s native height');
  const barBox = bar.getBoundingClientRect(), fieldBox = field.getBoundingClientRect();
  const tabsTop = bar.querySelector('[role="tablist"]').getBoundingClientRect().top;
  const back = bar.querySelector('[data-testid="app-bar-back"]').getBoundingClientRect();
  const settings = bar.querySelector('[data-testid="settingsAppBar"]').getBoundingClientRect();
  check(fieldBox.top - barBox.top === 8 && tabsTop - fieldBox.bottom === 8 && back.left - barBox.left === 8 && barBox.right - settings.right === 8, 'The header row keeps an even 8px inset above, below and at both sides');
  check(Math.abs((settings.top + settings.bottom) / 2 - (fieldBox.top + fieldBox.bottom) / 2) < 1 && Math.abs((back.top + back.bottom) / 2 - (fieldBox.top + fieldBox.bottom) / 2) < 1, 'The header buttons are centered on the field');
  check(fieldBox.left - back.right === 8, 'The back button sits next to the field');
  check(getComputedStyle(bar.querySelector('[role="navigation"]')).borderBottomColor === 'rgba(0, 0, 0, 0)', 'The tab separator does not cross the header corners');
  const shell = getComputedStyle(bar.querySelector('.popup-shell'));
  check(shell.boxShadow === 'none' && shell.backgroundColor === 'rgba(0, 0, 0, 0)' && popup.getBoundingClientRect().top - fieldBox.bottom === 6, 'The dropdown shell, which holds result avatars, adds no black corners or glow behind the menu');
  check(getComputedStyle(bar.querySelector('[role="tab"]')).borderBottomLeftRadius === '20px', 'Tabs keep the glass surface corners');
  const selectedTab = bar.querySelector('[role="tab"][aria-selected="true"]'), pill = getComputedStyle(selectedTab, '::before');
  check(getComputedStyle(selectedTab).backgroundColor === 'rgba(0, 0, 0, 0)' && pill.borderTopLeftRadius === '999px' && pill.top === '6px' && pill.backgroundColor !== 'rgba(0, 0, 0, 0)', 'The selected tab is an inset pill, not a block hanging under the field');
  const reopened = popup.cloneNode(true); reopened.removeAttribute('data-xlg-search-popup'); popup.replaceWith(reopened); await wait();
  check(reopened.hasAttribute('data-xlg-search-popup') && !reopened.hasAttribute('data-xlg-clear'), 'The dropdown keeps its surface after reopening');

  // Result relevance feedback: a standalone two-button group, not a post.
  const feedback = document.createElement('div'); feedback.setAttribute('data-testid', 'cellInnerDiv');
  feedback.innerHTML = '<div role="group" style="background:#000"><button type="button">Yes</button><button type="button">No</button></div>';
  content.append(feedback); await wait();
  const feedbackGroup = feedback.firstElementChild;
  check(feedbackGroup.hasAttribute('data-xlg-search-feedback') && getComputedStyle(feedbackGroup).backgroundColor === 'rgba(0, 0, 0, 0)', 'Search feedback loses its opaque strip');
  feedbackGroup.append(document.createElement('button')); await wait();
  check(!feedbackGroup.hasAttribute('data-xlg-search-feedback'), 'Other button groups are not treated as search feedback');
  feedback.remove();

  // Square-cornered themes reshape the marked field: rediscovery must keep it.
  await chrome.storage.local.set({ xGlass: { theme: 'hud' } }); await wait();
  check(!bar.querySelector('form').hasAttribute('data-xlg-search') && field.getBoundingClientRect().height === 44, 'Switching to a square theme keeps a single search surface');
  await chrome.storage.local.set({ xGlass: { lite: true } }); await wait();
  check(getComputedStyle(reopened).backdropFilter === 'none' && getComputedStyle(reopened).backgroundColor.includes('0.94'), 'Lightweight mode keeps the menu readable and in place');
  input.blur();
  await chrome.storage.local.set({ xGlass: { enabled: false } }); await wait();
  check(getComputedStyle(reopened).backgroundColor === 'rgb(0, 0, 0)' && getComputedStyle(field).borderTopWidth === '1px', 'Disabling the theme restores native search');
  check(bar.querySelector('.search-row').getBoundingClientRect().height === 53 && bar.querySelector('.search-header').getBoundingClientRect().height === 53 && getComputedStyle(bar.querySelector('.back-column')).minWidth === '56px', 'Disabling the theme restores the native header row');
  bar.replaceWith(oldBar); history.replaceState(null, '', originalPath);
  await chrome.storage.local.set({ xGlass: {} }); await wait();
  return checks;
})()
