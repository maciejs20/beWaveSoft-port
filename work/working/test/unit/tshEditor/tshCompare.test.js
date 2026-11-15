// Tests of the pure helpers of the TSH preview comparison tool (work/working/tools/tshCompareCore.mjs): ink boxes of
// image regions and the tolerance check (±2 keypad px for edges, ±3 % or ±2 px for sizes).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let C;
before(async () => {
  C = await import(pathToFileURL(path.join(__dirname, "../../../tools/tshCompareCore.mjs")).href);
});

// RGBA image of w x h filled with a gray level; paint(x, y, level) sets one pixel. Returns { rgba, w, h, paint }.
const image = (w, h, level = 230) => {
  const rgba = new Uint8ClampedArray(w * h * 4).fill(level);
  const paint = (x, y, v) => rgba.set([v, v, v, 255], (y * w + x) * 4);
  return { rgba, w, h, paint };
};
const BG = { color: [230, 230, 230], threshold: 140 };

describe("inkBox", () => {
  it("gives null for a region without ink", () => {
    const im = image(10, 10);
    assert.equal(C.inkBox(im.rgba, im.w, im.h, { left: 0, top: 0, width: 10, height: 10 }, BG), null);
  });
  it("finds one pixel", () => {
    const im = image(10, 10);
    im.paint(3, 4, 0);
    assert.deepEqual(C.inkBox(im.rgba, im.w, im.h, { left: 0, top: 0, width: 10, height: 10 }, BG),
      { left: 3, top: 4, right: 3, bottom: 4 });
  });
  it("counts an anti-aliased edge from the threshold on (140 counts, 139 does not)", () => {
    const im = image(10, 10);
    im.paint(2, 2, 90);
    im.paint(7, 7, 91);
    assert.deepEqual(C.inkBox(im.rgba, im.w, im.h, { left: 0, top: 0, width: 10, height: 10 }, BG),
      { left: 2, top: 2, right: 2, bottom: 2 });
  });
  it("clips a region that runs past the image border and keeps ink on the border", () => {
    const im = image(10, 10);
    im.paint(9, 0, 0);
    im.paint(0, 9, 0);
    assert.deepEqual(C.inkBox(im.rgba, im.w, im.h, { left: -5, top: -5, width: 30, height: 30 }, BG),
      { left: 0, top: 0, right: 9, bottom: 9 });
    assert.equal(C.inkBox(im.rgba, im.w, im.h, { left: 2, top: 2, width: 3, height: 3 }, BG), null);
  });
});

describe("compareRegion", () => {
  const tol = { edge: 2, sizePct: 3 };
  const box = (left, top, width, height) => ({ left, top, width, height });
  it("passes edges at ±2 px and fails above", () => {
    assert.equal(C.compareRegion(box(100, 50, 20, 20), box(102, 48, 20, 20), tol).ok, true);
    assert.equal(C.compareRegion(box(100, 50, 20, 20), box(101, 50, 20, 20), tol).ok, true);
    assert.equal(C.compareRegion(box(100, 50, 20, 20), box(102.5, 50, 20, 20), tol).ok, false);
    assert.equal(C.compareRegion(box(100, 50, 20, 20), box(100, 47.5, 20, 20), tol).ok, false);
  });
  it("passes a size within 3 % or 2 px and fails above both", () => {
    assert.deepEqual(C.compareRegion(box(0, 0, 200, 100), box(0, 0, 206, 100), tol),
      { ok: true, dLeft: 0, dTop: 0, dWidth: 6, dHeight: 0, dWidthPct: 3, dHeightPct: 0 });
    assert.equal(C.compareRegion(box(0, 0, 200, 100), box(0, 0, 194, 100), tol).ok, true);
    assert.equal(C.compareRegion(box(0, 0, 200, 100), box(0, 0, 206.2, 100), tol).ok, false);
    assert.equal(C.compareRegion(box(0, 0, 20, 10), box(0, 0, 22, 12), tol).ok, true);
    assert.equal(C.compareRegion(box(0, 0, 20, 10), box(0, 0, 20, 12.5), tol).ok, false);
  });
  it("passes no ink on both sides and fails ink on one side only", () => {
    const none = { ok: true, dLeft: null, dTop: null, dWidth: null, dHeight: null, dWidthPct: null, dHeightPct: null };
    assert.deepEqual(C.compareRegion(null, null, tol), none);
    assert.equal(C.compareRegion(box(0, 0, 5, 5), null, tol).ok, false);
    assert.equal(C.compareRegion(null, box(0, 0, 5, 5), tol).ok, false);
  });
});

describe("toKeypadBox", () => {
  it("converts inclusive image pixels to keypad pixels at the preview scale", () => {
    assert.deepEqual(C.toKeypadBox({ left: 6, top: 3, right: 17, bottom: 8 }, 0.6),
      { left: 10, top: 5, width: 20, height: 10 });
    assert.equal(C.toKeypadBox(null, 0.6), null);
  });
});
