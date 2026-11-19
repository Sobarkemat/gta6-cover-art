// Fixed scenes for screenshots: ?shot=cover draws the cover alone, full frame, at the size the
// query asks for; ?shot=editor shows the whole editor with sample photos loaded.
// Query: layout, grade, size, title, subtitle, kicker, badge, photos (comma sample names),
// w and h (cover pixels, cover scene only). window.__shotReady is set once painted.
import { layoutPanelsFor } from './cover.js';

export async function runShot(shot, query, api) {
  const { state } = api;
  state.layout = query.get('layout') ?? state.layout;
  state.grade = query.get('grade') ?? state.grade;
  state.size = query.get('size') ?? state.size;
  state.title = query.get('title') ?? state.title;
  state.subtitle = query.get('subtitle') ?? state.subtitle;
  state.kicker = query.get('kicker') ?? state.kicker;
  state.badge = query.get('badge') ?? state.badge;

  const names = (query.get('photos') ?? 'boulevard.jpg,pier.jpg').split(',').map((s) => s.trim()).filter(Boolean);
  await api.loadSamples(names);

  // Fill every panel with the loaded samples, round-robin, at a natural zoom.
  const panelCount = layoutPanelsFor(state.layout, 1, 1).length;
  for (let i = 0; i < panelCount; i++) {
    state.panels[i] = { photo: i % names.length, zoom: 1, ox: 0, oy: 0 };
  }

  // Optional per-panel framing: views=0:1,0,0.15;1:1,0,0.5 (panel:zoom,ox,oy), so a shot
  // can keep the faces in frame instead of the cover-fit's centred crop.
  const views = query.get('views');
  if (views) {
    for (const part of views.split(';')) {
      const [index, vals] = part.split(':');
      if (vals === undefined) continue;
      const [zoom, ox, oy] = vals.split(',').map(Number);
      const i = Number(index);
      if (state.panels[i]) {
        state.panels[i] = { ...state.panels[i], zoom: zoom || 1, ox: ox || 0, oy: oy || 0 };
      }
    }
  }

  await Promise.all([
    document.fonts.load('60px Anton'),
    document.fonts.load('60px Pacifico'),
    document.fonts.load('60px "Bebas Neue"'),
  ]).catch(() => {});

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const w = Number(query.get('w') ?? 1280);
    const h = Number(query.get('h') ?? 720);
    const coverCanvas = document.getElementById('cover');
    coverCanvas.width = w;
    coverCanvas.height = h;
    api.redraw();
  } else {
    api.syncControls();
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
