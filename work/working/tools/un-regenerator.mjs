// Rewrites babel regenerator state machines back to async/await. A function is only
// replaced when its whole control flow could be structured; otherwise it is left as is.
// Usage: node un-regenerator.mjs <dir>...   (rewrites *.js in place)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';
const traverse = _traverse.default ?? _traverse;
const generate = _generate.default ?? _generate;

class Bail extends Error {}
const bail = (why) => { throw new Bail(why); };

const isCtxMember = (n, ctx, prop) => t.isMemberExpression(n, { computed: false }) && t.isIdentifier(n.object, { name: ctx }) && (!prop || n.property.name === prop);
const isCtxCall = (n, ctx, prop) => t.isCallExpression(n) && isCtxMember(n.callee, ctx, prop);
const unwrapSeq = (n) => (t.isSequenceExpression(n) && n.expressions.length === 2 && t.isNumericLiteral(n.expressions[0]) ? n.expressions[1] : n);
const num = (n) => (t.isNumericLiteral(n) ? n.value : bail('non-numeric location'));

// walk a statement without entering nested functions
function walk(node, visit, parent, key, index) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent, key, index);
  if (t.isFunction(node)) return;
  for (const k of t.VISITOR_KEYS[node.type] ?? []) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c, i) => c && walk(c, visit, node, k, i));
    else if (v) walk(v, visit, node, k);
  }
}
function replaceIn(root, match, make) {
  // returns count; replaces matching expressions, never entering functions
  let count = 0;
  const holder = { type: 'Holder', root };
  (function go(node, parent, key, index) {
    if (!node || typeof node.type !== 'string') return;
    if (node !== holder && match(node)) {
      const r = make(node);
      if (index === undefined) parent[key] = r; else parent[key][index] = r;
      count++;
      return;
    }
    if (t.isFunction(node)) return;
    const keys = node === holder ? ['root'] : t.VISITOR_KEYS[node.type] ?? [];
    for (const k of keys) {
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c, i) => go(c, node, k, i));
      else if (v) go(v, node, k);
    }
  })(holder);
  return { node: holder.root, count };
}

function flatten(cases, ctx, tryStarts) {
  const items = [];
  const labelPos = new Map();
  for (const c of cases) {
    if (c.test === null) bail('default case');
    if (t.isStringLiteral(c.test, { value: 'end' })) { items.push({ kind: 'label', label: 'end' }); labelPos.set('end', items.length - 1); }
    else { const l = num(c.test); items.push({ kind: 'label', label: l }); labelPos.set(l, items.length - 1); }
    for (const s of c.consequent) items.push({ kind: 'stmt', node: s });
  }
  // peephole: await, jumps, markers
  const out = [];
  const posMap = new Map();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === 'label') { posMap.set(it.label, out.length); out.push(it); continue; }
    const s = it.node;
    if (t.isExpressionStatement(s) && t.isAssignmentExpression(s.expression, { operator: '=' }) && isCtxMember(s.expression.left, ctx, 'prev')) {
      const loc = num(s.expression.right);
      if (tryStarts.has(loc) && !posMap.has(`try${loc}`)) { posMap.set(`try${loc}`, out.length); out.push({ kind: 'tryStart', loc }); }
      continue;
    }
    if (t.isExpressionStatement(s) && t.isAssignmentExpression(s.expression, { operator: '=' }) && isCtxMember(s.expression.left, ctx, 'next')) {
      const nx = items[i + 1];
      const val = s.expression.right;
      if (nx?.kind === 'stmt' && t.isReturnStatement(nx.node) && nx.node.argument && t.isNumericLiteral(val) && !isCtxCall(nx.node.argument, ctx)) {
        const lab = items[i + 2];
        if (!(lab?.kind === 'label' && lab.label === val.value)) bail('await target is not next label');
        out.push({ kind: 'await', arg: nx.node.argument });
        i++;
        continue;
      }
      if (nx?.kind === 'stmt' && t.isBreakStatement(nx.node) && !nx.node.label) {
        if (t.isNumericLiteral(val)) out.push({ kind: 'jump', target: val.value });
        else if (t.isConditionalExpression(val) && t.isNumericLiteral(val.consequent) && t.isNumericLiteral(val.alternate)) {
          out.push({ kind: 'cjump', test: val.test, target: val.consequent.value, otherwise: val.alternate.value });
        } else bail('computed jump');
        i++;
        continue;
      }
      bail('stray next assignment');
    }
    if (t.isReturnStatement(s) && isCtxCall(s.argument, ctx, 'delegateYield')) {
      const [call, res] = s.argument.arguments;
      out.push({ kind: 'stmt', node: t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.identifier(ctx), t.identifier(res.value)), t.awaitExpression(call))) });
      continue;
    }
    if (t.isBreakStatement(s) && !s.label) bail('stray break');
    if (t.isIfStatement(s) && !s.alternate) {
      const cons = t.isBlockStatement(s.consequent) ? s.consequent.body : [s.consequent];
      const last2 = cons.slice(-2);
      if (last2.length === 2 && t.isExpressionStatement(last2[0]) && t.isAssignmentExpression(last2[0].expression) && isCtxMember(last2[0].expression.left, ctx, 'next') && t.isBreakStatement(last2[1])) {
        out.push({ kind: 'ifJump', test: s.test, body: cons.slice(0, -2), target: num(last2[0].expression.right) });
        continue;
      }
    }
    out.push({ kind: 'stmt', node: s });
  }
  return { items: out, posMap };
}

