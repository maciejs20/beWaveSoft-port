Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DesktopNameList = undefined;
var View = require("../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var react = require("../../lib/react/react.reexport.js");
var module28 = require("../misc/module_28.js");
var module63 = require("../misc/module_63.js");
var reactI18next = require("../../lib/react-i18next/react-i18next.js");
var COLLAPSED_LIMIT = 12;
var rowStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center"
};
// Lists every selected device by name, wrapped, instead of the first name and a "+N" badge.
exports.DesktopNameList = function (props) {
  var keys = props.keys;
  var renderName = props.renderName;
  var prefix = props.prefix;
  var style = props.style;
  var t = (0, reactI18next.useTranslation)().t;
  var expanded = (0, react.useState)(false);
  var visible = expanded[0] ? keys : keys.slice(0, COLLAPSED_LIMIT);
  return <View style={rowStyle}>{!!props.parenthesized && <module28.Text style={style}>(</module28.Text>}{!!prefix && <module28.Text style={style}>{prefix} </module28.Text>}{visible.map(function (key, index) {
      return <View style={rowStyle} key={index}>{renderName(key)}{index < visible.length - 1 && <module28.Text style={style}>, </module28.Text>}</View>;
    })}{keys.length > visible.length && <module63.PressableOpacity onPress={function () {
      return expanded[1](true);
    }}><module28.Text style={style}> {t("automation.summary.show_all", {
          count: keys.length
        })}</module28.Text></module63.PressableOpacity>}{!!props.parenthesized && <module28.Text style={style}>)</module28.Text>}</View>;
};
// Prefix naming how a condition combines its devices.
exports.deviceOperatorPrefix = function (t, deviceOperator, hasOperatorFeature) {
  if (deviceOperator === undefined || deviceOperator === null) {
    // The condition form presents an unset operator as "or".
    return hasOperatorFeature ? t("automation.summary.any_of") : "";
  }
  var key = {
    0: "all_of",
    1: "any_of",
    2: "sum_of"
  }[Number(deviceOperator)];
  return key ? t(`automation.summary.${key}`) : "";
};
