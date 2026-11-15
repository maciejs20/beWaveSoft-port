// Derives the name-main.json of a new release from the previous one: main process modules are
// matched by content, binding names are carried over by token alignment (align-bindings.mjs).
// The result is written once and then kept as the new version's config (review WARN lines).
// Usage: node port-name-main.mjs <old electron.main dir> <old name-main.json> <new electron.main dir> <out.json>
// Exit: 0 written (WARN lines list names that could not be carried over), 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { taggedTokens, voteBindings, translateMap, declarationMatches } from './align-bindings.mjs';
import { externals } from './name-main.mjs';

const MIN_SHARE = 0.6;   // below this share of aligned occurrences a carried name is reported as weak
const [, , oldDir, oldConfigFile, newDir, outFile] = process.argv;
if (!outFile) {
  console.error('Usage: node port-name-main.mjs <old electron.main dir> <old name-main.json> <new electron.main dir> <out.json>');
  process.exit(2);
}
const old = JSON.parse(fs.readFileSync(oldConfigFile, 'utf8'));

// Returns the module files of a main dir that hold code (not external re-exports).
function codeFiles(dir) {
  const ext = externals(dir);
  return fs.readdirSync(dir).filter((f) => /^(index|\d+)\.js$/.test(f) && !ext[f.replace(/\.js$/, '')]);
}
// Returns the multiset similarity (0..1) of two token lists.
function similarity(a, b) {
  const count = new Map();
  for (const t of a) count.set(t.text, (count.get(t.text) ?? 0) + 1);
  let common = 0;
  for (const t of b) { const n = count.get(t.text); if (n) { common++; count.set(t.text, n - 1); } }
  return (2 * common) / (a.length + b.length);
}
// Tags program scope `top`, the module.exports.default function `def` and any block scope `blk`
// (name-main.mjs renames block-scoped names in the first block that owns them).
function tagger() {
  let defFn;
  return (scope, ast) => {
    if (defFn === undefined) {
      defFn = ast.program.body.map((s) => s.expression).find((e) => e?.type === 'AssignmentExpression'
        && e.left.type === 'MemberExpression' && e.left.property.name === 'default'
        && e.left.object.type === 'MemberExpression' && e.left.object.property?.name === 'exports'
        && /Function/.test(e.right.type))?.right ?? null;
    }
    if (scope.block.type === 'Program') return 'top';
    if (defFn && scope.block === defFn) return 'def';
    if (scope.block.type === 'BlockStatement') return 'blk';
    return null;
  };
}

// Module ids differ between releases: requires become package names (or one placeholder for code
// modules) before alignment, so `var x = require("os")` lines pair up across versions.
function normalisedSource(dir, f) {
  const ext = externals(dir);
  return fs.readFileSync(path.join(dir, f), 'utf8').replace(/require\((?:\/\*[^*]*\*\/)?"\.\/(\d+)\.js"\)/g,
    (all, id) => `require("${ext[id] ?? './code-module'}")`);
}
const read = (dir, f) => ({ code: normalisedSource(dir, f), tokens: taggedTokens(normalisedSource(dir, f), tagger()) });
const candidates = codeFiles(newDir).map((f) => ({ f, ...read(newDir, f) }));
const out = { mainFile: null, files: {}, top: {}, mainDefault: {}, mainDefaultBlockScoped: [] };
const warn = (s) => console.log(`WARN ${s}`);
for (const [from, to] of Object.entries(old.files)) {
  const { code, tokens } = read(oldDir, from);
  const best = candidates.map((c) => ({ ...c, sim: similarity(tokens, c.tokens) })).sort((x, y) => y.sim - x.sim)[0];
  console.log(`OK ${to}: ${from} -> ${best.f} (similarity ${best.sim.toFixed(3)})`);
  out.files[best.f] = to;
  if (from === old.mainFile) out.mainFile = best.f;
  const votes = voteBindings(tokens, best.tokens, declarationMatches(code, best.code, tagger()));
  const report = (label, r) => {
    if (r.missing.length) warn(`${to} ${label}: not carried over: ${r.missing.join(', ')}`);
    if (r.weak.length) warn(`${to} ${label}: weak: ${r.weak.join(', ')}`);
  };
  if (old.top[from]) {
    const r = translateMap(old.top[from], votes.get('top'), MIN_SHARE);
    out.top[best.f] = r.map;
    report('top', r);
  }
  if (from === old.mainFile) {
    // a name lives in the function scope (`def`) or, when listed as block scoped, in a block (`blk`)
    const blockScoped = new Set(old.mainDefaultBlockScoped);
    const pick = (inBlock) => Object.fromEntries(Object.entries(old.mainDefault).filter(([k]) => blockScoped.has(k) === inBlock));
    const def = translateMap(pick(false), votes.get('def'), MIN_SHARE);
    const blk = translateMap(pick(true), votes.get('blk'), MIN_SHARE);
    out.mainDefault = { ...def.map, ...blk.map };
    out.mainDefaultBlockScoped = Object.keys(blk.map);
    report('mainDefault', def);
    report('mainDefault block', blk);
  }
}
fs.writeFileSync(outFile, `${JSON.stringify(out, null, 1)}\n`);
console.log(`written ${outFile}`);
