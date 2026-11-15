// Undo/redo history and keyboard shortcuts of the TSH screens editor (plan 2026-11-14 section 5 "History" and
// "Keyboard on the focused canvas"). The history keeps snapshots of the immutable TshEditorState (every model
// operation returns a new state, so a snapshot is a reference), at most HISTORY_LIMIT steps back; consecutive changes
// with the same coalescing key within COALESCE_MS merge into one step (typing in a field, a held arrow key). Pure
// functions, no React and no DOM.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.inPopup = exports.isFormField = exports.shortcutFor = exports.clampSelection = exports.redo = exports.undo =
  exports.record = exports.createHistory =
  exports.COALESCE_MS = exports.HISTORY_LIMIT = undefined;
var TshEditorModel = require("./tshEditorModel.js");
// Steps kept for undo.
var HISTORY_LIMIT = exports.HISTORY_LIMIT = 100;
// Milliseconds within which changes with the same coalescing key merge into one step.
var COALESCE_MS = exports.COALESCE_MS = 1000;
/**
 * @typedef {Object} TshHistory
 * @property {TshEditorState[]} past     older states, oldest first
 * @property {TshEditorState} present
 * @property {TshEditorState[]} future   states undone, the next redo first
 * @property {string|null} key           coalescing key of the last recorded change (null: never merges)
 * @property {number} at                 time of the last recorded change in ms
 */
// History that starts at a state. Returns a TshHistory.
exports.createHistory = function (state) {
  return {
    past: [],
    present: state,
    future: [],
    key: null,
    at: 0
  };
};
// Records a new present state at time at (ms). A change with the same non-null key as the last one within
// COALESCE_MS replaces the present instead of adding a step; any record clears the redo states. Returns the history
// (the same object when next is the present).
exports.record = function (h, next, key, at) {
  if (next === h.present) {
    return h;
  }
  var k = key ?? null;
  if (k !== null && k === h.key && at - h.at <= COALESCE_MS) {
    return {
      past: h.past,
      present: next,
      future: [],
      key: k,
      at: at
    };
  }
  return {
    past: h.past.concat([h.present]).slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    key: k,
    at: at
  };
};
// Steps back. Returns the history (the same object when there is nothing to undo).
exports.undo = function (h) {
  if (!h.past.length) {
    return h;
  }
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present].concat(h.future),
    key: null,
    at: 0
  };
};
// Steps forward again. Returns the history (the same object when there is nothing to redo).
exports.redo = function (h) {
  if (!h.future.length) {
    return h;
  }
  return {
    past: h.past.concat([h.present]),
    present: h.future[0],
    future: h.future.slice(1),
    key: null,
    at: 0
  };
};
// Tells whether two widgets are equal in content (states are deep copies, so identity does not carry over).
// Returns a boolean.
var sameWidget = function (a, b) {
  return !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
};
// Selection { uid, widget } valid in a state: a screen uid that no longer exists falls back to the first user screen
// (or null), a widget index past the screen's widgets becomes null. With from (the state the selection was made in,
// for undo/redo) the selected widget is found again by content, nearest to its index, when a widget that stood
// elsewhere now holds its index (an undone reorder, review M5); a widget whose content changed keeps its index, also
// when an identical twin of its old content exists. Returns the selection (the same object when
// valid).
exports.clampSelection = function (state, selection, from) {
  if (selection.uid === null) {
    return selection;
  }
  var found = TshEditorModel.findScreen(state, selection.uid);
  if (!found) {
    var first = state.blob.records.find(function (r) {
      return r.kind === "screen" && r.type === "user";
    });
    return {
      uid: first ? first.uid : null,
      widget: null
    };
  }
  var widgets = found.record.widgets;
  var index = selection.widget;
  var before = from && index !== null ? TshEditorModel.findScreen(from, selection.uid) : null;
  var was = before ? before.record.widgets[index] : null;
  var now = widgets[index];
  // Only a slot taken by a widget that stood elsewhere in from (a reorder) sends the search on; an identical twin of
  // the old content must not take the selection after a move of the selected widget.
  var taken = !!was && !!now && !sameWidget(now, was) && before.record.widgets.some(function (w, i) {
    return i !== index && sameWidget(w, now);
  });
  if (taken) {
    // The match nearest to the old index.
    var at = -1;
    widgets.forEach(function (w, i) {
      if (sameWidget(w, was) && (at < 0 || Math.abs(i - index) < Math.abs(at - index))) {
        at = i;
      }
    });
    if (at >= 0) {
      return {
        uid: selection.uid,
        widget: at
      };
    }
  }
  if (selection.widget !== null && !widgets[selection.widget]) {
    return {
      uid: selection.uid,
      widget: null
    };
  }
  return selection;
};
// Popups (TshUi.Popover menus and dialogs) whose controls keep their keys: editor shortcuts wait until they close.
var POPUP_SELECTOR = '[role="menu"],[role="dialog"]';
// Form fields where the browser's own keys (text undo, Backspace, Tab) stay.
var FIELD_TAGS = ["INPUT", "SELECT", "TEXTAREA"];
// Editor action of a keydown event ({ key, ctrlKey, metaKey, shiftKey, altKey, target }): Ctrl/Cmd+Z "undo",
// Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y "redo", Delete/Backspace "delete", G "grid", Tab "nextWidget", Shift+Tab
// "prevWidget", Ctrl/Cmd+= or + "zoomIn", Ctrl/Cmd+- "zoomOut", Ctrl/Cmd+0 "zoomFit", Ctrl/Cmd+1 "zoomActual".
// Ctrl or Cmd count alike (event.metaKey || event.ctrlKey, not a platform branch). Returns the action or null (also
// for every key typed in a form field, an editable element or a popup menu or dialog, review M6).
// Tells whether an event target is a form field or an editable element, where keys belong to the field. Returns a
// boolean.
var isFormField = exports.isFormField = function (target) {
  return !!target && (FIELD_TAGS.indexOf(target.tagName) >= 0 || !!target.isContentEditable);
};
// Tells whether an event target is inside a popup menu or dialog. Returns a boolean.
var inPopup = exports.inPopup = function (target) {
  return !!target && typeof target.closest === "function" && !!target.closest(POPUP_SELECTOR);
};
exports.shortcutFor = function (event) {
  if (isFormField(event.target) || inPopup(event.target)) {
    return null;
  }
  var key = String(event.key ?? "");
  var lower = key.toLowerCase();
  if (event.metaKey || event.ctrlKey) {
    if (event.altKey) {
      return null;
    }
    if (lower === "z") {
      return event.shiftKey ? "redo" : "undo";
    }
    if (lower === "y") {
      return event.shiftKey ? null : "redo";
    }
    if (key === "=" || key === "+") {
      return "zoomIn";
    }
    if (key === "-") {
      return event.shiftKey ? null : "zoomOut";
    }
    if (key === "0" || key === "1") {
      return event.shiftKey ? null : key === "0" ? "zoomFit" : "zoomActual";
    }
    return null;
  }
  if (event.altKey) {
    return null;
  }
  if (key === "Tab") {
    return event.shiftKey ? "prevWidget" : "nextWidget";
  }
  if (event.shiftKey) {
    return null;
  }
  if (key === "Delete" || key === "Backspace") {
    return "delete";
  }
  return lower === "g" ? "grid" : null;
};
