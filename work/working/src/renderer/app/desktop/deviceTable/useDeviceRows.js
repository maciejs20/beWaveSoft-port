Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useDeviceRows = undefined;
var lodash = require("../../../lib/lodash/lodash.js");
var i18nextMin = require("../../../lib/i18next/i18next.min.js").default;
var ServiceProvider = require("../../services/ServiceProvider.js");
var useDerivedWithHubInfo = require("../../hooks/useDerivedWithHubInfo.js");
var deviceTableModel = require("./deviceTableModel.js");
var deviceTableNames = require("./deviceTableNames.js");
// One live, read-only list of device rows shared by the desktop tables. Since 1.2.0 the device state is not kept
// in Realm, so it comes from the live state stream, like in the original device screens.
exports.useDeviceRows = function () {
  var hub = (0, ServiceProvider.useService)().hub;
  return (0, useDerivedWithHubInfo.fromCacheWithStates)("DeviceTable()", function (data) {
    return lodash.isNil(data) ? null : hub.structure.tree(data, i18nextMin.t).rooms;
  }, function (rooms, states) {
    return rooms ? deviceTableModel.buildRows(i18nextMin.t, rooms, states, deviceTableNames.deviceTableNames) : [];
  });
};
