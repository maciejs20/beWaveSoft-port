// Tests of tshBytes.js (src/renderer/app/desktop/tshEditor/tshBytes.js).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { loadSamples, sampleBytes, fromHex } = require("../../support/tshSamples.js");
const B = require(path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor/tshBytes.js"));

describe("tshBytes", () => {
  it("computes the checksum TSH stores in widgets of samples", () => {
    for (const hex of [
      "0023012c00c800805a5a5f56a8dee6e6e6124e6f776520706f6c652074656b73746f776507",
      "0012012c00c801805a5a5f56a8dee6e6e600002b",
      "0011012c00c823805a5a5f56a8dee6e6e600c5",
    ]) {
      const d = fromHex(hex);
      assert.equal(B.tshChecksum(d), d[d[1] + 1]);
    }
  });
  it("reads and writes big-endian u16 and u32", () => {
    const b = new Uint8Array(4);
    B.writeU32(b, 0, 4811);
    assert.deepEqual(b, fromHex("000012cb"));
    assert.equal(B.readU32(b, 0), 4811);
    B.writeU32(b, 0, 0xfffffffe);
    assert.equal(B.readU32(b, 0), 0xfffffffe);
    assert.equal(B.readU16(fromHex("01e0"), 0), 480);
    B.writeU16(b, 1, 0x0400);
    assert.deepEqual(b, fromHex("ff0400fe"));
  });
  it("decodes UTF-8 and refuses invalid sequences", () => {
    const bytes = B.encodeUtf8("Ekran ąę");
    assert.equal(bytes.length, 10);
    assert.equal(B.decodeUtf8(bytes), "Ekran ąę");
    assert.equal(B.decodeUtf8(Uint8Array.of(0xc5)), null);
  });
  it("round-trips base64 and refuses invalid input", () => {
    assert.equal(B.bytesToBase64(sampleBytes("001")), loadSamples().get("001").base64);
    const big = Uint8Array.from({ length: 0x18000 + 5 }, (_, i) => i & 0xff);
    assert.deepEqual(B.base64ToBytes(B.bytesToBase64(big)), big);
    assert.equal(B.base64ToBytes("@@"), null);
    assert.equal(B.base64ToBytes(5), null);
  });
  it("parses only six lowercase hex digits as a color", () => {
    assert.deepEqual(B.hexToRgb("56a8de"), [0x56, 0xa8, 0xde]);
    for (const bad of ["56A8DE", "56a8d", "ggg000", "56a8de0", 5]) {
      assert.equal(B.hexToRgb(bad), null);
    }
    assert.equal(B.rgbToHex(fromHex("0056a80fde"), 1), "56a80f");
  });
  it("sums all bytes of a record", () => {
    const b = sampleBytes("083");
    assert.equal(B.byteSum(b.subarray(0x160, 0x160 + 0x3c)), 4811);
  });
});
