/* ===========================================================================
   Lumen Studio — pixel worker.

   Runs the full paint pipeline off the main thread. The expensive parts are
   getImageData / putImageData and the blur passes; keeping them here means the
   interface never waits on them. The canvas is transferred as an ImageBitmap,
   which crosses threads as a handle rather than a copy of the pixels.
   =========================================================================== */
importScripts('pixels.js');

self.onmessage = function (e) {
  const d = e.data;
  try {
    const oc = new OffscreenCanvas(Math.max(1, d.w), Math.max(1, d.h));
    const ctx = oc.getContext('2d');
    // exactly the same call the main thread would make — no second code path
    paint(ctx, d.bitmap, d.w, d.h, d.adj, d.curve, d.hsl, d.skipDetail);
    if (d.bitmap && d.bitmap.close) d.bitmap.close();
    const out = oc.transferToImageBitmap();
    self.postMessage({ id: d.id, ok: true, bitmap: out }, [out]);
  } catch (err) {
    self.postMessage({ id: d.id, ok: false, error: String((err && err.message) || err) });
  }
};
