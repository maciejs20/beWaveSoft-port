const log = [];
const sleep = (v, fail) => new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(String(v))) : res(v)), 0));
async function simple(a) { const x = await sleep(a); log.push(x); return x + 1; }
async function noResult() { await sleep(1); log.push('n'); }
async function branchy(a) { let r; if (a > 1) { r = await sleep('big'); } else { r = await sleep('small'); log.push('s'); } log.push(r); return r; }
async function earlyReturn(a) { if (!a) return 'none'; const r = await sleep(a); if (r > 2) { return 'gt'; } log.push('tail'); return r; }
async function loop(n) { let s = 0; for (let i = 0; i < n; i++) { s += await sleep(i); log.push(s); } return s; }
async function loopBreak(n) { let s = 0; for (let i = 0; i < n; i++) { if (i === 1) continue; if (i === 3) break; s += await sleep(i); } log.push(s); return s; }
async function whileLoop() { let i = 0; while (await sleep(i) < 3) { i++; log.push(i); } return i; }
async function tryCatch(fail) { let r = 'a'; try { r = await sleep('ok', fail); log.push('in'); } catch (e) { log.push(e.message); r = 'caught'; } log.push(r); return r; }
async function tryReturn(fail) { try { const v = await sleep(5, fail); return v * 2; } catch (e) { return 'err' + e.message; } }
async function tryFinally(fail) { let r = 0; try { r = await sleep(1, fail); log.push('t'); } catch (e) { log.push('c'); } finally { log.push('f'); await sleep(0); } return r; }
async function retry(n) { for (let i = 0; i < n; i++) { try { const v = await sleep(i, i < 2); log.push('good' + v); return v; } catch (e) { log.push('bad' + i); await sleep(0); } } return -1; }
async function nested(a) { let t = 0; for (const x of a) { if (x % 2) { for (let j = 0; j < x; j++) { t += await sleep(j); } } else { t -= await sleep(x); } } return t; }
async function args() { const c = arguments.length; const v = await sleep(arguments[0]); return [c, v]; }
async function exprUse(a) { const o = { v: await sleep(a), w: await sleep(a + 1) }; return [o.v + o.w, (await sleep(2)) * (await sleep(3))]; }
async function cond(a) { const v = a ? await sleep(1) : await sleep(2); return v && (await sleep(v + 1)); }
const arrow = async (x) => { const f = async (y) => (await sleep(y)) + 1; return f(await sleep(x)); };
async function rethrow() { try { await sleep('x', true); } catch (e) { log.push('r'); throw e; } }
async function closures(a) { const fs = []; for (const x of a) { fs.push(() => x); log.push(await sleep(x)); if (x === 2) { return 'stop' + fs.length; } } return fs.map((f) => f()); }
async function closuresTry(n) { for (let i = 0; i < n; i++) { const f = () => i; try { if (i === 1) continue; log.push(await sleep(f(), i === 2)); } catch (e) { log.push('e' + f()); } } return n; }
const conn = { base: 2, async add(v) { return this.base + (await sleep(v)); } };
async function callWithAwaited(a) { const r = await conn.add.call(conn, await sleep(a)); const s = (await sleep(1)) + (await conn.add(await sleep(r))); return [r, s]; }
const runs = [() => callWithAwaited(3), () => closures([1, 3]), () => closures([1, 2, 3]), () => closuresTry(4), () => simple(1), noResult, () => branchy(2), () => branchy(0), () => earlyReturn(0), () => earlyReturn(3), () => earlyReturn(1), () => loop(3), () => loopBreak(5), whileLoop, () => tryCatch(false), () => tryCatch(true), () => tryReturn(false), () => tryReturn(true), () => tryFinally(false), () => tryFinally(true), () => retry(4), () => retry(1), () => nested([1, 2, 3]), () => args(9, 8), () => exprUse(1), () => cond(1), () => cond(0), () => arrow(1), rethrow];
(async () => {
  const results = [];
  for (const r of runs) { try { results.push(['ok', await r()]); } catch (e) { results.push(['throw', e.message]); } }
  console.log(JSON.stringify({ results, log }));
})();
