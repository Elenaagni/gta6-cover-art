// Wires the Vice Frame editor: photo slots, layout, per-panel crop, caption,
// grade, size and export. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js). Photos stay on the person's machine.
import { drawCover, defaultPanels, SIZES, LAYOUTS, GRADES, CAPTION_STYLES } from './cover.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

const state = {
  photos: [null, null, null],
  photoNames: ['', '', ''],
  layout: 'split',
  panels: defaultPanels('split', 2),
  caption: 'Sunset Heist',
  subcaption: 'Neon nights',
  captionStyle: 'solid',
  captionPos: 'bottom',
  grade: 'sunset',
  size: 'square',
  activePanel: 0,
};

let fontsReady = false;

async function ensureFonts() {
  if (fontsReady) return;
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch { /* fall back to system sans */ }
  fontsReady = true;
}

function redraw() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state);
  $('sizeLabel').textContent = `${size.label} — live preview`;
}

function setStatus(text) {
  status.textContent = text;
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function renderSlots() {
  const wrap = $('slots');
  wrap.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot' + (photo ? ' filled' : '');
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (photo) {
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = state.photoNames[i] || `Photo ${i + 1}`;
      thumb.appendChild(img);
    } else {
      thumb.textContent = '+';
    }
    const label = document.createElement('span');
    label.textContent = photo ? (state.photoNames[i] || `Photo ${i + 1}`) : `Photo ${i + 1} — empty`;
    slot.append(thumb, label);
    wrap.appendChild(slot);
  });
  const used = state.photos.filter(Boolean).length;
  $('photoCount').textContent = used === 0
    ? 'No photo yet — the samples below are loaded for you.'
    : `${used} photo${used > 1 ? 's' : ''} loaded. Pick a panel, then choose its photo.`;
}

function renderPanelControls() {
  const count = LAYOUTS[state.layout].panels;
  if (state.activePanel >= count) state.activePanel = 0;
  if (state.panels.length !== count) {
    state.panels = defaultPanels(state.layout, state.photos.filter(Boolean).length || 1);
  }
  const tabs = $('panelTabs');
  tabs.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (i === state.activePanel ? ' active' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => { state.activePanel = i; renderPanelControls(); });
    tabs.appendChild(b);
  }
  const slot = state.panels[state.activePanel];
  const select = $('panelPhoto');
  select.innerHTML = '';
  const gradient = document.createElement('option');
  gradient.value = '-1';
  gradient.textContent = 'Sunset gradient (no photo)';
  select.appendChild(gradient);
  state.photos.forEach((photo, i) => {
    if (!photo) return;
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = state.photoNames[i] || `Photo ${i + 1}`;
    select.appendChild(opt);
  });
  select.value = String(slot.photo);
  $('zoom').value = slot.zoom;
  $('offsetX').value = slot.ox;
  $('offsetY').value = slot.oy;
  $('zoomVal').textContent = `${slot.zoom.toFixed(2)}x`;
  $('offsetXVal').textContent = `${Math.round(slot.ox * 100)}%`;
  $('offsetYVal').textContent = `${Math.round(slot.oy * 100)}%`;
}

function renderLayoutButtons() {
  const wrap = $('layouts');
  wrap.innerHTML = '';
  for (const [id, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (id === state.layout ? ' active' : '');
    b.innerHTML = `<strong>${def.label}</strong><span>${def.hint}</span>`;
    b.addEventListener('click', () => {
      state.layout = id;
      state.panels = defaultPanels(id, Math.max(1, state.photos.filter(Boolean).length));
      renderLayoutButtons();
      renderPanelControls();
      redraw();
    });
    wrap.appendChild(b);
  }
}

function renderGradeButtons() {
  const wrap = $('grades');
  wrap.innerHTML = '';
  for (const [id, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice grade-' + id + (id === state.grade ? ' active' : '');
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.grade = id;
      renderGradeButtons();
      redraw();
    });
    wrap.appendChild(b);
  }
}

function renderStyleButtons() {
  const wrap = $('captionStyles');
  wrap.innerHTML = '';
  for (const [id, def] of Object.entries(CAPTION_STYLES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (id === state.captionStyle ? ' active' : '');
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.captionStyle = id;
      renderStyleButtons();
      redraw();
    });
    wrap.appendChild(b);
  }
}

