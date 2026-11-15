// Names the Electron main process (webcrack output of electron.main) from a per-version config
// (versions/<version>/name-main.json, names chosen by reading the code): module files and minified
// bindings. The config is the only place that knows the version's module ids. External requires
// come from the raw files themselves (`module.exports = require(/*webcrack:missing*/"./pkg.js")`).
// Usage: node name-main.mjs <electron.main dir> <outDir> <name-main.json>
//   config keys: mainFile (entry, holds module.exports.default), files {raw file: named file},
//   top {raw file: {binding: name}} for program scope,
//   mainDefault {binding: name} inside the module.exports.default function of mainFile,
//   mainDefaultBlockScoped [binding] of mainDefault that live in a block scope of that function.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
const traverse = _traverse.default ?? _traverse;
const generate = _generate.default ?? _generate;

// Returns {module id: package} for the raw modules that only re-export an external package.
export function externals(dir) {
  const out = {};
  for (const f of fs.readdirSync(dir)) {
    const id = f.match(/^(\d+)\.js$/)?.[1];
    const pkg = id && fs.readFileSync(path.join(dir, f), 'utf8')
      .match(/^module\.exports = require\(\/\*webcrack:missing\*\/"\.\/(.+)\.js"\);\s*$/)?.[1];
    if (pkg) out[id] = pkg;
  }
  return out;
}

// Writes the named main process files; the CLI entry.
function main() {
  const [, , inDir, outDir, configFile] = process.argv;
  if (!configFile) {
    console.error('Usage: node name-main.mjs <electron.main dir> <outDir> <name-main.json>');
    process.exit(2);
  }
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const { mainFile, files: FILES, top: MAPS, mainDefault: MAIN_DEFAULT } = config;
  const EXTERNAL = externals(inDir);
  const BLOCK_SCOPED = new Set(config.mainDefaultBlockScoped ?? []);

  // Maps require("./N.js") to the named sibling file or the external package; unknown ids stop the run.
  function rewriteRequires(src) {
    return src.replace(/require\((?:\/\*[^*]*\*\/)?"\.\/(\d+)\.js"\)/g, (all, id) => {
      if (FILES[`${id}.js`]) return `require("./${FILES[`${id}.js`].replace(/\.js$/, '')}")`;
      if (!EXTERNAL[id]) throw new Error(`module ${id} is neither in files nor in external`);
      return `require("${EXTERNAL[id]}")`;
    });
  }

  fs.mkdirSync(outDir, { recursive: true });
  for (const [from, to] of Object.entries(FILES)) {
    const src = rewriteRequires(fs.readFileSync(path.join(inDir, from), 'utf8'));
    const ast = parse(src, { sourceType: 'script', allowReturnOutsideFunction: true });
    const seen = new Set();
    traverse(ast, {
      Program(p) { for (const [k, v] of Object.entries(MAPS[from] ?? {})) if (p.scope.hasOwnBinding(k)) p.scope.rename(k, v); },
      AssignmentExpression(p) {
        if (from !== mainFile || p.scope.parent || !p.get('right').isFunction()) return;
        if (generate(p.node.left).code !== 'module.exports.default') return;
        const fn = p.get('right');
        for (const [k, v] of Object.entries(MAIN_DEFAULT)) if (fn.scope.hasOwnBinding(k)) fn.scope.rename(k, v);
      },
    });
    // nested handler state in the `if (requestSingleInstanceLock)` block lives in a block scope
    traverse(ast, {
      BlockStatement(p) {
        if (from !== mainFile) return;
        for (const [k, v] of Object.entries(MAIN_DEFAULT)) {
          if (BLOCK_SCOPED.has(k) && p.scope.hasOwnBinding(k) && !seen.has(k)) { seen.add(k); p.scope.rename(k, v); }
        }
      },
    });
    fs.writeFileSync(path.join(outDir, to), `${generate(ast, { comments: true }).code}\n`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
