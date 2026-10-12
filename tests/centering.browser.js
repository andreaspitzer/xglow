/* Runs in the layout fixture. Iframes provide real responsive viewports. */
(async () => {
  await chrome.storage.local.set({ xGlass: {} });
  const results = [];
  for (const width of [1920, 1000, 700, 390]) {
    const frame = document.createElement('iframe');
    frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:900px;border:0`;
    const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
    frame.src = `${location.origin}/layout-fixture.html?centering=${width}`;
    document.body.append(frame);
    try {
      await loaded;
      await new Promise(resolve => setTimeout(resolve, 350));
      const doc = frame.contentDocument;
      const nav = doc.querySelector('[data-xlg-nav]').getBoundingClientRect();
      const primary = doc.querySelector('[data-testid="primaryColumn"]').getBoundingClientRect();
      const actualWidth = doc.documentElement.clientWidth;
      const error = Math.abs((nav.left + primary.right) / 2 - actualWidth / 2);
      const overflow = doc.documentElement.scrollWidth > actualWidth;
      const expectedFeed = Math.min(600, actualWidth - nav.width);
      if (error >= 1 || overflow || nav.right > primary.left || Math.abs(primary.width - expectedFeed) >= 1) {
        throw new Error(`Layout not centered at ${width}px: error ${error}, overflow ${overflow}; nav ${nav.left}/${nav.width}, feed ${primary.left}/${primary.width}, viewport ${actualWidth}`);
      }
      results.push({ viewport: frame.contentWindow.innerWidth, centerError: error, feedWidth: primary.width, navWidth: nav.width, overflow });
    } finally {
      frame.remove();
    }
  }
  return results;
})()
