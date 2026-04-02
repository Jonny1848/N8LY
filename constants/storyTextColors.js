/**
 * Erweiterte Story-Textfarben (Gitter in der Farb-Leiste), angelehnt an Social-Story-Editoren.
 * Neutrale Grautöne + saettigungsstarke Toene + Pastelle.
 */

/** HSL (0–360, 0–100, 0–100) zu Hex, fuer regelmaessige Farbringe */
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const hue2rgb = (p, q, t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hn = h / 360;
    r = hue2rgb(p, q, hn + 1 / 3);
    g = hue2rgb(p, q, hn);
    b = hue2rgb(p, q, hn - 1 / 3);
  }
  const toHex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Basis-Palette + regelmaessige Hue-Schritte + zusaetzliche Pastell-Reihen */
function buildPalette() {
  const set = new Set();

  const push = (hex) => set.add(hex.toLowerCase());

  // klassische Story-Farben
  [
    '#ffffff',
    '#f5f5f7',
    '#e8e8ed',
    '#ff9a9e',
    '#fecfef',
    '#ffecd2',
    '#fcb69f',
    '#ff6b6b',
    '#ee5a6f',
    '#c44569',
    '#574b90',
    '#303952',
    '#000000',
    '#ffd93d',
    '#ffbe0b',
    '#fb8500',
    '#ff006e',
    '#8338ec',
    '#3a86ff',
    '#06d6a0',
    '#118ab2',
    '#06ffa5',
    '#ef476f',
    '#ffd166',
  ].forEach(push);

  // Farbring (24 Schritte)
  for (let h = 0; h < 360; h += 15) {
    push(hslToHex(h, 90, 52));
    push(hslToHex(h, 55, 72));
  }

  // tiefe / kuehle Akzente
  [
    '#1a535c',
    '#4ecdc4',
    '#ffe66d',
    '#ff6f59',
    '#004e89',
    '#1a659e',
    '#ff6b35',
    '#f7fff7',
    '#343a40',
    '#212529',
  ].forEach(push);

  return Array.from(set);
}

/** @type {string[]} sortierte eindeutige Hex-Farben fuer die UI */
export const STORY_TEXT_COLORS = buildPalette();

/**
 * Reihenfolge fuer die horizontale Story-Farbleiste (wie Instagram: Weiss, Schwarz, dann kraeftige Toene).
 * Anschliessend alle weiteren Farben aus STORY_TEXT_COLORS ohne Duplikat.
 */
const HORIZONTAL_ROW_LEADING = [
  '#ffffff',
  '#000000',
  '#38a5ff',
  '#30d158',
  '#ffe733',
  '#ff9f0a',
  '#ff453a',
  '#ff375f',
  '#bf5af2',
];

/**
 * @returns {string[]}
 */
function buildHorizontalOrder() {
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  const add = (hex) => {
    const k = (hex || '').replace(/^#/, '').toLowerCase();
    const normalized = `#${k}`;
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(normalized);
  };
  HORIZONTAL_ROW_LEADING.forEach(add);
  STORY_TEXT_COLORS.forEach((c) => add(c));
  return out;
}

/** Fuer horizontale ScrollView: feste Reihenfolge + volle Palette */
export const STORY_COLORS_HORIZONTAL_ORDER = buildHorizontalOrder();
