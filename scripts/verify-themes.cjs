const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { root } = require('./project.cjs');
const { createPreviewServer } = require('./serve-preview.cjs');

async function run(command, args, env = process.env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function localPreview() {
  let registrations;
  try {
    registrations = JSON.parse(execFileSync('unlocalhost', ['--json', 'list'], { encoding: 'utf8' })).projects;
  } catch {
    throw new Error('Start the preview with unlocalhost, or supply XGLOW_TEST_BASE_URL for an existing local fixture server. See docs/THEMES.md.');
  }
  const project = registrations.find(item => {
    try { return fs.realpathSync(item.path) === fs.realpathSync(root); } catch { return false; }
  });
  if (!project) throw new Error('Register this checkout with unlocalhost setup before running theme tests. See docs/THEMES.md.');
  const port = Number(execFileSync('unlocalhost', ['port', project.id], { encoding: 'utf8' }).trim());
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid unlocalhost preview port.');
  const url = `http://127.0.0.1:${port}`;
  try {
    if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) return url;
  } catch { /* A stopped registered preview can be started without changing its configuration. */ }
  await run('unlocalhost', ['up', project.id]);
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return url;
    } catch { /* Wait for the managed process to become reachable. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('The unlocalhost preview did not become reachable.');
}

async function main() {
  await run(process.execPath, [path.join(root, 'scripts/check.cjs')]);
  // The tooling tests generate the preview from the current extension files.
  await run(process.execPath, ['--test']);
  let server;
  try {
    let baseURL = process.env.XGLOW_TEST_BASE_URL;
    if (!baseURL && process.env.CI) {
      // CI serves synthetic fixtures only; it does not launch the developer's project.
      server = createPreviewServer(path.join(root, 'public'));
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      baseURL = `http://127.0.0.1:${server.address().port}`;
    }
    if (!baseURL) baseURL = await localPreview();
    const url = new URL(baseURL);
    if (!['http:', 'https:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && !url.hostname.endsWith('.localhost')) {
      throw new Error('Theme tests must target a local synthetic fixture server.');
    }
    console.log(`Theme browser checks: ${url.origin}`);
    await run(process.execPath, [require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)], { ...process.env, XGLOW_TEST_BASE_URL: url.origin });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
