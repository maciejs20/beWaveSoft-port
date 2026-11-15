// Tests of the editor model tshEditorModel.js (src/renderer/app/desktop/tshEditor/tshEditorModel.js): loading,
// operations checked against the TSH Soft samples made by the same change, validation and the output object.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { plT, sampleState, hubList, hubState, encoded, uidAt, ok, THEMES, sampleBytes } = require("../../support/tshEditorSupport.js");
const { loadSamples } = require("../../support/tshSamples.js");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const M = require(path.join(dir, "tshEditorModel.js"));
const { encodeBlob, bytesToBase64 } = require(path.join(dir, "tshBlob.js"));

// Bytes of a state without the editor rules (for samples TSH saved without a main screen).
const rawBytes = (state) => encodeBlob(state.blob).bytes;
const codes = (state) => M.validate(state).errors.map((e) => e.code);
const ids = (state) => M.screenEntries(state).map((e) => `${e.type[0]}${e.id}${e.main ? "*" : ""}`);
const fresh = (model = "TSH2_TSH210") => M.loadEditor({ keypad: { model } }, plT);

describe("loadEditor", () => {
  it("creates the fresh TSH blob when the input has no screens blob", () => {
    const r = fresh();
    assert.equal(r.ok, true);
    assert.equal(r.state.changed, true);
    assert.deepEqual(r.issues, []);
    assert.deepEqual(encoded(r.state), sampleBytes("001"));
    assert.equal(fresh("TSG2").state.blob.width, 480);
  });
  it("treats an empty screens blob as missing", () => {
    const r = M.loadEditor({ keypad: { model: "TSH2_TSH210" }, screens_config_base64: "" }, plT);
    assert.deepEqual(encoded(r.state), sampleBytes("001"));
  });
  it("loads a saved blob unchanged", () => {
    const state = sampleState("054");
    assert.equal(state.changed, false);
    assert.deepEqual(encoded(state), sampleBytes("054"));
    assert.equal(state.blob.records.every((r) => r.originId === r.id), true);
  });
  it("refuses an unsupported model, a broken blob and a blob of the other resolution", () => {
    const base64 = loadSamples().get("054").base64;
    const load = (model, b64) => M.loadEditor({ keypad: { model }, screens_config_base64: b64 }, plT).error.code;
    assert.equal(load("KSG2", base64), "UNSUPPORTED_MODEL");
    assert.equal(M.loadEditor(null, plT).error.code, "UNSUPPORTED_MODEL");
    assert.equal(load("TSH2_TSH210", "!!"), "BLOB_INVALID");
    assert.equal(load("TSH2_TSH210", "AQID"), "BLOB_INVALID");
    assert.equal(load("TSG2", base64), "RESOLUTION_MISMATCH");
  });
  it("reports the issues of a blob with unsupported parts and keeps them", () => {
    const bytes = sampleBytes("005");
    bytes[0x160 + 0x22 + 40] ^= 0xff;
    const r = M.loadEditor({ keypad: { model: "TSH2_TSH210" }, screens_config_base64: bytesToBase64(bytes) }, plT);
    assert.equal(r.ok, true);
    assert.equal(r.issues.length > 0, true);
  });
});