function structure(fnBody, ctx, tryLocs) {
  const tryEntries = tryLocs.map((e) => ({ t: e[0], c: e[1] ?? null, f: e[2] ?? null, a: e[3] ?? null }));
  const tryStarts = new Set(tryEntries.map((e) => e.t));
  const { items, posMap } = flatten(fnBody, ctx, tryStarts);
  const posOf = (l) => (posMap.has(l) ? posMap.get(l) : bail(`unknown label ${l}`));
  const temps = new Set();
  let awaitedId = 0;

  // rewrite one plain statement (returns array)
  const rewriteTail = (node) => {
    let n = node;
    const fix = (x) => {
      if (t.isReturnStatement(x) && isCtxCall(x.argument, ctx, 'abrupt')) {
        const kind = x.argument.arguments[0];
        if (t.isStringLiteral(kind, { value: 'return' })) return t.returnStatement(x.argument.arguments[1] ?? null);
        bail(`abrupt ${kind?.value}`);
      }
      return x;
    };
    n = replaceIn(n, (x) => t.isReturnStatement(x) && isCtxCall(x.argument, ctx), (x) => {
      if (isCtxCall(x.argument, ctx, 'stop')) return t.emptyStatement();
      return fix(x);
    }).node;
    n = replaceIn(n, (x) => isCtxMember(x, ctx) && /^t\d*$/.test(x.property.name), (x) => { temps.add(`_${x.property.name}`); return t.identifier(`_${x.property.name}`); }).node;
    return n;
  };
  const usesCtx = (node) => {
    let f = false;
    walk(node, (x, parent, key) => {
      if (!t.isIdentifier(x, { name: ctx })) return;
      if (t.isMemberExpression(parent, { computed: false }) && key === 'property') return;
      if (t.isObjectProperty(parent, { computed: false }) && key === 'key') return;
      f = true;
    });
    return f;
  };
  const clean = (node) => {
    const r = rewriteTail(node);
    if (usesCtx(r)) bail(`unhandled context use: ${generate(r).code.slice(0, 80)}`);
    return t.isEmptyStatement(r) ? [] : [r];
  };
  const isSent = (x) => isCtxMember(x, ctx, 'sent');
  const countSent = (node) => { let n = 0; walk(node, (x) => { if (isSent(x)) n++; }); return n; };

  // does any jump inside [from,to) target `label`?
  function jumpsTo(item, label) {
    if (item.kind === 'jump' || item.kind === 'ifJump') return item.target === label;
    if (item.kind === 'cjump') return item.target === label || item.otherwise === label;
    if (item.kind === 'stmt') {
      let f = false;
      walk(item.node, (x) => {
        if (isCtxCall(x, ctx, 'abrupt') && t.isStringLiteral(x.arguments[0]) && /break|continue/.test(x.arguments[0].value) && t.isNumericLiteral(x.arguments[1], { value: label })) f = true;
      });
      return f;
    }
    return false;
  }
  const loopsDone = new Set();

  function emit(i, j, c) {
    // c: { brk, cont, exits:Set of positions equivalent to end of region }
    const out = [];
    const isEnd = (p) => p === j || c.exits.has(p);
    const jumpTo = (p) => {
      if (c.cont !== undefined && p === c.cont) return [t.continueStatement()];
      if (c.brk !== undefined && p === c.brk) return [t.breakStatement()];
      return null;
    };
    for (let k = i; k < j; k++) {
      const it = items[k];
      if (it.kind === 'label') {
        if (it.label !== 'end' && !loopsDone.has(k)) {
          let last = -1;
          for (let x = k + 1; x < items.length; x++) if (jumpsTo(items[x], it.label)) last = x;
          if (last >= j) bail('back jump escapes region');
          if (last > k) {
            loopsDone.add(k);
            const exitPos = last + 1;
            // the loop's exit is the first label after the last back jump
            const body = emit(k, exitPos, { brk: exitPos, cont: k, exits: new Set() });
            const tail = body.at(-1);
            if (!t.isContinueStatement(tail) && !t.isBreakStatement(tail) && !t.isReturnStatement(tail) && !t.isThrowStatement(tail)) body.push(t.breakStatement());
            else if (t.isContinueStatement(tail)) body.pop();
            out.push(t.whileStatement(t.booleanLiteral(true), t.blockStatement(body)));
            k = exitPos - 1;
          }
        }
        continue;
      }
      if (it.kind === 'tryStart') {
        const e = tryEntries.find((x) => x.t === it.loc);
        const cPos = e.c !== null ? posOf(e.c) : null;
        const fPos = e.f !== null ? posOf(e.f) : null;
        const bodyEnd = cPos ?? fPos ?? bail('try without handler');
        if (bodyEnd >= j) bail('try handler outside region');
        // the join point is where the protected region's tail jump goes
        let after = null;
        const lastBody = items.slice(k + 1, bodyEnd).reverse().find((x) => x.kind !== 'label');
        if (lastBody?.kind === 'jump') after = posOf(lastBody.target);
        const finishEnd = fPos !== null ? (() => {
          for (let x = fPos; x < j; x++) if (items[x].kind === 'stmt' && t.isReturnStatement(items[x].node) && isCtxCall(items[x].node.argument, ctx, 'finish')) return x + 1;
          return bail('finally without finish');
        })() : null;
        const handlerEnd = fPos ?? (after !== null && after > cPos && after <= j ? after : j);
        const inner = { ...c, exits: new Set([...c.exits, ...(after !== null ? [after] : []), ...(fPos !== null ? [fPos] : [])]) };
        const block = t.blockStatement(emit(k + 1, bodyEnd, { ...inner }));
        let handler = null;
        if (cPos !== null) {
          const hc = { ...inner };
          const hItems = emitCatch(cPos, handlerEnd, hc, it.loc);
          handler = hItems;
        }
        let fin = null;
        if (fPos !== null) fin = t.blockStatement(emit(fPos, finishEnd - 1, { ...c }));
        out.push(t.tryStatement(block, handler, fin));
        k = (finishEnd ?? handlerEnd) - 1;
        continue;
      }
      if (it.kind === 'await') {
        let n = k + 1;
        while (items[n]?.kind === 'label') n++;
        const nextIt = items[n];
        const awaitExpr = t.awaitExpression(clean(t.expressionStatement(it.arg))[0].expression);
        // .sent stays valid up to and including the argument of the next await
        const sentRange = [];
        for (let x = n; x < items.length; x++) {
          sentRange.push(items[x]);
          if (items[x].kind === 'await') break;
        }
        const sentIn = (x) => (x.kind === 'stmt' ? countSent(x.node) : x.kind === 'await' ? countSent(x.arg) : x.test ? countSent(x.test) : 0);
        const totalSent = sentRange.reduce((sum, x) => sum + sentIn(x), 0);
        if (totalSent === 0) { out.push(t.expressionStatement(awaitExpr)); continue; }
        const direct = nextIt?.kind === 'stmt' && countSent(nextIt.node) === 1 && totalSent === 1 && (
          (t.isExpressionStatement(nextIt.node) && t.isAssignmentExpression(nextIt.node.expression) && isSent(nextIt.node.expression.right) && t.isIdentifier(nextIt.node.expression.left))
          || (t.isReturnStatement(nextIt.node) && isCtxCall(nextIt.node.argument, ctx, 'abrupt') && isSent(nextIt.node.argument.arguments[1])));
        if (direct) {
          nextIt.node = replaceIn(nextIt.node, isSent, () => awaitExpr).node;
          continue;
        }
        const id = `awaited${awaitedId++ || ''}`;
        temps.add(id);
        out.push(t.expressionStatement(t.assignmentExpression('=', t.identifier(id), awaitExpr)));
        for (const x of sentRange) {
          if (x.kind === 'stmt') x.node = replaceIn(x.node, isSent, () => t.identifier(id)).node;
          else if (x.kind === 'await') x.arg = replaceIn(x.arg, isSent, () => t.identifier(id)).node;
          else if (x.test) x.test = replaceIn(x.test, isSent, () => t.identifier(id)).node;
        }
        continue;
      }
      if (it.kind === 'jump') {
        const p = posOf(it.target);
        const j2 = jumpTo(p);
        if (j2) { out.push(...j2); }
        else if (!isEnd(p)) bail(`unstructured jump to ${it.target}`);
        // anything after an unconditional jump up to the next target is reached via its own label
        return finishTail(out, k + 1, j, c);
      }
      if (it.kind === 'cjump' || it.kind === 'ifJump') {
        const test = clean(t.expressionStatement(it.test))[0].expression;
        const body = it.body ? it.body.flatMap(clean) : [];
        const p = posOf(it.target);
        const j2 = jumpTo(p);
        if (it.kind === 'cjump') {
          const q = posOf(it.otherwise);
          if (q !== k + 1 && q !== nextLabelPos(k)) bail('cjump else not next');
          if (j2) { out.push(t.ifStatement(test, t.blockStatement(j2))); continue; }
          // `next = test ? T : fallthrough`
          const { stmts, resume } = branch(k + 1, p, c, j);
          out.push(t.ifStatement(t.unaryExpression('!', test), t.blockStatement(stmts)));
          k = resume - 1;
          continue;
        }
        if (j2) { out.push(t.ifStatement(test, t.blockStatement([...body, ...j2]))); continue; }
        if (!(p > k) || !(p <= j || c.exits.has(p))) bail(`unstructured conditional jump to ${it.target}`);
        const end = p <= j ? p : j;
        const { stmts, elseStmts, resume } = branch(k + 1, end, c, j);
        const negated = t.isUnaryExpression(test, { operator: '!' }) ? test.argument : t.unaryExpression('!', test);
        if (body.length) {
          out.push(t.ifStatement(test, t.blockStatement([...body, ...(elseStmts ?? [])]), t.blockStatement(stmts)));
        } else {
          out.push(t.ifStatement(negated, t.blockStatement(stmts), elseStmts ? t.blockStatement(elseStmts) : null));
        }
        k = resume - 1;
        continue;
      }
      // plain statement
      if (t.isReturnStatement(it.node) && isCtxCall(it.node.argument, ctx, 'abrupt') && t.isStringLiteral(it.node.argument.arguments[0]) && /break|continue/.test(it.node.argument.arguments[0].value)) {
        const p = posOf(num(it.node.argument.arguments[1]));
        const j2 = jumpTo(p);
        if (j2) out.push(...j2); else if (!isEnd(p)) bail('abrupt jump out of structure');
        return finishTail(out, k + 1, j, c);
      }
      if (t.isReturnStatement(it.node) && isCtxCall(it.node.argument, ctx, 'finish')) bail('finish outside finally');
      const isTerminal = t.isReturnStatement(it.node) && !isCtxCall(it.node.argument, ctx, 'stop');
      out.push(...clean(it.node));
      if (isTerminal || t.isThrowStatement(it.node)) return finishTail(out, k + 1, j, c);
    }
    return out;
  }
  function nextLabelPos(k) { let n = k + 1; while (items[n] && items[n].kind !== 'label') n++; return n; }
  // code following a terminator is unreachable unless a jump targets its label
  function finishTail(out, from, j, c) {
    for (let x = from; x < j; x++) {
      const it = items[x];
      if (it.kind === 'label' && it.label !== 'end') {
        let targeted = false;
        for (const y of items) if (y !== it && jumpsTo(y, it.label)) targeted = true;
        if (targeted && !c.allowDead) {
          // reachable tail: only safe when an enclosing construct consumes it
          if (!c.tailOk) bail('code after terminator is reachable');
        }
      }
      if (it.kind === 'stmt' && !isDead(it.node)) { /* unreachable filler */ }
    }
    return out;
  }
  const isDead = () => true;

  function branch(from, to, c, j) {
    // if-body [from,to); a trailing unconditional forward jump makes [to,m) the else-body
    let lastPos = to - 1;
    while (lastPos >= from && items[lastPos].kind === 'label') lastPos--;
    const last = items[lastPos];
    if (last?.kind === 'jump') {
      const m = posOf(last.target);
      const notLoopCtl = m !== c.cont && m !== c.brk;
      if (m > to && notLoopCtl && (m <= j || c.exits.has(m))) {
        const end = m <= j ? m : j;
        const stmts = emit(from, to, { ...c, exits: new Set([...c.exits, m]), tailOk: true });
        const elseStmts = emit(to, end, { ...c, tailOk: true });
        return { stmts, elseStmts, resume: end };
      }
    }
    return { stmts: emit(from, to, { ...c, tailOk: true }), resume: to };
  }
  function emitCatch(cPos, end, c, tryLoc) {
    let k = cPos;
    while (items[k]?.kind === 'label') k++;
    const first = items[k];
    let param = t.identifier('caughtError');
    const pre = [];
    if (first?.kind === 'stmt' && t.isExpressionStatement(first.node)) {
      const ex = first.node.expression;
      if (t.isAssignmentExpression(ex) && isCtxCall(ex.right, ctx, 'catch') && t.isNumericLiteral(ex.right.arguments[0], { value: tryLoc })) {
        pre.push(t.expressionStatement(t.assignmentExpression('=', rewriteLeft(ex.left), t.identifier('caughtError'))));
      } else if (!(isCtxCall(ex, ctx, 'catch') && t.isNumericLiteral(ex.arguments[0], { value: tryLoc }))) bail('catch not first');
    } else bail('catch not first');
    const body = emit(k + 1, end, { ...c, tailOk: true });
    return t.catchClause(param, t.blockStatement([...pre, ...body]));
  }
  const rewriteLeft = (left) => (isCtxMember(left, ctx) ? (temps.add(`_${left.property.name}`), t.identifier(`_${left.property.name}`)) : left);

  const body = emit(0, items.length, { exits: new Set(), tailOk: true });
  return { body, temps };
}

