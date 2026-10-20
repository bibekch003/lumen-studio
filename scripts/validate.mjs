#!/usr/bin/env node
/**
 * validate.mjs — fails the build if the project is internally inconsistent.
 *
 * Runs in CI on every push. Catches the two things that actually break this
 * project: a version that disagrees between files, and a service-worker
 * precache list that points at files which do not exist (which would make the
 * app fail to install offline).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from './lib/semver.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const at = (...p) => join(ROOT, ...p);
const problems = [];
const note = m => console.log(`  ${m}`);

const read = f => readFileSync(at(f), 'utf8');
const grab = (src, re, label) => {
  const m = new RegExp(re).exec(src);
  if (!m) problems.push(`${label}: marker not found`);
  return m ? m[1] : null;
};

console.log('Lumen Studio — validating project\n');

/* 1. version consistency -------------------------------------------------- */
const pkg = JSON.parse(read('package.json'));
const expected = pkg.version;

try { parse(expected); } catch (e) { problems.push(`package.json: ${e.message}`); }

const versions = {
  'package.json': expected,
  'version.json': existsSync(at('version.json')) ? JSON.parse(read('version.json')).version : null,
  'manifest.webmanifest': JSON.parse(read('manifest.webmanifest')).version,
  'index.html': grab(read('index.html'), "const APP_VERSION = '([^']*)';", 'index.html'),
  'sw.js': grab(read('sw.js'), "const VERSION = 'v([^']*)';", 'sw.js')
};

console.log(`  source of truth: package.json = ${expected}`);
for (const [file, v] of Object.entries(versions)) {
  const okFlag = v === expected;
  note(`${okFlag ? 'ok  ' : 'FAIL'} ${file.padEnd(22)} ${v}`);
  if (!okFlag) problems.push(`${file} says ${v} but package.json says ${expected}`);
}

/* 2. build numbers agree -------------------------------------------------- */
const idxBuild = grab(read('index.html'), 'const APP_BUILD = (\\d+);', 'index.html build');
const swBuild = grab(read('sw.js'), 'const BUILD = (\\d+);', 'sw.js build');
const vjBuild = existsSync(at('version.json')) ? String(JSON.parse(read('version.json')).build) : null;
note(`ok   build numbers          html=${idxBuild} sw=${swBuild} version.json=${vjBuild}`);
if (idxBuild !== swBuild) problems.push(`build number mismatch: index.html=${idxBuild} sw.js=${swBuild}`);
if (vjBuild && vjBuild !== idxBuild) problems.push(`build number mismatch: version.json=${vjBuild} index.html=${idxBuild}`);

/* 3. manifest icons exist on disk ---------------------------------------- */
const mf = JSON.parse(read('manifest.webmanifest'));
for (const icon of mf.icons || []) {
  const okFlag = existsSync(at(icon.src));
  note(`${okFlag ? 'ok  ' : 'FAIL'} manifest icon ${icon.src}`);
  if (!okFlag) problems.push(`manifest references a missing icon: ${icon.src}`);
}
if (mf.start_url !== './') problems.push(`manifest start_url should stay relative ("./"), found ${mf.start_url}`);

/* 4. service worker precache list resolves -------------------------------- */
const swSrc = read('sw.js');
const coreMatch = /const CORE = \[([\s\S]*?)\];/.exec(swSrc);
if (!coreMatch) {
  problems.push('sw.js: CORE precache list not found');
} else {
  const entries = [...coreMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  let missing = 0;
  for (const entry of entries) {
    const rel = entry.replace(/^\.\//, '');
    if (rel === '' || rel === 'index.html') continue;
    if (!existsSync(at(rel))) { problems.push(`sw.js precaches a missing file: ${entry}`); missing++; }
  }
  note(`${missing ? 'FAIL' : 'ok  '} sw.js precache list      ${entries.length} entries, ${missing} missing`);
}

/* 5. security headers still present -------------------------------------- */
const html = read('index.html');
for (const marker of ['Content-Security-Policy', "connect-src 'none'", 'manifest-src', 'worker-src']) {
  const okFlag = html.includes(marker);
  if (!okFlag) problems.push(`index.html lost its CSP marker: ${marker}`);
}
note(`${html.includes("connect-src 'none'") ? 'ok  ' : 'FAIL'} CSP still blocks outbound connections`);

/* 6. the CSP script hashes must match the inline scripts ------------------ */
{
  const { checkCsp } = await import('./lib/csp.mjs');
  const csp = checkCsp(html);
  if (!csp.ok) problems.push('CSP script hashes: ' + csp.reason);
  note(`${csp.ok ? 'ok  ' : 'FAIL'} CSP script hashes       ${csp.ok ? csp.hashes.length + ' script(s) match' : csp.reason}`);
  if (html.includes("script-src 'self' 'unsafe-inline'")) problems.push('CSP allows unsafe-inline scripts');
}

/* ------------------------------------------------------------------ result */
console.log('');
if (problems.length) {
  console.error(`✗ ${problems.length} problem(s):`);
  problems.forEach(p => console.error(`   - ${p}`));
  process.exit(1);
}
console.log('✓ all checks passed');
