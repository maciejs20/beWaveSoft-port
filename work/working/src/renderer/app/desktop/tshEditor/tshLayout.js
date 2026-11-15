// Layout of the TSH screens editor preview (PROJEKT-TSH-EDYTOR.md "Wierność podglądu"): sizes, positions and
// contents of the widgets in keypad pixels, the status bar, the grid, the background, snap targets and nudge steps.
// Font sizes come from TSH Soft's own table (tshMetrics.js, PROJEKT-TSH.md 2.6); box sizes follow GDI as TSH uses it
// (TextWidth/TextHeight of the Satel fonts). Pure functions, no React and no DOM: text widths come from the Roboto
// advance tables below, so the preview, the drag limits and the tests agree.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.screenDrawList = exports.screenColors = exports.screenBackground = exports.themeOf = exports.formatDate = exports.valueSample =
  exports.textWidth = exports.metricsFor = exports.widgetLayout = exports.rawWidgetPosition = exports.centerShift =
  exports.gridLines = exports.gridCells = exports.snapTargets = exports.nudgeDelta =
  exports.ICON_CODES = exports.STATUS_ICONS = exports.glyphBox = exports.textHeight = exports.widgetGlyph =
  exports.textAlign = exports.statusIcons = exports.pageDots = exports.saverClock = exports.FIRMWARE_ICON_RANGES =
  exports.MISSING_ICON = exports.TEXT_OFFSET = exports.BOLD_EXTRA_ADVANCE = exports.textAscent =
  exports.ROBOTO_HHEA_ASCENT = exports.ROBOTO_HHEA_HEIGHT = exports.widgetIcon = undefined;
var TshFormat = require("./tshFormat.js");
var TshWidgetTypes = require("./tshWidgetTypes.js");
var TshSdCard = require("./tshSdCard.js");
var TshMetrics = require("./tshMetrics.js");
var TshDateFormat = require("./tshDateFormat.js");
var T = TshFormat.WIDGET_TYPE;
// Status bar icons of the TSH preview (WDGT glyphs): alarm, eye, wrench, bell; user at the right.
var STATUS_ICONS = exports.STATUS_ICONS = {
  left: [0xa4, 0xa2, 0xa6, 0xa8],
  user: 0x21
};
// Glyph layers of the indicator widgets, drawn in order at the same point (FUN_00a9f3a8, TColor $BBGGRR decoded): a
// base 0x1df (a rounded square, shot e2) in white or red for an output, then the room's green open lock and black ring,
// the input's black check mark, or the output's black ring. The widget colors are not used.
var INDICATORS = {};
INDICATORS[T.ROOM_STATE] = [{
  glyph: 0x1df,
  color: "#ffffff"
}, {
  glyph: 0x1fc,
  color: "#00d9a5"
}, {
  glyph: 0x1e8,
  color: "#000000"
}];
INDICATORS[T.INPUT_INDICATOR] = [{
  glyph: 0x1df,
  color: "#ffffff"
}, {
  glyph: 0x1e0,
  color: "#000000"
}];
INDICATORS[T.OUTPUT_INDICATOR] = [{
  glyph: 0x1df,
  color: "#ff4d4d"
}, {
  glyph: 0x1e8,
  color: "#000000"
}];
// Glyph TSH draws for an icon code of 0 or one the keypad firmware does not have (FUN_00a9f9d0, FUN_00a5b270).
var MISSING_ICON = exports.MISSING_ICON = 0x22;
// Icon codes the keypad firmware "2.01 2025-12-03" draws (table 0x00b0b9b8 of FUN_00a5b13c), [first, last]; TSH draws
// MISSING_ICON for widget icons outside them. Codes are masked with 0xfff first.
var FIRMWARE_ICON_RANGES = exports.FIRMWARE_ICON_RANGES = [[0xa9, 0x107], [0x110, 0x13d], [0x13f, 0x1a6],
  [0x226, 0x266], [0x268, 0x268], [0x26a, 0x280], [0x28a, 0x28f]];
