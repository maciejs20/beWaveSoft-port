// Templates of new blob parts for the TSH screens editor: the blob of a fresh TSH Soft save (first save without any
// change, samples 001 for TSH2 and 083 for TSG2), a new user or additional screen (samples 004, 054) and a new widget
// (samples 005-021). Pure functions returning codec models (tshBlob.js typedefs).
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.newWidget = exports.newScreen = exports.freshBlob = exports.resolutionOf = exports.FRESH_THEME = undefined;
var TshFormat = require("./tshFormat.js");
var TshWidgetTypes = require("./tshWidgetTypes.js");
// keypad.model of the input -> resolution key of tshFormat RESOLUTIONS (PROJEKT-TSH.md 1 and 2.1).
var RESOLUTION_BY_MODEL = {
  TSH2_TSH210: "TSH2",
  TSG2: "TSG2"
};
// Theme of a fresh save: Abstract with its colors and image, directory id 0 until a theme is picked (2.1, sample 001).
var FRESH_THEME = exports.FRESH_THEME = {
  colors: ["5a5a5f", "56a8de", "e6e6e6"],
  image: "int://Abstract.jpg"
};
// Colors of the screensaver of a fresh save (sample 001).
var FRESH_SAVER_COLORS = ["000000", "000000", "000000"];
// Bytes 2-6 of every record but the theme: u16 0x20, u16 0x20, 0x20 (2.2).
var SCREEN_LAYOUT = [0x00, 0x20, 0x00, 0x20, 0x20];
// Last byte of the theme layout, after width and height (2.2).
var THEME_LAYOUT_TAIL = 0x20;
// Position of a new widget (samples 005-021).
var NEW_WIDGET_POSITION = 32;
// Shift of a new widget while one of the same type is at its place: the second of each pair in samples 005-021 is
// at 40/40, after 32/32 of any other type [P].
var NEW_WIDGET_STEP = 8;
// Resolution key of a keypad model name. Returns "TSH2", "TSG2", or null for a model without TSH screens.
exports.resolutionOf = function (model) {
  return Object.prototype.hasOwnProperty.call(RESOLUTION_BY_MODEL, model) ? RESOLUTION_BY_MODEL[model] : null;
};
// Builds a screen record with the common fields. Returns it.
var screenRecord = function (props) {
  return Object.assign({
    kind: "screen",
    main: false,
    layout: SCREEN_LAYOUT.slice(),
    useTheme: true,
    grid: false,
    flagsOther: 0,
    saverOptions: 0,
    image: "",
    widgets: []
  }, props);
};
// Blob of a fresh TSH Soft save for a resolution key; names: { theme, screensaver } (TSH writes them in its language).
// Returns the codec model.
exports.freshBlob = function (resolution, names) {
  var r = TshFormat.RESOLUTIONS[resolution];
  return {
    version: TshFormat.BLOB_VERSION,
    width: r.width,
    height: r.height,
    records: [screenRecord({
      id: 0,
      type: "theme",
      layout: [r.width >> 8, r.width & 0xff, r.height >> 8, r.height & 0xff, THEME_LAYOUT_TAIL],
      colors: FRESH_THEME.colors.slice(),
      name: names.theme,
      image: FRESH_THEME.image
    }), screenRecord({
      id: 0,
      type: "screensaver",
      colors: FRESH_SAVER_COLORS.slice(),
      name: names.screensaver
    })]
  };
};
// New user or additional screen with the given colors (the theme colors in TSH). Returns the record.
exports.newScreen = function (type, id, name, colors) {
  return screenRecord({
    id: id,
    type: type,
    colors: colors.slice(),
    name: name
  });
};
// Place of a new widget of a type among the existing widgets. Returns the x = y coordinate.
var newWidgetPlace = function (type, widgets) {
  var at = NEW_WIDGET_POSITION;
  var taken = function (p) {
    return widgets.some(function (w) {
      return w.kind === "widget" && w.type === type && w.x === p && w.y === p;
    });
  };
  while (taken(at)) {
    at += NEW_WIDGET_STEP;
  }
  return at;
};
// New widget of a table type with the screen colors, placed after the screen's widgets of the same type;
// t translates the default texts. Returns the widget.
exports.newWidget = function (type, screen, t) {
  var def = TshWidgetTypes.widgetTypeDef(type);
  var at = newWidgetPlace(type, screen.widgets);
  return {
    kind: "widget",
    x: at,
    y: at,
    type: type,
    useTheme: true,
    center: false,
    size: 0,
    flagsOther: 0,
    colors: screen.colors.slice(),
    data: def.defaults(t),
    payload: new Uint8Array()
  };
};
