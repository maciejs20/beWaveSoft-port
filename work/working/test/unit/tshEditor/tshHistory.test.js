// Tests of the editor history and shortcuts tshHistory.js (src/renderer/app/desktop/tshEditor/): undo/redo restore
// the exact model, redo is cleared by a new change, the 100-step limit, coalescing by key and time, the selection
// after undo, and the keyboard map with form fields left alone.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { plT } = require("../../support/tshEditorSupport.js");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const H = require(path.join(dir, "tshHistory.js"));
const M = require(path.join(dir, "tshEditorModel.js"));
const { WIDGET_TYPE: T } = require(path.join(dir, "tshFormat.js"));

// Fresh TSG2 state with one user screen holding a text widget. Returns { state, uid }.
function setup() {
  let s = M.loadEditor({ keypad: { model: "TSG2" } }, plT).state;
  s = M.addScreen(s, "user", plT).state;
  const uid = s.blob.records[2].uid;
  s = M.addWidget(s, uid, T.TEXT, plT).state;
  return { state: s, uid };
}
// History after recording states a, b, c… at the given times with the given keys. Returns the history.
const recordAll = (h, steps) => steps.reduce((acc, [state, key, at]) => H.record(acc, state, key, at), h);

describe("undo and redo", () => {
  it("restores the exact models step by step", () => {
    const { state: s0, uid } = setup();
    const s1 = M.moveWidget(s0, uid, 0, 10, 20).state;
    const s2 = M.setWidgetField(s1, uid, 0, ["text"], "Brama").state;
    const s3 = M.removeWidget(s2, uid, 0).state;
    let h = recordAll(H.createHistory(s0), [[s1, null, 1], [s2, null, 2], [s3, null, 3]]);
    assert.deepEqual(h, { past: [s0, s1, s2], present: s3, future: [], key: null, at: 3 });
    h = H.undo(H.undo(H.undo(h)));
    assert.equal(h.present, s0);
    assert.deepEqual(h.present, setup().state);
    assert.deepEqual(h.future, [s1, s2, s3]);
    h = H.redo(H.redo(H.redo(h)));
    assert.deepEqual(h, { past: [s0, s1, s2], present: s3, future: [], key: null, at: 0 });
  });
  it("does nothing at the ends", () => {
    const h = H.createHistory(setup().state);
    assert.equal(H.undo(h), h);
    assert.equal(H.redo(h), h);
  });
  it("clears redo when a new change is recorded", () => {
    const { state: s0, uid } = setup();
    const s1 = M.moveWidget(s0, uid, 0, 10, 20).state;
    const s2 = M.moveWidget(s0, uid, 0, 30, 40).state;
    const h = H.record(H.undo(H.record(H.createHistory(s0), s1, null, 1)), s2, null, 2);
    assert.deepEqual(h, { past: [s0], present: s2, future: [], key: null, at: 2 });
  });
  it("ignores a record of the present state", () => {
    const h = H.createHistory(setup().state);
    assert.equal(H.record(h, h.present, "k", 5), h);
  });
  it("keeps at most 100 steps, dropping the oldest", () => {
    const states = Array.from({ length: 102 }, (_, i) => ({ n: i }));
    const after = (count) => recordAll(H.createHistory(states[0]), states.slice(1, count + 1).map((s, i) => [s, null, i]));
    assert.equal(H.HISTORY_LIMIT, 100);
    assert.equal(after(99).past.length, 99);
    assert.equal(after(99).past[0], states[0]);
    assert.equal(after(100).past.length, 100);
    assert.equal(after(100).past[0], states[0]);
    assert.equal(after(101).past.length, 100);
    assert.equal(after(101).past[0], states[1]);
    assert.equal(after(101).present, states[101]);
  });
});

describe("coalescing", () => {
  const [a, b, c, d] = [{ n: 0 }, { n: 1 }, { n: 2 }, { n: 3 }];
  it("merges the same key within 1000 ms, also over a run of changes", () => {
    const h = recordAll(H.createHistory(a), [[b, "field:3:0:text", 100], [c, "field:3:0:text", 1099],
      [d, "field:3:0:text", 2000]]);
    assert.deepEqual(h, { past: [a], present: d, future: [], key: "field:3:0:text", at: 2000 });
  });
  it("merges at exactly 1000 ms, not at 1001", () => {
    assert.deepEqual(recordAll(H.createHistory(a), [[b, "k", 0], [c, "k", 1000]]).past, [a]);
    assert.deepEqual(recordAll(H.createHistory(a), [[b, "k", 0], [c, "k", 1001]]).past, [a, b]);
    assert.deepEqual(recordAll(H.createHistory(a), [[b, "k", 0], [c, "k", 999]]).past, [a]);
  });
  it("never merges a different key or a change without a key", () => {
    assert.deepEqual(recordAll(H.createHistory(a), [[b, "nudge:3:0", 0], [c, "nudge:3:1", 10]]).past, [a, b]);
    assert.deepEqual(recordAll(H.createHistory(a), [[b, null, 0], [c, null, 10]]).past, [a, b]);
  });
  it("does not merge into a step reached by undo or redo", () => {
    const h = H.record(H.undo(recordAll(H.createHistory(a), [[b, "k", 0], [c, "x", 10]])), d, "k", 20);
    assert.deepEqual(h.past, [a, b]);
  });
});

