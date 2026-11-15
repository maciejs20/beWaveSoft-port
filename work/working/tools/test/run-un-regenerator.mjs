// babel+terser+webcrack (same pipeline as the product) -> un-regenerator; both must print the same.
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { parse } from '@babel/parser';
import _generate from '@babel/generator';
import { minify } from 'terser';
import { webcrack } from 'webcrack';
import { transformAst } from '../un-regenerator.mjs';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const generate = _generate.default ?? _generate;
const src = fs.readFileSync(new URL('./fixtures.js', import.meta.url), 'utf8');
const run = (code) => new Promise((res) => {
  const out = [];
  vm.runInNewContext(code, { console: { log: (x) => { out.push(x); res(out.join('\n')); } }, setTimeout, Promise, Error, String, JSON });
});
const compiled = babel.transformSync(src, { configFile: false, babelrc: false, sourceType: 'script', plugins: ['@babel/plugin-transform-block-scoping', '@babel/plugin-transform-for-of', '@babel/plugin-transform-async-to-generator', '@babel/plugin-transform-regenerator'] }).code;
const min = (await minify(compiled, { compress: { passes: 2, toplevel: false }, mangle: false })).code;
const cracked = (await webcrack(min, { unpack: false, deobfuscate: false, unminify: true, jsx: false, mangle: false })).code;
const ast = parse(cracked, { sourceType: 'script', allowReturnOutsideFunction: true });
const stats = transformAst(ast);
const back = generate(ast).code;
fs.writeFileSync(new URL('./last-output.js', import.meta.url), back);
const [a, b, c] = [await run(src), await run(min), await run(back)];
console.log('stats', stats);
console.log('minified==source', a === b, ' restored==source', a === c, ' mark left', (back.match(/\.mark\(/g) ?? []).length);
if (a !== c) { console.log(a); console.log(c); process.exit(1); }