describe("operations reproduce the TSH samples", () => {
  it("applies themes as samples 002, 023 and 064-067", () => {
    const cases = [["001", "black", "002"], ["022", "abstract", "023"], ["063", "ambient", "064"],
      ["064", "collage", "065"], ["065", "gradient1", "066"], ["066", "abstract", "067"]];
    for (const [from, theme, to] of cases) {
      const [index, def] = THEMES[theme];
      assert.deepEqual(rawBytes(ok(M.setTheme(sampleState(from), def, index))), sampleBytes(to), to);
    }
  });
  it("sets the screensaver options as samples 061 and 062", () => {
    assert.deepEqual(encoded(ok(M.setSaverOption(sampleState("060"), M.SAVER_OPTION.NO_CLOCK, true))),
      sampleBytes("061"));
    const both = ok(M.setSaverOption(sampleState("061"), M.SAVER_OPTION.NO_SAVER, true));
    assert.deepEqual(encoded(both), sampleBytes("062"));
    assert.equal(ok(M.setSaverOption(both, M.SAVER_OPTION.NO_CLOCK, false)).blob.records[1].saverOptions, 4);
  });
  it("changes the screen flags and the main screen as samples 044, 045 and 060", () => {
    let s = sampleState("043");
    assert.deepEqual(encoded(ok(M.setMainScreen(s, uidAt(s, 2)))), sampleBytes("044"));
    s = sampleState("044");
    assert.deepEqual(encoded(ok(M.updateScreen(s, uidAt(s, 2), { useTheme: false }))), sampleBytes("045"));
    s = sampleState("059");
    assert.deepEqual(encoded(ok(M.updateScreen(s, uidAt(s, 2), { grid: true }))), sampleBytes("060"));
  });
  it("edits widgets as samples 042, 046, 047 and 072", () => {
    let s = sampleState("041");
    assert.deepEqual(rawBytes(ok(M.updateWidget(s, uidAt(s, 2), 0, { size: 1 }))), sampleBytes("042"));
    s = sampleState("045");
    assert.deepEqual(encoded(ok(M.setWidgetField(s, uidAt(s, 3), 0, ["roomIndex"], 2))), sampleBytes("046"));
    s = sampleState("046");
    assert.deepEqual(encoded(ok(M.changeWidgetVariant(s, uidAt(s, 4), 0, 0x06, plT))), sampleBytes("047"));
    s = sampleState("071");
    assert.deepEqual(encoded(ok(M.changeWidgetVariant(s, uidAt(s, 5), 0, 0x16, plT))), sampleBytes("072"));
  });
  it("keeps the device on a variant switch, where TSH resets it to 0 (sample 081)", () => {
    const s = sampleState("080");
    const next = ok(M.changeWidgetVariant(s, uidAt(s, 5), 0, 0x07, plT));
    assert.equal(next.blob.records[5].widgets[0].data.devIndex, 1);
    assert.deepEqual(encoded(ok(M.setWidgetField(next, uidAt(s, 5), 0, ["devIndex"], 0))), sampleBytes("081"));
  });
  it("adds widgets as sample 005", () => {
    let s = sampleState("004");
    s = ok(M.addWidget(s, uidAt(s, 2), 0x00, plT));
    const r = M.addWidget(s, uidAt(s, 2), 0x00, plT);
    assert.equal(r.index, 1);
    assert.deepEqual(rawBytes(r.state), sampleBytes("005"));
  });
  it("adds an additional screen as sample 054", () => {
    let s = sampleState("053");
    const r = M.addScreen(s, "additional", plT);
    s = ok(M.setWidgetField(r.state, uidAt(s, 11), 0, ["target"], 1));
    assert.equal(r.state.blob.records[18].uid, r.uid);
    assert.deepEqual(encoded(s), sampleBytes("054"));
  });
  it("adds the first user screen as sample 004, marked main (TSH left it unmarked)", () => {
    const s = ok(M.addScreen(sampleState("002"), "user", plT));
    assert.deepEqual(ids(s), ["t253", "s0", "u33*"]);
    s.blob.records[2].main = false;
    assert.deepEqual(rawBytes(s), sampleBytes("004"));
  });
});

