Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AdaptiveSelectOption = exports.DesktopValuePicker = undefined;
var View = require("../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var react = require("../../lib/react/react.reexport.js");
var module28 = require("../misc/module_28.js");
var module63 = require("../misc/module_63.js");
var GetHexColorTransparent = require("./GetHexColorTransparent.js");
var DesktopEditor = require("./DesktopEditor.js");
var SelectOption2 = require("./SelectOption.js");
var Color = GetHexColorTransparent.Color;
var MAX_BUTTONS = 8;
var styles = {
  label: {
    fontSize: 12,
    marginBottom: 6,
    color: Color.secondary600
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  option: {
    borderWidth: 1,
    borderColor: Color.secondary300,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6
  },
  optionSelected: {
    borderColor: Color.secondary900,
    backgroundColor: Color.secondary900
  },
  text: {
    fontSize: 13,
    color: Color.secondary900
  },
  textSelected: {
    color: Color.background
  },
  error: {
    fontSize: 12,
    color: Color.warning400
  }
};
var selectStyle = {
  height: 36,
  fontSize: 13,
  borderRadius: 6,
  paddingLeft: 8,
  width: "100%"
};
// Choice made in place: buttons for short lists, a native select for long ones.
var DesktopValuePicker = exports.DesktopValuePicker = function (props) {
  var options = props.options || [];
  return <View accessibilityRole="radiogroup" accessibilityLabel={props.buttonLabel}><module28.Text style={styles.label}>{props.buttonLabel}</module28.Text>{options.length <= MAX_BUTTONS ? <View style={styles.row}>{options.map(function (option) {
        var selected = option.key === props.selectedOptionKey;
        return <module63.PressableOpacity key={option.key} accessibilityRole="radio" accessibilityState={{
          checked: selected
        }} onPress={function () {
          return props.onChange(option);
        }}><View style={[styles.option, selected && styles.optionSelected]}><module28.Text style={[styles.text, selected && styles.textSelected]}>{option.label}</module28.Text></View></module63.PressableOpacity>;
      })}</View> : <select style={selectStyle} value={props.selectedOptionKey ?? ""} aria-label={props.buttonLabel} onChange={function (event) {
        var option = options.find(function (entry) {
          return String(entry.key) === event.target.value;
        });
        if (option) {
          props.onChange(option);
        }
      }}>{props.selectedOptionKey === null || props.selectedOptionKey === undefined || props.selectedOptionKey === "" ? <option value="" /> : null}{options.map(function (option) {
          return <option key={option.key} value={option.key}>{option.label}</option>;
        })}</select>}{!!props.error && <module28.Text style={styles.error}>{props.error}</module28.Text>}</View>;
};
// Picks the in-place control on the desktop path, the original modal selector elsewhere.
exports.AdaptiveSelectOption = function (props) {
  var desktop = (0, react.useRef)(DesktopEditor.isDesktopEditor()).current;
  return desktop ? <DesktopValuePicker {...props} /> : <SelectOption2.SelectOption {...props} />;
};
