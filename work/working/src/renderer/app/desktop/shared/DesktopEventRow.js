// Desktop path only: compact event log row used by EventLogListScreen instead of the original event card.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DesktopEventRow = undefined;
var View = require("../../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var module21 = require("../../misc/module_21.js");
var module28 = require("../../misc/module_28.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var ScreenName = require("../../logic/ScreenName.js");
var getEventDateToDisplay = require("../../logic/getEventDateToDisplay.js");
var Icon2 = require("../../logic/Icon.js");
var IconFontWeight = require("../../logic/IconFontWeight.js");
var ThemeProvider = require("../../components/ThemeProvider.js");
var AppThemes = require("../../logic/AppThemes.js");
var ExpanderInputType = require("../../enums/ExpanderInputType.js");
var module170 = require("../../misc/module_170.js");
var Color = GetHexColorTransparent.Color;
var styles = {
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 30,
    borderBottomWidth: 1,
    borderBottomColor: Color.secondary300,
    paddingHorizontal: 6,
    cursor: "pointer"
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  time: {
    width: 130,
    flexShrink: 0,
    fontSize: 12,
    color: Color.secondary600
  },
  issuer: {
    width: 170,
    flexShrink: 0,
    fontSize: 13,
    paddingRight: 8,
    color: Color.secondary900
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: Color.secondary900
  }
};
// One line per event with the same type icon as the original card (bell or Grade 2 mark); a click opens the same
// details screen as the card.
exports.DesktopEventRow = function (props) {
  var data = props.data;
  var appNavigation = (0, module21.useAppNavigation)();
  var theme = (0, ThemeProvider.useThemeState)().theme;
  var isDark = (0, AppThemes.IsDarkTheme)(theme);
  return <View style={styles.row} accessibilityRole="row" onClick={function () {
    return appNavigation.navigate(ScreenName.ScreenName.EventLogDetails, {
      data: data
    });
  }}><View style={[styles.icon, {
      backgroundColor: (0, getEventDateToDisplay.getEventBackgroundColor)(data.event.type, isDark)
    }]}>{data.event.type === ExpanderInputType.HubEvent_Type.GRADE2 ? <module170.Grade2Solid width={12} height={12} fill={(0, getEventDateToDisplay.getEventBellColor)(data.event.type, isDark)} /> : <Icon2.Icon icon="bell" fontSize={12} fontWeight={IconFontWeight.IconFontWeight.Solid} color={(0, getEventDateToDisplay.getEventBellColor)(data.event.type, isDark)} />}</View><module28.Text style={styles.time} numberOfLines={1}>{(0, getEventDateToDisplay.getEventDateToDisplay)(data.event, false)}</module28.Text><module28.Text style={styles.issuer} numberOfLines={1}>{data.event.userName ?? ""}{data.room ? ` [${data.room}]` : ""}</module28.Text><module28.Text style={styles.message} numberOfLines={1}>{data.event.message}</module28.Text></View>;
};
