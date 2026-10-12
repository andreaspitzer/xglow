document.getElementById('demoToggle').addEventListener('click', async () => {
  const { xGlass } = await chrome.storage.local.get('xGlass');
  await chrome.storage.local.set({
    xGlass: { ...XGlass.normalize(xGlass), enabled: !document.documentElement.hasAttribute('data-xlg') }
  });
});
document.getElementById('demoTone').addEventListener('click', () => {
  const light = document.body.classList.toggle('light');
  document.body.style.backgroundColor = light ? 'rgb(255,255,255)' : 'rgb(0,0,0)';
  document.body.style.color = light ? 'rgb(15,20,25)' : 'rgb(231,233,234)';
});
