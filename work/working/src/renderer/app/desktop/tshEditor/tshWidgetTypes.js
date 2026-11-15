// Widget type table of the TSH screens editor (PROJEKT-TSH-EDYTOR.md "Warstwy kodu", layer 2): one entry per widget
// type with its name, payload fields, default data and icons, preview look and required data source.
// The property panel builds its forms from the fields; the preview draws each type by its look (tshLayout.js).
// Pure data and functions, no React.
//
/**
 * @typedef {Object} TshFieldDef
 * @property {string} id            unique per type, also the i18n key suffix tsh_editor.field.<id>
 * @property {"text"|"number"|"icon"|"select"|"flags"|"device"|"deviceValue"|"room"|"scene"|"alarmMode"|"link"|
 *   "states"} kind            states: the arm widget list of { icon, color }
 * @property {(string|number)[]} path   location in widget.data, e.g. ["icons", 0]
 * @property {number} [min]          number: smallest value
 * @property {number} [max]          number, icon, states (icon codes): largest value
 * @property {{ value: number, label: string }[]} [options]   select: values with i18n keys
 * @property {{ mask: number, label: string }[]} [bits]       flags: bits with i18n keys; other bits are kept
 * @property {"input"|"output"|"value"} [devices]             device: which devices may be chosen
 */
/**
 * @typedef {Object} TshWidgetTypeDef
 * @property {number} type           byte 6 as stored (tshFormat WIDGET_TYPE)
 * @property {string} key            i18n key suffix tsh_editor.widget.<key>
 * @property {string|null} group     variants of one TSH widget ("Typ" field): input_state, output_state
 * @property {boolean} addable       offered in the "add widget" list (false: preserve only, e.g. type 0x15)
 * @property {boolean} align         byte 7 bit 0x08 "center" is offered
 * @property {null|"input"|"output"|"value"|"room"|"scene"|"alarmMode"|"additional"} source  data the widget needs
 * @property {"text"|"icon"|"indicator"|"rect"} look   how the preview draws it; sizes per size and resolution are in
 *                                  tshLayout.js (measured on TSH Soft previews)
 * @property {TshFieldDef[]} fields
 * @property {function(function(string): string): object|null} defaults   default data (TSH 1.00.005 samples)
 */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.alarmStateIcons = exports.widgetVariants = exports.addableWidgetTypes = exports.widgetTypeDef =
  exports.getField = exports.setField = exports.LINK_BACK = exports.WIDGET_TYPES = exports.DATE_FORMAT =
  exports.ICON = undefined;
var TshFormat = require("./tshFormat.js");
var T = TshFormat.WIDGET_TYPE;
// Default icon codes: char codes of the WDGT font (PROJEKT-TSH.md 3), as TSH 1.00.005 writes them (samples 010-021,
// 047, 081).
var ICON = exports.ICON = {
  OFF: 0x11d,
  ON: 0x11e,
  SCENE_START: [0x120, 0x11f],
  SCENE_STOP: [0x249, 0x249],
  INPUT: [0x121, 0x123],
  OUTPUT: [0x124, 0x126],
  LINK: 0xfa,
  ARM: [0x28e, 0x28f],
  DISARM: [0x28c, 0x28f],
  ARM_TOGGLE: [0x28f, 0x28f],
  ALARM_CLEAR: [0x28d, 0x28f]
};
// Default date format of the Date/time widget (sample 009).
var DATE_FORMAT = exports.DATE_FORMAT = "dd.MM.yyyy hh:mm:ss";
// Link target meaning "back to the previous screen" (PROJEKT-TSH.md 2.3, type 25).
var LINK_BACK = exports.LINK_BACK = 0xff;
// Icons and colors of the four arm states written by TSH (samples 018-021): green, yellow, yellow, red.
var alarmStateIcons = exports.alarmStateIcons = function () {
  return [{
    icon: 0x28e,
    color: "00b27f"
  }, {
    icon: 0x28b,
    color: "ffbb00"
  }, {
    icon: 0x28a,
    color: "ffbb00"
  }, {
    icon: 0x28d,
    color: "ff0000"
  }];
};
// Bits of the scene widget options byte (samples 070, 071).
var SCENE_BITS = [{
  mask: 0x40,
  label: "ask_code"
}, {
  mask: 0x08,
  label: "unavailable_armed"
}];
// Bits of the arm widget options byte (samples 055-057); bits 0-1 "state" are kept, their meaning is unconfirmed.
var ARM_BITS = [{
  mask: 0x40,
  label: "ask_code"
}, {
  mask: 0x10,
  label: "long_press"
}, {
  mask: 0x80,
  label: "logout"
}];
// Largest u16 value (icon codes, sizes).
var U16_MAX = 0xffff;
// Largest decimals of the Value widget offered in the panel; TSH saves 2 in sample 087 [W].
var MAX_DECIMALS = 3;
// Builds a field definition. Returns it.
var field = function (id, kind, path, extra) {
  return Object.assign({
    id: id,
    kind: kind,
    path: path
  }, extra);
};
var iconFields = [field("icon_off", "icon", ["iconOff"], {
  max: U16_MAX
}), field("icon_on", "icon", ["iconOn"], {
  max: U16_MAX
})];
var pairIconFields = [field("icon_off", "icon", ["icons", 0], {
  max: U16_MAX
}), field("icon_on", "icon", ["icons", 1], {
  max: U16_MAX
})];
// Data of an icon widget (device index and two icons). Returns it.
var iconData = function (icons) {
  return function () {
    return {
      devIndex: 0,
      iconOff: icons[0],
      iconOn: icons[1]
    };
  };
};
// Data of a scene widget (sample 017). Returns it.
var sceneData = function (icons) {
  return function () {
    return {
      lead: [0, 0, 0, 0, 0, 0, 0],
      sceneIndex: 0,
      icons: icons.slice(),
      options: 0,
      tail: [0, 0]
    };
  };
};
// Data of an arm widget (samples 018-021, 041). Returns it.
var armData = function (icons) {
  return function () {
    return {
      lead: [0, 0, 0, 0, 0, 0, 0],
      alarmModeIndex: 0,
      icons: icons.slice(),
      options: 0,
      tail: [0, 0],
      states: alarmStateIcons()
    };
  };
};
// Builds a table entry with the common defaults. Returns it.
var entry = function (type, key, props) {
  return Object.assign({
    type: type,
    key: key,
    group: null,
    addable: true,
    align: false,
    source: null,
    look: "icon",
    fields: []
  }, props);
};
var sceneFields = [field("scene", "scene", ["sceneIndex"])].concat(pairIconFields, [field("options", "flags",
  ["options"], {
    bits: SCENE_BITS
  })]);
