Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.returnsToTable = exports.TABLE_SCREENS = undefined;
var ScreenName = require("../../logic/ScreenName.js");
// Screens that show a desktop table whose rows open the device details.
var TABLE_SCREENS = exports.TABLE_SCREENS = [ScreenName.ScreenName.GroupComponent, ScreenName.ScreenName.HubFailures];
// True when the screen just below the current one in this navigator is a desktop table.
exports.returnsToTable = function (state) {
  var index = state?.index;
  if (typeof index !== "number" || index < 1) {
    return false;
  }
  return TABLE_SCREENS.includes(state.routes?.[index - 1]?.name);
};
