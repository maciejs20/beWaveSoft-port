Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.armClickShield = undefined;
var SHIELD_MS = 600;
var EVENTS = ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "keydown", "keyup"];
// Swallows input right after details open: details act on one click, so a double click must not reach them.
exports.armClickShield = function () {
  function block(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  EVENTS.forEach(function (type) {
    return window.addEventListener(type, block, true);
  });
  setTimeout(function () {
    EVENTS.forEach(function (type) {
      return window.removeEventListener(type, block, true);
    });
  }, SHIELD_MS);
};
