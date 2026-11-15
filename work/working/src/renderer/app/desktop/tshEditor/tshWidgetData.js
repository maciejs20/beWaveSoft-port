// Typed widget payloads of the TSH screens blob (PROJEKT-TSH.md 2.3): bytes <-> plain data objects.
// One layout per widget type, built from small field readers/writers. Pure functions, no Node-only APIs.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeWidgetData = exports.decodeWidgetData = exports.TYPED_WIDGET_TYPES = undefined;
var TshFormat = require("./tshFormat.js");
var TshBytes = require("./tshBytes.js");
var T = TshFormat.WIDGET_TYPE;
// Builds an issue. Returns it.
var issue = function (code, detail) {
  return {
    code: code,
    detail: detail
  };
};
// Checks an integer 0..max. Returns true when valid.
var isUint = function (v, max) {
  return typeof v === "number" && Math.floor(v) === v && v >= 0 && v <= max;
};
// Field of an unsigned integer of 1 or 2 bytes. Returns a field.
var uint = function (size) {
  var max = size === 1 ? 0xff : 0xffff;
  return {
    decode: function (p, o) {
      return o + size > p.length ? null : {
        value: size === 1 ? p[o] : TshBytes.readU16(p, o),
        end: o + size
      };
    },
    encode: function (v, name, errors) {
      if (!isUint(v, max)) {
        errors.push(issue("FIELD_RANGE", name + " must be an integer 0.." + max));
        return [];
      }
      return size === 1 ? [v] : [v >> 8, v & 0xff];
    }
  };
};
// Field of a text with a one-byte length in bytes. Returns a field.
var text = function () {
  return {
    decode: function (p, o) {
      if (o >= p.length || o + 1 + p[o] > p.length) {
        return null;
      }
      var s = TshBytes.decodeUtf8(p.subarray(o + 1, o + 1 + p[o]));
      return s === null ? null : {
        value: s,
        end: o + 1 + p[o]
      };
    },
    encode: function (v, name, errors) {
      if (typeof v !== "string" || TshBytes.hasLoneSurrogate(v)) {
        errors.push(issue("FIELD_RANGE", name + " must be a string without lone surrogates"));
        return [];
      }
      var b = TshBytes.encodeUtf8(v);
      if (b.length > TshFormat.MAX_FIELD_LENGTH) {
        errors.push(issue("TEXT_TOO_LONG", name + " is " + b.length + " bytes, the limit is " +
          TshFormat.MAX_FIELD_LENGTH));
        return [];
      }
      return [b.length].concat(Array.from(b));
    }
  };
};
// Field of n opaque bytes kept as number[] (fixed but unknown values). Returns a field.
var bytes = function (n) {
  return {
    decode: function (p, o) {
      return o + n > p.length ? null : {
        value: Array.from(p.subarray(o, o + n)),
        end: o + n
      };
    },
    encode: function (v, name, errors) {
      var ok = Array.isArray(v) && v.length === n;
      for (var i = 0; ok && i < n; i++) {
        ok = isUint(v[i], 0xff);
      }
      if (!ok) {
        errors.push(issue("FIELD_RANGE", name + " must be " + n + " bytes"));
        return [];
      }
      return v.slice();
    }
  };
};
// Field of an RGB color as "rrggbb". Returns a field.
var rgb = function () {
  return {
    decode: function (p, o) {
      return o + 3 > p.length ? null : {
        value: TshBytes.rgbToHex(p, o),
        end: o + 3
      };
    },
    encode: function (v, name, errors) {
      var c = TshBytes.hexToRgb(v);
      if (!c) {
        errors.push(issue("FIELD_RANGE", name + " must be a color rrggbb"));
        return [];
      }
      return c;
    }
  };
};
// Field of a fixed list of items, each a record of named fields. Returns a field.
var list = function (n, itemLayout) {
  return {
    decode: function (p, o) {
      var items = [];
      for (var i = 0; i < n; i++) {
        var r = decodeLayout(itemLayout, p, o);
        if (!r) {
          return null;
        }
        items.push(r.value);
        o = r.end;
      }
      return {
        value: items,
        end: o
      };
    },
    encode: function (v, name, errors) {
      if (!Array.isArray(v) || v.length !== n) {
        errors.push(issue("FIELD_RANGE", name + " must have " + n + " items"));
        return [];
      }
      var out = [];
      v.forEach(function (item, i) {
        out = out.concat(encodeLayout(itemLayout, item, name + "[" + i + "]", errors));
      });
      return out;
    }
  };
};
// Field of two u16 numbers as [a, b]. Returns a field.
var pair = function () {
  var u16 = uint(2);
  return {
    decode: function (p, o) {
      var a = u16.decode(p, o);
      var b = a && u16.decode(p, a.end);
      return b ? {
        value: [a.value, b.value],
        end: b.end
      } : null;
    },
    encode: function (v, name, errors) {
      if (!Array.isArray(v) || v.length !== 2) {
        errors.push(issue("FIELD_RANGE", name + " must have 2 numbers"));
        return [];
      }
      return u16.encode(v[0], name + "[0]", errors).concat(u16.encode(v[1], name + "[1]", errors));
    }
  };
};
// Decodes consecutive named fields. Returns { value, end } or null when the bytes run out or are invalid.
var decodeLayout = function (layout, p, o) {
  var value = {};
  for (var i = 0; i < layout.length; i++) {
    var r = layout[i][1].decode(p, o);
    if (!r) {
      return null;
    }
    value[layout[i][0]] = r.value;
    o = r.end;
  }
  return {
    value: value,
    end: o
  };
};
// Encodes named fields of a data object, pushing issues to errors. Returns number[].
var encodeLayout = function (layout, data, name, errors) {
  if (data === null || typeof data !== "object") {
    errors.push(issue("FIELD_RANGE", name + " must be an object"));
    return [];
  }
  var out = [];
  layout.forEach(function (f) {
    out = out.concat(f[1].encode(data[f[0]], f[0], errors));
  });
  return out;
};
var u8 = uint(1);
var u16 = uint(2);
var iconLayout = [["devIndex", u16], ["iconOff", u16], ["iconOn", u16]];
var sceneLayout = [["lead", bytes(7)], ["sceneIndex", u8], ["icons", pair()], ["options", u8], ["tail", bytes(2)]];
var armLayout = [["lead", bytes(7)], ["alarmModeIndex", u8], ["icons", pair()], ["options", u8], ["tail", bytes(2)],
  ["states", list(4, [["icon", u16], ["color", rgb()]])]];
