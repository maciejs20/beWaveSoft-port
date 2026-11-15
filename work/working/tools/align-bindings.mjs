// Carries hand-chosen binding names from one release to the next. Two versions of the same minified
// module are tokenised (tracked bindings become `@<scope tag>` tokens, other identifiers stay as
// text), the token streams are aligned with GNU diff, and every aligned pair of tracked bindings
// votes old name -> new name. Declarations whose initialiser is unique and equal in both versions
// (`var x = require("os")`) decide first, since the vote is weak for rarely used names.
// Used by port-name-main.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
const traverse = _traverse.default ?? _traverse;
const generate = _generate.default ?? _generate;

const PARSE = { sourceType: 'script', allowReturnOutsideFunction: true, plugins: ['jsx'], tokens: true, errorRecovery: true };
const MIN = /^[A-Za-z_$][A-Za-z0-9_$]?$/;

/**
 * Parses code and returns its tokens with, for identifiers bound in a tagged scope, the tag.
 * @param {string} code module source
 * @param {(scope: object, ast: object) => string|null} tagOf scope tag or null (binding not tracked)
 * @returns {{text: string, tag: string|null, name: string}[]} tokens in source order
 */
export function taggedTokens(code, tagOf) {
  const ast = parse(code, PARSE);
  const tagAt = new Map();          // identifier start offset -> scope tag
  const visit = (p) => {
    const binding = p.scope.getBinding(p.node.name);
    if (!binding) return;
    const tag = tagOf(binding.scope, ast);
    if (tag) tagAt.set(p.node.start, tag);
  };
  traverse(ast, { Identifier: visit, JSXIdentifier: visit });
  return ast.tokens.map((tok) => {
    const name = tok.type.label === 'name' || tok.type.label === 'jsxName' ? tok.value : null;
    const tag = name !== null ? tagAt.get(tok.start) ?? null : null;
    let text = tag ? `@${tag}` : name !== null ? (MIN.test(name) ? '#id' : name) : `${tok.type.label}:${tok.value ?? ''}`;
    text = text.replace(/\n/g, '\\n');
    return { text, tag, name };
  });
}

/**
 * Returns, per scope tag, {name: key} for declarations with a unique short initialiser; the key is
 * the initialiser with minified identifiers blanked, so it is equal across releases.
 */
function declarationKeys(code, tagOf) {
  const ast = parse(code, PARSE);
  const keys = new Map();           // tag -> Map(key -> name|null when not unique)
  traverse(ast, {
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (id.type !== 'Identifier' || !init) return;
      const binding = p.scope.getBinding(id.name);
      const tag = binding && tagOf(binding.scope, ast);
      if (!tag) return;
      const key = generate(init, { comments: false }).code
        .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[A-Za-z_$][A-Za-z0-9_$]?\b/g, (m) => (/^["']/.test(m) ? m : '#'));
      if (key.length > 300 || !/[A-Za-z]{3}/.test(key)) return;
      if (!keys.has(tag)) keys.set(tag, new Map());
      const m = keys.get(tag);
      m.set(key, m.has(key) ? null : id.name);
    },
  });
  return keys;
}

/**
 * Pairs declarations with equal unique initialisers.
 * @returns {Map<string, Map<string, string>>} tag -> old name -> new name
 */
export function declarationMatches(oldCode, newCode, tagOf) {
  const a = declarationKeys(oldCode, tagOf), b = declarationKeys(newCode, tagOf);
  const out = new Map();
  for (const [tag, m] of a) {
    const other = b.get(tag);
    if (!other) continue;
    const pairs = new Map();
    for (const [key, name] of m) if (name && other.get(key)) pairs.set(name, other.get(key));
    out.set(tag, pairs);
  }
  return out;
}

/**
 * Aligns two token lists with GNU diff.
 * @returns {[number, number][]} index pairs of equal tokens (old index, new index)
 */
export function alignTokens(a, b) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bewave-align-'));
  try {
    fs.writeFileSync(path.join(dir, 'a'), a.map((x) => x.text).join('\n') + '\n');
    fs.writeFileSync(path.join(dir, 'b'), b.map((x) => x.text).join('\n') + '\n');
    const r = spawnSync('diff', ['--minimal', path.join(dir, 'a'), path.join(dir, 'b')], { encoding: 'utf8', maxBuffer: 1 << 30 });
    if (r.status > 1) throw new Error(`diff failed: ${r.stderr}`);
    const pairs = [];
    let i = 0, j = 0;               // next unaligned token (0-based) in a and b
    const take = (untilA) => { while (i < untilA) pairs.push([i++, j++]); };
    for (const line of r.stdout.split('\n')) {
      const m = line.match(/^(\d+)(?:,(\d+))?([acd])(\d+)(?:,(\d+))?$/);
      if (!m) continue;
      const a1 = +m[1], a2 = +(m[2] ?? m[1]), b1 = +m[4], b2 = +(m[5] ?? m[4]);
      // `NaM,N`: insert after a line N; `NdM`: delete; `NcM`: change
      if (m[3] === 'a') { take(a1); j = b2; } else if (m[3] === 'd') { take(a1 - 1); i = a2; } else { take(a1 - 1); i = a2; j = b2; }
    }
    take(a.length);
    return pairs;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Maps old binding names to new ones for each scope tag by majority of aligned occurrences;
 * `declared` (from declarationMatches) overrides the vote.
 * @returns {Map<string, Map<string, {name: string, votes: number, total: number}>>} tag -> old -> best new
 */
export function voteBindings(oldTokens, newTokens, declared = new Map()) {
  const votes = new Map();          // `${tag}\0${old}` -> Map(new -> count)
  for (const [i, j] of alignTokens(oldTokens, newTokens)) {
    const a = oldTokens[i], b = newTokens[j];
    if (!a.tag || a.tag !== b.tag) continue;
    const key = `${a.tag}\0${a.name}`;
    if (!votes.has(key)) votes.set(key, new Map());
    votes.get(key).set(b.name, (votes.get(key).get(b.name) ?? 0) + 1);
  }
  const out = new Map();
  for (const [key, counts] of votes) {
    const [tag, oldName] = key.split('\0');
    const total = [...counts.values()].reduce((s, n) => s + n, 0);
    const [name, best] = [...counts].sort((x, y) => y[1] - x[1])[0];
    if (!out.has(tag)) out.set(tag, new Map());
    out.get(tag).set(oldName, { name, votes: best, total });
  }
  for (const [tag, pairs] of declared) {
    if (!out.has(tag)) out.set(tag, new Map());
    for (const [oldName, name] of pairs) out.get(tag).set(oldName, { name, votes: 1, total: 1 });
  }
  return out;
}

/**
 * Translates {old binding: chosen name} into {new binding: chosen name} for one tag.
 * Entries without a vote or whose new binding is claimed twice are reported, not guessed.
 * @returns {{map: object, missing: string[], weak: string[]}}
 */
export function translateMap(names, tagVotes, minShare) {
  const map = {}, missing = [], weak = [], claimed = new Map();
  for (const [oldName, chosen] of Object.entries(names)) {
    const v = tagVotes?.get(oldName);
    if (!v) { missing.push(`${oldName}=${chosen}`); continue; }
    if (v.votes / v.total < minShare) weak.push(`${oldName}=${chosen} -> ${v.name} (${v.votes}/${v.total})`);
    if (claimed.has(v.name)) { missing.push(`${oldName}=${chosen} (new ${v.name} already ${claimed.get(v.name)})`); continue; }
    claimed.set(v.name, chosen);
    map[v.name] = chosen;
  }
  return { map, missing, weak };
}
