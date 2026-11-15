// Preview metrics of the TSH keypads in keypad pixels, from TSH Soft 1.00.005 itself (PROJEKT-TSH.md 2.6): the
// per-resolution table that FUN_00ab0cd4 fills for the keypad width/height (text, icon, indicator and screensaver
// font sizes, status bar height) and the constants of the status bar function FUN_00aa7fe4, the grid FUN_00aa0288 and
// the screensaver clock FUN_00aa064c. Font sizes are em heights in pixels (TSH sets Font.Height = -size). No ratios:
// TSG2 has its own table. Pure data, no React and no DOM.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.metricsFor = exports.TSG2_METRICS = exports.TSH2_METRICS = exports.TSG2_MAX_WIDTH = undefined;
// FUN_00ab0cd4 takes the TSG2 branch for a keypad width below 0x321.
var TSG2_MAX_WIDTH = exports.TSG2_MAX_WIDTH = 800;
/**
 * Metrics of one keypad resolution.
 * @typedef {Object} TshMetrics
 * @property {number} width, height     keypad screen in pixels
 * @property {number[]} font            text widget em per size 0/1/2 (_1438/_1440/_1442; size 2 is Roboto Thin)
 * @property {number[]} icon            WDGT icon em per size (_1444/_1446/_1448)
 * @property {number[]} indicator       WDGT indicator em per size (_1454/_1456/_1458)
 * @property {number} bar               status bar height, its line is drawn at this y (_1436)
 * @property {number} barFont           screen name and clock em, Roboto Light bold (FUN_00aa7fe4)
 * @property {number} barTop            y of the name and the clock (FUN_00aa7fe4)
 * @property {number} barUser           user glyph 0x21 em; it sits at x = width - 2 em, the clock ends at width - 3 em
 * @property {number} barUserY          y of the user glyph (FUN_00aa7fe4: Round(7))
 * @property {number} barIcon           status icon em (alarm, eye, wrench, bell)
 * @property {number} barIconLeft       x of the first status icon (4 + i * pitch)
 * @property {number} barIconPitch      status icon pitch, 3/2 of the icon em
 * @property {number} barIconY          y of the status icons (Round(4))
 * @property {boolean} statusIcons      FUN_00aa7fe4 draws the status icons only when the width is not 480
 * @property {number} dotFont           page dot glyph em (0x1f6 shown screen, 0x1f7 others)
 * @property {number} dotGap            added to the dot glyph advance for the pitch
 * @property {number} gridMargin        grid margin and gap (Round(0x14))
 * @property {number} gridColumns, gridRows
 * @property {number} clockFont         screensaver hours and minutes em, Roboto Thin (_1450); colon Light at half
 * @property {number} clockDrop         extra y of the hours and minutes (Round(8))
 * @property {number} clockSecondsFont  screensaver seconds em, Roboto Light (_1452)
 * @property {number} clockSecondsX, clockSecondsY   seconds at Round(width * x), Round(height * y) (0xaa18e8, 0xaa18f4)
 * @property {number} unknownBox        side of the box drawn for a widget the editor cannot draw ([P])
 */
// INT-TSH2, 1024x600 (FUN_00ab0cd4 else branch; FUN_00aa7fe4 TSH2 constants 26/30/40/12/10).
var TSH2_METRICS = exports.TSH2_METRICS = Object.freeze({
  font: [18, 33, 54],
  icon: [77, 115, 180],
  indicator: [20, 36, 52],
  bar: 52,
  barFont: 26,
  barTop: 10,
  barUser: 30,
  barUserY: 7,
  barIcon: 40,
  barIconLeft: 4,
  barIconPitch: 60,
  barIconY: 4,
  statusIcons: true,
  dotFont: 12,
  dotGap: 2,
  gridMargin: 20,
  gridColumns: 5,
  gridRows: 2,
  clockFont: 256,
  clockDrop: 8,
  clockSecondsFont: 77,
  clockSecondsX: 0.83,
  clockSecondsY: 0.45,
  unknownBox: 48
});
// INT-TSG2, 480x272 (FUN_00ab0cd4 branch width < 0x321; FUN_00aa7fe4 TSG2 constants 13/15/20/6/7).
// [P] unknownBox: half of TSH2, like the status bar.
var TSG2_METRICS = exports.TSG2_METRICS = Object.freeze({
  font: [12, 15, 25],
  icon: [36, 54, 84],
  indicator: [10, 16, 24],
  bar: 26,
  barFont: 13,
  barTop: 7,
  barUser: 15,
  barUserY: 7,
  barIcon: 20,
  barIconLeft: 4,
  barIconPitch: 30,
  barIconY: 4,
  statusIcons: false,
  dotFont: 6,
  dotGap: 2,
  gridMargin: 20,
  gridColumns: 5,
  gridRows: 2,
  clockFont: 120,
  clockDrop: 8,
  clockSecondsFont: 36,
  clockSecondsX: 0.83,
  clockSecondsY: 0.45,
  unknownBox: 24
});
// Metrics of a keypad resolution: the TSG2 table for a width up to 800 (TSH's own branch), else TSH2, with the given
// width and height. Returns a new TshMetrics object.
exports.metricsFor = function (width, height) {
  return Object.assign({
    width: width,
    height: height
  }, width <= TSG2_MAX_WIDTH ? TSG2_METRICS : TSH2_METRICS);
};
