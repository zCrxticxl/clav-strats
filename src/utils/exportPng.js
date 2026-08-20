import { ATTACHED_GADGET_GAP, ATTACHED_GADGET_SIZE } from './gadgetPlacement';
import { getActivePhase } from './timeline';

// PNG export. Canvas-drawn images use crossOrigin='anonymous' and their
// hosts send Access-Control-Allow-Origin, so the canvas stays untainted even
// with Electron webSecurity enabled.

async function loadImg(src) {
  if (!src) return null;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Convert any image URL to a base64 data URL so it survives SVG→canvas rendering
async function imgToDataUrl(src) {
  if (!src || src.startsWith('data:')) return src;
  const img = await loadImg(src);
  if (!img) return null;
  try {
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth || img.width || 64;
    cv.height = img.naturalHeight || img.height || 64;
    cv.getContext('2d').drawImage(img, 0, 0);
    return cv.toDataURL();
  } catch { return null; }
}

// Inline all <image> hrefs in an SVG clone so they render in a data: context
async function inlineSvgImages(svgEl) {
  const images = svgEl.querySelectorAll('image');
  await Promise.all([...images].map(async img => {
    const href = img.getAttribute('href') || img.getAttribute('xlink:href');
    if (!href || href.startsWith('data:')) return;
    // Make relative URLs absolute
    const abs = href.startsWith('/') ? window.location.origin + href : href;
    const dataUrl = await imgToDataUrl(abs);
    if (dataUrl) { img.setAttribute('href', dataUrl); img.removeAttribute('xlink:href'); }
  }));
}

async function drawOperatorsOnCanvas(ctx, elements, W, H, scale) {
  const ops = (elements || []).filter(el => el.type === 'operator');
  for (const el of ops) {
    const cx = (el.x / 100) * W * scale;
    const cy = (el.y / 100) * H * scale;
    const sz = 36 * (el.scale || 1) * scale;
    const r  = sz / 2;
    const color = el.color || (el.side === 'attack' ? '#E8B84B' : '#4B9CE8');

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,10,14,0.88)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();
    ctx.clip();

    if (el.op?.icon) {
      const img = await loadImg(el.op.icon);
      if (img) ctx.drawImage(img, cx - r, cy - r, sz, sz);
    }
    ctx.restore();
  }
}

function pct(v, dim) { return (v / 100) * dim; }

