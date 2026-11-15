// Entry point of the TSH screens blob codec (PROJEKT-TSH.md 2.1-2.4): bytes <-> model of screens and widgets.
// Holds the decoder; the encoder lives in tshBlobEncode.js. Pure functions, no Node-only APIs. Re-exports the
// helpers and size constants the editor needs so it requires only this file.
//
// Model typedefs (colors are lowercase "rrggbb"; unknown fixed bytes are kept as number[]):
/** @typedef {{ version: number, width: number, height: number, records: TshRecord[] }} TshBlob */
/** @typedef {TshScreen | TshRawRecord} TshRecord */
/**
 * @typedef {Object} TshScreen
 * @property {"screen"} kind
 * @property {number} id                 directory id (not unique: theme and saver can both be 0)
 * @property {"theme"|"screensaver"|"user"|"additional"} type   byte 17: 0, 1, 2 (3 = 2 + main), 4
 * @property {boolean} main              byte 17 bit 0x01 on a user screen
 * @property {number[]} layout           bytes 2-6 as read
 * @property {boolean} useTheme          byte 7 bit 0x80
 * @property {boolean} grid              byte 7 bit 0x10
 * @property {number} flagsOther         byte 7 without 0x80 and 0x10
 * @property {string[]} colors           bytes 8-16, three colors
 * @property {number} saverOptions       byte 18
 * @property {string} name
 * @property {string} image              theme: trailing spaces of the 32-byte field removed
 * @property {TshWidgetEntry[]} widgets
 */
/** @typedef {{ kind: "raw", id: number, bytes: Uint8Array, reason: string }} TshRawRecord */
/** @typedef {TshWidget | TshRawWidget} TshWidgetEntry */
/**
 * @typedef {Object} TshWidget
 * @property {"widget"} kind
 * @property {number} x
 * @property {number} y
 * @property {number} type               byte 6 as stored, e.g. 0x23
 * @property {boolean} useTheme          byte 7 bit 0x80
 * @property {boolean} center            byte 7 bit 0x08
 * @property {number} size               byte 7 bits 0-1
 * @property {number} flagsOther         byte 7 without 0x80, 0x08, 0x03
 * @property {string[]} colors           bytes 8-16
 * @property {object|null} data          typed payload or null when not decoded
 * @property {Uint8Array} payload        payload bytes as read; written back only when data is null
 */