describe("selection after undo", () => {
  it("keeps a valid selection as it is", () => {
    const { state, uid } = setup();
    const sel = { uid, widget: 0 };
    assert.equal(H.clampSelection(state, sel), sel);
    const none = { uid: null, widget: null };
    assert.equal(H.clampSelection(state, none), none);
  });
  it("drops a removed widget", () => {
    const { state, uid } = setup();
    assert.deepEqual(H.clampSelection(state, { uid, widget: 1 }), { uid, widget: null });
    const sel = { uid, widget: null };
    assert.equal(H.clampSelection(state, sel), sel);
  });
  it("falls back to the first user screen for a removed screen, or to none", () => {
    const { state, uid } = setup();
    assert.deepEqual(H.clampSelection(state, { uid: 999, widget: 2 }), { uid, widget: null });
    const bare = M.loadEditor({ keypad: { model: "TSG2" } }, plT).state;
    assert.deepEqual(H.clampSelection(bare, { uid: 999, widget: 0 }), { uid: null, widget: null });
  });
});

describe("selection after undoing a reorder (review M5)", () => {
  // State with a text, a button and a rectangle on the user screen, the text then moved to the top. Returns
  // { before, after, uid }.
  function reordered() {
    const { state, uid } = setup();
    let s = M.addWidget(state, uid, T.BUTTON, plT).state;
    s = M.addWidget(s, uid, T.RECTANGLE, plT).state;
    const r = M.reorderWidget(s, uid, 0, 2);
    return { before: s, after: r.state, uid };
  }
  it("follows the selected widget to its old place on undo and back on redo", () => {
    const { before, after, uid } = reordered();
    assert.deepEqual(H.clampSelection(before, { uid, widget: 2 }, after), { uid, widget: 0 });
    assert.deepEqual(H.clampSelection(after, { uid, widget: 0 }, before), { uid, widget: 2 });
    // The rectangle (index 1 after the reorder) is found at index 2 again; an unchanged place keeps the object.
    assert.deepEqual(H.clampSelection(before, { uid, widget: 1 }, after), { uid, widget: 2 });
    const mid = { uid, widget: 1 };
    assert.equal(H.clampSelection(before, mid, before), mid);
  });
  it("keeps the index of a widget whose content the undo changed", () => {
    const { state, uid } = setup();
    const moved = M.moveWidget(state, uid, 0, 5, 6).state;
    const sel = { uid, widget: 0 };
    assert.equal(H.clampSelection(state, sel, moved), sel);
  });
  it("keeps the selection on a moved widget that has an identical twin, on undo and redo", () => {
    const { state, uid } = setup();
    // "+ Widżet" centres both new texts on the visible middle, so they are identical.
    let twins = M.addWidget(state, uid, T.TEXT, plT).state;
    twins = M.moveWidget(twins, uid, 1, 32, 32).state;
    const ws = M.findScreen(twins, uid).record.widgets;
    assert.equal(JSON.stringify(ws[0]), JSON.stringify(ws[1]));
    const moved = M.moveWidget(twins, uid, 1, 150, 120).state;
    const sel = { uid, widget: 1 };
    assert.equal(H.clampSelection(moved, sel, twins), sel);
    assert.equal(H.clampSelection(twins, sel, moved), sel);
  });
  it("picks the twin nearest to the old index after a reorder", () => {
    const { state, uid } = setup();
    let s = M.addWidget(state, uid, T.BUTTON, plT).state;
    s = M.addWidget(s, uid, T.TEXT, plT).state;
    s = M.addWidget(s, uid, T.TEXT, plT).state;
    // [text, button, text, text]: the button moved to the top gives [text, text, text, button].
    const after = M.reorderWidget(s, uid, 1, 3).state;
    assert.deepEqual(H.clampSelection(s, { uid, widget: 3 }, after), { uid, widget: 1 });
    assert.deepEqual(H.clampSelection(after, { uid, widget: 1 }, s), { uid, widget: 3 });
  });
  it("still drops a widget the undo removed", () => {
    const { state, uid } = setup();
    const added = M.addWidget(state, uid, T.BUTTON, plT).state;
    assert.deepEqual(H.clampSelection(state, { uid, widget: 1 }, added), { uid, widget: null });
  });
});

