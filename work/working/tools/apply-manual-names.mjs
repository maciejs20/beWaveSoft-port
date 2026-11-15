// Applies a version's manual-names.json (hand-chosen names for key modules). Scope-aware; a name
// that no longer exists or would collide stops the run, so drift after regeneration is visible.
// Usage: node apply-manual-names.mjs <namedDir> <manual-names.json>
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
const traverse = _traverse.default ?? _traverse;
const generate = _generate.default ?? _generate;
const [, , dir, configFile] = process.argv;
if (!configFile) {
  console.error('Usage: node apply-manual-names.mjs <namedDir> <manual-names.json>');
  process.exit(2);
}
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

function usedNames(p) {
  const used = new Set();
  const visit = (q) => {
    if (q.parentPath?.isMemberExpression({ computed: false }) && q.key === 'property') return;
    if (q.parentPath?.isObjectProperty({ computed: false }) && q.key === 'key') return;
    used.add(q.node.name);
  };
  p.traverse({ Identifier: visit, JSXIdentifier: visit });
  return used;
}
function applyNames(file, label, p, names) {
  const used = usedNames(p);
  for (const [from, to] of Object.entries(names)) {
    if (!p.scope.hasOwnBinding(from)) throw new Error(`${file} ${label}: no binding ${from}`);
    if (used.has(to)) throw new Error(`${file} ${label}: ${to} already used`);
    p.scope.rename(from, to);
    used.add(to);
  }
}
let count = 0;
for (const [rel, spec] of Object.entries(config)) {
  const file = path.join(dir, rel);
  const ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'script', allowReturnOutsideFunction: true, plugins: ['jsx'] });
  const functions = [];
  traverse(ast, {
    Program(p) { applyNames(rel, 'top', p, spec.top ?? {}); count += Object.keys(spec.top ?? {}).length; },
    Function(p) { functions.push(p); },
  });
  for (const m of spec.match ?? []) {
    // the innermost function whose source holds the text
    const hits = functions.filter((p) => generate(p.node).code.includes(m.text));
    if (!hits.length) throw new Error(`${rel}: no function contains ${m.text}`);
    const inner = hits.find((p) => !hits.some((q) => q !== p && q.findParent((x) => x === p)));
    applyNames(rel, m.text, inner, m.names);
    count += Object.keys(m.names).length;
  }
  for (const [method, names] of Object.entries(spec.methods ?? {})) {
    const fn = functions.find((p) => {
      if (p.key !== 'value' || !p.parentPath.isObjectProperty()) return false;
      return p.parentPath.parentPath.node.properties.some((x) => x.key?.name === 'key' && x.value?.value === method);
    });
    if (!fn) throw new Error(`${rel}: no method ${method}`);
    applyNames(rel, method, fn, names);
    count += Object.keys(names).length;
  }
  fs.writeFileSync(file, `${generate(ast, { jsescOption: { minimal: true } }).code}\n`);
}
console.log({ manualNames: count, files: Object.keys(config).length });
