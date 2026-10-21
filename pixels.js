/* ===========================================================================
   Lumen Studio — the pixel pipeline, in one place.

   This file is loaded twice: once by the page, and once by pixel-worker.js via
   importScripts. It must therefore stay free of DOM assumptions — makeCanvas
   falls back to OffscreenCanvas when there is no document, and everything here
   operates on a 2D context of either kind.
   =========================================================================== */

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function makeCanvas(w, h) {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  // a worker has no document, so fall back to an OffscreenCanvas there
  if (typeof document === 'undefined' || !document.createElement) return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function filterString(a) {
  const p = [];
  if (a.brightness !== 100) p.push('brightness(' + a.brightness + '%)');
  if (a.contrast !== 100) p.push('contrast(' + a.contrast + '%)');
  if (a.saturate !== 100) p.push('saturate(' + a.saturate + '%)');
  if (a.hue) p.push('hue-rotate(' + a.hue + 'deg)');
  if (a.grayscale) p.push('grayscale(' + a.grayscale + '%)');
  if (a.sepia) p.push('sepia(' + a.sepia + '%)');
  if (a.invert) p.push('invert(' + a.invert + '%)');
  if (a.blur) p.push('blur(' + a.blur + 'px)');
  return p.length ? p.join(' ') : 'none';
}

const CURVE_CH = ['rgb', 'r', 'g', 'b'];

const curveIsIdentity = pts =>
  pts.length === 2 && pts[0].x === 0 && pts[0].y === 0 && pts[1].x === 1 && pts[1].y === 1;

const curveActive = c => !!c && CURVE_CH.some(ch => c[ch] && !curveIsIdentity(c[ch]));

function curveLUT(points) {
  const pts = points.slice().sort((p, q) => p.x - q.x);
  const n = pts.length;
  const lut = new Uint8Array(256);
  if (n < 2) { for (let i = 0; i < 256; i++) lut[i] = i; return lut; }
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const d = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    const h = xs[i + 1] - xs[i];
    d[i] = h > 1e-9 ? (ys[i + 1] - ys[i]) / h : 0;
  }
  const m = new Array(n);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] * d[i] <= 0) ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a1 = m[i] / d[i], b1 = m[i + 1] / d[i], s = a1 * a1 + b1 * b1;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a1 * d[i]; m[i + 1] = t * b1 * d[i]; }
  }
  for (let k = 0; k < 256; k++) {
    const x = k / 255;
    let y;
    if (x <= xs[0]) y = ys[0];
    else if (x >= xs[n - 1]) y = ys[n - 1];
    else {
      let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = h > 1e-9 ? (x - xs[i]) / h : 0;
      const t2 = t * t, t3 = t2 * t;
      y = (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] +
          (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    }
    lut[k] = Math.max(0, Math.min(255, Math.round(y * 255)));
  }
  return lut;
}

const HSL_BANDS = [
  { key: 'red',     center: 0,   label: 'Reds' },
  { key: 'orange',  center: 30,  label: 'Oranges' },
  { key: 'yellow',  center: 60,  label: 'Yellows' },
  { key: 'green',   center: 120, label: 'Greens' },
  { key: 'aqua',    center: 180, label: 'Aquas' },
  { key: 'blue',    center: 240, label: 'Blues' },
  { key: 'purple',  center: 285, label: 'Purples' },
  { key: 'magenta', center: 330, label: 'Magentas' }
];

const hslActive = h => !!h && HSL_BANDS.some(b => { const v = h[b.key]; return v && (v[0] || v[1] || v[2]); });

function buildHueTable(hsl) {
  const tab = new Float32Array(360 * 3);
  for (let h = 0; h < 360; h++) {
    let dh = 0, ds = 0, dl = 0;
    for (let i = 0; i < HSL_BANDS.length; i++) {
      const b = HSL_BANDS[i], v = hsl[b.key];
      if (!v || (!v[0] && !v[1] && !v[2])) continue;
      let dist = Math.abs(h - b.center) % 360;
      if (dist > 180) dist = 360 - dist;
      const w = 1 - dist / 46;
      if (w <= 0) continue;
      dh += v[0] * w; ds += v[1] * w; dl += v[2] * w;
    }
    tab[h * 3] = dh; tab[h * 3 + 1] = ds; tab[h * 3 + 2] = dl;
  }
  return tab;
}

const needsPixel = (a, curve, hsl) => !!(a.exposure || a.temperature || a.tint || a.fade ||
  a.vignette || a.threshold || a.sharpen || a.posterize ||
  a.highlights || a.shadows || a.whites || a.blacks || a.vibrance || a.denoise) ||
  curveActive(curve) || hslActive(hsl);

