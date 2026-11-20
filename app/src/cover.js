// Renders the multi-panel GTA-style cover onto a canvas: a photo in every panel,
// a Vice City sunset or neon colour grade, and a big bold caption along the foot.
// Nothing here reaches the network; every photo is drawn from an image the page
// already holds (an upload, or a sample under app/samples/).

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  landscape: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

export const LAYOUTS = {
  split: { label: 'Vice Split', panels: 3, hint: 'One hero panel, two stacked' },
  triptych: { label: 'Triptych', panels: 3, hint: 'Three tall panels' },
  grid: { label: 'Sunset Grid', panels: 4, hint: 'Four panels, two by two' },
  strip: { label: 'Hero Strip', panels: 3, hint: 'One wide hero, two below' },
};

export const GRADES = {
  sunset: { label: 'Sunset', filter: 'saturate(1.35) contrast(1.08) brightness(1.02)' },
  neon: { label: 'Neon Nights', filter: 'saturate(1.55) contrast(1.12) hue-rotate(-14deg)' },
  noir: { label: 'Noir', filter: 'saturate(0.12) contrast(1.28) brightness(1.06)' },
};

export const CAPTION_STYLES = {
  solid: { label: 'Solid white' },
  outline: { label: 'Outline' },
  neon: { label: 'Neon pink' },
};

/** Default panel photo assignment for a layout: panel i shows photos[i % photos]. */
export function defaultPanels(layout, photoCount) {
  const count = LAYOUTS[layout].panels;
  const panels = [];
  for (let i = 0; i < count; i++) {
    panels.push({ photo: photoCount > 0 ? i % photoCount : -1, zoom: 1, ox: 0, oy: 0 });
  }
  return panels;
}

/** Panel rectangles for a layout, as fractions of the cover, with a gutter between them. */
export function layoutPanels(layout, w, h) {
  const g = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  const rect = (x, y, pw, ph) => ({ x, y, w: pw, h: ph });
  switch (layout) {
    case 'triptych': {
      const a = Math.round(w * 0.32);
      const b = Math.round(w * 0.36);
      return [
        rect(0, 0, a, h),
        rect(a + g, 0, b, h),
        rect(a + b + 2 * g, 0, w - a - b - 2 * g, h),
      ];
    }
    case 'grid': {
      const hw = Math.round((w - g) / 2);
      const hh = Math.round((h - g) / 2);
      return [
        rect(0, 0, hw, hh),
        rect(hw + g, 0, w - hw - g, hh),
        rect(0, hh + g, hw, h - hh - g),
        rect(hw + g, hh + g, w - hw - g, h - hh - g),
      ];
    }
    case 'strip': {
      const top = Math.round(h * 0.64);
      const bw = Math.round((w - g) / 2);
      return [
        rect(0, 0, w, top),
        rect(0, top + g, bw, h - top - g),
        rect(bw + g, top + g, w - bw - g, h - top - g),
      ];
    }
    case 'split':
    default: {
      const hero = Math.round(w * 0.62);
      const hh = Math.round((h - g) / 2);
      return [
        rect(0, 0, hero, h),
        rect(hero + g, 0, w - hero - g, hh),
        rect(hero + g, hh + g, w - hero - g, h - hh - g),
      ];
    }
  }
}

function drawPhotoInPanel(ctx, img, panel, zoom, ox, oy, grade) {
  const { x, y, w, h } = panel;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!img) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#3a1c4d');
    grad.addColorStop(0.55, '#c2437a');
    grad.addColorStop(1, '#ff7a3d');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(w / iw, h / ih);
  const dw = iw * base * zoom;
  const dh = ih * base * zoom;
  const slackX = Math.max(0, (dw - w) / 2);
  const slackY = Math.max(0, (dh - h) / 2);
  const dx = x + (w - dw) / 2 + ox * slackX;
  const dy = y + (h - dh) / 2 + oy * slackY;
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

