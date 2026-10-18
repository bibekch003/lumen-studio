# Releasing Lumen Studio

Everything here is automatic. You never type a version number by hand.

## The one command

```bash
npm run release patch     # 1.1.0 -> 1.1.1   bug fixes, small errors, security fixes
npm run release minor     # 1.1.1 -> 1.2.0   new features, backwards compatible
npm run release major     # 1.2.0 -> 2.0.0   breaking changes
```

Add `--dry-run` to see exactly what would happen without changing anything:

```bash
npm run release minor --dry-run
```

Prereleases:

```bash
npm run release minor --prerelease beta   # 1.2.0 -> 1.3.0-beta.1
npm run release minor --prerelease beta   # -> 1.3.0-beta.2
npm run release minor                     # -> 1.3.0   (promotes to stable)
```

By default the command **commits and tags locally but does not push**. To push:

```bash
npm run release patch --push
```

## How the version is decided

`package.json` holds the single source of truth. The script refuses to run if:

- the computed version is not strictly greater than the current one
- the git tag `vX.Y.Z` already exists locally **or** on `origin` (no duplicate releases)
- the working tree is dirty (unless you pass `--allow-dirty`)
- any version marker it needs to rewrite has gone missing

## What one release touches

| File | Why |
|---|---|
| `package.json` | source of truth |
| `version.json` | machine-readable record, including the build number and per-platform values |
| `index.html` | `APP_VERSION` / `APP_BUILD` are baked in, because the app runs under `connect-src 'none'` and cannot fetch `version.json` at runtime |
| `sw.js` | the cache name and build number must change or clients keep serving old files |
| `manifest.webmanifest` | installed-app metadata |
| `RELEASE_NOTES.md` | used as the body of the GitHub Release |
| `CHANGELOG.md` | prepended automatically |

The **build number** is a monotonically increasing integer, incremented on every
release. It maps straight onto the native identifiers you will need later:

```
android  versionName 1.2.0  /  versionCode 2
ios      CFBundleShortVersionString 1.2.0  /  CFBundleVersion 2
web      cache lumen-v1.2.0
```

## Release notes

Generated from commit messages since the last tag, grouped by type. Write
[Conventional Commits](https://www.conventionalcommits.org/) and the notes write
themselves:

```
feat(curves): add per-channel tone curves
fix(crop): keep the selection inside the image
perf(hsl): precompute the hue table
```

becomes

```
### Features
- **curves:** add per-channel tone curves
### Bug fixes
- **crop:** keep the selection inside the image
### Performance
- **hsl:** precompute the hue table
```

`feat`, `fix`, `perf`, `security`, `refactor`, `docs` and `chore` are recognised.
A `!` after the type, or a `BREAKING CHANGE:` line in the body, files the commit
under **Breaking changes**. If no commit uses a recognised prefix, every subject
is listed under *Changes* instead — nothing is ever dropped.

## Releasing from GitHub (no local checkout needed)

**Actions → Release → Run workflow.** Pick the bump, optionally a prerelease
tag, and leave **Dry run** on the first time.

Dry run is the default on purpose: the first click only prints the version and
the release notes. Turn it off and the same job validates the project, commits,
tags, pushes, and creates the GitHub Release with the generated notes.

`Release` is `workflow_dispatch` only — pushing to `main` never releases
anything by itself.

## Setup that is already done

- `package.json` — version source of truth
- `scripts/lib/semver.mjs` — dependency-free SemVer parse / compare / bump
- `scripts/release.mjs` — the release engine
- `scripts/validate.mjs` — consistency checks, also run by CI
- `scripts/serve.mjs` — local dev server (`npm run serve`), needed because
  service workers will not run from `file://`
- `.github/workflows/release.yml` — manual, dry-run-first release pipeline
- `.github/workflows/validate.yml` — runs the checks on every push

**No dependencies, no build step.** `node scripts/release.mjs` uses only Node's
standard library, so there is no lockfile to maintain and nothing to install.

## Day-to-day

```bash
npm run serve       # http://localhost:8080
npm run validate    # the same checks CI runs
npm run release patch --dry-run
```
