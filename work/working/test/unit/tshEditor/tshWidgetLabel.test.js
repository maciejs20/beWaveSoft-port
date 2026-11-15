// Tests of the list labels tshWidgetLabel.js (src/renderer/app/desktop/tshEditor/): glyph and title of every addable
// widget type with the input's names, blank and long texts, missing devices and targets, unsupported widgets, and
// screen titles with the fallback for names without a visible character (RC9).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { plT } = require("../../support/tshEditorSupport.js");
const app = path.join(__dirname, "../../../src/renderer/app");
const dir = path.join(app, "desktop/tshEditor");
const L = require(path.join(dir, "tshWidgetLabel.js"));
const M = require(path.join(dir, "tshEditorModel.js"));
const W = require(path.join(dir, "tshWidgetTypes.js"));
const { WIDGET_TYPE: T } = require(path.join(dir, "tshFormat.js"));
const pl = require(path.join(app, "i18n/pl.js")).tsh_editor;

// i18next-like t over the Polish tsh_editor texts. Returns the text.
const t = (key, params) => {
  const text = key.replace(/^tsh_editor\./, "").split(".").reduce((v, k) => (v === undefined ? undefined : v[k]), pl);
  assert.equal(typeof text, "string", `missing text ${key}`);
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => String(params?.[name]));
};
// Input names as a hub read gives them (devices, rooms, scenes, alarm modes).
const INPUT = {
  keypad: { model: "TSG2" },
  lang: "pl",
  devices: [
    { dev_index: 0, name: "Brama Wjazdowa", has_input: 0, has_on_off: 1, dev_values: [{ name: "Jasność", config_index: 14, unit: "%" }] },
    { dev_index: 1, name: "   ", has_input: 1, has_on_off: 0, dev_values: [] }
  ],
  rooms: [{ name: "Salon", room_index: 1 }],
  scenes: [{ name: "Wyjście", scene_index: 1 }],
  alarm_modes: [{ name: "Noc", alarm_mode_index: 2 }]
};
// State with a user screen holding one widget of every addable type (table order) and an additional screen named
// with spaces only. Returns { state, uid, widgets }.
function setup() {
  let s = M.loadEditor(INPUT, plT).state;
  s = M.addScreen(s, "user", plT).state;
  s = M.addScreen(s, "additional", plT).state;
  const uid = s.blob.records[2].uid;
  s = M.renameScreen(s, s.blob.records[3].uid, "    ").state;
  for (const def of W.addableWidgetTypes()) {
    s = M.addWidget(s, uid, def.type, plT).state;
  }
  return { state: s, uid, widgets: s.blob.records[2].widgets };
}
const label = (w, state) => L.widgetLabel(w, state, t);
// Widget of a type with data changed by patch. Returns the widget.
const withData = (widgets, type, patch) => {
  const w = structuredClone(widgets.find((x) => x.type === type));
  w.data = Object.assign(w.data, patch);
  return w;
};

