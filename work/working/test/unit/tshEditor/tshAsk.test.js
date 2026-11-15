// Tests of the editor's questions over the confirm dialog (tshAsk.js): Esc answers "no" in the capture phase and
// never reaches the page, one question at a time, and a press in the editor ends a question another dialog replaced.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const { createAsker } = require(path.join(dir, "tshAsk.js"));

// Window stand-in that records capture listeners and dispatches events to them. Returns the target.
function fakeWindow() {
  const listeners = [];
  return {
    listeners,
    addEventListener(type, fn, capture) {
      listeners.push({ type, fn, capture });
    },
    removeEventListener(type, fn, capture) {
      const i = listeners.findIndex((l) => l.type === type && l.fn === fn && l.capture === capture);
      if (i >= 0) {
        listeners.splice(i, 1);
      }
    },
    dispatch(type, event) {
      listeners.filter((l) => l.type === type).forEach((l) => l.fn(event));
      return event;
    }
  };
}
// Key event stand-in. Returns the event.
function key(k) {
  return {
    key: k, prevented: false, stopped: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; }
  };
}
// Asker over a dialog whose answers the test gives. Returns { asker, target, answer(i, value), hidden, shown }.
function setup() {
  const target = fakeWindow();
  const resolvers = [];
  const shown = [];
  const state = { hidden: 0 };
  const asker = createAsker({
    confirm: (title) => {
      shown.push(title);
      return new Promise((resolve) => resolvers.push(resolve));
    },
    hide: () => { state.hidden += 1; },
    target,
    inEditor: (node) => node === "editor"
  });
  return { asker, target, shown, state, answer: (i, value) => resolvers[i](value) };
}

describe("editor questions", () => {
  it("passes the dialog's answer and removes its listeners", async () => {
    const { asker, target, answer } = setup();
    const p = asker.ask("Usunąć?", "text", "Usuń", "Anuluj");
    assert.equal(asker.pending(), true);
    assert.equal(target.listeners.length, 2);
    assert.ok(target.listeners.every((l) => l.capture === true));
    answer(0, true);
    assert.equal(await p, true);
    assert.equal(asker.pending(), false);
    assert.equal(target.listeners.length, 0);
  });
  it("answers no on Esc, hides the dialog and keeps Esc from the page (review I2)", async () => {
    const { asker, target, state } = setup();
    const p = asker.ask("Usunąć?", "text", "Usuń", "Anuluj");
    const other = target.dispatch("keydown", key("Enter"));
    assert.equal(other.prevented || other.stopped, false);
    const esc = target.dispatch("keydown", key("Escape"));
    assert.equal(esc.prevented, true);
    assert.equal(esc.stopped, true);
    assert.equal(state.hidden, 1);
    assert.equal(await p, false);
    assert.equal(asker.pending(), false);
    assert.equal(target.listeners.length, 0);
  });
  it("answers the pending question no when a new one comes", async () => {
    const { asker, answer, shown } = setup();
    const first = asker.ask("A", "", "OK", "Anuluj");
    const second = asker.ask("B", "", "OK", "Anuluj");
    assert.equal(await first, false);
    assert.deepEqual(shown, ["A", "B"]);
    assert.equal(asker.pending(), true);
    answer(0, true);
    answer(1, true);
    assert.equal(await second, true);
    assert.equal(asker.pending(), false);
  });
  it("ends a question another dialog replaced at the next press in the editor", async () => {
    const { asker, target } = setup();
    const p = asker.ask("Usunąć?", "", "Usuń", "Anuluj");
    target.dispatch("pointerdown", { target: "dialog" });
    assert.equal(asker.pending(), true);
    target.dispatch("pointerdown", { target: "editor" });
    assert.equal(await p, false);
    assert.equal(asker.pending(), false);
  });
  it("frees the editor once another dialog replaced the question (review N2)", async () => {
    const target = fakeWindow();
    const clock = { t: 1000, shown: null };
    const asker = createAsker({ confirm: (title) => { clock.shown = title; return new Promise(() => {}); },
      hide() {}, target, inEditor: () => false, shows: (title) => clock.shown === title, now: () => clock.t });
    const p = asker.ask("Usunąć?", "", "Usuń", "Anuluj");
    assert.equal(asker.pending(), true);
    // The app-close guard shows its leave question in the same dialog; the user picks Stay.
    clock.shown = "Opuścić ekran?";
    assert.equal(asker.pending(), false);
    assert.equal(await p, false);
    assert.equal(target.listeners.length, 0);
  });
  it("waits SHOW_GRACE_MS for a question to appear, and lets Esc through once it is gone", async () => {
    const target = fakeWindow();
    const clock = { t: 1000, shown: null };
    const asker = createAsker({ confirm: () => new Promise(() => {}), hide() {}, target, inEditor: () => false,
      shows: (title) => clock.shown === title, now: () => clock.t });
    const p = asker.ask("Usunąć?", "", "Usuń", "Anuluj");
    assert.equal(asker.pending(), true);
    clock.t += 500;
    assert.equal(asker.pending(), true);
    clock.t += 1;
    const esc = target.dispatch("keydown", key("Escape"));
    assert.equal(esc.prevented || esc.stopped, false);
    assert.equal(await p, false);
    assert.equal(asker.pending(), false);
  });
  it("answers no when the editor closes or the dialog fails", async () => {
    const { asker } = setup();
    const p = asker.ask("Usunąć?", "", "Usuń", "Anuluj");
    asker.dismiss();
    assert.equal(await p, false);
    asker.dismiss();
    const failing = createAsker({ confirm: () => Promise.reject(new Error("x")), hide() {}, target: fakeWindow(),
      inEditor: () => false });
    assert.equal(await failing.ask("t", "", "OK", "Anuluj"), false);
  });
});