// Icon codes offered by the icon picker: the codes the keypad firmware draws (FIRMWARE_ICON_RANGES; others would show
// as MISSING_ICON on the keypad and in TSH). Returns numbers in font order.
var ICON_CODES = exports.ICON_CODES = FIRMWARE_ICON_RANGES.reduce(function (all, r) {
  for (var c = r[0]; c <= r[1]; c++) {
    all.push(c);
  }
  return all;
}, []);
// Icons of the panic widget per alarm kind: panic badge, fire, medical cross (shots e8, s_s8).
var PANIC_ICONS = [0x105, 0x106, 0x107];
// Icon of the info widget (shot e9).
var INFO_ICON = 0x11b;
// Characters measured in Roboto Light (ROBL) and Roboto Thin (ROBT) and their advance widths in font units of 2048 per
// em (hmtx of the fonts extracted from TSH_soft.exe).
var MEASURED_CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz" +
  "{|}~ąćęłńóśźżĄĆĘŁŃÓŚŹŻ°µ²³€–…äöüÄÖÜß";
var ADVANCES = [498, 462, 588, 1191, 1135, 1513, 1260, 348, 653, 667, 869, 1156, 392, 586, 489, 813, 1135, 1135, 1135,
  1135, 1135, 1135, 1135, 1135, 1135, 1135, 430, 399, 1047, 1133, 1061, 930, 1870, 1279, 1255, 1330, 1341, 1165, 1152,
  1400, 1449, 545, 1127, 1292, 1079, 1772, 1454, 1386, 1261, 1386, 1300, 1213, 1223, 1346, 1263, 1836, 1253, 1226,
  1225, 491, 807, 491, 852, 884, 585, 1097, 1135, 1055, 1138, 1058, 678, 1136, 1124, 459, 467, 1003, 459, 1815, 1125,
  1147, 1135, 1142, 689, 1037, 658, 1125, 985, 1544, 996, 973, 996, 676, 452, 676, 1402, 1097, 1055, 1058, 529, 1125,
  1147, 1037, 996, 996, 1279, 1330, 1165, 1082, 1454, 1386, 1213, 1225, 1225, 774, 1140, 740, 740, 1135, 1334, 1313,
  1097, 1147, 1125, 1279, 1386, 1346, 1200];
var ADVANCES_THIN = [490, 397, 521, 1121, 1121, 1527, 1247, 340, 607, 623, 856, 1151, 383, 607, 439, 782, 1121, 1121,
  1121, 1121, 1121, 1121, 1121, 1121, 1121, 1121, 364, 364, 1053, 1142, 1053, 893, 1902, 1223, 1235, 1327, 1340, 1166,
  1172, 1406, 1438, 534, 1125, 1300, 1057, 1756, 1449, 1364, 1230, 1364, 1340, 1211, 1224, 1365, 1223, 1855, 1223, 1223,
  1224, 439, 774, 439, 849, 845, 537, 1081, 1121, 1039, 1121, 1032, 645, 1123, 1121, 422, 445, 969, 422, 1836, 1121,
  1127, 1121, 1121, 685, 1019, 648, 1121, 978, 1550, 978, 978, 978, 660, 406, 660, 1412, 1081, 1039, 1032, 505, 1121,
  1127, 1019, 978, 978, 1223, 1327, 1166, 1061, 1449, 1364, 1211, 1224, 1224, 783, 1121, 728, 728, 1121, 1324, 1255,
  1081, 1127, 1121, 1223, 1364, 1365, 1183];
