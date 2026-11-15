// Test helpers for the TSH codec: the model of sample 001, model builders and a record byte patcher.
"use strict";
const path = require("node:path");
const dir = path.join(__dirname, "../../src/renderer/app/desktop/tshEditor");
const { tshChecksum, byteSum, readU16, writeU32 } = require(path.join(dir, "tshBytes.js"));
const { encodeWidgetData } = require(path.join(dir, "tshWidgetData.js"));
const { DIR_OFFSET, DIR_ENTRY_SIZE } = require(path.join(dir, "tshFormat.js"));

// Returns the exact model of sample 001 (fresh TSH2 input).
function fresh001Model() {
  return {
    version: 1, width: 1024, height: 600, records: [
      { kind: "screen", id: 0, type: "theme", main: false, layout: [0x04, 0x00, 0x02, 0x58, 0x20], useTheme: true,
        grid: false, flagsOther: 0, colors: ["5a5a5f", "56a8de", "e6e6e6"], saverOptions: 0, name: "Motyw",
        image: "int://Abstract.jpg", widgets: [] },
      { kind: "screen", id: 0, type: "screensaver", main: false, layout: [0x00, 0x20, 0x00, 0x20, 0x20],
        useTheme: true, grid: false, flagsOther: 0, colors: ["000000", "000000", "000000"], saverOptions: 0,
        name: "Wygaszacz", image: "", widgets: [] }]
  };
}
// Returns a user screen with the defaults of sample 005; overrides replace fields.
function screen(overrides) {
  return Object.assign({
    kind: "screen", id: 33, type: "user", main: false, layout: [0, 0x20, 0, 0x20, 0x20], useTheme: true,
    grid: false, flagsOther: 0, colors: ["9d9d9d", "ffffff", "000000"], saverOptions: 0, name: "Ekran 1",
    image: "", widgets: []
  }, overrides);
}
// Returns a text widget with the defaults of sample 005 (x 32, y 32, theme colors); overrides replace fields.
function textWidget(text, overrides) {
  const data = { text };
  return Object.assign({
    kind: "widget", x: 32, y: 32, type: 0, useTheme: true, center: false, size: 0, flagsOther: 0,
    colors: ["9d9d9d", "ffffff", "000000"], data, payload: encodeWidgetData(0, data).bytes
  }, overrides);
}
// Returns a copy of the blob with one record byte set; optionally recomputes the header checksum; the directory sum
// of the record is always recomputed.
function patchRecordByte(bytes, recordIndex, offset, value, { fixHeaderSum = false } = {}) {
  const out = Uint8Array.from(bytes);
  const entry = DIR_OFFSET + DIR_ENTRY_SIZE * recordIndex;
  const start = readU16(out, entry + 1);
  const length = readU16(out, entry + 3);
  out[start + offset] = value;
  if (fixHeaderSum) {
    const hl = out[start + 1];
    out[start + hl + 1] = tshChecksum(out.subarray(start, start + length));
  }
  writeU32(out, entry + 5, byteSum(out.subarray(start, start + length)));
  return out;
}
module.exports = { fresh001Model, screen, textWidget, patchRecordByte };
