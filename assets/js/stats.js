/**
 * stats.js — needs simulation and mood derivation.
 *
 * Stats: hunger, thirst, bladder, energy (each 0..100).
 *  - hunger: 100 = full, 0 = starving. Decreases over time.
 *  - thirst: 100 = hydrated, 0 = parched. Decreases over time.
 *  - bladder: 0 = empty, 100 = bursting. Increases over time. INVERTED.
 *  - energy: 100 = wired, 0 = exhausted. Decreases while awake, recovers asleep.
 */

import DOGGO_DATA from './data.js';

// Base decay PER HOUR, before personality multipliers.
// Tuned so the dog needs attention every few hours, not every minute.
const BASE_RATES = {
  hunger:  -10,   // -10/hour => empty in 10 hours from full
  thirst:  -15,   // -15/hour => empty in ~7 hours from full
  bladder: +20,   // +20/hour => full in 5 hours
  energy:  -8,    // -8/hour while awake
};

const ENERGY_REGEN_ASLEEP = +30; // per hour while sleeping

export function getDecayRates(personalityId) {
  const personality = DOGGO_DATA.personalities.find(p => p.id === personalityId);
  const mult = personality?.decay || { hunger: 1, thirst: 1, bladder: 1, energy: 1 };
  return {
    hunger:  BASE_RATES.hunger  * mult.hunger,
    thirst:  BASE_RATES.thirst  * mult.thirst,
    bladder: BASE_RATES.bladder * mult.bladder,
    energy:  BASE_RATES.energy  * mult.energy,
  };
}

/**
 * Apply elapsed time (in seconds) to stats. Returns new stats object (immutable).
 * `asleep` swaps energy decay for regen.
 */
export function tick(stats, elapsedSeconds, personalityId, asleep = false) {
  const rates = getDecayRates(personalityId);
  const hours = elapsedSeconds / 3600;
  const next = {
    hunger:  stats.hunger  + rates.hunger  * hours,
    thirst:  stats.thirst  + rates.thirst  * hours,
    bladder: stats.bladder + rates.bladder * hours,
    energy:  stats.energy  + (asleep ? ENERGY_REGEN_ASLEEP : rates.energy) * hours,
  };
  return clampAll(next);
}

export function clampAll(stats) {
  return {
    hunger:  clamp(stats.hunger),
    thirst:  clamp(stats.thirst),
    bladder: clamp(stats.bladder),
    energy:  clamp(stats.energy),
  };
}

export function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Derive a coarse mood from stats. Used by the dog renderer for face/posture
 * and by the action layer to gate certain reactions.
 *
 * Returns one of: 'happy' | 'okay' | 'sad' | 'desperate' | 'sleepy'
 */
export function moodFrom(stats) {
  if (stats.energy <= 15) return 'sleepy';
  // For hunger/thirst/energy, low = bad. For bladder, high = bad.
  const lows = [stats.hunger, stats.thirst, stats.energy].filter(v => v <= 25).length;
  const bladderUrgent = stats.bladder >= 80;
  if (lows >= 2 || bladderUrgent && lows >= 1) return 'desperate';
  if (lows === 1 || bladderUrgent) return 'sad';
  if (stats.hunger > 70 && stats.thirst > 70 && stats.bladder < 50 && stats.energy > 50) return 'happy';
  return 'okay';
}

/** Classify a stat into 'good' | 'warn' | 'crit' for visual styling. */
export function classify(name, value) {
  // Bladder is inverted: high is bad.
  if (name === 'bladder') {
    if (value >= 85) return 'crit';
    if (value >= 60) return 'warn';
    return 'good';
  }
  if (value <= 20) return 'crit';
  if (value <= 40) return 'warn';
  return 'good';
}

/** Stat label and unit for UI. */
export const STAT_META = {
  hunger:  { label: 'Hunger',  emoji: '🍖' },
  thirst:  { label: 'Thirst',  emoji: '💧' },
  bladder: { label: 'Bladder', emoji: '🚽' },
  energy:  { label: 'Energy',  emoji: '⚡' },
};
