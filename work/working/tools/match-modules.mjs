// Matches the renderer modules of a new release to the previous one by content and writes the new
// release's module-overrides.json, so that the same app module keeps the same file path (what a
// 3-way merge of our edits needs). Webpack ids change between releases; content mostly does not.
//   1. equal text after blanking module ids (unique on both sides),
//   2. dependency propagation: matched modules with the same number of requires pair their deps,
//   3. rare-token similarity (string literals, i18n keys, names) for changed modules, mutual best,
//   4. leftover groups of equal text paired in id order,
//   5. rewritten modules that still export the same unique name (`exports.HubEventsService`).
// An override is written for a matched module whose path in the new tree differs from the old one,
// when it is app code on either side, the old path depends on the module id (lib/_unknown/<id>,
// `.<id>` suffix) or the old release overrode it. Rerun after regenerate.sh until it reports 0 new
// overrides (paths settle).
// Usage: node match-modules.mjs <old raw bundle.web> <old MANIFEST.json> <old module-overrides.json>
//          <new raw bundle.web> <new MANIFEST.json> <new module-overrides.json> [<matches.json>]
//   the new module-overrides.json is updated in place (existing entries kept); matches.json gets every pair.
// Exit: 0 done, 2 usage error.
import fs from 'node:fs';
import path from 'node:path';

const MIN_SIMILARITY = 0.5;   // weighted token overlap accepted for a changed module (checked by hand on 1.2.0)
const RARE_DF = 30;           // tokens in more modules than this do not select candidates
const [, , oldDir, oldManifestFile, oldOverridesFile, newDir, newManifestFile, overridesFile, matchesFile] = process.argv;
if (!overridesFile) {
  console.error('Usage: node match-modules.mjs <old raw bundle.web> <old MANIFEST.json> <old module-overrides.json> '
    + '<new raw bundle.web> <new MANIFEST.json> <new module-overrides.json> [<matches.json>]');
  process.exit(2);
}
const REQ = /require\((?:\/\*[^*]*\*\/)?"\.\/(\d+)\.js"\)|from "\.\/(\d+)\.js"/g;
const TOKEN = /"([^"\\\n]{3,200})"|'([^'\\\n]{3,200})'|\b([A-Za-z_$][\w$]{3,})\b/g;

// Loads raw modules: id -> {id, text (ids blanked), deps (ordered), tokens (set)}.
function load(dir) {
  const entry = JSON.parse(fs.readFileSync(path.join(dir, 'bundle.json'), 'utf8')).entryId;
  const mods = new Map();
  for (const f of fs.readdirSync(dir)) {
    const id = f === 'index.js' ? entry : f.match(/^(\d+)\.js$/)?.[1];
    if (!id) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const deps = [...src.matchAll(REQ)].map((m) => m[1] ?? m[2]);
    const text = src.replace(REQ, 'require(#)');
    const tokens = new Set([...text.matchAll(TOKEN)].map((m) => m[1] ?? m[2] ?? m[3]));
    mods.set(id, { id, text, deps, tokens });
  }
  return mods;
}

const oldMods = load(oldDir), newMods = load(newDir);
const oldManifest = JSON.parse(fs.readFileSync(oldManifestFile, 'utf8'));
const newManifest = JSON.parse(fs.readFileSync(newManifestFile, 'utf8'));
const pairOfNew = new Map(), pairOfOld = new Map(), method = new Map();
const pair = (o, n, how) => {
  if (pairOfOld.has(o) || pairOfNew.has(n)) return false;
  pairOfOld.set(o, n); pairOfNew.set(n, o); method.set(n, how);
  return true;
};

// 1. unique equal text
const byText = (mods) => {
  const m = new Map();
  for (const x of mods.values()) m.set(x.text, [...(m.get(x.text) ?? []), x.id]);
  return m;
};
const oldText = byText(oldMods), newText = byText(newMods);
for (const [text, ids] of newText) {
  const o = oldText.get(text);
  if (ids.length === 1 && o?.length === 1) pair(o[0], ids[0], 'equal');
}

// 2. dependency propagation (repeated until nothing changes)
function propagate() {
  let added = 0;
  for (let changed = true; changed;) {
    changed = false;
    for (const [n, o] of pairOfNew) {
      const a = oldMods.get(o).deps, b = newMods.get(n).deps;
      if (a.length !== b.length) continue;
      for (let i = 0; i < a.length; i++) {
        if (!oldMods.has(a[i]) || !newMods.has(b[i])) continue;
        if (pairOfOld.has(a[i]) || pairOfNew.has(b[i])) continue;
        if (similarity(oldMods.get(a[i]), newMods.get(b[i])) < MIN_SIMILARITY && oldMods.get(a[i]).text !== newMods.get(b[i]).text) continue;
        if (pair(a[i], b[i], 'dependency')) { added++; changed = true; }
      }
    }
  }
  return added;
}

