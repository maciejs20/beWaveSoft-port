// Gives the bindings of a newly generated named tree the names they had in the previous release's
// named tree, file by file (same path, matched by match-modules.mjs). The minifier assigns letters
// anew in every release (1.2.0 swapped `e` and `A` almost everywhere), so without this step every
// unchanged function would differ from the previous release and a 3-way merge of our edits would
// conflict everywhere. Both files are tokenised (bound identifiers become `@` or `@name`), aligned
// with GNU diff (align-bindings.mjs), and each new binding takes the old name most of its aligned
// occurrences had. Renames go through temporary names, so swaps work; a name that would capture or
// shadow another binding is skipped. Rewrites changed files in place (generated tree only).
// Usage: node carry-names.mjs <previous named dir> <named dir> <subdir>...   (e.g. renderer/app main)
// Exit: 0 done, 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import { alignTokens } from './align-bindings.mjs';
const traverse = _traverse.default ?? _traverse;
const generate = _generate.default ?? _generate;

const MIN_SHARE = 0.6;      // share of aligned occurrences an old name needs to be carried over
const PARSE = { sourceType: 'script', allowReturnOutsideFunction: true, plugins: ['jsx'], tokens: true };
const [, , prevDir, dir, ...subdirs] = process.argv;
if (!subdirs.length) {
  console.error('Usage: node carry-names.mjs <previous named dir> <named dir> <subdir>...');
  process.exit(2);
}

// True for an identifier that names a variable (not a property key, member property, label or JSX attribute).
function isNameUse(p) {
  const parent = p.parentPath;
  if ((parent.isMemberExpression() || parent.isOptionalMemberExpression()) && !parent.node.computed && p.key === 'property') return false;
  if ((parent.isObjectProperty() || parent.isObjectMethod() || parent.isClassMethod() || parent.isClassProperty())
    && !parent.node.computed && p.key === 'key' && !parent.node.shorthand) return false;
  if (parent.isLabeledStatement() || parent.isBreakStatement() || parent.isContinueStatement()) return false;
  if (parent.isJSXAttribute() || (parent.isJSXMemberExpression() && p.key === 'property')) return false;
  return true;
}

// Returns {ast, tokens}; tokens carry the binding (object) of bound identifiers.
function analyse(code) {
  const ast = parse(code, PARSE);
  const bindingAt = new Map();
  const visit = (p) => {
    if (!isNameUse(p)) return;
    const b = p.scope.getBinding(p.node.name);
    if (b) bindingAt.set(p.node.start, b);
  };
  traverse(ast, { Identifier: visit, JSXIdentifier: visit });
  const tokens = ast.tokens.map((tok) => {
    const name = tok.type.label === 'name' || tok.type.label === 'jsxName' ? tok.value : null;
    const binding = name !== null ? bindingAt.get(tok.start) ?? null : null;
    const text = binding ? '@' : name ?? `${tok.type.label}:${String(tok.value ?? '').replace(/\n/g, '\\n')}`;
    return { text, binding, name };
  });
  return { ast, tokens };
}

// True when scope `s` is `outer` or nested in it.
function within(s, outer) {
  for (; s; s = s.parent) if (s === outer) return true;
  return false;
}

// True when `binding` can be called `name` without capturing or being captured: no other binding of
// that name in its own scope, none between a use and its scope (would shadow it), and no use of an
// outer binding or global of that name inside its scope (would be captured).
function canRename(binding, name, programScope) {
  if (programScope.hasGlobal(name)) return false;
  const own = binding.scope.getOwnBinding(name);
  if (own && own !== binding) return false;
  const sites = [binding.path, ...binding.referencePaths, ...binding.constantViolations];
  for (const p of sites) for (let s = p.scope; s && s !== binding.scope; s = s.parent) if (s.getOwnBinding(name)) return false;
  const outer = binding.scope.parent?.getBinding(name);
  return !outer || ![...outer.referencePaths, ...outer.constantViolations].some((p) => within(p.scope, binding.scope));
}

