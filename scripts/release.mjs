#!/usr/bin/env node
/**
 * release.mjs — automated semantic versioning & release for Lumen Studio.
 *
 *   node scripts/release.mjs patch
 *   node scripts/release.mjs minor
 *   node scripts/release.mjs major
 *   node scripts/release.mjs minor --prerelease beta
 *   node scripts/release.mjs patch --dry-run
 *   node scripts/release.mjs patch --push
 *
 * What it does, in order:
 *   1. reads the current version from package.json (the single source of truth)
 *   2. computes the next version and refuses anything that is not strictly greater
 *   3. refuses to reuse a git tag that already exists (no duplicate releases)
 *   4. rewrites every piece of version metadata the project has
 *   5. generates release notes from the commit log since the last tag
 *   6. commits, creates an annotated git tag
 *   7. pushes only when you explicitly ask with --push
 *
 * Nothing is ever pushed or published by default.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse, format, compare, bump } from './lib/semver.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const at = (...parts) => join(ROOT, ...parts);

const C = { dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m',
            yellow: '\x1b[33m', bold: '\x1b[1m', off: '\x1b[0m' };
const say  = m => console.log(m);
const ok   = m => console.log(`${C.green}✓${C.off} ${m}`);
const info = m => console.log(`${C.dim}·${C.off} ${m}`);
const warn = m => console.log(`${C.yellow}!${C.off} ${m}`);
function die(msg) { console.error(`${C.red}✗ ${msg}${C.off}`); process.exit(1); }

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}
function tryGit(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }
}

/* ------------------------------------------------------------------ args */
const opts = { type: null, prerelease: null, dryRun: false, push: false, allowDirty: false };

for (let i = 0; i < process.argv.length - 2; i++) {
  const a = process.argv[i + 2];
  if (a === '--prerelease' || a === '-p') { opts.prerelease = process.argv[++i + 2]; }
  else if (a.startsWith('--prerelease=')) { opts.prerelease = a.split('=')[1]; }
  else if (a === '--dry-run' || a === '-n') { opts.dryRun = true; }
  else if (a === '--push') { opts.push = true; }
  else if (a === '--allow-dirty') { opts.allowDirty = true; }
  else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
  else if (!a.startsWith('-')) { opts.type = a; }
  else { die(`unknown option "${a}"`); }
}

function usage() {
  say(`${C.bold}release${C.off} — bump the version, tag it and prepare a release

  ${C.cyan}node scripts/release.mjs <patch|minor|major> [options]${C.off}

  patch       1.1.0 -> 1.1.1    bug fixes, small errors, security fixes
  minor       1.1.1 -> 1.2.0    new features, backwards compatible
  major       1.2.0 -> 2.0.0    breaking changes

Options
  -p, --prerelease <tag>   produce a prerelease, e.g. --prerelease beta -> 2.0.0-beta.1
                           running it again on 2.0.0-beta.1 gives 2.0.0-beta.2
  -n, --dry-run            show exactly what would happen, change nothing
      --push               push the commit and tag to origin (off by default)
      --allow-dirty        permit a dirty working tree
  -h, --help               this message

Examples
  node scripts/release.mjs patch --dry-run
  node scripts/release.mjs minor --prerelease rc --push
  node scripts/release.mjs major            ${C.dim}# commits + tags locally, does not push${C.off}`);
}

if (!opts.type) { usage(); die('no bump type given'); }

/* --------------------------------------------------- read current version */
if (!existsSync(at('package.json'))) die('package.json not found — run this from the project root');
const pkg = JSON.parse(readFileSync(at('package.json'), 'utf8'));
const current = pkg.version;
parse(current);                                   // validates the shape

let next;
try { next = bump(current, opts.type, opts.prerelease); }
catch (e) { die(e.message); }

if (compare(next, current) <= 0) {
  die(`refusing to move backwards: ${current} -> ${next}`);
}

const tag = `v${next}`;
const channel = parse(next).prerelease ? parse(next).prerelease.split('.')[0] : 'stable';

/* ------------------------------------------- guards against duplicates */
if (tryGit(['rev-parse', '-q', '--verify', `refs/tags/${tag}`])) {
  die(`tag ${tag} already exists locally — that version has already been released`);
}
const remoteTag = tryGit(['ls-remote', '--tags', 'origin', tag]);
if (remoteTag) die(`tag ${tag} already exists on origin — pick a different bump`);

