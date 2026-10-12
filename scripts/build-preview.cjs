const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const read = (directory, name) => fs.readFileSync(path.join(root, directory, name), 'utf8');
const preview = name => read('scripts/preview', name);
const extension = name => read('extension', name);
const manifest = JSON.parse(extension('manifest.json'));
const styles = manifest.content_scripts.flatMap(entry => entry.css || []).map(extension).join('\n');
const scripts = manifest.content_scripts.flatMap(entry => entry.js || []);
const settings = extension('settings.js');
const runtime = scripts.filter(name => name !== 'settings.js').map(extension).join('\n');
const adapter = preview('storage.js');
const render = (template, values) => template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in values)) throw new Error(`Missing template value: ${key}`);
  return values[key];
});
const write = (name, html) => fs.writeFileSync(path.join(output, name), html);
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const navigation = ['Home', 'Explore', 'Notifications', 'Chat', 'Grok', 'Premium', 'Profile', 'More'];
const navigationIcons = ['⌂', '⌕', '♧', '☏', '◌', '◇', '♙', '···'];
function post(name, handle, text, media = '') {
  return `<div data-testid="cellInnerDiv"><article data-testid="tweet">
    <div class="avatar">${name[0]}</div><div class="post-body">
      <div class="post-meta"><strong>${name}</strong><span class="check">✦</span><span>@${handle} · 2h</span><span class="more">···</span></div>
      <div data-testid="tweetText">${text}</div>${media}
      <div class="actions"><span>♡ 128</span><span>⇄ 24</span><span>♧ 12</span><span>▥ 8.2K</span><span>♧</span></div>
    </div></article></div>`;
}
const media = '<div class="media"><small>A new surface</small><strong>Less, but better.</strong><small>Design notes</small></div>';
write('index.html', render(preview('demo.html'), {
  demoStyles: preview('demo.css'), themeStyles: styles, adapter, settings, runtime,
  demoScript: preview('demo.js'),
  navigation: navigation.map((name, index) => `<a href="#${name}" ${index === 0 ? 'aria-current="page"' : ''}><div><i>${navigationIcons[index]}</i><span>${name}</span></div></a>`).join('\n'),
  posts: [
    post('Studio North', 'studio_example', 'Good interfaces make room for ideas.<br><br>A little light. A little depth.', media),
    post('Alex', 'alex_example', 'Small details make a difference. ✨'),
    post('Sam', 'sam_example', 'A weekend experiment: glass, reflections and the same familiar feed.'),
    post('Design Daily', 'design_example', 'What are you building this weekend?')
  ].join('\n'),
  suggestions: ['Studio North', 'Design Daily', 'Design Notes'].map((name, index) => `<div class="follow"><div class="avatar">${name[0]}</div><div><b>${name}</b><small>@example_${index}</small></div><button>Follow</button></div>`).join('\n')
}));

const popup = extension(manifest.action.default_popup)
  .replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, name) => `<style>${extension(name)}</style>`)
  .replace('</head>', `<script>${adapter}</script></head>`)
  .replace(/<script src="([^"]+)"><\/script>/g, (_, name) => `<script>${extension(name)}</script>`);
write('popup-demo.html', popup);

const symbols = JSON.parse(read('tests/fixtures', 'nav-icons.json'));
const compactNavigation = render(preview('compact-nav.html'), {
  compactStyles: preview('compact-nav.css'), logo: symbols.logo, postIcon: symbols.post,
  profileIcon: symbols.icons.find(icon => icon.label === 'Profile').svg,
  icons: symbols.icons.map(icon => icon.href
    ? `<a href="${icon.href}" aria-label="${icon.label}"><div>${icon.svg}</div></a>`
    : `<button aria-label="${icon.label}"><div>${icon.svg}</div></button>`).join('\n')
});
const fixture = render(read('tests', 'layout-fixture.html'), { css: styles, adapter, settings, content: runtime })
  .replace('</body>', `${compactNavigation}</body>`);
write('layout-fixture.html', fixture);

const suites = [
  'layout', 'conversation-frame', 'navigation-thread', 'search', 'chat',
  'compact-nav', 'centering', 'reply-composer', 'post-spacing'
];
for (const name of suites) {
  const test = read('tests', `${name}.browser.js`);
  const runner = `<script>Promise.resolve().then(() => ${test}).then(checks => {
    const result = document.createElement('pre'); result.id = 'test-result';
    result.textContent = JSON.stringify({passed: true, checks}); document.body.append(result);
  }).catch(error => {
    const result = document.createElement('pre'); result.id = 'test-result';
    result.textContent = JSON.stringify({passed: false, error: error.message}); document.body.append(result);
  });</script>`;
  // The centering suite creates child fixtures on this origin; they share its preferences.
  const testFixture = name === 'centering' ? fixture : fixture.replaceAll("'xGlassDemo'", `'xGlassTest-${name}'`);
  write(`${name}.test.html`, testFixture.replace('</body>', `${runner}</body>`));
}
write('compact-nav-demo.html', fixture.replace('</body>', `<script>window.compactNavDemo=true;${read('tests', 'compact-nav.browser.js')}</script></body>`));
console.log(`Built demo, popup and ${suites.length} browser suites in public/.`);