const matchAsync = (call) => (t.isCallExpression(call) && call.arguments.length === 1 ? matchMark(call.arguments[0]) : null);
// loop bodies: `b = regenerator.mark(fn)` driven by ctx.delegateYield(b(), ...) in the enclosing async function
function convertInnerMarks(node) {
  return replaceIn(node, (x) => matchMark(x) !== null, (x) => toAsyncFunction(matchMark(x))).node;
}
function toAsyncFunction(m) {
  const cases = m.cases.map((c) => convertInnerMarks(t.cloneNode(c, true)));
  const { body, temps } = structure(cases, m.ctx, m.tryLocs);
  const decls = [...temps].map((n) => t.variableDeclaration('var', [t.variableDeclarator(t.identifier(n))]));
  return t.functionExpression(null, m.fn.params, t.blockStatement([...m.decls, ...decls, ...body]), false, true);
}
function matchMark(mark) {
  // regenerator.mark(function (...) { ...; return regenerator.wrap(function (ctx) { while (true) switch (ctx.prev = ctx.next) {...} }, ...) })
  if (!t.isCallExpression(mark) || !t.isMemberExpression(mark.callee) || mark.callee.property.name !== 'mark') return null;
  const fn = mark.arguments[0];
  if (!t.isFunctionExpression(fn) || !fn.body.body.length) return null;
  const ret = fn.body.body.at(-1);
  if (!t.isReturnStatement(ret) || !t.isCallExpression(ret.argument) || !t.isMemberExpression(ret.argument.callee) || ret.argument.callee.property.name !== 'wrap') return null;
  const inner = ret.argument.arguments[0];
  if (!t.isFunctionExpression(inner) || inner.params.length !== 1) return null;
  const loop = inner.body.body[0];
  if (inner.body.body.length !== 1 || !t.isWhileStatement(loop) && !t.isForStatement(loop)) return null;
  const sw = t.isBlockStatement(loop.body) ? loop.body.body[0] : loop.body;
  if (!t.isSwitchStatement(sw)) return null;
  const locs = ret.argument.arguments[3];
  const tryLocs = locs ? locs.elements.map((e) => e.elements.map((x) => (t.isNumericLiteral(x) ? x.value : null))) : [];
  return { fn, ctx: inner.params[0].name, cases: sw.cases, tryLocs, decls: fn.body.body.slice(0, -1) };
}

