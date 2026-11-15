// Tests of decodeBlob in tshBlob.js (src/renderer/app/desktop/tshEditor/tshBlob.js).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { sampleBytes } = require("../../support/tshSamples.js");
const { fresh001Model, screen, textWidget, patchRecordByte } = require("../../support/tshModels.js");
const B = require(path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor/tshBlob.js"));

const { decodeBlob } = B;
const codes = (r) => r.issues.map((i) => i.code);
// Start and length of a record from the directory of a blob.
const recordSlice = (bytes, i) => {
  const o = 6 + 9 * i;
  const start = (bytes[o + 1] << 8) | bytes[o + 2];
  return bytes.slice(start, start + ((bytes[o + 3] << 8) | bytes[o + 4]));
};

describe("decodeBlob", () => {
  it("decodes the fresh TSH2 sample to the full model", () => {
    assert.deepEqual(decodeBlob(sampleBytes("001")), { blob: fresh001Model(), issues: [] });
  });
  it("decodes a user screen with typed text widgets", () => {
    const r = decodeBlob(sampleBytes("005"));
    assert.deepEqual(r.issues, []);
    assert.deepEqual(r.blob.records[2], screen({
      name: "Ekran 1",
      widgets: [textWidget("Nowe pole tekstowe"), textWidget("Nowe pole tekstowe", { x: 40, y: 40 })]
    }));
  });
  it("decodes the main-screen flag and the grid flag", () => {
    const s = decodeBlob(sampleBytes("060")).blob.records[2];
    assert.equal(s.id, 33);
    assert.deepEqual([s.type, s.main, s.grid, s.useTheme, s.flagsOther], ["user", true, true, false, 0]);
  });
  it("decodes UTF-8 screen names", () => {
    assert.equal(decodeBlob(sampleBytes("063")).blob.records[2].name, "Ekran ąę");
  });
  it("reports the stale theme directory sum of sample 083", () => {
    const r = decodeBlob(sampleBytes("083"));
    assert.deepEqual(r.issues, [{ code: "DIR_SUM", record: 0, detail: "directory sum 4589 != record sum 4811" }]);
    assert.equal(r.blob.width, 480);
    assert.equal(r.blob.records[0].kind, "screen");
  });
  it("refuses input shorter than the global header", () => {
    for (const input of [sampleBytes("001").slice(0, 351), new Uint8Array(0), "abc"]) {
      const r = decodeBlob(input);
      assert.equal(r.blob, null);
      assert.deepEqual(codes(r), ["TOO_SHORT"]);
    }
  });
  it("refuses an unknown version or resolution", () => {
    const v = sampleBytes("001");
    v[0] = 2;
    assert.deepEqual([decodeBlob(v).blob, codes(decodeBlob(v))], [null, ["VERSION"]]);
    const w = sampleBytes("001");
    w[1] = 0x03;
    w[2] = 0x20;
    assert.deepEqual([decodeBlob(w).blob, codes(decodeBlob(w))], [null, ["RESOLUTION"]]);
  });
  it("refuses more than 38 directory entries", () => {
    const b = sampleBytes("001");
    b[5] = 39;
    assert.deepEqual([decodeBlob(b).blob, codes(decodeBlob(b))], [null, ["TOO_MANY_RECORDS"]]);
  });
  it("refuses a record outside the blob", () => {
    const b = sampleBytes("001");
    b[6 + 9 + 3] = 0xff;
    b[6 + 9 + 4] = 0xff;
    assert.deepEqual([decodeBlob(b).blob, codes(decodeBlob(b))], [null, ["RECORD_RANGE"]]);
  });
  it("reports wrong padding but keeps the model", () => {
    const b = sampleBytes("001");
    const longer = new Uint8Array(b.length + 32).fill(0xab);
    longer.set(b);
    const r = decodeBlob(longer);
    assert.deepEqual(codes(r), ["PADDING"]);
    assert.deepEqual(r.blob, fresh001Model());
    longer[longer.length - 1] = 0x00;
    assert.deepEqual(codes(decodeBlob(longer)), ["PADDING"]);
  });
  it("keeps a record with a bad header checksum as raw bytes", () => {
    const b = patchRecordByte(sampleBytes("001"), 1, 25, 0x41, { fixHeaderSum: false });
    const r = decodeBlob(b);
    assert.deepEqual(codes(r), ["HEADER_CHECKSUM"]);
    assert.deepEqual(r.blob.records[1], { kind: "raw", id: 0, reason: "HEADER_CHECKSUM", bytes: recordSlice(b, 1) });
    assert.equal(r.blob.records[1].bytes.length, 32);
  });
  it("keeps a record with an unknown screen type as raw bytes", () => {
    const b = patchRecordByte(sampleBytes("001"), 1, 17, 9, { fixHeaderSum: true });
    const r = decodeBlob(b);
    assert.deepEqual(codes(r), ["SCREEN_TYPE"]);
    assert.deepEqual(r.blob.records[1], { kind: "raw", id: 0, reason: "SCREEN_TYPE", bytes: recordSlice(b, 1) });
  });
  it("keeps a record with invalid UTF-8 in the name as raw bytes", () => {
    const b = patchRecordByte(sampleBytes("001"), 1, 20, 0xc5, { fixHeaderSum: true });
    const r = decodeBlob(b);
    assert.deepEqual(codes(r), ["NAME_UTF8"]);
    assert.deepEqual(r.blob.records[1], { kind: "raw", id: 0, reason: "NAME_UTF8", bytes: recordSlice(b, 1) });
  });
  it("keeps a widget with a bad checksum as raw bytes and parses the next one", () => {
    const b = patchRecordByte(sampleBytes("005"), 2, 66, 0x00, { fixHeaderSum: false });
    const r = decodeBlob(b);
    assert.deepEqual(r.issues, [{ code: "WIDGET_CHECKSUM", record: 2, widget: 0, detail: r.issues[0].detail }]);
    const w = r.blob.records[2].widgets;
    assert.deepEqual(w[0], { kind: "raw", reason: "WIDGET_CHECKSUM", bytes: recordSlice(b, 2).slice(30, 67) });
    assert.equal(w[1].kind, "widget");
  });
  it("keeps a record whose name length does not fit the header as raw bytes (HEADER_LAYOUT)", () => {
    const b = patchRecordByte(sampleBytes("001"), 1, 19, 200, { fixHeaderSum: true });
    const r = decodeBlob(b);
    assert.deepEqual(codes(r), ["HEADER_LAYOUT"]);
    assert.deepEqual(r.blob.records[1], { kind: "raw", id: 0, reason: "HEADER_LAYOUT", bytes: recordSlice(b, 1) });
  });
  it("keeps a record with an impossible widget length as raw bytes (WIDGET_LENGTH)", () => {
    const b = patchRecordByte(sampleBytes("005"), 2, 31, 5, { fixHeaderSum: false });
    const r = decodeBlob(b);
    assert.deepEqual(codes(r), ["WIDGET_LENGTH"]);
    assert.deepEqual(r.blob.records[2], { kind: "raw", id: 33, reason: "WIDGET_LENGTH", bytes: recordSlice(b, 2) });
  });
});
