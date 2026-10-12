const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const extension = path.join(root, 'extension');
function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not release inputs: ${path.relative(root, file)}`);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}
function extensionFiles() {
  return filesIn(extension).filter(file => !path.basename(file).startsWith('.')).map(file => path.relative(extension, file)).sort();
}
module.exports = { root, extension, filesIn, extensionFiles };
