// Run webcrack over a webpack bundle in small batches (fake bundles sharing the
// original runtime, other modules left as holes so ids are preserved). The result has the
// same layout as one full `webcrack <bundle> -o <outDir>` run (bundle.json, entry module as
// index.js, no `webcrack:missing` marker for modules of the bundle), which needs far less memory.
// Known difference to a full run: JSX component temporaries are `_Component` instead of the
// bundle-wide numbered `_Component6` (7 modules of 1.1.0).
// Resumable: modules already written are skipped. Failed modules keep their raw source.
// Usage: node unpack-batches.mjs <bundle.js> <split.json> <outDir> [batchBytes]
// Exit: 0 all modules unpacked, 1 some modules failed (listed on stderr), 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { webcrack } from 'webcrack';

const [, , input, splitFile, outDir, batchBytesArg] = process.argv;
if (!outDir) {
  console.error('Usage: node unpack-batches.mjs <bundle.js> <split.json> <outDir> [batchBytes]');
  process.exit(2);
}
const batchBytes = Number(batchBytesArg ?? 2_000_000);
const src = fs.readFileSync(input, 'utf8');
const { runtime, modules } = JSON.parse(fs.readFileSync(splitFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

// webcrack CLI defaults; deobfuscate: true matters (with false, shadowed `e` in 80 modules is renamed to exports)
const options = { unpack: true, deobfuscate: true, unminify: true, jsx: true, mangle: false };
const failed = [];
let entryId = null;   // taken from the runtime (`t.s = N`) by webcrack, same for every batch

function fakeBundle(batch) {
  const slots = [];
  for (const [id, start, end] of batch) slots[id] = src.slice(start, end);
  const last = batch.at(-1)[0];
  let body = '';
  for (let i = 0; i <= last; i++) body += (slots[i] ?? '') + (i < last ? ',' : '');
  return `${runtime}[${body}]);`;
}

async function run(batch) {
  const result = await webcrack(fakeBundle(batch), options);
  if (!result.bundle) throw new Error('bundle not detected');
  entryId ??= result.bundle.entryId;
  const wanted = new Set(batch.map(([id]) => String(id)));
  for (const mod of result.bundle.modules.values()) {
    if (!wanted.has(mod.id)) continue;
    fs.writeFileSync(path.join(outDir, `${mod.id}.js`), mod.code);
    wanted.delete(mod.id);
  }
  if (wanted.size) throw new Error(`missing modules: ${[...wanted].join(',')}`);
}

const batches = [];
let cur = [], size = 0;
for (const m of modules) {
  const len = m[2] - m[1];
  if (cur.length && size + len > batchBytes) { batches.push(cur); cur = []; size = 0; }
  cur.push(m); size += len;
}
if (cur.length) batches.push(cur);

for (const [i, batch] of batches.entries()) {
  const todo = batch.filter(([id]) => !fs.existsSync(path.join(outDir, `${id}.js`)));
  if (!todo.length) continue;
  try {
    await run(todo);
  } catch (err) {
    // retry one by one, fall back to the raw module source
    for (const m of todo) {
      try { await run([m]); }
      catch (e) {
        failed.push({ id: m[0], error: String(e.message ?? e).slice(0, 200) });
        fs.writeFileSync(path.join(outDir, `${m[0]}.js`), `/* webcrack failed */\n(${src.slice(m[1], m[2])});\n`);
      }
    }
  }
  console.error(`batch ${i + 1}/${batches.length} done`);
}

// Finishes the tree like a full run: modules of the bundle lose the missing marker (only
// externals such as node built-ins keep it), the entry is index.js, bundle.json lists all.
function finish() {
  // all modules came from an earlier run: read the entry from the runtime (`t(t.s = N)`)
  entryId ??= [...runtime.matchAll(/\.s\s*=\s*(\d+)/g)].at(-1)?.[1] ?? null;
  if (entryId === null) throw new Error('entry id unknown');
  const ids = new Set(modules.map(([id]) => String(id)));
  for (const id of ids) {
    const file = path.join(outDir, `${id}.js`);
    const code = fs.readFileSync(file, 'utf8').replace(/(require\(|from )\/\*webcrack:missing\*\/"\.\/(\d+)\.js"/g,
      (all, head, dep) => (ids.has(dep) ? `${head}"./${dep}.js"` : all));
    fs.writeFileSync(id === entryId ? path.join(outDir, 'index.js') : file, code);
    if (id === entryId) fs.rmSync(file);
  }
  const modulesJson = [...ids].map((id) => ({ id, path: id === entryId ? './index.js' : `./${id}.js` }));
  fs.writeFileSync(path.join(outDir, 'bundle.json'),
    JSON.stringify({ type: 'webpack', entryId, modules: modulesJson }, null, 2));
}
finish();
for (const f of failed) console.error(`FAIL module ${f.id}: ${f.error}`);
console.error(`modules: ${modules.length}, failed: ${failed.length}`);
process.exitCode = failed.length ? 1 : 0;
