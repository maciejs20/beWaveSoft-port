// Our version shown in the app (desktop/shared/modVersion.js): the string injected by build-app.mjs through esbuild
// `define`, or the original version passed as fallback when nothing is injected (node, unit tests).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const file = path.join(__dirname, "../../../src/renderer/app/desktop/shared/modVersion.js");
const { modVersion } = require(file);

// Runs the module source with __BEWAVE_MOD_VERSION__ replaced as esbuild `define` does.
function withDefine(value) {
  const source = fs.readFileSync(file, "utf8").replaceAll("__BEWAVE_MOD_VERSION__", JSON.stringify(value));
  const module = { exports: {} };
  vm.runInNewContext(source, { exports: module.exports, module });
  return module.exports.modVersion;
}

describe("modVersion", () => {
  it("returns the fallback when nothing is injected", () => {
    assert.equal(modVersion("1.2.0"), "1.2.0");
  });
  it("returns the injected version", () => {
    assert.equal(withDefine("1.2.0-mod3.1")("1.2.0"), "1.2.0-mod3.1");
  });
  it("returns the fallback when the injected version is empty", () => {
    assert.equal(withDefine("")("1.2.0"), "1.2.0");
  });
});