const lutCache = { curveSig: null, rgb: null, r: null, g: null, b: null, hueSig: null, hue: null };

function prepPixel(ctx, w, h, a, curve, hsl) {
  const ex = Math.pow(2, a.exposure / 100);
  const tp = a.temperature / 100, tn = a.tint / 100;
  const fd = a.fade / 100;
  const th = a.threshold;
  const vig = a.vignette / 100;
  // posterise: quantise each channel to N levels. This is what gives the Anime
  // preset its flat cel-shaded look rather than just "very saturated".
  const post = a.posterize || 0;
  const pq = post > 1 ? 255 / (post - 1) : 255;
  // tonal zones. All zero by default, and the whole block is skipped when they
  // are, so a neutral image costs nothing.
  const sh = a.shadows / 100, hi = a.highlights / 100;
  const wh = a.whites / 100, bk = a.blacks / 100, vib = a.vibrance / 100;
  const useTone = !!(sh || hi || wh || bk || vib);

  // Building the four curve LUTs and the hue table is the same work every
  // frame, so keep the last result and only rebuild when the shape changes.
  const useC = curveActive(curve);
  let Lrgb, Lr, Lg, Lb, useR = false, useG = false, useB = false;
  if (useC) {
    const sig = JSON.stringify(curve);
    if (lutCache.curveSig !== sig) {
      lutCache.curveSig = sig;
      lutCache.rgb = curveLUT(curve.rgb); lutCache.r = curveLUT(curve.r);
      lutCache.g = curveLUT(curve.g); lutCache.b = curveLUT(curve.b);
    }
    Lrgb = lutCache.rgb; Lr = lutCache.r; Lg = lutCache.g; Lb = lutCache.b;
    useR = !curveIsIdentity(curve.r);
    useG = !curveIsIdentity(curve.g);
    useB = !curveIsIdentity(curve.b);
  }
  const useH = hslActive(hsl);
  let hueTab = null;
  if (useH) {
    const hsig = JSON.stringify(hsl);
    if (lutCache.hueSig !== hsig) { lutCache.hueSig = hsig; lutCache.hue = buildHueTable(hsl); }
    hueTab = lutCache.hue;
  }

  /* vignette: squared distance per row and per column, so the inner loop is
     two array reads and a multiply — no sqrt, no hypot */
  let vx = null, vy = null, vinv = 0;
  if (vig) {
    const cx = w / 2, cy = h / 2;
    vinv = vig / ((cx * cx + cy * cy) || 1);
    vx = new Float32Array(w); vy = new Float32Array(h);
    for (let x = 0; x < w; x++) { const dx = x + 0.5 - cx; vx[x] = dx * dx; }
    for (let y = 0; y < h; y++) { const dy = y + 0.5 - cy; vy[y] = dy * dy; }
  }

  /* Adaptive thresholding compares each pixel against its LOCAL average instead
     of one global level, which is what makes text survive uneven lighting on a
     photographed page. One native blur gives us that average cheaply. */
  let localMean = null;
  if (th > 0 && a.adaptive) {
    const lc = makeCanvas(w, h);
    const lx = lc.getContext('2d');
    lx.filter = 'blur(' + Math.max(6, Math.round(Math.min(w, h) * 0.035)) + 'px)';
    lx.drawImage(ctx.canvas, 0, 0);
    lx.filter = 'none';
    localMean = lx.getImageData(0, 0, w, h).data;
  }
  // the threshold slider becomes a bias when adaptive: 128 is neutral
  const biasK = 1 + (128 - th) / 128 * 0.35;
  return { ex, tp, tn, fd, th, post, pq, sh, hi, wh, bk, vib, useTone,
           useC, useR, useG, useB, Lrgb, Lr, Lg, Lb, useH, hueTab,
           vig, vinv, vx, vy, localMean, biasK };
}

