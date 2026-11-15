// Tests of the canvas zoom tshZoom.js (src/renderer/app/desktop/tshEditor/): Fit for INT-TSH2 and INT-TSG2 in a large
// and a small pane, stepping from Fit and at the ends, and zooming around the pointer.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const Z = require(path.join(dir, "tshZoom.js"));
const TSH2 = { width: 1024, height: 600 };
const TSG2 = { width: 480, height: 272 };

describe("fitZoom", () => {
  it("fits INT-TSH2 and INT-TSG2 in a 1100x700 pane with 24 px padding", () => {
    assert.equal(Z.fitZoom({ width: 1100, height: 700 }, TSH2, 24), 1052 / 1024);
    assert.equal(Z.fitZoom({ width: 1100, height: 700 }, TSG2, 24), 1052 / 480);
  });
  it("fits by height when the pane is wide", () => {
    assert.equal(Z.fitZoom({ width: 2000, height: 700 }, TSH2, 24), 652 / 600);
  });
  it("fits INT-TSH2 and INT-TSG2 in a 400x300 pane", () => {
    assert.equal(Z.fitZoom({ width: 400, height: 300 }, TSH2, 24), 352 / 1024);
    assert.equal(Z.fitZoom({ width: 400, height: 300 }, TSG2, 24), 352 / 480);
  });
  it("stays between the smallest zoom and the largest level", () => {
    assert.equal(Z.fitZoom({ width: 40, height: 30 }, TSH2, 24), Z.MIN_ZOOM);
    assert.equal(Z.fitZoom({ width: 4000, height: 3000 }, TSG2, 24), 4);
  });
});

describe("stepZoom", () => {
  it("lists the toolbar levels", () => {
    assert.deepEqual(Z.ZOOM_LEVELS, [0.5, 0.75, 1, 1.5, 2, 3, 4]);
  });
  it("steps from Fit to the nearest level in both directions", () => {
    assert.equal(Z.stepZoom(1052 / 1024, 1), 1.5);
    assert.equal(Z.stepZoom(1052 / 1024, -1), 1);
    assert.equal(Z.stepZoom(0.65, 1), 0.75);
    assert.equal(Z.stepZoom(0.65, -1), 0.5);
  });
  it("steps from a level to the next one", () => {
    assert.equal(Z.stepZoom(1, 1), 1.5);
    assert.equal(Z.stepZoom(1, -1), 0.75);
    assert.equal(Z.stepZoom(1 + 1e-9, -1), 0.75);
  });
  it("stays at the ends", () => {
    assert.equal(Z.stepZoom(0.5, -1), 0.5);
    assert.equal(Z.stepZoom(0.3, -1), 0.5);
    assert.equal(Z.stepZoom(4, 1), 4);
    assert.equal(Z.stepZoom(3, 1), 4);
  });
});

describe("zoomAround", () => {
  // Keypad point under the pointer for a scroll and zoom (scroll measured from the stage origin).
  const keypadAt = (scroll, point, z) => ({ x: (scroll.left + point.x) / z, y: (scroll.top + point.y) / z });
  it("keeps the pointer's keypad point fixed when zooming in and out", () => {
    const scroll = { left: 100, top: 50 };
    const point = { x: 200, y: 100 };
    const before = keypadAt(scroll, point, 1);
    const inward = Z.zoomAround(scroll, point, 1, 2);
    assert.deepEqual(inward, { left: 400, top: 200 });
    assert.deepEqual(keypadAt(inward, point, 2), before);
    const outward = Z.zoomAround(inward, point, 2, 1.5);
    assert.deepEqual(outward, { left: 250, top: 125 });
    assert.deepEqual(keypadAt(outward, point, 1.5), before);
  });
  it("gives negative values when the point cannot stay (the pane clamps them)", () => {
    assert.deepEqual(Z.zoomAround({ left: 0, top: 0 }, { x: 100, y: 40 }, 2, 1), { left: -50, top: -20 });
  });
});