// The four arm state icons and colors (samples 018-021) are edited as one list; bits 0-1 "state" stay hidden.
var armFields = [field("alarm_mode", "alarmMode", ["alarmModeIndex"])].concat(pairIconFields, [field("options", "flags",
  ["options"], {
    bits: ARM_BITS
  }), field("states", "states", ["states"], {
    max: U16_MAX
  })]);
// The table, in the order of the "add widget" list (TSH 1.00.005 widget list, PROJEKT-TSH.md 2.3).
var WIDGET_TYPES = exports.WIDGET_TYPES = [entry(T.TEXT, "text", {
  look: "text",
  fields: [field("text", "text", ["text"])],
  defaults: function (t) {
    return {
      text: t("tsh_editor.default.text")
    };
  }
}), entry(T.ROOM_STATE, "room_state", {
  look: "indicator",
  source: "room",
  fields: [field("room", "room", ["roomIndex"])],
  defaults: function () {
    return {
      roomIndex: 0
    };
  }
}), entry(T.INPUT_INDICATOR, "input_indicator", {
  look: "indicator",
  group: "input_state",
  source: "input",
  fields: [field("device", "device", ["devIndex"], {
    devices: "input"
  })],
  defaults: function () {
    return {
      devIndex: 0
    };
  }
}), entry(T.INPUT_ICON, "input_icon", {
  group: "input_state",
  source: "input",
  fields: [field("device", "device", ["devIndex"], {
    devices: "input"
  })].concat(iconFields),
  defaults: iconData(ICON.INPUT)
}), entry(T.INPUT_TEXT, "input_text", {
  look: "text",
  group: "input_state",
  addable: false,
  source: "input",
  defaults: function () {
    return null;
  }
}), entry(T.OUTPUT_INDICATOR, "output_indicator", {
  look: "indicator",
  group: "output_state",
  source: "output",
  fields: [field("device", "device", ["devIndex"], {
    devices: "output"
  })],
  defaults: function () {
    return {
      devIndex: 0
    };
  }
}), entry(T.OUTPUT_ICON, "output_icon", {
  group: "output_state",
  source: "output",
  fields: [field("device", "device", ["devIndex"], {
    devices: "output"
  })].concat(iconFields),
  defaults: iconData(ICON.OUTPUT)
}), entry(T.OUTPUT_TEXT, "output_text", {
  look: "text",
  group: "output_state",
  source: "output",
  fields: [field("device", "device", ["devIndex"], {
    devices: "output"
  }), field("text_off", "text", ["textOff"]), field("text_on", "text", ["textOn"])],
  defaults: function (t) {
    return {
      devIndex: 0,
      textOff: t("tsh_editor.default.text_off"),
      textOn: t("tsh_editor.default.text_on")
    };
  }
}), entry(T.DATE_TIME, "date_time", {
  look: "text",
  align: true,
  fields: [field("format", "text", ["format"])],
  defaults: function () {
    return {
      format: DATE_FORMAT
    };
  }
}), entry(T.CONTROL, "control", {
  source: "output",
  fields: [field("device", "device", ["devIndex"], {
    devices: "output"
  })].concat(iconFields),
  defaults: iconData([ICON.OFF, ICON.ON])
}), entry(T.BUTTON, "button", {
  source: "output",
  fields: [field("device", "device", ["devIndex"], {
    devices: "output"
  })].concat(iconFields),
  defaults: iconData([ICON.OFF, ICON.ON])
}), entry(T.RECTANGLE, "rectangle", {
  look: "rect",
  fields: [field("width", "number", ["width"], {
    min: 1,
    max: U16_MAX
  }), field("height", "number", ["height"], {
    min: 1,
    max: U16_MAX
  }), field("transparency", "number", ["transparency"], {
    min: 0,
    max: 0xff
  }), field("border", "number", ["border"], {
    min: 0,
    max: 0xff
  })],
  defaults: function () {
    return {
      width: 255,
      height: 32,
      transparency: 7,
      border: 2
    };
  }
}), entry(T.PANIC, "panic", {
  fields: [field("alarm_kind", "select", ["alarmKind"], {
    options: [{
      value: 0,
      label: "panic"
    }, {
      value: 1,
      label: "fire"
    }, {
      value: 2,
      label: "medical"
    }]
  })],
  defaults: function () {
    return {
      alarmKind: 0
    };
  }
}), entry(T.INFO, "info", {
  fields: [field("text", "text", ["text"])],
  defaults: function (t) {
    return {
      text: t("tsh_editor.default.info")
    };
  }
}), entry(T.LINK, "link", {
  source: "additional",
  fields: [field("target", "link", ["target"]), field("icon", "icon", ["icon"], {
    max: 0xff
  })],
  defaults: function () {
    return {
      lead: 0,
      icon: ICON.LINK,
      target: LINK_BACK
    };
  }
}), entry(T.VALUE, "value", {
  look: "text",
  source: "value",
  align: true,
  fields: [field("device", "device", ["devIndex"], {
    devices: "value"
  }), field("device_value", "deviceValue", ["configIndex"]), field("decimals", "number", ["decimals"], {
    min: 0,
    max: MAX_DECIMALS
  }), field("unit", "text", ["unit"])],
  defaults: function () {
    return {
      devIndex: 0,
      decimals: 0,
      configIndex: 0,
      unit: "%"
    };
  }
}), entry(T.SCENE_START, "scene_start", {
  source: "scene",
  fields: sceneFields,
  defaults: sceneData(ICON.SCENE_START)
}), entry(T.SCENE_STOP, "scene_stop", {
  source: "scene",
  fields: sceneFields,
  defaults: sceneData(ICON.SCENE_STOP)
}), entry(T.ARM, "arm", {
  source: "alarmMode",
  fields: armFields,
  defaults: armData(ICON.ARM)
}), entry(T.DISARM, "disarm", {
  source: "alarmMode",
  fields: armFields,
  defaults: armData(ICON.DISARM)
}), entry(T.ARM_TOGGLE, "arm_toggle", {
  source: "alarmMode",
  fields: armFields,
  defaults: armData(ICON.ARM_TOGGLE)
}), entry(T.ALARM_CLEAR, "alarm_clear", {
  source: "alarmMode",
  fields: armFields,
  defaults: armData(ICON.ALARM_CLEAR)
})];
// Finds the table entry of a widget type. Returns it, or null for a type the table does not know.
var widgetTypeDef = exports.widgetTypeDef = function (type) {
  return WIDGET_TYPES.find(function (d) {
    return d.type === type;
  }) ?? null;
};
// Types offered in the "add widget" list. Returns table entries.
exports.addableWidgetTypes = function () {
  return WIDGET_TYPES.filter(function (d) {
    return d.addable;
  });
};
// Variants of the widget's group a user may switch to (the TSH "Typ" field). Returns table entries ([] if none).
exports.widgetVariants = function (type) {
  var def = widgetTypeDef(type);
  return def && def.group ? WIDGET_TYPES.filter(function (d) {
    return d.group === def.group && (d.addable || d.type === type);
  }) : [];
};
// Reads a field value from widget data. Returns the value (undefined when the path is missing).
exports.getField = function (data, path) {
  return path.reduce(function (v, k) {
    return v === null || v === undefined ? undefined : v[k];
  }, data);
};
// Sets a field value on a copy of widget data (arrays and objects on the path are copied). Returns the new data.
exports.setField = function (data, path, value) {
  if (!path.length) {
    return value;
  }
  var copy = Array.isArray(data) ? data.slice() : Object.assign({}, data);
  copy[path[0]] = exports.setField(data[path[0]], path.slice(1), value);
  return copy;
};
