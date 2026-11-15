// Tests of the canvas pointer rules tshPointer.js (src/renderer/app/desktop/tshEditor/): drag threshold, pointer to
// keypad mapping, hit testing with rectangle frames, snapping, anchor-only clamping and the press/drag/release
// state machine, including the user's INT-TSG2 case where a plain click moved a button (RC3) and a frame took the
// click meant for the button inside it (RC4).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const P = require(path.join(dir, "tshPointer.js"));
const L = require(path.join(dir, "tshLayout.js"));
const { WIDGET_TYPE: T } = require(path.join(dir, "tshFormat.js"));

const TSG2 = L.metricsFor(480, 272);
const OPTS = { now: new Date(2026, 10, 14, 22, 5, 6), lang: "pl" };
// Fit zoom of the user's TSG2 screen in the 1000 px wide editor window.
const FIT = 632 / 480;
const widget = (type, data, extra = {}) => ({ kind: "widget", type, x: 300, y: 100, size: 0, center: false,
  useTheme: true, colors: ["5a5a5f", "56a8de", "e6e6e6"], data, ...extra });
// The user's strip: a large button at 84,211 and, drawn after it, the frame 2,232 476x38.
const button = widget(T.BUTTON, { devIndex: 0, iconOff: 0x11d, iconOn: 0x11e }, { x: 84, y: 211, size: 2 });
const frame = widget(T.RECTANGLE, { width: 476, height: 38, transparency: 7, border: 2 }, { x: 2, y: 232 });
const STRIP = [button, frame].map((w) => L.widgetLayout(w, TSG2, OPTS));
// A small icon (36x36 box on TSG2) at x, y. Returns its layout.
const icon = (x, y) => L.widgetLayout(widget(T.INFO, {}, { x, y }), TSG2, OPTS);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

describe("drag threshold", () => {
  it("starts a drag at 4 CSS px of travel, not below", () => {
    assert.equal(P.DRAG_THRESHOLD_PX, 4);
    assert.equal(P.passedThreshold({ x: 10, y: 10 }, { x: 13.9, y: 10 }), false);
    assert.equal(P.passedThreshold({ x: 10, y: 10 }, { x: 14, y: 10 }), true);
    assert.equal(P.passedThreshold({ x: 10, y: 10 }, { x: 10, y: 5 }), true);
    assert.equal(P.passedThreshold({ x: 10, y: 10 }, { x: 13, y: 13 }), true);
    assert.equal(P.passedThreshold({ x: 10, y: 10 }, { x: 12.8, y: 12.8 }), false);
    assert.equal(P.passedThreshold({ x: 10, y: 10 }, { x: 10, y: 10 }), false);
  });
});

describe("pointer to keypad pixels", () => {
  it("maps through the live stage rectangle at any zoom", () => {
    assert.deepEqual(P.toKeypad(165, 115, { left: 100, top: 50 }, 0.65), { x: 100, y: 100 });
    const p = P.toKeypad(100 + 84 * 1.3167, 50 + 211 * 1.3167, { left: 100, top: 50 }, 1.3167);
    near(p.x, 84);
    near(p.y, 211);
    assert.deepEqual(P.toKeypad(300, 250, { left: 100, top: 50 }, 2), { x: 100, y: 100 });
  });
  it("maps a scrolled stage (rectangle starting left of and above the viewport)", () => {
    assert.deepEqual(P.toKeypad(0, 0, { left: -200, top: -100 }, 2), { x: 100, y: 50 });
  });
});

