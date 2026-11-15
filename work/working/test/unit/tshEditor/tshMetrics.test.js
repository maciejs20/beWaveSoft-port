// Tests of the TSH preview metric tables tshMetrics.js (TSH Soft FUN_00ab0cd4 and FUN_00aa7fe4, PROJEKT-TSH.md 2.6)
// and of the GDI box sizes in tshLayout.js that use them, with the user's INT-TSG2 case (plan 2026-11-14, RC1/RC3).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const Mx = require(path.join(dir, "tshMetrics.js"));
const L = require(path.join(dir, "tshLayout.js"));
const P = require(path.join(dir, "tshPointer.js"));
const { WIDGET_TYPE: T } = require(path.join(dir, "tshFormat.js"));

const OPTS = { now: new Date(2026, 10, 14, 22, 25, 26), lang: "pl" };
const widget = (type, data, extra = {}) => ({ kind: "widget", type, x: 300, y: 200, size: 0, center: false,
  useTheme: true, colors: ["5a5a5f", "56a8de", "e6e6e6"], data, ...extra });

describe("metric tables", () => {
  it("gives INT-TSH2 the table of FUN_00ab0cd4 and the status bar constants", () => {
    assert.deepEqual(Mx.metricsFor(1024, 600), {
      width: 1024, height: 600, font: [18, 33, 54], icon: [77, 115, 180], indicator: [20, 36, 52], bar: 52,
      barFont: 26, barTop: 10, barUser: 30, barUserY: 7, barIcon: 40, barIconLeft: 4, barIconPitch: 60, barIconY: 4,
      statusIcons: true, dotFont: 12, dotGap: 2, gridMargin: 20, gridColumns: 5, gridRows: 2, clockFont: 256,
      clockDrop: 8, clockSecondsFont: 77, clockSecondsX: 0.83, clockSecondsY: 0.45, unknownBox: 48
    });
  });
  it("gives INT-TSG2 its own table, not half of TSH2", () => {
    assert.deepEqual(Mx.metricsFor(480, 272), {
      width: 480, height: 272, font: [12, 15, 25], icon: [36, 54, 84], indicator: [10, 16, 24], bar: 26,
      barFont: 13, barTop: 7, barUser: 15, barUserY: 7, barIcon: 20, barIconLeft: 4, barIconPitch: 30, barIconY: 4,
      statusIcons: false, dotFont: 6, dotGap: 2, gridMargin: 20, gridColumns: 5, gridRows: 2, clockFont: 120,
      clockDrop: 8, clockSecondsFont: 36, clockSecondsX: 0.83, clockSecondsY: 0.45, unknownBox: 24
    });
  });
  it("picks the table like TSH: TSG2 up to 800 px width, TSH2 above", () => {
    assert.equal(Mx.metricsFor(799, 480).bar, 26);
    assert.equal(Mx.metricsFor(800, 480).bar, 26);
    assert.equal(Mx.metricsFor(801, 480).bar, 52);
    assert.deepEqual([Mx.metricsFor(801, 480).width, Mx.metricsFor(801, 480).height], [801, 480]);
  });
  it("is the metricsFor of the layout", () => {
    assert.equal(L.metricsFor, Mx.metricsFor);
  });
});

describe("GDI box sizes", () => {
  it("measures text height as rounded Roboto win ascent plus descent", () => {
    assert.deepEqual([12, 15, 18, 25, 33, 54].map(L.textHeight), [14, 18, 22, 30, 39, 65]);
  });
  it("measures WDGT glyph boxes as TextWidth(\"1\") x TextHeight(\"1\")", () => {
    assert.deepEqual(L.glyphBox(84), { width: 84, height: 84 });
    assert.deepEqual(L.glyphBox(180), { width: 180, height: 181 });
    assert.deepEqual(L.glyphBox(10), { width: 10, height: 10 });
  });
});

describe("the user's INT-TSG2 layout", () => {
  const TSG2 = Mx.metricsFor(480, 272);
  it("draws the large button as an 84 px glyph box, not 114", () => {
    const l = L.widgetLayout(widget(T.BUTTON, { devIndex: 0, iconOff: 0x11d, iconOn: 0x11e }, { x: 84, y: 211, size: 2 }),
      TSG2, OPTS);
    assert.deepEqual([l.left, l.top, l.width, l.height], [84, 211, 84, 84]);
    // The box still runs 23 px below the screen; dragging it by 0 px keeps the anchor (RC3: the old whole-box clamp
    // gave 84,188), since only the anchor is clamped to the screen.
    assert.deepEqual(P.dragAnchor({ x: 36, y: 39 }, { x: 120, y: 250 }, l, TSG2, { snap: false, zoom: 1 }),
      { x: 84, y: 211, guides: [] });
  });
  it("sizes the small text like tsg_scr.png (\"Nowe pole tekstowe\" ink 104 px)", () => {
    const l = L.widgetLayout(widget(T.TEXT, { text: "Nowe pole tekstowe" }, { x: 100, y: 100 }), TSG2, OPTS);
    assert.ok(Math.abs(l.width - 104) <= 2, `width ${l.width}`);
    assert.deepEqual([l.font, l.height], [12, 14]);
  });
});
