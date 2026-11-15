Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.desktopInitialAction = exports.isDesktopEditor = exports.DESKTOP_EDITOR_MIN_WIDTH = undefined;
var ExpanderInputType = require("../enums/ExpanderInputType.js");
var GetDeviceKey = require("./GetDeviceKey.js");
var DESKTOP_EDITOR_MIN_WIDTH = exports.DESKTOP_EDITOR_MIN_WIDTH = 900;
// Desktop path of the routine and scene editor; narrower windows keep the original behaviour.
var isDesktopEditor = exports.isDesktopEditor = function () {
  return typeof window !== "undefined" && window.innerWidth >= DESKTOP_EDITOR_MIN_WIDTH;
};
// A new on/off action starts as "on" ("1") on desktop; the option order stays as is.
exports.desktopInitialAction = function (action) {
  if (isDesktopEditor() && action.type === ExpanderInputType.SceneScenario_Action_Type.SET_ON_OFF && action.value === "0") {
    return Object.assign({}, action, {
      value: "1"
    });
  }
  return action;
};
// Keeps the selected devices the new trigger or action accepts; the rest are reported, not lost silently.
exports.carryDevices = function (selected, allowed) {
  var previous = selected ?? [];
  var kept = previous.filter(function (key) {
    return (allowed ?? []).some(function (item) {
      return (0, GetDeviceKey.DeviceKeyEqual)(item.key ?? item, key);
    });
  });
  return {
    kept: kept,
    removed: previous.length - kept.length
  };
};
