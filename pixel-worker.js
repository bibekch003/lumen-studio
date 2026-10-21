/* ===========================================================================
   Lumen Studio — pixel worker.

   Two jobs, both of which keep expensive canvas work off the main thread:

     setOriginal  keep a pristine copy of the image so a replay never has to
                  transfer pixels in — only the (tiny) operation list goes over
     replay       rebuild the image from the operation stack
     paint        render one frame with an adjustment set (used by export)

   Everything it calls lives in pixels.js, so it is the same code the main
   thread would run — there is no second implementation to drift.
   =========================================================================== */
importScripts('pixels.js');

let wOriginal = null, wW = 0, wH = 0;

self.onmessage = function (e) {
  const d = e.data;
  try {
    if (d.cmd === 'setOriginal') {
      // build our own canvas: a canvas with a context cannot be transferred in
      wOriginal = new OffscreenCanvas(Math.max(1, d.w), Math.max(1, d.h));
      wOriginal.getContext('2d').drawImage(d.bitmap, 0, 0);
      if (d.bitmap && d.bitmap.close) d.bitmap.close();
      wW = d.w; wH = d.h;
      self.postMessage({ id: d.id, ok: true });
      return;
    }

    if (d.cmd === 'replay') {
      if (!wOriginal) throw new Error('no original');
      let c = makeCanvas(wW, wH);
      c.getContext('2d').drawImage(wOriginal, 0, 0);
      for (let i = 0; i <= d.index; i++) c = applyOp(c, d.ops[i]);
      const out = c.transferToImageBitmap();
      self.postMessage({ id: d.id, ok: true, bitmap: out, w: c.width, h: c.height }, [out]);
      return;
    }

    // one-off: paint a single frame with an adjustment set
    const oc = new OffscreenCanvas(Math.max(1, d.w), Math.max(1, d.h));
    const ctx = oc.getContext('2d');
    paint(ctx, d.bitmap, d.w, d.h, d.adj, d.curve, d.hsl, d.skipDetail);
    if (d.bitmap && d.bitmap.close) d.bitmap.close();
    const out = oc.transferToImageBitmap();
    self.postMessage({ id: d.id, ok: true, bitmap: out }, [out]);
  } catch (err) {
    self.postMessage({ id: d.id, ok: false, error: String((err && err.message) || err) });
  }
};
