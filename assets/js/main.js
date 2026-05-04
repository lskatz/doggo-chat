/**
 * main.js — application entry. Manages screens (title / customize / play),
 * holds in-memory state, and wires user input to action handlers.
 */

import DOGGO_DATA from './data.js';
import * as Save from './save.js';
import * as Stats from './stats.js';
import * as Sound from './sound.js';
import { ACTIONS, ACTIONS_BY_ID, CATEGORIES, actionsByCategory, applyAction } from './actions.js';
import { renderDogScene } from './dog.js';

// ----- State ----------------------------------------------------------------

/** @type {object} */
let state = null;

let lastTickTimestamp = null;
let tickInterval = null;

const root = () => document.getElementById('screen-root');

// ----- Screen routing -------------------------------------------------------

function showTitle() {
  stopTickLoop();
  root().innerHTML = `
    <section class="title-screen">
      <div class="title-art">🐕</div>
      <h1>Doggo Chat</h1>
      <p class="subtitle">Adopt a dog. Care for a friend.</p>
      <div class="menu">
        <button class="btn btn-primary" id="btn-new">New Dog</button>
        <button class="btn btn-secondary" id="btn-load">Load Save</button>
      </div>
      <input type="file" id="load-file" accept="application/json" style="display:none">
    </section>
  `;
  document.getElementById('btn-new').addEventListener('click', showCustomize);
  document.getElementById('btn-load').addEventListener('click', () => {
    document.getElementById('load-file').click();
  });
  document.getElementById('load-file').addEventListener('change', onLoadFile);
}

