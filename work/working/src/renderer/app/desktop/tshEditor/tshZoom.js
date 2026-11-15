// Zoom of the TSH screens editor canvas (docs/plans/2026-11-14-tsh-editor-redesign.md 3.3 "Canvas"): the fixed zoom
// levels of the toolbar menu, Fit (the keypad screen as large as the canvas pane allows), stepping from any zoom to the
// next level, and the scroll that keeps the keypad point under the pointer in place while zooming. Pure functions, no
// React and no DOM; zoom is CSS pixels per keypad pixel.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zoomAround = exports.stepZoom = exports.fitZoom = exports.MIN_ZOOM = exports.ZOOM_LEVELS = undefined;
// Zoom levels of the toolbar menu and of the zoom-in/zoom-out steps (plan 3.3).
var ZOOM_LEVELS = exports.ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3, 4];
// Smallest Fit zoom: a pane too small for any screen still draws one (the shell keeps the canvas >= 360 px wide).
var MIN_ZOOM = exports.MIN_ZOOM = 0.05;
// Levels closer than this count as equal (Fit can land on a level up to float noise).
var EPSILON = 1e-6;
// Fit zoom of a keypad screen (m: { width, height } keypad px) in a pane ({ width, height } CSS px) with padding CSS
// px on every side, at most the largest level. Returns the zoom.
exports.fitZoom = function (pane, m, padding) {
  var z = Math.min((pane.width - 2 * padding) / m.width, (pane.height - 2 * padding) / m.height);
  return Math.min(Math.max(z, MIN_ZOOM), ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
};
// Next level from the current zoom in direction dir (1 in, -1 out); from Fit or any other zoom between levels the
// nearest level in that direction; at the ends the end level. Returns the zoom.
exports.stepZoom = function (current, dir) {
  if (dir > 0) {
    var up = ZOOM_LEVELS.find(function (z) {
      return z > current + EPSILON;
    });
    return up ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  }
  var down = ZOOM_LEVELS.filter(function (z) {
    return z < current - EPSILON;
  }).pop();
  return down ?? ZOOM_LEVELS[0];
};
// Scroll of the canvas pane after a zoom from `from` to `to` that keeps the keypad point under the pointer in place.
// scroll { left, top }: the pane scroll minus the stage's offset in the pane content before the zoom; point { x, y }:
// the pointer in the pane viewport. The caller adds the stage's content offset after the zoom (it moves when the stage
// stops being centred). Returns { left, top } (the pane clamps values it cannot scroll to).
exports.zoomAround = function (scroll, point, from, to) {
  var k = to / from;
  return {
    left: (scroll.left + point.x) * k - point.x,
    top: (scroll.top + point.y) * k - point.y
  };
};
