// Renders screenshots/ from the running app with headless Chromium (Playwright's headless
// shell). Serves app/ on a local port, opens each scene from shots.json, waits for the app to
// signal it has painted (window.__shotReady), and saves a JPEG within the gate's limits.
//   node render-shots.mjs
import { createServer } from 'node:http';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/makefun/playtest/node_modules/playwright-core');

const here = fileURLToPath(new URL('.', import.meta.url));
const appRoot = join(here, 'app');
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = join(appRoot, path === '/' ? 'index.html' : path);
  try {
    const data = readFileSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
  args: ['--no-sandbox', '--disable-gpu'],
});

for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
  page.on('console', (msg) => { if (msg.type() === 'error') console.log(`[${shot.name}] console error:`, msg.text()); });
  page.on('pageerror', (err) => console.log(`[${shot.name}] page error:`, String(err)));
  await page.goto(`http://127.0.0.1:${port}/index.html${shot.query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
  const outPath = join(here, 'screenshots', shot.name);
  await page.screenshot({ path: outPath, type: 'jpeg', quality: 85 });
  const bytes = statSync(outPath).size;
  console.log(`${shot.name}: ${shot.w}x${shot.h}, ${bytes} bytes${bytes > 262144 ? '  <-- OVER 256 KiB!' : ''}`);
  await page.close();
}

await browser.close();
server.close();
console.log('done');