describe("hit testing", () => {
  it("lets the button under a frame's interior win (the user's strip, keypad 120,250)", () => {
    assert.equal(P.hitTest(STRIP, { x: 120, y: 250 }, FIT, null), 0);
  });
  it("hits the frame on its edge, also over the button", () => {
    assert.equal(P.hitTest(STRIP, { x: 3, y: 250 }, FIT, null), 1);
    assert.equal(P.hitTest(STRIP, { x: 120, y: 233 }, FIT, null), 1);
    assert.equal(P.hitTest(STRIP, { x: 120, y: 268 }, FIT, null), 1);
  });
  it("hits the frame's interior when nothing else is under the pointer", () => {
    assert.equal(P.hitTest(STRIP, { x: 300, y: 250 }, FIT, null), 1);
  });
  it("counts the outer half of a rectangle's pen and an edge band of 4 CSS px or the border", () => {
    const rect = L.widgetLayout(widget(T.RECTANGLE, { width: 100, height: 100, transparency: 0, border: 4 },
      { x: 10, y: 10 }), TSG2, OPTS);
    const under = icon(10, 10);
    const layouts = [under, rect];
    assert.equal(P.hitTest(layouts, { x: 8, y: 30 }, 1, null), 1);
    assert.equal(P.hitTest(layouts, { x: 7.9, y: 30 }, 1, null), null);
    // Band at zoom 0.5: 8 keypad px (wider than the border), so 17.9 is still the edge and 18 the interior.
    assert.equal(P.hitTest(layouts, { x: 30, y: 17.9 }, 0.5, null), 1);
    assert.equal(P.hitTest(layouts, { x: 30, y: 18 }, 0.5, null), 0);
    // Band at zoom 4: the border (4 px) is wider than 4 CSS px (1 keypad px).
    assert.equal(P.hitTest(layouts, { x: 30, y: 13.9 }, 4, null), 1);
    assert.equal(P.hitTest(layouts, { x: 30, y: 14 }, 4, null), 0);
  });
  it("picks the topmost of overlapping widgets", () => {
    assert.equal(P.hitTest([icon(100, 100), icon(110, 110)], { x: 120, y: 120 }, 1, null), 1);
    assert.equal(P.hitTest([icon(100, 100), icon(110, 110)], { x: 105, y: 105 }, 1, null), 0);
  });
  it("cycles with Alt through every widget under the pointer, wrapping", () => {
    const layouts = [icon(100, 100), icon(110, 110), icon(115, 115)];
    const at = { x: 120, y: 120 };
    assert.equal(P.hitTest(layouts, at, 1, null), 2);
    assert.equal(P.hitTest(layouts, at, 1, 2), 1);
    assert.equal(P.hitTest(layouts, at, 1, 1), 0);
    assert.equal(P.hitTest(layouts, at, 1, 0), 2);
    assert.equal(P.hitTest(STRIP, { x: 120, y: 250 }, FIT, 0), 1);
    assert.equal(P.hitTest(layouts, at, 1, 7), 2);
  });
  it("finds nothing on empty space", () => {
    assert.equal(P.hitTest(STRIP, { x: 300, y: 100 }, FIT, null), null);
    assert.equal(P.hitTest([], { x: 0, y: 0 }, 1, 0), null);
  });
  it("gives an empty text 8 CSS px around its anchor at any zoom (review M2)", () => {
    const text = L.widgetLayout(widget(T.TEXT, { text: "" }, { x: 50, y: 50 }), TSG2, OPTS);
    assert.equal(text.width, 0);
    assert.deepEqual(P.hitBox(text, 1), { left: 46, width: 8 });
    assert.deepEqual(P.hitBox(text, 0.5), { left: 42, width: 16 });
    assert.equal(P.hitTest([text], { x: 46, y: 52 }, 1, null), 0);
    assert.equal(P.hitTest([text], { x: 53.9, y: 52 }, 1, null), 0);
    assert.equal(P.hitTest([text], { x: 54, y: 52 }, 1, null), null);
    assert.equal(P.hitTest([text], { x: 43, y: 52 }, 0.5, null), 0);
  });
  it("keeps wide text boxes and gives other zero-sized boxes one pixel", () => {
    const text = L.widgetLayout(widget(T.TEXT, { text: "Brama" }, { x: 50, y: 50 }), TSG2, OPTS);
    assert.deepEqual(P.hitBox(text, 1), { left: text.left, width: text.width });
    const flat = { kind: "icon", left: 50, top: 50, width: 0, height: 0, offsetX: 0 };
    assert.deepEqual(P.hitBox(flat, 4), { left: 50, width: 1 });
    assert.equal(P.hitTest([flat], { x: 50.5, y: 50.5 }, 4, null), 0);
    assert.equal(P.hitTest([flat], { x: 51, y: 50.5 }, 4, null), null);
  });
});

