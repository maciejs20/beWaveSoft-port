// Format constants of the TSH keypad screens blob (TSH2 and TSG2 keypads).
// Every value comes from PROJEKT-TSH.md (section noted per constant) and was checked against the saved samples.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SCREEN_FLAG_KNOWN = exports.WIDGET_FLAG_KNOWN = exports.NAME_LENGTH_OFFSET = exports.WIDGET_TYPE = exports.WIDGET_FLAG = exports.SCREEN_FLAG = exports.MAIN_SCREEN_BIT = exports.SCREEN_TYPE = exports.RESOLUTIONS = exports.CHECKSUM_INIT = exports.BLOB_VERSION = exports.PAD_BYTE = exports.PAD_BLOCK = exports.MIN_WIDGET_LENGTH = exports.MIN_HEADER_LENGTH = exports.THEME_IMAGE_SIZE = exports.MAX_FIELD_LENGTH = exports.MAX_USER_SCREENS = exports.MAX_RECORDS = exports.DIR_ENTRY_SIZE = exports.DIR_OFFSET = exports.HEADER_SIZE = undefined;
// Global header size (2.1).
var HEADER_SIZE = exports.HEADER_SIZE = 0x160;
// Directory offset inside the global header (2.1).
var DIR_OFFSET = exports.DIR_OFFSET = 6;
// Directory entry: u8 id, u16 offset, u16 length, u32 sum (2.1).
var DIR_ENTRY_SIZE = exports.DIR_ENTRY_SIZE = 9;
// Most directory entries (2.1).
var MAX_RECORDS = exports.MAX_RECORDS = 38;
// Most user screens (2.1).
var MAX_USER_SCREENS = exports.MAX_USER_SCREENS = 16;
// Longest value of a one-byte length field (2.2).
var MAX_FIELD_LENGTH = exports.MAX_FIELD_LENGTH = 255;
// Theme image field is exactly 32 bytes, padded with spaces (2.2).
var THEME_IMAGE_SIZE = exports.THEME_IMAGE_SIZE = 32;
// Offset of the screen name length byte in a record (2.2).
var NAME_LENGTH_OFFSET = exports.NAME_LENGTH_OFFSET = 19;
// Record bytes up to an empty image (2.2).
var MIN_HEADER_LENGTH = exports.MIN_HEADER_LENGTH = 22;
// Shortest widget: fixed fields plus checksum (2.3).
var MIN_WIDGET_LENGTH = exports.MIN_WIDGET_LENGTH = 16;
// Records are padded with PAD_BYTE up to a multiple of this (2.1).
var PAD_BLOCK = exports.PAD_BLOCK = 32;
// Padding byte (2.1).
var PAD_BYTE = exports.PAD_BYTE = 0xab;
// Version byte of the blob (2.1).
var BLOB_VERSION = exports.BLOB_VERSION = 1;
// Checksum initial value (2.4).
var CHECKSUM_INIT = exports.CHECKSUM_INIT = 0x13;
// Supported screen resolutions per keypad model (2.1).
var RESOLUTIONS = exports.RESOLUTIONS = {
  TSH2: {
    width: 1024,
    height: 600
  },
  TSG2: {
    width: 480,
    height: 272
  }
};
// Record type ids (2.2).
var SCREEN_TYPE = exports.SCREEN_TYPE = {
  THEME: 0,
  SCREENSAVER: 1,
  USER: 2,
  ADDITIONAL: 4
};
// Bit of the user screen id marking the main screen (2.2).
var MAIN_SCREEN_BIT = exports.MAIN_SCREEN_BIT = 0x01;
// Flags of a screen header (2.2).
var SCREEN_FLAG = exports.SCREEN_FLAG = {
  USE_THEME: 0x80,
  GRID: 0x10
};
// Flags of a widget (2.3).
var WIDGET_FLAG = exports.WIDGET_FLAG = {
  USE_THEME: 0x80,
  CENTER: 0x08,
  SIZE_MASK: 0x03
};
// Widget flag bits with a model field of their own (byte 7); the rest is kept as flagsOther.
var WIDGET_FLAG_KNOWN = exports.WIDGET_FLAG_KNOWN = WIDGET_FLAG.USE_THEME | WIDGET_FLAG.CENTER | WIDGET_FLAG.SIZE_MASK;
// Screen flag bits with a model field of their own (byte 7); the rest is kept as flagsOther.
var SCREEN_FLAG_KNOWN = exports.SCREEN_FLAG_KNOWN = SCREEN_FLAG.USE_THEME | SCREEN_FLAG.GRID;
// Widget type ids (2.3).
var WIDGET_TYPE = exports.WIDGET_TYPE = {
  TEXT: 0x00,
  ROOM_STATE: 0x01,
  INPUT_INDICATOR: 0x02,
  OUTPUT_INDICATOR: 0x03,
  DATE_TIME: 0x05,
  INPUT_ICON: 0x06,
  OUTPUT_ICON: 0x07,
  CONTROL: 0x08,
  INPUT_TEXT: 0x15,
  OUTPUT_TEXT: 0x16,
  RECTANGLE: 0x17,
  PANIC: 0x23,
  INFO: 0x24,
  LINK: 0x25,
  BUTTON: 0x27,
  VALUE: 0x30,
  SCENE_START: 0x31,
  ARM: 0x33,
  DISARM: 0x34,
  SCENE_STOP: 0x35,
  ARM_TOGGLE: 0x36,
  ALARM_CLEAR: 0x37
};
