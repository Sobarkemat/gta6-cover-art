// Sunset Strip Cover Studio — the cover engine.
// Draws a multi-panel GTA-style poster cover onto any canvas: panel layouts, Vice City / neon colour
// grades, bold Anton lettering with a Pacifico script subtitle, grain and vignette. All drawing is local;
// the photos never leave the machine. No Rockstar artwork, logo or font is used anywhere here.

export const LAYOUTS = {
  grid4: { label: 'Grid 4', panels: 4 },
  hero3: { label: 'Hero + 3', panels: 4 },
  fullbleed: { label: 'Full Bleed', panels: 1 },
  strips3: { label: 'Triple Strip', panels: 3 },
  comic5: { label: 'Comic 5', panels: 4 },
  tilt: { label: 'Tilted Snaps', panels: 3 },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    washTop: 'rgba(255, 170, 60, 0.20)', washBottom: 'rgba(255, 45, 120, 0.42)',
    glow: 'rgba(255, 120, 40, 0.55)', title: ['#ffd76a', '#ff5e3a', '#ff2e88'],
    sub: '#ffe9a8', filter: 'saturate(1.25) contrast(1.08)',
  },
  neon: {
    label: 'Neon Nights',
    washTop: 'rgba(0, 229, 255, 0.22)', washBottom: 'rgba(255, 0, 170, 0.45)',
    glow: 'rgba(0, 229, 255, 0.6)', title: ['#7df9ff', '#ff5ce1', '#b967ff'],
    sub: '#8ef6ff', filter: 'saturate(1.45) contrast(1.12)',
  },
  gold: {
    label: 'Golden Hour',
    washTop: 'rgba(255, 210, 90, 0.28)', washBottom: 'rgba(190, 90, 0, 0.38)',
    glow: 'rgba(255, 190, 60, 0.5)', title: ['#fff3b0', '#ffb703', '#fb8500'],
    sub: '#fff0c0', filter: 'saturate(1.2) contrast(1.05) brightness(1.04)',
  },
  teal: {
    label: 'Teal Dawn',
    washTop: 'rgba(64, 224, 208, 0.22)', washBottom: 'rgba(10, 40, 120, 0.5)',
    glow: 'rgba(64, 224, 208, 0.55)', title: ['#a7fff0', '#2ec4b6', '#4361ee'],
    sub: '#b8fff2', filter: 'saturate(1.2) contrast(1.08)',
  },
  candy: {
    label: 'Candy Pop',
    washTop: 'rgba(255, 110, 199, 0.26)', washBottom: 'rgba(120, 40, 220, 0.48)',
    glow: 'rgba(255, 110, 199, 0.55)', title: ['#ffd6f5', '#ff6ec7', '#8338ec'],
    sub: '#ffd6f5', filter: 'saturate(1.5) contrast(1.1)',
  },
  noir: {
    label: 'Mono Noir',
    washTop: 'rgba(255, 255, 255, 0.10)', washBottom: 'rgba(0, 0, 0, 0.5)',
    glow: 'rgba(255, 255, 255, 0.4)', title: ['#ffffff', '#d8d8d8', '#8a8a8a'],
    sub: '#f0f0f0', filter: 'grayscale(1) contrast(1.18) brightness(1.06)',
  },
};

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

/** A fresh, empty cover state. Panels hold a photo slot (0-3), a zoom and a centre point. */
export function defaultState() {
  return {
    title: 'NEON SHORE',
    subtitle: 'a sunset strip story',
    badge: 'EST. 2026',
    layout: 'hero3',
    grade: 'sunset',
    size: 'wide',
    grain: true,
    vignette: true,
    frame: true,
    titleStyle: 'gradient',
    photos: [null, null, null, null],
    panels: [
      { photo: 0, zoom: 1.15, cx: 0.5, cy: 0.45 },
      { photo: 1, zoom: 1.15, cx: 0.5, cy: 0.32 },
      { photo: 0, zoom: 1.25, cx: 0.5, cy: 0.5 },
      { photo: 1, zoom: 1.15, cx: 0.5, cy: 0.32 },
    ],
  };
}

