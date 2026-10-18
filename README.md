# Lumen Studio

A browser-based image editor for the everyday stuff — crop, resize, rotate, adjust, filter, scan, frame and watermark — in one clean, self-contained page.

**No install, no server, no uploads.** Everything runs locally in the browser on the HTML Canvas API, so images never leave the user's device.

## Features

| Tool | What it does |
|------|--------------|
| **Crop** | Draggable / resizable frame with rule-of-thirds guides, live pixel readout, aspect-ratio locks (Free, 1:1, 4:3, 3:2, 16:9, 9:16, 4:5) |
| **Resize** | Width / height with aspect lock, plus quick 25–400% presets |
| **Transform** | Rotate 90 deg left/right, flip horizontal/vertical, straighten slider (-45 to +45 deg) that auto-expands the canvas |
| **Adjust** | Brightness, contrast, exposure, saturation, temperature, tint, hue, fade, sharpen, blur, vignette, grayscale, sepia, invert + one-click Auto enhance |
| **Filters** | 14 live-thumbnail presets (Vivid, Warm, Cool, Fade, Noir, Vintage, Cinematic, Punch, Matte, Film and more) |
| **Scan** | Document, B&W Text, Grayscale, Whiteboard, Color Scan and Receipt modes with a threshold slider for crisp text |
| **Frame** | Solid border with thickness control and a colour picker |
| **Watermark** | Text watermark with size, opacity, colour, 9-point position grid and a diagonal option |

Plus: multi-image filmstrip, full undo/redo, hold-to-Compare against the original, one-click **Revert to original**, fit / 1:1 / zoom controls, and export to **PNG, JPG, WEBP or AVIF** with quality control.

## Works properly on phones

The mobile layout is built so the photo is never hidden behind the controls:

- The tool panel docks **below** the image as a bottom sheet, in normal document flow — so the canvas shrinks and the image re-fits rather than being covered.
- All eight tools sit in a **horizontally scrollable bar** at the bottom, always within thumb reach.
- Tapping the active tool again (or the grip, or the X) collapses the sheet for a full-screen view.
- Crop handles grow to 20 px for reliable touch dragging.

On desktop the tools panel is **resizable** (drag its left edge) and can be **collapsed** entirely with the sliders button in the top bar.

## Security & privacy

- A strict **Content-Security-Policy** (`default-src 'none'`) blocks outbound connections, plugins, framing, base-URI hijacking and form exfiltration. There is no `connect-src` at all, so the page cannot phone home.
- No third-party scripts and no analytics. The only external request is the Google Fonts stylesheet, and the app degrades gracefully to system fonts without it.
- File names are sanitised before use, thumbnails are built with the DOM API rather than `innerHTML`, and oversized uploads are rejected.
- `Referrer-Policy: no-referrer`.

*Note:* the inline script is allowed via `'unsafe-inline'` in `script-src`, which keeps the single file easy to edit by hand. If you want a hash-pinned policy instead, replace it with `script-src 'sha256-…'` — but you will then need to update the hash whenever the script changes.

## Usage

Open `index.html` in any modern browser. That is the whole app.

- Drag & drop images onto the canvas, paste with `Ctrl+V`, or click **Open**
- `Ctrl+Z` / `Ctrl+Shift+Z` — undo / redo
- `Ctrl+S` — export
- `+` / `-` / `0` — zoom in / out / fit
- `Enter` / `Esc` — apply / reset crop

The **?** button in the top bar lists every shortcut in-app.

## Tech

Single HTML file. Vanilla JavaScript, HTML Canvas, CSS custom properties. No build step, no dependencies, no framework.

## License

MIT
