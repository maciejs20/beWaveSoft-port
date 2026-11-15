// Tests of the microSD card rules tshSdCard.js (src/renderer/app/desktop/tshEditor/tshSdCard.js): slideshow
// placement as TSH TFormSD does it (checked against TSH's photo/img1.jpg of slajd1.jpg), card file names, the crop
// rectangle of the background window, and the model operation that sets a screen picture.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { sampleState, uidAt, ok } = require("../../support/tshEditorSupport.js");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const S = require(path.join(dir, "tshSdCard.js"));
const M = require(path.join(dir, "tshEditorModel.js"));

describe("slideRect", () => {
  it("keeps a picture narrower than the screen at its size and cuts the top and bottom (TSH img1.jpg)", () => {
    // work/re-tsh: slajd1.jpg 800x800 -> img1.jpg 1024x600, content at x 112..911, black bars left and right.
    assert.deepEqual(S.slideRect(800, 800, 1024, 600), { x: 112, y: -100, width: 800, height: 800 });
  });
  it("scales a wider picture down to the screen width only", () => {
    assert.deepEqual(S.slideRect(2048, 600, 1024, 600), { x: 0, y: 150, width: 1024, height: 300 });
    assert.deepEqual(S.slideRect(2000, 3000, 1024, 600), { x: 0, y: -468, width: 1024, height: 1536 });
  });
  it("truncates like Delphi div, also for negative offsets", () => {
    assert.deepEqual(S.slideRect(1500, 1001, 1024, 600), { x: 0, y: -41, width: 1024, height: 683 });
    assert.deepEqual(S.slideRect(301, 201, 480, 272), { x: 89, y: 35, width: 301, height: 201 });
    assert.deepEqual(S.slideRect(480, 273, 480, 272), { x: 0, y: 0, width: 480, height: 273 });
  });
});

describe("card file names", () => {
  it("numbers slideshow pictures from img1.jpg and skips existing names without case", () => {
    assert.deepEqual(S.photoNames([], 3), ["img1.jpg", "img2.jpg", "img3.jpg"]);
    assert.deepEqual(S.photoNames(["img1.jpg", "IMG3.JPG"], 3), ["img2.jpg", "img4.jpg", "img5.jpg"]);
    assert.deepEqual(S.photoNames(["img1.jpg"], 0), []);
  });
  it("names a background after the screen id, or the lowest free number when taken", () => {
    assert.equal(S.backgroundName(2, []), "map2.jpg");
    assert.equal(S.backgroundName(33, ["int://Flora.jpg", ""]), "map33.jpg");
    assert.equal(S.backgroundName(2, ["MAP2.jpg", "map1.jpg"]), "map3.jpg");
  });
  it("tells card pictures from built-in ones", () => {
    assert.equal(S.isCustomBackground("map2.jpg"), true);
    assert.equal(S.isCustomBackground("Motive.jpg"), true);
    assert.equal(S.isCustomBackground("int://Flora.jpg"), false);
    assert.equal(S.isCustomBackground(" "), false);
    assert.equal(S.isCustomBackground(undefined), false);
  });
});

describe("crop rectangle", () => {
  it("starts as the largest centered rectangle of the keypad proportions", () => {
    assert.deepEqual(S.cropInit(1600, 1200, 1024, 600), { x: 0, y: 131, width: 1600, height: 938 });
    assert.deepEqual(S.cropInit(3000, 1000, 1024, 600), { x: 646, y: 0, width: 1707, height: 1000 });
    assert.deepEqual(S.cropInit(1024, 600, 1024, 600), { x: 0, y: 0, width: 1024, height: 600 });
  });
  it("finds the corner handle, the inside and the outside", () => {
    const r = { x: 100, y: 100, width: 400, height: 234 };
    assert.equal(S.cropHit(r, 495, 330, 1), "resize");
    assert.equal(S.cropHit(r, 503, 337, 1), "resize");
    assert.equal(S.cropHit(r, 300, 200, 1), "move");
    assert.equal(S.cropHit(r, 50, 200, 1), null);
    assert.equal(S.cropHit(r, 485, 330, 0.5), "resize");
  });
  it("moves within the picture", () => {
    const r = { x: 100, y: 100, width: 400, height: 234 };
    assert.deepEqual(S.cropMove(r, 50, -20, 1000, 800), { x: 150, y: 80, width: 400, height: 234 });
    assert.deepEqual(S.cropMove(r, -500, 900, 1000, 800), { x: 0, y: 566, width: 400, height: 234 });
  });
  it("resizes from the corner keeping the proportions, within the picture and not below a third", () => {
    const r = { x: 100, y: 100, width: 400, height: 234 };
    assert.deepEqual(S.cropResize(r, 100, 10, 1000, 800, 1024, 600), { x: 100, y: 100, width: 500, height: 293 });
    assert.deepEqual(S.cropResize(r, 0, 60, 1000, 800, 1024, 600), { x: 100, y: 100, width: 502, height: 294 });
    assert.deepEqual(S.cropResize(r, 5000, 0, 1000, 800, 1024, 600), { x: 100, y: 100, width: 900, height: 527 });
    const small = S.cropResize(r, -1000, 0, 1000, 800, 1024, 600);
    assert.equal(small.height, 267);
    assert.equal(small.width, 455);
  });
});

describe("setScreenImage", () => {
  it("sets a card picture on a screen that does not use the theme, and it encodes", () => {
    // Sample 054: screen 33 (record 2) has the theme off.
    const loaded = sampleState("054");
    const s = ok(M.setScreenImage(loaded, uidAt(loaded, 2), "map33.jpg"));
    assert.equal(s.blob.records[2].image, "map33.jpg");
    assert.equal(s.changed, true);
    assert.deepEqual(M.validate(s).errors, []);
  });
  it("refuses screens that use the theme and the theme record", () => {
    const s = sampleState("054");
    assert.equal(M.setScreenImage(s, uidAt(s, 3), "map34.jpg").error.code, "USES_THEME");
    assert.equal(M.setScreenImage(s, uidAt(s, 0), "map1.jpg").error.code, "SCREEN_TYPE");
  });
});

describe("stripJpegMetadata", () => {
  it("drops APP1-APP15 before the scan and keeps JFIF, tables and image data", () => {
    const seg = (m, ...body) => [0xff, m, 0, body.length + 2, ...body];
    const head = [0xff, 0xd8];
    const jfif = seg(0xe0, 0x4a, 0x46);
    const icc = seg(0xe2, 1, 2, 3);
    const exif = seg(0xe1, 9);
    const dqt = seg(0xdb, 7, 7);
    const scan = [0xff, 0xda, 0, 2, 0xe2, 0xff, 0x00, 0xff, 0xd9];
    const out = S.stripJpegMetadata(Uint8Array.from([...head, ...jfif, ...icc, ...dqt, ...exif, ...scan]));
    assert.deepEqual([...out], [...head, ...jfif, ...dqt, ...scan]);
  });
  it("returns other bytes unchanged", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);
    assert.equal(S.stripJpegMetadata(png), png);
    const cut = Uint8Array.from([0xff, 0xd8, 0xff, 0xe2, 0x00, 0x40, 1]);
    assert.equal(S.stripJpegMetadata(cut), cut);
  });
});
