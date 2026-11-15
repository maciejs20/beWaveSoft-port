// Questions of the TSH screens editor over the app's confirm dialog (module_623 confirmDialog), one at a time.
// The app's dialog has no Escape handling: Esc reached Page's window handler, which asked "Leave screen?" over the
// pending question and lost its answer (review I2). While a question is open, Esc answers "no" in the capture phase
// and never reaches the page; a new question answers the pending one "no"; a press inside the editor (which the
// dialog's full-window overlay would have caught) shows that another dialog replaced it and answers it "no" too.
// With deps.shows the asker also sees the replacement itself (the app-close leave question): a question the dialog no
// longer shows (after it was seen, or SHOW_GRACE_MS after asking) counts as answered "no" at the next look, so the
// editor keys are free again and Esc goes its usual way (review N2).
// No React; the dialog, its hide function and the window come in as deps, so the rules are testable.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createAsker = exports.SHOW_GRACE_MS = undefined;
// Milliseconds a question may take to appear in the dialog before "not shown" means it was replaced.
var SHOW_GRACE_MS = exports.SHOW_GRACE_MS = 500;
/**
 * Asker over deps:
 *   confirm(title, text, ok, cancel) -> Promise<boolean>   shows the dialog
 *   hide()                                                 closes it without an answer
 *   target                                                 window (addEventListener / removeEventListener)
 *   inEditor(node) -> boolean                              tells whether a node is part of the editor (behind the
 *                                                          dialog's overlay)
 *   shows(title, text) -> boolean   optional: tells whether the dialog shows this question now
 *   now() -> number                 optional: time in ms (Date.now)
 * Returns { ask(title, text, ok, cancel) -> Promise<boolean>, pending() -> boolean, dismiss() }.
 */
exports.createAsker = function (deps) {
  var current = null;
  var now = deps.now ?? Date.now;
  // Tells whether an open question is still in the dialog; one that is gone is answered "no". Returns a boolean.
  var alive = function (entry) {
    if (!deps.shows) {
      return true;
    }
    if (deps.shows(entry.title, entry.text)) {
      entry.seen = true;
      return true;
    }
    if (entry.seen || now() - entry.at > SHOW_GRACE_MS) {
      entry.finish(false);
      return false;
    }
    return true;
  };
  var ask = function (title, text, ok, cancel) {
    if (current) {
      current.finish(false);
    }
    return new Promise(function (resolve) {
      var entry = {
        title: title,
        text: text,
        at: now(),
        seen: false
      };
      var finish = function (value) {
        if (entry.done) {
          return;
        }
        entry.done = true;
        deps.target.removeEventListener("keydown", onKey, true);
        deps.target.removeEventListener("pointerdown", onPointer, true);
        if (current === entry) {
          current = null;
        }
        resolve(value);
      };
      var onKey = function (event) {
        if (event.key !== "Escape" || !alive(entry)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        deps.hide();
        finish(false);
      };
      var onPointer = function (event) {
        if (deps.inEditor(event.target)) {
          finish(false);
        }
      };
      entry.finish = finish;
      current = entry;
      deps.target.addEventListener("keydown", onKey, true);
      deps.target.addEventListener("pointerdown", onPointer, true);
      Promise.resolve(deps.confirm(title, text, ok, cancel)).then(function (value) {
        finish(!!value);
      }, function () {
        finish(false);
      });
    });
  };
  return {
    ask: ask,
    // Tells whether a question is open. Returns a boolean.
    pending: function () {
      return current !== null && alive(current);
    },
    // Answers the open question "no" without touching the dialog (the editor closes).
    dismiss: function () {
      if (current) {
        current.finish(false);
      }
    }
  };
};
