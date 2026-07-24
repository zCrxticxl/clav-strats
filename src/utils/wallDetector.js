// Detect yellow reinforcement markers from simplified blueprint images.
// Pipeline: yellow pixel mask -> flood-fill -> wall-shaped filter -> merge.
// Small gaps between aligned segments become DOORS; clusters of short
// dashes that bound a square become HATCHES.

async function loadImageToCanvas(src, maxSide) {
  const img = new Image();
  // NOTE: do NOT set crossOrigin for same-origin images. CRA's dev server does
  // not return CORS headers, and an "anonymous" request to a server that
  // doesn't ack CORS will fail the image load entirely. Same-origin images
  // don't taint the canvas anyway.
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('Failed to load blueprint: ' + src));
    img.src = src;
  });
  const a = img.naturalWidth / img.naturalHeight;
  const width  = a >= 1 ? maxSide : Math.round(maxSide * a);
  const height = a >= 1 ? Math.round(maxSide / a) : maxSide;
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);
  let imageData;
  try { imageData = ctx.getImageData(0, 0, width, height); }
  catch { throw new Error('Cannot read pixels - image must be same-origin or CORS-enabled'); }
  return { width, height, data: imageData.data };
}

const idx = (w, x, y) => y * w + x;

function rgbToHsv(r, g, b) {
  const rr = r/255, gg = g/255, bb = b/255;
  const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb), d = mx - mn;
  let h = 0;
  if (d !== 0) {
    if (mx === rr) h = 60 * (((gg - bb) / d + 6) % 6);
    else if (mx === gg) h = 60 * (((bb - rr) / d) + 2);
    else h = 60 * (((rr - gg) / d) + 4);
  }
  return { h, s: mx === 0 ? 0 : d / mx, v: mx };
}

function isYellow(r, g, b, cfg) {
  const hsv = rgbToHsv(r, g, b);
  return hsv.h >= cfg.minHue && hsv.h <= cfg.maxHue
      && hsv.s >= cfg.minSaturation && hsv.v >= cfg.minValue;
}

function buildYellowMask(data, width, height, cfg) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(width, x, y) * 4;
      if (isYellow(data[i], data[i+1], data[i+2], cfg)) mask[idx(width, x, y)] = 1;
    }
  }
  return mask;
}

function flood(mask, width, height, sx, sy, visited) {
  const queue = [[sx, sy]];
  visited[idx(width, sx, sy)] = 1;
  let head = 0, count = 0;
  let minX = sx, maxX = sx, minY = sy, maxY = sy;
  while (head < queue.length) {
    const [x, y] = queue[head++];
    count++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    for (let ny = Math.max(0, y-1); ny <= Math.min(height-1, y+1); ny++) {
      for (let nx = Math.max(0, x-1); nx <= Math.min(width-1, x+1); nx++) {
        const k = idx(width, nx, ny);
        if (!mask[k] || visited[k]) continue;
        visited[k] = 1;
        queue.push([nx, ny]);
      }
    }
  }
  return { count, minX, minY, maxX, maxY };
}

function normalize(c) {
  const w = c.maxX - c.minX + 1, h = c.maxY - c.minY + 1;
  return { ...c, width: w, height: h, aspect: w / h,
    centerX: (c.minX + c.maxX) / 2, centerY: (c.minY + c.maxY) / 2,
    horizontal: w >= h };
}

function isWall(s, cfg) {
  const lo = Math.max(s.width, s.height), sh = Math.min(s.width, s.height);
  const fill = s.count / (s.width * s.height);
  return s.count >= cfg.minPixels
      && lo >= cfg.minLongSidePx && sh >= cfg.minShortSidePx && sh <= cfg.maxShortSidePx
      && fill >= cfg.minFill
      && (s.aspect >= cfg.minAspect || s.aspect <= 1 / cfg.minAspect);
}

function canMerge(a, b, cfg) {
  if (a.horizontal !== b.horizontal) return false;
  if (a.horizontal) {
    const aligned = Math.abs(a.centerY - b.centerY) <= cfg.alignTolerancePx;
    const gap = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX) - 1);
    const ov  = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
    return aligned && (gap <= cfg.mergeGapPx || ov >= -cfg.overlapTolerancePx);
  }
  const aligned = Math.abs(a.centerX - b.centerX) <= cfg.alignTolerancePx;
  const gap = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY) - 1);
  const ov  = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  return aligned && (gap <= cfg.mergeGapPx || ov >= -cfg.overlapTolerancePx);
}

