// Turn webcrack output into a named source tree: src/app (our code, heuristically
// renamed) and src/lib/<pkg> (third party, matched to node_modules; code untouched
// apart from require paths). Module ids differ per release, so hand-identified modules come
// from the version's module-overrides.json (module id -> path without .js).
// Usage: node restructure.mjs <crackedDir> <classify.json> <outDir> <module-overrides.json>
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';
const traverse = _traverse.default ?? _traverse;
const generate = _generate.default ?? _generate;

const [, , inDir, classifyFile, outDir, overridesFile] = process.argv;
if (!overridesFile) {
  console.error('Usage: node restructure.mjs <crackedDir> <classify.json> <outDir> <module-overrides.json>');
  process.exit(2);
}
const classify = JSON.parse(fs.readFileSync(classifyFile, 'utf8'));
const REQ = /require\((?:\/\*[^*]*\*\/)?"\.\/([^"]+)\.js"\)/g;
const fileOf = (id, entry) => path.join(inDir, id === entry ? 'index.js' : `${id}.js`);
const entry = JSON.parse(fs.readFileSync(path.join(inDir, 'bundle.json'), 'utf8')).entryId * 1;

// ---- classification: libraries never import app code, so importers of app code are app
const mods = new Map();
for (const c of classify) {
  const src = fs.readFileSync(fileOf(c.id, entry), 'utf8');
  mods.set(c.id, { ...c, src, deps: [...src.matchAll(REQ)].map((m) => m[1]).filter((d) => /^\d+$/.test(d)).map(Number), importers: [] });
}
for (const m of mods.values()) for (const d of m.deps) mods.get(d)?.importers.push(m.id);
const SEED = /satel|bewave|BE WAVE|\btsh|TSH|electronAPI|\bRealm|mqtt|smartHub|\bHub\b|\bHUB\b/;
const isLibMatch = (m) => m.tokens >= 8 && m.matched / m.tokens >= 0.7 && m.coverage >= 0.25;
const app = new Set();
const mark = (id) => { const s = [id]; while (s.length) { const x = s.pop(); if (app.has(x)) continue; app.add(x); s.push(...mods.get(x).importers); } };
for (const m of mods.values()) if (SEED.test(m.src) && !(isLibMatch(m) && m.coverage >= 0.5)) mark(m.id);
mark(entry);
// low-match modules imported only by app code are app as well
for (let changed = true; changed;) {
  changed = false;
  for (const m of mods.values()) {
    if (app.has(m.id) || isLibMatch(m) || !m.importers.length) continue;
    if (m.importers.every((i) => app.has(i))) { app.add(m.id); changed = true; }
  }
}

