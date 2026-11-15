Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.navigateToDeviceTable = undefined;
var ScreenName = require("../../logic/ScreenName.js");
exports.navigateToDeviceTable = function (appNavigation, room) {
  appNavigation.navigate(ScreenName.ScreenName.GroupComponent, {
    id: null,
    name: room.name,
    roomId: room.id,
    forceTable: true
  });
};