/** @typedef {{ kind: "raw", bytes: Uint8Array, reason: string }} TshRawWidget */
/** @typedef {{ code: string, record?: number, widget?: number, detail: string }} TshIssue */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeBlob = exports.decodeBlob = exports.MAX_BLOB_SIZE = exports.WIDGET_FIXED = exports.MAX_WIDGET_LENGTH = exports.NAME_LENGTH_OFFSET = exports.THEME_IMAGE_SIZE = exports.MAX_FIELD_LENGTH = exports.encodeUtf8 = exports.MAX_RECORDS = exports.MAX_USER_SCREENS = exports.WIDGET_TYPE = exports.SCREEN_TYPE = exports.RESOLUTIONS = exports.encodeWidgetData = exports.decodeWidgetData = exports.base64ToBytes = exports.bytesToBase64 = exports.tshChecksum = undefined;
var TshFormat = require("./tshFormat.js");
var TshBytes = require("./tshBytes.js");
var TshWidgetData = require("./tshWidgetData.js");
var TshBlobEncode = require("./tshBlobEncode.js");
exports.tshChecksum = TshBytes.tshChecksum;
exports.bytesToBase64 = TshBytes.bytesToBase64;
exports.base64ToBytes = TshBytes.base64ToBytes;
exports.decodeWidgetData = TshWidgetData.decodeWidgetData;
exports.encodeWidgetData = TshWidgetData.encodeWidgetData;
exports.RESOLUTIONS = TshFormat.RESOLUTIONS;
exports.SCREEN_TYPE = TshFormat.SCREEN_TYPE;
exports.WIDGET_TYPE = TshFormat.WIDGET_TYPE;
exports.MAX_USER_SCREENS = TshFormat.MAX_USER_SCREENS;
exports.MAX_RECORDS = TshFormat.MAX_RECORDS;
exports.encodeUtf8 = TshBytes.encodeUtf8;
exports.MAX_FIELD_LENGTH = TshFormat.MAX_FIELD_LENGTH;
exports.THEME_IMAGE_SIZE = TshFormat.THEME_IMAGE_SIZE;
exports.NAME_LENGTH_OFFSET = TshFormat.NAME_LENGTH_OFFSET;
exports.MAX_WIDGET_LENGTH = TshBlobEncode.MAX_WIDGET_LENGTH;
exports.WIDGET_FIXED = TshBlobEncode.WIDGET_FIXED;
exports.MAX_BLOB_SIZE = TshBlobEncode.MAX_BLOB_SIZE;
exports.encodeBlob = TshBlobEncode.encodeBlob;
var ST = TshFormat.SCREEN_TYPE;
// Screen type names by byte 17 (PROJEKT-TSH.md 2.2); code 3 is a user screen with the main-screen bit.
var TYPE_NAMES = {
  0: "theme",
  1: "screensaver",
  2: "user",
  3: "user",
  4: "additional"
};
var NAME_LENGTH_OFFSET = TshFormat.NAME_LENGTH_OFFSET;
var WF_KNOWN = TshFormat.WIDGET_FLAG_KNOWN;
// Builds an issue. Returns it.
var issue = function (code, detail, extra) {
  return Object.assign({
    code: code,
    detail: detail
  }, extra);
};
// Reads three colors from 9 bytes. Returns lowercase hex strings.
var readColors = function (b) {
  return [TshBytes.rgbToHex(b, 8), TshBytes.rgbToHex(b, 11), TshBytes.rgbToHex(b, 14)];
};
// Fatal checks of the global header. Returns an issue or null.
var checkGlobalHeader = function (bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < TshFormat.HEADER_SIZE) {
    return issue("TOO_SHORT", "blob is shorter than the global header of " + TshFormat.HEADER_SIZE + " bytes");
  }
  if (bytes[0] !== TshFormat.BLOB_VERSION) {
    return issue("VERSION", "unsupported version " + bytes[0]);
  }
  var width = TshBytes.readU16(bytes, 1);
  var height = TshBytes.readU16(bytes, 3);
  var known = Object.values(TshFormat.RESOLUTIONS).some(function (r) {
    return r.width === width && r.height === height;
  });
  if (!known) {
    return issue("RESOLUTION", "unsupported resolution " + width + "x" + height);
  }
  return bytes[5] > TshFormat.MAX_RECORDS ? issue("TOO_MANY_RECORDS", bytes[5] + " directory entries") : null;
};
// Header checks that depend only on the layout and checksum. Returns an issue or null.
var checkHeaderLayout = function (b, id) {
  if (b[0] !== 0) {
    return issue("HEADER_LONG", "header length above 255");
  }
  var hl = b[1];
  var nameLen = b[NAME_LENGTH_OFFSET];
  var imageLenAt = NAME_LENGTH_OFFSET + 2 + nameLen;
  if (hl + 2 > b.length || imageLenAt >= b.length || imageLenAt + 1 + b[imageLenAt] !== hl + 1) {
    return issue("HEADER_LAYOUT", "header length " + hl + " does not fit name and image");
  }
  if (TshBytes.tshChecksum(b) !== b[hl + 1]) {
    return issue("HEADER_CHECKSUM", "header checksum mismatch");
  }
  if (b[imageLenAt - 1] !== id) {
    return issue("RECORD_ID", "record id " + b[imageLenAt - 1] + " != directory id " + id);
  }
  return TYPE_NAMES[b[17]] === undefined ? issue("SCREEN_TYPE", "unknown screen type " + b[17]) : null;
};
// Decodes the text fields of a screen header. Returns { name, image } or an issue.
var decodeHeaderTexts = function (b) {
  var nameLen = b[NAME_LENGTH_OFFSET];
  var imageLenAt = NAME_LENGTH_OFFSET + 2 + nameLen;
  var name = TshBytes.decodeUtf8(b.subarray(NAME_LENGTH_OFFSET + 1, NAME_LENGTH_OFFSET + 1 + nameLen));
  var imageBytes = b.subarray(imageLenAt + 1, imageLenAt + 1 + b[imageLenAt]);
  var image = TshBytes.decodeUtf8(imageBytes);
  if (name === null || image === null) {
    return issue("NAME_UTF8", "screen name or image is not valid UTF-8");
  }
  if (b[17] === ST.THEME) {
    if (b[imageLenAt] !== TshFormat.THEME_IMAGE_SIZE) {
      return issue("THEME_IMAGE_LENGTH", "theme image length " + b[imageLenAt] + " != " + TshFormat.THEME_IMAGE_SIZE);
    }
    image = image.replace(/ +$/, "");
  }
  return {
    name: name,
    image: image
  };
};
// Decodes one widget at offset o of a record. Returns { entry, issue, next } or null when the length is invalid.
var decodeWidget = function (rec, offset) {
  if (offset + 2 > rec.length) {
    return null;
  }
  var length = TshBytes.readU16(rec, offset);
  var end = offset + length + 2;
  if (length < TshFormat.MIN_WIDGET_LENGTH || end > rec.length) {
    return null;
  }
  var w = rec.subarray(offset, end);
  var raw = function (code, detail) {
    return {
      entry: {
        kind: "raw",
        bytes: rec.slice(offset, end),
        reason: code
      },
      issue: issue(code, detail),
      next: end
    };
  };
  if (w[0] !== 0) {
    return raw("WIDGET_LONG", "widget length above 255");
  }
  if (TshBytes.tshChecksum(w) !== w[w.length - 1]) {
    return raw("WIDGET_CHECKSUM", "widget checksum mismatch");
  }
  var flags = w[7];
  var payload = rec.slice(offset + 17, end - 1);
  var data = TshWidgetData.decodeWidgetData(w[6], payload);
  return {
    entry: {
      kind: "widget",
      x: TshBytes.readU16(w, 2),
      y: TshBytes.readU16(w, 4),
      type: w[6],
      useTheme: (flags & TshFormat.WIDGET_FLAG.USE_THEME) !== 0,
      center: (flags & TshFormat.WIDGET_FLAG.CENTER) !== 0,
      size: flags & TshFormat.WIDGET_FLAG.SIZE_MASK,
      flagsOther: flags & ~WF_KNOWN,
      colors: readColors(w),
      data: data,
      payload: payload
    },
    issue: null,
    next: end
  };
};
// Decodes the widgets after the header. Returns { widgets, issues } or an issue (WIDGET_LENGTH).
var decodeWidgets = function (b) {
  var widgets = [];
  var issues = [];
  var offset = b[1] + 2;
  while (offset < b.length) {
    var r = decodeWidget(b, offset);
    if (r === null) {
      return issue("WIDGET_LENGTH", "invalid widget length at record offset " + offset);
    }
    if (r.issue) {
      issues.push(Object.assign(r.issue, {
        widget: widgets.length
      }));
    }
    widgets.push(r.entry);
    offset = r.next;
  }
  return {
    widgets: widgets,
    issues: issues
  };
};
// Decodes one record. Returns { record, issues }: a screen, or raw bytes with the reason as the only issue.
var decodeRecord = function (bytes, index, id) {
  var failed = function (i) {
    return {
      record: {
        kind: "raw",
        id: id,
        bytes: bytes,
        reason: i.code
      },
      issues: [i]
    };
  };
  var bad = checkHeaderLayout(bytes, id);
  if (bad) {
    return failed(bad);
  }
  var texts = decodeHeaderTexts(bytes);
  if (texts.code) {
    return failed(texts);
  }
  var parsed = decodeWidgets(bytes);
  if (parsed.code) {
    return failed(parsed);
  }
  var flags = bytes[7];
  return {
    record: {
      kind: "screen",
      id: id,
      type: TYPE_NAMES[bytes[17]],
      main: (bytes[17] & TshFormat.MAIN_SCREEN_BIT) !== 0 && bytes[17] !== ST.SCREENSAVER,
      layout: Array.from(bytes.subarray(2, 7)),
      useTheme: (flags & TshFormat.SCREEN_FLAG.USE_THEME) !== 0,
      grid: (flags & TshFormat.SCREEN_FLAG.GRID) !== 0,
      flagsOther: flags & ~TshFormat.SCREEN_FLAG_KNOWN,
      colors: readColors(bytes),
      saverOptions: bytes[18],
      name: texts.name,
      image: texts.image,
      widgets: parsed.widgets
    },
    issues: parsed.issues
  };
};
// Reads and checks the directory. Returns { entries } or a fatal RECORD_RANGE issue.
var readDirectory = function (bytes) {
  var entries = [];
  var expected = TshFormat.HEADER_SIZE;
  for (var i = 0; i < bytes[5]; i++) {
    var o = TshFormat.DIR_OFFSET + TshFormat.DIR_ENTRY_SIZE * i;
    var entry = {
      id: bytes[o],
      offset: TshBytes.readU16(bytes, o + 1),
      length: TshBytes.readU16(bytes, o + 3),
      sum: TshBytes.readU32(bytes, o + 5)
    };
    var end = entry.offset + entry.length;
    if (entry.offset !== expected || entry.length < TshFormat.MIN_HEADER_LENGTH || end > bytes.length) {
      return issue("RECORD_RANGE", "record " + i + " at " + entry.offset + " length " + entry.length +
        " is out of range");
    }
    entries.push(entry);
    expected += entry.length;
  }
  return {
    entries: entries,
    end: expected
  };
};
// Checks the padding after the last record. Returns an issue or null.
var checkPadding = function (bytes, end) {
  var rest = bytes.subarray(end);
  var ok = rest.length === (TshFormat.PAD_BLOCK - end % TshFormat.PAD_BLOCK) % TshFormat.PAD_BLOCK &&
    rest.every(function (v) {
      return v === TshFormat.PAD_BYTE;
    });
  return ok ? null : issue("PADDING", "expected 0-31 bytes of 0xab to a multiple of 32, got " + rest.length + " bytes");
};
// Decodes a screens blob. Returns { blob, issues }; blob is null on a fatal issue.
var decodeBlob = exports.decodeBlob = function (bytes) {
  var fatal = checkGlobalHeader(bytes);
  var dir = fatal ? fatal : readDirectory(bytes);
  if (dir.code) {
    return {
      blob: null,
      issues: [dir]
    };
  }
  var issues = [];
  var records = dir.entries.map(function (e, index) {
    var slice = bytes.slice(e.offset, e.offset + e.length);
    var real = TshBytes.byteSum(slice);
    if (real !== e.sum) {
      issues.push(issue("DIR_SUM", "directory sum " + e.sum + " != record sum " + real, {
        record: index
      }));
    }
    var r = decodeRecord(slice, index, e.id);
    r.issues.forEach(function (i) {
      issues.push(Object.assign(i, {
        record: index
      }));
    });
    return r.record;
  });
  var pad = checkPadding(bytes, dir.end);
  if (pad) {
    issues.push(pad);
  }
  return {
    blob: {
      version: bytes[0],
      width: TshBytes.readU16(bytes, 1),
      height: TshBytes.readU16(bytes, 3),
      records: records
    },
    issues: issues
  };
};
