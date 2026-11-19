// Sunset Strip Cover Studio — the cover renderer.
// Draws the whole cover onto any 2D canvas from a plain state object, so the editor's live
// preview and the exported PNG share exactly the same picture. No network, no library: every
// panel, grade, letter and effect below is drawn by hand on the canvas.

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  story: { label: 'Story 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

// Six colour grades. Each one is a photo filter for the panels, a wash laid over them, and the
// two colours the title lettering blends between.
export const GRADES = [
  { id: 'vice', name: 'Vice Sunset', filter: 'saturate(1.35) contrast(1.06) brightness(1.02)',
    washTop: 'rgba(255, 122, 26, 0.10)', washBottom: 'rgba(214, 38, 140, 0.34)',
    titleFrom: '#ffe259', titleTo: '#ff5e8a', band: '#1d0b2e' },
  { id: 'neon', name: 'Neon Nights', filter: 'saturate(1.55) contrast(1.12) brightness(0.98)',
    washTop: 'rgba(255, 45, 149, 0.16)', washBottom: 'rgba(0, 229, 255, 0.30)',
    titleFrom: '#ff7ad9', titleTo: '#37e6ff', band: '#0d0b26' },
  { id: 'golden', name: 'Golden Hour', filter: 'saturate(1.25) contrast(1.04) brightness(1.05)',
    washTop: 'rgba(255, 190, 60, 0.14)', washBottom: 'rgba(180, 90, 10, 0.30)',
    titleFrom: '#fff3b0', titleTo: '#ff9d00', band: '#241505' },
  { id: 'teal', name: 'Teal Dawn', filter: 'saturate(1.15) contrast(1.06) brightness(1.0)',
    washTop: 'rgba(64, 224, 208, 0.12)', washBottom: 'rgba(8, 60, 120, 0.36)',
    titleFrom: '#c8fff2', titleTo: '#2fb8ff', band: '#06182e' },
  { id: 'candy', name: 'Candy Pop', filter: 'saturate(1.7) contrast(1.08) brightness(1.03)',
    washTop: 'rgba(255, 120, 220, 0.16)', washBottom: 'rgba(130, 40, 255, 0.32)',
    titleFrom: '#fff06e', titleTo: '#ff4fd8', band: '#2b0a3d' },
  { id: 'mono', name: 'Mono Noir', filter: 'grayscale(1) contrast(1.18) brightness(1.04)',
    washTop: 'rgba(255, 255, 255, 0.05)', washBottom: 'rgba(0, 0, 0, 0.38)',
    titleFrom: '#ffffff', titleTo: '#c9c9c9', band: '#111111' },
];

// Six panel layouts. A layout is a function of the canvas size returning the panels as fractions
// of the canvas: x, y, w, h in 0..1, plus an optional rotation in degrees for the snapshot look.
// The photo zone is the top 76% of the cover; the title band takes the bottom 24%.
function zoneRects(w, h) {
  const zoneH = 0.76;
  const gap = 0.012;
  const zx = 0.03, zw = 0.94;
  return { zoneH, gap, zx, zw };
}

export const LAYOUTS = [
  { id: 'grid4', name: 'Grid 4', panels(w, h) {
    const { zoneH, gap, zx, zw } = zoneRects(w, h);
    const cw = (zw - gap) / 2, ch = (zoneH - gap) / 2;
    return [
      { x: zx, y: 0, w: cw, h: ch },
      { x: zx + cw + gap, y: 0, w: cw, h: ch },
      { x: zx, y: ch + gap, w: cw, h: ch },
      { x: zx + cw + gap, y: ch + gap, w: cw, h: ch },
    ];
  } },
  { id: 'hero3', name: 'Hero + 3', panels(w, h) {
    const { zoneH, gap, zx, zw } = zoneRects(w, h);
    const heroW = zw * 0.60;
    const sideW = zw - heroW - gap;
    const sh = (zoneH - gap * 2) / 3;
    return [
      { x: zx, y: 0, w: heroW, h: zoneH },
      { x: zx + heroW + gap, y: 0, w: sideW, h: sh },
      { x: zx + heroW + gap, y: sh + gap, w: sideW, h: sh },
      { x: zx + heroW + gap, y: (sh + gap) * 2, w: sideW, h: sh },
    ];
  } },
  { id: 'fullbleed', name: 'Full Bleed', panels() {
    return [{ x: 0, y: 0, w: 1, h: 1 }];
  } },
  { id: 'triple', name: 'Triple Strip', panels(w, h) {
    const { zoneH, gap, zx, zw } = zoneRects(w, h);
    const sw = (zw - gap * 2) / 3;
    return [
      { x: zx, y: 0, w: sw, h: zoneH },
      { x: zx + sw + gap, y: 0, w: sw, h: zoneH },
      { x: zx + (sw + gap) * 2, y: 0, w: sw, h: zoneH },
    ];
  } },
  { id: 'comic5', name: 'Comic 5', panels(w, h) {
    const { zoneH, gap, zx, zw } = zoneRects(w, h);
    const topH = zoneH * 0.48;
    const botH = zoneH - topH - gap;
    const bw = (zw - gap * 3) / 4;
    const panels = [{ x: zx, y: 0, w: zw, h: topH }];
    for (let i = 0; i < 4; i++) panels.push({ x: zx + i * (bw + gap), y: topH + gap, w: bw, h: botH });
    return panels;
  } },
  { id: 'tilted', name: 'Tilted Snaps', panels(w, h) {
    const { zoneH, zx, zw } = zoneRects(w, h);
    const pw = zw * 0.44, ph = zoneH * 0.52;
    return [
      { x: zx + 0.01, y: 0.01, w: pw, h: ph, rot: -4 },
      { x: zx + zw - pw - 0.01, y: 0.03, w: pw, h: ph, rot: 3 },
      { x: zx + 0.05, y: zoneH - ph - 0.01, w: pw, h: ph, rot: 2 },
      { x: zx + zw - pw - 0.05, y: zoneH - ph - 0.03, w: pw, h: ph, rot: -3 },
    ];
  } },
];

/** Panels (as pixel rects) for a layout id on a canvas of this size. */
export function layoutPanelsFor(layoutId, w, h) {
  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  return layout.panels(w, h).map((p) => ({
    x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h, rot: p.rot ?? 0,
  }));
}

/** Which panel (index) holds the point, or -1. Rotation is ignored: the unrotated box counts. */
export function panelAtPoint(layoutId, px, py, w, h) {
  const panels = layoutPanelsFor(layoutId, w, h);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return i;
  }
  return -1;
}

