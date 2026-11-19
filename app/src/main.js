// Sunset Strip Cover Studio — wires the editor: photos, layouts, grades, panel drag/zoom,
// undo/redo, live preview and PNG export. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js). Photos are read on this machine and never uploaded.
import { LAYOUTS, GRADES, SIZES, defaultState, layoutPanels, drawCover, renderExport } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

const state = defaultState();
let selectedPanel = 0;
const undoStack = [];
const redoStack = [];
let redrawQueued = false;

const SAMPLES = ['samples/boulevard.jpg', 'samples/pier.jpg'];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads the bundled fonts, then paints; canvas lettering needs the real fonts. */
async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('20px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fallbacks in the font stacks still paint.
  }
}

function snapshot() {
  const { photos, ...rest } = state;
  return JSON.stringify(rest);
}
function restore(json) {
  const data = JSON.parse(json);
  const photos = state.photos;
  Object.assign(state, data);
  state.photos = photos;
}
function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}
function syncUndoButtons() {
  $('undo').disabled = undoStack.length === 0;
  $('redo').disabled = redoStack.length === 0;
}

function queueRedraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    drawCover(canvas, state);
    syncPreviewMeta();
  });
}
function redrawNow() {
  drawCover(canvas, state);
  syncPreviewMeta();
}

function syncPreviewMeta() {
  const size = SIZES[state.size];
  $('previewMeta').textContent =
    `${size.label} · ${LAYOUTS[state.layout].label} · ${GRADES[state.grade].label}`;
}

/** Rebuilds the photo slot thumbnails. */
function renderPhotoSlots() {
  const wrap = $('photoSlots');
  wrap.innerHTML = '';
  state.photos.forEach((img, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'photo-slot' + (img ? '' : ' empty');
    b.title = img ? `Photo ${i + 1} — click to use in the selected panel` : `Photo ${i + 1} — empty`;
    if (img) b.style.backgroundImage = `url(${img.src})`;
    b.innerHTML = `<span class="num">${i + 1}</span>` + (img ? '<span class="rm" title="Remove photo">×</span>' : '');
    b.addEventListener('click', (e) => {
      if (e.target.classList.contains('rm')) {
        pushUndo();
        state.photos[i] = null;
        renderPhotoSlots();
        queueRedraw();
        return;
      }
      pushUndo();
      state.panels[selectedPanel].photo = i;
      syncPanelEditor();
      queueRedraw();
    });
    wrap.appendChild(b);
  });
}

/** Rebuilds the layout and grade picker buttons. */
function renderPickers() {
  const lg = $('layoutGrid');
  lg.innerHTML = '';
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'layout-btn' + (state.layout === key ? ' active' : '');
    b.textContent = def.label;
    b.addEventListener('click', () => {
      if (state.layout === key) return;
      pushUndo();
      state.layout = key;
      selectedPanel = 0;
      renderPickers();
      syncPanelEditor();
      queueRedraw();
    });
    lg.appendChild(b);
  }
  const gg = $('gradeGrid');
  gg.innerHTML = '';
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'grade-btn' + (state.grade === key ? ' active' : '');
    const cols = def.title;
    b.innerHTML = `<span class="swatch" style="background:linear-gradient(90deg,${cols[0]},${cols[1]},${cols[2]})"></span>${def.label}`;
    b.addEventListener('click', () => {
      if (state.grade === key) return;
      pushUndo();
      state.grade = key;
      renderPickers();
      queueRedraw();
    });
    gg.appendChild(b);
  }
}

/** Syncs the selected-panel editor (photo select + sliders) with the state. */
function syncPanelEditor() {
  const count = LAYOUTS[state.layout].panels;
  const p = state.panels[selectedPanel];
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  state.photos.forEach((img, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = img ? `Photo ${i + 1}` : `Photo ${i + 1} (empty)`;
    sel.appendChild(o);
  });
  sel.value = String(p.photo);
  $('panelZoom').value = String(p.zoom);
  $('panelCx').value = String(p.cx);
  $('panelCy').value = String(p.cy);
  $('zoomVal').textContent = `${p.zoom.toFixed(2)}×`;
  $('cxVal').textContent = `${Math.round(p.cx * 100)}%`;
  $('cyVal').textContent = `${Math.round(p.cy * 100)}%`;
  $('panelHint').textContent =
    `Panel ${selectedPanel + 1} of ${count} selected — drag it in the preview to move the photo.`;
}

/** Applies a text/checkbox/select control change as one undo step. */
function bindControl(id, apply) {
  $(id).addEventListener('change', () => { pushUndo(); apply(); queueRedraw(); });
}
function bindText(id, key) {
  $(id).addEventListener('input', () => { state[key] = $(id).value; queueRedraw(); });
  $(id).addEventListener('change', () => { pushUndo(); });
}

$('title').addEventListener('input', () => { state.title = $('title').value; queueRedraw(); });
$('subtitle').addEventListener('input', () => { state.subtitle = $('subtitle').value; queueRedraw(); });
$('badge').addEventListener('input', () => { state.badge = $('badge').value; queueRedraw(); });
bindControl('titleStyle', () => { state.titleStyle = $('titleStyle').value; });
bindControl('grain', () => { state.grain = $('grain').checked; });
bindControl('vignette', () => { state.vignette = $('vignette').checked; });
bindControl('frame', () => { state.frame = $('frame').checked; });
bindControl('exportSize', () => {
  state.size = $('exportSize').value;
  const s = SIZES[state.size];
  canvas.width = s.w;
  canvas.height = s.h;
  queueRedraw();
});

