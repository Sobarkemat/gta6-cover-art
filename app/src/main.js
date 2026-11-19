// Sunset Strip Cover Studio — editor.
// Wires the UI to the cover renderer: photo slots, layout and grade picks,
// caption text, per-panel pan/zoom, undo/redo and PNG export. All offline.

import { renderCover, panelsFor, GRADES, EXPORT_SIZES, panelAt } from './cover.js';
import { applyShot } from './shots.js';

const SAMPLE_PHOTOS = ['samples/boulevard.jpg', 'samples/pier.jpg'];

const canvas = document.getElementById('coverCanvas');
const slotsEl = document.getElementById('slots');
const layoutSel = document.getElementById('layoutSel');
const gradeSel = document.getElementById('gradeSel');
const gradeSwatches = document.getElementById('gradeSwatches');
const kickerInput = document.getElementById('kickerInput');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const badgeInput = document.getElementById('badgeInput');
const zoomSlider = document.getElementById('zoomSlider');
const zoomRead = document.getElementById('zoomRead');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

const state = {
  layout: 'hero3',
  grade: 'vice',
  size: { w: 1920, h: 1080 },
  kicker: 'LEONIDA · VICE CITY',
  title: 'SUNSET STRIP',
  subtitle: 'two drifters, one last summer',
  badge: 'EST. 2026',
  panels: [
    { img: null, src: '', zoom: 1, ox: 0, oy: 0 },
    { img: null, src: '', zoom: 1, ox: 0, oy: 0 },
    { img: null, src: '', zoom: 1, ox: 0, oy: 0 },
    { img: null, src: '', zoom: 1, ox: 0, oy: 0 },
    // Comic 5's fifth panel mirrors slot 1's photo, with its own framing.
    { img: null, src: '', zoom: 1, ox: 0, oy: 0, mirror: true },
  ],
};

let selected = 0;
let undoStack = [];
let redoStack = [];

function snapshot() {
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    size: state.size,
    kicker: state.kicker,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    panels: state.panels.map((p) => ({ src: p.src, zoom: p.zoom, ox: p.ox, oy: p.oy })),
  });
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  refreshUndoButtons();
}

function restore(json) {
  const data = JSON.parse(json);
  state.layout = data.layout;
  state.grade = data.grade;
  state.size = data.size;
  state.kicker = data.kicker;
  state.title = data.title;
  state.subtitle = data.subtitle;
  state.badge = data.badge;
  data.panels.forEach((p, i) => {
    state.panels[i].zoom = p.zoom;
    state.panels[i].ox = p.ox;
    state.panels[i].oy = p.oy;
    if (p.src !== state.panels[i].src) {
      state.panels[i].src = p.src;
      state.panels[i].img = null;
      if (p.src) loadImageInto(i, p.src);
    }
  });
  syncControls();
  render();
}

function refreshUndoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoStack.length === 0 ? (redoBtn.disabled = true) : (redoBtn.disabled = false);
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  refreshUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  refreshUndoButtons();
}

function loadImageInto(index, src) {
  const img = new Image();
  img.onload = () => {
    state.panels[index].img = img;
    // The mirror panel follows slot 1's photo.
    if (index === 0) {
      state.panels[4].img = img;
      state.panels[4].src = src;
    }
    render();
    renderSlots();
  };
  img.onerror = () => {
    state.panels[index].img = null;
    state.panels[index].src = '';
    if (index === 0) {
      state.panels[4].img = null;
      state.panels[4].src = '';
    }
    renderSlots();
  };
  img.src = src;
}

function render() {
  renderCover(canvas, {
    layout: state.layout,
    grade: state.grade,
    w: state.size.w,
    h: state.size.h,
    panels: state.panels,
    kicker: state.kicker,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
  });
}

