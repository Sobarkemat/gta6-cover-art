// Renders the four screenshots in shots.json with headless Chromium and
// writes them to screenshots/. Serves app/ over HTTP first, then opens one
// page per shot with ?shot=<scene>&views=<framing> and screenshots the
// viewport. Usage: node render-shots.mjs
//
// Needs Playwright's headless shell (already in ~/.cache/ms-playwright/).
// Install once if missing: npx playwright install chromium --with-deps

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = fileURLToPath(new URL('.', import.meta.url));
const appDir = join(here, 'app');
const outDir = join(here, 'screenshots');
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8')).shots;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    const file = join(appDir, path);
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

const executablePath = process.env.CHROME_HEADLESS_SHELL
  || '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell';
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

mkdirSync(outDir, { recursive: true });
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  const url = `http://127.0.0.1:${port}/index.html?shot=${shot.scene}&views=${encodeURIComponent(shot.views)}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 20000 });
  await page.waitForTimeout(600);
  const target = join(outDir, shot.file);
  await page.screenshot({ path: target, type: 'jpeg', quality: 82 });
  console.log(`${shot.file}: ${shot.width}x${shot.height} — ${shot.note} ${errors.length ? `console errors: ${errors.join(' | ')}` : 'no console errors'}`);
  await page.close();
}

await browser.close();
server.close();
console.log('done');
