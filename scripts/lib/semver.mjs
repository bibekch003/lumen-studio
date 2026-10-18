/**
 * Minimal, dependency-free Semantic Versioning helpers.
 * Implements the parts of the spec we need: parse, format, compare, bump.
 * No npm packages are required — this project intentionally has no dependencies.
 */

const RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

export function parse(value) {
  const m = RE.exec(String(value).trim());
  if (!m) throw new Error(`"${value}" is not a valid semantic version (expected MAJOR.MINOR.PATCH)`);
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] || null,
    buildmeta: m[5] || null
  };
}

export function format(v) {
  const base = `${v.major}.${v.minor}.${v.patch}`;
  return v.prerelease ? `${base}-${v.prerelease}` : base;
}

export const isPrerelease = v => parse(v).prerelease !== null;

/* Compare two prerelease identifier lists per spec section 11. */
function comparePrerelease(a, b) {
  if (a === b) return 0;
  if (a === null) return 1;   // a release outranks a prerelease
  if (b === null) return -1;
  const pa = a.split('.'), pb = b.split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    if (nx && ny) {
      if (Number(x) !== Number(y)) return Number(x) < Number(y) ? -1 : 1;
    } else if (nx !== ny) {
      return nx ? -1 : 1;      // numeric identifiers always have lower precedence
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

/** Standard semver precedence: -1 if a < b, 0 if equal, 1 if a > b */
export function compare(a, b) {
  const va = parse(a), vb = parse(b);
  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return comparePrerelease(va.prerelease, vb.prerelease);
}

const CORE_BUMP = {
  patch: v => ({ ...v, patch: v.patch + 1, prerelease: null }),
  minor: v => ({ ...v, minor: v.minor + 1, patch: 0, prerelease: null }),
  major: v => ({ ...v, major: v.major + 1, minor: 0, patch: 0, prerelease: null })
};

/**
 * Work out the next version.
 *
 *  bump("1.1.0", "patch")                     -> 1.1.1
 *  bump("1.1.1", "minor")                     -> 1.2.0
 *  bump("1.2.0", "major")                     -> 2.0.0
 *  bump("1.1.0", "minor", "beta")             -> 1.2.0-beta.1
 *  bump("1.2.0-beta.1", "minor", "beta")      -> 1.2.0-beta.2   (same core, counter++)
 *  bump("1.2.0-beta.2", "minor")              -> 1.2.0          (promote to stable)
 */
export function bump(current, type, prereleaseTag) {
  const cur = parse(current);
  if (!CORE_BUMP[type]) throw new Error(`unknown bump type "${type}" (use patch, minor or major)`);

  /* --- stable release --- */
  if (!prereleaseTag) {
    // a prerelease is finalised by releasing the version it was heading for:
    // 2.1.0-beta.3 -> 2.1.0 (never 2.1.1, which would skip a version)
    if (cur.prerelease) return format({ ...cur, prerelease: null });
    return format(CORE_BUMP[type](cur));
  }

  const tag = String(prereleaseTag).trim();
  if (!/^[0-9A-Za-z-]+$/.test(tag) || /^\d/.test(tag)) {
    throw new Error(`"${tag}" is not a valid prerelease tag (letters only, e.g. beta, rc, alpha)`);
  }

  /* --- already on a prerelease: keep advancing that same line ---
     The bump type only decides the core when starting from a stable version.
     Continuing the line is what people expect: a second `minor --prerelease beta`
     should give 1.3.0-beta.2, not jump to 1.4.0-beta.1 and skip 1.3.0 forever. */
  if (cur.prerelease) {
    const core = format({ ...cur, prerelease: null });
    const [curTag, curNum] = cur.prerelease.split('.');
    if (tag === curTag) return `${core}-${tag}.${(Number(curNum) || 0) + 1}`;
    return `${core}-${tag}.1`;          // same core, new tag (e.g. beta -> rc)
  }

  /* --- starting from a stable version --- */
  return `${format(CORE_BUMP[type](cur))}-${tag}.1`;
}
