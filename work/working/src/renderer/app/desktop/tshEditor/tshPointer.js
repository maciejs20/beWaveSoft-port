// Pointer rules of the TSH screens editor canvas (plan 2026-11-14 section 5 "Interaction Specification"): mapping
// pointer positions to keypad pixels, the drag threshold, hit testing, snapping while dragging, the anchor-only clamp
// and the press/drag/release state machine TshCanvas.js runs. Pure functions, no React and no DOM: a press without
// travelling DRAG_THRESHOLD_PX never moves a widget (RC3), a rectangle frame does not swallow clicks on the widgets
// inside it (RC4), and snapping happens only during a drag with the editor grid on (RC5).
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pointerReducer = exports.IDLE = exports.nudgeAnchor = exports.hitBox = exports.MIN_TEXT_HIT_PX =
  exports.dragAnchor = exports.hitTest = exports.passedThreshold =
  exports.toKeypad = exports.RECT_EDGE_PX = exports.SNAP_PX = exports.DRAG_THRESHOLD_PX = undefined;
var TshLayout = require("./tshLayout.js");
// CSS pixels the pointer travels from the press point before a press becomes a drag.
var DRAG_THRESHOLD_PX = exports.DRAG_THRESHOLD_PX = 4;
// CSS pixels within which a dragged box edge or centre snaps to a target.
var SNAP_PX = exports.SNAP_PX = 6;
// CSS pixels from a rectangle's edge that still hit it (or its border width when wider).
var RECT_EDGE_PX = exports.RECT_EDGE_PX = 4;
// CSS pixels a text box is at least wide for hitting and outlining (an empty text is 0 px wide).
var MIN_TEXT_HIT_PX = exports.MIN_TEXT_HIT_PX = 8;
// Clamps a number to min..max. Returns it.
var clamp = function (v, min, max) {
  return Math.min(Math.max(v, min), max);
};
// Keypad pixel under a pointer: stageRect is the live getBoundingClientRect() of the scaled stage and zoom its CSS
// pixels per keypad pixel, so the mapping holds at any zoom, scroll position or window size. Returns { x, y } floats.
exports.toKeypad = function (clientX, clientY, stageRect, zoom) {
  return {
    x: (clientX - stageRect.left) / zoom,
    y: (clientY - stageRect.top) / zoom
  };
};
// Tells whether the pointer travelled DRAG_THRESHOLD_PX or more from the press point (both in CSS pixels).
// Returns a boolean.
var passedThreshold = exports.passedThreshold = function (start, point) {
  var dx = point.x - start.x;
  var dy = point.y - start.y;
  return dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;
};
// Horizontal extent of a layout box for hitting and outlining at zoom: a text box narrower than MIN_TEXT_HIT_PX grows
// to it around its middle (the drawn text does not change); other boxes are at least 1 keypad pixel wide from their
// left edge.
// Returns { left, width } in keypad pixels.
var hitBox = exports.hitBox = function (l, zoom) {
  var min = l.kind === "text" ? MIN_TEXT_HIT_PX / zoom : 1;
  if (l.width >= min) {
    return {
      left: l.left,
      width: l.width
    };
  }
  return {
    left: l.kind === "text" ? l.left + (l.width - min) / 2 : l.left,
    width: min
  };
};
// How a layout box takes a keypad point: "strong" (inside a widget box, or on a rectangle's edge band), "weak"
// (inside a rectangle away from its edges) or null (outside). The rectangle's pen is centered on its edge, so its
// outer half counts too. Returns the hit kind.
var hitKind = function (l, point, zoom) {
  var pen = l.kind === "rect" ? l.border / 2 : 0;
  var h = hitBox(l, zoom);
  var left = h.left - pen;
  var top = l.top - pen;
  var right = h.left + h.width + pen;
  var bottom = l.top + Math.max(l.height, 1) + pen;
  if (point.x < left || point.x >= right || point.y < top || point.y >= bottom) {
    return null;
  }
  if (l.kind !== "rect") {
    return "strong";
  }
  var band = Math.max(l.border, RECT_EDGE_PX / zoom);
  var inner = point.x >= l.left + band && point.x < l.left + l.width - band && point.y >= l.top + band &&
    point.y < l.top + l.height - band;
  return inner ? "weak" : "strong";
};
// Widget under a keypad point: the topmost (last drawn) widget whose box holds the point, where rectangle interiors
// give way to any other widget under the pointer (rulings: rectangles frame controls). layouts: TshWidgetLayout per
// widget index. cycleFrom: the selected index for Alt+press, which picks the next widget under the pointer after it
// (wrapping), or null. Returns the index or null.
exports.hitTest = function (layouts, point, zoom, cycleFrom) {
  var strong = [];
  var weak = [];
  for (var i = layouts.length - 1; i >= 0; i--) {
    var kind = hitKind(layouts[i], point, zoom);
    if (kind === "strong") {
      strong.push(i);
    } else if (kind === "weak") {
      weak.push(i);
    }
  }
  var order = strong.concat(weak);
  if (!order.length) {
    return null;
  }
  var at = cycleFrom === null || cycleFrom === undefined ? -1 : order.indexOf(cycleFrom);
  return at < 0 ? order[0] : order[(at + 1) % order.length];
};
// Snap of one axis: the box start, middle and end against the targets; the nearest within distance wins.
// Returns { delta, at } or null.
var snapAxis = function (start, size, targets, distance) {
  var best = null;
  [start, start + size / 2, start + size].forEach(function (edge) {
    targets.forEach(function (target) {
      var d = target - edge;
      if (Math.abs(d) <= distance && (best === null || Math.abs(d) < Math.abs(best.delta))) {
        best = {
          delta: d,
          at: target
        };
      }
    });
  });
  return best;
};
// Anchor of a dragged widget: the pointer minus the grab offset (pointer minus anchor at the press), both in keypad
// pixels; layout is the widget's layout at the press. With opts.snap the box edges and centre snap to the grid cell
// edges, the screen edges and centre lines within SNAP_PX / opts.zoom keypad pixels. Only the anchor is clamped to
// the screen, so a box may extend past the edge. Returns { x, y, guides: [{ axis: "x"|"y", at }] } with integer x, y.
exports.dragAnchor = function (grab, point, layout, m, opts) {
  var x = point.x - grab.x;
  var y = point.y - grab.y;
  var guides = [];
  if (opts.snap) {
    var targets = TshLayout.snapTargets(m);
    var distance = SNAP_PX / opts.zoom;
    var sx = snapAxis(x + layout.offsetX, layout.width, targets.xs, distance);
    var sy = snapAxis(y, layout.height, targets.ys, distance);
    if (sx) {
      x += sx.delta;
      guides.push({
        axis: "x",
        at: sx.at
      });
    }
    if (sy) {
      y += sy.delta;
      guides.push({
        axis: "y",
        at: sy.at
      });
    }
  }
  return {
    x: clamp(Math.round(x), 0, m.width - 1),
    y: clamp(Math.round(y), 0, m.height - 1),
    guides: guides
  };
};
// Keyboard nudge of a widget by delta { dx, dy } (TshLayout.nudgeDelta), clamping only its anchor to the screen.
// Returns { x, y }.
exports.nudgeAnchor = function (w, delta, m) {
  return {
    x: clamp(w.x + delta.dx, 0, m.width - 1),
    y: clamp(w.y + delta.dy, 0, m.height - 1)
  };
};
// State of no press. commit is set only on the state a release returns after a drag that changed X/Y.
var IDLE = exports.IDLE = Object.freeze({
  phase: "idle",
  commit: null
});
// Tells whether an event comes from another pointer than the one that pressed (both ids known). Returns a boolean.
var otherPointer = function (state, event) {
  return state.pointerId !== null && state.pointerId !== undefined && event.pointerId !== undefined &&
    event.pointerId !== null && event.pointerId !== state.pointerId;
};
/**
 * Press, drag and release of the canvas as a pure state machine. States: IDLE, or
 * { phase: "pressed"|"dragging", index, movable, start, grab, layout, origin, pos, guides, pointerId, commit: null }.
 * Events:
 *   { type: "down", index, movable, client: {x, y}, keypad: {x, y}, layout, origin: {x, y}, pointerId }   press on
 *                         widget index (pointerId optional: without it every pointer counts as the pressing one)
 *   { type: "move", client, keypad, snap, zoom, m, buttons, pointerId }   pointer moved; becomes a drag past
 *                         DRAG_THRESHOLD_PX. buttons without the primary bit ends the press (the release was missed);
 *                         a move or release of another pointer is ignored
 *   { type: "up", pointerId }   release: { phase: "idle", commit: { index, x, y } } after a drag that changed X/Y,
 *                         else IDLE
 *   { type: "cancel" }    lost pointer, other screen or a changed screen: IDLE without a commit
 *   { type: "key", key }  Escape cancels a press or drag (the widget keeps its X/Y)
 * Returns the next state (the same object when nothing changes).
 */