function pixelBand(d, w, h, P, y0, y1) {
  const { ex, tp, tn, fd, th, post, pq, sh, hi, wh, bk, vib, useTone,
          useC, useR, useG, useB, Lrgb, Lr, Lg, Lb, useH, hueTab,
          vig, vinv, vx, vy, localMean, biasK } = P;
  let px = 0, py = y0;
  for (let i = y0 * w * 4, end = y1 * w * 4; i < end; i += 4) {
    let r = d[i], g = d[i+1], b = d[i+2];
    if (ex !== 1) { r *= ex; g *= ex; b *= ex; }
    if (tp) { r += tp * 46; b -= tp * 46; }
    if (tn) { g += tn * 40; r -= tn * 18; b -= tn * 18; }
    if (fd) { const lift = fd * 34; r += lift; g += lift; b += lift; }

    if (useTone) {
      let rn = r * (1 / 255), gn = g * (1 / 255), bn = b * (1 / 255);
      if (sh || hi) {
        // Shadows lift the toe but fade out AT black, so true black stays black
        // instead of turning milky. Highlights move the shoulder and fade out at
        // black, so recovery never crushes the shadows.
        const wr = rn * 5 < 1 ? rn * 5 : 1, wg = gn * 5 < 1 ? gn * 5 : 1, wb = bn * 5 < 1 ? bn * 5 : 1;
        rn += sh * 0.55 * (1 - rn) * (1 - rn) * wr + hi * 0.5 * rn * rn;
        gn += sh * 0.55 * (1 - gn) * (1 - gn) * wg + hi * 0.5 * gn * gn;
        bn += sh * 0.55 * (1 - bn) * (1 - bn) * wb + hi * 0.5 * bn * bn;
      }
      // Whites and Blacks move the END POINTS. Weighting by the cube keeps them
      // off the opposite end of the range — scaling the whole ramp would just be
      // a second Brightness control.
      if (wh) {
        rn += wh * 0.4 * rn * rn * rn;
        gn += wh * 0.4 * gn * gn * gn;
        bn += wh * 0.4 * bn * bn * bn;
      }
      if (bk) {
        const cr = (1 - rn) * (1 - rn) * (1 - rn), cg = (1 - gn) * (1 - gn) * (1 - gn), cb = (1 - bn) * (1 - bn) * (1 - bn);
        rn += bk * 0.4 * cr; gn += bk * 0.4 * cg; bn += bk * 0.4 * cb;
      }
      r = rn * 255; g = gn * 255; b = bn * 255;
      if (vib) {
        // vibrance weights by how dull a pixel already is, so a colourful sunset
        // gains far less than flat grey — that is what separates it from Saturation
        const mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
        const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
        const sat = (mx - mn) / 255;
        const k = 1 + vib * 0.6 * (1 - sat);
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = l + (r - l) * k; g = l + (g - l) * k; b = l + (b - l) * k;
      }
    }

    if (useC) {
      if (useR) r = Lr[r < 0 ? 0 : r > 255 ? 255 : r | 0];
      if (useG) g = Lg[g < 0 ? 0 : g > 255 ? 255 : g | 0];
      if (useB) b = Lb[b < 0 ? 0 : b > 255 ? 255 : b | 0];
      r = Lrgb[r < 0 ? 0 : r > 255 ? 255 : r | 0];
      g = Lrgb[g < 0 ? 0 : g > 255 ? 255 : g | 0];
      b = Lrgb[b < 0 ? 0 : b > 255 ? 255 : b | 0];
    }

    if (useH) {
      const rn = r * (1 / 255), gn = g * (1 / 255), bn = b * (1 / 255);
      const mx = rn > gn ? (rn > bn ? rn : bn) : (gn > bn ? gn : bn);
      const mn = rn < gn ? (rn < bn ? rn : bn) : (gn < bn ? gn : bn);
      const dd = mx - mn;
      if (dd > 1e-6) {
        let H;
        if (mx === rn) H = ((gn - bn) / dd) % 6;
        else if (mx === gn) H = (bn - rn) / dd + 2;
        else H = (rn - gn) / dd + 4;
        H *= 60; if (H < 0) H += 360;
        const hi = H | 0;
        const dh = hueTab[hi * 3], ds = hueTab[hi * 3 + 1], dl = hueTab[hi * 3 + 2];
        if (dh || ds || dl) {
          const L = (mx + mn) * 0.5;
          if (dh) {
            /* the expensive branch — only when the hue itself shifts */
            let S = L > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
            H += dh * 0.5; H = ((H % 360) + 360) % 360;
            S = S * (1 + ds / 100); S = S < 0 ? 0 : S > 1 ? 1 : S;
            const L2 = L + dl / 200;
            const q = L2 < 0.5 ? L2 * (1 + S) : L2 + S - L2 * S;
            const p = 2 * L2 - q;
            let tr = H / 360 + 1 / 3, tg = H / 360, tb = H / 360 - 1 / 3;
            if (tr < 0) tr += 1; if (tr > 1) tr -= 1;
            if (tg < 0) tg += 1; if (tg > 1) tg -= 1;
            if (tb < 0) tb += 1; if (tb > 1) tb -= 1;
            r = 255 * (tr < 1/6 ? p + (q - p) * 6 * tr : tr < 1/2 ? q : tr < 2/3 ? p + (q - p) * (2/3 - tr) * 6 : p);
            g = 255 * (tg < 1/6 ? p + (q - p) * 6 * tg : tg < 1/2 ? q : tg < 2/3 ? p + (q - p) * (2/3 - tg) * 6 : p);
            b = 255 * (tb < 1/6 ? p + (q - p) * 6 * tb : tb < 1/2 ? q : tb < 2/3 ? p + (q - p) * (2/3 - tb) * 6 : p);
          } else {
            /* saturation / luminance only: linear, no HSL round trip */
            const l255 = L * 255;
            const k = 1 + ds / 100;
            const base = l255 + dl * 1.275;
            r = (r - l255) * k + base;
            g = (g - l255) * k + base;
            b = (b - l255) * k + base;
          }
        }
      }
    }

    if (vig) {
      const f = 1 - vinv * (vx[px] + vy[py]);
      r *= f; g *= f; b *= f;
    }
    if (th > 0) {
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      let cut = th;
      if (localMean) {
        cut = (0.299 * localMean[i] + 0.587 * localMean[i + 1] + 0.114 * localMean[i + 2]) * biasK - 6;
      }
      const v = l >= cut ? 255 : 0;
      r = g = b = v;
    }
    if (post > 1) {
      r = Math.round(r / pq) * pq;
      g = Math.round(g / pq) * pq;
      b = Math.round(b / pq) * pq;
    }
    d[i]   = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i+1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i+2] = b < 0 ? 0 : b > 255 ? 255 : b;

    if (++px === w) { px = 0; py++; }
  }
}