/** Panel rectangles (pixels, plus an optional rotation in degrees) for a layout at W x H. */
export function layoutPanels(name, W, H) {
  const m = Math.round(Math.min(W, H) * 0.022);
  const g = Math.round(Math.min(W, H) * 0.014);
  const x0 = m, y0 = m, x1 = W - m, y1 = H - m;
  const cw = x1 - x0, ch = y1 - y0;
  const box = (x, y, w, h, rot = 0) => ({ x, y, w, h, rot });
  switch (name) {
    case 'grid4': {
      const pw = (cw - g) / 2, ph = (ch - g) / 2;
      return [
        box(x0, y0, pw, ph), box(x0 + pw + g, y0, pw, ph),
        box(x0, y0 + ph + g, pw, ph), box(x0 + pw + g, y0 + ph + g, pw, ph),
      ];
    }
    case 'hero3': {
      if (W >= H) {
        const hw = cw * 0.6, sw = cw - hw - g, sh = (ch - 2 * g) / 3;
        return [
          box(x0, y0, hw, ch),
          box(x0 + hw + g, y0, sw, sh),
          box(x0 + hw + g, y0 + sh + g, sw, sh),
          box(x0 + hw + g, y0 + 2 * (sh + g), sw, sh),
        ];
      }
      const hh = ch * 0.58, sw = (cw - 2 * g) / 3, sy = y0 + hh + g, sh = ch - hh - g;
      return [
        box(x0, y0, cw, hh),
        box(x0, sy, sw, sh), box(x0 + sw + g, sy, sw, sh), box(x0 + 2 * (sw + g), sy, sw, sh),
      ];
    }
    case 'fullbleed':
      return [box(0, 0, W, H)];
    case 'strips3': {
      const pw = (cw - 2 * g) / 3;
      return [0, 1, 2].map((i) => box(x0 + i * (pw + g), y0, pw, ch));
    }
    case 'comic5': {
      const hh = ch * 0.52, sw = (cw - 2 * g) / 3, sy = y0 + hh + g, sh = ch - hh - g;
      return [
        box(x0, y0, cw, hh),
        box(x0, sy, sw, sh), box(x0 + sw + g, sy, sw, sh), box(x0 + 2 * (sw + g), sy, sw, sh),
      ];
    }
    case 'tilt': {
      const pw = cw * 0.42, ph = ch * 0.62, cy = y0 + ch * 0.16;
      return [
        box(x0 + cw * 0.02, cy, pw, ph, -6),
        box(x0 + cw * 0.29, cy + ch * 0.05, pw, ph, 2),
        box(x0 + cw * 0.56, cy, pw, ph, 6),
      ];
    }
    default:
      return layoutPanels('grid4', W, H);
  }
}

/** Draws one photo cover-fit inside rect, honouring zoom and the centre point (0..1).
    The centre is clamped so the photo always covers the whole panel (no backdrop gaps). */
export function drawPhotoCover(ctx, img, rect, zoom, cx, cy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const pw = iw * scale, ph = ih * scale;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const dx = clamp(rect.x + rect.w / 2 - pw * cx, rect.x + rect.w - pw, rect.x);
  const dy = clamp(rect.y + rect.h / 2 - ph * cy, rect.y + rect.h - ph, rect.y);
  ctx.drawImage(img, dx, dy, pw, ph);
}