describe("widgetLabel", () => {
  it("labels every addable type with its default data", () => {
    const { state, widgets } = setup();
    const got = widgets.map((w) => [w.type, label(w, state)]);
    const type = (key) => pl.widget[key];
    const expected = [
      [T.TEXT, { glyph: null, glyphKind: "text", title: "„Nowe pole tekstowe”", subtitle: type("text"), named: true }],
      [T.ROOM_STATE, { glyph: null, glyphKind: "dot", title: type("room_state"), subtitle: type("room_state"), named: false }],
      [T.INPUT_INDICATOR, { glyph: null, glyphKind: "dot", title: "Brama Wjazdowa", subtitle: type("input_indicator"), named: true }],
      [T.INPUT_ICON, { glyph: 0x121, glyphKind: "icon", title: "Brama Wjazdowa", subtitle: type("input_icon"), named: true }],
      [T.OUTPUT_INDICATOR, { glyph: null, glyphKind: "dot", title: "Brama Wjazdowa", subtitle: type("output_indicator"), named: true }],
      [T.OUTPUT_ICON, { glyph: 0x124, glyphKind: "icon", title: "Brama Wjazdowa", subtitle: type("output_icon"), named: true }],
      [T.OUTPUT_TEXT, { glyph: null, glyphKind: "text", title: "Brama Wjazdowa", subtitle: type("output_text"), named: true }],
      [T.DATE_TIME, { glyph: null, glyphKind: "text", title: "dd.MM.yyyy hh:mm:ss", subtitle: type("date_time"), named: true }],
      [T.CONTROL, { glyph: 0x11d, glyphKind: "icon", title: "Brama Wjazdowa", subtitle: type("control"), named: true }],
      [T.BUTTON, { glyph: 0x11d, glyphKind: "icon", title: "Brama Wjazdowa", subtitle: type("button"), named: true }],
      [T.RECTANGLE, { glyph: null, glyphKind: "rect", title: "Prostokąt 255×32", subtitle: type("rectangle"), named: true }],
      [T.PANIC, { glyph: 0x105, glyphKind: "icon", title: "Napad", subtitle: type("panic"), named: true }],
      [T.INFO, { glyph: 0x11b, glyphKind: "icon", title: "„Informacja”", subtitle: type("info"), named: true }],
      [T.LINK, { glyph: 0xfa, glyphKind: "icon", title: "Powrót", subtitle: type("link"), named: true }],
      [T.VALUE, { glyph: null, glyphKind: "text", title: "Brama Wjazdowa", subtitle: type("value"), named: true }],
      [T.SCENE_START, { glyph: 0x120, glyphKind: "icon", title: type("scene_start"), subtitle: type("scene_start"), named: false }],
      [T.SCENE_STOP, { glyph: 0x249, glyphKind: "icon", title: type("scene_stop"), subtitle: type("scene_stop"), named: false }],
      [T.ARM, { glyph: 0x28e, glyphKind: "icon", title: type("arm"), subtitle: type("arm"), named: false }],
      [T.DISARM, { glyph: 0x28c, glyphKind: "icon", title: type("disarm"), subtitle: type("disarm"), named: false }],
      [T.ARM_TOGGLE, { glyph: 0x28f, glyphKind: "icon", title: type("arm_toggle"), subtitle: type("arm_toggle"), named: false }],
      [T.ALARM_CLEAR, { glyph: 0x28d, glyphKind: "icon", title: type("alarm_clear"), subtitle: type("alarm_clear"), named: false }]
    ];
    assert.equal(got.length, 21);
    assert.deepEqual(got, expected);
  });
  it("names rooms, scenes, alarm modes, device values and fire/medical panics from the input", () => {
    const { state, widgets } = setup();
    const title = (type, patch) => label(withData(widgets, type, patch), state).title;
    assert.equal(title(T.ROOM_STATE, { roomIndex: 1 }), "Salon");
    assert.equal(title(T.SCENE_START, { sceneIndex: 1 }), "Wyjście");
    assert.equal(title(T.SCENE_STOP, { sceneIndex: 1 }), "Wyjście");
    assert.equal(title(T.ARM, { alarmModeIndex: 2 }), "Noc");
    assert.equal(title(T.ALARM_CLEAR, { alarmModeIndex: 2 }), "Noc");
    assert.equal(title(T.VALUE, { configIndex: 14 }), "Brama Wjazdowa · Jasność");
    assert.equal(title(T.PANIC, { alarmKind: 1 }), "Pożar");
    assert.equal(title(T.PANIC, { alarmKind: 2 }), "Medyczny");
    assert.equal(title(T.PANIC, { alarmKind: 7 }), pl.widget.panic);
  });
  it("falls back to the type name for missing or blank devices, texts and formats", () => {
    const { state, widgets } = setup();
    const lab = (type, patch) => label(withData(widgets, type, patch), state);
    assert.deepEqual([lab(T.BUTTON, { devIndex: 99 }).title, lab(T.BUTTON, { devIndex: 99 }).named], [pl.widget.button, false]);
    assert.equal(lab(T.CONTROL, { devIndex: 1 }).title, pl.widget.control);
    assert.equal(lab(T.VALUE, { devIndex: 99, configIndex: 14 }).title, pl.widget.value);
    assert.equal(lab(T.TEXT, { text: "    " }).title, pl.widget.text);
    assert.equal(lab(T.TEXT, { text: "​﻿\t" }).title, pl.widget.text);
    assert.equal(lab(T.INFO, { text: "" }).title, pl.widget.info);
    assert.equal(lab(T.DATE_TIME, { format: " " }).title, pl.widget.date_time);
    const bare = M.loadEditor({ keypad: { model: "TSG2" } }, plT).state;
    assert.equal(label(widgets.find((w) => w.type === T.BUTTON), bare).title, pl.widget.button);
  });
  it("cuts texts longer than 32 characters and keeps 32", () => {
    const { state, widgets } = setup();
    const title = (text) => label(withData(widgets, T.TEXT, { text }), state).title;
    assert.equal(title(" Brama "), "„Brama”");
    assert.equal(title("a".repeat(32)), `„${"a".repeat(32)}”`);
    assert.equal(title("a".repeat(33)), `„${"a".repeat(31)}…”`);
    assert.equal(title("ż".repeat(40)), `„${"ż".repeat(31)}…”`);
  });
  it("names the additional screen a link points to, and a missing one by type", () => {
    const { state, widgets } = setup();
    const target = state.blob.records[3].id;
    assert.equal(label(withData(widgets, T.LINK, { target }), state).title, "Ekran dodatkowy 1 (bez nazwy)");
    const named = M.renameScreen(state, state.blob.records[3].uid, "Garaż").state;
    assert.equal(label(withData(widgets, T.LINK, { target }), named).title, "Garaż");
    assert.equal(label(withData(widgets, T.LINK, { target: 0x20 }), state).title, pl.widget.link);
  });
  it("draws unknown icon codes with the glyph TSH draws for them", () => {
    const { state, widgets } = setup();
    assert.equal(label(withData(widgets, T.CONTROL, { iconOff: 0 }), state).glyph, 0x22);
    assert.equal(label(withData(widgets, T.CONTROL, { iconOff: 0x75 }), state).glyph, 0x22);
  });
  it("labels unsupported widgets", () => {
    const { state } = setup();
    const expected = { glyph: null, glyphKind: "rect", title: "Nieobsługiwany", subtitle: "", named: false };
    assert.deepEqual(label({ kind: "raw", bytes: Uint8Array.from([0, 1]) }, state), expected);
    assert.deepEqual(label({ kind: "widget", type: T.INPUT_TEXT, data: null }, state), expected);
    assert.deepEqual(label({ kind: "widget", type: 0x7e, data: {} }, state), expected);
  });
});

