/**
 * save.js — JSON save/load with semver versioning.
 *
 * Same major version => migratable. Different major => rejected with a
 * user-facing message. Mirrors the rules in scripts/validate_save.py.
 */

export const CURRENT_VERSION = '1.1.0';

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseSemver(s) {
  const m = SEMVER_RE.exec(s);
  if (!m) throw new Error(`Invalid version: ${s}`);
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

export function isCompatible(a, b) {
  return parseSemver(a).major === parseSemver(b).major;
}

const REQUIRED_DOG_FIELDS = [
  'name', 'breed', 'gender', 'size', 'fur', 'coat_color',
  'markings', 'eye_color', 'ears', 'tail', 'collar', 'clothes', 'age_stage',
];
const REQUIRED_STATS = ['hunger', 'thirst', 'bladder', 'energy'];

export function validate(save) {
  const errors = [];
  if (!save || typeof save !== 'object') return ['save must be an object'];
  if (typeof save.version !== 'string') errors.push('missing version');
  else { try { parseSemver(save.version); } catch (e) { errors.push(e.message); } }
  if (typeof save.saved_at !== 'number') errors.push('saved_at must be a number');
  if (!save.dog || typeof save.dog !== 'object') errors.push('missing dog');
  else {
    for (const f of REQUIRED_DOG_FIELDS) {
      if (typeof save.dog[f] !== 'string') errors.push(`dog.${f} required`);
    }
  }
  if (!save.stats || typeof save.stats !== 'object') errors.push('missing stats');
  else {
    for (const s of REQUIRED_STATS) {
      if (typeof save.stats[s] !== 'number') errors.push(`stats.${s} required`);
    }
  }
  if (typeof save.personality !== 'string') errors.push('missing personality');
  if (!Array.isArray(save.tricks)) errors.push('tricks must be an array');
  if (!Array.isArray(save.history)) errors.push('history must be an array');
  return errors;
}

export function migrate(save) {
  if (!save.version) throw new Error('save has no version');
  if (!isCompatible(save.version, CURRENT_VERSION)) {
    throw new Error(
      `This save is from a different major version (${save.version}). ` +
      `It cannot be loaded by this build (${CURRENT_VERSION}).`
    );
  }
  // Same major, no registered migrations yet — bump version forward.
  if (save.version !== CURRENT_VERSION) {
    save = { ...save, version: CURRENT_VERSION };
  }
  return save;
}

/** Build a fresh save dict from an in-memory game state. */
export function buildSave(state) {
  return {
    version: CURRENT_VERSION,
    saved_at: Math.floor(Date.now() / 1000),
    dog: { ...state.dog },
    stats: { ...state.stats },
    personality: state.personality,
    tricks: [...state.tricks],
    history: state.history.slice(-50), // cap history for save size
  };
}

/** Trigger a browser download of the save as a JSON file. */
export function downloadSave(state) {
  const save = buildSave(state);
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = (state.dog.name || 'doggo').replace(/[^a-z0-9_-]/gi, '_');
  a.href = url;
  a.download = `doggo-chat__${safe}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Read a File object as a save dict. Throws on invalid. */
export async function readSaveFile(file) {
  const text = await file.text();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('That file is not valid JSON.'); }
  const errors = validate(parsed);
  if (errors.length) throw new Error(`Save is invalid:\n- ${errors.join('\n- ')}`);
  return migrate(parsed);
}
