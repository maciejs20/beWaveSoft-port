// Test helpers for the TSH codec: sample fixtures (TSH Soft saves) and hex parsing.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const bytesModule = path.join(__dirname, "../../src/renderer/app/desktop/tshEditor/tshBytes.js");
const fixturePath = path.join(__dirname, "../fixtures/tsh-samples.json");
let cache = null;
// Returns Map id -> { label, base64, bytes } for the 89 samples; bytes is a plain Uint8Array (not Buffer).
function loadSamples() {
  if (!cache) {
    const { base64ToBytes } = require(bytesModule);
    const samples = JSON.parse(fs.readFileSync(fixturePath, "utf8")).samples;
    cache = new Map(Object.keys(samples).sort().map((id) => {
      const { label, base64 } = samples[id];
      return [id, { label, base64, bytes: base64ToBytes(base64) }];
    }));
  }
  return cache;
}
// Returns the blob bytes of one sample (a fresh copy, so tests may mutate it).
function sampleBytes(id) {
  return Uint8Array.from(loadSamples().get(id).bytes);
}
// Returns bytes of a hex string.
function fromHex(hex) {
  return Uint8Array.from(hex.match(/../g) || [], (h) => parseInt(h, 16));
}
module.exports = { loadSamples, sampleBytes, fromHex };
