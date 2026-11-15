// Split a webpack 4 production bundle (`!function(runtime){...}([mod0, mod1, ...])`)
// into module sources without building a full AST (low memory).
// Usage: node split-webpack.mjs <bundle.js> <out.json>
import fs from 'node:fs';
import { tokenizer, tokTypes as tt } from 'acorn';

const [, , input, output] = process.argv;
const src = fs.readFileSync(input, 'utf8');

const tok = tokenizer(src, { ecmaVersion: 'latest', allowHashBang: true });
let depth = 0;
let arrayDepth = -1;     // bracket depth inside the modules array
let elemStart = -1;
let runtimeEnd = -1;
const modules = [];      // [id, start, end] (holes skipped)
let index = 0;
let prevCloseParenFn = false; // saw `}(` at depth 0 -> next `[` is the modules array

const open = new Set([tt.parenL, tt.bracketL, tt.braceL, tt.dollarBraceL]);
const close = new Set([tt.parenR, tt.bracketR, tt.braceR]);

for (const t of tok) {
  if (arrayDepth < 0) {
    if (t.type === tt.bracketL && depth === 1 && prevCloseParenFn) {
      arrayDepth = depth + 1;
      runtimeEnd = t.start;
      elemStart = t.end;
      depth++;
      continue;
    }
    prevCloseParenFn = depth === 1 && t.type === tt.parenL ? prevCloseParenFn : false;
    if (open.has(t.type)) depth++;
    else if (close.has(t.type)) depth--;
    if (t.type === tt.parenL && depth === 1) prevCloseParenFn = true;
    continue;
  }
  if (depth === arrayDepth && (t.type === tt.comma || t.type === tt.bracketR)) {
    const text = src.slice(elemStart, t.start).trim();
    if (text) modules.push([index, elemStart, t.start]);
    index++;
    elemStart = t.end;
    if (t.type === tt.bracketR) break;
    continue;
  }
  if (open.has(t.type)) depth++;
  else if (close.has(t.type)) depth--;
}

fs.writeFileSync(output, JSON.stringify({ runtime: src.slice(0, runtimeEnd), modules }));
console.log(`modules: ${modules.length}, array length: ${index}`);