describe("screenTitle", () => {
  const entry = (type, name, extra) => Object.assign({ type, name, raw: false, id: 33 }, extra);
  it("keeps visible names as they are", () => {
    assert.equal(L.screenTitle(entry("user", "Ekran 1"), 0, t), "Ekran 1");
    assert.equal(L.screenTitle(entry("user", " Brama "), 0, t), " Brama ");
  });
  it("numbers user and additional screens without a visible name within their type (RC9)", () => {
    assert.equal(L.screenTitle(entry("user", "    "), 0, t), "Ekran 1 (bez nazwy)");
    assert.equal(L.screenTitle(entry("user", ""), 4, t), "Ekran 5 (bez nazwy)");
    assert.equal(L.screenTitle(entry("additional", "​\u0001"), 1, t), "Ekran dodatkowy 2 (bez nazwy)");
  });
  it("gives the theme and the screensaver their type names", () => {
    assert.equal(L.screenTitle(entry("theme", "  "), 0, t), "Motyw");
    assert.equal(L.screenTitle(entry("screensaver", null), 0, t), "Wygaszacz");
  });
  it("names unsupported records by their id", () => {
    assert.equal(L.screenTitle({ type: null, name: null, raw: true, id: 7 }, 3, t), "Nieobsługiwany ekran 7");
  });
});

describe("hasVisibleText", () => {
  it("tells visible text from blanks and non-strings", () => {
    assert.deepEqual(["a", " a ", "", "   ", "​", "﻿\n", null, undefined, 5].map(L.hasVisibleText),
      [true, true, false, false, false, false, false, false, false]);
  });
});