function bandRows(w, h) {
  return Math.max(2, Math.min(h, Math.ceil(BAND_PIXELS / Math.max(1, w))));
}

function pixelOps(ctx, w, h, a, curve, hsl, skipSharpen) {
  const img = ctx.getImageData(0, 0, w, h);
  const P = prepPixel(ctx, w, h, a, curve, hsl);
  pixelBand(img.data, w, h, P, 0, h);
  ctx.putImageData(img, 0, 0);
  finishDetail(ctx, img, w, h, a, skipSharpen);
}

function finishDetail(ctx, img, w, h, a, skipSharpen) {
  if (a.denoise > 0 && !skipSharpen) denoiseInPlace(ctx, img, w, h, a.denoise / 100);
  if (a.sharpen > 0 && !skipSharpen) {
    sharpenInPlace(ctx, img, w, h, a.sharpen / 100, a.sharpenRadius, a.sharpenThreshold);
  }
}

function sharpenInPlace(ctx, img, w, h, amount, radius, threshold) {
  const bg = makeCanvas(w, h).getContext('2d');
  bg.filter = 'blur(' + (radius || 1.2) + 'px)';
  bg.drawImage(ctx.canvas, 0, 0);
  bg.filter = 'none';
  const blurred = bg.getImageData(0, 0, w, h).data;
  const d = img.data;
  const amt = Math.min(1, amount) * 1.6;
  const thr = threshold || 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const lb = 0.299 * blurred[i] + 0.587 * blurred[i + 1] + 0.114 * blurred[i + 2];
    let detail = l - lb;
    if (thr > 0) {
      const a = detail < 0 ? -detail : detail;
      if (a < thr) continue;                       // noise, not detail
      detail -= detail < 0 ? -thr : thr;
    }
    const add = amt * detail;
    const nr = r + add, ng = g + add, nb = b + add;
    d[i]     = nr < 0 ? 0 : nr > 255 ? 255 : nr;
    d[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
    d[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
  }
  ctx.putImageData(img, 0, 0);
}

function denoiseInPlace(ctx, img, w, h, amount) {
  const bg = makeCanvas(w, h).getContext('2d');
  bg.filter = 'blur(1.4px)';
  bg.drawImage(ctx.canvas, 0, 0);
  bg.filter = 'none';
  const blurred = bg.getImageData(0, 0, w, h).data;
  const d = img.data;
  const k = Math.min(1, amount) * 0.85;
  const edge = 26;                                  // above this it is an edge
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const lb = 0.299 * blurred[i] + 0.587 * blurred[i + 1] + 0.114 * blurred[i + 2];
    let diff = l - lb; if (diff < 0) diff = -diff;
    let wgt = 1 - diff / edge; if (wgt < 0) wgt = 0;
    const m = k * wgt;
    d[i]     = r + (blurred[i] - r) * m;
    d[i + 1] = g + (blurred[i + 1] - g) * m;
    d[i + 2] = b + (blurred[i + 2] - b) * m;
  }
  ctx.putImageData(img, 0, 0);
}

function sharpen(ctx, w, h, amount) {
  sharpenInPlace(ctx, ctx.getImageData(0, 0, w, h), w, h, amount);
}

function paint(ctx, src, w, h, a, curve, hsl, skipSharpen) {
  ctx.filter = filterString(a);
  ctx.drawImage(src, 0, 0, w, h);
  ctx.filter = 'none';
  if (needsPixel(a, curve, hsl)) pixelOps(ctx, w, h, a, curve, hsl, skipSharpen);
}
