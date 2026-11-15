// Test helpers for the TSH editor model: Polish default texts as TSH 1.00.005 wrote them, editor states loaded from
// the samples, and the themes of dist/tsh/themes.json the theme samples use.
"use strict";
const path = require("node:path");
const { loadSamples, sampleBytes } = require("./tshSamples.js");
const dir = path.join(__dirname, "../../src/renderer/app/desktop/tshEditor");
const M = require(path.join(dir, "tshEditorModel.js"));

// Polish texts of the i18n keys the model uses (same values as i18n/pl.js and the TSH samples).
const PL = {
  "tsh_editor.default.text": "Nowe pole tekstowe",
  "tsh_editor.default.info": "Informacja",
  "tsh_editor.default.text_off": "Nieaktywne",
  "tsh_editor.default.text_on": "Aktywne",
  "tsh_editor.default.theme_record": "Motyw",
  "tsh_editor.default.saver_record": "Wygaszacz",
  "tsh_editor.default.user_screen": "Ekran {{n}}",
  "tsh_editor.default.additional_screen": "Dodatkowy ekran {{n}}"
};
// i18next-like t over PL with {{name}} interpolation. Returns the text (the key when unknown).
function plT(key, params) {
  return (PL[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name) => String(params?.[name]));
}
// Editor state of a sample loaded as the given keypad model. Returns the state (throws when the load fails).
function sampleState(id, model = "TSH2_TSH210") {
  const r = M.loadEditor({ keypad: { model }, screens_config_base64: loadSamples().get(id).base64 }, plT);
  if (!r.ok) throw new Error(`sample ${id} did not load: ${r.error.code}`);
  return r.state;
}
// Hub screen list (input.screens) as tshSettingsInput builds it from keypadSettings.screens: guid strings as
// screen_id. Returns [{ screen_name, screen_type, screen_id, screen_image }].
function hubList(state) {
  return M.buildOutput(state).content.screens.map((h) => Object.assign({}, h, { screen_id: String(h.screen_id) }));
}
// Editor state of a sample whose input also has the hub screen list of the same sample (as after a hub read).
// Returns the state.
function hubState(id, model = "TSH2_TSH210") {
  const screens = hubList(sampleState(id, model));
  const r = M.loadEditor({ keypad: { model }, screens_config_base64: loadSamples().get(id).base64, screens }, plT);
  if (!r.ok) throw new Error(`sample ${id} did not load: ${r.error.code}`);
  return r.state;
}
// Encoded bytes of a state. Returns a Uint8Array (throws on validation errors).
function encoded(state) {
  const v = M.validate(state);
  if (v.errors.length) throw new Error(`state has errors: ${v.errors.map((e) => e.code).join(", ")}`);
  return v.bytes;
}
// uid of the record at index. Returns the uid.
function uidAt(state, index) {
  return state.blob.records[index].uid;
}
// Unwraps an operation result. Returns the new state (throws on an error result).
function ok(result) {
  if (!result.ok) throw new Error(`operation failed: ${result.error.code}`);
  return result.state;
}
// Themes of themes.json used by the theme samples, with their list index (0 = Abstract).
const THEMES = {
  abstract: [0, { name: "Abstract", backgroundFile: "bg/BG_ABSTRACT.jpg",
    colors: { cl3: "#e6e6e6", cl1: "#5a5a5f", cl2: "#56a8de" } }],
  ambient: [1, { name: "Ambient", backgroundFile: "bg/BG_AMBIENT.jpg",
    colors: { cl3: "#583044", cl1: "#ffffff", cl2: "#e6645a" } }],
  black: [2, { name: "black", backgroundFile: null, colors: { cl3: "#000000", cl1: "#9d9d9d", cl2: "#ffffff" } }],
  collage: [4, { name: "Collage", backgroundFile: "bg/BG_COLLAGE.jpg",
    colors: { cl3: "#f1ece6", cl1: "#a0785f", cl2: "#3d4836" } }],
  gradient1: [12, { name: "Gradient_1", backgroundFile: "bg/BG_GRADIENT_1.jpg",
    colors: { cl3: "#b98ecb", cl1: "#ffffff", cl2: "#743278" } }]
};
module.exports = { plT, sampleState, hubList, hubState, encoded, uidAt, ok, THEMES, sampleBytes };
