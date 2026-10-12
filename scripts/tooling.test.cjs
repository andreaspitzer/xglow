const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { root, extension, extensionFiles } = require('./project.cjs');
const { createPreviewServer } = require('./serve-preview.cjs');

test('preview generation includes every browser suite and no unresolved templates', () => {
  execFileSync(process.execPath, [path.join(__dirname, 'build-preview.cjs')]);
  for (const file of fs.readdirSync(path.join(root, 'tests')).filter(name => name.endsWith('.browser.js'))) {
    const runner = file.replace('.browser.js', '.test.html');
    const html = fs.readFileSync(path.join(root, 'public', runner), 'utf8');
    assert.ok(html.includes("result.id = 'test-result'"), runner);
    assert.ok(!/\{\{\w+\}\}/.test(html), runner);
  }
  const popup = fs.readFileSync(path.join(root, 'public', 'popup-demo.html'), 'utf8');
  assert.ok(!/<script src=|<link rel="stylesheet"/.test(popup));
});

test('release ZIP contains exactly runtime files and the license', () => {
  execFileSync(process.execPath, [path.join(__dirname, 'package.cjs')]);
  const { version } = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
  const archive = path.join(root, 'dist', `x-liquid-glass-${version}.zip`);
  const entries = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n');
  assert.deepEqual(entries.sort(), [...extensionFiles(), 'LICENSE'].sort());
  assert.ok(entries.includes('manifest.json'));
});

test('preview server serves local files and rejects outside paths and unsupported methods', async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'xlg-preview-test-'));
  const publicDir = path.join(temporary, 'public');
  fs.mkdirSync(publicDir);
  fs.writeFileSync(path.join(publicDir, 'index.html'), '<p>Sample content</p>');
  fs.writeFileSync(path.join(temporary, 'private.txt'), 'Not public');
  fs.symlinkSync(path.join(temporary, 'private.txt'), path.join(publicDir, 'outside.txt'));
  const server = createPreviewServer(publicDir);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const request = (pathname, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: pathname, method }, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    });
    req.on('error', reject); req.end();
  });
  try {
    assert.deepEqual(await request('/'), { status: 200, body: '<p>Sample content</p>' });
    assert.deepEqual(await request('/', 'HEAD'), { status: 200, body: '' });
    assert.equal((await request('/%2e%2e%2fprivate.txt')).status, 404);
    assert.equal((await request('/outside.txt')).status, 404);
    assert.equal((await request('/%', 'GET')).status, 400);
    assert.equal((await request('/', 'POST')).status, 405);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
