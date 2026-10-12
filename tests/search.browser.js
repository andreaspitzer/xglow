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
  check(getComputedStyle(bar.querySelector('[role="tab"]')).borderBottomLeftRadius === '20px', 'Tabs keep the glass surface corners');
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

  await chrome.storage.local.set({ xGlass: { lite: true } }); await wait();
  check(getComputedStyle(reopened).backdropFilter === 'none' && getComputedStyle(reopened).backgroundColor.includes('0.94'), 'Lightweight mode keeps the menu readable and in place');
  await chrome.storage.local.set({ xGlass: { enabled: false } }); await wait();
  check(getComputedStyle(reopened).backgroundColor === 'rgb(0, 0, 0)' && getComputedStyle(field).borderTopWidth === '1px', 'Disabling the theme restores native search');
  bar.replaceWith(oldBar); history.replaceState(null, '', originalPath);
  await chrome.storage.local.set({ xGlass: {} }); await wait();
  return checks;
})()
