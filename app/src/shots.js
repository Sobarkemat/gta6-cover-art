// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos loaded;
// ?shot=cover shows one exported cover full-frame, drawn by the app's own cover engine at the
// export size named by ?size= (square, portrait or wide). window.__shotReady is set once painted.
import { drawCover } from './cover.js';

export async function runShot(shot, query, state, helpers) {
  const { loadImage, fontsReady, renderPhotoSlots, syncAll, redrawNow, SAMPLES } = helpers;
  await fontsReady();

  const photoA = query.get('photo') ?? 'boulevard';
  const photoB = photoA === 'boulevard' ? 'pier' : 'boulevard';
  state.photos[0] = await loadImage(`samples/${photoA}.jpg`);
  state.photos[1] = await loadImage(`samples/${photoB}.jpg`);
  state.title = query.get('caption') ?? 'Boulevard Nights';
  state.subtitle = query.get('subtitle') ?? 'a sunset strip story';
  state.layout = query.get('layout') ?? 'hero3';
  state.grade = query.get('grade') ?? 'sunset';
  state.size = query.get('size') ?? 'wide';

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = document.getElementById('cover');
    const sizes = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] };
    const [w, h] = sizes[state.size] || sizes.wide;
    canvas.width = w;
    canvas.height = h;
    drawCover(canvas, state);
  } else {
    // Editor scene: keep the controls visible, preview at the chosen export size.
    document.getElementById('title').value = state.title;
    document.getElementById('subtitle').value = state.subtitle;
    renderPhotoSlots();
    syncAll();
    redrawNow();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