// A small seeded generator, so the film grain is the same on every render.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function grainCanvas() {
  if (grainTile) return grainTile;
  const rand = mulberry32(20261119);
  const tile = document.createElement('canvas');
  tile.width = 160; tile.height = 160;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan applied. */
function drawPanelPhoto(ctx, photo, rect, view, grade) {
  const iw = photo.naturalWidth, ih = photo.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const dw = iw * base * view.zoom, dh = ih * base * view.zoom;
  const dx = rect.x + (rect.w - dw) / 2 + view.ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + view.oy * rect.h;
  ctx.save();
  ctx.filter = grade.filter;
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

/** Lays the grade's wash over a panel rect, top colour fading into the bottom one. */
function applyGradeWash(ctx, rect, grade) {
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** What an empty panel shows in the editor: a dark card with its number and a prompt. */
function drawEmptyPanel(ctx, rect, index, w) {
  ctx.fillStyle = '#221a2e';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = Math.max(2, w * 0.002);
  ctx.strokeRect(rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = Math.max(14, Math.min(rect.w, rect.h) * 0.11);
  ctx.font = `${size}px "Bebas Neue", sans-serif`;
  ctx.fillText(`PANEL ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2 - size * 0.6);
  ctx.font = `${Math.max(11, size * 0.55)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('add a photo', rect.x + rect.w / 2, rect.y + rect.h / 2 + size * 0.6);
}

/** Draws every panel of the layout: photo, grade wash, white keyline. */
function drawPanels(ctx, state, w, h) {
  const grade = GRADES.find((g) => g.id === state.grade) ?? GRADES[0];
  const panels = layoutPanelsFor(state.layout, w, h);
  for (let i = 0; i < panels.length; i++) {
    const rect = panels[i];
    const view = state.panels[i] ?? { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const photo = view.photo >= 0 ? state.photos[view.photo] : null;
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const local = { x: 0, y: 0, w: rect.w, h: rect.h };
    ctx.save();
    if (rect.rot) {
      ctx.translate(cx, cy);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
    } else {
      ctx.translate(rect.x, rect.y);
    }
    ctx.beginPath();
    ctx.rect(0, 0, rect.w, rect.h);
    ctx.clip();
    if (photo) {
      drawPanelPhoto(ctx, photo, local, view, grade);
      applyGradeWash(ctx, local, grade);
    } else {
      drawEmptyPanel(ctx, local, i, w);
    }
    ctx.restore();
    // White keyline around the panel, drawn unrotated for the tilted look's snapshot border.
    ctx.save();
    ctx.translate(cx, cy);
    if (rect.rot) ctx.rotate((rect.rot * Math.PI) / 180);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.restore();
  }
}

/** Shrinks the font until the text fits the width, then returns the size used. */
function fitFont(ctx, text, fontFor, maxWidth, startSize) {
  let size = startSize;
  ctx.font = fontFor(size);
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = fontFor(size);
  }
  return size;
}

/** The star badge ribbon: a tilted pink ribbon with stars and the badge words. */
function drawBadgeRibbon(ctx, text, cx, cy, w) {
  if (!text.trim()) return;
  const pad = w * 0.016;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.14);
  ctx.font = `${Math.max(16, w * 0.028)}px "Bebas Neue", sans-serif`;
  const tw = ctx.measureText(`★ ${text.toUpperCase()} ★`).width;
  const bw = tw + pad * 2, bh = w * 0.052;
  ctx.fillStyle = '#ff2d78';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`★ ${text.toUpperCase()} ★`, 0, bh * 0.04);
  ctx.restore();
}

/** The title band: kicker, gradient Anton title, Pacifico subtitle, badge ribbon. */
function drawTitleBlock(ctx, state, w, h) {
  const grade = GRADES.find((g) => g.id === state.grade) ?? GRADES[0];
  const fullbleed = state.layout === 'fullbleed';
  const bandY = fullbleed ? h * 0.68 : h * 0.76;
  const bandH = h - bandY;
  if (fullbleed) {
    const scrim = ctx.createLinearGradient(0, bandY - h * 0.08, 0, h);
    scrim.addColorStop(0, 'rgba(10, 4, 20, 0)');
    scrim.addColorStop(1, 'rgba(10, 4, 20, 0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, bandY - h * 0.08, w, h - bandY + h * 0.08);
  } else {
    ctx.fillStyle = grade.band;
    ctx.fillRect(0, bandY, w, bandH);
    const sheen = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
    sheen.addColorStop(0.25, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, bandY, w, bandH);
  }
  const cx = w / 2;
  const title = (state.title || 'SUNSET STRIP').toUpperCase();
  const subtitle = state.subtitle || '';
  const kicker = state.kicker || '';
  // Three stacked slots inside the band, so the lines can never collide: the kicker sits on
  // its own baseline, the title's cap height ends well below it, the subtitle below the title.
  const kickerBase = bandY + bandH * 0.19;
  const titleBase = bandY + bandH * 0.60;
  const subtitleBase = bandY + bandH * 0.88;
  if (kicker.trim()) {
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const ks = fitFont(ctx, kicker.toUpperCase(), (s) => `${s}px "Bebas Neue", sans-serif`, w * 0.86, bandH * 0.11);
    try { ctx.letterSpacing = `${Math.max(2, ks * 0.22)}px`; } catch { /* older canvas: no letter spacing */ }
    ctx.fillText(kicker.toUpperCase(), cx, kickerBase);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
  const titleSize = fitFont(
    ctx, title, (s) => `${s}px Anton, sans-serif`, w * 0.92, bandH * 0.36,
  );
  const grad = ctx.createLinearGradient(0, titleBase - titleSize, 0, titleBase + titleSize * 0.2);
  grad.addColorStop(0, grade.titleFrom);
  grad.addColorStop(1, grade.titleTo);
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20, 4, 30, 0.9)';
  ctx.lineWidth = Math.max(2, titleSize * 0.07);
  ctx.strokeText(title, cx, titleBase);
  ctx.fillStyle = grad;
  ctx.fillText(title, cx, titleBase);
  if (subtitle.trim()) {
    const subSize = fitFont(
      ctx, subtitle, (s) => `${s}px Pacifico, cursive`, w * 0.8, bandH * 0.15,
    );
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, cx, subtitleBase);
  }
  drawBadgeRibbon(ctx, state.badge || '', w * 0.86, bandY + bandH * 0.14, w);
}

/** Film grain and a soft vignette over the whole cover. */
function drawFilmGrain(ctx, w, h) {
  const tile = grainCanvas();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Draws the full cover onto the canvas at its own pixel size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(0, 0, w, h);
  drawPanels(ctx, state, w, h);
  drawTitleBlock(ctx, state, w, h);
  drawFilmGrain(ctx, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(4, w * 0.008);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** Renders the cover at an exact export size and returns the fresh canvas. */
export function exportCoverCanvas(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas, state);
  return canvas;
}