function gradeOverlay(ctx, w, h, gradeId) {
  ctx.save();
  if (gradeId === 'sunset') {
    const tint = ctx.createLinearGradient(0, 0, 0, h);
    tint.addColorStop(0, 'rgba(255, 122, 61, 0.10)');
    tint.addColorStop(0.6, 'rgba(255, 80, 120, 0.10)');
    tint.addColorStop(1, 'rgba(150, 30, 110, 0.30)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
  } else if (gradeId === 'neon') {
    const top = ctx.createLinearGradient(0, 0, w, 0);
    top.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
    top.addColorStop(1, 'rgba(255, 46, 136, 0.16)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h);
    const bottom = ctx.createLinearGradient(0, h * 0.55, 0, h);
    bottom.addColorStop(0, 'rgba(255, 46, 136, 0)');
    bottom.addColorStop(1, 'rgba(120, 0, 180, 0.28)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = 'rgba(10, 10, 30, 0.10)';
    ctx.fillRect(0, 0, w, h);
  }
  // Diagonal light streaks, like low sun across the poster.
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.moveTo(w * 0.15, 0);
  ctx.lineTo(w * 0.35, 0);
  ctx.lineTo(w * 0.05, h);
  ctx.lineTo(-w * 0.15, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFrame(ctx, w, h) {
  const outer = Math.max(8, Math.round(Math.min(w, h) * 0.011));
  ctx.save();
  ctx.strokeStyle = '#0d0812';
  ctx.lineWidth = outer;
  ctx.strokeRect(outer / 2, outer / 2, w - outer, h - outer);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(2, Math.round(outer * 0.22));
  ctx.strokeRect(outer + 1, outer + 1, w - 2 * outer - 2, h - 2 * outer - 2);
  ctx.restore();
}

function drawPanelBorders(ctx, panels) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = Math.max(2, Math.round(Math.min(panels[0].w, panels[0].h) * 0.006));
  for (const p of panels) ctx.strokeRect(p.x, p.y, p.w, p.h);
  ctx.restore();
}

function drawKicker(ctx, w, h) {
  const pad = Math.round(Math.min(w, h) * 0.02);
  const size = Math.round(Math.min(w, h) * 0.024);
  ctx.save();
  ctx.font = `${size}px Anton, sans-serif`;
  const text = '★  VICE FRAME';
  const tw = ctx.measureText(text).width;
  const bw = tw + pad * 1.6;
  const bh = size * 2.1;
  const x = pad;
  const y = pad;
  ctx.fillStyle = 'rgba(13, 8, 18, 0.72)';
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + pad * 0.8, y + bh / 2 + size * 0.04);
  ctx.restore();
}

function drawCaption(ctx, w, h, state) {
  const text = (state.caption || '').trim().toUpperCase();
  const sub = (state.subcaption || '').trim().toUpperCase();
  if (!text && !sub) return;
  const bandH = Math.round(h * (text ? 0.28 : 0.12));
  const top = state.captionPos === 'top';
  const y0 = top ? 0 : h - bandH;
  ctx.save();
  const shade = ctx.createLinearGradient(0, y0, 0, y0 + bandH);
  if (top) {
    shade.addColorStop(0, 'rgba(10, 6, 16, 0.82)');
    shade.addColorStop(1, 'rgba(10, 6, 16, 0)');
  } else {
    shade.addColorStop(0, 'rgba(10, 6, 16, 0)');
    shade.addColorStop(0.45, 'rgba(10, 6, 16, 0.62)');
    shade.addColorStop(1, 'rgba(10, 6, 16, 0.88)');
  }
  ctx.fillStyle = shade;
  ctx.fillRect(0, y0, w, bandH);
  // Hot accent bar along the band's edge.
  const barH = Math.max(4, Math.round(h * 0.009));
  const bar = ctx.createLinearGradient(0, 0, w, 0);
  bar.addColorStop(0, '#ff7a3d');
  bar.addColorStop(0.5, '#ff2e88');
  bar.addColorStop(1, '#7b2bff');
  ctx.fillStyle = bar;
  ctx.fillRect(0, top ? y0 + bandH - barH : y0, w, barH);

  const cx = w / 2;
  const baseY = top ? y0 + bandH * 0.45 : y0 + bandH * 0.55;
  ctx.translate(cx, baseY);
  ctx.transform(1, 0, -0.05, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (text) {
    let size = Math.round(h * 0.115);
    ctx.font = `${size}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas */ }
    while (ctx.measureText(text).width > w * 0.92 && size > 16) {
      size -= 2;
      ctx.font = `${size}px Anton, sans-serif`;
    }
    const style = state.captionStyle || 'solid';
    ctx.lineJoin = 'round';
    if (style === 'neon') {
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(text, size * 0.06, size * 0.06);
      ctx.fillStyle = '#ff2e88';
      ctx.strokeStyle = '#1a0512';
      ctx.lineWidth = size * 0.10;
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
    } else if (style === 'outline') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = size * 0.075;
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = '#160a20';
      ctx.fillText(text, 0, 0);
    } else {
      ctx.strokeStyle = '#160a20';
      ctx.lineWidth = size * 0.11;
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 0, 0);
    }
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  if (sub) {
    const subSize = Math.round(h * 0.032);
    ctx.font = `bold ${subSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = state.grade === 'neon' ? '#7df9ff' : '#ffb347';
    const dy = text ? Math.round(h * 0.075) : 0;
    ctx.fillText(sub, 0, dy);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` (its width/height are the export size).
 * `state`: { photos, panels, layout, caption, subcaption, captionStyle,
 * captionPos, grade, size }. `photos` are images (or null); `panels` align with
 * the layout's panel count; a panel's `photo` is an index into `photos`, or -1
 * for a sunset gradient panel.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = '#1a0f24';
  ctx.fillRect(0, 0, w, h);
  const panels = layoutPanels(state.layout, w, h);
  panels.forEach((panel, i) => {
    const slot = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const img = slot.photo >= 0 ? state.photos[slot.photo] : null;
    drawPhotoInPanel(ctx, img || null, panel, slot.zoom || 1, slot.ox || 0, slot.oy || 0, grade);
  });
  gradeOverlay(ctx, w, h, state.grade);
  drawPanelBorders(ctx, panels);
  drawFrame(ctx, w, h);
  drawKicker(ctx, w, h);
  drawCaption(ctx, w, h, state);
}
