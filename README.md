# Sunset Strip Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Sobarkemat/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Sobarkemat/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your own photos and a caption into GTA-style cover art: the multi-panel poster look with bold sunset-gradient lettering and a Vice City neon colour grade, exported as a PNG to share. Your photos never leave your machine — everything runs from static files in your browser.

## What it does

- **Any photo, any panel** — load up to four photos from your machine (or use the built-in samples) and fill several panels with one photo or several. Click a panel to select it, drag it to pan, scroll to zoom, or use the zoom slider.
- **Six layouts** — Grid 4, Hero + 3, Full Bleed, Triple Strip, Comic 5 and Tilted Snaps, each with a white keyline frame and a title band.
- **Six colour grades** — Vice Sunset, Neon Nights, Golden Hour, Teal Dawn, Candy Pop and Mono Noir, each a photo filter plus a sunset wash over the panels.
- **Poster lettering** — a title in Anton with a sunset gradient, a script subtitle in Pacifico, a Bebas Neue kicker and a tilted star badge ribbon, all editable.
- **Poster finish** — film grain, a soft vignette and a white frame around the whole cover.
- **Undo / redo** — Ctrl+Z / Ctrl+Y, or the buttons in the header.
- **Fast export** — one click exports a PNG in 1080 × 1080, 1080 × 1350 or 1920 × 1080, or all three sizes at once.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network request: every script, font and sample photo is a file under `app/`.

## Files

- `app/` — the web app: `index.html`, `style.css`, `src/cover.js` (the cover renderer), `src/main.js` (the editor), `src/shots.js` (fixed scenes for screenshots), `fonts/` (Anton, Pacifico and Bebas Neue under the SIL Open Font License) and `samples/` (two model-made photos, free to use).
- `screenshots/` — four screenshots taken from the running app: the wide cover, the editor with photos loaded, the square cover and the story cover.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.
- `serve.ts` — a tiny static server for trying the app locally.

## Notes

Sunset Strip Cover Studio is an original fan-made tool. It is not affiliated with Rockstar Games and uses no Rockstar logo, artwork or font. Lettering uses Anton, Pacifico and Bebas Neue, all under the SIL Open Font License (see `app/fonts/OFL.txt`).

Built for the make.fun bounty — [enter your own cover maker on make.fun](https://make.fun/?ref=1sfr27n0&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01).