function mergeSegments(segments, cfg) {
  const sorted = [...segments].sort((a, b) => {
    if (a.horizontal !== b.horizontal) return a.horizontal ? -1 : 1;
    return a.horizontal ? a.centerY - b.centerY || a.minX - b.minX
                        : a.centerX - b.centerX || a.minY - b.minY;
  });
  const groups = [];
  for (const s of sorted) {
    let merged = false;
    for (const g of groups) {
      if (canMerge(g, s, cfg)) {
        g.minX = Math.min(g.minX, s.minX); g.minY = Math.min(g.minY, s.minY);
        g.maxX = Math.max(g.maxX, s.maxX); g.maxY = Math.max(g.maxY, s.maxY);
        g.count += s.count; g.parts += 1;
        g.centerX = (g.minX + g.maxX) / 2; g.centerY = (g.minY + g.maxY) / 2;
        g.width = g.maxX - g.minX + 1; g.height = g.maxY - g.minY + 1;
        merged = true; break;
      }
    }
    if (!merged) groups.push({ ...s, parts: 1 });
  }
  return groups.filter(g => Math.max(g.width, g.height) >= cfg.minMergedLongSidePx);
}

function dedupe(items, distancePct) {
  const out = [];
  for (const it of items) {
    if (out.some(e => e.type === it.type && e.horizontal === it.horizontal
        && Math.hypot(e.x - it.x, e.y - it.y) < distancePct)) continue;
    out.push(it);
  }
  return out;
}

// Find doors as small gaps between aligned wall segments.
function findDoors(segments, cfg) {
  const groupBy = (items, getKey) => {
    const groups = [];
    items.forEach(it => {
      const g = groups.find(grp => Math.abs(getKey(grp[0]) - getKey(it)) <= cfg.alignTolerancePx);
      if (g) g.push(it); else groups.push([it]);
    });
    return groups;
  };
  const doors = [];
  groupBy(segments.filter(s => s.horizontal), s => s.centerY).forEach(g => {
    g.sort((a, b) => a.minX - b.minX);
    for (let i = 0; i < g.length - 1; i++) {
      const a = g[i], b = g[i+1];
      const gap = b.minX - a.maxX - 1;
      if (gap >= cfg.doorMinGapPx && gap <= cfg.doorMaxGapPx)
        doors.push({ centerX: (a.maxX + b.minX) / 2, centerY: (a.centerY + b.centerY) / 2, horizontal: true });
    }
  });
  groupBy(segments.filter(s => !s.horizontal), s => s.centerX).forEach(g => {
    g.sort((a, b) => a.minY - b.minY);
    for (let i = 0; i < g.length - 1; i++) {
      const a = g[i], b = g[i+1];
      const gap = b.minY - a.maxY - 1;
      if (gap >= cfg.doorMinGapPx && gap <= cfg.doorMaxGapPx)
        doors.push({ centerX: (a.centerX + b.centerX) / 2, centerY: (a.maxY + b.minY) / 2, horizontal: false });
    }
  });
  return doors;
}

// Find hatches: clusters of short dashes that bound a square.
function findHatches(allSegments, cfg) {
  const shorts = allSegments.filter(s => {
    const lo = Math.max(s.width, s.height);
    return lo < cfg.hatchMaxDashPx && lo >= cfg.hatchMinDashPx;
  });
  if (shorts.length < cfg.hatchMinDashes) return [];
  const out = [];
  const used = new Set();
  for (let i = 0; i < shorts.length; i++) {
    if (used.has(i)) continue;
    const seed = shorts[i];
    const cl = [];
    for (let j = 0; j < shorts.length; j++) {
      if (used.has(j)) continue;
      const d = Math.hypot(shorts[j].centerX - seed.centerX, shorts[j].centerY - seed.centerY);
      if (d <= cfg.hatchClusterRadiusPx) cl.push(j);
    }
    if (cl.length < cfg.hatchMinDashes || cl.length > cfg.hatchMaxDashes) continue;
    let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
    for (const k of cl) {
      const s = shorts[k];
      if (s.minX < mnX) mnX = s.minX;
      if (s.minY < mnY) mnY = s.minY;
      if (s.maxX > mxX) mxX = s.maxX;
      if (s.maxY > mxY) mxY = s.maxY;
    }
    const w = mxX - mnX, h = mxY - mnY;
    const ar = Math.max(w, h) / Math.max(1, Math.min(w, h));
    if (ar >= cfg.hatchMaxAspect) continue;
    if (w < cfg.hatchMinSidePx || w > cfg.hatchMaxSidePx) continue;
    if (h < cfg.hatchMinSidePx || h > cfg.hatchMaxSidePx) continue;
    const cx = (mnX + mxX) / 2, cy = (mnY + mxY) / 2;
    const quadrants = [0, 0, 0, 0];
    for (const k of cl) {
      const s = shorts[k];
      const qx = s.centerX < cx ? 0 : 1;
      const qy = s.centerY < cy ? 0 : 1;
      quadrants[qy * 2 + qx]++;
    }
    const occupied = quadrants.filter(q => q > 0).length;
    if (occupied < 3) continue;
    out.push({
      centerX: cx, centerY: cy,
      minX: mnX, minY: mnY, maxX: mxX, maxY: mxY,
      horizontal: false,
    });
    cl.forEach(k => used.add(k));
  }
  return out;
}