describe("drag anchor", () => {
  const grab = { x: 0, y: 0 };
  it("follows the pointer minus the grab offset without snapping when snap is off", () => {
    assert.deepEqual(P.dragAnchor({ x: 10, y: 10 }, { x: 31.4, y: 80.6 }, icon(0, 0), TSG2, { snap: false, zoom: 1 }),
      { x: 21, y: 71, guides: [] });
  });
  it("snaps a box edge to a cell edge within 6 CSS px, not at 7", () => {
    assert.deepEqual(P.dragAnchor(grab, { x: 26, y: 70 }, icon(0, 0), TSG2, { snap: true, zoom: 1 }),
      { x: 20, y: 70, guides: [{ axis: "x", at: 20 }] });
    assert.deepEqual(P.dragAnchor(grab, { x: 27, y: 70 }, icon(0, 0), TSG2, { snap: true, zoom: 1 }),
      { x: 27, y: 70, guides: [] });
    // At zoom 2 the snap distance is 3 keypad px; the box's right edge snaps to the cell's right edge 92.
    assert.deepEqual(P.dragAnchor(grab, { x: 23, y: 70 }, icon(0, 0), TSG2, { snap: true, zoom: 2 }),
      { x: 20, y: 70, guides: [{ axis: "x", at: 20 }] });
    assert.deepEqual(P.dragAnchor(grab, { x: 24, y: 70 }, icon(0, 0), TSG2, { snap: true, zoom: 2 }),
      { x: 24, y: 70, guides: [] });
    assert.deepEqual(P.dragAnchor(grab, { x: 59, y: 70 }, icon(0, 0), TSG2, { snap: true, zoom: 2 }),
      { x: 56, y: 70, guides: [{ axis: "x", at: 92 }] });
  });
  it("snaps the box centre to the screen centre lines", () => {
    assert.deepEqual(P.dragAnchor(grab, { x: 227, y: 70 }, icon(0, 0), TSG2, { snap: true, zoom: 1 }),
      { x: 222, y: 70, guides: [{ axis: "x", at: 240 }] });
    assert.deepEqual(P.dragAnchor(grab, { x: 300, y: 116 }, icon(0, 0), TSG2, { snap: true, zoom: 1 }),
      { x: 296, y: 118, guides: [{ axis: "x", at: 296 }, { axis: "y", at: 136 }] });
  });
  it("snaps the box of a centered widget while X stays its middle", () => {
    const date = L.widgetLayout(widget(T.DATE_TIME, { format: "hh:mm" }, { x: 240, y: 70, center: true }), TSG2, OPTS);
    const r = P.dragAnchor(grab, { x: 243, y: 70 }, date, TSG2, { snap: true, zoom: 1 });
    assert.deepEqual(r, { x: 240, y: 70, guides: [{ axis: "x", at: 240 }] });
  });
  it("clamps only the anchor to 0..479 / 0..271", () => {
    assert.deepEqual(P.dragAnchor(grab, { x: 5000, y: 5000 }, icon(0, 0), TSG2, { snap: false, zoom: 1 }),
      { x: 479, y: 271, guides: [] });
    assert.deepEqual(P.dragAnchor(grab, { x: -5000, y: -5000 }, icon(0, 0), TSG2, { snap: false, zoom: 1 }),
      { x: 0, y: 0, guides: [] });
  });
  it("allows a box past the screen edge", () => {
    assert.deepEqual(P.dragAnchor(grab, { x: 470, y: 260 }, icon(0, 0), TSG2, { snap: false, zoom: 1 }),
      { x: 470, y: 260, guides: [] });
    assert.deepEqual(P.dragAnchor({ x: 36, y: 39 }, { x: 120, y: 250 }, STRIP[0], TSG2, { snap: false, zoom: FIT }),
      { x: 84, y: 211, guides: [] });
  });
});

describe("nudging", () => {
  it("moves an oversized widget by exactly the step, clamping only the anchor", () => {
    assert.deepEqual(P.nudgeAnchor(button, { dx: 0, dy: 1 }, TSG2), { x: 84, y: 212 });
    assert.deepEqual(P.nudgeAnchor(frame, { dx: 1, dy: 0 }, TSG2), { x: 3, y: 232 });
    assert.deepEqual(P.nudgeAnchor({ x: 479, y: 0 }, { dx: 8, dy: -8 }, TSG2), { x: 479, y: 0 });
  });
});