/** A seeded film-grain tile, generated once and reused. */
let grainTile = null;
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function getGrainTile() {
  if (grainTile) return grainTile;
  const s = 140, c = document.createElement('canvas');
  c.width = s; c.height = s;
  const g = c.getContext('2d');
  const img = g.createImageData(s, s);
  const rnd = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/** Shrinks the font until the text fits maxWidth; returns the fitted size in px. */
export function fitFont(ctx, text, family, weight, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= Math.max(1, Math.round(size * 0.04));
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** The title block: scrim, big gradient Anton title, Pacifico subtitle, badge ribbon. */
export function drawTitleBlock(ctx, state, W, H) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const bandH = H * 0.235;
  const bandY = H - bandH;
  const scrim = ctx.createLinearGradient(0, bandY - H * 0.06, 0, H);
  scrim.addColorStop(0, 'rgba(10, 4, 24, 0)');
  scrim.addColorStop(0.45, 'rgba(10, 4, 24, 0.55)');
  scrim.addColorStop(1, 'rgba(10, 4, 24, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - H * 0.06, W, bandH + H * 0.06);

  const title = (state.title || 'UNTITLED').toUpperCase();
  const maxW = W * 0.92;
  const titleSize = fitFont(ctx, title, 'Anton, "Arial Narrow", sans-serif', 400, H * 0.115, maxW);
  const tx = W / 2, ty = H - H * 0.085;
  ctx.save();
  ctx.translate(tx, ty);
  ctx.transform(1, 0, -0.06, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const grad = ctx.createLinearGradient(-maxW / 2, 0, maxW / 2, 0);
  const cols = state.titleStyle === 'white' ? ['#ffffff', '#ffffff', '#ffe9f2'] : grade.title;
  grad.addColorStop(0, cols[0]); grad.addColorStop(0.5, cols[1]); grad.addColorStop(1, cols[2]);
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = titleSize * 0.28;
  ctx.strokeStyle = 'rgba(8, 2, 18, 0.9)';
  ctx.lineWidth = Math.max(2, titleSize * 0.07);
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  const sub = (state.subtitle || '').trim();
  if (sub) {
    const subSize = fitFont(ctx, sub, 'Pacifico, cursive', 400, H * 0.042, maxW);
    ctx.save();
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.sub;
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = subSize * 0.6;
    ctx.fillText(sub, W / 2, H - H * 0.028);
    ctx.restore();
  }

  // Badge ribbon, top-left: five stars and the badge text in Bebas Neue.
  const badge = (state.badge || '').trim();
  if (badge) {
    const pad = Math.max(10, W * 0.012);
    const fs = Math.max(13, Math.round(H * 0.021));
    ctx.save();
    ctx.font = `${fs}px "Bebas Neue", sans-serif`;
    const tw = ctx.measureText(`★★★★★  ${badge.toUpperCase()}`).width;
    const bw = tw + pad * 2.4, bh = fs * 2.1;
    ctx.translate(pad * 1.4, pad * 1.4);
    ctx.rotate(-0.03);
    ctx.fillStyle = 'rgba(12, 4, 28, 0.82)';
    ctx.fillRect(0, 0, bw, bh);
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = Math.max(1.5, fs * 0.08);
    ctx.strokeRect(0, 0, bw, bh);
    ctx.fillStyle = '#ffd76a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`★★★★★  ${badge.toUpperCase()}`, pad * 1.2, bh / 2 + 1);
    ctx.restore();
  }

  // Small kicker line, top-right.
  const kick = 'SUNSET STRIP • PRESENTS';
  const kfs = Math.max(11, Math.round(H * 0.016));
  ctx.save();
  ctx.font = `${kfs}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText(kick, W - Math.max(18, W * 0.03), Math.max(16, H * 0.028) + kfs / 2);
  ctx.restore();
}

/** Draws the whole cover onto `canvas` (any pixel size) from the state. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;

  // Backdrop: deep dusk purple, so empty panels still read as poster art.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1b0f2e');
  bg.addColorStop(0.55, '#3d1150');
  bg.addColorStop(1, '#12081f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const rects = layoutPanels(state.layout, W, H);
  const count = LAYOUTS[state.layout]?.panels ?? 4;
  const borderW = Math.max(3, Math.round(Math.min(W, H) * 0.006));

  for (let i = 0; i < count; i++) {
    const r = rects[i];
    const p = state.panels[i] || { photo: 0, zoom: 1.15, cx: 0.5, cy: 0.5 };
    const img = state.photos[p.photo];
    ctx.save();
    if (r.rot) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate((r.rot * Math.PI) / 180);
      ctx.translate(-r.w / 2, -r.h / 2);
    } else {
      ctx.translate(r.x, r.y);
    }
    ctx.beginPath();
    ctx.rect(0, 0, r.w, r.h);
    ctx.clip();
    if (img) {
      ctx.filter = grade.filter;
      drawPhotoCover(ctx, img, { x: 0, y: 0, w: r.w, h: r.h }, p.zoom, p.cx, p.cy);
      ctx.filter = 'none';
    } else {
      const ph = ctx.createLinearGradient(0, 0, r.w, r.h);
      ph.addColorStop(0, '#ff7a3d');
      ph.addColorStop(0.5, '#e83e8c');
      ph.addColorStop(1, '#6a1fb5');
      ctx.fillStyle = ph;
      ctx.fillRect(0, 0, r.w, r.h);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.round(r.h * 0.09)}px "Bebas Neue", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', r.w / 2, r.h / 2);
    }
    // Grade wash inside the panel.
    const wash = ctx.createLinearGradient(0, 0, 0, r.h);
    wash.addColorStop(0, grade.washTop);
    wash.addColorStop(1, grade.washBottom);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, r.w, r.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // White panel border (drawn unrotated around the rotated rect's frame).
    ctx.save();
    if (r.rot) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate((r.rot * Math.PI) / 180);
      ctx.translate(-r.w / 2, -r.h / 2);
    } else {
      ctx.translate(r.x, r.y);
    }
    ctx.strokeStyle = state.frame === false ? 'rgba(255,255,255,0.25)' : '#ffffff';
    ctx.lineWidth = borderW;
    ctx.strokeRect(0, 0, r.w, r.h);
    ctx.restore();
  }

  // Outer frame.
  if (state.frame !== false) {
    ctx.strokeStyle = '#0c0618';
    ctx.lineWidth = Math.max(4, Math.round(Math.min(W, H) * 0.012));
    ctx.strokeRect(0, 0, W, H);
  }

  drawTitleBlock(ctx, state, W, H);

  // Film grain, tiled.
  if (state.grain) {
    const tile = getGrainTile();
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Vignette.
  if (state.vignette) {
    const vg = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(5,0,15,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Renders an export-size canvas for the given size key. Returns the canvas. */
export function renderExport(state, sizeKey) {
  const size = SIZES[sizeKey] || SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
  return canvas;
}
