import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const PLACEHOLDER = '__SCRIPT_HASHES__';

/* Every inline <script> block, byte for byte as the browser sees it.
   A hashed CSP is only safe if this extraction matches the parser exactly, so
   it deliberately takes everything between the tags and nothing else. */
export function scriptHashes(html) {
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push(createHash('sha256').update(m[1], 'utf8').digest('base64'));
  }
  return out;
}

export function cspSource(hashes) {
  return hashes.map(h => `'sha256-${h}'`).join(' ');
}

/* Rewrite the script-src hash list from the current contents of the file. */
export function applyCsp(html) {
  const hashes = scriptHashes(html);
  if (!hashes.length) return { html, hashes, error: 'no inline scripts found' };
  const src = cspSource(hashes);
  if (html.includes(PLACEHOLDER)) return { html: html.replace(PLACEHOLDER, src), hashes };
  const re = /(script-src 'self' )[^;]*/;
  if (!re.test(html)) return { html, hashes, error: 'no script-src directive' };
  return { html: html.replace(re, `$1${src}`), hashes };
}

/* Verify the hashes in the file match its scripts. */
export function checkCsp(html) {
  const hashes = scriptHashes(html);
  if (!hashes.length) return { ok: false, reason: 'no inline scripts found' };
  const m = html.match(/script-src 'self' ([^;]*)/);
  if (!m) return { ok: false, reason: 'no script-src directive' };
  const current = m[1].trim();
  if (current.includes("'unsafe-inline'")) return { ok: false, reason: "script-src still allows 'unsafe-inline'" };
  if (current === cspSource(hashes)) return { ok: true, hashes };
  return { ok: false, reason: 'script hashes are stale for the current script contents' };
}

/* CLI: node scripts/lib/csp.mjs [file]  — rewrites the file in place */
if (process.argv[1] && process.argv[1].endsWith('csp.mjs')) {
  const file = process.argv[2] || 'index.html';
  const html = readFileSync(file, 'utf8');
  const res = applyCsp(html);
  if (res.error) { console.error('csp: ' + res.error); process.exit(1); }
  writeFileSync(file, res.html);
  const check = checkCsp(res.html);
  console.log(`csp: ${res.hashes.length} inline script(s) hashed — ${check.ok ? 'verified' : 'MISMATCH: ' + check.reason}`);
  process.exit(check.ok ? 0 : 1);
}
