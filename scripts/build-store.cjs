/* Optional artwork export. Requires ImageMagick (`magick`), not needed to
   install or package the extension. Source screenshots are kept unmodified. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { root, extension } = require('./project.cjs');

const store = path.join(root, 'docs', 'store');
const icon = fs.readFileSync(path.join(root, 'docs', 'brand', 'icon.svg'), 'utf8');
fs.mkdirSync(path.join(extension, 'icons'), { recursive: true });
fs.mkdirSync(store, { recursive: true });

function render(svg, output, size) {
  execFileSync('magick', ['-background', 'none', 'svg:-', ...(size ? ['-resize', `${size}x${size}`] : []), `PNG32:${output}`], { input: svg });
}
for (const size of [16, 32, 48, 128]) {
  render(icon, path.join(extension, 'icons', `icon-${size}.png`), size);
}

const iconContent = icon.replace(/<svg[^>]+>/, '').replace('</svg>', '');
const background = '#191714';
const promo = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
<rect width="440" height="280" fill="${background}"/>
<circle cx="440" cy="0" r="240" fill="#f4b952" fill-opacity=".08"/>
<g transform="translate(100 20) scale(1.85)">${iconContent}</g>
</svg>`;
render(promo, path.join(store, 'promo-440x280.png'));

function screenshot({ source, title, subtitle, detail, color, footer, output }) {
  const png = fs.readFileSync(path.join(root, 'docs', 'screenshots', source));
  const scale = Math.min(775 / png.readUInt32BE(16), 736 / png.readUInt32BE(20));
  const width = png.readUInt32BE(16) * scale, height = png.readUInt32BE(20) * scale;
  const x = 473 + (775 - width) / 2, y = 32 + (736 - height) / 2;
  const data = png.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="800" viewBox="0 0 1280 800">
<rect width="1280" height="800" fill="${background}"/>
<circle cx="1080" cy="140" r="560" fill="${color}" fill-opacity=".09"/>
<g transform="translate(34 35) scale(.7)">${iconContent}</g>
<g font-family="Arial, sans-serif" fill="#f7f3eb">
<text x="50" y="174" font-size="28" font-weight="bold">X Liquid Glass</text>
<text x="50" y="267" font-size="48" font-weight="bold">${title}</text>
<text x="50" y="321" font-size="24" fill="#c8c1b7">${subtitle}</text>
<text x="50" y="378" font-size="21" fill="#c8c1b7">${detail}</text>
<text x="50" y="688" font-size="18" fill="${color}">Local settings · Open source</text>
<text x="50" y="738" font-size="15" fill="#a69f95">${footer}</text>
</g>
<image x="${x}" y="${y}" width="${width}" height="${height}" xlink:href="data:image/png;base64,${data}"/>
</svg>`;
  render(svg, path.join(store, output));
}
screenshot({ source: 'home-aurora.png', title: 'A softer feed.', subtitle: 'Glass cards. Your colors.', detail: 'Adjust tint, blur and opacity.', color: '#a6b3ff', footer: 'Customized settings. Review is a separate extension.', output: 'home-1280x800.png' });
screenshot({ source: 'notifications-amber.png', title: 'Your atmosphere.', subtitle: 'Seven presets. Any HEX color.', detail: 'Glass across notifications and more.', color: '#f4b952', footer: 'Customized Amber settings shown.', output: 'notifications-1280x800.png' });
console.log('Exported extension icons, a 440×280 promo tile and two 1280×800 listing images.');