// hand-identified modules (see the module's content)
const OVERRIDES = JSON.parse(fs.readFileSync(overridesFile, 'utf8'));
// ---- well-known tiny modules that text matching cannot place
const HELPERS = [
  ['regenerator', /^[\s\S]{0,120}regeneratorRuntime = |\bdelegateYield: function/],
  ['classCallCheck', /Cannot call a class as a function/],
  ['toConsumableArray', /non-iterable instance[\s\S]*spread|Invalid attempt to spread/],
  ['slicedToArray', /Invalid attempt to destructure/],
  ['interopRequireDefault', /__esModule\) \{\s*return \w+;\s*\} else \{\s*return \{\s*default: \w+/],
  ['typeof', /Symbol\.iterator == "symbol"/],
  ['defineProperty', /\(\w+ = \w+\(\w+\)\) in \w+/],
  ['createClass', /\w+\.enumerable = \w+\.enumerable \|\| false/],
  ['getPrototypeOf', /Object\.getPrototypeOf\.bind\(\)/],
  ['possibleConstructorReturn', /Derived constructors may only return|\(\w+\(\w+\) == "object" \|\|/],
  ['inherits', /Super expression must either be null/],
  ['objectWithoutPropertiesLoose', /hasOwnProperty\.call\(\w+, \w+\)\) \{\s*if \(\w+\.includes/],
  ['extends', /Object\.assign \? Object\.assign\.bind\(\)/],
  ['asyncToGenerator', /new Promise[\s\S]*\.apply\(\w+, \w+\)[\s\S]*"next"/],
];
const helperOf = (m) => (m.size < 3000 ? HELPERS.find(([, re]) => re.test(m.src))?.[0] : undefined);
const externalOf = (m) => m.src.match(/^module\.exports = require\(\/\*webcrack:missing\*\/"\.\/(.+)\.js"\);?\s*$/)?.[1];
const FORCED = new Map();
for (const m of mods.values()) {
  const ext = externalOf(m);
  if (ext) FORCED.set(m.id, `lib/_external/${ext}`);
  else if (helperOf(m)) FORCED.set(m.id, `lib/@babel/runtime/helpers/${helperOf(m)}`);
}
// module.exports = require("./N") takes the identity of N
for (const m of mods.values()) {
  const re = m.src.match(/^module\.exports = require\("\.\/(\d+)\.js"\);?\s*$/);
  if (re && !FORCED.has(m.id)) m.reexportOf = +re[1];
}
// an override also fixes the kind: app/... is app code (renamed), lib/... is library code
for (const [id, name] of Object.entries(OVERRIDES)) {
  FORCED.set(+id, name);
  if (name.startsWith('app/')) app.add(+id);
  else if (name.startsWith('lib/')) app.delete(+id);
}
// unmatched modules used mainly by app code are app code (Color, Spacing, ...)
for (const m of mods.values()) {
  if (app.has(m.id) || FORCED.has(m.id) || isLibMatch(m) || !m.importers.length) continue;
  if (/\b(StyleSheet|Spacing|Color)\b/.test(m.src) || m.importers.filter((i) => app.has(i)).length * 2 > m.importers.length) app.add(m.id);
}

// ---- module names
const pascal = (s) => s.replace(/(^|[^A-Za-z0-9]+)([a-zA-Z0-9])/g, (_, __, c) => c.toUpperCase());
const LANG = {};
for (const m of mods.values()) {
  for (const x of m.src.matchAll(/\b([a-z]{2}(?:_[A-Z]{2})?|[A-Z]{2}):\s*(?:\w+\.default\s*\(\s*)?require\("\.\/(\d+)\.js"\)/g)) LANG[+x[2]] = x[1];
}
for (const m of mods.values()) {
  const vars = Object.fromEntries([...m.src.matchAll(/var (\w+) = \w+\(require\("\.\/(\d+)\.js"\)\)/g)].map((x) => [x[1], +x[2]]));
  for (const x of m.src.matchAll(/\b([a-zA-Z_]{2,5}): \{\s*general: (\w+)\.default/g)) if (vars[x[2]] !== undefined) LANG[vars[x[2]]] = x[1];
}
function appPath(m) {
  const s = m.src;
  if (LANG[m.id] || /^module\.exports = \{\n  [A-Z_0-9]+: "/.test(s)) return `i18n/${LANG[m.id] ?? 'lang_' + m.id}`;
  if (/^(module\.)?exports(\.default)? = "data:|^exports\.default = \w+\.p \+ "/.test(s) || /^exports\.default = t?\.?p? ?\+? ?"src\/assets/.test(s)) return `assets/${m.id}`;
  const named = [...s.matchAll(/^exports\.([A-Za-z_$][\w$]*) = /gm)].map((x) => x[1]).filter((n) => n !== 'default' && n !== '__esModule');
  const display = s.match(/displayName = "([\w$]+)"/)?.[1];
  const cls = s.match(/^(?:var|function|class) ([A-Z][a-zA-Z0-9]{3,})\b/m)?.[1];
  const name = named.find((n) => /^[A-Z]/.test(n)) ?? named[0] ?? display ?? cls ?? `module_${m.id}`;
  const jsx = /<[A-Z][\w.]*[\s/>]|<>/.test(s);
  const dir = /^module_/.test(name) ? (jsx ? 'components/unnamed' : 'misc')
    : jsx ? (/Screen|Page|View$/.test(name) ? 'screens' : 'components')
    : /^use[A-Z]/.test(name) ? 'hooks'
    : /(Type|Types|Enum|Mode|Status|State|Kind)$/.test(name) ? 'enums'
    : /(Service|Manager|Client|Controller|Repository|Provider|Store)$/.test(name) ? 'services' : 'logic';
  return `${dir}/${name}`;
}
const used = new Set();
const manifest = {};
// overridden modules first, so that a path carried over from the previous release keeps its exact
// spelling and a new module that happens to compute the same path gets the `.<id>` suffix instead
const overridden = (m) => Object.hasOwn(OVERRIDES, m.id);
for (const m of [...mods.values()].sort((a, b) => overridden(b) - overridden(a))) {
  let rel;
  if (overridden(m)) rel = OVERRIDES[m.id];
  else if (m.reexportOf !== undefined && FORCED.has(m.reexportOf)) rel = `${FORCED.get(m.reexportOf)}.reexport`;
  else if (FORCED.has(m.id)) rel = FORCED.get(m.id);
  else if (app.has(m.id)) rel = `app/${appPath(m)}`;
  else if (m.file && isLibMatch(m)) rel = `lib/${m.file.replace(/\.(tsx?|jsx?|mjs|cjs|json)$/, '')}`;
  else if (m.file && m.tokens >= 3 && m.matched / m.tokens >= 0.5) rel = `lib/_guessed/${m.file.replace(/\.(tsx?|jsx?|mjs|cjs|json)$/, '')}`;
  else rel = `lib/_unknown/${m.id}`;
  let u = rel;
  if (used.has(u)) u = `${rel}.${m.id}`;
  used.add(u);
  m.path = `${u}.js`;
  m.isApp = app.has(m.id);
  manifest[m.id] = { path: m.path, kind: m.isApp ? 'app' : 'lib', coverage: m.coverage, sourceGuess: m.file };
}

// ---- renaming (app modules only)
const baseName = (id) => {
  const m = mods.get(id);
  if (m.reexportOf !== undefined && mods.has(m.reexportOf)) return baseName(m.reexportOf);
  if (/^lib\/_(unknown|guessed)\//.test(m.path)) return `module${id}`;
  let b = path.basename(m.path, '.js').replace(/\.\d+$/, '').replace(/\.reexport$/, '');
  if (b === 'index') b = path.basename(path.dirname(m.path));
  if (/^\d+$/.test(b) || b === '_unknown') return null;
  return b;
};
const lcFirst = (s) => s[0].toLowerCase() + s.slice(1);
const ident = (s) => s.replace(/[^\w$]+(\w?)/g, (_, c) => c.toUpperCase()).replace(/^(\d)/, '_$1');
const MIN = /^[A-Za-z_$][A-Za-z0-9_$]?$/;
const stats = { renamed: 0, remainingShort: 0 };

function reqTarget(node) {
  // require("./N.js") or wrapper(require("./N.js"))
  if (t.isCallExpression(node) && t.isIdentifier(node.callee, { name: 'require' }) && t.isStringLiteral(node.arguments[0])) {
    const x = node.arguments[0].value.match(/^\.\/(.+)\.js$/);
    return x && (/^\d+$/.test(x[1]) ? Number(x[1]) : x[1]);
  }
  if (t.isCallExpression(node) && node.arguments.length === 1 && t.isIdentifier(node.callee)) return reqTarget(node.arguments[0]);
  return null;
}
function calleeName(call) {
  let c = call.callee;
  if (t.isSequenceExpression(c)) c = c.expressions.at(-1);
  if (t.isMemberExpression(c) && !c.computed) return c.property.name;
  if (t.isIdentifier(c) && !MIN.test(c.name)) return c.name;
  return null;
}
function renameModule(m) {
  const ast = parse(m.src, { sourceType: 'script', allowReturnOutsideFunction: true, plugins: ['jsx'], errorRecovery: true });
  const taken = new Set();
  traverse(ast, {
    Identifier(p) {
      if (p.parentPath.isMemberExpression({ computed: false }) && p.key === 'property') return;
      if (p.parentPath.isObjectProperty({ computed: false }) && p.key === 'key') return;
      taken.add(p.node.name);
    },
    JSXIdentifier(p) { taken.add(p.node.name); },
  });
  const rename = (scope, from, wanted) => {
    if (!wanted || !MIN.test(from) || !scope.hasOwnBinding(from)) return false;
    let name = ident(wanted);
    if (!t.isValidIdentifier(name) || name.length < 2) return false;
    let n = name, i = 2;
    while (taken.has(n)) n = `${name}${i++}`;
    taken.add(n);
    scope.rename(from, n);
    stats.renamed++;
    return true;
  };
  traverse(ast, {
    VariableDeclarator: {
      exit(p) {
        const { id, init } = p.node;
        if (!t.isIdentifier(id) || !MIN.test(id.name) || !init) return;
        const tgt = reqTarget(init);
        if (tgt !== null && tgt !== undefined) {
          const b = typeof tgt === 'number' ? (mods.has(tgt) ? baseName(tgt) : null) : path.basename(String(tgt));
          if (b) rename(p.scope, id.name, /^[A-Z]/.test(b) ? b : lcFirst(pascal(b)));
          return;
        }
        if (t.isMemberExpression(init) && !init.computed && init.property.name.length >= 3) {
          return void rename(p.scope, id.name, init.property.name);
        }
        if (t.isCallExpression(init)) {
          const c = calleeName(init);
          if (c === 'create' && t.isObjectExpression(init.arguments[0])) return void rename(p.scope, id.name, 'styles');
          if (c === 'useState') return void rename(p.scope, id.name, 'stateTuple');
          if (c && /^use[A-Z]/.test(c)) return void rename(p.scope, id.name, lcFirst(c.slice(3)));
          if (c && /^get[A-Z]/.test(c)) return void rename(p.scope, id.name, lcFirst(c.slice(3)));
        }
        if (t.isNewExpression(init)) {
          const c = t.isMemberExpression(init.callee) ? init.callee.property.name : t.isIdentifier(init.callee) && !MIN.test(init.callee.name) ? init.callee.name : null;
          if (c) rename(p.scope, id.name, lcFirst(c));
        }
      },
    },
    Function: {
      exit(p) {
        const params = p.node.params;
        // inlined babel helpers
        if (p.isFunctionDeclaration() && p.node.id && MIN.test(p.node.id.name)) {
          const body = generate(p.node.body).code;
          if (/Invalid attempt to iterate non-iterable/.test(body) && /\.done/.test(body)) rename(p.parentPath.scope, p.node.id.name, 'createForOfIterator');
          else if (body.length < 200 && /Array\(\w+\)/.test(body)) rename(p.parentPath.scope, p.node.id.name, 'arrayLikeToArray');
          else if (body.length < 700 && /getOwnPropertySymbols/.test(body) && /\.enumerable/.test(body)) rename(p.parentPath.scope, p.node.id.name, 'ownKeys');
          else if (body.length < 900 && /getOwnPropertyDescriptors/.test(body)) rename(p.parentPath.scope, p.node.id.name, 'objectSpread');
        }
        const hasJsx = (() => { let f = false; p.traverse({ JSXElement(q) { f = true; q.stop(); } }); return f; })();
        if (hasJsx && t.isIdentifier(params[0]) && p.parentPath.isCallExpression() === false) rename(p.scope, params[0].name, 'props');
        const parent = p.parentPath;
        if (parent.isCallExpression() && t.isMemberExpression(parent.node.callee) && !parent.node.callee.computed && p.key !== 'callee') {
          const meth = parent.node.callee.property.name;
          if (/^(map|forEach|filter|find|findIndex|some|every|flatMap)$/.test(meth)) {
            if (t.isIdentifier(params[0])) rename(p.scope, params[0].name, 'item');
            if (t.isIdentifier(params[1])) rename(p.scope, params[1].name, 'index');
          }
        }
      },
    },
    CatchClause(p) { if (t.isIdentifier(p.node.param)) rename(p.scope, p.node.param.name, 'err'); },
    AssignmentExpression(p) {
      // exports.Foo = x  ->  x gets the exported name
      const { left, right } = p.node;
      if (t.isMemberExpression(left) && t.isIdentifier(left.object, { name: 'exports' }) && !left.computed && t.isIdentifier(right) && left.property.name !== 'default') {
        rename(p.scope.getBinding(right.name)?.scope ?? p.scope, right.name, left.property.name);
      }
    },
  });
  // `var v = tuple[0]; var s = tuple[1]` from useState
  traverse(ast, {
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (t.isIdentifier(id) && MIN.test(id.name) && t.isMemberExpression(init, { computed: true }) && t.isIdentifier(init.object) && /^stateTuple/.test(init.object.name) && t.isNumericLiteral(init.property)) {
        const suffix = init.object.name.replace('stateTuple', '');
        rename(p.scope, id.name, init.property.value === 0 ? `state${suffix}` : `setState${suffix}`);
      }
    },
  });
  // report what is still minified
  traverse(ast, {
    Scope(p) { for (const k of Object.keys(p.scope.bindings)) if (MIN.test(k)) stats.remainingShort++; },
  });
  return generate(ast, { jsescOption: { minimal: true }, retainLines: false, comments: true }).code;
}

// ---- write the tree
fs.rmSync(outDir, { recursive: true, force: true });
const failures = [];
for (const m of mods.values()) {
  let code = m.src;
  if (m.isApp && m.size < 400_000) {
    try { code = renameModule(m); } catch (e) { failures.push(`${m.id}: ${e.message}`); }
  }
  const from = path.dirname(m.path);
  code = code.replace(REQ, (all, dep) => {
    if (!/^\d+$/.test(dep) || !mods.has(+dep)) return `require("${dep}")`;
    let r = path.relative(from, mods.get(+dep).path);
    if (!r.startsWith('.')) r = `./${r}`;
    return `require("${r}")`;
  });
  code = code.replace(/(\bfrom |\bimport )"\.\/(\d+)\.js"/g, (all, kw, dep) => {
    if (!mods.has(+dep)) return all;
    let r = path.relative(from, mods.get(+dep).path);
    if (!r.startsWith('.')) r = `./${r}`;
    return `${kw}"${r}"`;
  });
  // webcrack emits ESM namespace imports in modules that also use `exports`
  code = code.replace(/^import \* as ([\w$]+) from ("[^"]+");$/gm, 'var $1 = require($2);');
  const out = path.join(outDir, m.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `// module ${m.id}${m.id === entry ? ' (entry)' : ''}${m.isApp ? '' : ' | source guess: ' + (m.file ?? 'none') + ' cov=' + m.coverage}\n${code}\n`);
}
fs.writeFileSync(path.join(outDir, 'MANIFEST.json'), JSON.stringify(manifest, null, 1));
const n = [...mods.values()];
console.log({ app: n.filter((m) => m.isApp).length, appBytes: n.filter((m) => m.isApp).reduce((a, m) => a + m.size, 0), lib: n.filter((m) => !m.isApp).length, ...stats, failures: failures.length });
console.log(failures.slice(0, 5).join('\n'));