function renderSlots() {
  slotsEl.innerHTML = '';
  state.panels.slice(0, 4).forEach((panel, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot' + (panel.img ? '' : ' is-empty') + ((i === selected || (selected === 4 && i === 0)) ? ' is-selected' : '');
    slot.title = `Photo slot ${i + 1} — click to select, then choose a file`;
    if (panel.img) {
      const thumb = document.createElement('img');
      thumb.src = panel.src;
      thumb.alt = `Photo ${i + 1}`;
      slot.appendChild(thumb);
      const name = document.createElement('span');
      name.className = 'slot-name';
      name.textContent = panel.src.split('/').pop().split('?')[0] || `Photo ${i + 1}`;
      slot.appendChild(name);
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'slot-clear';
      clear.textContent = '×';
      clear.title = 'Remove this photo';
      clear.addEventListener('click', (ev) => {
        ev.stopPropagation();
        pushUndo();
        state.panels[i].img = null;
        state.panels[i].src = '';
        state.panels[i].zoom = 1;
        state.panels[i].ox = 0;
        state.panels[i].oy = 0;
        if (i === 0) {
          state.panels[4].img = null;
          state.panels[4].src = '';
        }
        render();
        renderSlots();
      });
      slot.appendChild(clear);
    } else {
      slot.innerHTML = `<span>+ Photo ${i + 1}</span><span>click to load</span>`;
    }
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        pushUndo();
        selected = i;
        state.panels[i].src = String(reader.result);
        loadImageInto(i, String(reader.result));
        syncZoom();
        renderSlots();
      };
      reader.readAsDataURL(f);
    });
    slot.appendChild(file);
    slot.addEventListener('click', () => {
      selected = i;
      syncZoom();
      renderSlots();
    });
    slotsEl.appendChild(slot);
  });
}

function syncZoom() {
  const z = Math.round((state.panels[selected].zoom || 1) * 100);
  zoomSlider.value = String(z);
  zoomRead.textContent = `${z}%`;
}

function syncControls() {
  layoutSel.value = state.layout;
  gradeSel.value = state.grade;
  kickerInput.value = state.kicker;
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  badgeInput.value = state.badge;
  document.querySelectorAll('.size-btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.size === `${state.size.w}x${state.size.h}`);
  });
  document.querySelectorAll('.swatch').forEach((s) => {
    s.classList.toggle('is-active', s.dataset.grade === state.grade);
  });
  syncZoom();
}

function buildSwatches() {
  Object.entries(GRADES).forEach(([key, g]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (key === state.grade ? ' is-active' : '');
    b.dataset.grade = key;
    b.title = g.name;
    b.style.background = `linear-gradient(135deg, ${g.wash[0]}, ${g.wash[1]})`;
    b.addEventListener('click', () => {
      if (state.grade === key) return;
      pushUndo();
      state.grade = key;
      syncControls();
      render();
    });
    gradeSwatches.appendChild(b);
  });
}

// Pan and zoom the selected panel directly on the canvas.
let dragging = null;
function canvasPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * state.size.w;
  const y = ((ev.clientY - rect.top) / rect.height) * state.size.h;
  return { x, y };
}
function bandHeight() {
  return state.layout === 'fullbleed' ? 0 : Math.round(state.size.h * 0.24);
}
canvas.addEventListener('pointerdown', (ev) => {
  const { x, y } = canvasPoint(ev);
  const areaH = state.size.h - bandHeight();
  const idx = panelAt(state.layout, state.size.w, areaH, x, y);
  if (idx < 0 || idx >= state.panels.length) return;
  selected = idx;
  syncZoom();
  renderSlots();
  dragging = { idx, startX: x, startY: y, ox: state.panels[idx].ox, oy: state.panels[idx].oy, moved: false };
  canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener('pointermove', (ev) => {
  if (!dragging) return;
  const { x, y } = canvasPoint(ev);
  const dx = (x - dragging.startX) / state.size.w;
  const dy = (y - dragging.startY) / state.size.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) dragging.moved = true;
  const p = state.panels[dragging.idx];
  // Clamp the pan so the photo still covers its panel: the limit follows
  // the photo's scaled size, so a face at the top of a tall photo in a
  // short panel stays reachable.
  let maxOx = 0.6;
  let maxOy = 0.6;
  const img = p.img;
  if (img && img.naturalWidth > 0) {
    const rects = panelsFor(state.layout, state.size.w, state.size.h - bandHeight());
    const r = rects[dragging.idx];
    if (r) {
      const base = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * (p.zoom || 1);
      maxOx = Math.max(0, (img.naturalWidth * base - r.w) / (2 * r.w));
      maxOy = Math.max(0, (img.naturalHeight * base - r.h) / (2 * r.h));
    }
  }
  p.ox = Math.max(-maxOx, Math.min(maxOx, dragging.ox + dx));
  p.oy = Math.max(-maxOy, Math.min(maxOy, dragging.oy + dy));
  render();
});
canvas.addEventListener('pointerup', () => {
  if (dragging && dragging.moved) pushUndo();
  dragging = null;
});
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const p = state.panels[selected];
  if (!p.img) return;
  const factor = ev.deltaY < 0 ? 1.08 : 1 / 1.08;
  pushUndo();
  p.zoom = Math.max(1, Math.min(3, (p.zoom || 1) * factor));
  syncZoom();
  render();
}, { passive: false });

