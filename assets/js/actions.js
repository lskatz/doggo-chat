/**
 * actions.js — definitions for all interactions a player can take.
 *
 * Each action has:
 *   id: stable identifier
 *   label: text shown on the button
 *   icon: emoji shown on the button
 *   category: 'positive' | 'negative' | 'other'
 *   effects(state): returns a partial stats delta object
 *   available(state): returns true if button is enabled
 *   reaction(state, personality): returns a string for the speech bubble
 */

import DOGGO_DATA from './data.js';

function getReactions(personalityId, key) {
  const p = DOGGO_DATA.personalities.find(x => x.id === personalityId);
  return p?.reactions?.[key] || [];
}

function pickReaction(personalityId, key, fallback) {
  const arr = getReactions(personalityId, key);
  if (!arr.length) return fallback;
  return arr[Math.floor(Math.random() * arr.length)];
}

export const ACTIONS = [
  // ============ POSITIVE ============
  {
    id: 'pet',
    label: 'Pet',
    icon: '🤚',
    category: 'positive',
    effects: () => ({}),
    available: () => true,
    reaction: (s, pid) => pickReaction(pid, 'pet_positive', 'Tail wags!'),
  },
  {
    id: 'feed',
    label: 'Feed',
    icon: '🍖',
    category: 'positive',
    effects: () => ({ hunger: +35 }),
    available: (s) => s.stats.hunger < 90,
    reaction: (s, pid) => pickReaction(pid, 'feed_positive', 'Yum!'),
  },
  {
    id: 'water',
    label: 'Water',
    icon: '💧',
    category: 'positive',
    effects: () => ({ thirst: +40, bladder: +5 }),
    available: (s) => s.stats.thirst < 90,
    reaction: () => 'Slurp slurp slurp!',
  },
  {
    id: 'outside',
    label: 'Outside',
    icon: '🌳',
    category: 'positive',
    effects: () => ({ bladder: -90, energy: -5 }),
    available: (s) => s.stats.bladder >= 25,
    reaction: () => 'Aaaah, much better!',
  },
  {
    id: 'brush',
    label: 'Brush',
    icon: '🪮',
    category: 'positive',
    effects: () => ({ energy: -3 }),
    available: () => true,
    reaction: () => 'Mmmm, that feels good.',
  },
  {
    id: 'treat',
    label: 'Treat',
    icon: '🦴',
    category: 'positive',
    effects: () => ({ hunger: +8 }),
    available: () => true,
    reaction: () => 'A treat?! Best day ever!',
  },
  {
    id: 'fetch',
    label: 'Fetch',
    icon: '🎾',
    category: 'positive',
    effects: () => ({ energy: -15, hunger: -5, thirst: -5 }),
    available: (s) => s.stats.energy >= 25,
    reaction: () => '*sprints after the ball*',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    icon: '💤',
    category: 'positive',
    effects: () => ({}), // handled via the asleep flag in stats.tick
    available: (s) => s.stats.energy < 70,
    reaction: () => 'Curls up. Soft snores.',
    setsAsleep: true,
  },
  {
    id: 'wake',
    label: 'Wake',
    icon: '☀️',
    category: 'positive',
    effects: () => ({}),
    available: (s) => s.asleep === true,
    reaction: () => 'Stretches. Big yawn!',
    clearsAsleep: true,
  },

  // ============ NEGATIVE ============
  {
    id: 'scold',
    label: 'Scold',
    icon: '👎',
    category: 'negative',
    effects: () => ({}),
    // Only available if dog has had a recent accident — set in state.flags
    available: (s) => s.flags?.recent_accident === true,
    reaction: (s, pid) => pickReaction(pid, 'scold_negative', 'Tail tucks. Sad eyes.'),
    clearsFlag: 'recent_accident',
  },
  {
    id: 'ignore',
    label: 'Ignore',
    icon: '🙈',
    category: 'negative',
    effects: () => ({}),
    available: () => true,
    reaction: () => '...whines a little.',
  },

  // ============ OTHER ============
  {
    id: 'trick',
    label: 'Do Trick',
    icon: '🎩',
    category: 'other',
    // The trick selector is handled separately in the UI; this entry is a placeholder.
    effects: () => ({ energy: -3 }),
    available: (s) => (s.tricks?.length || 0) > 0 && s.stats.energy >= 15,
    reaction: () => null, // handled by trick handler
    isTrickMenu: true,
  },
];

export const ACTIONS_BY_ID = Object.fromEntries(ACTIONS.map(a => [a.id, a]));

export const CATEGORIES = ['positive', 'negative', 'other'];

export function actionsByCategory(category) {
  return ACTIONS.filter(a => a.category === category);
}

/**
 * Apply an action to a game state. Returns { newState, reaction }.
 * Caller is responsible for updating UI and triggering sound.
 */
export function applyAction(state, actionId) {
  const action = ACTIONS_BY_ID[actionId];
  if (!action) throw new Error(`Unknown action: ${actionId}`);
  if (!action.available(state)) {
    return { newState: state, reaction: null, blocked: true };
  }
  const delta = action.effects(state) || {};
  const newStats = { ...state.stats };
  for (const [k, v] of Object.entries(delta)) {
    newStats[k] = clamp((newStats[k] || 0) + v);
  }
  let asleep = state.asleep;
  if (action.setsAsleep) asleep = true;
  if (action.clearsAsleep) asleep = false;

  const flags = { ...(state.flags || {}) };
  if (action.clearsFlag) delete flags[action.clearsFlag];

  const reaction = action.reaction(state, state.personality);
  const newHistory = [...(state.history || []), { t: Date.now(), action: actionId }].slice(-50);
  const newState = { ...state, stats: newStats, asleep, flags, history: newHistory };
  return { newState, reaction, blocked: false };
}

function clamp(v) { return Math.max(0, Math.min(100, v)); }
