// Translations of the TSH screens editor (i18n/pl.js and i18n/en.js, block tsh_editor): same keys in both, a text for
// every key the widget table and the model use, and test texts equal to the Polish ones.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { plT } = require("../../support/tshEditorSupport.js");
const app = path.join(__dirname, "../../../src/renderer/app");
const pl = require(path.join(app, "i18n/pl.js")).tsh_editor;
const en = require(path.join(app, "i18n/en.js")).tsh_editor;
const W = require(path.join(app, "desktop/tshEditor/tshWidgetTypes.js"));
const M = require(path.join(app, "desktop/tshEditor/tshEditorModel.js"));

// Flat key list of a nested translation block. Returns ["a.b", ...].
const keys = (o, prefix = "") => Object.entries(o).flatMap(([k, v]) =>
  (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
const get = (o, key) => key.split(".").reduce((v, k) => (v === undefined ? undefined : v[k]), o);

describe("tsh_editor translations", () => {
  it("has the same keys in Polish and English", () => {
    assert.deepEqual(keys(pl).sort(), keys(en).sort());
  });
  it("names every widget type, field, option and flag bit of the table", () => {
    const needed = [];
    for (const def of W.WIDGET_TYPES) {
      needed.push(`widget.${def.key}`);
      for (const f of def.fields) {
        needed.push(`field.${f.id}`);
        (f.options || []).forEach((o) => needed.push(`option.${o.label}`));
        (f.bits || []).forEach((b) => needed.push(`bit.${b.label}`));
      }
    }
    const missing = needed.filter((k) => typeof get(pl, k) !== "string" || typeof get(en, k) !== "string");
    assert.deepEqual(missing, []);
  });
  it("has a message for every error code the model describes", () => {
    const codes = ["MAIN_SCREEN_COUNT", "DUPLICATE_ID", "THEME_RESOLUTION", "LINK_TARGET", "FIELD_RANGE",
      "TEXT_TOO_LONG", "WIDGET_TOO_LONG", "HEADER_TOO_LONG", "THEME_IMAGE_TOO_LONG", "RECORD_TOO_LARGE",
      "BLOB_TOO_LARGE", "TOO_MANY_RECORDS", "TOO_MANY_USER_SCREENS", "RECORD_ORDER", "THEME_LAYOUT", "NO_FREE_ID",
      "UNSUPPORTED_MODEL", "BLOB_INVALID", "RESOLUTION_MISMATCH", "NO_MAIN_SCREEN", "UNKNOWN_CODE"];
    for (const code of codes) {
      const key = M.describeError({ code }, null).key.replace(/^tsh_editor\./, "");
      assert.equal(typeof get(pl, key), "string", code);
      assert.equal(typeof get(en, key), "string", code);
    }
  });
  it("uses the Polish texts in the test helper", () => {
    for (const key of ["default.text", "default.info", "default.text_off", "default.text_on", "default.theme_record",
      "default.saver_record"]) {
      assert.equal(plT(`tsh_editor.${key}`), get(pl, key));
    }
    assert.equal(plT("tsh_editor.default.user_screen", { n: 2 }), get(pl, "default.user_screen").replace("{{n}}", "2"));
  });
});
