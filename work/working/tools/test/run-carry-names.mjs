// Self-test of carry-names.mjs: a release whose minifier swapped letters (and shadows an outer
// binding) must get the previous release's names back, and a changed line must stay changed.
// Usage: node test/run-carry-names.mjs   Exit: 0 pass, 1 fail.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const tool = fileURLToPath(new URL('../carry-names.mjs', import.meta.url));
const PREV = `// module 10
var I = function (A, e) {
  var t = A + e;
  return function (A, e) {
    return A * e + t + hubState;
  };
};
exports.HubLimits = I;
`;
const NEW = `// module 12
var I = function (e, A) {
  var n = e + A;
  return function (e, A) {
    return e * A + n + hubState + 1;
  };
};
exports.HubLimits = I;
`;
const WANT = PREV.replace('// module 10', '// module 12').replace('t + hubState;', 't + hubState + 1;');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bewave-carry-'));
try {
  for (const [sub, code] of [['prev', PREV], ['new', NEW]]) {
    fs.mkdirSync(path.join(dir, sub, 'renderer/app'), { recursive: true });
    fs.writeFileSync(path.join(dir, sub, 'renderer/app/HubLimits.js'), code);
  }
  const r = spawnSync('node', [tool, path.join(dir, 'prev'), path.join(dir, 'new'), 'renderer/app'], { encoding: 'utf8' });
  const got = fs.readFileSync(path.join(dir, 'new/renderer/app/HubLimits.js'), 'utf8');
  if (r.status !== 0 || got !== WANT) {
    console.log(`FAIL carry-names (exit ${r.status})\n${r.stdout}${r.stderr}--- got\n${got}--- want\n${WANT}`);
    process.exit(1);
  }
  console.log('OK carry-names: swapped and shadowed bindings renamed, changed line kept');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
