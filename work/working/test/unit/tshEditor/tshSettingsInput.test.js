// Tests of buildTshSettingsInput in tshSettingsInput.js (src/renderer/app/desktop/tshEditor/tshSettingsInput.js).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { buildTshSettingsInput, tshLanguage } =
  require(path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor/tshSettingsInput.js"));

const deps = { t: (key) => `<${key}>`, sensorUnit: (type) => `u${type}` };
// A hub with every kind of entry the builder filters or maps (sensor type 6 = TEMPERATURE).
const fullSource = () => ({
  language: "cs",
  keypadSettings: { data: Uint8Array.from([1, 2, 3]), keypadModel: 1,
    screens: [{ name: "Ekran 1", screenType: 2, guid: "33" }] },
  scenes: [{ id: "0a", name: "S10" }],
  rooms: [{ devices: { any: true }, configNumber: 3, name: "Salon" },
    { devices: { any: false }, configNumber: 4, name: "Pusty" },
    { devices: { any: true }, configNumber: 0, name: "Bez numeru" }],
  alarms: [{ name: "Pełny", alarm: { isDefault: true, id: "5" } },
    { name: "Noc", alarm: { isDefault: false, id: "0b" } }],
  devices: [
    { orderNumber: 5, name: "Czujka", sensors: [{ type: 6 }, { type: 99 }],
      settings: { violation: false, inputValue: 0 } },
    { orderNumber: 0, name: "Bez numeru", sensors: [], settings: { onOff: true } },
    { orderNumber: 1, name: "Grzejnik", sensors: [],
      settings: { heaterWorkingMode: 60, heaterForcedValue: 21 } },
    { orderNumber: 2, name: "Gniazdko", sensors: [], settings: { onOff: true } },
    { orderNumber: 3, name: "Analog", sensors: [], settings: { inputValue: 120, heaterWorkingMode: 1 } }
  ]
});

describe("buildTshSettingsInput", () => {
  it("builds the object TSH Soft received, with the same keys in the same order", () => {
    const expected = {
      lang: "cz",
      screens_config_base64: "AQID",
      keypad: { model: "TSG2" },
      scenes: [{ scene_index: 10, name: "S10" }],
      screens: [{ screen_name: "Ekran 1", screen_type: "USER_SCREEN", screen_id: "33", screen_image: "" }],
      rooms: [{ room_index: 3, name: "Salon" }, { name: "Bez numeru" }],
      alarm_modes: [{ name: "Pełny", alarm_mode_index: 1 }, { name: "Noc", alarm_mode_index: 11 }],
      devices: [
        { dev_index: 4, name: "Czujka", has_input: 1, dev_values: [
          { name: "<hub-environmental-data.types.TEMPERATURE>", config_index: 2, unit: "u6" },
          { name: "<device.details.common.input_value>", config_index: 1, unit: "Ω" }] },
        { dev_index: 0, name: "Grzejnik", has_thermostat: 1, has_on_off: 1, dev_values: [
          { name: "<device.settings.desired_temperature>", config_index: 13, unit: "°C" }] },
        { dev_index: 1, name: "Gniazdko", has_on_off: 1 },
        { dev_index: 2, name: "Analog", has_analog: 1, has_on_off: 1, dev_values: [
          { name: "<device.details.common.input_value>", config_index: 1, unit: "Ω" }] }
      ]
    };
    assert.equal(JSON.stringify(buildTshSettingsInput(fullSource(), deps)), JSON.stringify(expected));
  });
  it("leaves out the blob without data and the screens without a screens list", () => {
    const source = Object.assign(fullSource(), { keypadSettings: { keypadModel: 0 } });
    const got = buildTshSettingsInput(source, deps);
    assert.deepEqual(Object.keys(got), ["lang", "keypad", "scenes", "rooms", "alarm_modes", "devices"]);
    assert.deepEqual(got.keypad, { model: "TSH2_TSH210" });
  });
  it("writes an empty blob as an empty string, as the original did", () => {
    const empty = { data: new Uint8Array(), keypadModel: 0, screens: [] };
    const source = Object.assign(fullSource(), { keypadSettings: empty });
    const got = buildTshSettingsInput(source, deps);
    assert.equal(got.screens_config_base64, "");
    assert.deepEqual(got.screens, []);
  });
  it("lists every device value in the original order", () => {
    const device = { orderNumber: 1, name: "Wszystko", sensors: [{ type: 11 }, { type: 10 }, { type: 9 }, { type: 8 }],
      settings: { shutterValue: 1, shutterInclinationValue: 2, heaterForcedValue: 3, inputValue: 4, voltageSupply: 5,
        colorBrighteningValue: 6 } };
    const got = buildTshSettingsInput(Object.assign(fullSource(), { devices: [device] }), deps).devices[0];
    assert.deepEqual(got.dev_values.map((v) => [v.config_index, v.unit]),
      [[6, "u11"], [5, "u10"], [4, "u9"], [3, "u8"], [8, "%"], [9, "%"], [13, "°C"], [1, "Ω"], [10, "V"], [14, "%"]]);
    assert.deepEqual(Object.keys(got), ["dev_index", "name", "has_analog", "has_on_off", "dev_values"]);
  });
});

describe("tshLanguage", () => {
  it("maps the five differing languages and keeps the others", () => {
    assert.deepEqual(["cs", "NB", "sv", "el", "uk", "pl", "en", undefined].map(tshLanguage),
      ["cz", "no", "se", "gr", "ua", "pl", "en", undefined]);
  });
});
