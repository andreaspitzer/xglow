const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { root, extension, filesIn, extensionFiles } = require('./project.cjs');

const directories = ['extension', 'scripts', 'tests', 'docs', '.github'];
const files = directories.flatMap(name => filesIn(path.join(root, name)))
  .filter(file => /\.(?:js|cjs|css|html|json|md|ya?ml|svg|txt)$/.test(file));
const rootFiles = ['README.md', 'CONTRIBUTING.md', 'LICENSE', '.gitignore', 'package.json'];
files.push(...rootFiles.map(name => path.join(root, name)));
const privatePath = /(?:\/Users\/|[A-Z]:\\Users\\|\/home\/[^/"'\s]+\/)/;
const privateKey = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const accessToken = /(?:gh[pousr]_[\w]{30,}|github_pat_[\w]{30,}|sk-[A-Za-z0-9]{32,})/;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (privatePath.test(text) || privateKey.test(text) || accessToken.test(text)) {
    throw new Error(`Private data pattern in ${path.relative(root, file)}`);
  }
  if (/\.(?:js|cjs)$/.test(file)) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(manifest.version, pkg.version, 'Package and extension versions must match');
assert.deepEqual(manifest.permissions, ['storage']);
assert.equal(manifest.manifest_version, 3);
assert.ok(manifest.content_scripts.every(entry => entry.matches.every(pattern => /^https:\/\/(?:www\.)?(?:x|twitter)\.com\/\*$/.test(pattern))));
const popup = fs.readFileSync(path.join(extension, manifest.action.default_popup), 'utf8');
assert.ok(popup.includes(`>${manifest.version}</span>`), 'Popup version must match the manifest');
const referenced = [
  ...manifest.content_scripts.flatMap(entry => [...(entry.css || []), ...(entry.js || [])]),
  manifest.action.default_popup,
  ...Array.from(popup.matchAll(/(?:href|src)="([^"]+)"/g), match => match[1])
];
for (const name of referenced) {
  assert.ok(!name.includes('..') && !path.isAbsolute(name) && !name.includes(':'), `Non-local extension asset: ${name}`);
  assert.ok(fs.statSync(path.join(extension, name)).isFile(), `Missing extension asset: ${name}`);
}
for (const name of extensionFiles()) assert.ok(/\.(?:js|css|html|json|svg|png|webp)$/.test(name), `Unexpected release file: ${name}`);
console.log(`Checked ${files.length} source files, manifest assets and release metadata.`);
