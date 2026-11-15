// Match every bundle module to its source file in node_modules by shared
// string literals / property names, weighted by rarity.
// Usage: node classify-modules.mjs <bundle.js> <split.json> <node_modules> <out.json>
import fs from 'node:fs';
import path from 'node:path';

const [, , bundleFile, splitFile, nmDir, outFile] = process.argv;
const RE = /"([^"\\\n]{4,120})"|'([^'\\\n]{4,120})'|\.([A-Za-z_$][\w$]{4,})|\b([A-Za-z_$][\w$]{4,})\s*:/g;
function tokens(text) {
  const s = new Set();
  for (const m of text.matchAll(RE)) s.add(m[1] ?? m[2] ?? m[3] ?? m[4]);
  return s;
}
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(android|ios|windows|macos|__tests__|docs|\.git|ReactAndroid|ReactCommon|third-party-podspecs|sdks)$/.test(e.name)) walk(p); }
    else if (/\.(js|jsx|mjs|cjs|ts|tsx|json)$/.test(e.name) && !e.name.endsWith('.d.ts')) {
      const st = fs.statSync(p);
      if (st.size < 8_000_000) files.push(p);
    }
  }
})(nmDir);
console.error('lib files', files.length);

const src = fs.readFileSync(bundleFile, 'utf8');
const { modules } = JSON.parse(fs.readFileSync(splitFile, 'utf8'));
const modTok = modules.map(([id, a, b]) => [id, tokens(src.slice(a, b)), b - a]);
const wanted = new Set();
for (const [, t] of modTok) for (const k of t) wanted.add(k);
const index = new Map();           // token -> file indices
files.forEach((f, i) => {
  for (const k of tokens(fs.readFileSync(f, 'utf8'))) {
    if (!wanted.has(k)) continue;
    let l = index.get(k);
    if (!l) index.set(k, l = []);
    l.push(i);
  }
});
const out = [];
for (const [id, t, size] of modTok) {
  const score = new Map();
  let total = 0, matched = 0;
  for (const k of t) {
    const l = index.get(k);
    const w = 1 / Math.log2(2 + (l?.length ?? 0));   // unknown tokens weigh the most
    total += w;
    if (!l) continue;
    matched++;
    if (l.length > 400) continue;
    for (const i of l) score.set(i, (score.get(i) ?? 0) + w);
  }
  let best = -1, bs = 0;
  for (const [i, v] of score) {
    if (v > bs || (v === bs && best >= 0 && files[i].length < files[best].length)) { best = i; bs = v; }
  }
  out.push({ id, size, tokens: t.size, matched, coverage: total ? +(bs / total).toFixed(3) : 0,
    file: best >= 0 ? path.relative(nmDir, files[best]) : null });
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 0));
