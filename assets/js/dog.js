/**
 * dog.js — render a customized dog as an inline SVG string.
 *
 * The dog is composed of layered shapes:
 *   room scene  — floor, window, dog bed (when sleeping)
 *   body        — oval, sized by `size`, shaped by breed `body_type`
 *   legs        — four shapes, simplified
 *   tail        — by `tail` style (curly/straight/bobbed)
 *   markings    — overlay (tuxedo white chest)
 *   head        — circle
 *   ears        — by `ears` (floppy/perky/semi_erect)
 *   breed extras — mask, markings, fringe, fluff per breed
 *   face        — eyes, nose, mouth (mood-driven)
 *   accessories — collar, clothes
 */

import DOGGO_DATA from './data.js';

const VIEW_W = 400;
const VIEW_H = 300;

// Shape parameters by body type and size.
const BODY_TYPES = {
  stocky: { rx: 70, ry: 48 },
  slim:   { rx: 75, ry: 38 },
  round:  { rx: 60, ry: 55 },
};
const SIZE_SCALE = { small: 0.75, medium: 1.0, large: 1.2 };

/**
 * Per-breed visual trait overrides applied on top of data-driven fields.
 *   legHMult    — multiply leg height (< 1 = short legs)
 *   bodyRxAdd   — add extra rx to body ellipse (elongation)
 *   headR       — override head circle radius
 *   snoutW/H    — snout ellipse dimensions
 *   earScale    — uniform ear size multiplier
 *   innerEar    — render a pink inner-ear highlight
 *   earFringe   — flowing fur below floppy ears (golden retriever)
 *   chestFluff  — light ellipse on chest
 *   faceMask    — dark band across eyes (husky)
 *   faceMarkings— cream muzzle + forehead spots (shiba)
 *   fluffBody   — puffy outline puffs around body (poodle)
 *   pompomHead  — fluffy topknot (poodle)
 *   pompomLegs  — fluffy paw puffs (poodle)
 */
const BREED_TRAITS = {
  golden_retriever: {
    headR: 44,
    snoutW: 24, snoutH: 14,
    earFringe: true,
    chestFluff: true,
  },
  corgi: {
    legHMult: 0.60,
    bodyRxAdd: 8,
    headR: 39,
    snoutW: 18, snoutH: 11,
    earScale: 1.35,
    innerEar: true,
  },
  dachshund: {
    legHMult: 0.50,
    bodyRxAdd: 28,
    headR: 35,
    snoutW: 24, snoutH: 10,
  },
  husky: {
    headR: 42,
    faceMask: true,
    innerEar: true,
    snoutW: 19, snoutH: 12,
  },
  poodle: {
    headR: 39,
    snoutW: 13, snoutH: 9,
    fluffBody: true,
    pompomHead: true,
    pompomLegs: true,
  },
  shiba: {
    headR: 38,
    snoutW: 16, snoutH: 10,
    faceMarkings: true,
    innerEar: true,
  },
  mutt: {},
};

// ----- Helpers ---------------------------------------------------------------

function colorOf(palette, id) {
  const found = (DOGGO_DATA.colors[palette] || []).find(c => c.id === id);
  return found?.hex || '#9C9C9C';
}

function breedOf(id) {
  return DOGGO_DATA.breeds.find(b => b.id === id) || DOGGO_DATA.breeds[0];
}

