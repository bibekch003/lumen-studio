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
| **Adjust** | **Tone** (Highlights, Shadows, Whites, Blacks), **Light** (Brightness, Contrast, Exposure, Fade), **Colour** (Saturation, Vibrance, Temperature, Tint, Hue), plus **Detail** (Sharpen with its own radius and threshold, and Denoise), Posterize, Blur, Vignette, Grayscale, Sepia, Invert and one-click Auto enhance |
| **Curves** | Interactive tone-curve editor — RGB composite plus separate R, G and B channels. Click to add a point, drag to shape it, double-click to remove. Monotone cubic interpolation, so the curve never overshoots |
| **HSL** | Per-colour-range grading across 8 bands (reds, oranges, yellows, greens, aquas, blues, purples, magentas), each with hue, saturation and luminance |
| **Filters** | 15 live-thumbnail presets (Anime, Vivid, Warm, Cool, Fade, Noir, Vintage, Cinematic, Punch, Matte, Film and more) |
| **Scan** | Document, B&W Text, Grayscale, Whiteboard, Color Scan and Receipt modes, with a threshold slider and an **adaptive** mode that compares each pixel with its local surroundings instead of one global level |
| **Frame** | Solid border with thickness control and a colour picker |
| **Watermark** | Text watermark with size, opacity, colour, 9-point position grid and a diagonal option |

Plus: multi-image filmstrip, full undo/redo, hold-to-Compare against the original, one-click **Revert to original**, fit / 1:1 / zoom controls, and export to **PNG, JPG, WEBP or AVIF** with quality control.

**Export quality defaults to 100%** for JPG, WebP and AVIF, your last choice is remembered, and there is a
one-click **Reset to 100%**. PNG is lossless, so it shows no quality control at all rather than a dead one.
Quality 100% keeps the most detail the encoder can store — it cannot bring back detail that was never captured.

Export adapts to the browser: formats it cannot encode are shown as unavailable rather than silently producing a file that lies about its contents. Because JPEG has no alpha channel, exporting a transparent image to JPEG composites it onto a **configurable background colour** (white by default) instead of black.

The top bar keeps **Add** and **Remove** next to Export, so managing images never means hunting through menus.

## Settings

Tap the gear beside the logo. Everything is stored locally and takes effect immediately:

| Setting | What it does |
|---|---|
| **Theme** | System, Light or Dark. The theme is applied before the first paint, so there is no flash on load |
| **Reduce transparency** | Drops the frosted blur. The single biggest speed-up on older phones |
| **Reduce motion** | Stops the logo glow and the panel animations |
| **Preview quality** | Fast / Balanced / High — how much work goes into the live preview. Exports are always full resolution |
| **Default format** | What the export dialog opens with |
| **Autosave** | Keeps your session so a crash or refresh never loses work |
| **Clear all** | Wipes the library and the session from this device |

## Your library

The library has a **search box**, a **newest / name sort**, and shows how much is stored on the device.
**Nothing to hunt for: tap the logo.** The logo in the top bar opens your library — every image you
export is filed there automatically, with the edit state intact, so you can reopen it later and keep working
on it non-destructively rather than starting from a flattened copy. It is stored in the browser's IndexedDB:
local, offline, and never uploaded.

Saving also **starts a fresh edit** by default, so you can move straight on to the next image without
losing anything — both behaviours are toggles in the export dialog.

## Interface

The chrome is iOS-style glass: translucent bars that float over the canvas, with the frosted blur
reserved for that chrome — never the image, so the GPU cost stays on small surfaces.

A **style bar** floats along the bottom of the canvas with every preset one tap away. Tapping a pill
previews it live; **Apply** commits it to history as a single step. A pill only stays lit while the
adjustments exactly match that preset, so the bar always tells the truth about what you are looking at.

Glass needs something behind it to blur, so the app sits on a soft radial gradient rather than flat black.
The type stack prefers the real system font (SF Pro on iPhone and Mac) and falls back to Figtree elsewhere.

## Colour controls

The tonal controls are deliberately separated rather than folded into one brightness slider:

- **Shadows** lift the dark end but fade out *at* black, so true black stays black instead of going milky.
- **Highlights** move the shoulder and fade out at black, so recovering blown highlights never crushes the shadows.
- **Whites** and **Blacks** move the end points of the range — weighting them by the cube keeps them off the opposite end, so they are not just a second Brightness control.
- **Vibrance** weights its boost by how dull a pixel already is. Measured: a near-grey pixel gains ~50% saturation while an already-vivid one gains ~13%, which is what separates it from Saturation.

Every control is **exactly neutral at 0**, every slider has its own reset (double-click its label), and each is verified to stay monotonic so the ramp never inverts.

## Magic Edit

A **Magic Edit** button in the top bar opens a panel where you describe the result you want in plain
language, or pick one of eight goals: **Natural, Cinematic, Brighten, Product, Portrait, Vintage, Restore,
Artistic**.

It is a **local, rule-based planner — not an AI model**, and the panel says so. It measures the image
(darkness, contrast, clipping, saturation, colour cast, skin presence, noise, sharpness) and proposes only
the adjustments that image actually needs:

- A **dark** frame gets **shadow recovery**, not a blanket brightness lift — a blanket lift would wash out
  the highlights it already has.
- An **already-vivid** image is **pulled back** rather than pushed further into saturation.
- **"keep the skin tones natural"** is understood: it selects Cinematic *and* holds the colour changes back.
- **"keep the colours unchanged"** removes the colour adjustments from the plan entirely.

