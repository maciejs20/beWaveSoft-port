// Tests of the widget type table tshWidgetTypes.js and the templates tshTemplates.js
// (src/renderer/app/desktop/tshEditor/).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { plT } = require("../../support/tshEditorSupport.js");
const { sampleBytes } = require("../../support/tshSamples.js");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const W = require(path.join(dir, "tshWidgetTypes.js"));
const Tpl = require(path.join(dir, "tshTemplates.js"));
const { decodeBlob, encodeBlob, encodeWidgetData } = require(path.join(dir, "tshBlob.js"));
const { TYPED_WIDGET_TYPES } = require(path.join(dir, "tshWidgetData.js"));
const { WIDGET_TYPE } = require(path.join(dir, "tshFormat.js"));

// First widget of each type in the samples where TSH added it with its defaults (labels.txt).
const DEFAULT_SAMPLES = { 0x00: "005", 0x01: "006", 0x02: "007", 0x03: "008", 0x05: "009", 0x08: "010", 0x17: "011",
  0x23: "012", 0x24: "013", 0x25: "014", 0x27: "015", 0x30: "016", 0x31: "017", 0x33: "018", 0x34: "019", 0x35: "020",
  0x36: "021", 0x37: "041", 0x06: "047", 0x16: "072", 0x07: "081" };
const firstWidget = (id, type) => {
  for (const r of decodeBlob(sampleBytes(id)).blob.records) {
    const w = (r.widgets || []).find((x) => x.type === type);
    if (w) return w;
  }
  return null;
};

describe("widget type table", () => {
  it("has one entry per typed widget type of the codec plus the preserve-only type 0x15", () => {
    const types = W.WIDGET_TYPES.map((d) => d.type).sort((a, b) => a - b);
    assert.deepEqual(types, [...TYPED_WIDGET_TYPES, WIDGET_TYPE.INPUT_TEXT].sort((a, b) => a - b));
    assert.equal(new Set(W.WIDGET_TYPES.map((d) => d.key)).size, W.WIDGET_TYPES.length);
  });
  it("offers every type but 0x15 in the add list", () => {
    assert.deepEqual(W.WIDGET_TYPES.filter((d) => !d.addable).map((d) => d.type), [WIDGET_TYPE.INPUT_TEXT]);
    assert.equal(W.addableWidgetTypes().length, W.WIDGET_TYPES.length - 1);
    assert.equal(W.widgetTypeDef(WIDGET_TYPE.INPUT_TEXT).defaults(plT), null);
    assert.equal(W.widgetTypeDef(0x99), null);
  });
  it("gives the default data TSH 1.00.005 wrote for every addable type", () => {
    for (const def of W.addableWidgetTypes()) {
      assert.deepEqual(def.defaults(plT), firstWidget(DEFAULT_SAMPLES[def.type], def.type).data, def.key);
    }
  });
  it("has default data that encodes and a value at every field path", () => {
    for (const def of W.addableWidgetTypes()) {
      const data = def.defaults(plT);
      assert.equal(encodeWidgetData(def.type, data).ok, true, def.key);
      for (const f of def.fields) {
        assert.notEqual(W.getField(data, f.path), undefined, `${def.key}.${f.id}`);
      }
    }
  });
  it("lists the variants of the input and output state widgets", () => {
    assert.deepEqual(W.widgetVariants(0x02).map((d) => d.type), [0x02, 0x06]);
    assert.deepEqual(W.widgetVariants(0x15).map((d) => d.type), [0x02, 0x06, 0x15]);
    assert.deepEqual(W.widgetVariants(0x07).map((d) => d.type), [0x03, 0x07, 0x16]);
    assert.deepEqual(W.widgetVariants(0x00), []);
    assert.deepEqual(W.widgetVariants(0x99), []);
  });
  it("sets a field on a copy and reads it back", () => {
    const data = { icons: [1, 2], options: 0 };
    const next = W.setField(data, ["icons", 1], 9);
    assert.deepEqual(next, { icons: [1, 9], options: 0 });
    assert.deepEqual(data, { icons: [1, 2], options: 0 });
    assert.equal(W.getField(next, ["icons", 1]), 9);
    assert.equal(W.getField(next, ["missing", 0]), undefined);
  });
});

describe("templates", () => {
  it("builds the fresh TSH2 blob of sample 001", () => {
    const blob = Tpl.freshBlob("TSH2", { theme: "Motyw", screensaver: "Wygaszacz" });
    assert.deepEqual(encodeBlob(blob), { ok: true, bytes: sampleBytes("001") });
  });
  it("builds the fresh TSG2 blob of sample 083 with the directory sum TSH got wrong fixed", () => {
    const blob = Tpl.freshBlob("TSG2", { theme: "Motyw", screensaver: "Wygaszacz" });
    const r = encodeBlob(blob);
    assert.equal(r.ok, true);
    const expected = sampleBytes("083");
    const sum = expected.subarray(0x160, 0x160 + ((expected[9] << 8) | expected[10])).reduce((a, b) => a + b, 0);
    expected.set([sum >>> 24, (sum >>> 16) & 0xff, (sum >>> 8) & 0xff, sum & 0xff], 11);
    assert.deepEqual(r.bytes, expected);
    assert.deepEqual(decodeBlob(r.bytes).issues, []);
  });
  it("maps the keypad models to resolutions", () => {
    assert.deepEqual(["TSH2_TSH210", "TSG2", "KSG2", "UNRECOGNIZED", undefined, "constructor"].map(Tpl.resolutionOf),
      ["TSH2", "TSG2", null, null, null, null]);
  });
  it("builds new user and additional screens as samples 004 and 054", () => {
    const user = decodeBlob(sampleBytes("004")).blob.records[2];
    assert.deepEqual(Tpl.newScreen("user", 33, "Ekran 1", ["9d9d9d", "ffffff", "000000"]), user);
    const additional = decodeBlob(sampleBytes("054")).blob.records[18];
    assert.deepEqual(Tpl.newScreen("additional", 1, "Dodatkowy ekran 1", ["5a5a5f", "56a8de", "e6e6e6"]), additional);
  });
  it("places a new widget 8 pixels further while one of the same type is at its place", () => {
    const screen = { colors: ["000000", "111111", "222222"], widgets: [] };
    const first = Tpl.newWidget(0x00, screen, plT);
    screen.widgets.push(first, Tpl.newWidget(0x01, screen, plT));
    const second = Tpl.newWidget(0x00, screen, plT);
    assert.deepEqual([first.x, first.y, screen.widgets[1].x, second.x, second.y], [32, 32, 32, 40, 40]);
    assert.deepEqual(second.colors, screen.colors);
    assert.notEqual(second.colors, screen.colors);
  });
});
