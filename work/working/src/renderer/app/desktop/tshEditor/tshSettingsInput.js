// Input object of the TSH screens editor: the JSON that KeypadSettingsScreen wrote to tsh-settings.json for TSH Soft
// (PROJEKT-TSH.md 1). One builder for both paths: the original TSH Soft launch and the desktop editor.
// Pure function; translations and sensor units come in as functions, so it also runs under node --test.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildTshSettingsInput = exports.tshLanguage = undefined;
var ExpanderInputType = require("../../enums/ExpanderInputType.js");
var MeasurementUnit = require("../../logic/MeasurementUnit.js");
// App language -> TSH Soft language file suffix, where they differ (original KeypadSettingsScreen).
var TSH_LANGUAGES = {
  cs: "cz",
  nb: "no",
  sv: "se",
  el: "gr",
  uk: "ua"
};
var SENSOR = ExpanderInputType.HubDeviceState_Sensor_Type;
var UNIT = MeasurementUnit.MeasurementUnit;
// Sensor readings TSH can show: sensor type -> label key and BE WAVE config index (original order).
var SENSOR_VALUES = [[SENSOR.TEMPERATURE, "hub-environmental-data.types.TEMPERATURE", 2],
  [SENSOR.HUMIDITY, "hub-environmental-data.types.HUMIDITY", 3],
  [SENSOR.PRESSURE, "hub-environmental-data.types.PRESSURE", 4],
  [SENSOR.POWER_CONSUMPTION_CURRENT, "hub-environmental-data.types.POWER_CONSUMPTION_CURRENT", 5],
  [SENSOR.POWER_CONSUMPTION_TOTAL, "hub-environmental-data.types.POWER_CONSUMPTION_TOTAL", 6]];
// Device settings TSH can show: setting -> label key, config index and unit (original order).
var SETTING_VALUES = [["shutterValue", "widgets.shutter.opening", 8, UNIT.Percent],
  ["shutterInclinationValue", "widgets.shutter.inclination", 9, UNIT.Percent],
  ["heaterForcedValue", "device.settings.desired_temperature", 13, UNIT.Degree],
  ["inputValue", "device.details.common.input_value", 1, UNIT.Ohm],
  ["voltageSupply", "device.details.common.voltage_supply", 10, UNIT.Voltage],
  ["colorBrighteningValue", "widgets.light.intensity", 14, UNIT.Percent]];
// Heater working mode of a thermostat (original has_thermostat rule).
var THERMOSTAT_MODE = 60;
// Tells whether a value is null or undefined (lodash isNil). Returns a boolean.
var isNil = function (v) {
  return v === null || v === undefined;
};
// Maps the app language to the TSH Soft language code. Returns the code (input unchanged when not mapped).
var tshLanguage = exports.tshLanguage = function (language) {
  return TSH_LANGUAGES[language == null ? undefined : language.toLowerCase()] ?? language;
};
// Readings of one device as TSH dev_values. Returns [{ name, config_index, unit }].
var deviceValues = function (device, t, sensorUnit) {
  var values = [];
  device.sensors.forEach(function (sensor) {
    var known = SENSOR_VALUES.find(function (s) {
      return s[0] === sensor.type;
    });
    if (known) {
      values.push({
        name: t(known[1]),
        config_index: known[2],
        unit: sensorUnit(sensor.type)
      });
    }
  });
  SETTING_VALUES.forEach(function (s) {
    if (!isNil(device.settings?.[s[0]])) {
      values.push({
        name: t(s[1]),
        config_index: s[2],
        unit: s[3]
      });
    }
  });
  return values;
};
// One device as a TSH device entry (original flags and key order). Returns the entry.
var deviceEntry = function (device, t, sensorUnit) {
  var s = device.settings;
  var values = deviceValues(device, t, sensorUnit);
  var output = !isNil(s?.onOff) || !isNil(s?.colorBrighteningValue) || !isNil(s?.colorControl) ||
    !isNil(s?.shutterValue) || !isNil(s?.heaterWorkingMode);
  return Object.assign({
    dev_index: device.orderNumber ? device.orderNumber - 1 : 0,
    name: device.name
  }, isNil(s?.violation) ? {} : {
    has_input: 1
  }, s?.inputValue ? {
    has_analog: 1
  } : {}, isNil(s?.heaterWorkingMode) || s?.heaterWorkingMode !== THERMOSTAT_MODE ? {} : {
    has_thermostat: 1
  }, output ? {
    has_on_off: 1
  } : {}, values.length ? {
    dev_values: values
  } : {});
};
// Builds the TSH input object (same keys, order and values as the original saveTshSettings call).
// source: { language, keypadSettings, scenes, rooms, alarms, devices } as KeypadSettingsScreen holds them;
// deps: { t, sensorUnit(type) }. screens_config_base64 is present whenever keypadSettings.data is (also when empty).
// Returns the plain object.
exports.buildTshSettingsInput = function (source, deps) {
  var settings = source.keypadSettings;
  return Object.assign({
    lang: tshLanguage(source.language)
  }, settings?.data ? {
    screens_config_base64: Buffer.from(settings.data).toString("base64")
  } : {}, {
    keypad: {
      model: (0, ExpanderInputType.keypadSettings_KeypadTypeToJSON)(settings?.keypadModel)
    },
    scenes: source.scenes.map(function (scene) {
      return {
        scene_index: parseInt(scene.id, 16),
        name: scene.name
      };
    })
  }, settings?.screens !== undefined ? {
    screens: settings.screens.map(function (screen) {
      return {
        screen_name: screen.name,
        screen_type: (0, ExpanderInputType.keypadScreen_ScreenTypeToJSON)(screen.screenType),
        screen_id: screen.guid,
        screen_image: ""
      };
    })
  } : {}, {
    rooms: source.rooms.filter(function (room) {
      return room.devices.any;
    }).map(function (room) {
      return Object.assign({}, room.configNumber ? {
        room_index: room.configNumber
      } : {}, {
        name: room.name
      });
    }),
    alarm_modes: source.alarms.map(function (mode) {
      return {
        name: mode.name,
        alarm_mode_index: mode.alarm.isDefault ? 1 : parseInt(mode.alarm.id, 16)
      };
    }),
    devices: source.devices.filter(function (device) {
      return !!device.orderNumber;
    }).map(function (device) {
      return deviceEntry(device, deps.t, deps.sensorUnit);
    })
  });
};
