// Sunset Strip Cover Studio — wires the editor page: photo slots, layout and grade pickers,
// caption fields, per-panel crop controls, undo/redo, drag-to-pan, scroll-to-zoom and PNG export.
// A `?shot=` query hands the page to ./shots.js instead, for fixed screenshot scenes.
import { drawCover, exportCoverCanvas, GRADES, LAYOUTS, SIZES, layoutPanelsFor, panelAtPoint } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = ['boulevard.jpg', 'pier.jpg'];
const MAX_PHOTOS = 4;

const canvas = document.getElementById('cover');
const statusLine = document.getElementById('status');

/** The whole editable state. Photos live as Images; photoData holds the same pictures as data
 *  URLs so a state snapshot (for undo) can be stored as plain JSON. */
const state = {
  layout: 'hero3',
  grade: 'vice',
  size: 'square',
  title: 'Sunset Strip',
  subtitle: 'Vice nights, neon lights',
  kicker: 'Leonida • Est. 2026',
  badge: 'New',
  photos: [null, null, null, null],
  photoData: [null, null, null, null],
  panels: [
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
  ],
};

let selectedPanel = 0;

// --- history (undo / redo) -------------------------------------------------------

const history = [];
let historyIndex = -1;

function snapshotState() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, size: state.size,
    title: state.title, subtitle: state.subtitle, kicker: state.kicker, badge: state.badge,
    photoData: state.photoData, panels: state.panels,
  });
}

function pushHistory() {
  history.length = historyIndex + 1;
  history.push(snapshotState());
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  refreshUndoButtons();
}

async function restoreSnapshot(json) {
  const data = JSON.parse(json);
  state.layout = data.layout; state.grade = data.grade; state.size = data.size;
  state.title = data.title; state.subtitle = data.subtitle;
  state.kicker = data.kicker; state.badge = data.badge;
  state.panels = data.panels;
  state.photoData = data.photoData;
  state.photos = await Promise.all(data.photoData.map((d) => (d ? imageFromDataUrl(d) : null)));
  syncControls();
  redraw();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  restoreSnapshot(history[historyIndex]);
  refreshUndoButtons();
  setStatus('Undone.');
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex += 1;
  restoreSnapshot(history[historyIndex]);
  refreshUndoButtons();
  setStatus('Redone.');
}

function refreshUndoButtons() {
  document.getElementById('undo').disabled = historyIndex <= 0;
  document.getElementById('redo').disabled = historyIndex >= history.length - 1;
}

// --- photos ----------------------------------------------------------------------

function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function setPhotoSlot(slot, dataUrl) {
  state.photoData[slot] = dataUrl;
  state.photos[slot] = dataUrl ? await imageFromDataUrl(dataUrl) : null;
  renderPhotoSlots();
  redraw();
}

async function loadSampleIntoSlot(slot, sampleName) {
  const res = await fetch(`samples/${sampleName}`);
  const blob = await res.blob();
  const dataUrl = await readFileAsDataUrl(blob);
  await setPhotoSlot(slot, dataUrl);
}

function renderPhotoSlots() {
  const wrap = document.getElementById('photoSlots');
  wrap.innerHTML = '';
  for (let slot = 0; slot < MAX_PHOTOS; slot++) {
    const card = document.createElement('div');
    card.className = 'photo-slot';
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    if (state.photoData[slot]) {
      const img = document.createElement('img');
      img.src = state.photoData[slot];
      img.alt = `Photo ${slot + 1}`;
      thumb.appendChild(img);
    } else {
      thumb.textContent = `+ Photo ${slot + 1}`;
    }
    const pick = document.createElement('label');
    pick.className = 'slot-button';
    pick.textContent = 'Choose file';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      pushHistory();
      await setPhotoSlot(slot, await readFileAsDataUrl(file));
      setStatus(`Photo ${slot + 1} loaded.`);
    });
    pick.appendChild(input);
    const sample = document.createElement('button');
    sample.type = 'button';
    sample.className = 'slot-button';
    sample.textContent = 'Use sample';
    sample.addEventListener('click', async () => {
      pushHistory();
      await loadSampleIntoSlot(slot, SAMPLES[slot % SAMPLES.length]);
      setStatus(`Sample photo loaded into slot ${slot + 1}.`);
    });
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'slot-button';
    clear.textContent = 'Clear';
    clear.disabled = !state.photoData[slot];
    clear.addEventListener('click', async () => {
      pushHistory();
      await setPhotoSlot(slot, null);
    });
    card.append(thumb, pick, sample, clear);
    wrap.appendChild(card);
  }
}

