// Restores the __esModule flag webcrack drops from harmony modules (webpack `t.r(exports)`); without
// it the renderer shows a white screen (React #130). Part of regenerate.sh.
// Usage: node restore-esmodule-flag.cjs <bundle.web.js> <bundle.web.split.json> <renderer dir with MANIFEST.json>
'use strict';
const fs = require('fs');
const path = require('path');

const [, , bundleFile, splitFile, root] = process.argv;
if (!root) {
  console.error('Usage: node restore-esmodule-flag.cjs <bundle.web.js> <bundle.web.split.json> <renderer dir>');
  process.exit(2);
}
const src = fs.readFileSync(bundleFile, 'utf8');
const { modules } = JSON.parse(fs.readFileSync(splitFile, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'MANIFEST.json'), 'utf8'));
const FLAG = 'Object.defineProperty(exports, "__esModule", {\n  value: true\n});\n';
let flagged = 0;
const added = [];
for (const [id, a, b] of modules) {
  const text = src.slice(a, b);
  const m = text.match(/^function\([\w$]+,([\w$]+),([\w$]+)\)\{/);
  if (!m || !text.includes(`${m[2]}.r(${m[1]})`)) continue;
  flagged++;
  const file = path.join(root, manifest[id].path);
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('__esModule')) continue;
  const nl = code.indexOf('\n') + 1;   // after the `// module N` header line
  code = code.slice(0, nl) + FLAG + code.slice(nl);
  fs.writeFileSync(file, code);
  added.push(id);
}
console.log({ flagged, added: added.length });
