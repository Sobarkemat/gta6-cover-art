// Sunset Strip Cover Studio — cover renderer.
// Draws the multi-panel GTA-style cover onto a canvas: photo panels with a
// colour grade, poster lettering, film grain, a vignette and a white frame.
// No network: every font and photo is a file under app/.

export const LAYOUTS = {
  grid4: 'Grid 4',
  hero3: 'Hero + 3',
  fullbleed: 'Full Bleed',
  triple: 'Triple Strip',
  comic5: 'Comic 5',
  tilted: 'Tilted Snaps',
};

export const GRADES = {
  vice: {
    name: 'Vice Sunset',
    filter: 'saturate(1.45) contrast(1.08) sepia(0.22) hue-rotate(-12deg) brightness(1.02)',
    wash: ['#ff9a3d', '#ff4d6d'],
    washAlpha: 0.16,
  },
  neon: {
    name: 'Neon Nights',
    filter: 'saturate(1.85) contrast(1.16) hue-rotate(18deg) brightness(0.98)',
    wash: ['#ff2ea6', '#22d3ee'],
    washAlpha: 0.18,
  },
  golden: {
    name: 'Golden Hour',
    filter: 'sepia(0.38) saturate(1.5) contrast(1.05) brightness(1.06)',
    wash: ['#ffc46b', '#ff7a18'],
    washAlpha: 0.15,
  },
  teal: {
    name: 'Teal Dawn',
    filter: 'saturate(1.25) contrast(1.1) hue-rotate(-18deg) brightness(1.0)',
    wash: ['#2dd4bf', '#1d4ed8'],
    washAlpha: 0.15,
  },
  candy: {
    name: 'Candy Pop',
    filter: 'saturate(2.0) contrast(1.1) brightness(1.05)',
    wash: ['#ff6ec7', '#ffd166'],
    washAlpha: 0.14,
  },
  mono: {
    name: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.22) brightness(1.02)',
    wash: ['#ffffff', '#94a3b8'],
    washAlpha: 0.08,
  },
};

export const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];

// Panel rectangles as fractions of the panel area (x, y, w, h, rotation deg).
function panelRects(layout, areaW, areaH) {
  const g = Math.max(4, Math.round(Math.min(areaW, areaH) * 0.012));
  const third = (areaW - 2 * g) / 3;
  const half = (areaW - g) / 2;
  const halfH = (areaH - g) / 2;
  switch (layout) {
    case 'fullbleed':
      return [{ x: 0, y: 0, w: areaW, h: areaH, rot: 0 }];
    case 'triple':
      return [0, 1, 2].map((i) => ({ x: i * (third + g), y: 0, w: third, h: areaH, rot: 0 }));
    case 'comic5': {
      const topH = areaH * 0.46;
      const botH = areaH - topH - g;
      const botW = (areaW - 2 * g) / 3;
      return [
        { x: 0, y: 0, w: half, h: topH, rot: 0 },
        { x: half + g, y: 0, w: half, h: topH, rot: 0 },
        { x: 0, y: topH + g, w: botW, h: botH, rot: 0 },
        { x: botW + g, y: topH + g, w: botW, h: botH, rot: 0 },
        { x: 2 * (botW + g), y: topH + g, w: botW, h: botH, rot: 0 },
      ];
    }
    case 'tilted': {
      const inset = Math.round(Math.min(areaW, areaH) * 0.045);
      const w = (areaW - 2 * inset - g) / 2;
      const h = (areaH - 2 * inset - g) / 2;
      return [
        { x: inset, y: inset, w, h, rot: -3 },
        { x: inset + w + g, y: inset + 6, w, h, rot: 2.5 },
        { x: inset + 2, y: inset + h + g, w, h, rot: -2 },
        { x: inset + w + g, y: inset + h + g - 4, w, h, rot: 3 },
      ];
    }
    case 'grid4':
    default: {
      const colW = (areaW - g) / 2;
      const rowH = (areaH - g) / 2;
      return [
        { x: 0, y: 0, w: colW, h: rowH, rot: 0 },
        { x: colW + g, y: 0, w: colW, h: rowH, rot: 0 },
        { x: 0, y: rowH + g, w: colW, h: rowH, rot: 0 },
        { x: colW + g, y: rowH + g, w: colW, h: rowH, rot: 0 },
      ];
    }
  }
}

// The hero3 right column: three stacked panels sharing the column height.
function hero3Rects(areaW, areaH) {
  const g = Math.max(4, Math.round(Math.min(areaW, areaH) * 0.012));
  const leftW = areaW * 0.62 - g / 2;
  const rightX = areaW * 0.62 + g / 2;
  const rightW = areaW * 0.38 - g / 2;
  const cellH = (areaH - 2 * g) / 3;
  return [
    { x: 0, y: 0, w: leftW, h: areaH, rot: 0 },
    { x: rightX, y: 0, w: rightW, h: cellH, rot: 0 },
    { x: rightX, y: cellH + g, w: rightW, h: cellH, rot: 0 },
    { x: rightX, y: 2 * (cellH + g), w: rightW, h: cellH, rot: 0 },
  ];
}

export function panelsFor(layout, areaW, areaH) {
  if (layout === 'hero3') return hero3Rects(areaW, areaH);
  return panelRects(layout, areaW, areaH);
}

// Deterministic grain: a seeded PRNG paints one small noise tile, reused
// across renders so the same cover always looks the same.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const size = 160;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(size, size);
  const rand = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

