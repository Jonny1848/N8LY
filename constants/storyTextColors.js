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

/** Einheitliche Hex-Normalisierung fuer Vergleich und Sortierung */
function normalizeHex(hex) {
  const k = (hex || '').replace(/^#/, '').toLowerCase();
  if (k.length !== 6) return null;
  return `#${k}`;
}

function hexToRgb(hex) {
  const n = normalizeHex(hex);
  if (!n) return { r: 0, g: 0, b: 0 };
  const k = n.slice(1);
  return {
    r: parseInt(k.slice(0, 2), 16),
    g: parseInt(k.slice(2, 4), 16),
    b: parseInt(k.slice(4, 6), 16),
  };
}

/**
 * HSL fuer sortierbares Spektrum (hue 0–360, S/L je 0–100).
 * Achromatisch: S nahe 0 — in der Sortierung ans Ende der bunten Farben.
 */
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = ((max + min) / 2) * 100;
  if (max !== min) {
    const d = max - min;
    s = (l > 50 ? d / (2 - max - min) : d / (max + min)) * 100;
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

/**
 * Vordere Swatches: neutrale Stufen (hell→schwarz), dann durchgehendes Farbspektrum.
 * So wirkt die Leiste planbar statt willkuerlich aus der Set-Reihenfolge.
 */
const COLOR_STRIP_LEADING = [
  '#ffffff',
  '#f2f2f7',
  '#e5e5ea',
  '#aeaeb2',
  '#636366',
  '#3a3a3c',
  '#1c1c1e',
  '#000000',
  '#ff3b30',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#30d158',
  '#00c7be',
  '#32ade6',
  '#007aff',
  '#5856d6',
  '#af52de',
  '#ff2d55',
];

/**
 * @returns {string[]}
 */
function buildHorizontalOrder() {
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  const add = (hex) => {
    const n = normalizeHex(hex);
    if (!n) return;
    const key = n.slice(1);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(n);
  };

  COLOR_STRIP_LEADING.forEach(add);

  const rest = STORY_TEXT_COLORS.map((c) => normalizeHex(c))
    .filter(Boolean)
    .filter((n) => !seen.has(n.slice(1)));

  rest.sort((a, b) => {
    const ra = hexToRgb(a);
    const rb = hexToRgb(b);
    const ha = rgbToHsl(ra.r, ra.g, ra.b);
    const hb = rgbToHsl(rb.r, rb.g, rb.b);
    const grayA = ha.s < 6;
    const grayB = hb.s < 6;
    if (grayA && grayB) return ha.l - hb.l;
    if (grayA) return 1;
    if (grayB) return -1;
    if (Math.abs(ha.h - hb.h) > 0.01) return ha.h - hb.h;
    if (Math.abs(ha.s - hb.s) > 0.01) return hb.s - ha.s;
    return hb.l - ha.l;
  });

  rest.forEach((n) => add(n));
  return out;
}

/** Fuer horizontale ScrollView: Kopfzeile + spektralsortierter Rest */
export const STORY_COLORS_HORIZONTAL_ORDER = buildHorizontalOrder();