if (!opts.allowDirty && tryGit(['status', '--porcelain'])) {
  die('working tree has uncommitted changes. Commit them first, or pass --allow-dirty.');
}
if (!tryGit(['rev-parse', '--is-inside-work-tree'])) die('not inside a git repository');

/* ------------------------------------------------------- release notes */
function lastTag() {
  return tryGit(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*']) || '';
}
/* the most recent tag that is not a prerelease — used when promoting one,
   so the notes describe everything that went into the release line */
function lastStableTag() {
  const tags = tryGit(['tag', '--list', 'v[0-9]*', '--sort=-v:refname']).split('\n').filter(Boolean);
  return tags.find(t => !t.includes('-')) || '';
}
function repoUrl() {
  const raw = tryGit(['remote', 'get-url', 'origin']);
  if (!raw) return '';
  return raw.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '');
}
function buildNotes(version, prevTag, url) {
  const range = prevTag ? `${prevTag}..HEAD` : 'HEAD';
  const raw = tryGit(['log', '--no-merges', '--pretty=format:%h%x1f%s%x1f%b%x1e', range]);
  const records = raw.split('\x1e').map(r => r.trim()).filter(Boolean).map(r => {
    const [sha, subject, body] = r.split('\x1f');
    return { sha: sha || '', subject: subject || '', body: body || '' };
  }).filter(r => !/^chore\(release\)/i.test(r.subject));   // never list the release commits themselves

  const TITLES = {
    breaking: 'Breaking changes', feat: 'Features', fix: 'Bug fixes', perf: 'Performance',
    security: 'Security', refactor: 'Refactoring', docs: 'Documentation',
    chore: 'Maintenance', other: 'Other changes'
  };
  const ORDER = ['breaking', 'feat', 'fix', 'perf', 'security', 'refactor', 'docs', 'chore', 'other'];
  const MAP = { feat: 'feat', fix: 'fix', perf: 'perf', security: 'security', refactor: 'refactor',
                docs: 'docs', chore: 'chore', build: 'chore', ci: 'chore', style: 'chore',
                test: 'chore', revert: 'fix' };

  const groups = {};
  let conventional = 0;
  for (const rec of records) {
    const m = /^([a-zA-Z]+)(\([^)]*\))?(!)?:\s*(.+)$/.exec(rec.subject);
    let key = 'other';
    if (m) {
      conventional++;
      key = MAP[m[1].toLowerCase()] || 'other';
      if (m[3] || /BREAKING[ -]CHANGE/.test(rec.body)) key = 'breaking';
    }
    (groups[key] = groups[key] || []).push(rec);
  }

  const link = rec => {
    const text = rec.subject.replace(/^([a-zA-Z]+)(\([^)]*\))?(!)?:\s*/, '');
    const scope = /^[a-zA-Z]+(\([^)]*\))?!?:/.exec(rec.subject);
    const sc = scope && scope[1] ? `**${scope[1].slice(1, -1)}:** ` : '';
    return url && rec.sha
      ? `- ${sc}${text} ([\`${rec.sha}\`](${url}/commit/${rec.sha}))`
      : `- ${sc}${text}`;
  };

  const date = new Date().toISOString().slice(0, 10);
  let md = `## ${version} — ${date}\n`;
  if (!records.length) {
    md += '\n_No commits since the previous release._\n';
    return md;
  }
  if (conventional === 0) {
    md += `\n### Changes\n${records.map(link).join('\n')}\n`;
    return md;
  }
  for (const key of ORDER) {
    if (!groups[key] || !groups[key].length) continue;
    md += `\n### ${TITLES[key]}\n${groups[key].map(link).join('\n')}\n`;
  }
  return md;
}

/* ---------------------------------------------- rewrite version metadata */
function patchFile(file, pattern, replacement) {
  const full = at(file);
  if (!existsSync(full)) die(`expected ${file} to exist`);
  const src = readFileSync(full, 'utf8');
  const re = new RegExp(pattern);
  if (!re.test(src)) die(`could not find the version marker in ${file} — refusing to guess`);
  writeFileSync(full, src.replace(new RegExp(pattern), replacement));
  ok(`${file} updated`);
}

const prevTag = lastTag();
const url = repoUrl();
let notes = buildNotes(tag, prevTag, url);

/* promoting a prerelease: describe the whole release line, not just the
   (usually empty) range since the last beta */