$('panelPhoto').addEventListener('change', () => {
  pushUndo();
  state.panels[selectedPanel].photo = Number($('panelPhoto').value);
  queueRedraw();
});
$('panelZoom').addEventListener('input', () => {
  state.panels[selectedPanel].zoom = Number($('panelZoom').value);
  syncPanelEditor();
  queueRedraw();
});
$('panelZoom').addEventListener('change', pushUndo);
$('panelCx').addEventListener('input', () => {
  state.panels[selectedPanel].cx = Number($('panelCx').value);
  syncPanelEditor();
  queueRedraw();
});
$('panelCx').addEventListener('change', pushUndo);
$('panelCy').addEventListener('input', () => {
  state.panels[selectedPanel].cy = Number($('panelCy').value);
  syncPanelEditor();
  queueRedraw();
});
$('panelCy').addEventListener('change', pushUndo);
$('fillAll').addEventListener('click', () => {
  pushUndo();
  const photo = state.panels[selectedPanel].photo;
  state.panels.forEach((p) => { p.photo = photo; });
  queueRedraw();
  status.textContent = `Every panel now uses photo ${photo + 1}.`;
});

/** Reads files into photo slots, left to right. */
async function addFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) return;
  pushUndo();
  for (const file of list) {
    const slot = state.photos.findIndex((p) => p === null);
    if (slot === -1) break;
    state.photos[slot] = await loadImage(URL.createObjectURL(file));
  }
  renderPhotoSlots();
  queueRedraw();
  status.textContent = `${list.length} photo${list.length > 1 ? 's' : ''} loaded — click a photo slot to put it in the selected panel.`;
}
$('addPhoto').addEventListener('click', () => $('photoInput').click());
$('photoInput').addEventListener('change', (e) => addFiles(e.target.files));
$('loadSamples').addEventListener('click', async () => {
  pushUndo();
  for (let i = 0; i < SAMPLES.length; i++) {
    state.photos[i] = await loadImage(SAMPLES[i]);
  }
  renderPhotoSlots();
  queueRedraw();
  status.textContent = 'Sample photos loaded — try the layouts and grades.';
});

/** Pointer drag on the preview: pick a panel, drag to pan its photo, wheel to zoom. */
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const px = ((clientX - r.left) / r.width) * canvas.width;
  const py = ((clientY - r.top) / r.height) * canvas.height;
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const count = LAYOUTS[state.layout].panels;
  for (let i = count - 1; i >= 0; i--) {
    const q = rects[i];
    if (px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h) return i;
  }
  return -1;
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  if (i !== selectedPanel) {
    selectedPanel = i;
    syncPanelEditor();
  }
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging');
  drag = { x: e.clientX, y: e.clientY, undoPushed: false };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.undoPushed) { pushUndo(); drag.undoPushed = true; }
  const r = canvas.getBoundingClientRect();
  const p = state.panels[selectedPanel];
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const q = rects[selectedPanel];
  const iw = state.photos[p.photo]?.naturalWidth || 1;
  const ih = state.photos[p.photo]?.naturalHeight || 1;
  const scale = Math.max(q.w / iw, q.h / ih) * p.zoom;
  p.cx -= ((e.clientX - drag.x) / r.width) * (canvas.width / (iw * scale));
  p.cy -= ((e.clientY - drag.y) / r.height) * (canvas.height / (ih * scale));
  p.cx = Math.min(1, Math.max(0, p.cx));
  p.cy = Math.min(1, Math.max(0, p.cy));
  drag.x = e.clientX;
  drag.y = e.clientY;
  syncPanelEditor();
  queueRedraw();
});
canvas.addEventListener('pointerup', () => { drag = null; canvas.classList.remove('dragging'); });
canvas.addEventListener('wheel', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  e.preventDefault();
  if (i !== selectedPanel) { selectedPanel = i; syncPanelEditor(); }
  pushUndo();
  const p = state.panels[selectedPanel];
  p.zoom = Math.min(3, Math.max(1, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  syncPanelEditor();
  queueRedraw();
}, { passive: false });

$('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncAll();
});
$('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncAll();
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); $('undo').click(); }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); $('redo').click(); }
});
$('reset').addEventListener('click', () => {
  pushUndo();
  const fresh = defaultState();
  const photos = state.photos;
  Object.assign(state, fresh);
  state.photos = photos;
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('badge').value = state.badge;
  syncAll();
  status.textContent = 'Cover reset — your photos are still loaded.';
});

function downloadCanvas(c, filename) {
  c.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}
$('export').addEventListener('click', async () => {
  await fontsReady();
  const c = renderExport(state, state.size);
  const s = SIZES[state.size];
  downloadCanvas(c, `sunset-strip-cover-${s.w}x${s.h}.png`);
  status.textContent = `Saved sunset-strip-cover-${s.w}x${s.h}.png`;
});
$('exportAll').addEventListener('click', async () => {
  await fontsReady();
  for (const key of Object.keys(SIZES)) {
    const c = renderExport(state, key);
    const s = SIZES[key];
    downloadCanvas(c, `sunset-strip-cover-${s.w}x${s.h}.png`);
  }
  status.textContent = 'Saved all 3 sizes — 1080×1080, 1080×1350 and 1920×1080.';
});

function syncAll() {
  renderPhotoSlots();
  renderPickers();
  syncPanelEditor();
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('frame').checked = state.frame;
  $('titleStyle').value = state.titleStyle;
  $('exportSize').value = state.size;
  const s = SIZES[state.size];
  canvas.width = s.w;
  canvas.height = s.h;
  syncUndoButtons();
  queueRedraw();
}

/** Entry point: shot scenes for screenshots, otherwise the live editor. */
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, { loadImage, fontsReady, renderPhotoSlots, syncAll, redrawNow, SAMPLES });
} else {
  (async () => {
    await fontsReady();
    syncAll();
    redrawNow();
  })();
}
