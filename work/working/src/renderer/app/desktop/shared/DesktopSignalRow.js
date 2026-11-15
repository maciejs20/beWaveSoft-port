Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DesktopSignalRow = undefined;
var View = require("../../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var reactI18next = require("../../../lib/react-i18next/react-i18next.js");
var module28 = require("../../misc/module_28.js");
var ValueWithLabel = require("../../logic/ValueWithLabel.js");
var Signal = require("../../logic/Signal.js");
var StatusValueWithLabel = require("../../logic/StatusValueWithLabel.js");
var StructureContainer = require("../../logic/StructureContainer.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var LetterSpacing = require("../../logic/LetterSpacing.js");
var Spacing = require("../../logic/Spacing.js");
var getWidthByScreenPercentage = require("../../logic/getWidthByScreenPercentage.js");
var deviceSignal = require("./deviceSignal.js");
var Color = GetHexColorTransparent.Color;
var styles = {
  row: {
    paddingHorizontal: Spacing.Spacing._16,
    paddingVertical: Spacing.Spacing._8
  },
  offline: {
    flexDirection: "row",
    alignItems: "center"
  }
};
// Built at render: theme colors are getters that follow the current theme.
function offlineTextStyle() {
  return Object.assign({}, (0, getWidthByScreenPercentage.fontStyle)(LetterSpacing.FontSize._16, LetterSpacing.FontWeight.Medium, LetterSpacing.LetterSpacing._04, Color.danger500), {
    paddingRight: Spacing.Spacing._8
  });
}
// Desktop device tile: "Signal 45%" with the details screen's colored wifi icon, or red "No connection".
// Read-only, from the card's own structure data and device state; no hub request.
exports.DesktopSignalRow = function (props) {
  var t = (0, reactI18next.useTranslation)().t;
  var state = deviceSignal.signalRowState(props.data, props.deviceState, StructureContainer.ConnectionErrorCodes);
  if (!state) {
    return null;
  }
  var value = state.connected ? <Signal.Signal withLabel={true} signalStrength={state.signal} errorCodes={props.deviceState.errorCodes || []} /> : <View style={styles.offline}><module28.Text style={offlineTextStyle()}>{t("device_table.no_connection")}</module28.Text><StatusValueWithLabel.StatusValueWithLabel color={Color.danger500} iconType="wifi" /></View>;
  return <View style={styles.row}><ValueWithLabel.ValueWithLabel label={t("device.details.common.signal")} value={value} /></View>;
};
