// Encoder of the TSH screens blob (PROJEKT-TSH.md 2.1-2.4): model of screens and widgets -> bytes with checksums.
// Pure functions, no Node-only APIs. tshBlob.js is the entry point and re-exports encodeBlob; the model typedefs
// are documented there.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeBlob = exports.MAX_BLOB_SIZE = exports.WIDGET_FIXED = exports.MAX_WIDGET_LENGTH = undefined;
var TshFormat = require("./tshFormat.js");
var TshBytes = require("./tshBytes.js");
var TshWidgetData = require("./tshWidgetData.js");
var ST = TshFormat.SCREEN_TYPE;
var NAME_LENGTH_OFFSET = TshFormat.NAME_LENGTH_OFFSET;
// Largest widget size code, byte 7 bits 0-1 (2.3).
var WF_SIZE_MAX = TshFormat.WIDGET_FLAG.SIZE_MASK;
var WF_KNOWN = TshFormat.WIDGET_FLAG_KNOWN;
var SF_KNOWN = TshFormat.SCREEN_FLAG_KNOWN;
// Builds an issue. Returns it.
var issue = function (code, detail, extra) {
  return Object.assign({
    code: code,
    detail: detail
  }, extra);
};
// Largest value of a u16 field (record length, record offset).
var U16_MAX = 0xffff;
// Last byte offset a record may end at: directory offsets and lengths are u16 (2.1). Exported for the size counter.
exports.MAX_BLOB_SIZE = U16_MAX;
// Largest widget length L: the high byte of the u16 must stay 0 (PROJEKT-TSH.md 2.3).
var MAX_WIDGET_LENGTH = exports.MAX_WIDGET_LENGTH = 255;
// Fixed bytes of a widget before the payload: length, x, y, type, flags, 3 colors (2.3).
var WIDGET_FIXED = exports.WIDGET_FIXED = 17;
// Screen type codes by model type (2.2).
var TYPE_CODES = {
  theme: ST.THEME,
  screensaver: ST.SCREENSAVER,
  user: ST.USER,
  additional: ST.ADDITIONAL
};
// Order rank of the record types in the directory (2.1).
var TYPE_RANK = {
  theme: 0,
  screensaver: 1,
  user: 2,
  additional: 3
};
// Tells whether v is an integer in 0..max. Returns a boolean.
var inRange = function (v, max) {
  return Number.isInteger(v) && v >= 0 && v <= max;
};
// Converts three colors to 9 bytes. Returns the bytes, or null when a color is not six lowercase hex digits.
var colorBytes = function (colors) {
  if (!Array.isArray(colors) || colors.length !== 3) {
    return null;
  }
  var out = [];
  for (var i = 0; i < 3; i++) {
    var rgb = TshBytes.hexToRgb(colors[i]);
    if (rgb === null) {
      return null;
    }
    out.push(rgb[0], rgb[1], rgb[2]);
  }
  return out;
};
// Records a FIELD_RANGE error unless ok. Returns ok.
var requireField = function (ok, detail, where, errors) {
  if (!ok) {
    errors.push(issue("FIELD_RANGE", detail, where));
  }
  return ok;
};
// Encodes one widget entry. Returns the bytes, or null after pushing errors.
var encodeWidget = function (widget, recordIndex, widgetIndex, errors) {
  if (widget.kind === "raw") {
    return widget.bytes;
  }
  var where = {
    record: recordIndex,
    widget: widgetIndex
  };
  var count = errors.length;
  requireField(inRange(widget.x, U16_MAX), "x " + widget.x + " is not a u16", where, errors);
  requireField(inRange(widget.y, U16_MAX), "y " + widget.y + " is not a u16", where, errors);
  requireField(inRange(widget.type, 255), "type " + widget.type + " is not a byte", where, errors);
  requireField(inRange(widget.size, WF_SIZE_MAX), "size " + widget.size + " is not 0-3", where, errors);
  requireField(inRange(widget.flagsOther, 255) && (widget.flagsOther & WF_KNOWN) === 0,
    "flagsOther " + widget.flagsOther + " is not a byte outside the named flag bits", where, errors);
  var colors = colorBytes(widget.colors);
  requireField(colors !== null, "colors are not three rrggbb strings", where, errors);
  var payload = widget.payload;
  if (widget.data !== null && widget.data !== undefined) {
    var r = TshWidgetData.encodeWidgetData(widget.type, widget.data);
    if (!r.ok) {
      r.errors.forEach(function (e) {
        errors.push(Object.assign({}, e, where));
      });
    }
    payload = r.bytes;
  }
  if (errors.length === count && !(payload instanceof Uint8Array)) {
    errors.push(issue("FIELD_RANGE", "widget has neither typed data nor payload bytes", where));
  }
  if (errors.length > count) {
    return null;
  }
  var length = payload.length + WIDGET_FIXED - 1;
  if (length > MAX_WIDGET_LENGTH) {
    errors.push(issue("WIDGET_TOO_LONG", "widget length " + length + " is above " + MAX_WIDGET_LENGTH, where));
    return null;
  }
  var flags = (widget.useTheme ? TshFormat.WIDGET_FLAG.USE_THEME : 0) |
    (widget.center ? TshFormat.WIDGET_FLAG.CENTER : 0) | widget.size | widget.flagsOther;
  var out = new Uint8Array(length + 2);
  out[1] = length;
  TshBytes.writeU16(out, 2, widget.x);
  TshBytes.writeU16(out, 4, widget.y);
  out[6] = widget.type;
  out[7] = flags;
  out.set(colors, 8);
  out.set(payload, WIDGET_FIXED);
  out[length + 1] = TshBytes.tshChecksum(out);
  return out;
};
// Checks the scalar fields of a screen header. Returns the 9 color bytes, or null after pushing errors.
var checkScreenFields = function (s, index, errors) {
  var where = {
    record: index
  };
  var count = errors.length;
  requireField(inRange(s.id, 255), "id " + s.id + " is not a byte", where, errors);
  requireField(TYPE_CODES[s.type] !== undefined, "unknown screen type " + s.type, where, errors);
  requireField(inRange(s.saverOptions, 255), "saverOptions " + s.saverOptions + " is not a byte", where, errors);
  requireField(inRange(s.flagsOther, 255) && (s.flagsOther & SF_KNOWN) === 0,
    "flagsOther " + s.flagsOther + " is not a byte outside the named flag bits", where, errors);
  requireField(!s.main || s.type === "user", "main is allowed on user screens only", where, errors);
  requireField(Array.isArray(s.layout) && s.layout.length === 5 && s.layout.every(function (v) {
    return inRange(v, 255);
  }), "layout is not 5 bytes", where, errors);
  var colors = colorBytes(s.colors);
  requireField(colors !== null, "colors are not three rrggbb strings", where, errors);
  return errors.length > count ? null : colors;
};
// Encodes the screen header with its checksum. Returns the bytes, or null after pushing errors.
var encodeHeader = function (s, index, colors, errors) {
  var where = {
    record: index
  };
  var name = TshBytes.encodeUtf8(s.name);
  var image = TshBytes.encodeUtf8(s.image);
  var isTheme = s.type === "theme";
  if (isTheme && image.length > TshFormat.THEME_IMAGE_SIZE) {
    errors.push(issue("THEME_IMAGE_TOO_LONG", "theme image is " + image.length + " bytes, the limit is " +
      TshFormat.THEME_IMAGE_SIZE, where));
    return null;
  }
  var imageField = new Uint8Array(isTheme ? TshFormat.THEME_IMAGE_SIZE : image.length).fill(0x20);
  imageField.set(image);
  var length = NAME_LENGTH_OFFSET + 2 + name.length + imageField.length;
  if (name.length > TshFormat.MAX_FIELD_LENGTH || length > TshFormat.MAX_FIELD_LENGTH) {
    errors.push(issue("HEADER_TOO_LONG", "screen header length " + length + " is above " + TshFormat.MAX_FIELD_LENGTH,
      where));
    return null;
  }
  var out = new Uint8Array(length + 2);
  out[1] = length;
  out.set(s.layout, 2);
  out[7] = (s.useTheme ? TshFormat.SCREEN_FLAG.USE_THEME : 0) | (s.grid ? TshFormat.SCREEN_FLAG.GRID : 0) |
    s.flagsOther;
  out.set(colors, 8);
  out[17] = TYPE_CODES[s.type] | (s.main ? TshFormat.MAIN_SCREEN_BIT : 0);
  out[18] = s.saverOptions;
  out[NAME_LENGTH_OFFSET] = name.length;
  out.set(name, NAME_LENGTH_OFFSET + 1);
  var at = NAME_LENGTH_OFFSET + 1 + name.length;
  out[at] = s.id;
  out[at + 1] = imageField.length;
  out.set(imageField, at + 2);
  out[length + 1] = TshBytes.tshChecksum(out);
  return out;
};
// Encodes one record: raw bytes verbatim, or header plus widgets. Returns the bytes, or null after pushing errors.
var encodeRecord = function (rec, index, errors) {
  if (rec.kind === "raw") {
    return rec.bytes;
  }
  var count = errors.length;
  var colors = checkScreenFields(rec, index, errors);
  var header = colors && encodeHeader(rec, index, colors, errors);
  var parts = rec.widgets.map(function (w, i) {
    return encodeWidget(w, index, i, errors);
  });
  if (errors.length > count || !header) {
    return null;
  }
  var size = parts.reduce(function (n, p) {
    return n + p.length;
  }, header.length);
  var out = new Uint8Array(size);
  out.set(header);
  var at = header.length;
  parts.forEach(function (p) {
    out.set(p, at);
    at += p.length;
  });
  return out;
};
// Checks the record order theme, screensaver, user..., additional... Returns an issue or null (first violation).
var checkOrder = function (records) {
  var last = 0;
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    if (r.kind === "raw") {
      continue;
    }
    var rank = TYPE_RANK[r.type];
    if (rank === undefined) {
      continue;
    }
    var expected = i === 0 ? "theme" : i === 1 ? "screensaver" : null;
    if (rank < last || (expected !== null && r.type !== expected) || (expected === null && rank < 2)) {
      return issue("RECORD_ORDER", "record " + i + " (" + r.type + ") is out of order", {
        record: i
      });
    }
    last = rank;
  }
  return null;
};
// Checks the blob-level limits and the theme layout. Returns issues.
var validateBlob = function (blob) {
  var errors = [];
  if (blob.version !== TshFormat.BLOB_VERSION) {
    errors.push(issue("VERSION", "unsupported version " + blob.version));
  }
  var known = Object.values(TshFormat.RESOLUTIONS).some(function (r) {
    return r.width === blob.width && r.height === blob.height;
  });
  if (!known) {
    errors.push(issue("RESOLUTION", "unsupported resolution " + blob.width + "x" + blob.height));
  }
  if (blob.records.length > TshFormat.MAX_RECORDS) {
    errors.push(issue("TOO_MANY_RECORDS", blob.records.length + " records, the limit is " + TshFormat.MAX_RECORDS));
  }
  var users = blob.records.filter(function (r) {
    return r.kind === "screen" && r.type === "user";
  }).length;
  if (users > TshFormat.MAX_USER_SCREENS) {
    errors.push(issue("TOO_MANY_USER_SCREENS", users + " user screens, the limit is " + TshFormat.MAX_USER_SCREENS));
  }
  var order = checkOrder(blob.records);
  if (order) {
    errors.push(order);
  }
  if (known) {
    var expected = [blob.width >> 8, blob.width & 0xff, blob.height >> 8, blob.height & 0xff];
    blob.records.forEach(function (r, i) {
      var l = r.kind === "screen" && r.type === "theme" && Array.isArray(r.layout) ? r.layout : null;
      if (l && expected.some(function (v, k) {
        return l[k] !== v;
      })) {
        errors.push(issue("THEME_LAYOUT", "theme layout does not match " + blob.width + "x" + blob.height, {
          record: i
        }));
      }
    });
  }
  return errors;
};
// Checks the 16-bit sizes of the encoded records. Returns issues (one BLOB_TOO_LARGE at most).
var checkSizes = function (parts) {
  var errors = [];
  var end = TshFormat.HEADER_SIZE;
  var blobIssue = false;
  parts.forEach(function (p, i) {
    if (p === null) {
      return;
    }
    end += p.length;
    if (p.length > U16_MAX) {
      errors.push(issue("RECORD_TOO_LARGE", "record is " + p.length + " bytes, the limit is " + U16_MAX, {
        record: i
      }));
    } else if (end > U16_MAX && !blobIssue) {
      blobIssue = true;
      errors.push(issue("BLOB_TOO_LARGE", "record " + i + " ends at " + end + ", the limit is " + U16_MAX, {
        record: i
      }));
    }
  });
  return errors;
};
// Builds the blob: global header, directory, records, 0xab padding. Returns bytes.
var assemble = function (blob, records) {
  var end = records.reduce(function (n, r) {
    return n + r.length;
  }, TshFormat.HEADER_SIZE);
  var padding = (TshFormat.PAD_BLOCK - end % TshFormat.PAD_BLOCK) % TshFormat.PAD_BLOCK;
  var out = new Uint8Array(end + padding).fill(TshFormat.PAD_BYTE);
  out.fill(0, 0, TshFormat.HEADER_SIZE);
  out[0] = blob.version;
  TshBytes.writeU16(out, 1, blob.width);
  TshBytes.writeU16(out, 3, blob.height);
  out[5] = records.length;
  var at = TshFormat.HEADER_SIZE;
  records.forEach(function (r, i) {
    var o = TshFormat.DIR_OFFSET + TshFormat.DIR_ENTRY_SIZE * i;
    out[o] = blob.records[i].id;
    TshBytes.writeU16(out, o + 1, at);
    TshBytes.writeU16(out, o + 3, r.length);
    TshBytes.writeU32(out, o + 5, TshBytes.byteSum(r));
    out.set(r, at);
    at += r.length;
  });
  return out;
};
// Tells whether v is a non-null object. Returns a boolean.
var isObject = function (v) {
  return typeof v === "object" && v !== null;
};
// Checks the shape of one widget entry. Returns an issue detail or null.
var widgetShape = function (w) {
  if (!isObject(w)) {
    return "widget is not an object";
  }
  if (w.kind === "raw") {
    return w.bytes instanceof Uint8Array ? null : "raw widget bytes are not a Uint8Array";
  }
  return Number.isInteger(w.type) ? null : "widget type " + w.type + " is not an integer";
};
// Checks the shape of one record. Returns an issue detail or null; widget problems come as { widget, detail }.
var recordShape = function (r) {
  if (!isObject(r)) {
    return { detail: "record is not an object" };
  }
  if (r.kind === "raw") {
    if (!(r.bytes instanceof Uint8Array)) {
      return { detail: "raw record bytes are not a Uint8Array" };
    }
    return inRange(r.id, 255) ? null : { detail: "raw record id " + r.id + " is not a byte" };
  }
  if (typeof r.name !== "string" || typeof r.image !== "string") {
    return { detail: "screen name and image must be strings" };
  }
  if (TshBytes.hasLoneSurrogate(r.name) || TshBytes.hasLoneSurrogate(r.image)) {
    return { detail: "screen name or image has a lone surrogate" };
  }
  if (!Array.isArray(r.widgets)) {
    return { detail: "screen widgets are not an array" };
  }
  for (var i = 0; i < r.widgets.length; i++) {
    var d = widgetShape(r.widgets[i]);
    if (d !== null) {
      return { widget: i, detail: d };
    }
  }
  return null;
};
// Checks that the model has the shape the encoder reads, so it never throws on a cloned or edited model.
// Returns FIELD_RANGE issues with record/widget indexes (one per bad record).
var checkShape = function (blob) {
  if (!isObject(blob) || !Array.isArray(blob.records)) {
    return [issue("FIELD_RANGE", "model has no records array")];
  }
  var errors = [];
  blob.records.forEach(function (r, i) {
    var bad = recordShape(r);
    if (bad !== null) {
      errors.push(issue("FIELD_RANGE", bad.detail, bad.widget === undefined ? {
        record: i
      } : {
        record: i,
        widget: bad.widget
      }));
    }
  });
  if (!errors.length && blob.records.length < 2) {
    errors.push(issue("RECORD_ORDER", "a blob needs a theme and a screensaver record"));
  }
  return errors;
};
// Encodes a model to a screens blob, collecting every error in one pass.
// Returns { ok: true, bytes } or { ok: false, errors } (never truncates, never throws on a malformed model).
var encodeBlob = exports.encodeBlob = function (blob) {
  var shape = checkShape(blob);
  if (shape.length) {
    return {
      ok: false,
      errors: shape
    };
  }
  var errors = validateBlob(blob);
  var parts = blob.records.map(function (r, i) {
    return encodeRecord(r, i, errors);
  });
  errors.push.apply(errors, checkSizes(parts));
  if (errors.length) {
    return {
      ok: false,
      errors: errors
    };
  }
  return {
    ok: true,
    bytes: assemble(blob, parts)
  };
};