// 3. rare-token similarity
const df = new Map();
for (const mods of [oldMods, newMods]) for (const x of mods.values()) for (const t of x.tokens) df.set(t, (df.get(t) ?? 0) + 1);
const weight = (t) => 1 / Math.log2(1 + (df.get(t) ?? 1));
// Returns the weighted overlap (0..1) of two modules' token sets.
function similarity(a, b) {
  let common = 0, total = 0;
  for (const t of a.tokens) { total += weight(t); if (b.tokens.has(t)) common += weight(t); }
  for (const t of b.tokens) if (!a.tokens.has(t)) total += weight(t);
  return total ? common / total : a.text === b.text ? 1 : 0;
}
function fuzzy() {
  const index = new Map();       // rare token -> unmatched old ids
  for (const x of oldMods.values()) {
    if (pairOfOld.has(x.id)) continue;
    for (const t of x.tokens) if ((df.get(t) ?? 0) <= RARE_DF) index.set(t, [...(index.get(t) ?? []), x.id]);
  }
  const best = (n) => {
    const cands = new Set();
    for (const t of n.tokens) for (const o of index.get(t) ?? []) cands.add(o);
    let top = null;
    for (const o of cands) {
      const s = similarity(oldMods.get(o), n);
      if (!top || s > top.s) top = { o, s };
    }
    return top;
  };
  const proposals = [];
  for (const n of newMods.values()) {
    if (pairOfNew.has(n.id)) continue;
    const b = best(n);
    if (b && b.s >= MIN_SIMILARITY) proposals.push({ n: n.id, ...b });
  }
  // mutual best: the old module has no better unmatched new candidate
  const bestForOld = new Map();
  for (const p of proposals) if (!bestForOld.has(p.o) || bestForOld.get(p.o).s < p.s) bestForOld.set(p.o, p);
  let added = 0;
  for (const p of bestForOld.values()) if (pair(p.o, p.n, `similar ${p.s.toFixed(2)}`)) added++;
  return added;
}

propagate();
for (let round = 0; round < 5 && fuzzy() + propagate() > 0; round++);

// 4. leftover groups of equal text, in id order
for (const [text, ids] of newText) {
  const n = ids.filter((id) => !pairOfNew.has(id)).sort((a, b) => a - b);
  const o = (oldText.get(text) ?? []).filter((id) => !pairOfOld.has(id)).sort((a, b) => a - b);
  for (let i = 0; i < Math.min(n.length, o.length); i++) pair(o[i], n[i], 'equal-group');
}
propagate();

// 5. same unique exported name among the modules still unmatched
const exportsOf = (x) => new Set([...x.text.matchAll(/^exports\.([A-Za-z_$][\w$]{3,}) = /gm)].map((m) => m[1]));
const uniqueExports = (mods, paired) => {
  const owner = new Map();
  for (const x of mods.values()) {
    if (paired.has(x.id)) continue;
    for (const name of exportsOf(x)) owner.set(name, owner.has(name) ? null : x.id);
  }
  return owner;
};
const oldExports = uniqueExports(oldMods, pairOfOld), newExports = uniqueExports(newMods, pairOfNew);
for (const [name, n] of newExports) {
  const o = oldExports.get(name);
  if (n && o && name !== 'default') pair(o, n, `export ${name}`);
}
propagate();

// ---- overrides
const ID_BASED = /^lib\/_unknown\/\d+\.js$|\.\d+\.js$|module_\d+\.js$|lang_\d+\.js$|assets\/\d+\.js$/;
const overrides = fs.existsSync(overridesFile) ? JSON.parse(fs.readFileSync(overridesFile, 'utf8')) : {};
const oldOverridden = new Set(Object.keys(JSON.parse(fs.readFileSync(oldOverridesFile, 'utf8'))));
let added = 0;
for (const [n, o] of pairOfNew) {
  const was = oldManifest[o], now = newManifest[n];
  if (!was || !now) continue;
  if (was.path === now.path && !oldOverridden.has(o)) continue;
  if (was.kind !== 'app' && now.kind !== 'app' && !ID_BASED.test(was.path) && !oldOverridden.has(o)) continue;
  const target = was.path.replace(/\.js$/, '');
  if (overrides[n] === target) continue;
  overrides[n] = target;
  added++;
}
const sorted = Object.fromEntries(Object.entries(overrides).sort((a, b) => a[0] - b[0]));
fs.writeFileSync(overridesFile, `${JSON.stringify(sorted, null, 1)}\n`);
if (matchesFile) {
  const rows = [...pairOfNew].map(([n, o]) => ({ new: +n, old: +o, how: method.get(n), oldPath: oldManifest[o]?.path, newPath: newManifest[n]?.path }));
  fs.writeFileSync(matchesFile, `${JSON.stringify(rows.sort((a, b) => a.new - b.new), null, 1)}\n`);
}
const how = {};
for (const h of method.values()) { const k = h.split(' ')[0]; how[k] = (how[k] ?? 0) + 1; }
console.log(`matched ${pairOfNew.size}/${newMods.size} new modules (old ${oldMods.size}):`, JSON.stringify(how));
console.log(`overrides: ${Object.keys(sorted).length} total, ${added} new`);
