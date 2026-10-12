/* A local adapter for the Chrome storage API used by the extension. */
(() => {
  const storageKey = 'xGlassDemo';
  const listeners = [];
  function readSettings() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  }
  let settings = readSettings();
  window.chrome = {
    storage: {
      local: {
        get: async () => ({ xGlass: settings }),
        set: async ({ xGlass }) => {
          settings = xGlass;
          localStorage.setItem(storageKey, JSON.stringify(xGlass));
          for (const listener of listeners) listener({ xGlass: { newValue: xGlass } }, 'local');
        }
      },
      onChanged: { addListener: listener => listeners.push(listener) }
    }
  };
  window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    settings = readSettings();
    for (const listener of listeners) listener({ xGlass: { newValue: settings } }, 'local');
  });
})();
