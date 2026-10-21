# Changelog

All notable changes to Lumen Studio. Generated automatically from commit messages — do not edit by hand.

## v1.13.0 — 2026-10-21

### Features
- cancellable long jobs; polish: snap the type, radius and spacing scales and lay out section hints on their own line ([`c75d800`](https://github.com/bibekch003/lumen-studio/commit/c75d800))

## v1.12.0 — 2026-10-21

### Performance
- run the whole edit-stack rebuild in the Web Worker, so commits no longer block the main thread ([`2ac19c6`](https://github.com/bibekch003/lumen-studio/commit/2ac19c6))

## v1.11.0 — 2026-10-21

### Features
- presets and copy/paste adjustments, logo and tiled watermarks with free rotation, page-edge detection for scans, and accessible names on every control ([`4bda687`](https://github.com/bibekch003/lumen-studio/commit/4bda687))

## v1.10.0 — 2026-10-21

### Features
- live histogram with clipping readouts and a clipping-warning overlay, plus deterministic film grain ([`8df9377`](https://github.com/bibekch003/lumen-studio/commit/8df9377))

## v1.9.0 — 2026-10-21

### Performance
- move the pixel pipeline into a shared module and run full-resolution export in a Web Worker with OffscreenCanvas ([`58ec495`](https://github.com/bibekch003/lumen-studio/commit/58ec495))

## v1.8.0 — 2026-10-20

### Features
- Magic Edit — a local, rule-based planner with goals, plain-language prompts, a per-adjustment plan and exact reset to original ([`4bb3b70`](https://github.com/bibekch003/lumen-studio/commit/4bb3b70))

## v1.7.1 — 2026-10-20

### Performance
- split the pixel pipeline into a reusable setup and a row-band loop, and show a progress state while a full-resolution export renders ([`5392d3a`](https://github.com/bibekch003/lumen-studio/commit/5392d3a))

## v1.7.0 — 2026-10-20

### Features
- luminance-only sharpen with radius and threshold, edge-preserving denoise, and adaptive scan thresholding ([`26cf792`](https://github.com/bibekch003/lumen-studio/commit/26cf792))

## v1.6.0 — 2026-10-20

### Features
- separate tonal zones (highlights, shadows, whites, blacks) and vibrance, all exactly neutral at zero ([`d1602b8`](https://github.com/bibekch003/lumen-studio/commit/d1602b8))

## v1.5.1 — 2026-10-20

### Performance
- cache replay so undo/redo is instant, skip identity curve channels, default export quality to 100% ([`ebb576d`](https://github.com/bibekch003/lumen-studio/commit/ebb576d))

## v1.5.0 — 2026-10-20

### Bug fixes
- transparent JPEG export, mislabelled unsupported formats, silent storage failures, and a self-contained hashed CSP ([`ac75b1a`](https://github.com/bibekch003/lumen-studio/commit/ac75b1a))

## v1.4.0 — 2026-10-19

### Features
- settings with light/dark themes, a colour app icon, richer dashboard and preview-quality control ([`68ea3b7`](https://github.com/bibekch003/lumen-studio/commit/68ea3b7))

## v1.3.0 — 2026-10-19

### Features
- dashboard library, add/remove in the top bar, phone modal fix and a crisp animated logo ([`28d37da`](https://github.com/bibekch003/lumen-studio/commit/28d37da))

## v1.2.0 — 2026-10-19

### Features
- iOS glass interface with a live style bar, plus an Anime preset and posterize ([`0a3801d`](https://github.com/bibekch003/lumen-studio/commit/0a3801d))

## v1.1.1 — 2026-10-19

### Bug fixes
- stop the render freezes that froze and crashed the tab, and repair the update notification ([`e6a59e7`](https://github.com/bibekch003/lumen-studio/commit/e6a59e7))

## v1.1.0 — 2026-10-18

### Bug fixes
- detect device instead of viewport (desktop-site mode no longer forces desktop UI); crop now starts at the full image ([`6a45cab`](https://github.com/bibekch003/lumen-studio/commit/6a45cab))

### Other changes
- Add automated semantic versioning, release pipeline and in-app update notification ([`0d0209a`](https://github.com/bibekch003/lumen-studio/commit/0d0209a))
- Add curves, HSL colour grading and autosave/crash recovery ([`e015afd`](https://github.com/bibekch003/lumen-studio/commit/e015afd))
- Add PWA support: manifest, service worker, icon set, install button ([`37b541d`](https://github.com/bibekch003/lumen-studio/commit/37b541d))
- Document mobile layout, security hardening and new controls ([`a6bd573`](https://github.com/bibekch003/lumen-studio/commit/a6bd573))
- Redesign mobile layout, harden security, add panel resize/collapse, revert & help ([`20ca182`](https://github.com/bibekch003/lumen-studio/commit/20ca182))
- Add project README ([`5d824c4`](https://github.com/bibekch003/lumen-studio/commit/5d824c4))
- Add Lumen Studio image editor ([`f393c2f`](https://github.com/bibekch003/lumen-studio/commit/f393c2f))
- Initial commit ([`eea9727`](https://github.com/bibekch003/lumen-studio/commit/eea9727))

## 1.0.0 — 2026-10-18

First tracked release. The versioning system starts here; everything built before
this point is folded into the 1.0.0 baseline.

### Features

- browser-based image editor: crop, resize, rotate, flip, straighten
- adjustments: brightness, contrast, exposure, saturation, temperature, tint, hue, fade, sharpen, blur, vignette, grayscale, sepia, invert, auto-enhance
- interactive curves editor (RGB composite plus per-channel) with monotone cubic interpolation
- HSL colour grading across eight colour ranges
- 14 filter presets and 6 document scan modes
- frame and text watermark tools
- multi-image filmstrip, full undo/redo, hold-to-compare, revert to original
- export to PNG, JPG, WEBP and AVIF with quality control
- installable PWA with offline support and a service worker
- device-aware responsive layout, including inside the installed app
- autosave and crash recovery via IndexedDB
- in-app update notification and About panel
