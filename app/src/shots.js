// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the cover alone, drawn by the app itself at
// the export size. `photo` picks the samples, `caption` the words, `layout`
// and `grade` the look, `size` the export size. window.__shotReady is set
// once the scene is painted.
export async function runShot(shot, query, applyScene) {
  const photoA = query.get('photo') ?? 'pier';
  const photoB = query.get('photo2') ?? 'boulevard';
  const scene = {
    photos: [`samples/${photoA}.jpg`, `samples/${photoB}.jpg`],
    caption: query.get('caption') ?? 'Sunset Heist',
    subcaption: query.get('sub') ?? 'Neon nights',
    layout: query.get('layout') ?? 'split',
    grade: query.get('grade') ?? 'sunset',
    captionStyle: query.get('style') ?? 'solid',
    size: query.get('size') ?? 'square',
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'export') document.body.classList.add('shot-cover');
  await applyScene(scene);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
