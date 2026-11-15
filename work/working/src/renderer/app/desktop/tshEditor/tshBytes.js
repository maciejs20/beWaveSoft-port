// Byte helpers of the TSH screens blob codec: big-endian integers, checksums, UTF-8, base64, hex colors.
// Pure functions, no Node-only APIs (the code also runs in the renderer).
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rgbToHex = exports.hexToRgb = exports.hasLoneSurrogate = exports.base64ToBytes = exports.bytesToBase64 = exports.decodeUtf8 = exports.encodeUtf8 = exports.byteSum = exports.writeU32 = exports.writeU16 = exports.readU32 = exports.readU16 = exports.tshChecksum = undefined;
var TshFormat = require("./tshFormat.js");
var BASE64_CHUNK = 0x8000;
// Checksum of a record part (PROJEKT-TSH.md 2.4): over d[0..d[1]], stored at d[d[1] + 1]. Returns a byte.
var tshChecksum = exports.tshChecksum = function (d) {
  var a = TshFormat.CHECKSUM_INIT;
  for (var i = 0; i <= d[1]; i++) {
    var x = (d[i] + a) & 0xff;
    a = ((x << 1) & 0xff) | (x >> 7);
  }
  return a;
};
// Reads a big-endian u16. Returns the number.
var readU16 = exports.readU16 = function (b, o) {
  return (b[o] << 8) | b[o + 1];
};
// Reads a big-endian u32. Returns the number (unsigned).
var readU32 = exports.readU32 = function (b, o) {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
};
// Writes a big-endian u16. Returns nothing.
var writeU16 = exports.writeU16 = function (b, o, v) {
  b[o] = (v >> 8) & 0xff;
  b[o + 1] = v & 0xff;
};
// Writes a big-endian u32. Returns nothing.
var writeU32 = exports.writeU32 = function (b, o, v) {
  b[o] = (v >>> 24) & 0xff;
  b[o + 1] = (v >>> 16) & 0xff;
  b[o + 2] = (v >>> 8) & 0xff;
  b[o + 3] = v & 0xff;
};
// Plain sum of all bytes (the directory sum of a record). Returns the number.
var byteSum = exports.byteSum = function (b) {
  var s = 0;
  for (var i = 0; i < b.length; i++) {
    s += b[i];
  }
  return s;
};
// Encodes a string as UTF-8. Returns bytes.
var encodeUtf8 = exports.encodeUtf8 = function (s) {
  return new TextEncoder().encode(s);
};
// Decodes UTF-8 strictly. Returns the string, or null when the bytes are not valid UTF-8.
var decodeUtf8 = exports.decodeUtf8 = function (b) {
  try {
    return new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true
    }).decode(Uint8Array.from(b));
  } catch (e) {
    return null;
  }
};
// Tells whether a string has a UTF-16 surrogate without its pair (TextEncoder would write U+FFFD). Returns a boolean.
var hasLoneSurrogate = exports.hasLoneSurrogate = function (s) {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);
};
// Encodes bytes as base64 in chunks, so large blobs do not overflow the argument limit. Returns the string.
var bytesToBase64 = exports.bytesToBase64 = function (b) {
  var binary = "";
  for (var i = 0; i < b.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode.apply(null, b.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
};
// Decodes base64. Returns bytes, or null when the input is not a string or not valid base64.
var base64ToBytes = exports.base64ToBytes = function (s) {
  if (typeof s !== "string") {
    return null;
  }
  var binary;
  try {
    binary = atob(s);
  } catch (e) {
    return null;
  }
  var out = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
};
// Parses a color of exactly six lowercase hex digits. Returns [r, g, b], or null.
var hexToRgb = exports.hexToRgb = function (s) {
  if (typeof s !== "string" || !/^[0-9a-f]{6}$/.test(s)) {
    return null;
  }
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
// Formats three bytes at offset o as six lowercase hex digits. Returns the string.
var rgbToHex = exports.rgbToHex = function (b, o) {
  var hex = "";
  for (var i = 0; i < 3; i++) {
    hex += (b[o + i] < 16 ? "0" : "") + b[o + i].toString(16);
  }
  return hex;
};