Every proposed adjustment is listed with the reason it was chosen, and each one can be switched off or
fine-tuned with its own slider. There is a live before/after preview, a strength control, and **Reset to
original** which restores the exact original pixels *and dimensions* — not just zeroed sliders.

Because it is a local planner, nothing is uploaded and it works offline. A genuine AI mode would need a
secure backend to hold the credentials; this app deliberately has none, because an API key in the page
would be visible to anyone.

## Performance notes

- **Undo/redo is instant.** The canvas at each history index is cached (bounded at 150 MB), so stepping
  back and forth is a pointer swap rather than a full recompute — measured 1522 ms → 1–3 ms at the
  3200px maximum.
- **Commits do not grow with history depth.** A new edit resumes from the nearest cached step, so it
  costs one operation rather than replaying the whole stack — 1205 ms → 254 ms at depth 3.
- **Exporting shows a "Rendering at full resolution" state** before it starts, so a long export never
  looks like a dead tab.

*Known limit:* a full-resolution commit still does its pixel work on the main thread and can block for
roughly a quarter of a second on a large image. Moving the pipeline to a Web Worker with OffscreenCanvas
is the fix; it needs testing on real hardware before it can be trusted.

## Detail: sharpen and denoise

Both are built on the browser's own blur, so they cost one native blur pass plus a single loop.

**Sharpen works on luminance only** and applies the same delta to R, G and B. Sharpening each channel
independently is what puts red/cyan fringes on high-contrast edges, because the channels disagree. Its
**threshold** then leaves low-contrast areas alone: measured on a noisy field, sharpening alone doubled
the noise (7.55 → 16.34) while sharpening with a threshold of 30 left it untouched at 7.55, so grain is
not amplified along with real detail. Its **radius** sets the scale of the detail being lifted.

**Denoise** blends each pixel toward its local average, but only as far as the local detail is small —
flat areas where noise lives get smoothed, anything with real contrast is left alone. Measured: noise
reduced 46% (7.55 → 4.08) while a hard edge kept **97.9%** of its contrast, so edges and fine texture
survive instead of turning to plastic.

**Adaptive scanning** is the difference between a usable and an unusable photo of a page. On a synthetic
page lit from one side with text across it, a global threshold recovered the text with **55% error** —
losing strokes entirely in the dark and bright ends — while the adaptive threshold recovered it with
**0% error**.

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

The service worker (`sw.js`) uses a **network-first strategy for the page itself**, so whenever you push a change to this repo it goes live the next time the app is opened — no store, no review, no waiting. Everything else is cache-first, so the app keeps working with no connection at all.

Users are told when there is something new. If a newer version reaches the device while the app is open, a banner appears at the top — *"Lumen Studio 1.0.1 is available — you are on 1.0.0"* — with **Reload** and **Later** buttons. Reload is never forced, so an edit in progress is never thrown away. The same state is shown in **Help → About**, which also has a **Check for updates** button.

If you edit the precache list in `sw.js`, run `npm run validate` so CI catches anything that no longer exists.

## Security & privacy

- A strict **Content-Security-Policy** (`default-src 'none'`) blocks outbound connections, plugins, framing, base-URI hijacking and form exfiltration. There is no `connect-src` at all, so the page cannot phone home.
- The only permissions granted beyond that are `manifest-src 'self'` and `worker-src 'self'`, which the PWA needs.
- **No third-party requests at all.** The app loads its own files and nothing else — fonts come from the device (SF Pro on Apple hardware, Segoe UI / Roboto elsewhere). Verified: a full page load issues two same-origin requests and zero external ones.
- File names are sanitised before use, thumbnails are built with the DOM API rather than `innerHTML`, and oversized uploads are rejected.
- `Referrer-Policy: no-referrer`.

*Note:* `script-src` pins the inline scripts by **SHA-256 hash** rather than `'unsafe-inline'`. Editing the script therefore invalidates the hash — run `node scripts/lib/csp.mjs index.html` to refresh it, and `npm run validate` fails loudly if it is ever stale. The release script does this automatically. If a hash ever does go stale, the page shows a "could not start" panel instead of a blank screen.

## Versioning and releases

Versions follow [Semantic Versioning](https://semver.org/) and are **never written by hand**:

```bash
npm run release patch     # 1.1.0 -> 1.1.1   bug fixes, small errors, security fixes
npm run release minor     # 1.1.1 -> 1.2.0   new features, backwards compatible
npm run release major     # 1.2.0 -> 2.0.0   breaking changes
```

Each run computes the next version from `package.json`, refuses to reuse a tag that already exists, rewrites every piece of version metadata, generates release notes from the commit log, commits, and creates an annotated git tag. **It does not push or publish unless you pass `--push`** — see [`docs/RELEASING.md`](docs/RELEASING.md) for the full picture, including prereleases (`2.0.0-beta.1`) and releasing from GitHub Actions without a local checkout.

The build number is a monotonically increasing integer that maps onto the native identifiers you will need later: Android `versionCode`, iOS `CFBundleVersion`, and the service-worker cache name.

## Files

```
index.html              the whole application
manifest.webmanifest    PWA metadata
sw.js                   service worker (offline + updates)
version.json            machine-readable version + build record
package.json            version source of truth (no dependencies)
CHANGELOG.md            generated from commit messages
docs/RELEASING.md       how the release system works
scripts/release.mjs     the release engine
scripts/validate.mjs    consistency checks, also run by CI
scripts/serve.mjs       local dev server (service workers need http://)
scripts/lib/semver.mjs  dependency-free SemVer helpers
.github/workflows/      release (manual, dry-run first) + validate on push
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
