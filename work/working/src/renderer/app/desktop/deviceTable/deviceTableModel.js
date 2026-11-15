Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.columnWidths = exports.autoWidths = exports.clampWidth = exports.cellText = exports.layoutFor = exports.LAYOUTS = exports.MIN_COLUMN_WIDTH = exports.visibleColumns = exports.typeOptions = exports.matchesTypes = exports.isBlocked = exports.matchesQuery = exports.sortRows = exports.buildRows = exports.classifyDevice = undefined;
// Pure helpers of the desktop device table. Lookups that pull in app services come in through `names`
// (see deviceTableNames.js), so this module also loads in unit tests.
var ExpanderInputType = require("../../enums/ExpanderInputType.js");
var GetDeviceKey = require("../../logic/GetDeviceKey.js");
var HubGenericName = require("../../logic/HubGenericName.js");
var MeasurementUnit = require("../../logic/MeasurementUnit.js");
var Convert_TimeModel_To_Milliseconds = require("../../logic/Convert_TimeModel_To_Milliseconds.js");
var Command = ExpanderInputType.HubDeviceState_Settings_Command;
var InputState = ExpanderInputType.ExpanderInputState;
var collator = new Intl.Collator("pl", {
  numeric: true,
  sensitivity: "base"
});
var isNil = function (value) {
  return value === null || value === undefined;
};
var normalize = function (text) {
  return String(text ?? "").normalize("NFD").replace(/\p{M}/gu, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase();
};
var enumText = function (t, prefix, enumType, value, lower) {
  var name = isNil(value) ? undefined : enumType[value];
  return name === undefined ? "" : t(`${prefix}.${lower ? name.toLowerCase() : name}`);
};
var errorText = function (t, codes) {
  return codes.map(function (code) {
    return t(`common.options.device.error-codes.values.${ExpanderInputType.HubDeviceState_ErrorCode[code]}`);
  }).join(", ");
};
// Live state of a device: the state stream first (since 1.2.0 Realm keeps no state), then a state on the device itself.
var deviceState = function (device, states) {
  return states?.get((0, GetDeviceKey.GetDeviceKey)(device.key)) ?? device.state ?? {};
};
// Inputs follow the INPUT_STATE rule and outputs the on/off or open/close capability; a device can be both or neither.
var classifyDevice = exports.classifyDevice = function (device, state, names) {
  var options = state?.settings?.options ?? [];
  return {
    input: names.isInput(device.type, Number(device.key.uuidChannel)),
    output: options.includes(Command.SET_ON_OFF) || options.includes(Command.SET_OPEN_CLOSE)
  };
};
function channelName(device, names) {
  var channel = Number(device.key.uuidChannel);
  return channel > 0 ? names.channelName(device.type, channel) ?? "" : "";
}
function reactionText(t, device, names) {
  var name = ExpanderInputType.InputReactionType[device.inputReactionType];
  if (name === undefined) {
    return "";
  }
  var tamper = names.isTamper(device.type, Number(device.key.uuidChannel));
  return t(`common.options.device.input_alarm_type.values.${name.toLowerCase()}${tamper ? "_sabotage" : ""}`);
}
function inputStateText(t, settings) {
  var text = enumText(t, "widgets.expander.input-state-values", InputState, settings.inputState, true);
  if (text || typeof settings.violation !== "boolean") {
    return text;
  }
  return t(`widgets.expander.input-state-values.${settings.violation ? "violation" : "normal"}`);
}
function errorsText(t, errorCodes, memoryCodes) {
  var current = errorText(t, errorCodes);
  var memory = errorText(t, memoryCodes.filter(function (code) {
    return !errorCodes.includes(code);
  }));
  var inMemory = memory ? `${t("device_table.in_memory")}: ${memory}` : "";
  return [current, inMemory].filter(Boolean).join("; ");
}
var isBlocked = exports.isBlocked = function (settings) {
  return settings.blockUnblock === true;
};
// Read-only rows for the table, built from data the app already holds.
exports.buildRows = function (t, rooms, states, names) {
  var rows = [];
  rooms.forEach(function (entry) {
    var roomName = names.roomName(t, entry.room);
    (entry.room.devices ?? []).forEach(function (device) {
      var state = deviceState(device, states);
      var settings = state.settings ?? {};
      var errorCodes = state.errorCodes ?? [];
      var memoryCodes = state.errorCodesMemory ?? [];
      var kind = classifyDevice(device, state, names);
      var on = settings.onOff ?? settings.openClose;
      var mainBoard = device.type === ExpanderInputType.HubDeviceType.MAIN_BOARD;
      var deviceType = names.deviceName(device.type) ?? "";
      var typeLabel = mainBoard ? t("device_table.main_board") : deviceType;
      rows.push({
        id: `${device.key.uuid}-${device.key.uuidChannel}`,
        key: device.key,
        category: device.category,
        kind: kind,
        name: device.name ?? "",
        room: roomName,
        roomId: entry.room.id,
        deviceTypeId: device.type,
        deviceType: deviceType,
        typeLabel: typeLabel,
        module: mainBoard ? typeLabel : [deviceType, device.key.uuid].filter(Boolean).join(" "),
        moduleTitle: HubGenericName.DeviceGenericNameMap.get(device.type) ?? "",
        channel: channelName(device, names),
        orderNumber: device.orderNumber ?? 0,
        signal: isNil(settings.signal) ? "" : `${settings.signal}%`,
        power: !isNil(settings.voltageSupply) ? `${Number(settings.voltageSupply).toFixed(2)}V` : !isNil(settings.battery) ? `${settings.battery}%` : "",
        blocked: isBlocked(settings),
        blockedText: isBlocked(settings) ? t("device_table.yes") : "",
        errors: errorsText(t, errorCodes, memoryCodes),
        hasErrors: errorCodes.length > 0,
        hasErrorsInMemory: memoryCodes.length > 0,
        violated: settings.violation === true || settings.inputState === InputState.VIOLATION || settings.inputState === InputState.VIOLATION_AND_MASKING,
        tampered: settings.inputState === InputState.SABOTAGE || settings.inputState === InputState.MASKING || settings.inputState === InputState.VIOLATION_AND_MASKING,
        circuit: enumText(t, "common.options.device.expander-input-type.values", ExpanderInputType.ExpanderInputType, settings.inputType),
        inputValue: isNil(settings.inputValue) ? "" : `${Math.round(Number(settings.inputValue) * 10) / 10}${MeasurementUnit.MeasurementUnit.Ohm}`,
        sensitivity: isNil(settings.inputSensitivity) ? "" : `${settings.inputSensitivity} ms`,
        reaction: reactionText(t, device, names),
        countTime: isNil(settings.blindSensorImpulsesTime) ? "" : `${settings.blindSensorImpulsesTime} s`,
        count: isNil(settings.blindSensorImpulsesCount) ? "" : String(settings.blindSensorImpulsesCount),
        inputState: inputStateText(t, settings),
        state: isNil(on) ? "" : t(on ? "device_table.on" : "device_table.off"),
        outputReaction: enumText(t, "common.options.device.output_reaction_type.values", ExpanderInputType.OutputReactionType, device.outputReactionType, true),
        duration: isNil(settings.durationTime) ? "" : (0, Convert_TimeModel_To_Milliseconds.Convert_Milliseconds_To_HHMMSS)(settings.durationTime)
      });
    });
  });
  return rows;
};
exports.matchesQuery = function (row, query) {
  var haystack = normalize(`${row.name} ${row.room} ${row.module}`);
  return normalize(query).split(/\s+/).filter(Boolean).every(function (part) {
    return haystack.includes(part);
  });
};
// An empty type selection, or one with no type present in `available`, does not filter.
exports.matchesTypes = function (row, types, available) {
  var active = (types ?? []).filter(function (type) {
    return !available || available.includes(type);
  });
  return active.length === 0 || active.includes(row.deviceTypeId);
};
// One chip per device type present in `rows`, counted in `counted` (rows after the other filters).
exports.typeOptions = function (rows, counted) {
  var options = new Map();
  rows.forEach(function (row) {
    if (!options.has(row.deviceTypeId)) {
      options.set(row.deviceTypeId, {
        id: row.deviceTypeId,
        label: row.typeLabel,
        count: 0
      });
    }
  });
  counted.forEach(function (row) {
    var option = options.get(row.deviceTypeId);
    if (option) {
      option.count += 1;
    }
  });
  return Array.from(options.values()).sort(function (left, right) {
    return collator.compare(left.label, right.label);
  });
};
// Columns (keys) without a value in any of `rows` are left out; the last column left takes the free width.
exports.visibleColumns = function (columns, rows) {
  var shown = columns.filter(function (column) {
    return rows.some(function (row) {
      return !isNil(row[column]) && row[column] !== "";
    });
  });
  return shown.length === columns.length ? columns : shown;
};
var COMMON_END = ["signal", "power", "blockedText", "errors"];
// Column keys per window width and tab. Module follows the room in every layout, so it stays on screen.
var LAYOUTS = exports.LAYOUTS = {
  wide: {
    input: ["name", "room", "module", "channel", "deviceType", "circuit", "inputValue", "sensitivity", "reaction", "countTime", "count", "inputState"].concat(COMMON_END),
    output: ["name", "room", "module", "channel", "deviceType", "state", "outputReaction", "duration"].concat(COMMON_END),
    other: ["name", "room", "module", "channel", "deviceType"].concat(COMMON_END)
  },
  medium: {
    input: ["name", "room", "module", "channel", "circuit", "inputValue", "sensitivity", "reaction", "inputState"].concat(COMMON_END),
    output: ["name", "room", "module", "channel", "state", "outputReaction", "duration"].concat(COMMON_END),
    other: ["name", "room", "module", "channel", "deviceType"].concat(COMMON_END)
  },
  narrow: {
    input: ["name", "room", "module", "channel", "circuit", "reaction", "inputState", "errors"],
    output: ["name", "room", "module", "channel", "state", "outputReaction", "duration", "errors"],
    other: ["name", "room", "module", "errors"]
  }
};
exports.layoutFor = function (windowWidth, tab) {
  return LAYOUTS[windowWidth >= 1750 ? "wide" : windowWidth >= 1300 ? "medium" : "narrow"][tab];
};
// Text shown in a cell; the name tells a device that is both an input and an output.
var cellText = exports.cellText = function (row, column) {
  if (column === "name") {
    return `${row.name ?? ""}${row.kind?.input && row.kind?.output ? " (We/Wy)" : ""}`;
  }
  return isNil(row[column]) ? "" : String(row[column]);
};
var MIN_COLUMN_WIDTH = exports.MIN_COLUMN_WIDTH = 40;
var MAX_AUTO_WIDTH = 320;
var CELL_PADDING = 12;
var clampWidth = exports.clampWidth = function (width, max) {
  return Math.min(max ?? Infinity, Math.max(MIN_COLUMN_WIDTH, Math.ceil(width)));
};
// Width that fits the longest text of a column (header or cell). `measure(text, "header" | "cell")` gives pixels.
exports.autoWidths = function (columns, rows, measure, headers) {
  var widths = {};
  columns.forEach(function (column) {
    var longest = measure(headers?.[column] ?? "", "header");
    rows.forEach(function (row) {
      var text = cellText(row, column);
      if (text) {
        longest = Math.max(longest, measure(text, "cell"));
      }
    });
    widths[column] = clampWidth(longest + CELL_PADDING, MAX_AUTO_WIDTH);
  });
  return widths;
};
// Widths set by the user win over the automatic ones; a stored value that is not a number is ignored.
exports.columnWidths = function (columns, auto, stored) {
  var widths = {};
  columns.forEach(function (column) {
    var own = stored?.[column];
    widths[column] = typeof own === "number" && Number.isFinite(own) ? clampWidth(own) : auto[column] ?? MIN_COLUMN_WIDTH;
  });
  return widths;
};
exports.sortRows = function (rows, sort) {
  var direction = sort.descending ? -1 : 1;
  return rows.slice().sort(function (left, right) {
    var result = sort.column ? collator.compare(String(left[sort.column] ?? ""), String(right[sort.column] ?? "")) : collator.compare(left.room, right.room) || collator.compare(left.name, right.name);
    return direction * result || left.orderNumber - right.orderNumber;
  });
};
