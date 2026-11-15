Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signalRowState = undefined;
var ExpanderInputType = require("../../enums/ExpanderInputType.js");
// What the desktop device tile shows in its signal row, from the same data as the device details screen
// (structure data, device state settings.signal and errorCodes). Only BE WAVE radio devices (product BE_WAVE) get a
// row: with a connection error code it is "no connection" (also when the hub sends no signal value then), otherwise
// the signal when one is reported. Wired bus devices, external devices and virtual devices get null.
// Returns null, { connected: false } or { connected: true, signal }.
exports.signalRowState = function (data, deviceState, connectionErrorCodes) {
  if (data == null || data.product !== ExpanderInputType.HubDeviceProduct.BE_WAVE || deviceState == null) {
    return null;
  }
  var notConnected = (deviceState.errorCodes || []).some(function (code) {
    return connectionErrorCodes.includes(code);
  });
  if (notConnected) {
    return {
      connected: false
    };
  }
  var signal = deviceState.settings == null ? undefined : deviceState.settings.signal;
  if (signal === undefined || signal === null) {
    return null;
  }
  return {
    connected: true,
    signal: signal
  };
};
