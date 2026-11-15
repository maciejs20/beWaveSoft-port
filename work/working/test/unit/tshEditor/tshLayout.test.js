// Tests of the preview layout tshLayout.js (src/renderer/app/desktop/tshEditor/): sizes from TSH Soft's metric table
// checked against its previews (work/re-tsh/shots, scale 0.6), centering, grid, drag limits, nudging and backgrounds.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { plT } = require("../../support/tshEditorSupport.js");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const L = require(path.join(dir, "tshLayout.js"));
const W = require(path.join(dir, "tshWidgetTypes.js"));
const { WIDGET_TYPE: T } = require(path.join(dir, "tshFormat.js"));

const TSH2 = L.metricsFor(1024, 600);
const TSG2 = L.metricsFor(480, 272);
// Time of the TSH shots e5 and e12.
const NOW = new Date(2026, 10, 13, 13, 50, 41);
const OPTS = { now: NOW, lang: "pl" };
const widget = (type, data, extra = {}) => ({ kind: "widget", type, x: 300, y: 200, size: 0, center: false,
  useTheme: true, colors: ["5a5a5f", "56a8de", "e6e6e6"], data, ...extra });
const near = (actual, expected, tolerance, what) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${what}: ${actual} not within ${tolerance} of ${expected}`);

describe("preview metrics", () => {
  it("takes the text, icon and indicator sizes of each resolution from TSH's table, not from a ratio", () => {
    assert.deepEqual([TSH2.font, TSH2.icon, TSH2.indicator, TSH2.bar], [[18, 33, 54], [77, 115, 180], [20, 36, 52], 52]);
    assert.deepEqual([TSG2.font, TSG2.icon, TSG2.indicator, TSG2.bar], [[12, 15, 25], [36, 54, 84], [10, 16, 24], 26]);
  });
  it("measures Roboto Light texts like the TSH preview (ink widths of the shots in keypad pixels)", () => {
    near(L.textWidth("13.11.2026 13:50:41", 18), 160, 3, "date, shot e5");
    near(L.textWidth("000%", 18), 43, 2, "value, shot e12");
    near(L.textWidth("Nowe pole tekstowe", 54), 478, 6, "large text, shot s_s1 tryb");
    near(L.textWidth("Zażółć gęślą jaźń ŻÓŁĆ", 54), 558, 6, "large Polish text, shot now");
  });
  it("measures unknown characters as a digit", () => {
    assert.equal(L.textWidth("中", 2048), 1135);
  });
});

describe("widget layout", () => {
  it("draws icon widgets as WDGT glyph boxes at X/Y, growing with the size", () => {
    const l = L.widgetLayout(widget(T.CONTROL, { devIndex: 0, iconOff: 0x11d, iconOn: 0x11e }), TSH2, OPTS);
    assert.deepEqual([l.kind, l.left, l.top, l.width, l.height, l.glyph], ["icon", 300, 200, 77, 77, 0x11d]);
    const big = L.widgetLayout(widget(T.LINK, { lead: 0, icon: 0xfa, target: 0xff }, { size: 2 }), TSH2, OPTS);
    assert.deepEqual([big.width, big.height, big.glyph], [180, 181, 0xfa]);
    assert.equal(L.widgetLayout(widget(T.CONTROL, { devIndex: 0, iconOff: 1, iconOn: 2 }), TSG2, OPTS).width, 36);
  });
  it("picks the icon of each icon look: arm and scene first icon, panic by kind, info", () => {
    const glyph = (type, data) => L.widgetLayout(widget(type, data), TSH2, OPTS).glyph;
    assert.equal(glyph(T.ALARM_CLEAR, W.widgetTypeDef(T.ALARM_CLEAR).defaults(plT)), 0x28d);
    assert.equal(glyph(T.SCENE_START, W.widgetTypeDef(T.SCENE_START).defaults(plT)), 0x120);
    assert.equal(glyph(T.PANIC, { alarmKind: 1 }), 0x106);
    assert.equal(glyph(T.INFO, { text: "Informacja" }), 0x11b);
  });
  it("sizes text widgets by the text and the font of the size", () => {
    const l = L.widgetLayout(widget(T.TEXT, { text: "Nowe pole tekstowe" }, { size: 2 }), TSH2, OPTS);
    assert.equal(l.kind, "text");
    assert.equal(l.font, 54);
    assert.equal(l.height, 65);
    const v = L.widgetLayout(widget(T.VALUE, { devIndex: 0, decimals: 1, configIndex: 14, unit: "%" }), TSH2, OPTS);
    assert.equal(v.text, "00.0%");
    assert.equal(L.widgetLayout(widget(T.OUTPUT_TEXT, { devIndex: 0, textOff: "Nieaktywne", textOn: "Aktywne" }),
      TSH2, OPTS).text, "Nieaktywne");
  });
  it("puts a centered widget's middle on X (sample 049: date at X 380)", () => {
    const l = L.widgetLayout(widget(T.DATE_TIME, { format: W.DATE_FORMAT }, { x: 380, center: true }), TSH2, OPTS);
    assert.equal(l.text, "13.11.2026 13:50:41");
    assert.equal(l.left, 300);
    assert.equal(l.offsetX, -80);
  });
  it("draws the rectangle with its own size, border and opacity", () => {
    const l = L.widgetLayout(widget(T.RECTANGLE, { width: 255, height: 32, transparency: 7, border: 2 }), TSH2, OPTS);
    assert.deepEqual([l.kind, l.width, l.height, l.border], ["rect", 255, 32, 2]);
    near(l.opacity, 7 / 255, 1e-9, "opacity");
  });
  it("draws indicators as 20 px glyph boxes and unsupported widgets as boxes at their stored position", () => {
    assert.equal(L.widgetLayout(widget(T.ROOM_STATE, { roomIndex: 0 }), TSH2, OPTS).width, 20);
    const typeless = L.widgetLayout(widget(0x15, null), TSH2, OPTS);
    assert.deepEqual([typeless.kind, typeless.left, typeless.width], ["unknown", 300, 48]);
    const raw = L.widgetLayout({ kind: "raw", bytes: Uint8Array.from([0, 16, 1, 44, 0, 200, 0x99]) }, TSH2, OPTS);
    assert.deepEqual([raw.kind, raw.left, raw.top], ["unknown", 300, 200]);
  });
  it("lays out the defaults of every addable type with a size and, for icons, a glyph of the WDGT font", () => {
    for (const def of W.addableWidgetTypes()) {
      const l = L.widgetLayout(widget(def.type, def.defaults(plT)), TSH2, OPTS);
      assert.ok(l.width > 0 && l.height > 0, def.key);
      assert.equal(l.kind, def.look, def.key);
      if (l.kind === "icon") assert.ok(L.ICON_CODES.includes(l.glyph), `${def.key} glyph ${l.glyph}`);
    }
  });
});

describe("drawing like TSH (FUN_00a9f9d0 and its helpers)", () => {
  it("draws size 2 text in Roboto Thin, measured with the Thin table, and sizes 0-1 in Light", () => {
    const big = L.widgetLayout(widget(T.TEXT, { text: "Nowe pole tekstowe" }, { size: 2 }), TSH2, OPTS);
    assert.deepEqual([big.face, big.font, big.width], ["thin", 54, 471]);
    assert.equal(Math.round(L.textWidth("Nowe pole tekstowe", 54)), 479);
    const mid = L.widgetLayout(widget(T.TEXT, { text: "Nowe pole tekstowe" }, { size: 1 }), TSH2, OPTS);
    assert.deepEqual([mid.face, mid.font], ["light", 33]);
    assert.equal(L.textWidth("中", 2048, "thin"), 1121);
  });
  it("puts a left text box at X and draws the text one pixel right of it", () => {
    const l = L.widgetLayout(widget(T.TEXT, { text: "Brama" }), TSH2, OPTS);
    assert.deepEqual([l.left, l.offsetX, l.textX], [300, 0, 1]);
  });
  it("centers with x - (w >> 1) and right-aligns with x - w (bits 2-3 of byte 7)", () => {
    const value = { devIndex: 0, decimals: 0, configIndex: 0, unit: "%" };
    const c = L.widgetLayout(widget(T.VALUE, value, { center: true }), TSH2, OPTS);
    assert.deepEqual([c.width, c.left, c.offsetX], [43, 300 - 21, -21]);
    const r = L.widgetLayout(widget(T.VALUE, value, { flagsOther: 0x04 }), TSH2, OPTS);
    assert.deepEqual([r.left, r.offsetX], [300 - 43, -43]);
    const both = L.widgetLayout(widget(T.VALUE, value, { center: true, flagsOther: 0x04 }), TSH2, OPTS);
    assert.equal(both.left, 300);
  });
  it("aligns only the text types TSH aligns", () => {
    const icon = widget(T.CONTROL, { devIndex: 0, iconOff: 0x11d, iconOn: 0x11e }, { center: true });
    assert.equal(L.textAlign(icon), "left");
    assert.equal(L.widgetLayout(icon, TSH2, OPTS).left, 300);
    assert.equal(L.textAlign({ kind: "raw", bytes: new Uint8Array(0) }), "left");
    assert.equal(L.textAlign(widget(T.DATE_TIME, { format: "" }, { center: true })), "center");
  });
  it("composes the indicators of glyph layers", () => {
    const layers = (type) => L.widgetLayout(widget(type, { roomIndex: 0, devIndex: 0 }), TSH2, OPTS).layers;
    assert.deepEqual(layers(T.ROOM_STATE), [{ glyph: 0x1df, color: "#ffffff" }, { glyph: 0x1fc, color: "#00d9a5" },
      { glyph: 0x1e8, color: "#000000" }]);
    assert.deepEqual(layers(T.INPUT_INDICATOR), [{ glyph: 0x1df, color: "#ffffff" }, { glyph: 0x1e0, color: "#000000" }]);
    assert.deepEqual(layers(T.OUTPUT_INDICATOR), [{ glyph: 0x1df, color: "#ff4d4d" }, { glyph: 0x1e8, color: "#000000" }]);
    const big = L.widgetLayout(widget(T.ROOM_STATE, { roomIndex: 0 }, { size: 2 }), TSH2, OPTS);
    assert.deepEqual([big.font, big.width, big.height], [52, 52, 52]);
  });
  it("draws icon 0 and icons the keypad firmware lacks as 0x22", () => {
    const glyph = (iconOff) => L.widgetLayout(widget(T.CONTROL, { devIndex: 0, iconOff, iconOn: 0x11e }), TSH2, OPTS).glyph;
    assert.deepEqual([glyph(0), glyph(0xa8), glyph(0xa9), glyph(0x107), glyph(0x108), glyph(0x13e), glyph(0x28f),
      glyph(0x290), glyph(0x111d)], [0x22, 0x22, 0xa9, 0x107, 0x22, 0x22, 0x28f, 0x22, 0x11d]);
    assert.equal(L.widgetLayout(widget(T.LINK, { lead: 1, icon: 0x10, target: 0xff }), TSH2, OPTS).glyph, 0x110);
  });
});

describe("status bar, page dots and screensaver (FUN_00aa7fe4, FUN_00aa064c)", () => {
  const user = { kind: "screen", type: "user", main: false };
  it("draws the status icons on every TSH2 screen with a bar, main or not, and never on TSG2", () => {
    assert.deepEqual(L.statusIcons(user, TSH2), [0xa4, 0xa2, 0xa6, 0xa8].map((code, i) =>
      ({ code, left: 4 + 60 * i, top: 4, size: 40 })));
    assert.equal(L.statusIcons({ ...user, type: "additional" }, TSH2).length, 4);
    assert.deepEqual(L.statusIcons(user, TSG2), []);
    assert.deepEqual(L.statusIcons({ type: "screensaver" }, TSG2), []);
    assert.deepEqual(L.statusIcons({ type: "theme" }, TSH2), []);
  });
  it("centers the status icons on the TSH2 screensaver", () => {
    assert.deepEqual(L.statusIcons({ type: "screensaver" }, TSH2).map((g) => g.left), [396, 456, 516, 576]);
  });
  it("places the page dot glyphs one advance plus 2 px apart above the bottom bar height", () => {
    assert.deepEqual(L.pageDots(TSH2, 3, 1), [{ code: 0x1f7, left: 491, top: 541, size: 12 },
      { code: 0x1f6, left: 505, top: 541, size: 12 }, { code: 0x1f7, left: 519, top: 541, size: 12 }]);
    assert.deepEqual(L.pageDots(TSG2, 2, 0), [{ code: 0x1f6, left: 232, top: 242, size: 6 },
      { code: 0x1f7, left: 240, top: 242, size: 6 }]);
  });
  it("lays out the TSH2 screensaver clock around a half-size Light colon (shot saver.png 13:55:58)", () => {
    assert.deepEqual(L.saverClock(TSH2, new Date(2026, 10, 13, 13, 55, 58)), {
      hours: { text: "13", left: 218, top: 102, font: 256, face: "thin" },
      colon: { text: ":", left: 498, top: 171, font: 128, face: "light" },
      minutes: { text: "55", left: 525, top: 102, font: 256, face: "thin" },
      seconds: { text: "58", left: 850, top: 270, font: 77, face: "light" }
    });
  });
  it("lays out the TSG2 screensaver clock with its own 120/36 px fonts", () => {
    assert.deepEqual(L.saverClock(TSG2, new Date(2026, 10, 14, 22, 5, 6)), {
      hours: { text: "22", left: 102, top: 46, font: 120, face: "thin" },
      colon: { text: ":", left: 233, top: 74, font: 60, face: "light" },
      minutes: { text: "05", left: 246, top: 46, font: 120, face: "thin" },
      seconds: { text: "06", left: 398, top: 122, font: 36, face: "light" }
    });
  });
});

describe("value and date texts", () => {
  it("shows three digits with the decimals", () => {
    assert.deepEqual([0, 1, 2, 3].map(L.valueSample), ["000", "00.0", "0.00", "0.000"]);
  });
  it("formats dates like TSH Soft (tshDateFormat.js) in the input language", () => {
    assert.equal(L.formatDate("dd.MM.yyyy hh:mm:ss", NOW, "pl"), "13.11.2026 13:50:41");
    assert.equal(L.formatDate("yy-MM-dd HH:mm", NOW, "pl"), "26-11-13 13:50");
    assert.equal(L.formatDate("dddd, d MMMM yyyy", NOW, "en"), "Friday, 13 November 2026");
  });
  it("gives the Date/time widget the language of the options", () => {
    const date = widget(T.DATE_TIME, { format: "dddd" });
    assert.equal(L.widgetLayout(date, TSH2, { now: NOW, lang: "pl" }).text, "piątek");
    assert.equal(L.widgetLayout(date, TSH2, { now: NOW, lang: "en" }).text, "Friday");
  });
});

describe("center flag", () => {
  const date = widget(T.DATE_TIME, { format: W.DATE_FORMAT });
  it("moves X by half the width as TSH does (sample 049: 300 -> 380) and back", () => {
    assert.equal(L.centerShift(date, TSH2, OPTS, true), 380);
    assert.equal(L.centerShift({ ...date, x: 380, center: true }, TSH2, OPTS, false), 300);
  });
  it("keeps X on the screen", () => {
    assert.equal(L.centerShift({ ...date, x: 10, center: true }, TSH2, OPTS, false), 0);
  });
});

describe("grid", () => {
  it("has 5x2 cells of integer size with 20 px margins and gaps below the status bar (FUN_00aa0288)", () => {
    const cells = L.gridCells(TSH2);
    assert.equal(cells.length, 10);
    assert.deepEqual(cells[0], { left: 20, top: 72, width: 180, height: 244 });
    assert.deepEqual(cells[9], { left: 820, top: 336, width: 180, height: 244 });
    assert.deepEqual(L.gridCells(TSG2)[9], { left: 388, top: 159, width: 72, height: 93 });
  });
  it("draws broken lines in the middle of the gaps where TSH draws them (FUN_00aa0288, shot now.png)", () => {
    const lines = L.gridLines(TSH2);
    assert.equal(lines.length, 13);
    const xs = [...new Set(lines.filter((l) => l.x1 === l.x2).map((l) => l.x1))];
    assert.deepEqual(xs, [210, 410, 610, 810]);
    const ys = [...new Set(lines.filter((l) => l.y1 === l.y2).map((l) => l.y1))];
    assert.deepEqual(ys, [326]);
    assert.deepEqual([...new Set(L.gridLines(TSG2).filter((l) => l.y1 === l.y2).map((l) => l.y1))], [149]);
  });
});

describe("snap targets and nudging", () => {
  it("snaps to the grid cell edges, the screen edges and the screen centre lines", () => {
    const t = L.snapTargets(TSG2);
    assert.deepEqual(t.xs, [0, 240, 480, 20, 92, 112, 184, 204, 276, 296, 368, 388, 460, 20, 92, 112, 184, 204, 276, 296,
      368, 388, 460]);
    assert.deepEqual(t.ys, [0, 136, 272, 46, 139, 46, 139, 46, 139, 46, 139, 46, 139, 159, 252, 159, 252, 159, 252, 159,
      252, 159, 252]);
  });
  it("nudges by 1 px with the arrows and 8 px with Shift", () => {
    assert.deepEqual(L.nudgeDelta("ArrowLeft", false), { dx: -1, dy: 0 });
    assert.deepEqual(L.nudgeDelta("ArrowDown", true), { dx: 0, dy: 8 });
    assert.equal(L.nudgeDelta("a", false), null);
  });
});

describe("backgrounds", () => {
  const themes = [
    { name: "Abstract", backgroundFile: "bg/BG_ABSTRACT.jpg" },
    { name: "Ambient", backgroundFile: "bg/BG_AMBIENT.jpg" },
    { name: "black", backgroundFile: null }
  ];
  const theme = (id, image, colors = ["ffffff", "e6645a", "583044"]) =>
    ({ kind: "screen", type: "theme", id, image, colors, useTheme: true });
  const screen = (props) => ({ kind: "screen", type: "user", useTheme: true, image: "",
    colors: ["5a5a5f", "56a8de", "e6e6e6"], ...props });
  it("finds the theme by its picture name, else by its id; id 0 of a fresh blob is Abstract", () => {
    assert.equal(L.themeOf(theme(254, "int://Ambient.jpg"), themes).name, "Ambient");
    assert.equal(L.themeOf(theme(253, ""), themes).name, "black");
    assert.equal(L.themeOf(theme(0, "int://Abstract.jpg"), themes).name, "Abstract");
    assert.equal(L.themeOf(theme(0, ""), themes).name, "Abstract");
    assert.equal(L.themeOf(theme(200, ""), themes), null);
  });
  // Background without a card picture: url null, missing false.
  const plain = (color, file) => ({ color, file, url: null, missing: false });
  it("uses the theme picture and cl3 for a screen that uses the theme, its own cl3 otherwise", () => {
    const rec = theme(254, "int://Ambient.jpg");
    assert.deepEqual(L.screenBackground(screen({}), rec, themes), plain("#583044", "bg/BG_AMBIENT.jpg"));
    assert.deepEqual(L.screenBackground(screen({ useTheme: false }), rec, themes), plain("#e6e6e6", null));
    assert.deepEqual(L.screenBackground(screen({ useTheme: false, image: "int://Abstract.jpg" }), rec, themes),
      plain("#e6e6e6", "bg/BG_ABSTRACT.jpg"));
    assert.deepEqual(L.screenBackground(screen({}), theme(253, ""), themes), plain("#583044", null));
  });
  it("draws the flat theme color while the theme list is not loaded", () => {
    assert.deepEqual(L.screenBackground(screen({}), theme(254, "int://Ambient.jpg"), []), plain("#583044", null));
  });
  it("shows a card picture cut out in this session, else marks it missing over the screen cl3", () => {
    const rec = theme(254, "int://Ambient.jpg");
    const own = screen({ useTheme: false, image: "map2.jpg" });
    assert.deepEqual(L.screenBackground(own, rec, themes, { "map2.jpg": "blob:x" }),
      { color: "#e6e6e6", file: null, url: "blob:x", missing: false });
    assert.deepEqual(L.screenBackground(own, rec, themes, {}),
      { color: "#e6e6e6", file: null, url: null, missing: true });
    assert.deepEqual(L.screenBackground({ ...own, useTheme: true }, rec, themes, { "map2.jpg": "blob:x" }),
      plain("#583044", "bg/BG_AMBIENT.jpg"));
  });
  it("draws a screen that uses the theme in the theme colors, also a fresh screensaver with black colors", () => {
    const rec = theme(254, "int://Ambient.jpg");
    const saver = screen({ type: "screensaver", colors: ["000000", "000000", "000000"] });
    assert.deepEqual(L.screenColors(saver, rec), ["ffffff", "e6645a", "583044"]);
    assert.deepEqual(L.screenColors(screen({ useTheme: false }), rec), ["5a5a5f", "56a8de", "e6e6e6"]);
  });
});