describe("press, drag and release", () => {
  // Press on the user's button at CSS 300,300 (keypad 120,250), then the given events. Returns the last state.
  const run = (events, movable = true) => events.reduce(P.pointerReducer, P.pointerReducer(P.IDLE, { type: "down",
    index: 0, movable, client: { x: 300, y: 300 }, keypad: { x: 120, y: 250 }, layout: STRIP[0],
    origin: { x: 84, y: 211 } }));
  // Pointer move by dx, dy CSS px from the press at zoom FIT (snap as given). Returns the event.
  const move = (dx, dy, snap = false) => ({ type: "move", client: { x: 300 + dx, y: 300 + dy },
    keypad: { x: 120 + dx / FIT, y: 250 + dy / FIT }, snap, zoom: FIT, m: TSG2 });
  it("never commits a click with 0, 1 or 3 px of jitter (RC3)", () => {
    assert.deepEqual(run([{ type: "up" }]), P.IDLE);
    assert.deepEqual(run([move(1, 0), { type: "up" }]), P.IDLE);
    assert.deepEqual(run([move(3, 0), move(2, 2), { type: "up" }]), P.IDLE);
  });
  it("stays pressed below the threshold (the same state object)", () => {
    const pressed = run([]);
    assert.equal(pressed.phase, "pressed");
    assert.equal(P.pointerReducer(pressed, move(3.9, 0)), pressed);
  });
  it("drags past the threshold and commits once on release", () => {
    const dragging = run([move(60, 30)]);
    assert.equal(dragging.phase, "dragging");
    assert.deepEqual(dragging.pos, { x: 130, y: 234 });
    assert.deepEqual(P.pointerReducer(dragging, { type: "up" }), { phase: "idle", commit: { index: 0, x: 130, y: 234 } });
    assert.deepEqual(run([move(4, 0), { type: "up" }]), { phase: "idle", commit: { index: 0, x: 87, y: 211 } });
  });
  it("does not commit a drag that ends where it started", () => {
    assert.deepEqual(run([move(60, 30), move(0, 0), { type: "up" }]), P.IDLE);
  });
  it("cancels with Escape or a lost pointer and keeps X/Y", () => {
    assert.deepEqual(run([move(60, 30), { type: "key", key: "Escape" }, { type: "up" }]), P.IDLE);
    assert.deepEqual(run([move(60, 30), { type: "cancel" }]), P.IDLE);
    const dragging = run([move(60, 30)]);
    assert.equal(P.pointerReducer(dragging, { type: "key", key: "a" }), dragging);
  });
  it("never drags a widget that cannot move", () => {
    const s = run([move(60, 30)], false);
    assert.equal(s.phase, "pressed");
    assert.deepEqual(P.pointerReducer(s, { type: "up" }), P.IDLE);
  });
  it("ignores moves without a press and unknown events", () => {
    assert.equal(P.pointerReducer(P.IDLE, move(60, 30)), P.IDLE);
    assert.equal(P.pointerReducer(P.IDLE, { type: "wheel" }), P.IDLE);
  });
  it("ends a press whose release was missed: a later held move does not drag the old widget (review I1)", () => {
    // The release landed outside the stage; the next move seen has no button held, then a new press elsewhere
    // brings the held pointer back over the stage.
    const held = (dx, dy) => Object.assign(move(dx, dy), { buttons: 1 });
    assert.deepEqual(run([Object.assign(move(1, 5), { buttons: 0 })]), P.IDLE);
    assert.deepEqual(run([Object.assign(move(1, 5), { buttons: 0 }), held(216, -168), { type: "up" }]), P.IDLE);
    assert.equal(run([held(60, 30)]).phase, "dragging");
  });
  it("follows only the pointer that pressed", () => {
    const down = P.pointerReducer(P.IDLE, { type: "down", index: 0, movable: true, client: { x: 300, y: 300 },
      keypad: { x: 120, y: 250 }, layout: STRIP[0], origin: { x: 84, y: 211 }, pointerId: 7 });
    assert.equal(down.pointerId, 7);
    const other = Object.assign(move(60, 30), { pointerId: 8, buttons: 1 });
    assert.equal(P.pointerReducer(down, other), down);
    const dragging = P.pointerReducer(down, Object.assign(move(60, 30), { pointerId: 7, buttons: 1 }));
    assert.equal(dragging.phase, "dragging");
    assert.equal(P.pointerReducer(dragging, { type: "up", pointerId: 8 }), dragging);
    assert.deepEqual(P.pointerReducer(dragging, { type: "up", pointerId: 7 }).commit, { index: 0, x: 130, y: 234 });
    assert.equal(P.pointerReducer(dragging, { type: "cancel" }), P.IDLE);
  });
  it("snaps while dragging only when asked", () => {
    // Anchor 84 + 18/FIT = 97.67: the box (97.67..181.67) right edge is 2.3 px from the cell edge 184, and its middle
    // row 253 is 1 px from the cell bottom 252.
    assert.deepEqual(run([move(18, 0, true)]).guides, [{ axis: "x", at: 184 }, { axis: "y", at: 252 }]);
    assert.deepEqual(run([move(18, 0, true)]).pos, { x: 100, y: 210 });
    assert.deepEqual(run([move(18, 0, false)]).pos, { x: 98, y: 211 });
  });
});