function lighten(hex, amount = 0.15) {
  // Mix with white. amount=0 -> hex, amount=1 -> white.
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  r = Math.round(r + (255 - r) * amount);
  g = Math.round(g + (255 - g) * amount);
  b = Math.round(b + (255 - b) * amount);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
function darken(hex, amount = 0.15) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  r = Math.round(r * (1 - amount));
  g = Math.round(g * (1 - amount));
  b = Math.round(b * (1 - amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// ----- Parts -----------------------------------------------------------------

function renderRoom() {
  return `
    <rect x="0" y="0" width="${VIEW_W}" height="${VIEW_H}" fill="#FAF6EE"/>
    <!-- back wall -->
    <rect x="0" y="0" width="${VIEW_W}" height="${VIEW_H * 0.7}" fill="#F2EBDA"/>
    <!-- window with curtains -->
    <rect x="40" y="40" width="100" height="80" fill="#B8D4E3" stroke="#6B5840" stroke-width="3" rx="4"/>
    <line x1="90" y1="40" x2="90" y2="120" stroke="#6B5840" stroke-width="2"/>
    <line x1="40" y1="80" x2="140" y2="80" stroke="#6B5840" stroke-width="2"/>
    <!-- curtains -->
    <rect x="34" y="34" width="20" height="90" fill="#D6453E" rx="4" opacity="0.75"/>
    <rect x="126" y="34" width="20" height="90" fill="#D6453E" rx="4" opacity="0.75"/>
    <!-- curtain rod -->
    <rect x="32" y="32" width="116" height="5" fill="#6B5840" rx="2"/>
    <!-- picture on wall -->
    <rect x="290" y="30" width="70" height="55" fill="#F5EFE6" stroke="#6B5840" stroke-width="2" rx="3"/>
    <ellipse cx="325" cy="57" rx="20" ry="16" fill="#B8D4E3"/>
    <ellipse cx="325" cy="64" rx="24" ry="8" fill="#8FA76F" opacity="0.7"/>
    <!-- floor line -->
    <line x1="0" y1="${VIEW_H * 0.7}" x2="${VIEW_W}" y2="${VIEW_H * 0.7}" stroke="#6B5840" stroke-width="2"/>
    <!-- floor rug -->
    <ellipse cx="${VIEW_W / 2}" cy="${VIEW_H * 0.7 + 12}" rx="140" ry="12" fill="#D6453E" opacity="0.25"/>
    <!-- food bowl -->
    <ellipse cx="50" cy="260" rx="20" ry="6" fill="#7A4E2C"/>
    <ellipse cx="50" cy="258" rx="18" ry="4" fill="#A1734A"/>
    <ellipse cx="50" cy="256" rx="12" ry="3" fill="#8B5E3C" opacity="0.5"/>
    <!-- water bowl -->
    <ellipse cx="100" cy="262" rx="20" ry="6" fill="#3E78D6"/>
    <ellipse cx="100" cy="260" rx="18" ry="4" fill="#7AA9E0"/>
    <ellipse cx="100" cy="258" rx="12" ry="3" fill="#B8D4E3" opacity="0.6"/>
    <!-- toy ball -->
    <circle cx="340" cy="258" r="10" fill="#F2C24B" stroke="#D6A800" stroke-width="1.5"/>
    <path d="M 333 253 q 5 -4 10 0" stroke="#D6A800" stroke-width="1.5" fill="none"/>
  `;
}

function renderBed() {
  return `
    <ellipse cx="${VIEW_W/2}" cy="240" rx="130" ry="22" fill="#D6453E" opacity="0.85"/>
    <ellipse cx="${VIEW_W/2}" cy="236" rx="120" ry="16" fill="#E96A64"/>
    <!-- bed pillow -->
    <ellipse cx="${VIEW_W/2 - 60}" cy="230" rx="32" ry="14" fill="#F5EFE6" opacity="0.8"/>
  `;
}

function renderLegs(cx, cy, scale, color, legHMult = 1) {
  const dark = darken(color, 0.22);
  const paw = darken(color, 0.3);
  const w = 12 * scale;
  const h = 22 * scale * legHMult;
  const pawR = 6 * scale;
  const py = cy + 25 * scale + h;
  return `
    <rect x="${cx - 50*scale}" y="${cy + 25*scale}" width="${w}" height="${h}" rx="5" fill="${dark}"/>
    <ellipse cx="${cx - 50*scale + w/2}" cy="${py}" rx="${pawR}" ry="${pawR * 0.55}" fill="${paw}"/>
    <rect x="${cx - 22*scale}" y="${cy + 25*scale}" width="${w}" height="${h}" rx="5" fill="${dark}"/>
    <ellipse cx="${cx - 22*scale + w/2}" cy="${py}" rx="${pawR}" ry="${pawR * 0.55}" fill="${paw}"/>
    <rect x="${cx + 12*scale}" y="${cy + 25*scale}" width="${w}" height="${h}" rx="5" fill="${dark}"/>
    <ellipse cx="${cx + 12*scale + w/2}" cy="${py}" rx="${pawR}" ry="${pawR * 0.55}" fill="${paw}"/>
    <rect x="${cx + 38*scale}" y="${cy + 25*scale}" width="${w}" height="${h}" rx="5" fill="${dark}"/>
    <ellipse cx="${cx + 38*scale + w/2}" cy="${py}" rx="${pawR}" ry="${pawR * 0.55}" fill="${paw}"/>
  `;
}

function renderTail(cx, cy, scale, color, tailStyle, mood, asleep) {
  const wag = (!asleep && (mood === 'happy' || mood === 'okay')) ? 'tail-wag' : '';
  const tx = cx + 65 * scale, ty = cy - 10 * scale;
  const dark = darken(color, 0.12);
  let path;
  if (tailStyle === 'curly') {
    path = `M ${tx} ${ty} q 28 -22 6 -42 q -12 -12 12 -26`;
  } else if (tailStyle === 'bobbed') {
    return `
      <ellipse cx="${tx + 8*scale}" cy="${ty - 2*scale}" rx="${9*scale}" ry="${10*scale}" fill="${dark}" class="${wag}"/>
    `;
  } else if (tailStyle === 'docked') {
    return `<rect x="${tx}" y="${ty - 2}" width="${6*scale}" height="${10*scale}" rx="4" fill="${color}"/>`;
  } else {
    // straight — slightly feathered
    path = `M ${tx} ${ty} q 22 -22 28 -48`;
  }
  return `<path d="${path}" stroke="${dark}" stroke-width="${11*scale}" stroke-linecap="round" fill="none" class="${wag}"/>
          <path d="${path}" stroke="${lighten(color, 0.15)}" stroke-width="${5*scale}" stroke-linecap="round" fill="none" class="${wag}" opacity="0.5"/>`;
}

function renderEars(headX, headY, scale, color, ear, traits = {}) {
  // Use strong contrast so ears are clearly visible against the head.
  const dark = darken(color, 0.32);
  const inner = lighten(color, 0.45);
  const earSc = traits.earScale || 1;

  if (ear === 'floppy') {
    const ew = 15 * scale * earSc, eh = 26 * scale * earSc;
    return `
      <ellipse cx="${headX - 34*scale}" cy="${headY + 6*scale}" rx="${ew}" ry="${eh}" fill="${dark}" transform="rotate(-18 ${headX - 34*scale} ${headY + 6*scale})"/>
      <ellipse cx="${headX - 34*scale}" cy="${headY + 8*scale}" rx="${ew * 0.55}" ry="${eh * 0.55}" fill="${inner}" opacity="0.55" transform="rotate(-18 ${headX - 34*scale} ${headY + 8*scale})"/>
      <ellipse cx="${headX + 34*scale}" cy="${headY + 6*scale}" rx="${ew}" ry="${eh}" fill="${dark}" transform="rotate(18 ${headX + 34*scale} ${headY + 6*scale})"/>
      <ellipse cx="${headX + 34*scale}" cy="${headY + 8*scale}" rx="${ew * 0.55}" ry="${eh * 0.55}" fill="${inner}" opacity="0.55" transform="rotate(18 ${headX + 34*scale} ${headY + 8*scale})"/>
    `;
  }
  if (ear === 'perky') {
    const ew = earSc, eh = earSc;
    const showInner = traits.innerEar;
    const lPts = `${headX - 38*scale*ew},${headY - 4*scale} ${headX - 23*scale*ew},${headY - 40*scale*eh} ${headX - 13*scale},${headY - 6*scale}`;
    const rPts = `${headX + 38*scale*ew},${headY - 4*scale} ${headX + 23*scale*ew},${headY - 40*scale*eh} ${headX + 13*scale},${headY - 6*scale}`;
    const lInner = `${headX - 34*scale*ew},${headY - 6*scale} ${headX - 23*scale*ew},${headY - 33*scale*eh} ${headX - 15*scale},${headY - 7*scale}`;
    const rInner = `${headX + 34*scale*ew},${headY - 6*scale} ${headX + 23*scale*ew},${headY - 33*scale*eh} ${headX + 15*scale},${headY - 7*scale}`;
    return `
      <polygon points="${lPts}" fill="${dark}"/>
      <polygon points="${rPts}" fill="${dark}"/>
      ${showInner ? `<polygon points="${lInner}" fill="${inner}" opacity="0.75"/>
      <polygon points="${rInner}" fill="${inner}" opacity="0.75"/>` : ''}
    `;
  }
  // semi_erect — larger and more visible than before
  const showInner = traits.innerEar;
  const lPts = `${headX - 34*scale},${headY - 4*scale} ${headX - 25*scale},${headY - 30*scale} ${headX - 11*scale},${headY - 3*scale}`;
  const rPts = `${headX + 34*scale},${headY - 4*scale} ${headX + 25*scale},${headY - 30*scale} ${headX + 11*scale},${headY - 3*scale}`;
  const lInner = `${headX - 31*scale},${headY - 5*scale} ${headX - 25*scale},${headY - 24*scale} ${headX - 14*scale},${headY - 5*scale}`;
  const rInner = `${headX + 31*scale},${headY - 5*scale} ${headX + 25*scale},${headY - 24*scale} ${headX + 14*scale},${headY - 5*scale}`;
  return `
    <polygon points="${lPts}" fill="${dark}"/>
    <polygon points="${rPts}" fill="${dark}"/>
    ${showInner ? `<polygon points="${lInner}" fill="${inner}" opacity="0.7"/>
    <polygon points="${rInner}" fill="${inner}" opacity="0.7"/>` : ''}
  `;
}

/**
 * Render breed-specific extras: masks, fluff, markings, pompoms.
 * Rendered AFTER the head so they appear on top (mask, markings) or as
 * separate elements alongside the head (fringe, fluff).
 */
function renderBreedExtras(breedId, cx, cy, headX, headY, scale, baseColor, traits) {
  if (!traits) return '';
  let out = '';

  // Poodle: puffy body outline + pompoms
  if (traits.fluffBody) {
    const fluffy = lighten(baseColor, 0.3);
    out += `
      <ellipse cx="${cx - 58*scale}" cy="${cy - 8*scale}" rx="${20*scale}" ry="${17*scale}" fill="${fluffy}" opacity="0.9"/>
      <ellipse cx="${cx + 58*scale}" cy="${cy - 8*scale}" rx="${20*scale}" ry="${17*scale}" fill="${fluffy}" opacity="0.9"/>
      <ellipse cx="${cx}" cy="${cy - 44*scale}" rx="${22*scale}" ry="${16*scale}" fill="${fluffy}" opacity="0.9"/>
    `;
  }
  if (traits.pompomHead) {
    const fluffy = lighten(baseColor, 0.3);
    out += `<circle cx="${headX}" cy="${headY - 36*scale}" r="${15*scale}" fill="${fluffy}" opacity="0.95"/>`;
  }
  if (traits.pompomLegs) {
    const fluffy = lighten(baseColor, 0.3);
    const legW = 12 * scale;
    const legHMult = traits.legHMult || 1;
    const legH = 22 * scale * legHMult;
    const py = cy + 25 * scale + legH;
    out += `
      <circle cx="${cx - 50*scale + legW/2}" cy="${py}" r="${8*scale}" fill="${fluffy}" opacity="0.95"/>
      <circle cx="${cx - 22*scale + legW/2}" cy="${py}" r="${8*scale}" fill="${fluffy}" opacity="0.95"/>
      <circle cx="${cx + 12*scale + legW/2}" cy="${py}" r="${8*scale}" fill="${fluffy}" opacity="0.95"/>
      <circle cx="${cx + 38*scale + legW/2}" cy="${py}" r="${8*scale}" fill="${fluffy}" opacity="0.95"/>
    `;
  }

  // Husky: dark mask band across eyes
  if (traits.faceMask) {
    const mask = darken(baseColor, 0.5);
    out += `<ellipse cx="${headX}" cy="${headY - 3*scale}" rx="${28*scale}" ry="${13*scale}" fill="${mask}" opacity="0.45"/>`;
  }

  // Shiba: cream muzzle patch + forehead spot
  if (traits.faceMarkings) {
    const cream = '#F5EFE6';
    out += `
      <ellipse cx="${headX}" cy="${headY + 13*scale}" rx="${17*scale}" ry="${11*scale}" fill="${cream}" opacity="0.72"/>
      <ellipse cx="${headX}" cy="${headY - 16*scale}" rx="${11*scale}" ry="${7*scale}" fill="${cream}" opacity="0.5"/>
    `;
  }

  // Golden Retriever: flowing ear fringe + chest fluff
  if (traits.earFringe) {
    const fringe = lighten(baseColor, 0.22);
    out += `
      <ellipse cx="${headX - 34*scale}" cy="${headY + 22*scale}" rx="${9*scale}" ry="${15*scale}" fill="${fringe}" opacity="0.8"/>
      <ellipse cx="${headX + 34*scale}" cy="${headY + 22*scale}" rx="${9*scale}" ry="${15*scale}" fill="${fringe}" opacity="0.8"/>
    `;
  }
  if (traits.chestFluff) {
    const fluff = lighten(baseColor, 0.3);
    out += `<ellipse cx="${cx}" cy="${cy - 28*scale}" rx="${22*scale}" ry="${16*scale}" fill="${fluff}" opacity="0.75"/>`;
  }

  return out;
}

function renderFace(headX, headY, scale, eyeColor, mood, asleep, traits = {}) {
  const eyeR = 4 * scale;
  const dx = 14 * scale;
  const dy = -2 * scale;
  const snoutW = (traits.snoutW || 18) * scale;
  const snoutH = (traits.snoutH || 12) * scale;

  let eyes;
  if (asleep || mood === 'sleepy') {
    // closed eyes — short curves
    eyes = `
      <path d="M ${headX - dx - 5*scale} ${headY + dy} q ${5*scale} ${4*scale} ${10*scale} 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M ${headX + dx - 5*scale} ${headY + dy} q ${5*scale} ${4*scale} ${10*scale} 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
    `;
  } else {
    eyes = `
      <circle cx="${headX - dx}" cy="${headY + dy}" r="${eyeR + 1.5}" fill="#fff"/>
      <circle cx="${headX + dx}" cy="${headY + dy}" r="${eyeR + 1.5}" fill="#fff"/>
      <circle cx="${headX - dx}" cy="${headY + dy + 1}" r="${eyeR}" fill="${eyeColor}"/>
      <circle cx="${headX + dx}" cy="${headY + dy + 1}" r="${eyeR}" fill="${eyeColor}"/>
      <circle cx="${headX - dx + 1.5}" cy="${headY + dy - 1}" r="${eyeR/2.5}" fill="#000"/>
      <circle cx="${headX + dx + 1.5}" cy="${headY + dy - 1}" r="${eyeR/2.5}" fill="#000"/>
      <circle cx="${headX - dx - 1}" cy="${headY + dy - 1.5}" r="${eyeR/5}" fill="#fff"/>
      <circle cx="${headX + dx - 1}" cy="${headY + dy - 1.5}" r="${eyeR/5}" fill="#fff"/>
    `;
  }
  // Snout
  const snout = `<ellipse cx="${headX}" cy="${headY + 18*scale}" rx="${snoutW}" ry="${snoutH}" fill="#fff" opacity="0.42"/>`;
  // Nose
  const nose = `
    <ellipse cx="${headX}" cy="${headY + 13*scale}" rx="${5*scale}" ry="${4*scale}" fill="#1a1a1a"/>
    <ellipse cx="${headX - 1.5*scale}" cy="${headY + 12*scale}" rx="${1.5*scale}" ry="${1*scale}" fill="#fff" opacity="0.45"/>
  `;
  // Mouth — varies by mood
  let mouth;
  if (mood === 'happy') {
    mouth = `
      <path d="M ${headX - 8*scale} ${headY + 22*scale} q ${8*scale} ${9*scale} ${16*scale} 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
      <line x1="${headX}" y1="${headY + 22*scale}" x2="${headX}" y2="${headY + 26.5*scale}" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
    `;
  } else if (mood === 'sad' || mood === 'desperate') {
    mouth = `<path d="M ${headX - 8*scale} ${headY + 25*scale} q ${8*scale} -5 ${16*scale} 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (asleep || mood === 'sleepy') {
    mouth = `<line x1="${headX - 4*scale}" y1="${headY + 22*scale}" x2="${headX + 4*scale}" y2="${headY + 22*scale}" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    mouth = `<path d="M ${headX - 6*scale} ${headY + 22*scale} q ${6*scale} ${5*scale} ${12*scale} 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  return snout + eyes + nose + mouth;
}

function renderCollar(neckX, neckY, scale, collarId) {
  const collar = (DOGGO_DATA.accessories.collars || []).find(c => c.id === collarId);
  if (!collar || collar.id === 'none') return '';
  const color = collar.color || '#7A4E2C';
  const dark = darken(color, 0.25);
  return `
    <ellipse cx="${neckX}" cy="${neckY}" rx="${29*scale}" ry="${6.5*scale}" fill="${color}"/>
    <ellipse cx="${neckX}" cy="${neckY}" rx="${29*scale}" ry="${6.5*scale}" fill="none" stroke="${dark}" stroke-width="1.5"/>
    <circle cx="${neckX}" cy="${neckY + 7*scale}" r="${4.5*scale}" fill="#F2C24B" stroke="#C8A020" stroke-width="1"/>
  `;
}

function renderClothes(cx, cy, scale, clothesId) {
  const clothes = (DOGGO_DATA.accessories.clothes || []).find(c => c.id === clothesId);
  if (!clothes || clothes.id === 'none') return '';
  const color = clothes.color || '#F2C24B';
  const dark = darken(color, 0.2);
  const mid = darken(color, 0.1);

  if (clothes.id === 'bowtie_black') {
    return `
      <polygon points="${cx-12*scale},${cy-28*scale} ${cx-2*scale},${cy-24*scale} ${cx-2*scale},${cy-36*scale}" fill="${color}"/>
      <polygon points="${cx+12*scale},${cy-28*scale} ${cx+2*scale},${cy-24*scale} ${cx+2*scale},${cy-36*scale}" fill="${color}"/>
      <rect x="${cx-3.5*scale}" y="${cy-33*scale}" width="${7*scale}" height="${7*scale}" rx="1" fill="${dark}"/>
      <line x1="${cx-10*scale}" y1="${cy-30*scale}" x2="${cx-4*scale}" y2="${cy-30*scale}" stroke="${dark}" stroke-width="1" opacity="0.5"/>
      <line x1="${cx+4*scale}" y1="${cy-30*scale}" x2="${cx+10*scale}" y2="${cy-30*scale}" stroke="${dark}" stroke-width="1" opacity="0.5"/>
    `;
  }

  if (clothes.id === 'sweater_red' || clothes.id === 'sweater') {
    // Sweater with horizontal stripes
    const stripe = darken(color, 0.25);
    return `
      <ellipse cx="${cx}" cy="${cy}" rx="${72*scale}" ry="${44*scale}" fill="${color}" opacity="0.9"/>
      <line x1="${cx - 68*scale}" y1="${cy - 10*scale}" x2="${cx + 68*scale}" y2="${cy - 10*scale}" stroke="${stripe}" stroke-width="${4*scale}" opacity="0.6"/>
      <line x1="${cx - 70*scale}" y1="${cy + 4*scale}" x2="${cx + 70*scale}" y2="${cy + 4*scale}" stroke="${stripe}" stroke-width="${4*scale}" opacity="0.6"/>
      <line x1="${cx - 65*scale}" y1="${cy + 18*scale}" x2="${cx + 65*scale}" y2="${cy + 18*scale}" stroke="${stripe}" stroke-width="${4*scale}" opacity="0.6"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${72*scale}" ry="${44*scale}" fill="none" stroke="${dark}" stroke-width="2" opacity="0.4"/>
    `;
  }

  if (clothes.id === 'raincoat' || clothes.id === 'raincoat_yellow') {
    // Raincoat with buttons and front seam
    return `
      <ellipse cx="${cx}" cy="${cy}" rx="${72*scale}" ry="${44*scale}" fill="${color}" opacity="0.88"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${72*scale}" ry="${44*scale}" fill="none" stroke="${dark}" stroke-width="2" opacity="0.5"/>
      <line x1="${cx}" y1="${cy - 42*scale}" x2="${cx}" y2="${cy + 42*scale}" stroke="${dark}" stroke-width="2" opacity="0.45"/>
      <circle cx="${cx}" cy="${cy - 18*scale}" r="${3.5*scale}" fill="${dark}" opacity="0.7"/>
      <circle cx="${cx}" cy="${cy - 2*scale}" r="${3.5*scale}" fill="${dark}" opacity="0.7"/>
      <circle cx="${cx}" cy="${cy + 14*scale}" r="${3.5*scale}" fill="${dark}" opacity="0.7"/>
      <ellipse cx="${cx}" cy="${cy - 42*scale}" rx="${24*scale}" ry="${7*scale}" fill="${mid}" opacity="0.8"/>
    `;
  }

  if (clothes.id === 'tutu' || clothes.id === 'tutu_pink') {
    // Tutu with layered ruffles
    const ruffle1 = lighten(color, 0.12);
    const ruffle2 = lighten(color, 0.25);
    return `
      <ellipse cx="${cx}" cy="${cy + 14*scale}" rx="${80*scale}" ry="${28*scale}" fill="${color}" opacity="0.9"/>
      <ellipse cx="${cx}" cy="${cy + 20*scale}" rx="${86*scale}" ry="${24*scale}" fill="${ruffle1}" opacity="0.8"/>
      <ellipse cx="${cx}" cy="${cy + 26*scale}" rx="${82*scale}" ry="${18*scale}" fill="${ruffle2}" opacity="0.75"/>
      <ellipse cx="${cx}" cy="${cy + 8*scale}" rx="${64*scale}" ry="${14*scale}" fill="${mid}" opacity="0.85"/>
    `;
  }

  // Generic fallback
  return `<ellipse cx="${cx}" cy="${cy}" rx="${72*scale}" ry="${44*scale}" fill="${color}" opacity="0.85"/>`;
}

function renderTuxedo(cx, cy, scale) {
  return `
    <ellipse cx="${cx}" cy="${cy + 10*scale}" rx="${30*scale}" ry="${24*scale}" fill="#F5EFE6"/>
    <ellipse cx="${cx}" cy="${cy - 5*scale}" rx="${10*scale}" ry="${14*scale}" fill="#F5EFE6"/>
  `;
}

// ----- Main render -----------------------------------------------------------

/**
 * Render the dog scene as an SVG string.
 * @param {object} dog — customization config (matches save.dog).
 * @param {object} opts — { mood, asleep, includeRoom, activity }
 *   activity: one of 'fetch' | 'eat' | 'pet' | 'outside' | 'wake' | null
 */
export function renderDogScene(dog, { mood = 'okay', asleep = false, includeRoom = true, activity = null } = {}) {
  const breed = breedOf(dog.breed);
  const traits = BREED_TRAITS[dog.breed] || {};
  const body = BODY_TYPES[breed.body_type] || BODY_TYPES.round;
  const scale = SIZE_SCALE[dog.size] || 1;
  const baseColor = colorOf('coat_colors', dog.coat_color);
  const eyeColor = colorOf('eye_colors', dog.eye_color);

  const cx = VIEW_W / 2;
  const cy = VIEW_H * 0.62;
  const headX = cx;
  const headR = (traits.headR || 42) * scale;
  const headY = cy - (headR * 0.95);

  const legHMult = traits.legHMult || 1;
  const bodyRxAdd = traits.bodyRxAdd || 0;
  const bodyRx = (body.rx + bodyRxAdd) * scale;
  const bodyRy = body.ry * scale;

  const room = includeRoom ? renderRoom() : '';
  const bed = asleep ? renderBed() : '';

  const bodyShape = `<ellipse cx="${cx}" cy="${cy}" rx="${bodyRx}" ry="${bodyRy}" fill="${baseColor}"/>`;
  const tuxedo = dog.markings === 'tuxedo' ? renderTuxedo(cx, cy, scale) : '';
  const head = `<circle cx="${headX}" cy="${headY}" r="${headR}" fill="${baseColor}"/>`;

  // Determine the dog group animation class.
  let dogGroupClass;
  if (asleep) {
    dogGroupClass = 'sleep-breathe';
  } else if (activity) {
    dogGroupClass = `activity-${activity}`;
  } else if (mood === 'happy' || mood === 'okay') {
    dogGroupClass = 'dog-walk';
  } else {
    dogGroupClass = '';
  }

  // Tail wag when happy or okay and not sleeping/activity
  const tailWagMood = mood;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <style>
        .tail-wag { transform-origin: ${cx + 65 * scale}px ${cy - 10 * scale}px; animation: tail-wag 0.7s ease-in-out infinite; }
        .sleep-breathe { animation: sleep-breathe 3s ease-in-out infinite; }
        .dog-walk { animation: dog-walk 4s ease-in-out infinite alternate; }
        .activity-fetch { animation: activity-fetch 0.45s ease-in-out 3; }
        .activity-eat { animation: activity-eat 0.4s ease-in-out 4; }
        .activity-pet { animation: activity-pet 0.5s ease-in-out 3; }
        .activity-outside { animation: activity-outside 0.55s ease-in-out 2; }
        .activity-wake { animation: activity-wake 0.9s ease-out 1 forwards; }
        @keyframes tail-wag { 0%, 100% { transform: rotate(-14deg); } 50% { transform: rotate(14deg); } }
        @keyframes sleep-breathe { 0%, 100% { transform: scaleY(1) translateY(0); } 50% { transform: scaleY(1.02) translateY(-3px); } }
        @keyframes dog-walk {
          0%   { transform: translateX(-35px) translateY(0px); }
          25%  { transform: translateX(-17px) translateY(-4px); }
          50%  { transform: translateX(0px)   translateY(0px); }
          75%  { transform: translateX(17px)  translateY(-4px); }
          100% { transform: translateX(35px)  translateY(0px); }
        }
        @keyframes activity-fetch { 0%, 100% { transform: translateX(0) rotate(0deg); } 25% { transform: translateX(-8px) rotate(-5deg); } 75% { transform: translateX(8px) rotate(5deg); } }
        @keyframes activity-eat { 0%, 100% { transform: translateY(0); } 35% { transform: translateY(5px); } 65% { transform: translateY(2px); } }
        @keyframes activity-pet { 0%, 100% { transform: rotate(0deg) translateY(0); } 30% { transform: rotate(-4deg) translateY(-2px); } 70% { transform: rotate(4deg) translateY(-2px); } }
        @keyframes activity-outside { 0%, 100% { transform: translateY(0); } 30% { transform: translateY(-10px) translateX(8px); } 60% { transform: translateY(-6px) translateX(-4px); } 80% { transform: translateY(-2px); } }
        @keyframes activity-wake { 0% { transform: scale(1) translateY(0); } 35% { transform: scale(1.07) translateY(-7px); } 65% { transform: scale(0.98) translateY(2px); } 100% { transform: scale(1) translateY(0); } }
      </style>
    </defs>
    ${room}
    ${bed}
    <g class="${dogGroupClass}">
      ${renderLegs(cx, cy, scale, baseColor, legHMult)}
      ${renderTail(cx, cy, scale, baseColor, dog.tail, tailWagMood, asleep)}
      ${bodyShape}
      ${tuxedo}
      ${renderClothes(cx, cy, scale, dog.clothes)}
      ${renderCollar(headX, headY + headR * 0.88, scale, dog.collar)}
      ${renderEars(headX, headY, scale, baseColor, dog.ears, traits)}
      ${head}
      ${renderBreedExtras(dog.breed, cx, cy, headX, headY, scale, baseColor, traits)}
      ${renderFace(headX, headY, scale, eyeColor, mood, asleep, traits)}
    </g>
  </svg>`;
}