export function buildFloorSVG(W, H, elements) {
  const els = elements.map((el, i) => {
    const key = `el-${i}`;
    const c = el.color || '#E8B84B';

    if (el.type === 'reinforcement') {
      const s  = el.scale || 1;
      const ew = (el.w != null ? el.w : (el.horizontal ? 3.0 : 0.65)) * s;
      const eh = (el.h != null ? el.h : (el.horizontal ? 0.65 : 3.0)) * s;
      const px = el.x - ew/2, py = el.y - eh/2;
      const pid = `rp-${key}`;
       return `<defs>
        <pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="${c}"/>
          <rect width="3" height="6" fill="rgba(0,0,0,0.55)"/>
        </pattern>
      </defs>
      <rect x="${px}%" y="${py}%" width="${ew}%" height="${eh}%" fill="url(#${pid})" stroke="${c}" stroke-width="1.5" rx="0.5"/>
      <rect x="${px}%" y="${py}%" width="${ew}%" height="${eh}%" fill="${c}55" rx="0.5"/>
       <text x="${el.x}%" y="${el.y + 0.35}%" text-anchor="middle" dominant-baseline="middle" font-size="${Math.round(W*0.014)}" fill="${c}" font-weight="bold" font-family="Arial,sans-serif" stroke="rgba(0,0,0,0.8)" stroke-width="2" paint-order="stroke">R</text>`;
    }
    if (el.type === 'barricade') {
      const s  = el.scale || 1;
      const bw = (el.w != null ? Math.max(el.w, 1.0) : 1.2) * s;
      const bh = (el.h != null ? Math.max(el.h, 1.0) : 2.4) * s;
      const pid = `bp-${key}`;
      return `<defs><pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="3" height="6" fill="${c}CC"/>
      </pattern></defs>
      <rect x="${el.x-bw/2}%" y="${el.y-bh/2}%" width="${bw}%" height="${bh}%" fill="url(#${pid})" rx="0.3"/>
      <text x="${el.x}%" y="${el.y+0.3}%" text-anchor="middle" dominant-baseline="middle" font-size="${Math.round(W*0.018)}" fill="${c}" font-weight="bold" font-family="Arial,sans-serif" stroke="rgba(0,0,0,0.8)" stroke-width="2" paint-order="stroke">B</text>`;
    }
    if (el.type === 'operator') {
      return ''; // drawn directly on canvas via drawOperatorsOnCanvas
    }
    if (el.type === 'gadget' && el.gadget?.icon) {
      const attached = el.wallId && el.anchorX != null && el.anchorY != null;
      const gs = (attached ? ATTACHED_GADGET_SIZE : 3.4) * (el.scale || 1);
      const pad = attached ? gs * 0.04 : gs * 0.1;
      const rot = el.rotation || 0;
      let gx = el.x, gy = el.y;
      if (attached) {
        const dx = el.x - el.anchorX, dy = el.y - el.anchorY;
        const distance = Math.hypot(dx, dy);
        const readableDistance = gs / 2 + ATTACHED_GADGET_GAP + 0.35;
        if (distance > 0 && distance < readableDistance) {
          gx = el.anchorX + dx / distance * readableDistance;
          gy = el.anchorY + dy / distance * readableDistance;
        }
      }
      const attachment = attached
        ? `<line x1="${el.anchorX}%" y1="${el.anchorY}%" x2="${gx}%" y2="${gy}%" stroke="${c}" stroke-width="0.16%" stroke-dasharray="0.5% 0.3%" stroke-linecap="round"/>`
        : '';
      const box = `<rect x="${gx - gs/2}%" y="${gy - gs/2}%" width="${gs}%" height="${gs}%" fill="rgba(8,10,14,0.9)" stroke="${c}" stroke-width="${attached ? '0.18%' : '0.25%'}" rx="0.5"/>`;
      const img = `<image href="${el.gadget.icon}" x="${gx - gs/2 + pad}%" y="${gy - gs/2 + pad}%" width="${gs - pad*2}%" height="${gs - pad*2}%"/>`;
      const rotatedImg = rot
        ? `<g style="transform:rotate(${rot}deg);transform-box:fill-box;transform-origin:50% 50%">${img}</g>`
        : img;
      return attached
        ? `${attachment}${box}${rotatedImg}`
        : rot
          ? `<g style="transform:rotate(${rot}deg);transform-box:fill-box;transform-origin:50% 50%">${box}${img}</g>`
          : `${box}${img}`;
    }
    if (el.type === 'arrow' && el.points?.length >= 2) {
      const pts = el.points.map(p => `${p.x}%,${p.y}%`).join(' ');
      const last = el.points[el.points.length-1], prev = el.points[el.points.length-2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const as = 1.2;
      const ax = last.x, ay = last.y;
      return `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="0.35%" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="${ax}%,${ay}% ${ax - as*Math.cos(angle-0.4)}%,${ay - as*Math.sin(angle-0.4)}% ${ax - as*Math.cos(angle+0.4)}%,${ay - as*Math.sin(angle+0.4)}%" fill="${c}"/>`;
    }
    if (el.type === 'route' && el.points?.length >= 2) {
      const pts = el.points.map(p => `${p.x}%,${p.y}%`).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="0.3%" stroke-dasharray="1% 0.6%" stroke-linecap="round"/>`;
    }
    if (el.type === 'zone' && el.points?.length >= 2) {
      const pts = el.points.map(p => `${p.x}%,${p.y}%`).join(' ');
      return `<polygon points="${pts}" fill="${c}22" stroke="${c}" stroke-width="0.2%"/>`;
    }
    if (el.type === 'headline' || el.type === 'feetline') {
      return `<text x="${el.x}%" y="${el.y}%" text-anchor="middle" dominant-baseline="middle" font-size="${Math.round(W*0.020)}" font-family="Arial,sans-serif" font-weight="900" fill="${c}" stroke="rgba(8,10,14,0.9)" stroke-width="2" paint-order="stroke">${el.type === 'headline' ? 'H' : 'F'}</text>`;
    }
    if (el.type === 'verticalholes') {
      const scale = el.scale || 1;
      const width = 2.2 * scale;
      const height = 5.2 * scale;
      const radius = 0.42 * scale;
      const holes = [-1.5, -0.5, 0.5, 1.5]
        .map(offset => `<circle cx="${el.x}%" cy="${el.y + offset * scale}%" r="${radius}%" fill="rgba(0,0,0,0.95)" stroke="${c}" stroke-width="0.14%"/>`)
        .join('');
      const body = `<rect x="${el.x - width / 2}%" y="${el.y - height / 2}%" width="${width}%" height="${height}%" rx="${width * 0.35}%" fill="rgba(8,10,14,0.82)" stroke="${c}" stroke-width="0.2%" stroke-dasharray="0.5% 0.3%"/>${holes}`;
      return el.rotation
        ? `<g style="transform:rotate(${el.rotation}deg);transform-box:fill-box;transform-origin:50% 50%">${body}</g>`
        : body;
    }
    if (el.type === 'text') {
      return `<text x="${el.x}%" y="${el.y}%" font-size="14" font-family="Share Tech Mono,monospace" fill="${c}">${el.text || ''}</text>`;
    }
    if (el.type === 'rotate') {
      const r = 2.0 * (el.scale || 1);
      const startA = -Math.PI/2, sweep = Math.PI*1.55, endA = startA + sweep;
      const ax2 = el.x + r*Math.cos(endA), ay2 = el.y + r*Math.sin(endA);
      const tgx = -Math.sin(endA), tgy = Math.cos(endA), as = r*0.35;
      return `<path d="M ${el.x + r*Math.cos(startA)}% ${el.y + r*Math.sin(startA)}% A ${r}% ${r}% 0 1 1 ${ax2}% ${ay2}%" fill="none" stroke="${c}" stroke-width="0.3%" stroke-linecap="round"/>
      <polygon points="${ax2}%,${ay2}% ${ax2-(tgx*as+tgy*as*0.5)}%,${ay2-(tgy*as-tgx*as*0.5)}% ${ax2-(tgx*as-tgy*as*0.5)}%,${ay2-(tgy*as+tgx*as*0.5)}%" fill="${c}"/>
      <circle cx="${el.x}%" cy="${el.y}%" r="1.5%" fill="${c}33" stroke="${c}" stroke-width="0.15%"/>
      <image href="/icons/game_r6_rotate_vkme7.webp" x="${el.x-2}%" y="${el.y-2}%" width="4%" height="4%" preserveAspectRatio="xMidYMid meet"/>`;
    }
    return '';
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${els}</svg>`;
}


async function exportRootToCanvas(rootEl, scale = 2, meta = {}) {
  // Ignore the editor zoom transform: export is a document render, not a
  // screenshot of the currently selected viewport.
  const W = Math.max(1, Math.round(rootEl.offsetWidth || rootEl.getBoundingClientRect().width));
  const H = Math.max(1, Math.round(rootEl.offsetHeight || rootEl.getBoundingClientRect().height));

  const canvas = document.createElement('canvas');
  canvas.width  = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0D1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bpSrc = meta.overrideBlueprintSrc || rootEl.querySelector('img')?.src;

  if (bpSrc) {
    const bpImg = await loadImg(bpSrc);
    if (bpImg) ctx.drawImage(bpImg, 0, 0, canvas.width, canvas.height);
  }

  // Always use the pure renderer. Serializing the live SVG made active slides
  // differ from inactive slides through selection and editor-only overlays.
  const rawElements = meta.visibleElements || meta.overrideFloorElements || [];
  const owners = new Map((meta.lineup || []).map(player => [player.slotId, player]));
  const exportElements = rawElements.map(element => {
    const owner = owners.get(element.ownerId);
    return owner ? { ...element, color: owner.color } : element;
  });
  const rawSvg = buildFloorSVG(W, H, exportElements);
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(rawSvg, 'image/svg+xml');
  const svgEl = svgDoc.documentElement;
  await inlineSvgImages(svgEl);
  const svgXml = new XMLSerializer().serializeToString(svgEl);

  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgXml);
  const svgImg = new Image();
  svgImg.width = W; svgImg.height = H;
  await new Promise((res, rej) => { svgImg.onload = res; svgImg.onerror = rej; svgImg.src = svgDataUrl; });
  ctx.drawImage(svgImg, 0, 0, canvas.width, canvas.height);

  // Draw operators on top. foreignObject HTML does not render in serialized SVG.
  await drawOperatorsOnCanvas(ctx, exportElements, W, H, scale);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,       y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r,   y,         r);
  ctx.closePath();
}

function clip(text, ctx, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
  return text + '…';
}

function lineupPanelHeight(scale) {
  return Math.round((32 + 148 + 8 * 3) * scale);
}

async function drawLineupPanel(ctx, lineup, { canvasW, mapH, scale, stratName, selectedFloor, side, reinforcementCounts = {} }) {
  const S     = scale;
  const pH    = lineupPanelHeight(S);
  const cols  = lineup.length || 1;
  const GAP   = 6 * S;
  const PAD   = 8 * S;
  const cardW = (canvasW - PAD * 2 - GAP * (cols - 1)) / cols;
  const cardH = 148 * S;
  const metaH = 26 * S;

  ctx.fillStyle = '#08090D';
  ctx.fillRect(0, mapH, canvasW, pH);
  ctx.strokeStyle = '#E8B84B';
  ctx.lineWidth = 1.5 * S;
  ctx.beginPath(); ctx.moveTo(0, mapH); ctx.lineTo(canvasW, mapH); ctx.stroke();

  ctx.fillStyle = '#E8B84B';
  ctx.font = `600 ${9 * S}px monospace`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(
    `${stratName || 'Strat'}  ·  ${selectedFloor || ''}  ·  ${side === 'attack' ? 'ATK' : 'DEF'}`,
    PAD, mapH + PAD + metaH / 2
  );

  const cardsY = mapH + PAD + metaH + PAD * 0.5;

  for (let i = 0; i < lineup.length; i++) {
    const p      = lineup[i];
    const cx     = PAD + i * (cardW + GAP);
    const cy     = cardsY;
    const iconSz = 96 * S;

    ctx.fillStyle = p.color + '1A';
    roundRect(ctx, cx, cy, cardW, cardH, 5 * S); ctx.fill();
    ctx.fillStyle = p.color;
    roundRect(ctx, cx, cy, 3 * S, cardH, 2 * S); ctx.fill();
    ctx.strokeStyle = p.color + '55';
    ctx.lineWidth = S;
    roundRect(ctx, cx, cy, cardW, cardH, 5 * S); ctx.stroke();

    const iconX = cx + 8 * S, iconY = cy + 4 * S;
    if (p.operator?.icon) {
      const opImg = await loadImg(p.operator.icon);
      if (opImg) ctx.drawImage(opImg, iconX, iconY, iconSz, iconSz);
    } else {
      ctx.fillStyle = p.color + '33';
      ctx.beginPath(); ctx.arc(iconX + iconSz/2, iconY + iconSz/2, iconSz/2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.font = `bold ${18*S}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', iconX + iconSz/2, iconY + iconSz/2);
    }

    const tx = iconX + iconSz + 7 * S;
    const tw = cardW - iconSz - 20 * S;

    ctx.fillStyle = '#E8EDF2'; ctx.font = `bold ${17*S}px monospace`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const playerName = clip(`${p.name || `P${i+1}`}  W:${reinforcementCounts[p.slotId] || 0}`, ctx, tw);
    ctx.strokeStyle = '#08090D'; ctx.lineWidth = 4*S; ctx.lineJoin = 'round';
    ctx.strokeText(playerName, tx, cy + 9*S);
    ctx.fillText(playerName, tx, cy + 9*S);
    ctx.fillStyle = p.color; ctx.font = `bold ${14*S}px monospace`;
    const operatorName = clip(p.operator?.name || '-', ctx, tw);
    ctx.strokeText(operatorName, tx, cy + 38*S);
    ctx.fillText(operatorName, tx, cy + 38*S);
    if (p.role) {
      ctx.fillStyle = '#8A9BB0'; ctx.font = `${10*S}px monospace`;
      ctx.fillText(clip(p.role, ctx, tw), tx, cy + 64*S);
    }
    if (p.backups?.length) {
      ctx.fillStyle = '#E8B84B'; ctx.font = `bold ${12*S}px monospace`;
      const backupNames = clip(`★ ${p.backups.map(backup => backup.name).join(', ')}`, ctx, tw);
      ctx.fillText(backupNames, tx, cy + 82*S);
    }

    let gx = cx + 8*S;
    const gadgetY = cy + 104*S;
    for (const gadget of [p.gadget || p.operator?.gadget, p.secondaryGadget].filter(Boolean)) {
      if (gadget?.icon) {
        const gImg = await loadImg(gadget.icon);
        if (gImg) {
          const gadgetSize = 34*S;
          ctx.fillStyle = '#08090D';
          roundRect(ctx, gx, gadgetY, gadgetSize, gadgetSize, 4*S); ctx.fill();
          ctx.strokeStyle = p.color + 'AA'; ctx.lineWidth = 1.5*S;
          roundRect(ctx, gx, gadgetY, gadgetSize, gadgetSize, 4*S); ctx.stroke();
          ctx.drawImage(gImg, gx + 3*S, gadgetY + 3*S, gadgetSize - 6*S, gadgetSize - 6*S);
          gx += gadgetSize + 8*S;
        }
      }
    }
  }
  ctx.textAlign = 'left';
}

export async function renderStratAsPNG(rootEl, meta = {}) {
  if (!rootEl) throw new Error('No root element');

  const { lineup = [], stratName = '', selectedFloor = '', side = 'attack' } = meta;
  const scale = 2;

  const mapCanvas = await exportRootToCanvas(rootEl, scale, meta);
  const cw = mapCanvas.width, ch = mapCanvas.height;
  const panelH = lineup.length > 0 ? lineupPanelHeight(scale) : 0;

  const final = document.createElement('canvas');
  final.width  = cw;
  final.height = ch + panelH;
  const ctx = final.getContext('2d');
  ctx.drawImage(mapCanvas, 0, 0);

  if (lineup.length > 0) {
    await drawLineupPanel(ctx, lineup, { canvasW: cw, mapH: ch, scale, stratName, selectedFloor, side, reinforcementCounts: meta.reinforcementCounts });
  }

  return final;
}

export async function exportStratAsPNG(rootEl, filename = 'strat', meta = {}) {
  const final = await renderStratAsPNG(rootEl, meta);
  const blob = await new Promise(resolve => final.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('PNG encoding failed');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.png`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return final;
}

async function drawTimelinePlayers(ctx, positions, width, height, scale, iconCache) {
  for (const position of positions) {
    const player = position.player;
    const operator = player?.operator;
    if (!player || !operator) continue;
    const cx = pct(position.x, width * scale);
    const cy = pct(position.y, height * scale);
    const size = 36 * scale;
    const radius = size / 2;
    const color = player.color || '#E8B84B';
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,10,14,0.82)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();
    ctx.clip();
    const icon = iconCache.get(operator.icon);
    if (icon) ctx.drawImage(icon, cx - radius, cy - radius, size, size);
    ctx.restore();
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function prepareTimelineRender(rootEl, timeline, meta) {
  const base = await exportRootToCanvas(rootEl, 2, meta);
  const iconCache = new Map();
  const operators = (meta.lineup || []).map(player => player.operator).filter(Boolean);
  await Promise.all([...new Set(operators.map(operator => operator.icon))].map(async src => {
    const image = await loadImg(src);
    if (image) iconCache.set(src, image);
  }));
  return { base, iconCache, duration: Math.max(1, Number(timeline?.duration) || 1) };
}

async function drawTimelineFrame(base, time, duration, timeline, positionsAtTime, iconCache) {
  const canvas = document.createElement('canvas');
  canvas.width = base.width;
  canvas.height = base.height + 48;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#08090D';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(base, 0, 0);
  ctx.fillStyle = '#141B24';
  ctx.fillRect(0, base.height, canvas.width, 48);
  ctx.fillStyle = '#E8B84B';
  ctx.fillRect(0, base.height, canvas.width * Math.min(1, time / duration), 3);
  ctx.fillStyle = '#E8EDF2';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`${time.toFixed(1)}s / ${duration.toFixed(1)}s`, 18, base.height + 32);
  const phase = getActivePhase(timeline, time);
  if (phase) { ctx.fillStyle = phase.color || '#E8B84B'; ctx.fillText(phase.name, 270, base.height + 32); }
  await drawTimelinePlayers(ctx, positionsAtTime(time), base.width / 2, base.height / 2, 2, iconCache);
  return canvas;
}

export async function exportTimelineAsGIF(rootEl, filename, timeline, meta, positionsAtTime) {
  const gifModule = await import('gif.js');
  const GIF = gifModule.default || gifModule;
  const { base, iconCache, duration } = await prepareTimelineRender(rootEl, timeline, meta);
  const frameCount = Math.min(300, Math.max(2, Math.ceil(duration * 5)));
  const delay = Math.max(100, Math.round((duration * 1000) / frameCount));
  const gif = new GIF({
    workers: 2,
    quality: 10,
    repeat: 0,
    width: base.width,
    height: base.height + 48,
    workerScript: `${process.env.PUBLIC_URL || ''}/gif.worker.js`,
  });

  for (let index = 0; index < frameCount; index += 1) {
    const time = duration * (index / (frameCount - 1));
    const frame = await drawTimelineFrame(base, time, duration, timeline, positionsAtTime, iconCache);
    gif.addFrame(frame, { copy: true, delay });
  }

  return new Promise((resolve, reject) => {
    gif.on('finished', blob => {
      downloadBlob(blob, `${filename}.gif`);
      resolve(blob);
    });
    gif.on('error', reject);
    gif.render();
  });
}

export async function exportTimelineAsWebM(rootEl, filename, timeline, meta, positionsAtTime) {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
    throw new Error('WebM export is not supported in this webview');
  }
  const { base, iconCache, duration } = await prepareTimelineRender(rootEl, timeline, meta);
  const canvas = document.createElement('canvas');
  canvas.width = base.width;
  canvas.height = base.height + 48;
  const ctx = canvas.getContext('2d');
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('No supported WebM codec');

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  let interval = null;
  let startedAt = 0;
  const drawFrame = time => {
    ctx.fillStyle = '#08090D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = '#141B24';
    ctx.fillRect(0, base.height, canvas.width, 48);
    ctx.fillStyle = '#E8B84B';
    ctx.fillRect(0, base.height, canvas.width * Math.min(1, time / duration), 3);
    ctx.fillStyle = '#E8EDF2';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`${time.toFixed(1)}s / ${duration.toFixed(1)}s`, 18, base.height + 32);
      const phase = getActivePhase(timeline, time);
      if (phase) { ctx.fillStyle = phase.color || '#E8B84B'; ctx.fillText(phase.name, 270, base.height + 32); }
  };

  return new Promise((resolve, reject) => {
    const cleanup = () => { if (interval) clearInterval(interval); stream.getTracks().forEach(track => track.stop()); };
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = event => { cleanup(); reject(event.error || new Error('MediaRecorder failed')); };
    recorder.onstop = () => {
      cleanup();
      const blob = new Blob(chunks, { type: mimeType });
      downloadBlob(blob, `${filename}.webm`);
      resolve(blob);
    };
    const render = () => {
      const time = Math.min(duration, (performance.now() - startedAt) / 1000);
      drawFrame(time);
      // The player layer is rendered after the base map so movement never
      // mutates or serializes the editor's static strategy state.
      drawTimelinePlayers(ctx, positionsAtTime(time), base.width / 2, base.height / 2, 2, iconCache);
      if (time >= duration) {
        recorder.stop();
        return;
      }
    };
    startedAt = performance.now();
    recorder.start(100);
    render();
    interval = setInterval(render, 33);
  });
}
