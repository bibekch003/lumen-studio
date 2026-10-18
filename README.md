# Lumen Studio

A browser-based image editor for the everyday stuff — crop, resize, rotate, adjust, filter, scan, frame and watermark — in one clean, self-contained page.

**No install, no server, no uploads.** Everything runs locally in the browser on the HTML Canvas API, so images never leave the user's device.

It is also an installable **Progressive Web App**: open the site, tap **Install**, and it runs full screen with an app icon, works completely offline, and updates itself.

## Features

| Tool | What it does |
|------|--------------|
| **Crop** | Draggable / resizable frame with rule-of-thirds guides, live pixel readout, aspect-ratio locks (Free, 1:1, 4:3, 3:2, 16:9, 9:16, 4:5) |
| **Resize** | Width / height with aspect lock, plus quick 25–400% presets |
| **Transform** | Rotate 90 deg left/right, flip horizontal/vertical, straighten slider (-45 to +45 deg) that auto-expands the canvas |
| **Adjust** | Brightness, contrast, exposure, saturation, temperature, tint, hue, fade, sharpen, blur, vignette, grayscale, sepia, invert + one-click Auto enhance |
| **Curves** | Interactive tone-curve editor — RGB composite plus separate R, G and B channels. Click to add a point, drag to shape it, double-click to remove. Monotone cubic interpolation, so the curve never overshoots |
| **HSL** | Per-colour-range grading across 8 bands (reds, oranges, yellows, greens, aquas, blues, purples, magentas), each with hue, saturation and luminance |
| **Filters** | 14 live-thumbnail presets (Vivid, Warm, Cool, Fade, Noir, Vintage, Cinematic, Punch, Matte, Film and more) |
| **Scan** | Document, B&W Text, Grayscale, Whiteboard, Color Scan and Receipt modes with a threshold slider for crisp text |
| **Frame** | Solid border with thickness control and a colour picker |
| **Watermark** | Text watermark with size, opacity, colour, 9-point position grid and a diagonal option |

Plus: multi-image filmstrip, full undo/redo, hold-to-Compare against the original, one-click **Revert to original**, fit / 1:1 / zoom controls, and export to **PNG, JPG, WEBP or AVIF** with quality control.

## Non-destructive editing

Every change is a step in a history stack, replayed from the untouched original — so undo/redo never degrades quality, and **Revert** restores the original exactly.

Curves and HSL follow the same principle: they are **live** while you adjust them, so you can go back and reshape a curve at any point. Pressing **Apply** commits the current look as one history step and returns the controls to neutral, so you can keep grading on top without ever flattening the file.

## Autosave and crash recovery

Your session is written to the browser's IndexedDB a moment after each change — the original files, the edit history, curves and HSL settings. Close the tab, crash the browser, or lose power: reopening the app brings the work back and tells you it did. Removing all images clears the saved session.

## Install it as an app

- **Android / Chrome** — tap **Install** in the top bar, or browser menu -> *Install app*
- **iPhone / iPad** — Share -> *Add to Home Screen*
- **Desktop** — the install icon at the right end of the address bar

## Works properly on phones

The layout is decided from **device signals** (touch capability and pointer type), not just viewport width. That matters because Chrome's *Request desktop site* mode spoofs a ~980px viewport, which would otherwise force the desktop UI onto a phone — including inside the installed app. A touch device with a phone-sized screen always gets the compact layout.

- The tool panel docks **below** the image as a bottom sheet, in normal document flow, so the canvas shrinks and the image re-fits rather than being covered.
- All eight tools sit in a **horizontally scrollable bar** at the bottom, within thumb reach.
- Tapping the active tool again (or the grip, or the X) collapses the sheet.

On desktop the tools panel is **resizable** (drag its left edge) and can be **collapsed** entirely.

## Performance

Heavy pixel work (HSL, curves, sharpen) is done in a single tight loop over the image data. While you drag a slider the app renders a **smaller preview** and switches back to full resolution the moment you let go, so grading stays responsive on large images. Measured at 1.6 megapixels, the full curve + HSL pass takes roughly 140 ms.

## How updates work

The service worker (`sw.js`) uses a **network-first strategy for the page itself**, so whenever you push a change to this repo it goes live the next time the app is opened — no store, no review, no waiting. Everything else is cache-first, so the app keeps working with no connection at all. When a new version takes over, the running page shows a *"New version ready — reopen to use it"* notice rather than reloading and discarding an edit in progress.

If you edit the precache list in `sw.js`, bump the `VERSION` constant.

## Security & privacy

- A strict **Content-Security-Policy** (`default-src 'none'`) blocks outbound connections, plugins, framing, base-URI hijacking and form exfiltration. There is no `connect-src` at all, so the page cannot phone home.
- The only permissions granted beyond that are `manifest-src 'self'` and `worker-src 'self'`, which the PWA needs.
- No third-party scripts and no analytics. The only external request is the Google Fonts stylesheet, and the app degrades to system fonts without it.
- File names are sanitised before use, thumbnails are built with the DOM API rather than `innerHTML`, and oversized uploads are rejected.
- `Referrer-Policy: no-referrer`.

*Note:* the inline script is allowed via `'unsafe-inline'` in `script-src`, which keeps the single file easy to edit by hand. If you want a hash-pinned policy instead, replace it with `script-src 'sha256-...'` — but you will then need to update the hash whenever the script changes.

## Files

```
index.html              the whole application
manifest.webmanifest    PWA metadata
sw.js                   service worker (offline + updates)
favicon.ico
icons/                  icon set (192, 512, maskable, apple-touch)
```

## Usage

- Drag & drop images onto the canvas, paste with `Ctrl+V`, or click **Open**
- `Ctrl+Z` / `Ctrl+Shift+Z` — undo / redo
- `Ctrl+S` — export
- `+` / `-` / `0` — zoom in / out / fit
- `Enter` / `Esc` — apply / reset crop

The **?** button in the top bar lists every shortcut in-app.

## Roadmap

Done: crop, resize, transform, adjustments, curves, HSL, filters, scan, frame, watermark, non-destructive history, autosave/crash recovery, PWA with offline support.

Next: a full layer stack with masks, a WebGL render pipeline, TIFF/PSD/PDF support, then optionally background removal and cloud features.

## Tech

Single HTML file plus a manifest and service worker. Vanilla JavaScript, HTML Canvas, CSS custom properties. No build step, no dependencies, no framework.

## License

MIT