describe("shortcuts", () => {
  const ev = (key, mods = {}, tagName = "DIV") => ({ key, ctrlKey: false, metaKey: false, shiftKey: false,
    altKey: false, target: { tagName }, ...mods });
  it("maps undo and redo with Ctrl or Cmd", () => {
    assert.equal(H.shortcutFor(ev("z", { ctrlKey: true })), "undo");
    assert.equal(H.shortcutFor(ev("z", { metaKey: true })), "undo");
    assert.equal(H.shortcutFor(ev("Z", { ctrlKey: true, shiftKey: true })), "redo");
    assert.equal(H.shortcutFor(ev("z", { metaKey: true, shiftKey: true })), "redo");
    assert.equal(H.shortcutFor(ev("y", { ctrlKey: true })), "redo");
  });
  it("maps Delete, Backspace, G and Tab", () => {
    assert.equal(H.shortcutFor(ev("Delete")), "delete");
    assert.equal(H.shortcutFor(ev("Backspace")), "delete");
    assert.equal(H.shortcutFor(ev("g")), "grid");
    assert.equal(H.shortcutFor(ev("G")), "grid");
    assert.equal(H.shortcutFor(ev("Tab")), "nextWidget");
    assert.equal(H.shortcutFor(ev("Tab", { shiftKey: true })), "prevWidget");
  });
  it("maps the zoom keys", () => {
    assert.equal(H.shortcutFor(ev("=", { ctrlKey: true })), "zoomIn");
    assert.equal(H.shortcutFor(ev("+", { metaKey: true, shiftKey: true })), "zoomIn");
    assert.equal(H.shortcutFor(ev("-", { ctrlKey: true })), "zoomOut");
    assert.equal(H.shortcutFor(ev("0", { ctrlKey: true })), "zoomFit");
    assert.equal(H.shortcutFor(ev("1", { metaKey: true })), "zoomActual");
  });
  it("leaves other combinations alone", () => {
    for (const e of [ev("z", { ctrlKey: true, altKey: true }), ev("y", { ctrlKey: true, shiftKey: true }),
      ev("z"), ev("a", { ctrlKey: true }), ev("g", { shiftKey: true }), ev("g", { altKey: true }),
      ev("Delete", { shiftKey: true }), ev("Tab", { altKey: true }), ev("-", { ctrlKey: true, shiftKey: true }),
      ev("0", { ctrlKey: true, shiftKey: true }), ev("x"), { key: undefined, target: null }]) {
      assert.equal(H.shortcutFor(e), null, JSON.stringify(e));
    }
  });
  it("ignores every key typed in a form field or an editable element", () => {
    for (const tag of ["INPUT", "SELECT", "TEXTAREA"]) {
      assert.equal(H.shortcutFor(ev("z", { ctrlKey: true }, tag)), null);
      assert.equal(H.shortcutFor(ev("Backspace", {}, tag)), null);
      assert.equal(H.shortcutFor(ev("Tab", {}, tag)), null);
    }
    assert.equal(H.shortcutFor({ ...ev("g"), target: { tagName: "DIV", isContentEditable: true } }), null);
  });
  it("ignores keys on popup menu and dialog controls (review M6)", () => {
    // Element stand-in whose closest() finds a popup ancestor when inside is true. Returns the target.
    const node = (inside) => ({ tagName: "BUTTON", closest: (sel) => inside && sel.includes('[role="menu"]') &&
      sel.includes('[role="dialog"]') ? {} : null });
    assert.equal(H.shortcutFor(ev("Backspace", { target: node(true) })), null);
    assert.equal(H.shortcutFor(ev("g", { target: node(true) })), null);
    assert.equal(H.shortcutFor(ev("z", { ctrlKey: true, target: node(true) })), null);
    assert.equal(H.shortcutFor(ev("Backspace", { target: node(false) })), "delete");
    assert.deepEqual([node(true), node(false), { tagName: "DIV" }, null].map(H.inPopup), [true, false, false, false]);
  });
  it("tells form fields and editable elements from other targets", () => {
    const targets = [{ tagName: "INPUT" }, { tagName: "SELECT" }, { tagName: "TEXTAREA" },
      { tagName: "DIV", isContentEditable: true }, { tagName: "DIV" }, { tagName: "BUTTON" }, null, undefined];
    assert.deepEqual(targets.map(H.isFormField), [true, true, true, true, false, false, false, false]);
  });
});
