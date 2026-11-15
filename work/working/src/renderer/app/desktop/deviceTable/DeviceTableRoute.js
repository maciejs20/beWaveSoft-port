Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ViewToggle = exports.DeviceTableRoute = undefined;
var View = require("../../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var react = require("../../../lib/react/react.reexport.js");
var reactI18next = require("../../../lib/react-i18next/react-i18next.js");
var module28 = require("../../misc/module_28.js");
var module63 = require("../../misc/module_63.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var DesktopEditor = require("../../logic/DesktopEditor.js");
var useScreenRoute = require("../../hooks/useScreenRoute.js");
var GroupScreen = require("../../screens/GroupScreen.js");
var DeviceTableScreen = require("./DeviceTableScreen.js");
var deviceTableStore = require("./deviceTableStore.js");
var Color = GetHexColorTransparent.Color;
var styles = {
  toggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Color.secondary400,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: Color.background
  },
  // Sits in the title row of the 800 px modal of the graphic view, clear of its close button.
  pinned: {
    position: "fixed",
    top: 68,
    left: "calc(360px + (100vw - 360px) / 2 + min(400px, (100vw - 360px) / 2 - 40px) - 240px)",
    zIndex: 1000
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  selected: {
    backgroundColor: Color.secondary900
  },
  text: {
    fontSize: 13,
    color: Color.secondary900
  },
  selectedText: {
    color: Color.background
  }
};
var ViewToggle = exports.ViewToggle = function (props) {
  var t = (0, reactI18next.useTranslation)().t;
  return <View style={[styles.toggle, props.pinned && styles.pinned]}>{["graphic", "table"].map(function (mode) {
      var selected = props.mode === mode;
      return <module63.PressableOpacity key={mode} accessibilityRole="radio" accessibilityState={{
        checked: selected
      }} onPress={function () {
        return props.onChange(mode);
      }}><View style={[styles.option, selected && styles.selected]}><module28.Text style={[styles.text, selected && styles.selectedText]}>{t(`device_table.view_${mode}`)}</module28.Text></View></module63.PressableOpacity>;
    })}</View>;
};
// The path is fixed when the route opens; narrow windows and phones keep the original screen.
exports.DeviceTableRoute = function (props) {
  var desktop = (0, react.useRef)(DesktopEditor.isDesktopEditor()).current;
  var params = (0, useScreenRoute.useScreenRoute)().params;
  // The side menu entry always opens the table, whatever view the tiles remember.
  var modeState = (0, react.useState)(params?.forceTable ? "table" : deviceTableStore.loadViewMode);
  if (!desktop) {
    return <GroupScreen.GroupScreen {...props} />;
  }
  var setMode = function (mode) {
    deviceTableStore.saveViewMode(mode);
    modeState[1](mode);
  };
  return modeState[0] === "table" ? <DeviceTableScreen.DeviceTableScreen toggle={<ViewToggle mode="table" onChange={setMode} />} /> : <react.Fragment><GroupScreen.GroupScreen {...props} /><ViewToggle pinned={true} mode="graphic" onChange={setMode} /></react.Fragment>;
};