function renderSizeButtons() {
  const wrap = $('sizes');
  wrap.innerHTML = '';
  for (const [id, def] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (id === state.size ? ' active' : '');
    b.textContent = def.label;
    b.addEventListener('click', async () => {
      state.size = id;
      renderSizeButtons();
      await ensureFonts();
      redraw();
    });
    wrap.appendChild(b);
  }
}

async function setPhoto(index, fileOrUrl, name) {
  const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  const img = await loadImage(url);
  state.photos[index] = img;
  state.photoNames[index] = name || '';
  // Panels pointing at an empty slot take the new photo; panels already set keep theirs.
  state.panels.forEach((p) => { if (p.photo === -1) p.photo = index; });
  renderSlots();
  renderPanelControls();
  redraw();
}

$('photoFiles').addEventListener('change', async (e) => {
  const files = [...e.target.files].slice(0, 3);
  for (const file of files) {
    const free = state.photos.findIndex((p) => !p);
    if (free === -1) break;
    await setPhoto(free, file, file.name);
  }
  setStatus(files.length ? `Loaded ${files.length} photo${files.length > 1 ? 's' : ''}.` : 'No photo chosen.');
  e.target.value = '';
});

$('useOnePhoto').addEventListener('click', () => {
  const first = state.photos.findIndex((p) => p);
  if (first === -1) { setStatus('Load a photo first.'); return; }
  state.panels.forEach((p) => { p.photo = first; });
  renderPanelControls();
  redraw();
  setStatus('One photo now fills every panel.');
});

$('panelPhoto').addEventListener('change', (e) => {
  state.panels[state.activePanel].photo = Number(e.target.value);
  redraw();
});

function bindSlider(id, key, format) {
  $(id).addEventListener('input', (e) => {
    state.panels[state.activePanel][key] = Number(e.target.value);
    $(id + 'Val').textContent = format(Number(e.target.value));
    redraw();
  });
}
bindSlider('zoom', 'zoom', (v) => `${v.toFixed(2)}x`);
bindSlider('offsetX', 'ox', (v) => `${Math.round(v * 100)}%`);
bindSlider('offsetY', 'oy', (v) => `${Math.round(v * 100)}%`);

$('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
$('subcaption').addEventListener('input', (e) => { state.subcaption = e.target.value; redraw(); });
$('captionPos').addEventListener('change', (e) => { state.captionPos = e.target.value; redraw(); });

$('export').addEventListener('click', async () => {
  await ensureFonts();
  redraw();
  const size = SIZES[state.size];
  canvas.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-frame-${size.w}x${size.h}.png`;
    a.click();
    setStatus(`Saved vice-frame-${size.w}x${size.h}.png — share it.`);
  }, 'image/png');
});

/** Applies a fixed scene (used by ?shot= screenshots and by tests). */
export async function applyScene(scene) {
  if (scene.photos) {
    for (let i = 0; i < scene.photos.length && i < 3; i++) {
      state.photos[i] = await loadImage(scene.photos[i]);
      state.photoNames[i] = scene.photos[i].split('/').pop();
    }
  }
  if (scene.layout) state.layout = scene.layout;
  if (scene.caption !== undefined) { state.caption = scene.caption; $('caption').value = scene.caption; }
  if (scene.subcaption !== undefined) { state.subcaption = scene.subcaption; $('subcaption').value = scene.subcaption; }
  if (scene.captionStyle) state.captionStyle = scene.captionStyle;
  if (scene.captionPos) { state.captionPos = scene.captionPos; $('captionPos').value = scene.captionPos; }
  if (scene.grade) state.grade = scene.grade;
  if (scene.size) state.size = scene.size;
  const count = Math.max(1, state.photos.filter(Boolean).length);
  state.panels = scene.panels || defaultPanels(state.layout, count);
  renderSlots();
  renderLayoutButtons();
  renderGradeButtons();
  renderStyleButtons();
  renderSizeButtons();
  renderPanelControls();
  await ensureFonts();
  redraw();
}

async function boot() {
  renderSlots();
  renderLayoutButtons();
  renderGradeButtons();
  renderStyleButtons();
  renderSizeButtons();
  renderPanelControls();
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    const { runShot } = await import('./shots.js');
    await runShot(query.get('shot'), query, applyScene);
  } else {
    // Two free sample photos so the maker starts with a cover, not a blank page.
    await applyScene({
      photos: ['samples/pier.jpg', 'samples/boulevard.jpg'],
      caption: 'Sunset Heist',
      subcaption: 'Neon nights',
    });
  }
  window.__viceFrameReady = true;
}

boot();