if (/No commits since/.test(notes)) {
  const stable = lastStableTag();
  if (stable && stable !== prevTag) {
    const wider = buildNotes(tag, stable, url);
    if (!/No commits since/.test(wider)) notes = wider;
  }
}
if (parse(current).prerelease) {
  notes = notes.replace(/^(## .*\n)/, `$1\n_Promotes \`${current}\` to stable._\n`);
}
const build = (JSON.parse(existsSync(at('version.json')) ? readFileSync(at('version.json'), 'utf8') : '{"build":0}').build || 0) + 1;

say('');
say(`${C.bold}${current}  ->  ${next}${C.off}   ${C.dim}(${opts.type}${opts.prerelease ? ' / prerelease ' + opts.prerelease : ''})${C.off}`);
info(`channel      ${channel}`);
info(`build number ${build}`);
info(`git tag      ${tag}`);
info(`commits since ${prevTag || '(beginning)'}`);
say('');

if (opts.dryRun) {
  say(`${C.bold}Release notes that would be written:${C.off}`);
  say(notes);
  warn('dry run — nothing was changed, committed or tagged');
  process.exit(0);
}

/* package.json */
patchFile('package.json', '"version"\\s*:\\s*"[^"]+"', `"version": "${next}"`);

/* index.html — baked in because the app runs under connect-src 'none' and
   therefore cannot fetch version.json at runtime */
patchFile('index.html', "const APP_VERSION = '[^']*';", `const APP_VERSION = '${next}';`);
patchFile('index.html', 'const APP_BUILD = \\d+;', `const APP_BUILD = ${build};`);

/* The CSP pins the inline scripts by SHA-256, and we just changed one of them.
   Refresh the hashes now or the deployed app would refuse to run its own code. */
{
  const { applyCsp } = await import('./lib/csp.mjs');
  const res = applyCsp(readFileSync(at('index.html'), 'utf8'));
  if (res.error) fail('csp: ' + res.error);
  writeFileSync(at('index.html'), res.html);
  say(`\u00b7 ${'csp'.padEnd(11)} ${res.hashes.length} inline script hash(es) refreshed`);
}

/* sw.js — the cache name must change or clients keep the old files */
patchFile('sw.js', "const VERSION = '[^']*';", `const VERSION = 'v${next}';`);
patchFile('sw.js', 'const BUILD = \\d+;', `const BUILD = ${build};`);

/* manifest.webmanifest */
{
  const full = at('manifest.webmanifest');
  const mf = JSON.parse(readFileSync(full, 'utf8'));
  mf.version = next;
  mf.build = build;
  writeFileSync(full, JSON.stringify(mf, null, 2) + '\n');
  ok('manifest.webmanifest updated');
}

/* version.json — the canonical machine-readable record */
const versionJson = {
  name: 'Lumen Studio',
  version: next,
  build,
  channel,
  releasedAt: new Date().toISOString(),
  platforms: {
    web: { cache: `lumen-v${next}` },
    android: { versionName: next, versionCode: build },
    ios: { CFBundleShortVersionString: next, CFBundleVersion: String(build) },
    desktop: { version: next, build }
  }
};
writeFileSync(at('version.json'), JSON.stringify(versionJson, null, 2) + '\n');
ok('version.json updated');

/* release notes for the GitHub Release step */
writeFileSync(at('RELEASE_NOTES.md'), notes);
ok('RELEASE_NOTES.md written');

/* changelog */
{
  const full = at('CHANGELOG.md');
  const header = '# Changelog\n\nAll notable changes to Lumen Studio. Generated automatically from commit messages — do not edit by hand.\n\n';
  const prev = existsSync(full) ? readFileSync(full, 'utf8').replace(/^# Changelog[\s\S]*?\n\n(?=## )/, '') : '';
  writeFileSync(full, header + notes + '\n' + prev);
  ok('CHANGELOG.md updated');
}

/* ------------------------------------------------------------ commit+tag */
git(['add', '-A']);
git(['commit', '-m', `chore(release): ${tag}`]);
git(['tag', '-a', tag, '-m', `Lumen Studio ${next}\n\n${notes}`]);
ok(`committed and tagged ${tag}`);

say('');
say(`${C.bold}Build numbers${C.off}`);
say(`  android  versionName ${next}  /  versionCode ${build}`);
say(`  ios      CFBundleShortVersionString ${next}  /  CFBundleVersion ${build}`);
say(`  web      cache lumen-v${next}`);
say('');

if (opts.push) {
  git(['push', 'origin', 'HEAD', '--follow-tags']);
  ok(`pushed ${tag} to origin`);
} else {
  warn('not pushed — nothing was published');
  say(`  run:  ${C.cyan}git push origin HEAD --follow-tags${C.off}`);
}
say('');
