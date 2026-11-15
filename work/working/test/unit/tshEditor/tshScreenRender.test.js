// Tests of the draw list of the static screen renderer (tshLayout.screenDrawList, drawn by TshScreenRender.js): the
// order and contents of the items per screen type, with layouts and colors equal to the layout functions'.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { plT } = require("../../support/tshEditorSupport.js");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const L = require(path.join(dir, "tshLayout.js"));
const M = require(path.join(dir, "tshEditorModel.js"));
const { WIDGET_TYPE: T } = require(path.join(dir, "tshFormat.js"));

const NOW = new Date(2026, 10, 14, 22, 5, 6);
const THEMES = [{ name: "Abstract", backgroundFile: "bg/abstract.jpg" }];
const TSH2 = L.metricsFor(1024, 600);
const TSG2 = L.metricsFor(480, 272);

// Fresh TSH2 editor state with two user screens; the first one has the grid on, a text and an own-colored button.
// Returns { state, user, second }.
function setup() {
  let s = M.loadEditor({ keypad: { model: "TSH2_TSH210" }, lang: "pl" }, plT).state;
  s = M.addScreen(s, "user", plT).state;
  s = M.addScreen(s, "user", plT).state;
  const users = s.blob.records.filter((r) => r.type === "user");
  s = M.updateScreen(s, users[0].uid, { grid: true }).state;
  s = M.addWidget(s, users[0].uid, T.TEXT, plT).state;
  s = M.addWidget(s, users[0].uid, T.BUTTON, plT).state;
  s = M.updateWidget(s, users[0].uid, 1, { useTheme: false }).state;
  s = M.updateWidget(s, users[0].uid, 1, { colors: ["ff0000", "00ff00", "0000ff"] }).state;
  const [user, second] = s.blob.records.filter((r) => r.type === "user");
  return { state: s, user, second };
}

describe("screen draw list", () => {
  it("draws a user screen as background, keypad grid, status bar, dots, widgets", () => {
    const { state, user } = setup();
    const items = L.screenDrawList(state, user, { now: NOW, themes: THEMES });
    assert.deepEqual(items.map((i) => i.kind), ["background", "grid", "statusBar", "dots", "widget", "widget"]);
    const theme = state.blob.records[0];
    const color = "#" + theme.colors[0];
    assert.deepEqual(items[0], { kind: "background", ...L.screenBackground(user, theme, THEMES, undefined) });
    assert.deepEqual(items[1], { kind: "grid", color, lines: L.gridLines(TSH2) });
    assert.deepEqual(items[2], { kind: "statusBar", color, name: user.name, clock: "22:05:06",
      icons: L.statusIcons(user, TSH2) });
    assert.deepEqual(items[3], { kind: "dots", items: L.pageDots(TSH2, 2, 0) });
    const opts = { now: NOW, lang: "pl" };
    assert.deepEqual(items[4], { kind: "widget", index: 0, layout: L.widgetLayout(user.widgets[0], TSH2, opts),
      colors: theme.colors });
    assert.deepEqual(items[5], { kind: "widget", index: 1, layout: L.widgetLayout(user.widgets[1], TSH2, opts),
      colors: ["ff0000", "00ff00", "0000ff"] });
  });
  it("leaves the grid out when the screen's flag is off and marks the shown dot", () => {
    const { state, second } = setup();
    const items = L.screenDrawList(state, second, { now: NOW, themes: THEMES });
    assert.deepEqual(items.map((i) => i.kind), ["background", "statusBar", "dots"]);
    assert.deepEqual(items[2].items, L.pageDots(TSH2, 2, 1));
  });
  it("marks the shown dot for a copy of the screen, as drawn during a drag (review M3)", () => {
    const { state, second } = setup();
    const copy = { ...second, widgets: second.widgets.slice() };
    const items = L.screenDrawList(state, copy, { now: NOW, themes: THEMES });
    assert.deepEqual(items[2].items, L.pageDots(TSH2, 2, 1));
  });
  it("draws an additional screen with a status bar but without dots", () => {
    let { state } = setup();
    state = M.addScreen(state, "additional", plT).state;
    const extra = state.blob.records.find((r) => r.type === "additional");
    assert.deepEqual(L.screenDrawList(state, extra, { now: NOW }).map((i) => i.kind), ["background", "statusBar"]);
  });
  it("draws the screensaver without a bar, with its clock and widgets", () => {
    let s = M.loadEditor({ keypad: { model: "TSG2" }, lang: "en" }, plT).state;
    const saver = s.blob.records[1];
    s = M.addWidget(s, saver.uid, T.DATE_TIME, plT).state;
    const shown = s.blob.records[1];
    const items = L.screenDrawList(s, shown, { now: NOW });
    assert.deepEqual(items.map((i) => i.kind), ["background", "saver", "widget"]);
    assert.deepEqual(items[1], { kind: "saver", color: "#" + s.blob.records[0].colors[0], icons: [],
      clock: L.saverClock(TSG2, NOW) });
    assert.deepEqual(items[2].layout, L.widgetLayout(shown.widgets[0], TSG2, { now: NOW, lang: "en" }));
    assert.deepEqual(L.screenDrawList(s, shown, { now: NOW, lang: "pl" })[2].layout,
      L.widgetLayout(shown.widgets[0], TSG2, { now: NOW, lang: "pl" }));
  });
  it("hides the screensaver clock when its option says so", () => {
    let s = M.loadEditor({ keypad: { model: "TSG2" } }, plT).state;
    s = M.setSaverOption(s, M.SAVER_OPTION.NO_CLOCK, true).state;
    assert.equal(L.screenDrawList(s, s.blob.records[1], { now: NOW })[1].clock, null);
  });
  it("draws the theme record as its background only", () => {
    const s = M.loadEditor({ keypad: { model: "TSH2_TSH210" } }, plT).state;
    const theme = s.blob.records[0];
    assert.deepEqual(L.screenDrawList(s, theme, { now: NOW, themes: THEMES }),
      [{ kind: "background", color: "#" + theme.colors[2], file: "bg/abstract.jpg", url: null, missing: false }]);
  });
});
