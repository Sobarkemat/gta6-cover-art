// Sunset Strip Cover Studio — fixed scenes for screenshots.
// Reads ?shot=<name>&views=<panels> and configures the editor state so a
// headless render captures the same cover every time. `views` is a
// semicolon list, one entry per panel: zoom,ox,oy (e.g. "1.4,0.05,-0.1").

const SCENES = {
  // Wide cover: Hero + 3, Vice Sunset, 1920 x 1080.
  cover: {
    layout: 'hero3',
    grade: 'vice',
    size: { w: 1920, h: 1080 },
    kicker: 'LEONIDA · VICE CITY',
    title: 'SUNSET STRIP',
    subtitle: 'two drifters, one last summer',
    badge: 'EST. 2026',
    chrome: false,
  },
  // Editor at work: Grid 4, Neon Nights, 1920 x 1080, chrome visible.
  editor: {
    layout: 'grid4',
    grade: 'neon',
    size: { w: 1920, h: 1080 },
    kicker: 'VICE CITY · NIGHT DRIVE',
    title: 'NEON HEARTS',
    subtitle: 'the city never sleeps',
    badge: 'EST. 2026',
    chrome: true,
  },
  // Square cover: Grid 4, Golden Hour, 1080 x 1080.
  square: {
    layout: 'grid4',
    grade: 'golden',
    size: { w: 1080, h: 1080 },
    kicker: 'GOLDEN HOUR · LEONIDA',
    title: 'LAST LIGHT',
    subtitle: 'chasing the sun down the strip',
    badge: 'EST. 2026',
    chrome: false,
  },
  // Story cover: Comic 5, Teal Dawn, 1080 x 1350.
  story: {
    layout: 'comic5',
    grade: 'teal',
    size: { w: 1080, h: 1350 },
    kicker: 'A LEONIDA STORY',
    title: 'TIDE & TROUBLE',
    subtitle: 'five panels, one bad idea',
    badge: 'EST. 2026',
    chrome: false,
  },
};

function parseViews(raw) {
  if (!raw) return [];
  return raw.split(';').map((part) => {
    const [zoom, ox, oy] = part.split(',').map(Number);
    return {
      zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
      ox: Number.isFinite(ox) ? ox : 0,
      oy: Number.isFinite(oy) ? oy : 0,
    };
  });
}

export async function applyShot(state, params, hooks) {
  const name = params.get('shot') || 'cover';
  const scene = SCENES[name] || SCENES.cover;
  state.layout = scene.layout;
  state.grade = scene.grade;
  state.size = { ...scene.size };
  state.kicker = scene.kicker;
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.badge = scene.badge;

  const views = parseViews(params.get('views'));
  state.panels.forEach((panel, i) => {
    const view = views[i] || { zoom: 1, ox: 0, oy: 0 };
    panel.zoom = view.zoom;
    panel.ox = view.ox;
    panel.oy = view.oy;
  });

  if (!scene.chrome) document.body.classList.add('shot-mode');

  // Wait until every sample photo has decoded, then render once more.
  hooks.syncControls();
  hooks.render();
  const waited = Date.now();
  while (Date.now() - waited < 5000) {
    const ready = state.panels.every((p) => !p.src || p.img);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  hooks.syncControls();
  hooks.renderSlots();
  hooks.render();
  window.__shotReady = true;
  return scene;
}
