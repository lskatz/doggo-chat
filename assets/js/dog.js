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
    <!-- window -->
    <rect x="40" y="40" width="100" height="80" fill="#B8D4E3" stroke="#6B5840" stroke-width="3" rx="4"/>
    <line x1="90" y1="40" x2="90" y2="120" stroke="#6B5840" stroke-width="2"/>
    <line x1="40" y1="80" x2="140" y2="80" stroke="#6B5840" stroke-width="2"/>
    <!-- floor line -->
    <line x1="0" y1="${VIEW_H * 0.7}" x2="${VIEW_W}" y2="${VIEW_H * 0.7}" stroke="#6B5840" stroke-width="2"/>
    <!-- food and water bowls (decorative) -->
    <ellipse cx="50" cy="260" rx="20" ry="6" fill="#7A4E2C"/>
    <ellipse cx="50" cy="258" rx="18" ry="4" fill="#A1734A"/>
    <ellipse cx="100" cy="262" rx="20" ry="6" fill="#3E78D6"/>
    <ellipse cx="100" cy="260" rx="18" ry="4" fill="#7AA9E0"/>
  `;
}

function renderBed() {
  return `
    <ellipse cx="${VIEW_W/2}" cy="240" rx="130" ry="22" fill="#D6453E" opacity="0.85"/>
    <ellipse cx="${VIEW_W/2}" cy="236" rx="120" ry="16" fill="#E96A64"/>
  `;
}

function renderLegs(cx, cy, scale, color) {
  const dark = darken(color, 0.18);
  const w = 12 * scale, h = 22 * scale;
  return `
    <rect x="${cx - 50*scale}" y="${cy + 25*scale}" width="${w}" height="${h}" rx="5" fill="${dark}"/>
    <rect x="${cx - 22*scale}" y="${cy + 25*scale}" width="${w}" height="${h}" rx="5" fill="${dark}"/>
    <rect x="${cx + 12*scale}" y="${cy + 25*scale}" width="${w}" height="${h}" rx="5" fill="${dark}"/>
    <rect x="${cx + 38*scale}" y="${cy + 25*scale}" width="${w}" height="${h}" rx="5" fill="${dark}"/>
  `;
}

function renderTail(cx, cy, scale, color, tailStyle, mood, asleep) {
  const wag = (!asleep && (mood === 'happy' || mood === 'okay')) ? 'tail-wag' : '';
  const tx = cx + 65 * scale, ty = cy - 10 * scale;
  let path;
  if (tailStyle === 'curly') {
    path = `M ${tx} ${ty} q 30 -20 5 -40 q -10 -10 10 -25`;
  } else if (tailStyle === 'bobbed') {
    return `<rect x="${tx}" y="${ty - 5}" width="${10*scale}" height="${14*scale}" rx="6" fill="${color}" class="${wag}"/>`;
  } else if (tailStyle === 'docked') {
    return `<rect x="${tx}" y="${ty - 2}" width="${6*scale}" height="${10*scale}" rx="4" fill="${color}"/>`;
  } else {
    // straight
    path = `M ${tx} ${ty} q 25 -25 30 -50`;
  }
  return `<path d="${path}" stroke="${color}" stroke-width="${10*scale}" stroke-linecap="round" fill="none" class="${wag}"/>`;
}

function renderEars(headX, headY, scale, color, ear) {
  const dark = darken(color, 0.1);
  if (ear === 'floppy') {
    return `
      <ellipse cx="${headX - 32*scale}" cy="${headY + 5*scale}" rx="${14*scale}" ry="${24*scale}" fill="${dark}" transform="rotate(-15 ${headX - 32*scale} ${headY + 5*scale})"/>
      <ellipse cx="${headX + 32*scale}" cy="${headY + 5*scale}" rx="${14*scale}" ry="${24*scale}" fill="${dark}" transform="rotate(15 ${headX + 32*scale} ${headY + 5*scale})"/>
    `;
  }
  if (ear === 'perky') {
    return `
      <polygon points="${headX - 36*scale},${headY - 5*scale} ${headX - 22*scale},${headY - 38*scale} ${headX - 14*scale},${headY - 8*scale}" fill="${dark}"/>
      <polygon points="${headX + 36*scale},${headY - 5*scale} ${headX + 22*scale},${headY - 38*scale} ${headX + 14*scale},${headY - 8*scale}" fill="${dark}"/>
    `;
  }
  // semi_erect
  return `
    <polygon points="${headX - 32*scale},${headY - 5*scale} ${headX - 24*scale},${headY - 28*scale} ${headX - 12*scale},${headY - 4*scale}" fill="${dark}"/>
    <polygon points="${headX + 32*scale},${headY - 5*scale} ${headX + 24*scale},${headY - 28*scale} ${headX + 12*scale},${headY - 4*scale}" fill="${dark}"/>
  `;
}

function renderFace(headX, headY, scale, eyeColor, mood, asleep) {
  const eyeR = 4 * scale;
  const dx = 14 * scale;
  const dy = -2 * scale;
  let eyes;
  if (asleep || mood === 'sleepy') {
    // closed eyes — short curves
    eyes = `
      <path d="M ${headX - dx - 5*scale} ${headY + dy} q ${5*scale} ${4*scale} ${10*scale} 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M ${headX + dx - 5*scale} ${headY + dy} q ${5*scale} ${4*scale} ${10*scale} 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
    `;
  } else {
    eyes = `
      <circle cx="${headX - dx}" cy="${headY + dy}" r="${eyeR + 1}" fill="#fff"/>
      <circle cx="${headX + dx}" cy="${headY + dy}" r="${eyeR + 1}" fill="#fff"/>
      <circle cx="${headX - dx}" cy="${headY + dy + 1}" r="${eyeR}" fill="${eyeColor}"/>
      <circle cx="${headX + dx}" cy="${headY + dy + 1}" r="${eyeR}" fill="${eyeColor}"/>
      <circle cx="${headX - dx + 1}" cy="${headY + dy}" r="${eyeR/3}" fill="#000"/>
      <circle cx="${headX + dx + 1}" cy="${headY + dy}" r="${eyeR/3}" fill="#000"/>
    `;
  }
  // Snout
  const snout = `<ellipse cx="${headX}" cy="${headY + 18*scale}" rx="${18*scale}" ry="${12*scale}" fill="#fff" opacity="0.4"/>`;
  // Nose
  const nose = `<ellipse cx="${headX}" cy="${headY + 13*scale}" rx="${5*scale}" ry="${4*scale}" fill="#1a1a1a"/>`;
  // Mouth — varies by mood
  let mouth;
  if (mood === 'happy') {
    mouth = `<path d="M ${headX - 8*scale} ${headY + 22*scale} q ${8*scale} ${8*scale} ${16*scale} 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (mood === 'sad' || mood === 'desperate') {
    mouth = `<path d="M ${headX - 8*scale} ${headY + 24*scale} q ${8*scale} -4 ${16*scale} 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (asleep || mood === 'sleepy') {
    mouth = `<line x1="${headX - 4*scale}" y1="${headY + 22*scale}" x2="${headX + 4*scale}" y2="${headY + 22*scale}" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    mouth = `<path d="M ${headX - 6*scale} ${headY + 22*scale} q ${6*scale} ${4*scale} ${12*scale} 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  return snout + eyes + nose + mouth;
}

function renderCollar(neckX, neckY, scale, collarId) {
  const collar = (DOGGO_DATA.accessories.collars || []).find(c => c.id === collarId);
  if (!collar || collar.id === 'none') return '';
  const color = collar.color || '#7A4E2C';
  return `
    <ellipse cx="${neckX}" cy="${neckY}" rx="${28*scale}" ry="${6*scale}" fill="${color}"/>
    <circle cx="${neckX}" cy="${neckY + 6*scale}" r="${4*scale}" fill="#F2C24B"/>
  `;
}

function renderClothes(cx, cy, scale, clothesId) {
  const clothes = (DOGGO_DATA.accessories.clothes || []).find(c => c.id === clothesId);
  if (!clothes || clothes.id === 'none') return '';
  const color = clothes.color || '#F2C24B';
  if (clothes.id === 'bowtie_black') {
    return `<polygon points="${cx-10*scale},${cy-30*scale} ${cx-2*scale},${cy-25*scale} ${cx-2*scale},${cy-35*scale}" fill="${color}"/>
            <polygon points="${cx+10*scale},${cy-30*scale} ${cx+2*scale},${cy-25*scale} ${cx+2*scale},${cy-35*scale}" fill="${color}"/>
            <rect x="${cx-3*scale}" y="${cy-32*scale}" width="${6*scale}" height="${6*scale}" fill="${darken(color,0.2)}"/>`;
  }
  // sweater / raincoat / tutu — body wrap
  return `<ellipse cx="${cx}" cy="${cy}" rx="${72*scale}" ry="${44*scale}" fill="${color}" opacity="0.85"/>`;
}

function renderTuxedo(cx, cy, scale) {
  return `<ellipse cx="${cx}" cy="${cy + 10*scale}" rx="${30*scale}" ry="${24*scale}" fill="#F5EFE6"/>`;
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
  const body = BODY_TYPES[breed.body_type] || BODY_TYPES.round;
  const scale = SIZE_SCALE[dog.size] || 1;
  const baseColor = colorOf('coat_colors', dog.coat_color);
  const eyeColor = colorOf('eye_colors', dog.eye_color);

  const cx = VIEW_W / 2;
  const cy = VIEW_H * 0.62;
  const headX = cx;
  const headY = cy - 50 * scale;

  const room = includeRoom ? renderRoom() : '';
  const bed = asleep ? renderBed() : '';

  const bodyShape = `<ellipse cx="${cx}" cy="${cy}" rx="${body.rx * scale}" ry="${body.ry * scale}" fill="${baseColor}"/>`;
  const tuxedo = dog.markings === 'tuxedo' ? renderTuxedo(cx, cy, scale) : '';
  const head = `<circle cx="${headX}" cy="${headY}" r="${42 * scale}" fill="${baseColor}"/>`;

  const wagClass = (!asleep && mood === 'happy') ? 'happy-bounce' : '';

  // Determine the dog group animation class.
  let dogGroupClass;
  if (asleep) {
    dogGroupClass = 'sleep-breathe';
  } else if (activity) {
    dogGroupClass = `activity-${activity}`;
  } else {
    dogGroupClass = wagClass;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <style>
        .tail-wag { transform-origin: ${cx + 65 * scale}px ${cy - 10 * scale}px; animation: tail-wag 0.6s ease-in-out infinite; }
        .happy-bounce { animation: happy-bounce 0.8s ease-in-out infinite; }
        .sleep-breathe { animation: sleep-breathe 3s ease-in-out infinite; }
        .activity-fetch { animation: activity-fetch 0.45s ease-in-out 3; }
        .activity-eat { animation: activity-eat 0.4s ease-in-out 4; }
        .activity-pet { animation: activity-pet 0.5s ease-in-out 3; }
        .activity-outside { animation: activity-outside 0.55s ease-in-out 2; }
        .activity-wake { animation: activity-wake 0.9s ease-out 1 forwards; }
        @keyframes tail-wag { 0%, 100% { transform: rotate(-12deg); } 50% { transform: rotate(12deg); } }
        @keyframes happy-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes sleep-breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes activity-fetch { 0%, 100% { transform: translateX(0) rotate(0deg); } 25% { transform: translateX(-6px) rotate(-4deg); } 75% { transform: translateX(6px) rotate(4deg); } }
        @keyframes activity-eat { 0%, 100% { transform: translateY(0); } 35% { transform: translateY(4px); } 65% { transform: translateY(2px); } }
        @keyframes activity-pet { 0%, 100% { transform: rotate(0deg); } 30% { transform: rotate(-3deg); } 70% { transform: rotate(3deg); } }
        @keyframes activity-outside { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } 70% { transform: translateY(-4px); } }
        @keyframes activity-wake { 0% { transform: scale(1) translateY(0); } 35% { transform: scale(1.06) translateY(-6px); } 65% { transform: scale(0.98) translateY(2px); } 100% { transform: scale(1) translateY(0); } }
      </style>
    </defs>
    ${room}
    ${bed}
    <g class="${dogGroupClass}">
      ${renderLegs(cx, cy, scale, baseColor)}
      ${renderTail(cx, cy, scale, baseColor, dog.tail, mood, asleep)}
      ${bodyShape}
      ${tuxedo}
      ${renderClothes(cx, cy, scale, dog.clothes)}
      ${renderCollar(headX, headY + 38 * scale, scale, dog.collar)}
      ${renderEars(headX, headY, scale, baseColor, dog.ears)}
      ${head}
      ${renderFace(headX, headY, scale, eyeColor, mood, asleep)}
    </g>
  </svg>`;
}
