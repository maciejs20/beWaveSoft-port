// Tests of encodeBlob in tshBlob.js (src/renderer/app/desktop/tshEditor/tshBlob.js).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { sampleBytes } = require("../../support/tshSamples.js");
const { fresh001Model, screen, textWidget, patchRecordByte } = require("../../support/tshModels.js");
const B = require(path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor/tshBlob.js"));

const { encodeBlob, decodeBlob } = B;
const codes = (r) => (r.ok ? [] : r.errors.map((e) => e.code));
const withRecords = (...extra) => {
  const m = fresh001Model();
  m.records.push(...extra);
  return m;
};
const repeat = (n, make) => Array.from({ length: n }, (_, i) => make(i));
const recordSlice = (bytes, i) => {
  const o = 6 + 9 * i;
  const start = (bytes[o + 1] << 8) | bytes[o + 2];
  return bytes.slice(start, start + ((bytes[o + 3] << 8) | bytes[o + 4]));
};

describe("encodeBlob", () => {
  it("encodes the fresh TSH2 model to the bytes TSH saved", () => {
    assert.deepEqual(encodeBlob(fresh001Model()), { ok: true, bytes: sampleBytes("001") });
  });
  it("adds no padding when the records end on a 32-byte boundary", () => {
    const m = fresh001Model();
    m.records[1].name = "Wygaszacz1234";
    const r = encodeBlob(m);
    assert.equal(r.ok, true);
    assert.equal(r.bytes.length, 448);
    assert.deepEqual(decodeBlob(r.bytes).issues, []);
  });
  it("writes raw records and raw widgets back unchanged", () => {
    const inputs = [
      patchRecordByte(sampleBytes("001"), 1, 25, 0x41, { fixHeaderSum: false }),
      patchRecordByte(sampleBytes("001"), 1, 17, 9, { fixHeaderSum: true }),
      patchRecordByte(sampleBytes("001"), 1, 20, 0xc5, { fixHeaderSum: true }),
      patchRecordByte(sampleBytes("005"), 2, 66, 0x00, { fixHeaderSum: false })
    ];
    for (const input of inputs) {
      const { blob, issues } = decodeBlob(input);
      assert.deepEqual(issues.length, 1);
      assert.deepEqual(encodeBlob(blob), { ok: true, bytes: input });
    }
    assert.equal(recordSlice(inputs[0], 1).length, 32);
  });
  it("keeps a widget with a 16-bit length as raw bytes", () => {
    const bytes = new Uint8Array(274);
    bytes[0] = 0x01;
    bytes[1] = 0x10;
    const raw = { kind: "raw", bytes, reason: "WIDGET_LONG" };
    const r = encodeBlob(withRecords(screen({ widgets: [raw] })));
    assert.equal(r.ok, true);
    const back = decodeBlob(r.bytes);
    assert.deepEqual(back.blob.records[2].widgets, [raw]);
    assert.deepEqual(encodeBlob(back.blob), r);
  });
  it("allows 16 user screens and refuses 17", () => {
    const users = (n) => withRecords(...repeat(n, (i) => screen({ id: 33 + i })));
    assert.deepEqual(codes(encodeBlob(users(16))), []);
    assert.deepEqual(codes(encodeBlob(users(17))), ["TOO_MANY_USER_SCREENS"]);
  });
  it("allows 38 records and refuses 39", () => {
    const records = (extra) => withRecords(...repeat(16, (i) => screen({ id: 33 + i })),
      ...repeat(extra, (i) => screen({ id: 100 + i, type: "additional" })));
    assert.deepEqual(codes(encodeBlob(records(20))), []);
    assert.deepEqual(codes(encodeBlob(records(21))), ["TOO_MANY_RECORDS"]);
  });
  it("limits the widget to 255 bytes", () => {
    const one = (text) => encodeBlob(withRecords(screen({ widgets: [textWidget(text)] })));
    assert.deepEqual(codes(one("a".repeat(238))), []);
    assert.deepEqual(codes(one("a".repeat(239))), ["WIDGET_TOO_LONG"]);
    assert.deepEqual(codes(one("ą".repeat(119))), []);
    assert.deepEqual(codes(one("ą".repeat(119) + "a")), ["WIDGET_TOO_LONG"]);
  });
  it("limits the screen header to 255 bytes", () => {
    const one = (n) => encodeBlob(withRecords(screen({ name: "n".repeat(n - 10), image: "i".repeat(10) })));
    assert.deepEqual(codes(one(234)), []);
    assert.deepEqual(codes(one(235)), ["HEADER_TOO_LONG"]);
  });
  it("limits the theme image to 32 bytes", () => {
    const one = (n) => {
      const m = fresh001Model();
      m.records[0].image = "i".repeat(n);
      return encodeBlob(m);
    };
    assert.deepEqual(codes(one(32)), []);
    assert.deepEqual(codes(one(33)), ["THEME_IMAGE_TOO_LONG"]);
  });
  it("accepts only the two keypad resolutions", () => {
    const sized = (width, height, layout) => {
      const m = fresh001Model();
      Object.assign(m, { width, height });
      if (layout) {
        m.records[0].layout = layout;
      }
      return encodeBlob(m);
    };
    assert.deepEqual(codes(sized(1024, 600)), []);
    assert.deepEqual(codes(sized(480, 272, [0x01, 0xe0, 0x01, 0x10, 0x20])), []);
    assert.deepEqual(codes(sized(800, 480)), ["RESOLUTION"]);
  });
  it("refuses a theme layout of the other model", () => {
    const m = fresh001Model();
    Object.assign(m, { width: 480, height: 272 });
    assert.deepEqual(codes(encodeBlob(m)), ["THEME_LAYOUT"]);
  });
  it("refuses a wrong version", () => {
    const m = fresh001Model();
    m.version = 2;
    assert.deepEqual(codes(encodeBlob(m)), ["VERSION"]);
  });
  it("refuses records out of order", () => {
    const m = fresh001Model();
    m.records.splice(1, 0, screen());
    assert.deepEqual(codes(encodeBlob(m)), ["RECORD_ORDER"]);
  });
  it("refuses a record or blob above 16-bit sizes", () => {
    const many = (n) => screen({ widgets: repeat(n, () => textWidget("a")) });
    assert.deepEqual(codes(encodeBlob(withRecords(many(3300)))), ["RECORD_TOO_LARGE"]);
    assert.deepEqual(codes(encodeBlob(withRecords(many(1700), many(1700)))), ["BLOB_TOO_LARGE"]);
  });
  it("refuses out-of-range fields", () => {
    const one = (overrides, widgetOverrides) => encodeBlob(withRecords(
      screen(Object.assign({ widgets: [textWidget("a", widgetOverrides)] }, overrides))));
    assert.deepEqual(codes(one({}, { x: 65535 })), []);
    assert.deepEqual(codes(one({}, { x: 65536 })), ["FIELD_RANGE"]);
    assert.deepEqual(codes(one({}, { size: 4 })), ["FIELD_RANGE"]);
    assert.deepEqual(codes(one({}, { colors: ["GG0000", "ffffff", "000000"] })), ["FIELD_RANGE"]);
    assert.deepEqual(codes(one({ id: 256 })), ["FIELD_RANGE"]);
    assert.deepEqual(codes(one({ layout: [0, 0, 0] })), ["FIELD_RANGE"]);
    assert.deepEqual(codes(one({ saverOptions: 256 })), ["FIELD_RANGE"]);
  });
  it("refuses main on a screen that is not a user screen", () => {
    const m = fresh001Model();
    m.records[1].main = true;
    assert.deepEqual(codes(encodeBlob(m)), ["FIELD_RANGE"]);
  });
  it("returns an error for a widget with neither data nor payload", () => {
    const w = textWidget("a", { data: null, payload: undefined });
    const r = encodeBlob(withRecords(screen({ widgets: [w] })));
    assert.deepEqual(codes(r), ["FIELD_RANGE"]);
    assert.deepEqual([r.errors[0].record, r.errors[0].widget], [2, 0]);
  });
  it("reports every error with its record and widget index", () => {
    const m = withRecords(screen({ widgets: [textWidget("a".repeat(239))] }),
      ...repeat(16, (i) => screen({ id: 40 + i })));
    const r = encodeBlob(m);
    assert.deepEqual(codes(r), ["TOO_MANY_USER_SCREENS", "WIDGET_TOO_LONG"]);
    assert.equal(r.bytes, undefined);
    assert.equal(r.errors[1].record, 2);
    assert.equal(r.errors[1].widget, 0);
  });
  it("keeps a leading BOM of a screen name and image byte for byte through decode and encode", () => {
    const m = withRecords(screen({ name: "\uFEFFEkran", image: "\uFEFFimg" }));
    const bytes = encodeBlob(m).bytes;
    const back = decodeBlob(bytes);
    assert.deepEqual(back.issues, []);
    assert.equal(back.blob.records[2].name, "\uFEFFEkran");
    assert.equal(back.blob.records[2].image, "\uFEFFimg");
    assert.deepEqual(encodeBlob(back.blob), { ok: true, bytes });
  });
  describe("malformed models (never throws, never wraps)", () => {
    const failsWith = (model, where) => {
      const r = encodeBlob(model);
      assert.equal(r.ok, false);
      assert.equal(r.bytes, undefined);
      assert.deepEqual(r.errors.map((e) => e.code), ["FIELD_RANGE"]);
      for (const k of Object.keys(where)) assert.equal(r.errors[0][k], where[k]);
    };
    const rawRecord = () => decodeBlob(patchRecordByte(sampleBytes("001"), 1, 17, 9, { fixHeaderSum: true })).blob;
    it("rejects raw record bytes that went through a JSON clone", () => {
      const m = JSON.parse(JSON.stringify(rawRecord()));
      failsWith(m, {});
      const m2 = rawRecord();
      m2.records[1] = JSON.parse(JSON.stringify(m2.records[1]));
      failsWith(m2, { record: 1 });
    });
    it("rejects raw widget bytes that went through a JSON clone", () => {
      const m = withRecords(screen({ widgets: [textWidget("a")] }));
      m.records[2].widgets[0] = { kind: "raw", reason: "x", bytes: JSON.parse(JSON.stringify(new Uint8Array(20))) };
      failsWith(m, { record: 2, widget: 0 });
    });
    it("rejects null records, null widgets, missing arrays and a null model", () => {
      const a = fresh001Model();
      a.records.push(null);
      failsWith(a, { record: 2 });
      failsWith(withRecords(screen({ widgets: [null] })), { record: 2, widget: 0 });
      failsWith(withRecords(screen({ widgets: undefined })), { record: 2 });
      failsWith({ version: 1, width: 1024, height: 600 }, {});
      failsWith(null, {});
    });
    it("rejects a non-integer or inherited widget type without throwing", () => {
      failsWith(withRecords(screen({ widgets: [textWidget("a", { type: "constructor" })] })), { record: 2, widget: 0 });
      failsWith(withRecords(screen({ widgets: [textWidget("a", { type: 1.5 })] })), { record: 2, widget: 0 });
    });
    it("rejects a raw record id outside 0-255 instead of wrapping it", () => {
      const m = rawRecord();
      m.records[1].id = 300;
      failsWith(m, { record: 1 });
    });
    it("rejects a name or image that is not a string", () => {
      failsWith(withRecords(screen({ name: null })), { record: 2 });
      failsWith(withRecords(screen({ image: 5 })), { record: 2 });
    });
    it("rejects lone surrogates in names and in widget texts instead of writing U+FFFD", () => {
      failsWith(withRecords(screen({ name: "a\uD800" })), { record: 2 });
      failsWith(withRecords(screen({ image: "\uDC00b" })), { record: 2 });
      const w = textWidget("x");
      w.data = { text: "\uD800" };
      const r = encodeBlob(withRecords(screen({ widgets: [w] })));
      assert.deepEqual([r.ok, r.errors[0].code, r.errors[0].record, r.errors[0].widget], [false, "FIELD_RANGE", 2, 0]);
      assert.equal(encodeBlob(withRecords(screen({ name: "\uD83D\uDE00" }))).ok, true);
    });
    it("rejects flagsOther that overlaps the named flag bits", () => {
      const r = encodeBlob(withRecords(screen({ flagsOther: 0x80, widgets: [textWidget("a", { flagsOther: 0x08 })] })));
      assert.deepEqual(r.errors.map((e) => [e.code, e.record, e.widget]), [
        ["FIELD_RANGE", 2, undefined], ["FIELD_RANGE", 2, 0]]);
    });
    it("rejects an empty model and a model without theme and screensaver records", () => {
      assert.deepEqual(codes(encodeBlob({ version: 1, width: 1024, height: 600, records: [] })), ["RECORD_ORDER"]);
      const m = fresh001Model();
      m.records.pop();
      assert.deepEqual(codes(encodeBlob(m)), ["RECORD_ORDER"]);
    });
  });
});

describe("tshBlob facade", () => {
  it("re-exports the encoder and the constants of the live size counter", () => {
    const E = require(path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor/tshBlobEncode.js"));
    assert.equal(B.encodeBlob, E.encodeBlob);
    assert.deepEqual([B.MAX_BLOB_SIZE, B.MAX_WIDGET_LENGTH, B.WIDGET_FIXED, B.MAX_FIELD_LENGTH, B.THEME_IMAGE_SIZE,
      B.NAME_LENGTH_OFFSET], [0xffff, 255, 17, 255, 32, 19]);
    assert.deepEqual(Array.from(B.encodeUtf8("ą")), [0xc4, 0x85]);
  });
});