exports.pointerReducer = function (state, event) {
  switch (event.type) {
    case "down":
      return {
        phase: "pressed",
        index: event.index,
        movable: event.movable,
        start: event.client,
        grab: {
          x: event.keypad.x - event.origin.x,
          y: event.keypad.y - event.origin.y
        },
        layout: event.layout,
        origin: event.origin,
        pos: event.origin,
        guides: [],
        pointerId: event.pointerId ?? null,
        commit: null
      };
    case "move":
      if (state.phase === "idle" || otherPointer(state, event)) {
        return state;
      }
      if (event.buttons !== undefined && (event.buttons & 1) === 0) {
        return IDLE;
      }
      if (!state.movable ||
        state.phase === "pressed" && !passedThreshold(state.start, event.client)) {
        return state;
      }
      var r = exports.dragAnchor(state.grab, event.keypad, state.layout, event.m, {
        snap: event.snap,
        zoom: event.zoom
      });
      return Object.assign({}, state, {
        phase: "dragging",
        pos: {
          x: r.x,
          y: r.y
        },
        guides: r.guides
      });
    case "up":
      if (state.phase !== "idle" && otherPointer(state, event)) {
        return state;
      }
      if (state.phase === "dragging" && (state.pos.x !== state.origin.x || state.pos.y !== state.origin.y)) {
        return {
          phase: "idle",
          commit: {
            index: state.index,
            x: state.pos.x,
            y: state.pos.y
          }
        };
      }
      return IDLE;
    case "cancel":
      return IDLE;
    case "key":
      return event.key === "Escape" ? IDLE : state;
    default:
      return state;
  }
};