describe("screen operations", () => {
  it("numbers new screens from the lowest free id of their range, users before additional screens", () => {
    let s = fresh().state;
    s = ok(M.addScreen(s, "additional", plT));
    s = ok(M.addScreen(s, "user", plT));
    s = ok(M.addScreen(s, "user", plT));
    assert.deepEqual(ids(s), ["t0", "s0", "u33*", "u34", "a1"]);
    assert.deepEqual(M.screenEntries(s).map((e) => e.name),
      ["Motyw", "Wygaszacz", "Ekran 1", "Ekran 2", "Dodatkowy ekran 1"]);
  });
  it("names a new screen with the lowest free number", () => {
    let s = ok(M.addScreen(fresh().state, "user", plT));
    s = ok(M.renameScreen(s, uidAt(s, 2), "Ekran 2"));
    s = ok(M.addScreen(s, "user", plT));
    s = ok(M.addScreen(s, "user", plT));
    assert.deepEqual(M.screenEntries(s).slice(2).map((e) => e.name), ["Ekran 2", "Ekran 1", "Ekran 3"]);
  });
  it("refuses a 17th user screen and an unknown type", () => {
    assert.equal(M.addScreen(sampleState("054"), "user", plT).error.code, "TOO_MANY_USER_SCREENS");
    assert.equal(M.addScreen(sampleState("054"), "theme", plT).error.code, "SCREEN_TYPE");
  });
  it("refuses a screen beyond 38 records and beyond the additional id range", () => {
    let s = fresh().state;
    for (let i = 0; i < 32; i++) s = ok(M.addScreen(s, "additional", plT));
    assert.equal(M.addScreen(s, "additional", plT).error.code, "NO_FREE_ID");
    for (let i = 0; i < 4; i++) s = ok(M.addScreen(s, "user", plT));
    assert.equal(s.blob.records.length, 38);
    assert.equal(M.addScreen(s, "user", plT).error.code, "TOO_MANY_RECORDS");
  });
  it("keeps ids on delete and reuses the freed id for a new screen, reported as reused", () => {
    let s = hubState("054");
    s = ok(M.removeScreen(s, uidAt(s, 4)));
    assert.deepEqual(M.idChanges(s), []);
    s = ok(M.addScreen(s, "user", plT));
    assert.deepEqual(ids(s).slice(2, 5), ["u33*", "u34", "u36"]);
    assert.equal(s.blob.records[17].id, 35);
    assert.deepEqual(M.idChanges(s).map((c) => [c.kind, c.newId, c.name]), [["reused", 35, "Ekran 3"]]);
    assert.equal(M.idChanges(s)[0].hubName, "Ekran 3");
  });
  it("moves the main mark when the main screen is removed", () => {
    const s = sampleState("054");
    assert.deepEqual(ids(ok(M.removeScreen(s, uidAt(s, 2)))).slice(2, 3), ["u34*"]);
    assert.equal(M.removeScreen(s, uidAt(s, 0)).error.code, "NO_SCREEN");
    assert.equal(M.removeScreen(s, 9999).error.code, "NO_SCREEN");
  });
  it("reorders screens within their type only and keeps their ids", () => {
    const s = hubState("054");
    const moved = ok(M.moveScreen(s, uidAt(s, 3), -1));
    assert.deepEqual(ids(moved).slice(2, 5), ["u34", "u33*", "u35"]);
    assert.deepEqual(M.idChanges(moved), []);
    assert.equal(M.moveScreen(s, uidAt(s, 2), -1).error.code, "MOVE_RANGE");
    assert.equal(M.moveScreen(s, uidAt(s, 17), 1).error.code, "MOVE_RANGE");
    assert.equal(M.moveScreen(s, uidAt(s, 1), 1).error.code, "NO_SCREEN");
  });
  it("switches a screen between user and additional with a new id, reported as changed", () => {
    let s = hubState("054");
    s = ok(M.setScreenType(s, uidAt(s, 2), "additional"));
    assert.deepEqual(ids(s).slice(2, 3).concat(ids(s).slice(-2)), ["u34*", "a1", "a2"]);
    assert.deepEqual(M.idChanges(s).map((c) => [c.kind, c.oldId, c.newId]), [["changed", 33, 2]]);
    s = ok(M.setScreenType(s, s.blob.records[18].uid, "user"));
    assert.deepEqual(ids(s).slice(-2), ["u33", "a1"]);
    assert.equal(M.setScreenType(sampleState("054"), uidAt(sampleState("054"), 18), "user").error.code,
      "TOO_MANY_USER_SCREENS");
    assert.equal(M.setScreenType(s, uidAt(s, 0), "user").error.code, "NO_SCREEN");
    assert.equal(ok(M.setScreenType(s, uidAt(s, 2), "user")), s);
  });
  it("keeps a layout without a main screen (sample 041) so through add, remove and type switch", () => {
    const s = sampleState("041");
    const noMain = (state) => {
      assert.deepEqual(M.screenEntries(state).filter((e) => e.main), []);
      assert.deepEqual(M.validate(state).warnings, [{ code: "NO_MAIN_SCREEN" }]);
      assert.deepEqual(codes(state), []);
    };
    noMain(s);
    const added = ok(M.addScreen(s, "additional", plT));
    noMain(added);
    noMain(ok(M.removeScreen(added, uidAt(added, 18))));
    noMain(ok(M.removeScreen(s, uidAt(s, 2))));
    const switched = ok(M.setScreenType(s, uidAt(s, 3), "additional"));
    noMain(switched);
    noMain(ok(M.setScreenType(switched, switched.blob.records[17].uid, "user")));
  });
  it("takes the main mark away on request and does not put it back on add, remove or type switch", () => {
    let s = fresh().state;
    s = ok(M.addScreen(s, "user", plT));
    s = ok(M.addScreen(s, "user", plT));
    assert.deepEqual(ids(s).slice(2), ["u33*", "u34"]);
    s = ok(M.setMainScreen(s, uidAt(s, 2), false));
    assert.deepEqual(ids(s).slice(2), ["u33", "u34"]);
    assert.deepEqual(M.validate(s).warnings, [{ code: "NO_MAIN_SCREEN" }]);
    s = ok(M.addScreen(s, "user", plT));
    s = ok(M.removeScreen(s, uidAt(s, 3)));
    s = ok(M.setScreenType(s, uidAt(s, 2), "additional"));
    assert.deepEqual(ids(s).slice(2), ["u35", "a1"]);
    assert.deepEqual(ids(ok(M.setMainScreen(s, uidAt(s, 2), true))).slice(2), ["u35*", "a1"]);
  });
  it("makes main the first user screen of a layout without user screens, also by a type switch", () => {
    let s = ok(M.addScreen(fresh().state, "additional", plT));
    s = ok(M.setScreenType(s, uidAt(s, 2), "user"));
    assert.deepEqual(ids(s).slice(2), ["u33*"]);
  });
  it("keeps exactly one main screen", () => {
    const s = sampleState("054");
    const next = ok(M.setMainScreen(s, uidAt(s, 5)));
    assert.deepEqual(M.screenEntries(next).filter((e) => e.main).map((e) => e.id), [36]);
    assert.equal(M.setMainScreen(s, uidAt(s, 18)).error.code, "NOT_USER_SCREEN");
  });
  it("gives a screen its own colors only without the theme, and the theme colors back with it", () => {
    let s = sampleState("045");
    const uid = uidAt(s, 2);
    s = ok(M.setScreenColors(s, uid, ["010203", "040506", "070809"]));
    const screen = s.blob.records[2];
    assert.deepEqual([screen.colors[0], screen.widgets[0].colors[0]], ["010203", "010203"]);
    assert.equal(M.setScreenColors(s, uidAt(s, 3), ["010203", "040506", "070809"]).error.code, "USES_THEME");
    s = ok(M.updateScreen(s, uid, { useTheme: true }));
    assert.deepEqual(s.blob.records[2].widgets[1].colors, ["5a5a5f", "56a8de", "e6e6e6"]);
  });
});

