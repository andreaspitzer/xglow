const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { root, extension, extensionFiles } = require('./project.cjs');

execFileSync(process.execPath, [path.join(__dirname, 'check.cjs')], { stdio: 'inherit' });
const { version } = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
const output = path.join(root, 'dist');
const archive = path.join(output, `x-liquid-glass-${version}.zip`);
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'x-liquid-glass-'));
try {
  const files = extensionFiles();
  for (const name of files) {
    const target = path.join(stage, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(extension, name), target);
  }
  fs.copyFileSync(path.join(root, 'LICENSE'), path.join(stage, 'LICENSE'));
  fs.mkdirSync(output, { recursive: true });
  const temporaryArchive = path.join(stage, 'release.zip');
  execFileSync('zip', ['-X', '-q', temporaryArchive, ...files, 'LICENSE'], { cwd: stage, stdio: 'inherit' });
  fs.copyFileSync(temporaryArchive, archive);
  console.log(`Created ${path.relative(root, archive)} (${files.length} extension files + LICENSE).`);
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