// --- controls --------------------------------------------------------------------

function buildPicker(containerId, items, current, onPick) {
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = '';
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'picker-button';
    button.textContent = item.name;
    button.dataset.id = item.id;
    if (item.id === current) button.classList.add('active');
    if (item.id === 'vice' || item.id === 'neon') button.style.setProperty('--swatch', item.id === 'vice' ? '#ff5e8a' : '#37e6ff');
    button.addEventListener('click', () => {
      onPick(item.id);
      wrap.querySelectorAll('.picker-button').forEach((b) => b.classList.toggle('active', b.dataset.id === item.id));
    });
    wrap.appendChild(button);
  }
}

function buildLayoutPicker() {
  buildPicker('layoutPicker', LAYOUTS, state.layout, (id) => { pushHistory(); state.layout = id; redraw(); });
}

function buildGradePicker() {
  buildPicker('gradePicker', GRADES, state.grade, (id) => { pushHistory(); state.grade = id; redraw(); });
}

function buildSizePicker() {
  const wrap = document.getElementById('sizePicker');
  wrap.innerHTML = '';
  for (const [id, size] of Object.entries(SIZES)) {
    const label = document.createElement('label');
    label.className = 'size-option';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'size';
    radio.value = id;
    radio.checked = id === state.size;
    radio.addEventListener('change', () => { pushHistory(); state.size = id; resizePreview(); });
    label.append(radio, document.createTextNode(` ${size.label}`));
    wrap.appendChild(label);
  }
}

function syncControls() {
  document.getElementById('titleInput').value = state.title;
  document.getElementById('subtitleInput').value = state.subtitle;
  document.getElementById('kickerInput').value = state.kicker;
  document.getElementById('badgeInput').value = state.badge;
  buildLayoutPicker();
  buildGradePicker();
  buildSizePicker();
  renderPhotoSlots();
  refreshPanelControls();
  resizePreview();
}