function showCustomize() {
  // Initialize a default dog if not already in state.
  const draft = state?.dog || defaultDog();
  const personality = state?.personality || DOGGO_DATA.personalities[0].id;

  root().innerHTML = `
    <section class="customize-screen">
      <div class="customize-header">
        <h2>Make Your Dog</h2>
        <button class="btn btn-ghost" id="btn-back">←</button>
      </div>

      <div class="customize-preview" id="preview"></div>

      <div class="customize-section">
        <h3>Name</h3>
        <input class="text-input" id="input-name" type="text" maxlength="20" value="${escapeAttr(draft.name)}" placeholder="What's their name?">
      </div>

      <div class="customize-section">
        <h3>Breed</h3>
        <div class="chip-row" id="chips-breed"></div>
      </div>

      <div class="customize-section">
        <h3>Size</h3>
        <div class="chip-row" id="chips-size"></div>
      </div>

      <div class="customize-section">
        <h3>Coat Color</h3>
        <div class="chip-row" id="chips-coat"></div>
      </div>

      <div class="customize-section">
        <h3>Markings</h3>
        <div class="chip-row" id="chips-markings"></div>
      </div>

      <div class="customize-section">
        <h3>Eyes</h3>
        <div class="chip-row" id="chips-eyes"></div>
      </div>

      <div class="customize-section">
        <h3>Ears</h3>
        <div class="chip-row" id="chips-ears"></div>
      </div>

      <div class="customize-section">
        <h3>Tail</h3>
        <div class="chip-row" id="chips-tail"></div>
      </div>

      <div class="customize-section">
        <h3>Fur</h3>
        <div class="chip-row" id="chips-fur"></div>
      </div>

      <div class="customize-section">
        <h3>Gender</h3>
        <div class="chip-row" id="chips-gender"></div>
      </div>

      <div class="customize-section">
        <h3>Age</h3>
        <div class="chip-row" id="chips-age"></div>
      </div>

      <div class="customize-section">
        <h3>Collar</h3>
        <div class="chip-row" id="chips-collar"></div>
      </div>

      <div class="customize-section">
        <h3>Clothes</h3>
        <div class="chip-row" id="chips-clothes"></div>
      </div>

      <div class="customize-section">
        <h3>Personality</h3>
        <div class="chip-row" id="chips-personality"></div>
      </div>

      <div class="customize-section">
        <h3>Tricks (built-in)</h3>
        <p style="color:var(--ink-soft);font-size:0.9rem;margin:0 0 var(--s-3) 0;">
          Pick the tricks your dog already knows.
        </p>
        <div class="chip-row" id="chips-tricks"></div>
      </div>

      <button class="btn btn-primary" id="btn-start" style="margin-top:var(--s-3);">Start Playing</button>
    </section>
  `;

  let working = { ...draft };
  let workingPersonality = personality;
  let workingTricks = state?.tricks ? [...state.tricks] : ['sit'];

  const updatePreview = () => {
    document.getElementById('preview').innerHTML = renderDogScene(working, {
      mood: 'happy', includeRoom: false,
    });
  };

  // Apply breed defaults when breed changes.
  const onBreedChange = (id) => {
    const breed = DOGGO_DATA.breeds.find(b => b.id === id);
    working.breed = id;
    if (breed.default_size) working.size = breed.default_size;
    if (breed.default_fur) working.fur = breed.default_fur;
    if (breed.default_ears) working.ears = breed.default_ears;
    if (breed.default_tail) working.tail = breed.default_tail;
    renderAllChips();
    updatePreview();
  };

  const renderChips = (containerId, items, currentId, setter, getColor = null) => {
    const c = document.getElementById(containerId);
    c.innerHTML = items.map(it => {
      const swatch = getColor ? `<span class="swatch" style="background:${getColor(it)}"></span>` : '';
      return `<button class="chip" aria-pressed="${it.id === currentId}" data-id="${it.id}">${swatch}${escapeHtml(it.name)}</button>`;
    }).join('');
    c.onclick = e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      setter(btn.dataset.id);
    };
  };

  const renderToggleChips = (containerId, items, selectedSet, setter) => {
    const c = document.getElementById(containerId);
    c.innerHTML = items.map(it =>
      `<button class="chip" aria-pressed="${selectedSet.has(it.id)}" data-id="${it.id}">${escapeHtml(it.name)}</button>`
    ).join('');
    c.onclick = e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      setter(btn.dataset.id);
    };
  };

  const renderAllChips = () => {
    renderChips('chips-breed', DOGGO_DATA.breeds, working.breed, onBreedChange);
    renderChips('chips-size',
      [{ id: 'small', name: 'Small' }, { id: 'medium', name: 'Medium' }, { id: 'large', name: 'Large' }],
      working.size, (id) => { working.size = id; renderAllChips(); updatePreview(); });
    renderChips('chips-coat', DOGGO_DATA.colors.coat_colors, working.coat_color,
      (id) => { working.coat_color = id; renderAllChips(); updatePreview(); },
      (it) => it.hex);
    renderChips('chips-markings', DOGGO_DATA.colors.markings, working.markings,
      (id) => { working.markings = id; renderAllChips(); updatePreview(); });
    renderChips('chips-eyes', DOGGO_DATA.colors.eye_colors, working.eye_color,
      (id) => { working.eye_color = id; renderAllChips(); updatePreview(); },
      (it) => it.hex);
    renderChips('chips-ears',
      [{ id: 'floppy', name: 'Floppy' }, { id: 'perky', name: 'Perky' }, { id: 'semi_erect', name: 'Half-up' }],
      working.ears, (id) => { working.ears = id; renderAllChips(); updatePreview(); });
    renderChips('chips-tail',
      [{ id: 'straight', name: 'Straight' }, { id: 'curly', name: 'Curly' }, { id: 'bobbed', name: 'Bobbed' }, { id: 'docked', name: 'Docked' }],
      working.tail, (id) => { working.tail = id; renderAllChips(); updatePreview(); });
    renderChips('chips-fur',
      [{ id: 'short', name: 'Short' }, { id: 'medium', name: 'Medium' }, { id: 'long', name: 'Long' }],
      working.fur, (id) => { working.fur = id; renderAllChips(); updatePreview(); });
    renderChips('chips-gender',
      [{ id: 'female', name: 'Female' }, { id: 'male', name: 'Male' }, { id: 'unspecified', name: 'Unspecified' }],
      working.gender, (id) => { working.gender = id; renderAllChips(); });
    renderChips('chips-age',
      [{ id: 'puppy', name: 'Puppy' }, { id: 'adult', name: 'Adult' }, { id: 'senior', name: 'Senior' }],
      working.age_stage, (id) => { working.age_stage = id; renderAllChips(); });
    renderChips('chips-collar', DOGGO_DATA.accessories.collars, working.collar,
      (id) => { working.collar = id; renderAllChips(); updatePreview(); },
      (it) => it.color || 'transparent');
    renderChips('chips-clothes', DOGGO_DATA.accessories.clothes, working.clothes,
      (id) => { working.clothes = id; renderAllChips(); updatePreview(); },
      (it) => it.color || 'transparent');
    renderChips('chips-personality', DOGGO_DATA.personalities, workingPersonality,
      (id) => { workingPersonality = id; renderAllChips(); });

    const trickSet = new Set(workingTricks);
    renderToggleChips('chips-tricks', DOGGO_DATA.accessories.tricks, trickSet, (id) => {
      if (trickSet.has(id)) trickSet.delete(id); else trickSet.add(id);
      workingTricks = Array.from(trickSet);
      renderAllChips();
    });
  };

  renderAllChips();
  updatePreview();

  document.getElementById('input-name').addEventListener('input', e => {
    working.name = e.target.value;
  });
  document.getElementById('btn-back').addEventListener('click', showTitle);
  document.getElementById('btn-start').addEventListener('click', () => {
    if (!working.name?.trim()) {
      working.name = 'Doggo';
    }
    state = freshState(working, workingPersonality, workingTricks);
    lastTickTimestamp = Date.now();
    showPlay();
  });
}