export function transformAst(ast) {
  const stats = { converted: 0, bailed: 0, reasons: {} };
  traverse(ast, {
    CallExpression: {
      exit(p) {
        const m = matchAsync(p.node);
        if (!m) return;
        try {
          p.replaceWith(toAsyncFunction(m));
          p.skip();
          stats.converted++;
        } catch (e) {
          if (!(e instanceof Bail)) throw e;
          stats.bailed++;
          const key = e.message.replace(/\d+/g, 'N').slice(0, 40);
          stats.reasons[key] = (stats.reasons[key] ?? 0) + 1;
        }
      },
    },
  });
  // function F() { return (F = async function (a) {...}).apply(this, arguments); }  ->  async function F(a) {...}
  traverse(ast, {
    FunctionDeclaration(p) {
      const b = p.node.body.body;
      if (b.length !== 1 || !t.isReturnStatement(b[0]) || p.node.params.length) return;
      const call = b[0].argument;
      if (!t.isCallExpression(call) || !t.isMemberExpression(call.callee) || call.callee.property.name !== 'apply') return;
      const asg = call.callee.object;
      if (!t.isAssignmentExpression(asg) || !t.isIdentifier(asg.left, { name: p.node.id.name }) || !t.isFunctionExpression(asg.right, { async: true })) return;
      p.node.params = asg.right.params;
      p.node.body = asg.right.body;
      p.node.async = true;
    },
  });
  // value: (x = async function (a) {...}, function (A) { return x.apply(this, arguments); })  ->  value: async function (a) {...}
  traverse(ast, {
    SequenceExpression(p) {
      const [a, b] = p.node.expressions;
      if (p.node.expressions.length !== 2 || !t.isAssignmentExpression(a, { operator: '=' }) || !t.isIdentifier(a.left) || !t.isFunctionExpression(a.right, { async: true }) || !t.isFunctionExpression(b)) return;
      const r = b.body.body;
      if (r.length !== 1 || !t.isReturnStatement(r[0]) || !t.isCallExpression(r[0].argument)) return;
      const c = r[0].argument.callee;
      if (!t.isMemberExpression(c) || !t.isIdentifier(c.object, { name: a.left.name }) || c.property.name !== 'apply') return;
      const binding = p.scope.getBinding(a.left.name);
      if (!binding || binding.referencePaths.length !== 1 || binding.constantViolations.length !== 1) return;
      p.replaceWith(a.right);
      binding.path.remove();
    },
  });
  return stats;
}

function collect(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) collect(f, out);
    else if (f.endsWith('.js')) out.push(f);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const total = { converted: 0, bailed: 0, reasons: {} };
  for (const dir of process.argv.slice(2)) {
    for (const f of collect(dir)) {
      const src = fs.readFileSync(f, 'utf8');
      if (!/\.mark\(/.test(src) || src.length > 3_000_000) continue;
      const ast = parse(src, { sourceType: 'script', allowReturnOutsideFunction: true, plugins: ['jsx'] });
      const s = transformAst(ast);
      if (s.converted) fs.writeFileSync(f, `${generate(ast, { jsescOption: { minimal: true } }).code}\n`);
      total.converted += s.converted;
      total.bailed += s.bailed;
      for (const [k, v] of Object.entries(s.reasons)) total.reasons[k] = (total.reasons[k] ?? 0) + v;
    }
  }
  console.log(total);
}
