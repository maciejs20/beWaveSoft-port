// Bundles working/src into <out>/dist. Usage: node build-app.mjs <out>
// The renderer entry is the module that restructure.mjs marks with "// module N (entry)" on its first line;
// it is looked up through renderer/MANIFEST.json, so the webpack entry id is never copied here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { extractTshAssets } from './tsh-assets.mjs';

// Runtime of Electron 44.9.3 (original 1.2.0): `ELECTRON_RUN_AS_NODE=1 electron -p process.versions` gives
// node 24.22.0 and chrome 152.0.7977.167 (checked 2026-11-13). Change together with the original's Electron.
const kNodeTarget = 'node24';
const kChromeTarget = 'chrome152';
const kEntryMarker = /^\/\/ module \d+ \(entry\)( |$)/;

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const dist = path.join(process.argv[2], 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(src, 'renderer/MANIFEST.json'), 'utf8'));
const NODE_BUILTINS = ['assert', 'buffer', 'child_process', 'constants', 'crypto', 'dgram', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'stream', 'timers', 'url', 'util', 'zlib'];

// Returns the absolute path of the single renderer module whose first line carries the entry marker.
function rendererEntry() {
  const entries = Object.values(manifest).map((m) => path.join(src, 'renderer', m.path)).filter((file) => {
    const firstLine = fs.readFileSync(file, 'utf8').split('\n', 1)[0];
    return kEntryMarker.test(firstLine);
  });
  if (entries.length !== 1) {
    throw new Error(`expected one renderer entry marked "(entry)" in MANIFEST.json files, found ${entries.length}`);
  }
  return entries[0];
}

// Our full version: BEWAVE_VERSION or working/VERSION (e.g. "1.2.0-mod3.1"), as bw_port_version in lib-version.sh.
const working = path.resolve(src, '..');
const portVersion = process.env.BEWAVE_VERSION || fs.readFileSync(path.join(working, 'VERSION'), 'utf8').trim();
// Shown in the app (splash, version label) through desktop/shared/modVersion.js; app.getVersion() stays Satel's.
const kModVersionDefine = { __BEWAVE_MOD_VERSION__: JSON.stringify(portVersion) };

// Satel graphics for the TSH screen editor preview: dist/tsh/ from the original's TSH_soft.exe (never committed).
// The original version is the part of portVersion before "-mod" (legacy "-port"), as in lib-version.sh.
function extractOriginalTshAssets() {
  const original = portVersion.split('-mod')[0].split('-port')[0];
  const resources = path.join(working, '../original', original, 'win-build/BE WAVE Soft/resources');
  const versions = fs.existsSync(resources) ? fs.readdirSync(resources).filter((d) => /^v/.test(d) && fs.existsSync(path.join(resources, d, 'TSH_soft.exe'))) : [];
  if (versions.length !== 1) {
    throw new Error(`FAIL tsh assets: expected one ${resources}/v*/TSH_soft.exe, found ${versions.length}`);
  }
  extractTshAssets(path.join(resources, versions[0], 'TSH_soft.exe'), path.join(dist, 'tsh'));
}

await esbuild.build({
  entryPoints: { 'electron.entry': path.join(src, 'main/entry.js'), 'electron.preload': path.join(src, 'preload/preload.js') },
  outdir: dist, bundle: true, platform: 'node', format: 'cjs', packages: 'external',
  target: kNodeTarget, logLevel: 'warning', define: kModVersionDefine,
});
await esbuild.build({
  entryPoints: { 'bundle.web': rendererEntry() },
  outdir: dist, bundle: true, platform: 'node', format: 'iife',
  target: kChromeTarget, logLevel: 'warning', logLimit: 15, define: kModVersionDefine,
  external: [...NODE_BUILTINS, 'realm', 'mqtt', 'electron'],
  loader: { '.js': 'jsx' }, jsx: 'automatic',
  alias: { 'react/jsx-runtime': path.join(src, 'renderer/lib/react/jsx-runtime.js') },
});
fs.cpSync(path.join(src, 'static'), dist, { recursive: true });
extractOriginalTshAssets();