// Payload layout per widget type (2.3). INPUT_TEXT (0x15) is known only from one Satel sample: not typed.
var LAYOUTS = {};
LAYOUTS[T.TEXT] = LAYOUTS[T.INFO] = [["text", text()]];
LAYOUTS[T.DATE_TIME] = [["format", text()]];
LAYOUTS[T.ROOM_STATE] = [["roomIndex", u16]];
LAYOUTS[T.INPUT_INDICATOR] = LAYOUTS[T.OUTPUT_INDICATOR] = [["devIndex", u16]];
LAYOUTS[T.INPUT_ICON] = LAYOUTS[T.OUTPUT_ICON] = LAYOUTS[T.CONTROL] = LAYOUTS[T.BUTTON] = iconLayout;
LAYOUTS[T.OUTPUT_TEXT] = [["devIndex", u16], ["textOff", text()], ["textOn", text()]];
LAYOUTS[T.RECTANGLE] = [["width", u16], ["height", u16], ["transparency", u8], ["border", u8]];
LAYOUTS[T.PANIC] = [["alarmKind", u8]];
LAYOUTS[T.LINK] = [["lead", u8], ["icon", u8], ["target", u8]];
LAYOUTS[T.VALUE] = [["devIndex", u16], ["decimals", u8], ["configIndex", u16], ["unit", text()]];
LAYOUTS[T.SCENE_START] = LAYOUTS[T.SCENE_STOP] = sceneLayout;
LAYOUTS[T.ARM] = LAYOUTS[T.DISARM] = LAYOUTS[T.ARM_TOGGLE] = LAYOUTS[T.ALARM_CLEAR] = armLayout;
// Tells whether the type has an own layout (not an inherited key such as "constructor"). Returns a boolean.
var hasLayout = function (type) {
  return Object.prototype.hasOwnProperty.call(LAYOUTS, type);
};
// Widget types that have a typed payload.
var TYPED_WIDGET_TYPES = exports.TYPED_WIDGET_TYPES = Object.keys(LAYOUTS).map(Number);
// Encodes typed data to payload bytes.
// Returns { ok: true, bytes } or { ok: false, errors } (DATA_TYPE, FIELD_RANGE, TEXT_TOO_LONG).
var encodeWidgetData = exports.encodeWidgetData = function (type, data) {
  var layout = hasLayout(type) ? LAYOUTS[type] : null;
  if (!layout) {
    return {
      ok: false,
      errors: [issue("DATA_TYPE", "widget type 0x" + Number(type).toString(16) + " has no typed payload layout")]
    };
  }
  var errors = [];
  var out = encodeLayout(layout, data, "data", errors);
  return errors.length ? {
    ok: false,
    errors: errors
  } : {
    ok: true,
    bytes: Uint8Array.from(out)
  };
};
// Decodes a payload.
// Returns data, or null when the type is untyped, the bytes are invalid, or re-encoding would differ.
var decodeWidgetData = exports.decodeWidgetData = function (type, payload) {
  var layout = hasLayout(type) ? LAYOUTS[type] : null;
  var r = layout && decodeLayout(layout, payload, 0);
  if (!r || r.end !== payload.length) {
    return null;
  }
  var back = encodeWidgetData(type, r.value);
  if (!back.ok || back.bytes.length !== payload.length) {
    return null;
  }
  for (var i = 0; i < payload.length; i++) {
    if (back.bytes[i] !== payload[i]) {
      return null;
    }
  }
  return r.value;
};