// ── Shared analysis: load image once, return raw segments + dimensions ────
async function analyze(src, cfg) {
  const { width, height, data } = await loadImageToCanvas(src, cfg.workingWidth);
  const mask = buildYellowMask(data, width, height, cfg);
  const visited = new Uint8Array(width * height);
  const segments = [];
  const allSegments = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = idx(width, x, y);
      if (!mask[k] || visited[k]) continue;
      const seg = normalize(flood(mask, width, height, x, y, visited));
      allSegments.push(seg);
      if (isWall(seg, cfg)) segments.push(seg);
    }
  }
  return { segments, allSegments, width, height };
}

const DEFAULT_CFG = {
  workingWidth: 1800,
  minHue: 34, maxHue: 62,
  minSaturation: 0.35, minValue: 0.35,
  minPixels: 35, minFill: 0.16,
  minLongSidePx: 10, minMergedLongSidePx: 20,
  minShortSidePx: 2, maxShortSidePx: 26,
  minAspect: 1.35,
  alignTolerancePx: 8, mergeGapPx: 18, overlapTolerancePx: 4,
  dedupePct: 1.2,
  doorMinGapPx: 3, doorMaxGapPx: 14,
  hatchMinDashPx: 3, hatchMaxDashPx: 24,
  hatchClusterRadiusPx: 120, hatchMinSidePx: 22, hatchMaxSidePx: 110,
  hatchMinDashes: 6, hatchMaxDashes: 12, hatchMaxAspect: 1.35,
};

// ── Public APIs ───────────────────────────────────────────────────────────

// Walls only (legacy, used by some callers).
export async function detectReinforcementMarkers(src, opts = {}) {
  const cfg = { ...DEFAULT_CFG, ...opts };
  const { segments, width, height } = await analyze(src, cfg);
  const merged = mergeSegments(segments, cfg);
  let id = Date.now();
  const markers = merged.map(w => ({
    id: id++, type: 'wall',
    x: +(100 * w.centerX / width).toFixed(2),
    y: +(100 * w.centerY / height).toFixed(2),
    horizontal: w.horizontal,
  }));
  return dedupe(markers, cfg.dedupePct);
}

// Walls only — each yellow blob becomes one clickable marker.
// Door/hatch detection is opt-in via opts.doors=true / opts.hatches=true
// because automatic detection of those produces too many false positives.
//
// The simpler "each yellow segment = one wall" model gives the user
// predictable markers: what they see yellow on the blueprint is what they
// can click. No merging means the marker dimensions exactly match the
// yellow segment they see.
export async function detectWalls(src, opts = {}) {
  const cfg = { ...DEFAULT_CFG, ...opts };
  const { segments, allSegments, width, height } = await analyze(src, cfg);
  let id = Date.now();

  const wallMk = (s) => ({
    id: id++, type: 'wall',
    x: +(100 * s.centerX / width).toFixed(2),
    y: +(100 * s.centerY / height).toFixed(2),
    w: +(100 * s.width  / width).toFixed(2),
    h: +(100 * s.height / height).toFixed(2),
    horizontal: s.horizontal,
  });

  // 1:1 — every yellow segment that passes the wall filter becomes a marker.
  // No merging, no door/hatch heuristics.
  const walls = dedupe(segments.map(wallMk), cfg.dedupePct);

  // Doors: only run when explicitly enabled, AND require both flanking walls
  // to be long enough that the gap is plausibly a real door rather than two
  // unrelated yellow specks happening to align.
  let doors = [];
  if (opts.doors) {
    const minWallPx = cfg.minLongSidePx * 2; // strict: wall must be solidly long
    const longSegs = segments.filter(s =>
      Math.max(s.width, s.height) >= minWallPx);
    const doorRaw = findDoors(longSegs, {
      ...cfg,
      alignTolerancePx: Math.max(2, cfg.alignTolerancePx - 4), // tighter alignment
      doorMinGapPx: 2,
      doorMaxGapPx: 10, // narrower gap window
    });
    const doorMk = (s) => ({
      id: id++, type: 'door',
      x: +(100 * s.centerX / width).toFixed(2),
      y: +(100 * s.centerY / height).toFixed(2),
      w: 1.4, h: 1.4,
      horizontal: s.horizontal ?? false,
    });
    doors = dedupe(doorRaw.map(doorMk), cfg.dedupePct);
  }

  // Hatches: same — opt-in only, since dashed-square detection is noisy.
  let hatches = [];
  if (opts.hatches) {
    const hatchRaw = findHatches(allSegments, cfg);
    const hatchMk = (s) => {
      const hw = (s.maxX != null && s.minX != null) ? s.maxX - s.minX : 30;
      const hh = (s.maxY != null && s.minY != null) ? s.maxY - s.minY : 30;
      return {
        id: id++, type: 'hatch',
        x: +(100 * s.centerX / width).toFixed(2),
        y: +(100 * s.centerY / height).toFixed(2),
        w: +(100 * hw / width).toFixed(2),
        h: +(100 * hh / height).toFixed(2),
        horizontal: false,
      };
    };
    hatches = dedupe(hatchRaw.map(hatchMk), cfg.dedupePct * 2);
  }

  return { walls, doors, hatches };
}