function refreshPanelControls() {
  const panelCount = layoutPanelsFor(state.layout, 1, 1).length;
  if (selectedPanel >= panelCount) selectedPanel = 0;
  const select = document.getElementById('panelSelect');
  select.innerHTML = '';
  for (let i = 0; i < panelCount; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Panel ${i + 1}`;
    select.appendChild(opt);
  }
  select.value = String(selectedPanel);
  const photoSelect = document.getElementById('panelPhoto');
  photoSelect.innerHTML = '';
  const none = document.createElement('option');
  none.value = '-1';
  none.textContent = 'Empty';
  photoSelect.appendChild(none);
  for (let s = 0; s < MAX_PHOTOS; s++) {
    const opt = document.createElement('option');
    opt.value = String(s);
    opt.textContent = state.photoData[s] ? `Photo ${s + 1}` : `Photo ${s + 1} (empty)`;
    photoSelect.appendChild(opt);
  }
  photoSelect.value = String(state.panels[selectedPanel].photo);
  const zoom = document.getElementById('panelZoom');
  zoom.value = String(state.panels[selectedPanel].zoom);
  document.getElementById('zoomValue').textContent = `${Math.round(state.panels[selectedPanel].zoom * 100)}%`;
}

// --- drawing ---------------------------------------------------------------------

function resizePreview() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  redraw();
}

function redraw() {
  drawCover(canvas, state);
}

function setStatus(text) {
  statusLine.textContent = text;
}

// --- panel drag / zoom on the canvas ----------------------------------------------

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

let drag = null;
let wheelBurst = false;

canvas.addEventListener('pointerdown', (event) => {
  const p = canvasPoint(event);
  const hit = panelAtPoint(state.layout, p.x, p.y, canvas.width, canvas.height);
  if (hit < 0) return;
  pushHistory();
  selectedPanel = hit;
  refreshPanelControls();
  const view = state.panels[hit];
  drag = { panel: hit, startX: p.x, startY: p.y, ox: view.ox, oy: view.oy };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const p = canvasPoint(event);
  const panels = layoutPanelsFor(state.layout, canvas.width, canvas.height);
  const rect = panels[drag.panel];
  const view = state.panels[drag.panel];
  view.ox = Math.max(-0.6, Math.min(0.6, drag.ox + (p.x - drag.startX) / rect.w));
  view.oy = Math.max(-0.6, Math.min(0.6, drag.oy + (p.y - drag.startY) / rect.h));
  redraw();
});

canvas.addEventListener('pointerup', () => { drag = null; });

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const p = canvasPoint(event);
  const hit = panelAtPoint(state.layout, p.x, p.y, canvas.width, canvas.height);
  if (hit < 0) return;
  if (!wheelBurst) { pushHistory(); wheelBurst = true; setTimeout(() => { wheelBurst = false; }, 400); }
  const view = state.panels[hit];
  view.zoom = Math.max(1, Math.min(4, view.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
  selectedPanel = hit;
  refreshPanelControls();
  redraw();
}, { passive: false });

// --- export ----------------------------------------------------------------------

function downloadCanvas(exportCanvas, filename) {
  exportCanvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function exportOne(sizeId) {
  const size = SIZES[sizeId];
  const out = exportCoverCanvas(state, size.w, size.h);
  downloadCanvas(out, `sunset-strip-${size.w}x${size.h}.png`);
  setStatus(`Saved sunset-strip-${size.w}x${size.h}.png`);
}

document.getElementById('exportOne').addEventListener('click', () => exportOne(state.size));
document.getElementById('exportAll').addEventListener('click', () => {
  Object.keys(SIZES).forEach((id, i) => setTimeout(() => exportOne(id), i * 400));
  setStatus('Exporting all three sizes…');
});

// --- misc buttons ------------------------------------------------------------------

document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);
document.getElementById('fillAll').addEventListener('click', () => {
  pushHistory();
  const count = layoutPanelsFor(state.layout, 1, 1).length;
  const loaded = state.photoData.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
  for (let i = 0; i < count; i++) {
    state.panels[i].photo = loaded.length ? loaded[i % loaded.length] : -1;
    state.panels[i].zoom = 1; state.panels[i].ox = 0; state.panels[i].oy = 0;
  }
  refreshPanelControls();
  redraw();
  setStatus('Every panel filled.');
});
document.getElementById('resetView').addEventListener('click', () => {
  pushHistory();
  const view = state.panels[selectedPanel];
  view.zoom = 1; view.ox = 0; view.oy = 0;
  refreshPanelControls();
  redraw();
});

document.getElementById('panelSelect').addEventListener('change', (e) => {
  selectedPanel = Number(e.target.value);
  refreshPanelControls();
});
document.getElementById('panelPhoto').addEventListener('change', (e) => {
  pushHistory();
  state.panels[selectedPanel].photo = Number(e.target.value);
  redraw();
});
document.getElementById('panelZoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  document.getElementById('zoomValue').textContent = `${Math.round(state.panels[selectedPanel].zoom * 100)}%`;
  redraw();
});
document.getElementById('panelZoom').addEventListener('change', pushHistory);

for (const [inputId, key] of [['titleInput', 'title'], ['subtitleInput', 'subtitle'], ['kickerInput', 'kicker'], ['badgeInput', 'badge']]) {
  const input = document.getElementById(inputId);
  input.addEventListener('input', () => { state[key] = input.value; redraw(); });
  input.addEventListener('change', pushHistory);
}

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault(); undo();
  } else if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
    event.preventDefault(); redo();
  }
});

// --- boot --------------------------------------------------------------------------

async function boot() {
  // The shot scenes (for screenshots) take over before the editor wires itself up.
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      state,
      async loadSample(name) { return loadSampleIntoSlot(0, name); },
      async loadSamples(names) {
        for (let i = 0; i < names.length; i++) await loadSampleIntoSlot(i, names[i]);
      },
      resizePreview, redraw, renderPhotoSlots, syncControls,
    });
    return;
  }
  await Promise.all([
    document.fonts.load('40px Anton'),
    document.fonts.load('40px Pacifico'),
    document.fonts.load('40px "Bebas Neue"'),
  ]).catch(() => {});
  syncControls();
  pushHistory();
  document.fonts.ready.then(redraw);
}

boot();