function showPlay() {
  root().innerHTML = `
    <section class="play-screen">
      <div class="dog-name-row">
        <h2 id="dog-name"></h2>
        <span class="breed-label" id="dog-breed"></span>
      </div>

      <div class="stats-panel" id="stats-panel"></div>

      <div class="scene" id="scene"></div>

      <div class="actions" id="actions"></div>

      <div class="footer-row">
        <button class="btn" id="btn-save">💾 Save</button>
        <button class="btn" id="btn-load">📂 Load</button>
        <button class="btn" id="btn-new">🐾 New Dog</button>
      </div>
      <input type="file" id="load-file" accept="application/json" style="display:none">
    </section>
  `;

  document.getElementById('btn-save').addEventListener('click', () => {
    Save.downloadSave(state);
    toast('Save downloaded!');
  });
  document.getElementById('btn-load').addEventListener('click', () => {
    document.getElementById('load-file').click();
  });
  document.getElementById('load-file').addEventListener('change', onLoadFile);
  document.getElementById('btn-new').addEventListener('click', () => {
    if (confirm('Start over with a new dog? Your current dog will be lost unless you save first.')) {
      state = null;
      showTitle();
    }
  });

  renderPlayScreen();
  document.getElementById('actions').addEventListener('click', e => {
    const btn = e.target.closest('.action-btn');
    if (!btn || btn.disabled) return;
    onActionClick(btn.dataset.action);
  });
  startTickLoop();
  Sound.playMusic('music/idle');
}

// ----- Render helpers -------------------------------------------------------

function renderPlayScreen() {
  if (!state) return;
  document.getElementById('dog-name').textContent = state.dog.name;
  const breed = DOGGO_DATA.breeds.find(b => b.id === state.dog.breed);
  document.getElementById('dog-breed').textContent = breed?.name || '';

  renderStatsPanel();
  renderScene();
  renderActions();
}

function renderStatsPanel() {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;
  panel.innerHTML = ['hunger', 'thirst', 'bladder', 'energy'].map(name => {
    const meta = Stats.STAT_META[name];
    const v = Math.round(state.stats[name]);
    const cls = Stats.classify(name, v);
    // For bladder, display as fullness (high = bad). For others, show as is.
    return `
      <div class="stat" data-stat="${name}">
        <div class="stat-label">
          <span>${meta.emoji} ${meta.label}</span>
          <span>${v}</span>
        </div>
        <div class="stat-bar"><div class="stat-fill ${cls === 'good' ? '' : cls}" style="width:${v}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderScene() {
  const scene = document.getElementById('scene');
  if (!scene) return;
  const mood = Stats.moodFrom(state.stats);
  scene.innerHTML = renderDogScene(state.dog, { mood, asleep: state.asleep });

  // Speech bubble overlay
  if (state.lastReaction) {
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = state.lastReaction;
    scene.appendChild(bubble);
  }
}

function renderActions() {
  const panel = document.getElementById('actions');
  if (!panel) return;
  const groups = CATEGORIES.map(cat => {
    const buttons = actionsByCategory(cat).map(action => {
      const enabled = action.available(state);
      return `
        <button class="action-btn" data-action="${action.id}" ${enabled ? '' : 'disabled'}>
          <span class="icon">${action.icon}</span>
          <span>${escapeHtml(action.label)}</span>
        </button>
      `;
    }).join('');
    return `
      <div class="action-group" data-category="${cat}">
        <h3>${capitalize(cat)}</h3>
        <div class="action-grid">${buttons}</div>
      </div>
    `;
  }).join('');
  panel.innerHTML = groups;
}

function onActionClick(actionId) {
  const action = ACTIONS_BY_ID[actionId];
  if (action.isTrickMenu) {
    showTrickMenu();
    return;
  }
  const { newState, reaction, blocked } = applyAction(state, actionId);
  if (blocked) return;
  state = { ...newState, lastReaction: reaction };
  Sound.playSfx(Sound.ACTION_SFX[actionId]);
  if (action.setsAsleep) Sound.playMusic('music/sleep');
  if (action.clearsAsleep) Sound.playMusic('music/idle');
  if (actionId === 'fetch') Sound.playMusic('music/play');
  renderPlayScreen();
}

function showTrickMenu() {
  const tricks = state.tricks
    .map(id => DOGGO_DATA.accessories.tricks.find(t => t.id === id))
    .filter(Boolean);
  if (!tricks.length) return;
  // Simple inline modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:50;';
  overlay.innerHTML = `
    <div style="background:var(--paper);padding:var(--s-5);border-radius:var(--r-lg);max-width:340px;width:90%;border:2px solid var(--paper-edge);">
      <h3 style="margin-bottom:var(--s-3);">Pick a trick</h3>
      <div class="chip-row">
        ${tricks.map(t => `<button class="chip" data-trick="${t.id}">${escapeHtml(t.name)}</button>`).join('')}
      </div>
      <button class="btn btn-ghost" id="cancel-trick" style="margin-top:var(--s-3);width:100%;">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.id === 'cancel-trick') {
      overlay.remove();
      return;
    }
    const tb = e.target.closest('[data-trick]');
    if (!tb) return;
    const trick = tricks.find(t => t.id === tb.dataset.trick);
    state.stats.energy = Stats.clamp(state.stats.energy - 3);
    state.lastReaction = `${state.dog.name} performs "${trick.name}"!`;
    Sound.playSfx('bark');
    overlay.remove();
    renderPlayScreen();
  });
}