var UNITS_PER_EM = 2048;
// Vertical metrics of Roboto Light/Thin (OS/2 usWinAscent/usWinDescent in units of 2048), which GDI's TextHeight
// and the baseline of TextOut use.
var ROBOTO_WIN_ASCENT = 1946;
var ROBOTO_WIN_DESCENT = 512;
// Roboto hhea ascent and ascent + descent in units of 2048: what Chrome uses for the line box, so the renderer can put
// the baseline where GDI puts it.
var ROBOTO_HHEA_ASCENT = exports.ROBOTO_HHEA_ASCENT = 1900;
var ROBOTO_HHEA_HEIGHT = exports.ROBOTO_HHEA_HEIGHT = 2400;
// WDGT icon font: 1000 units per em, usWinAscent 1004, usWinDescent 0; glyph "1" (TSH measures icon boxes with it)
// is 1000 units wide.
var WDGT_UNITS_PER_EM = 1000;
var WDGT_WIN_ASCENT = 1004;
var WDGT_ONE_ADVANCE = 1000;
// Advance of a character outside the table per face: the width of a digit.
var DEFAULT_ADVANCE = {
  light: 1135,
  thin: 1121
};
var ADVANCE_OF = {
  light: {},
  thin: {}
};
Array.from(MEASURED_CHARS).forEach(function (ch, i) {
  ADVANCE_OF.light[ch] = ADVANCES[i];
  ADVANCE_OF.thin[ch] = ADVANCES_THIN[i];
});
// Device pixels GDI adds to every character advance of a synthesized bold face (the status bar name and clock are
// Roboto Light with fsBold): one pixel of the screen it draws on (TSH preview: about one preview pixel per character).
var BOLD_EXTRA_ADVANCE = exports.BOLD_EXTRA_ADVANCE = 1;
// TSH draws a widget text one pixel right of its box (FUN_00a9f048: TextOut at left + 1).
var TEXT_OFFSET = exports.TEXT_OFFSET = 1;
// Width of a text in Roboto Light ("light", default) or Thin ("thin") at a font size, without kerning. Returns pixels.
var textWidth = exports.textWidth = function (text, px, face) {
  var f = face === "thin" ? "thin" : "light";
  var units = Array.from(String(text)).reduce(function (sum, ch) {
    return sum + (ADVANCE_OF[f][ch] ?? DEFAULT_ADVANCE[f]);
  }, 0);
  return units * px / UNITS_PER_EM;
};
// GDI TextHeight of a Roboto text at an em size: rounded ascent plus rounded descent. Returns pixels.
var textHeight = exports.textHeight = function (px) {
  return Math.round(ROBOTO_WIN_ASCENT * px / UNITS_PER_EM) + Math.round(ROBOTO_WIN_DESCENT * px / UNITS_PER_EM);
};
// Baseline of a Roboto text below its TextOut top at an em size (GDI tmAscent from usWinAscent). Returns pixels.
exports.textAscent = function (px) {
  return Math.round(ROBOTO_WIN_ASCENT * px / UNITS_PER_EM);
};
// Box of a WDGT glyph widget at an em size as TSH measures it: TextWidth("1") x TextHeight("1") (FUN_00a9f270,
// FUN_00a9f3a8). Returns { width, height } in pixels.
var glyphBox = exports.glyphBox = function (em) {
  return {
    width: Math.round(WDGT_ONE_ADVANCE * em / WDGT_UNITS_PER_EM),
    height: Math.round(WDGT_WIN_ASCENT * em / WDGT_UNITS_PER_EM)
  };
};
// Metrics of a keypad resolution (tshMetrics.js, kept here for the callers of the layout).
exports.metricsFor = TshMetrics.metricsFor;
// Index into the per-size metric lists: sizes above 2 (byte 7 bits 0-1 = 3, never written by TSH) draw large.
var sizeIndex = function (size) {
  return Math.min(Math.max(size | 0, 0), 2);
};
// Sample text of the Value widget as TSH shows it: three digits with the decimals ("000", "00.0", "0.00").
var valueSample = exports.valueSample = function (decimals) {
  var d = Math.max(decimals | 0, 0);
  return "0".repeat(Math.max(3 - d, 1)) + (d ? "." + "0".repeat(d) : "");
};
// Date/time format of the Date widget applied to a date as TSH Soft shows it (tshDateFormat.js: TSH's replacements,
// Delphi FormatDateTime tokens, Polish genitive months); lang is the TSH input language. Returns the text.
var formatDate = exports.formatDate = function (format, date, lang) {
  return TshDateFormat.formatTshDate(format, date, lang);
};
// Text shown by a text-like widget at opts.now in opts.lang. Returns the text, or null for widgets drawn otherwise.
var widgetText = function (w, opts) {
  var d = w.data;
  switch (w.type) {
    case T.TEXT:
      return d.text;
    case T.OUTPUT_TEXT:
      return d.textOff;
    case T.DATE_TIME:
      return formatDate(d.format, opts.now, opts.lang);
    case T.VALUE:
      return valueSample(d.decimals) + d.unit;
    default:
      return null;
  }
};
// Icon code an icon widget stores for its inactive state, as FUN_00a9f9d0 picks it (panic and info have fixed
// icons, the link a u16 of its lead byte and icon). Returns the code, or null for widgets drawn otherwise.
var widgetIcon = exports.widgetIcon = function (w) {
  var d = w.data;
  switch (w.type) {
    case T.INPUT_ICON:
    case T.OUTPUT_ICON:
    case T.CONTROL:
    case T.BUTTON:
      return d.iconOff;
    case T.SCENE_START:
    case T.SCENE_STOP:
    case T.ARM:
    case T.DISARM:
    case T.ARM_TOGGLE:
    case T.ALARM_CLEAR:
      return d.icons[0];
    case T.LINK:
      return (d.lead & 0xff) << 8 | d.icon;
    case T.PANIC:
      return PANIC_ICONS[d.alarmKind] ?? PANIC_ICONS[0];
    case T.INFO:
      return INFO_ICON;
    default:
      return null;
  }
};
// Glyph TSH draws for a widget icon code: MISSING_ICON for 0 and for codes outside the firmware ranges (after
// masking with 0xfff). Returns the code.
var widgetGlyph = exports.widgetGlyph = function (code) {
  var c = code & 0xfff;
  var known = FIRMWARE_ICON_RANGES.some(function (r) {
    return c >= r[0] && c <= r[1];
  });
  return c !== 0 && known ? c : MISSING_ICON;
};
// Widget types whose text TSH aligns by byte 7 bits 2-3 (map 0x00a5cff4 of FUN_00a5cf9c); our model keeps bit 0x08 as
// center and bit 0x04 in flagsOther.
var ALIGNABLE = [0x00, 0x04, 0x05, 0x15, 0x16, 0x26, 0x28, 0x30];
// Bit of byte 7 for right alignment (value 1 of bits 2-3).
var RIGHT_FLAG = 0x04;
// Alignment of a widget's text: bits 2-3 of byte 7 are 1 right, 2 center (TshFormat.WIDGET_FLAG.CENTER), 0 and 3
// left; types outside ALIGNABLE are always left. Returns "left" | "right" | "center".
var textAlign = exports.textAlign = function (w) {
  if (w.kind !== "widget" || ALIGNABLE.indexOf(w.type) < 0) {
    return "left";
  }
  var bits = (w.center ? 2 : 0) | ((w.flagsOther ?? 0) & RIGHT_FLAG ? 1 : 0);
  return bits === 1 ? "right" : bits === 2 ? "center" : "left";
};
// Position of a raw widget from its bytes (u16 X at 2, u16 Y at 4, PROJEKT-TSH.md 2.3). Returns { x, y }.
var rawWidgetPosition = exports.rawWidgetPosition = function (bytes) {
  return bytes && bytes.length >= 6 ? {
    x: bytes[2] << 8 | bytes[3],
    y: bytes[4] << 8 | bytes[5]
  } : {
    x: 0,
    y: 0
  };
};
/**
 * Layout of one widget in keypad pixels.
 * @typedef {Object} TshWidgetLayout
 * @property {number} left, top, width, height   box on the keypad screen
 * @property {number} offsetX       left - widget.x: 0, -width (right) or -(width >> 1) (center)
 * @property {"text"|"icon"|"indicator"|"rect"|"unknown"} kind
 * @property {string} [text]        kind text
 * @property {number} [font]        kind text: em size; kind icon/indicator: glyph em size
 * @property {"light"|"thin"} [face]          kind text: Roboto Thin for size 2, Light otherwise
 * @property {number} [textX]       kind text: x of the drawn text in the box (TEXT_OFFSET)
 * @property {number} [glyph]       kind icon: WDGT char code as TSH draws it (widgetGlyph)
 * @property {{glyph: number, color: string}[]} [layers]   kind indicator: glyphs drawn in order
 * @property {number} [border], [opacity]    kind rect: border width (pen centered on the edge) and fill opacity
 */
