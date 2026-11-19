// Sunset Strip Cover Studio — the entry program (Node 22, standard library only).
// It hands the app in: copies this repository's app/ and screenshots/ to /output and writes
// /output/dossier.json with the vendored make.fun library, so the gate can check the app and
// the judge can read it. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program writes the same bytes on every run: it copies files as they are and the dossier
// is built from those files alone, so two runs agree byte for byte.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps (reference/gate.json): the dossier text cap shapes the bytes; the rest
// refuse an entry the scorer would refuse, so check them here and fail loudly instead.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function countAppEntries(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    files += 1;
    if (entry.isDirectory()) {
      const sub = countAppEntries(path);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const appTree = countAppEntries(join(here, 'app'));
if (appTree.files > CAPS.app_max_files) throw new Error(`app/ has ${appTree.files} entries, over the ${CAPS.app_max_files} cap`);
if (appTree.bytes > CAPS.app_max_bytes) throw new Error(`app/ is ${appTree.bytes} bytes, over the ${CAPS.app_max_bytes} cap`);
const shots = readdirSync(join(here, 'screenshots')).filter((n) => !n.startsWith('.'));
if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
  throw new Error(`screenshots/ has ${shots.length} images, need 3 or 4`);
}
for (const name of shots) {
  const size = statSync(join(here, 'screenshots', name)).size;
  if (size > CAPS.screenshots.max_bytes) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
}

const dossier = buildDossier(out, CAPS);
if (dossier.length > 1572864) throw new Error(`dossier.json is ${dossier.length} bytes, over the 1.5 MiB cap`);
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`Sunset Strip Cover Studio handed in: app/ ${appTree.files} entries, ${appTree.bytes} bytes; ${shots.length} screenshots; dossier.json ${dossier.length} bytes.`);
