// Tests of tshWidgetData.js (src/renderer/app/desktop/tshEditor/tshWidgetData.js).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { fromHex } = require("../../support/tshSamples.js");
const D = require(path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor/tshWidgetData.js"));
const F = require(path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor/tshFormat.js"));

const T = F.WIDGET_TYPE;
const ARM_HEX = "0000000000000000028e028f000000028e00b27f028bffbb00028affbb00028dff0000";
const POLISH = "Zażółć gęślą jaźń ŻÓŁĆ";
// [type, payload hex, decoded data]; the Polish length byte is computed from the text below.
const polishPayload = () => {
  const b = Buffer.from(POLISH, "utf8");
  return Buffer.concat([Buffer.from([b.length]), b]).toString("hex");
};
const CASES = [
  [T.TEXT, "124e6f776520706f6c652074656b73746f7765", { text: "Nowe pole tekstowe" }],
  [T.TEXT, polishPayload(), { text: POLISH }],
  [T.DATE_TIME, "1364642e4d4d2e797979792068683a6d6d3a7373", { format: "dd.MM.yyyy hh:mm:ss" }],
  [T.ROOM_STATE, "0000", { roomIndex: 0 }],
  [T.INPUT_INDICATOR, "0000", { devIndex: 0 }],
  [T.INPUT_ICON, "000001210123", { devIndex: 0, iconOff: 0x121, iconOn: 0x123 }],
  [T.CONTROL, "0000011d011e", { devIndex: 0, iconOff: 0x11d, iconOn: 0x11e }],
  [T.OUTPUT_TEXT, "00000a4e6965616b7479776e6507416b7479776e65",
    { devIndex: 0, textOff: "Nieaktywne", textOn: "Aktywne" }],
  [T.RECTANGLE, "00ff00200702", { width: 255, height: 32, transparency: 7, border: 2 }],
  [T.PANIC, "00", { alarmKind: 0 }],
  [T.LINK, "00faff", { lead: 0, icon: 0xfa, target: 0xff }],
  [T.VALUE, "000402000403685061", { devIndex: 4, decimals: 2, configIndex: 4, unit: "hPa" }],
  [T.VALUE, "00000000000125", { devIndex: 0, decimals: 0, configIndex: 0, unit: "%" }],
  [T.SCENE_START, "00000000000000000120011f000000",
    { lead: [0, 0, 0, 0, 0, 0, 0], sceneIndex: 0, icons: [0x120, 0x11f], options: 0, tail: [0, 0] }],
  [T.ARM, ARM_HEX, {
    lead: [0, 0, 0, 0, 0, 0, 0], alarmModeIndex: 0, icons: [0x28e, 0x28f], options: 0, tail: [0, 0],
    states: [{ icon: 0x28e, color: "00b27f" }, { icon: 0x28b, color: "ffbb00" },
      { icon: 0x28a, color: "ffbb00" }, { icon: 0x28d, color: "ff0000" }],
  }],
];
const codes = (r) => r.errors.map((e) => e.code);

describe("tshWidgetData", () => {
  it("decodes the default text widget", () => {
    assert.deepEqual(D.decodeWidgetData(T.TEXT, fromHex(CASES[0][1])), { text: "Nowe pole tekstowe" });
  });
  it("decodes a Polish text by bytes", () => {
    assert.deepEqual(D.decodeWidgetData(T.TEXT, fromHex(CASES[1][1])), { text: POLISH });
  });
  it("decodes the date format", () => {
    assert.deepEqual(D.decodeWidgetData(T.DATE_TIME, fromHex(CASES[2][1])), { format: "dd.MM.yyyy hh:mm:ss" });
  });
  it("decodes room and indicator indexes", () => {
    assert.deepEqual(D.decodeWidgetData(T.ROOM_STATE, fromHex("0000")), { roomIndex: 0 });
    assert.deepEqual(D.decodeWidgetData(T.INPUT_INDICATOR, fromHex("0000")), { devIndex: 0 });
    assert.deepEqual(D.decodeWidgetData(T.OUTPUT_INDICATOR, fromHex("0005")), { devIndex: 5 });
  });
  it("decodes icon widgets", () => {
    assert.deepEqual(D.decodeWidgetData(T.INPUT_ICON, fromHex("000001210123")),
      { devIndex: 0, iconOff: 0x121, iconOn: 0x123 });
    assert.deepEqual(D.decodeWidgetData(T.CONTROL, fromHex("0000011d011e")),
      { devIndex: 0, iconOff: 0x11d, iconOn: 0x11e });
    assert.deepEqual(D.decodeWidgetData(T.BUTTON, fromHex("0000011d011e")),
      { devIndex: 0, iconOff: 0x11d, iconOn: 0x11e });
  });
  it("decodes the output text widget", () => {
    assert.deepEqual(D.decodeWidgetData(T.OUTPUT_TEXT, fromHex(CASES[7][1])), CASES[7][2]);
  });
  it("decodes the rectangle", () => {
    assert.deepEqual(D.decodeWidgetData(T.RECTANGLE, fromHex("00ff00200702")), CASES[8][2]);
  });
  it("decodes panic and link", () => {
    assert.deepEqual(D.decodeWidgetData(T.PANIC, fromHex("00")), { alarmKind: 0 });
    assert.deepEqual(D.decodeWidgetData(T.LINK, fromHex("00faff")), { lead: 0, icon: 0xfa, target: 0xff });
  });
  it("decodes the device value", () => {
    assert.deepEqual(D.decodeWidgetData(T.VALUE, fromHex(CASES[11][1])), CASES[11][2]);
    assert.deepEqual(D.decodeWidgetData(T.VALUE, fromHex(CASES[12][1])), CASES[12][2]);
  });
  it("decodes the scene start widget", () => {
    assert.deepEqual(D.decodeWidgetData(T.SCENE_START, fromHex(CASES[13][1])), CASES[13][2]);
  });
  it("decodes the arming widget with four states", () => {
    assert.deepEqual(D.decodeWidgetData(T.ARM, fromHex(ARM_HEX)), CASES[14][2]);
  });
  it("re-encodes every decoded sample payload to the same bytes", () => {
    for (const [type, hex] of CASES) {
      const payload = fromHex(hex);
      const r = D.encodeWidgetData(type, D.decodeWidgetData(type, payload));
      assert.equal(r.ok, true, hex);
      assert.deepEqual(r.bytes, payload);
    }
  });
  it("lists the typed widget types", () => {
    const expected = Object.values(T).filter((t) => t !== T.INPUT_TEXT);
    assert.deepEqual([...D.TYPED_WIDGET_TYPES].sort((a, b) => a - b), expected.sort((a, b) => a - b));
  });
  it("leaves type 0x15 and unknown types undecoded", () => {
    assert.equal(D.decodeWidgetData(T.INPUT_TEXT, fromHex(CASES[7][1])), null);
    assert.equal(D.decodeWidgetData(0x99, fromHex("00")), null);
  });
  it("refuses payloads with trailing bytes or a short length", () => {
    assert.equal(D.decodeWidgetData(T.ROOM_STATE, fromHex("000000")), null);
    assert.equal(D.decodeWidgetData(T.RECTANGLE, fromHex("00ff002007")), null);
    assert.equal(D.decodeWidgetData(T.TEXT, fromHex("05414243")), null);
    assert.equal(D.decodeWidgetData(T.TEXT, fromHex("0141" + "42")), null);
  });
  it("refuses invalid UTF-8 in a text", () => {
    assert.equal(D.decodeWidgetData(T.TEXT, fromHex("01c5")), null);
  });
  it("reports field range errors", () => {
    assert.deepEqual(codes(D.encodeWidgetData(T.ROOM_STATE, { roomIndex: 65536 })), ["FIELD_RANGE"]);
    assert.equal(D.encodeWidgetData(T.ROOM_STATE, { roomIndex: 65535 }).ok, true);
    assert.deepEqual(codes(D.encodeWidgetData(T.PANIC, { alarmKind: 256 })), ["FIELD_RANGE"]);
    assert.deepEqual(codes(D.encodeWidgetData(T.PANIC, { alarmKind: 1.5 })), ["FIELD_RANGE"]);
    assert.deepEqual(codes(D.encodeWidgetData(T.PANIC, { alarmKind: -1 })), ["FIELD_RANGE"]);
    const arm = JSON.parse(JSON.stringify(CASES[14][2]));
    arm.states[2].color = "ff00";
    assert.deepEqual(codes(D.encodeWidgetData(T.ARM, arm)), ["FIELD_RANGE"]);
    const scene = JSON.parse(JSON.stringify(CASES[13][2]));
    scene.lead = [0, 0, 0, 0, 0, 0];
    assert.deepEqual(codes(D.encodeWidgetData(T.SCENE_START, scene)), ["FIELD_RANGE"]);
  });
  it("reports a text over 255 bytes", () => {
    assert.equal(D.encodeWidgetData(T.TEXT, { text: "a".repeat(255) }).ok, true);
    assert.deepEqual(codes(D.encodeWidgetData(T.TEXT, { text: "a".repeat(256) })), ["TEXT_TOO_LONG"]);
    assert.deepEqual(codes(D.encodeWidgetData(T.TEXT, { text: "ą".repeat(128) })), ["TEXT_TOO_LONG"]);
  });
  it("reports a type without a layout", () => {
    const r = D.encodeWidgetData(T.INPUT_TEXT, {});
    assert.deepEqual(codes(r), ["DATA_TYPE"]);
    assert.equal(typeof r.errors[0].detail, "string");
  });
  it("keeps a leading BOM of a text payload", () => {
    const enc = D.encodeWidgetData(T.TEXT, { text: "\uFEFFab" });
    assert.equal(Buffer.from(enc.bytes).toString("hex"), "05efbbbf6162");
    assert.deepEqual(D.decodeWidgetData(T.TEXT, enc.bytes), { text: "\uFEFFab" });
  });
  it("ignores inherited object keys as widget types and rejects sparse byte lists", () => {
    assert.equal(D.decodeWidgetData("constructor", new Uint8Array(0)), null);
    assert.equal(D.encodeWidgetData("constructor", {}).errors[0].code, "DATA_TYPE");
    const data = D.decodeWidgetData(T.SCENE_START, fromHex("00000000000000" + "01" + "00020003" + "00" + "0000"));
    assert.notEqual(data, null);
    data.lead = new Array(7);
    const r = D.encodeWidgetData(T.SCENE_START, data);
    assert.deepEqual([r.ok, r.errors.map((e) => e.code)], [false, ["FIELD_RANGE"]]);
  });
});
