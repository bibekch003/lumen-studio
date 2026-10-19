# Changelog

All notable changes to Lumen Studio. Generated automatically from commit messages — do not edit by hand.

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