// Renames the bindings of `code` after the aligned bindings of `prevCode`; returns [code, count].
function carry(prevCode, code) {
  const prev = analyse(prevCode), cur = analyse(code);
  const votes = new Map();          // new binding -> Map(old name -> count)
  for (const [i, j] of alignTokens(prev.tokens, cur.tokens)) {
    const a = prev.tokens[i], b = cur.tokens[j];
    if (!a.binding || !b.binding) continue;
    if (!votes.has(b.binding)) votes.set(b.binding, new Map());
    const m = votes.get(b.binding);
    m.set(a.binding.identifier.name, (m.get(a.binding.identifier.name) ?? 0) + 1);
  }
  const plan = [];
  for (const [binding, m] of votes) {
    const total = [...m.values()].reduce((s, n) => s + n, 0);
    const [name, n] = [...m].sort((x, y) => y[1] - x[1])[0];
    if (name !== binding.identifier.name && n / total >= MIN_SHARE) plan.push({ binding, name, original: binding.identifier.name });
  }
  if (!plan.length) return [code, 0];
  let programScope;
  traverse(cur.ast, { Program(p) { programScope = p.scope; p.stop(); } });
  plan.forEach((x, i) => { x.binding.scope.rename(x.binding.identifier.name, `__carry${i}__`); });
  // targets free up as other bindings move, so retry until nothing changes
  let count = 0;
  let pending = plan.map((x, i) => ({ ...x, tmp: `__carry${i}__` }));
  for (let progress = true; progress && pending.length;) {
    progress = false;
    pending = pending.filter((x) => {
      const binding = x.binding.scope.getBinding(x.tmp);
      if (!canRename(binding, x.name, programScope)) return true;
      binding.scope.rename(x.tmp, x.name);
      count++;
      progress = true;
      return false;
    });
  }
  // names that could not be carried go back to what they were (or a free variant of it)
  for (const x of pending) {
    const binding = x.binding.scope.getBinding(x.tmp);
    let name = x.original;
    for (let n = 2; !canRename(binding, name, programScope); n++) name = `${x.original}${n}`;
    binding.scope.rename(x.tmp, name);
  }
  return [generate(cur.ast, { jsescOption: { minimal: true }, comments: true }).code, count];
}

// Lists the .js files under a directory, relative to `dir`.
function listJs(root) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
      const rel = path.join(d, e.name);
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.js')) out.push(rel);
    }
  };
  for (const s of subdirs) if (fs.existsSync(path.join(root, s))) walk(s);
  return out;
}

const stats = { files: 0, unchanged: 0, renamedFiles: 0, renamed: 0, failed: [] };
for (const rel of listJs(dir)) {
  const prevFile = path.join(prevDir, rel);
  if (!fs.existsSync(prevFile)) continue;
  stats.files++;
  const file = path.join(dir, rel);
  const code = fs.readFileSync(file, 'utf8');
  const prevCode = fs.readFileSync(prevFile, 'utf8');
  if (code === prevCode) { stats.unchanged++; continue; }
  try {
    const header = code.match(/^\/\/ module [^\n]*\n/)?.[0] ?? '';
    const [out, n] = carry(prevCode, code);
    if (!n) continue;
    // generator drops the leading line comment position: keep the `// module N` header first
    const body = header && out.startsWith(header) ? out.slice(header.length) : out.replace(/^\/\/ module [^\n]*\n/, '');
    fs.writeFileSync(file, `${header}${body.replace(/\n*$/, '\n')}`);
    stats.renamedFiles++;
    stats.renamed += n;
  } catch (e) {
    stats.failed.push(`${rel}: ${String(e.message).slice(0, 120)}`);
  }
}
for (const f of stats.failed) console.log(`WARN ${f}`);
console.log(JSON.stringify({ ...stats, failed: stats.failed.length }));
