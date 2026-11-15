Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deviceTableNames = undefined;
var ResolveRoomName = require("../../logic/ResolveRoomName.js");
var BuildDeviceViewModel = require("../../logic/BuildDeviceViewModel.js");
var ShowDeviceIsArmingWarningModal = require("../../logic/ShowDeviceIsArmingWarningModal.js");
// App lookups used by deviceTableModel.buildRows.
exports.deviceTableNames = {
  roomName: ResolveRoomName.ResolveRoomName,
  isInput: ResolveRoomName.IsExpanderInput,
  isTamper: ResolveRoomName.IsTemporaryChannel,
  channelName: BuildDeviceViewModel.GetChannelName,
  deviceName: ShowDeviceIsArmingWarningModal.GetDeviceName
};
