/**
 * sound.js — sound effect and background music system.
 *
 * Reads `assets/js/sounds.js` (built from the directories under
 * `assets/sounds/` by `scripts/build_sounds.py`). Users add their own audio
 * files to those directories and re-run the build to register them.
 *
 * Categories:
 *   bark, whine, happy, eating  — one-shot SFX
 *   music/idle, music/play, music/sleep — looped background music
 */

import SOUND_MANIFEST from './sounds.js';

let sfxEnabled = true;
let musicEnabled = true;
let currentMusic = null;

export function setSfxEnabled(v) { sfxEnabled = !!v; }
export function setMusicEnabled(v) {
  musicEnabled = !!v;
  if (!musicEnabled && currentMusic) {
    currentMusic.pause();
    currentMusic = null;
  }
}

function pick(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

/** Play one random sound from a category. No-op if no files in that slot. */
export function playSfx(category) {
  if (!sfxEnabled) return;
  const files = SOUND_MANIFEST[category];
  if (!files?.length) return;
  const url = `${withBase(pick(files))}`;
  try {
    const audio = new Audio(url);
    audio.volume = 0.7;
    audio.play().catch(() => { /* autoplay policy or missing file — silently ignore */ });
  } catch { /* ignored */ }
}

/** Switch background music to one in a category. No-op if empty. */
export function playMusic(category) {
  if (!musicEnabled) return;
  const files = SOUND_MANIFEST[category];
  if (!files?.length) {
    if (currentMusic) { currentMusic.pause(); currentMusic = null; }
    return;
  }
  const url = `${withBase(pick(files))}`;
  if (currentMusic) {
    currentMusic.pause();
  }
  try {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.4;
    audio.play().catch(() => { /* user gesture not yet given — fine */ });
    currentMusic = audio;
  } catch { /* ignored */ }
}

export function stopMusic() {
  if (currentMusic) {
    currentMusic.pause();
    currentMusic = null;
  }
}

/** Resolve a manifest path against the page baseurl (Jekyll-friendly). */
function withBase(rel) {
  // The manifest stores paths like "sounds/bark/woof.mp3" relative to /assets/.
  // The page lives at site root; assets are at /assets/.
  return `assets/${rel}`;
}

/** Map an action id to the SFX category it should fire. */
export const ACTION_SFX = {
  pet: 'happy',
  feed: 'eating',
  water: 'happy',
  outside: 'happy',
  brush: 'happy',
  treat: 'happy',
  fetch: 'bark',
  scold: 'whine',
  ignore: 'whine',
  trick: 'bark',
};