zoomSlider.addEventListener('input', () => {
  const p = state.panels[selected];
  p.zoom = Number(zoomSlider.value) / 100;
  zoomRead.textContent = `${zoomSlider.value}%`;
  render();
});
zoomSlider.addEventListener('change', () => pushUndo());

document.getElementById('fitBtn').addEventListener('click', () => {
  pushUndo();
  const p = state.panels[selected];
  p.zoom = 1;
  p.ox = 0;
  p.oy = 0;
  syncZoom();
  render();
});

document.getElementById('fillAllBtn').addEventListener('click', () => {
  const first = state.panels.find((p) => p.img);
  if (!first) return;
  pushUndo();
  state.panels.forEach((p) => {
    p.src = first.src;
    p.img = first.img;
    p.zoom = 1;
    p.ox = 0;
    p.oy = 0;
  });
  render();
  renderSlots();
});

document.getElementById('resetBtn').addEventListener('click', () => {
  pushUndo();
  loadSamples();
});

layoutSel.addEventListener('change', () => {
  pushUndo();
  state.layout = layoutSel.value;
  render();
});
gradeSel.addEventListener('change', () => {
  pushUndo();
  state.grade = gradeSel.value;
  syncControls();
  render();
});

function bindText(input, key) {
  let timer = null;
  input.addEventListener('input', () => {
    state[key] = input.value;
    render();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => pushUndo(), 600);
  });
}
bindText(kickerInput, 'kicker');
bindText(titleInput, 'title');
bindText(subtitleInput, 'subtitle');
bindText(badgeInput, 'badge');

document.querySelectorAll('.size-btn').forEach((b) => {
  b.addEventListener('click', () => {
    const [w, h] = b.dataset.size.split('x').map(Number);
    if (state.size.w === w && state.size.h === h) return;
    pushUndo();
    state.size = { w, h };
    syncControls();
    render();
  });
});

function downloadPNG(w, h) {
  const off = document.createElement('canvas');
  renderCover(off, {
    layout: state.layout,
    grade: state.grade,
    w,
    h,
    panels: state.panels,
    kicker: state.kicker,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
  });
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sunset-strip-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

document.getElementById('exportBtn').addEventListener('click', () => {
  downloadPNG(state.size.w, state.size.h);
});
document.getElementById('exportAllBtn').addEventListener('click', () => {
  EXPORT_SIZES.forEach((s, i) => {
    setTimeout(() => downloadPNG(s.w, s.h), i * 400);
  });
});

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
document.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) {
    ev.preventDefault();
    undo();
  } else if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) {
    ev.preventDefault();
    redo();
  }
});

function loadSamples() {
  state.panels[0].src = SAMPLE_PHOTOS[0];
  state.panels[1].src = SAMPLE_PHOTOS[1];
  state.panels[2].src = SAMPLE_PHOTOS[0];
  state.panels[3].src = SAMPLE_PHOTOS[1];
  state.panels[4].src = SAMPLE_PHOTOS[0];
  state.panels.forEach((p, i) => {
    p.zoom = 1;
    p.ox = 0;
    p.oy = 0;
    loadImageInto(i, p.src);
  });
  renderSlots();
}

// Boot: wait for the poster fonts, load the samples, apply a ?shot= scene.
async function boot() {
  buildSwatches();
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('20px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch (e) {
    // Fall back to system fonts if a poster font fails to load.
  }
  loadSamples();
  const params = new URLSearchParams(window.location.search);
  if (params.has('shot')) {
    await applyShot(state, params, { render, syncControls, renderSlots, loadImageInto });
  }
  syncControls();
  render();
  refreshUndoButtons();
  window.__coverReady = true;
}

boot();
