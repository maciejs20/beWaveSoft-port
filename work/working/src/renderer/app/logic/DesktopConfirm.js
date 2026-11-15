Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.confirmControl = undefined;
var i18nextMin = require("../../lib/i18next/i18next.min.js").default;
var module623 = require("../misc/module_623.js");
var DesktopEditor = require("./DesktopEditor.js");
// Asks before a group command reaches real devices, on the desktop path only; single outputs and routines are exempt by decision.
exports.confirmControl = function (message) {
  if (!DesktopEditor.isDesktopEditor()) {
    return Promise.resolve(true);
  }
  return (0, module623.confirmDialog)(i18nextMin.t("device_table.confirm_title"), message, i18nextMin.t("device_table.confirm_yes"), i18nextMin.t("device_table.confirm_no"));
};