function drawPhoto(ctx, img, rect, panel, grade) {
  const { x, y, w, h, rot } = rect;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rot) ctx.rotate((rot * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  if (img && img.naturalWidth > 0) {
    const zoom = panel.zoom || 1;
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * base;
    const dh = img.naturalHeight * base;
    const dx = (w - dw) / 2 + (panel.ox || 0) * w;
    const dy = (h - dh) / 2 + (panel.oy || 0) * h;
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
    const wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, grade.wash[0]);
    wash.addColorStop(1, grade.wash[1]);
    ctx.globalAlpha = grade.washAlpha;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  } else {
    const ph = ctx.createLinearGradient(0, 0, w, h);
    ph.addColorStop(0, '#3a2a33');
    ph.addColorStop(1, '#1c1418');
    ctx.fillStyle = ph;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(244, 237, 227, 0.55)';
    ctx.font = `${Math.max(14, Math.round(h * 0.07))}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ LOAD A PHOTO', w / 2, h / 2);
  }
  ctx.restore();
}

function drawPanelFrame(ctx, rect) {
  const { x, y, w, h, rot } = rect;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rot) ctx.rotate((rot * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.012));
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight || ''} ${px}px ${family}`.trim();
    if (ctx.measureText(text).width <= maxWidth) return px;
    px -= 2;
  }
  return px;
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawTitleBand(ctx, W, H, bandY, bandH, state) {
  const grad = ctx.createLinearGradient(0, bandY, 0, H);
  grad.addColorStop(0, 'rgba(12, 7, 14, 0.55)');
  grad.addColorStop(0.35, 'rgba(12, 7, 14, 0.92)');
  grad.addColorStop(1, 'rgba(8, 4, 10, 0.97)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, bandY, W, bandH);

  const padX = W * 0.045;
  const textW = W - padX * 2;
  let cy = bandY + bandH * 0.2;

  // Kicker.
  const kicker = (state.kicker || '').toUpperCase();
  if (kicker) {
    const kPx = Math.max(12, Math.round(H * 0.026));
    ctx.font = `${kPx}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, Math.round(kPx * 0.18))}px`; } catch (e) { /* older canvas */ }
    ctx.fillStyle = '#ffb347';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(kicker, padX, cy);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
    cy += kPx * 1.15;
  }

  // Title with a sunset gradient fill.
  const title = (state.title || '').toUpperCase();
  if (title) {
    const tPx = fitFont(ctx, title, textW, Math.round(H * 0.115), 'Anton', '');
    const tg = ctx.createLinearGradient(padX, 0, padX + ctx.measureText(title).width, 0);
    tg.addColorStop(0, '#ffd166');
    tg.addColorStop(0.45, '#ff9a3d');
    tg.addColorStop(0.75, '#ff4d6d');
    tg.addColorStop(1, '#c77dff');
    ctx.font = `${tPx}px Anton, sans-serif`;
    ctx.fillStyle = tg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, padX, cy + tPx * 0.82);
    cy += tPx * 1.02;
  }

  // Subtitle in script.
  const subtitle = state.subtitle || '';
  if (subtitle) {
    const sPx = Math.max(13, Math.round(H * 0.034));
    ctx.font = `${sPx}px Pacifico, cursive`;
    ctx.fillStyle = '#f4ede3';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(subtitle, padX, cy + sPx * 0.9);
  }

  // Tilted star badge, top-right of the band: a star left of a pill.
  const badge = (state.badge || '').toUpperCase();
  if (badge) {
    const bPx = Math.max(11, Math.round(H * 0.02));
    const starR = Math.max(7, H * 0.012);
    const cx = W - padX - W * 0.02;
    const cy = bandY + bandH * 0.26;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.1);
    ctx.font = `${bPx}px "Bebas Neue", sans-serif`;
    const bw = ctx.measureText(badge).width + bPx * 1.6;
    const bh = bPx * 2.1;
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, 0, 1);
    ctx.restore();
    drawStar(ctx, cx - bw / 2 - starR - 4, cy, starR, '#ffd166');
  }
}

function drawGrainAndVignette(ctx, W, H) {
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vg = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// Renders the cover described by `state` onto `canvas` (resized to w/h).
// state: { layout, grade, w, h, panels: [{img, zoom, ox, oy}], kicker, title, subtitle, badge }
export function renderCover(canvas, state) {
  const W = state.w;
  const H = state.h;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.vice;
  const layout = LAYOUTS[state.layout] ? state.layout : 'grid4';

  ctx.fillStyle = '#0c0908';
  ctx.fillRect(0, 0, W, H);

  const bandH = Math.round(H * 0.24);
  const areaH = layout === 'fullbleed' ? H : H - bandH;
  const rects = panelsFor(layout, W, areaH);
  const panels = state.panels || [];

  rects.forEach((rect, i) => {
    drawPhoto(ctx, panels[i] ? panels[i].img : null, rect, panels[i] || {}, grade);
  });
  if (layout !== 'fullbleed') {
    rects.forEach((rect) => drawPanelFrame(ctx, rect));
  }

  drawTitleBand(ctx, W, H, H - bandH, bandH, state);
  drawGrainAndVignette(ctx, W, H);

  // Outer white frame.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = Math.max(3, Math.round(Math.min(W, H) * 0.008));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  return canvas;
}

// Which panel (index) covers point (x, y) in cover coordinates, or -1.
export function panelAt(layout, areaW, areaH, x, y) {
  const rects = panelsFor(layout, areaW, areaH);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}