// ----- Tick loop ------------------------------------------------------------

function startTickLoop() {
  stopTickLoop();
  // Apply elapsed time on resume.
  if (lastTickTimestamp) {
    const elapsedSec = (Date.now() - lastTickTimestamp) / 1000;
    state.stats = Stats.tick(state.stats, elapsedSec, state.personality, state.asleep);
    maybeAccident();
    lastTickTimestamp = Date.now();
    renderPlayScreen();
  }
  tickInterval = setInterval(() => {
    const now = Date.now();
    const elapsedSec = (now - lastTickTimestamp) / 1000;
    state.stats = Stats.tick(state.stats, elapsedSec, state.personality, state.asleep);
    maybeAccident();
    lastTickTimestamp = now;
    renderStatsPanel();
    renderScene(); // refresh mood
  }, 30 * 1000); // every 30s of wall time
}

function stopTickLoop() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function maybeAccident() {
  // If bladder fills to 100 while in the room, dog has an accident.
  if (state.stats.bladder >= 100 && !state.flags?.recent_accident) {
    state.flags = { ...(state.flags || {}), recent_accident: true };
    state.stats.bladder = 5;
    state.lastReaction = 'Oh no... an accident!';
    Sound.playSfx('whine');
  }
}

// ----- Save loading ---------------------------------------------------------

async function onLoadFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const loaded = await Save.readSaveFile(file);
    state = {
      dog: loaded.dog,
      stats: loaded.stats,
      personality: loaded.personality,
      tricks: loaded.tricks,
      history: loaded.history,
      asleep: false,
      flags: {},
      lastReaction: null,
    };
    lastTickTimestamp = (loaded.saved_at || Math.floor(Date.now()/1000)) * 1000;
    showPlay();
    toast(`Welcome back, ${state.dog.name}!`);
  } catch (err) {
    alert(err.message);
  }
}

// ----- Helpers --------------------------------------------------------------

function defaultDog() {
  return {
    name: '',
    breed: 'mutt',
    gender: 'unspecified',
    size: 'medium',
    fur: 'medium',
    coat_color: 'golden',
    markings: 'solid',
    eye_color: 'brown',
    ears: 'floppy',
    tail: 'straight',
    collar: 'classic_red',
    clothes: 'none',
    age_stage: 'adult',
  };
}

function freshState(dog, personality, tricks) {
  return {
    dog,
    stats: { hunger: 80, thirst: 80, bladder: 20, energy: 90 },
    personality,
    tricks,
    history: [],
    asleep: false,
    flags: {},
    lastReaction: `Hi! I'm ${dog.name}!`,
  };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
function escapeAttr(s) { return escapeHtml(s); }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

let toastTimer = null;
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3000);
}

// ----- Boot -----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', showTitle);
// Some browsers fire DOMContentLoaded before module scripts run.
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  showTitle();
}