// Layout of a widget (any kind, raw too) on a screen with metrics m; opts { now: Date, lang: TSH input language }
// for the texts of Date/time widgets. Returns a TshWidgetLayout.
var widgetLayout = exports.widgetLayout = function (w, m, opts) {
  var def = w.kind === "widget" && w.data !== null ? TshWidgetTypes.widgetTypeDef(w.type) : null;
  var pos = w.kind === "widget" ? w : rawWidgetPosition(w.bytes);
  var align = textAlign(w);
  var box = function (kind, width, height, extra) {
    var offsetX = align === "right" ? -width : align === "center" ? -(width >> 1) : 0;
    return Object.assign({
      kind: kind,
      left: pos.x + offsetX,
      top: pos.y,
      width: width,
      height: height,
      offsetX: offsetX
    }, extra);
  };
  if (!def) {
    return box("unknown", m.unknownBox, m.unknownBox, {});
  }
  var s = sizeIndex(w.size);
  if (def.look === "rect") {
    // [P] fill opacity: transparency 7 gave an almost invisible fill (shot e7), read as alpha = byte / 255.
    return box("rect", w.data.width, w.data.height, {
      border: w.data.border,
      opacity: w.data.transparency / 255
    });
  }
  if (def.look === "indicator") {
    var dot = glyphBox(m.indicator[s]);
    return box("indicator", dot.width, dot.height, {
      font: m.indicator[s],
      layers: INDICATORS[w.type] ?? INDICATORS[T.INPUT_INDICATOR]
    });
  }
  if (def.look === "text") {
    var text = widgetText(w, opts) ?? "";
    var font = m.font[s];
    // FUN_00a9f048 takes Roboto Thin when the size equals the large text size.
    var face = font === m.font[2] ? "thin" : "light";
    return box("text", Math.round(textWidth(text, font, face)), textHeight(font), {
      text: text,
      font: font,
      face: face,
      textX: TEXT_OFFSET
    });
  }
  var icon = glyphBox(m.icon[s]);
  var code = widgetIcon(w);
  return box("icon", icon.width, icon.height, {
    font: m.icon[s],
    glyph: code === null ? null : widgetGlyph(code)
  });
};
// New X of a widget whose center flag is toggled: TSH stores the middle of a centered widget as X (sample 049:
// 300 -> 380 for the 160 px date), so turning it on adds half the width and turning it off takes it away.
// opts as for widgetLayout. Returns the X clamped to the screen.
exports.centerShift = function (w, m, opts, center) {
  var width = widgetLayout(Object.assign({}, w, {
    center: false
  }), m, opts).width;
  var x = w.x + (center ? 1 : -1) * Math.round(width / 2);
  return Math.min(Math.max(x, 0), m.width - 1);
};
// Grid cells of a screen below the status bar as TSH draws them (FUN_00aa0288): 5x2 cells of integer size with the
// margin also as the gap, (1024 - 6 * 20) div 5 = 180 by (600 - 52 - 3 * 20) div 2 = 244 on TSH2. Returns
// [{ left, top, width, height }] row by row.
var gridCells = exports.gridCells = function (m) {
  var gap = m.gridMargin;
  var top = m.bar + gap;
  var cellW = Math.floor((m.width - (m.gridColumns + 1) * gap) / m.gridColumns);
  var cellH = Math.floor((m.height - m.bar - (m.gridRows + 1) * gap) / m.gridRows);
  var cells = [];
  for (var r = 0; r < m.gridRows; r++) {
    for (var c = 0; c < m.gridColumns; c++) {
      cells.push({
        left: gap + c * (cellW + gap),
        top: top + r * (cellH + gap),
        width: cellW,
        height: cellH
      });
    }
  }
  return cells;
};
// Grid lines as TSH draws them: lines in the middle of the gaps between cells, broken where they cross.
// Returns [{ x1, y1, x2, y2 }] in keypad pixels.
exports.gridLines = function (m) {
  var cells = gridCells(m);
  var lines = [];
  cells.forEach(function (cell, i) {
    var col = i % m.gridColumns;
    var row = Math.floor(i / m.gridColumns);
    if (col < m.gridColumns - 1) {
      var x = cell.left + cell.width + m.gridMargin / 2;
      lines.push({
        x1: x,
        y1: cell.top,
        x2: x,
        y2: cell.top + cell.height
      });
    }
    if (row < m.gridRows - 1) {
      var y = cell.top + cell.height + m.gridMargin / 2;
      lines.push({
        x1: cell.left,
        y1: y,
        x2: cell.left + cell.width,
        y2: y
      });
    }
  });
  return lines;
};
// Status icons (alarm, eye, wrench, bell) of a screen as FUN_00aa7fe4 draws them: only where the metrics allow them
// (TSH2, not TSG2), on user and additional screens from barIconLeft every barIconPitch, on the screensaver centered.
// Returns [{ code, left, top, size }], empty when none are drawn.
exports.statusIcons = function (screen, m) {
  var withBar = screen.type === "user" || screen.type === "additional";
  if (!m.statusIcons || !withBar && screen.type !== "screensaver") {
    return [];
  }
  var count = STATUS_ICONS.left.length;
  var left = (withBar ? 0 : Math.floor((m.width - count * m.barIconPitch) / 2)) + m.barIconLeft;
  return STATUS_ICONS.left.map(function (code, i) {
    return {
      code: code,
      left: left + i * m.barIconPitch,
      top: m.barIconY,
      size: m.barIcon
    };
  });
};
// WDGT glyphs of the page dots: the shown user screen and the others (FUN_00aa7fe4).
var DOT_SHOWN = 0x1f6;
var DOT_OTHER = 0x1f7;
// Page dots of the user screens (FUN_00aa7fe4): white WDGT glyphs one advance plus dotGap apart, centered, with the
// glyph tops half a pitch above the bar height from the bottom. active: index of the shown screen among the user
// screens. Returns [{ code, left, top, size }].
exports.pageDots = function (m, count, active) {
  var pitch = glyphBox(m.dotFont).width + m.dotGap;
  var start = Math.floor((m.width - count * pitch) / 2);
  var top = m.height - m.bar - (pitch >> 1);
  return Array.from({
    length: count
  }, function (_, i) {
    return {
      code: i === active ? DOT_SHOWN : DOT_OTHER,
      left: start + i * pitch,
      top: top,
      size: m.dotFont
    };
  });
};
// Screensaver option bit "no clock" of byte 18 (PROJEKT-TSH.md 2.2, tshEditorModel.SAVER_OPTION.NO_CLOCK).
var SAVER_NO_CLOCK = 0x02;
// Two-digit time part. Returns it.
var pad2 = function (n) {
  return String(n).padStart(2, "0");
};
// Screensaver clock as FUN_00aa064c draws it: the colon in Roboto Light at half the clock size in the middle, raised
// by the bar height; the hours in Roboto Thin ending at the colon and the minutes starting after it, lowered by
// clockDrop; the seconds in Roboto Light at fixed fractions of the screen. Positions are text box tops (GDI TextOut).
// Returns { hours, colon, minutes, seconds }, each { text, left, top, font, face }.
exports.saverClock = function (m, now) {
  var part = function (text, left, top, font, face) {
    return {
      text: text,
      left: left,
      top: top,
      font: font,
      face: face
    };
  };
  var colonFont = m.clockFont >> 1;
  var colonWidth = Math.round(textWidth(":", colonFont, "light"));
  var hours = pad2(now.getHours());
  var digitsTop = (m.height - textHeight(m.clockFont) >> 1) - m.bar + m.clockDrop;
  return {
    hours: part(hours, (m.width - colonWidth >> 1) - Math.round(textWidth(hours, m.clockFont, "thin")), digitsTop,
      m.clockFont, "thin"),
    colon: part(":", m.width - colonWidth >> 1, (m.height - textHeight(colonFont) >> 1) - m.bar, colonFont, "light"),
    minutes: part(pad2(now.getMinutes()), m.width + colonWidth >> 1, digitsTop, m.clockFont, "thin"),
    seconds: part(pad2(now.getSeconds()), Math.round(m.width * m.clockSecondsX), Math.round(m.height * m.clockSecondsY),
      m.clockSecondsFont, "light")
  };
};
// Snap targets of a dragged widget (tshPointer.dragAnchor): the grid cell edges as TSH draws the cells, the screen
// edges and the screen centre lines. Returns { xs, ys } in keypad pixels.
exports.snapTargets = function (m) {
  var xs = [0, m.width / 2, m.width];
  var ys = [0, m.height / 2, m.height];
  gridCells(m).forEach(function (c) {
    xs.push(c.left, c.left + c.width);
    ys.push(c.top, c.top + c.height);
  });
  return {
    xs: xs,
    ys: ys
  };
};
// Keyboard nudge of the selected widget: arrows move by 1 px, with Shift by 8. Returns { dx, dy } or null.
exports.nudgeDelta = function (key, shift) {
  var step = shift ? 8 : 1;
  switch (key) {
    case "ArrowLeft":
      return {
        dx: -step,
        dy: 0
      };
    case "ArrowRight":
      return {
        dx: step,
        dy: 0
      };
    case "ArrowUp":
      return {
        dx: 0,
        dy: -step
      };
    case "ArrowDown":
      return {
        dx: 0,
        dy: step
      };
    default:
      return null;
  }
};
// themes.json entry of a built-in picture "int://<name>.jpg" (what TSH and setTheme write). Returns it or null.
var themeByImage = function (image, themes) {
  var name = /^int:\/\/(.+)\.jpg$/i.exec(String(image ?? "").trim());
  return name ? themes.find(function (t) {
    return t.name.toLowerCase() === name[1].toLowerCase();
  }) ?? null : null;
};
// themes.json entry of the theme record: by its image, else by its id (255 - index); id 0 of a fresh blob is
// Abstract. Returns the entry or null.
var themeOf = exports.themeOf = function (themeRecord, themes) {
  if (!themeRecord || themeRecord.kind !== "screen") {
    return null;
  }
  var index = themeRecord.id === 0 ? 0 : 0xff - themeRecord.id;
  return themeByImage(themeRecord.image, themes) ?? themes[index] ?? null;
};
// Background of a screen: the theme picture, or the theme cl3 when the theme has none, for a screen that uses the
// theme and for the theme and screensaver records; else its own cl3, or a built-in picture named in its image
// field, or a card picture ("map2.jpg") cut out in this session. customImages: { "<image name>": url } of those
// pictures. Returns { color: "#rrggbb", file: "bg/..." | null, url: string | null, missing: boolean }; missing is
// true for a card picture the editor has not got (it is only on the card, the screen shows its cl3 here).
exports.screenBackground = function (screen, themeRecord, themes, customImages) {
  var followsTheme = (screen.useTheme || screen.type === "theme" || screen.type === "screensaver") &&
    !!themeRecord && themeRecord.kind === "screen";
  var theme = followsTheme ? themeOf(themeRecord, themes) : themeByImage(screen.image, themes);
  var custom = !followsTheme && !theme && TshSdCard.isCustomBackground(screen.image);
  var url = custom && customImages ? customImages[String(screen.image).trim()] ?? null : null;
  return {
    color: "#" + (followsTheme ? themeRecord : screen).colors[2],
    file: theme && theme.backgroundFile ? theme.backgroundFile : null,
    url: url,
    missing: custom && !url
  };
};
// Colors a screen is drawn with: the theme colors when it uses the theme (a fresh TSH save keeps black colors in its
// screensaver record although it uses the theme, sample 001), else its own. Returns three "rrggbb".
exports.screenColors = function (screen, themeRecord) {
  return screen.useTheme && screen.type !== "theme" && themeRecord && themeRecord.kind === "screen" ?
    themeRecord.colors : screen.colors;
};
// Draw items of a screen in drawing order, for the static renderer (TshScreenRender.js) and the canvas: the background,
// TSH's grid lines (screen byte 7 bit 0x10, screens with a status bar), the status bar, the page dots of user screens,
// the screensaver's status icons and clock, then every widget with its layout and colors. opts: { now: Date, lang:
// TSH input language (default state.input.lang), themes: themes.json list, customImages: { "<image name>": url } }.
// Returns [{ kind: "background", color, file, url, missing } | { kind: "grid", color, lines } |
// { kind: "statusBar", color, name, clock, icons } | { kind: "dots", items } | { kind: "saver", color, icons, clock }
// | { kind: "widget", index, layout, colors }]; saver clock is null when the screensaver hides it.
exports.screenDrawList = function (state, screen, opts) {
  var blob = state.blob;
  var m = TshMetrics.metricsFor(blob.width, blob.height);
  var now = opts.now;
  var layoutOpts = {
    now: now,
    lang: opts.lang ?? state.input.lang
  };
  var themeRecord = blob.records[0];
  var colors = exports.screenColors(screen, themeRecord);
  var color = "#" + colors[0];
  var withBar = screen.type === "user" || screen.type === "additional";
  var items = [Object.assign({
    kind: "background"
  }, exports.screenBackground(screen, themeRecord, opts.themes ?? [], opts.customImages))];
  if (withBar && screen.grid) {
    items.push({
      kind: "grid",
      color: color,
      lines: exports.gridLines(m)
    });
  }
  if (withBar) {
    items.push({
      kind: "statusBar",
      color: color,
      name: screen.name,
      clock: `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`,
      icons: exports.statusIcons(screen, m)
    });
  }
  if (screen.type === "user") {
    var users = blob.records.filter(function (r) {
      return r.kind === "screen" && r.type === "user";
    });
    items.push({
      kind: "dots",
      items: exports.pageDots(m, users.length, users.findIndex(function (r) {
        return r.uid === screen.uid;
      }))
    });
  }
  if (screen.type === "screensaver") {
    items.push({
      kind: "saver",
      color: color,
      icons: exports.statusIcons(screen, m),
      clock: (screen.saverOptions & SAVER_NO_CLOCK) === 0 ? exports.saverClock(m, now) : null
    });
  }
  screen.widgets.forEach(function (w, index) {
    items.push({
      kind: "widget",
      index: index,
      layout: widgetLayout(w, m, layoutOpts),
      colors: w.kind === "widget" && !w.useTheme ? w.colors : colors
    });
  });
  return items;
};