describe("widget operations", () => {
  it("keeps a moved widget inside the screen", () => {
    const s = sampleState("024");
    const at = (x, y) => ok(M.moveWidget(s, uidAt(s, 2), 0, x, y)).blob.records[2].widgets[0];
    assert.deepEqual([at(-5, 2000).x, at(-5, 2000).y], [0, 599]);
    assert.deepEqual([at(10.4, 20.6).x, at(10.4, 20.6).y], [10, 21]);
    const g = sampleState("084", "TSG2");
    assert.equal(ok(M.moveWidget(g, uidAt(g, 2), 0, 900, 0)).blob.records[2].widgets[0].x, 479);
  });
  it("does not edit an unsupported widget but removes it", () => {
    const s = sampleState("024");
    const broken = structuredClone(s);
    broken.blob.records[2].widgets[0] = { kind: "raw", bytes: Uint8Array.from([0, 1]), reason: "WIDGET_CHECKSUM" };
    assert.equal(M.moveWidget(broken, uidAt(s, 2), 0, 1, 1).error.code, "WIDGET_NOT_EDITABLE");
    assert.equal(ok(M.removeWidget(broken, uidAt(s, 2), 0)).blob.records[2].widgets.length, 0);
    assert.equal(M.removeWidget(s, uidAt(s, 2), 5).error.code, "NO_WIDGET");
  });
  it("refuses a widget type the table does not offer", () => {
    const s = sampleState("024");
    assert.equal(M.addWidget(s, uidAt(s, 2), 0x15, plT).error.code, "WIDGET_TYPE");
    assert.equal(M.changeWidgetVariant(s, uidAt(s, 2), 0, 0x06, plT).error.code, "WIDGET_TYPE");
    assert.equal(M.addWidget(s, 9999, 0x00, plT).error.code, "NO_SCREEN");
  });
  it("switches widget colors between the screen colors and its own", () => {
    let s = sampleState("024");
    const uid = uidAt(s, 2);
    assert.equal(M.updateWidget(s, uid, 0, { colors: ["000000", "000000", "000000"] }).error.code, "USES_THEME");
    s = ok(M.updateWidget(s, uid, 0, { useTheme: false, center: true }));
    s = ok(M.updateWidget(s, uid, 0, { colors: ["000000", "111111", "222222"] }));
    assert.deepEqual(s.blob.records[2].widgets[0].colors, ["000000", "111111", "222222"]);
    s = ok(M.updateWidget(s, uid, 0, { useTheme: true }));
    assert.deepEqual(s.blob.records[2].widgets[0].colors, ["5a5a5f", "56a8de", "e6e6e6"]);
    assert.equal(s.blob.records[2].widgets[0].center, true);
  });
  it("reorders widgets within the drawing order, at and inside the bounds only", () => {
    let s = sampleState("024");
    const uid = uidAt(s, 2);
    s = ok(M.addWidget(s, uid, 0x00, plT));
    s = ok(M.addWidget(s, uid, 0x17, plT));
    const order = (st) => st.blob.records[2].widgets.map((w) => w.type);
    const before = order(s);
    assert.equal(before.length, 3);
    const last = M.reorderWidget(s, uid, 0, 2);
    assert.equal(last.ok, true);
    assert.equal(last.index, 2);
    assert.deepEqual(order(last.state), [before[1], before[2], before[0]]);
    assert.equal(last.state.changed, true);
    const first = M.reorderWidget(s, uid, 2, 0);
    assert.deepEqual([first.index, order(first.state)], [0, [before[2], before[0], before[1]]]);
    assert.deepEqual(order(M.reorderWidget(s, uid, 1, 2).state), [before[0], before[2], before[1]]);
    assert.deepEqual(order(s), before);
    for (const to of [-1, 3, 1.5]) {
      assert.deepEqual(M.reorderWidget(s, uid, 0, to), { ok: false, error: { code: "MOVE_RANGE" } }, `to ${to}`);
    }
    assert.deepEqual(M.reorderWidget(s, uid, 1, 1), { ok: false, error: { code: "MOVE_RANGE" } });
    assert.deepEqual(M.reorderWidget(s, uid, 3, 0), { ok: false, error: { code: "NO_WIDGET" } });
    assert.deepEqual(M.reorderWidget(s, 9999, 0, 1), { ok: false, error: { code: "NO_SCREEN" } });
  });
  it("reorders an unsupported widget like any other", () => {
    const s = structuredClone(sampleState("024"));
    const raw = { kind: "raw", bytes: Uint8Array.from([0, 1]), reason: "WIDGET_CHECKSUM" };
    s.blob.records[2].widgets.push(raw);
    const r = ok(M.reorderWidget(s, uidAt(s, 2), 1, 0));
    assert.deepEqual(r.blob.records[2].widgets[0], raw);
  });
});

