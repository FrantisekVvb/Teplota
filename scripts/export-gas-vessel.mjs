import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'gas-cylinder-detail.json');
const outputPath = path.join(root, 'assets', 'gas-vessel.svg');

const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const keepLayers = new Set([
  'cylinder 1',
  'cylinder 2',
  'gas layer Outlines',
  'pump top Outlines',
]);

data.layers = data.layers.filter((layer) => keepLayers.has(layer.nm));

const gasLayer = data.layers.find((layer) => layer.nm === 'gas layer Outlines');
if (gasLayer) {
  gasLayer.ks.o = { a: 0, k: 80, ix: 11 };
}

const pumpLayer = data.layers.find((layer) => layer.nm === 'pump top Outlines');
if (pumpLayer?.ks?.p?.a) {
  pumpLayer.ks.p = { a: 0, k: [1010.967, 847.514, 0], ix: 2, l: 2 };
}

const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;background:#fff">
    <div id="holder"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"><\/script>
    <script>
      const animationData = ${JSON.stringify(data)};
      const anim = lottie.loadAnimation({
        container: document.getElementById('holder'),
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData,
      });
      anim.addEventListener('DOMLoaded', () => {
        anim.goToAndStop(231, true);
        window.__READY__ = true;
      });
    <\/script>
  </body>
</html>`;

const htmlPath = path.join(root, 'scripts', '.export-gas-vessel.html');
fs.writeFileSync(htmlPath, html);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 2000, height: 2000 });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__READY__ === true');

const svg = await page.evaluate(() => {
  const svgEl = document.querySelector('#holder svg');
  if (!svgEl) return '';
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return svgEl.outerHTML;
});

await browser.close();
fs.unlinkSync(htmlPath);

if (!svg) {
  throw new Error('SVG export failed.');
}

const cropped = svg.replace(
  /<svg([^>]*)>/,
  '<svg$1 viewBox="620 520 760 920" xmlns="http://www.w3.org/2000/svg">',
);

fs.writeFileSync(outputPath, cropped);
console.log('Wrote', outputPath, cropped.length, 'bytes');