describe("validation and output", () => {
  it("allows no main screen with a warning (as TSH saved it) but refuses more than one", () => {
    assert.deepEqual(codes(sampleState("041")), []);
    assert.deepEqual(M.validate(sampleState("041")).warnings, [{ code: "NO_MAIN_SCREEN" }]);
    assert.deepEqual(M.validate(sampleState("041")).bytes, sampleBytes("041"));
    assert.deepEqual(codes(fresh().state), []);
    assert.deepEqual(M.validate(fresh().state).warnings, []);
    const s = sampleState("054");
    s.blob.records[3].main = true;
    assert.deepEqual(codes(s), ["MAIN_SCREEN_COUNT"]);
  });
  it("reports repeated screen ids", () => {
    const s = sampleState("054");
    s.blob.records[4].id = 33;
    assert.deepEqual(M.validate(s).errors, [{ code: "DUPLICATE_ID", record: 4 }]);
  });
  it("reports a link to a missing additional screen", () => {
    const s = sampleState("054");
    assert.deepEqual(M.validate(ok(M.removeScreen(s, uidAt(s, 18)))).errors,
      [{ code: "LINK_TARGET", record: 11, widget: 0 }]);
  });
  it("refuses a raw theme record of the other resolution", () => {
    const s = fresh().state;
    const theme = encodeBlob(s.blob).bytes.slice(0x160, 0x160 + 0x3c);
    s.blob.records[0] = { kind: "raw", id: 0, bytes: theme, reason: "TEST", uid: 1, originId: 0 };
    assert.deepEqual(codes(s), []);
    s.resolution = "TSG2";
    assert.deepEqual(codes(s).slice(0, 1), ["THEME_RESOLUTION"]);
    s.blob.records[0].bytes = Uint8Array.from([0, 1]);
    assert.equal(codes(s)[0], "THEME_RESOLUTION");
  });
  it("passes codec errors with their record and widget index", () => {
    const main = sampleState("024");
    let s = ok(M.setMainScreen(main, uidAt(main, 2)));
    s = ok(M.setWidgetField(s, uidAt(s, 2), 0, ["text"], "x".repeat(300)));
    s = ok(M.renameScreen(s, uidAt(s, 2), "y".repeat(240)));
    assert.deepEqual(M.validate(s).errors.map((e) => [e.code, e.record, e.widget]),
      [["HEADER_TOO_LONG", 2, undefined], ["TEXT_TOO_LONG", 2, 0]]);
    assert.equal(M.validate(s).size, null);
    assert.deepEqual([M.validate(ok(M.setMainScreen(main, uidAt(main, 2)))).size, M.validate(s).limit], [512, 65535]);
  });
  it("counts the text bytes against the widget and header limits", () => {
    const s = sampleState("024");
    assert.deepEqual(M.fieldBudget(s, uidAt(s, 2), 0, ["text"]), { used: 18, max: 238 });
    assert.deepEqual(M.fieldBudget(s, uidAt(s, 2), null, null), { used: 7, max: 234 });
    assert.deepEqual(M.fieldBudget(s, uidAt(s, 0), null, null), { used: 5, max: 202 });
    const ot = sampleState("072");
    assert.deepEqual(M.fieldBudget(ot, uidAt(ot, 5), 0, ["textOn"]), { used: 7, max: 225 });
    assert.equal(M.fieldBudget(s, uidAt(s, 2), 0, ["missing"]), null);
    assert.equal(M.fieldBudget(s, 9999, null, null), null);
  });
  it("builds the TSH output object with the screens list and the blob", () => {
    const input = { lang: "pl", keypad: { model: "TSH2_TSH210" }, scenes: [],
      screens_config_base64: loadSamples().get("054").base64 };
    const state = M.loadEditor(input, plT).state;
    const r = M.buildOutput(state);
    assert.equal(r.ok, true);
    assert.deepEqual(Object.keys(r.content), ["lang", "keypad", "scenes", "screens_config_base64", "screens"]);
    assert.equal(r.content.screens_config_base64, input.screens_config_base64);
    assert.deepEqual(r.content.screens.slice(0, 3), [
      { screen_name: "Motyw", screen_type: "THEME", screen_id: 255, screen_image: "" },
      { screen_name: "Wygaszacz", screen_type: "SCREENSAVER", screen_id: 0, screen_image: "" },
      { screen_name: "Ekran 1", screen_type: "USER_SCREEN", screen_id: 33, screen_image: "" }]);
    assert.deepEqual(r.content.screens[18], { screen_name: "Dodatkowy ekran 1", screen_type: "ADDITIONAL_SCREEN",
      screen_id: 1, screen_image: "" });
    assert.equal(r.content.screens.length, 19);
    assert.equal(input.screens, undefined);
  });
  it("lists a raw record by the type in its byte 17 and refuses output with errors", () => {
    const s = sampleState("054");
    const bytes = encodeBlob(s.blob).bytes;
    s.blob.records[18] = { kind: "raw", id: 1, bytes: bytes.slice(-64), reason: "TEST", uid: 99, originId: 1 };
    s.blob.records[18].bytes[17] = 4;
    s.blob.records[17] = Object.assign({}, s.blob.records[17], { kind: "raw", bytes: Uint8Array.from([0]) });
    const screens = M.buildOutput(s);
    assert.equal(screens.ok, true);
    assert.deepEqual(screens.content.screens.slice(-1), [{ screen_name: "", screen_type: "ADDITIONAL_SCREEN",
      screen_id: 1, screen_image: "" }]);
    assert.equal(screens.content.screens.length, 18);
    // A raw record may hold widgets the codec did not decode: no count, so the remove question does not say 0.
    assert.deepEqual(M.screenEntries(s).slice(16).map((e) => [e.raw, e.widgets]), [[false, 1], [true, null], [true, null]]);
    const two = sampleState("054");
    two.blob.records[3].main = true;
    assert.deepEqual(M.buildOutput(two).errors, [{ code: "MAIN_SCREEN_COUNT" }]);
  });
  it("describes errors with the screen name and widget number", () => {
    const s = sampleState("024");
    assert.deepEqual(M.describeError({ code: "TEXT_TOO_LONG", record: 2, widget: 0 }, s), {
      key: "tsh_editor.error.TEXT_TOO_LONG", params: { screen: "Ekran 1", widget: 1, detail: "" },
      at: "tsh_editor.error_at_widget" });
    assert.deepEqual(M.describeError({ code: "HEADER_TOO_LONG", record: 2 }, s).at, "tsh_editor.error_at_screen");
    assert.deepEqual(M.describeError({ code: "XYZ", detail: "d" }, null), {
      key: "tsh_editor.error.OTHER", params: { screen: null, widget: null, detail: "d" }, at: null });
    const raw = structuredClone(s);
    raw.blob.records[2] = { kind: "raw", id: 33, bytes: new Uint8Array(), reason: "TEST" };
    assert.equal(M.describeError({ code: "DUPLICATE_ID", record: 2 }, raw).params.screen, "#3");
  });
  it("warns against the hub screen list after a fresh start or with empty hub data, not the loaded blob", () => {
    const screens = hubList(sampleState("054"));
    for (const extra of [{}, { screens_config_base64: "" }]) {
      let s = ok(M.loadEditor(Object.assign({ keypad: { model: "TSH2_TSH210" }, screens }, extra), plT));
      assert.equal(M.idChanges(s).length, 17);
      assert.equal(M.idChanges(s).every((c) => c.kind === "removed"), true);
      s = ok(M.addScreen(s, "user", plT));
      s = ok(M.addScreen(s, "additional", plT));
      const changes = M.idChanges(s);
      assert.deepEqual(changes.filter((c) => c.kind === "reused").map((c) => [c.name, c.newId, c.hubName]),
        [["Ekran 1", 33, "Ekran 1"], ["Dodatkowy ekran 1", 1, "Dodatkowy ekran 1"]]);
      assert.deepEqual(changes.filter((c) => c.kind === "removed").map((c) => c.oldId).slice(0, 2), ["34", "35"]);
      assert.equal(changes.length, 17);
    }
    assert.deepEqual(M.hubScreens({ screens }).slice(0, 1).concat(M.hubScreens({ screens }).slice(-1)),
      [{ id: "33", name: "Ekran 1" }, { id: "1", name: "Dodatkowy ekran 1" }]);
    assert.equal(M.hubScreens({ screens }).length, 17);
    assert.deepEqual(M.hubScreens({}), []);
  });
  it("reports nothing without a hub list and does not report screens the user deleted", () => {
    assert.deepEqual(M.idChanges(ok(M.addScreen(fresh().state, "user", plT))), []);
    const s = hubState("054");
    assert.deepEqual(M.idChanges(ok(M.removeScreen(s, uidAt(s, 5)))), []);
  });
  it("hands YA content whose screens list carries the hub permissions by screen id", () => {
    // Copy of the screen mapping of KeypadSettingsScreen's YA: hub screens (keypadSettings.screens) matched by
    // guid === `${screen_id}`, defaults for new ids; data is the decoded screens_config_base64.
    const ya = (hubScreens, content) => ({
      screens: content.screens.map((item) => {
        const old = hubScreens.find((h) => h.guid === `${item.screen_id}`);
        return Object.assign({ guid: `${item.screen_id}`, defaultScreen: true, availableAfterSignIn: false, users: "00" },
          old ? Object.assign({}, old) : {}, { name: item.screen_name, screenType: item.screen_type });
      }),
      data: new Uint8Array(Buffer.from(content.screens_config_base64, "base64"))
    });
    const screens = hubList(sampleState("054"));
    const hub = screens.map((h) => ({ guid: h.screen_id, name: h.screen_name, users: h.screen_id === "34" ? "11" : "00",
      defaultScreen: false, availableAfterSignIn: h.screen_id === "34" }));
    let s = hubState("054");
    s = ok(M.renameScreen(s, uidAt(s, 3), "Salon"));
    s = ok(M.removeScreen(s, uidAt(s, 4)));
    s = ok(M.addScreen(s, "user", plT));
    const out = M.buildOutput(s);
    assert.equal(out.ok, true);
    const result = ya(hub, out.content);
    assert.deepEqual(result.data, encoded(s));
    assert.deepEqual(M.loadEditor(out.content, plT).state.blob.records.length, s.blob.records.length);
    assert.equal(result.screens.length, 19);
    const byGuid = new Map(result.screens.map((x) => [x.guid, x]));
    assert.deepEqual([byGuid.get("34").name, byGuid.get("34").users, byGuid.get("34").availableAfterSignIn],
      ["Salon", "11", true]);
    assert.deepEqual([byGuid.get("35").name, byGuid.get("35").defaultScreen], ["Ekran 2", false]);
    assert.deepEqual(M.idChanges(s).map((c) => [c.kind, c.name, c.newId, c.hubName]), [["reused", "Ekran 2", 35, "Ekran 3"]]);
    assert.equal(byGuid.get("33").screenType, "USER_SCREEN");
  });
});
