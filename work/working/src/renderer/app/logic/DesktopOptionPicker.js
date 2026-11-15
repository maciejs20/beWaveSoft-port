Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CONDITION_FREQUENT_TRIGGERS = exports.ACTION_FREQUENT_TYPES = exports.DesktopOptionPicker = undefined;
var View = require("../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var TextInput = require("../../lib/react-native-web/dist/cjs/exports/TextInput/index.js").default;
var react = require("../../lib/react/react.reexport.js");
var lodash = require("../../lib/lodash/lodash.js");
var reactI18next = require("../../lib/react-i18next/react-i18next.js");
var module28 = require("../misc/module_28.js");
var module58 = require("../misc/module_58.js");
var module63 = require("../misc/module_63.js");
var Icon2 = require("./Icon.js");
var IconFontWeight = require("./IconFontWeight.js");
var LetterSpacing = require("./LetterSpacing.js");
var GetHexColorTransparent = require("./GetHexColorTransparent.js");
var ExpanderInputType = require("../enums/ExpanderInputType.js");
var Trigger = ExpanderInputType.SceneScenario_Condition_Trigger;
var Action = ExpanderInputType.SceneScenario_Action_Type;
exports.CONDITION_FREQUENT_TRIGGERS = [Trigger.INPUT_STATE, Trigger.VIOLATION, Trigger.SENSOR_MOTION, Trigger.SENSOR_MAGNETIC, Trigger.CRON_EXPRESSION];
exports.ACTION_FREQUENT_TYPES = [Action.SET_ON_OFF, Action.RUN_SCENE, Action.INVOKE_NOTIFICATION, Action.INVOKE_CHIME];
var MAX_COLLAPSED_REST = 30;
var Color = GetHexColorTransparent.Color;
var styles = {
  search: {
    borderWidth: 1,
    borderColor: Color.secondary300,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    fontSize: 14,
    marginBottom: 12,
    color: Color.secondary900
  },
  label: {
    fontSize: 12,
    color: Color.secondary600,
    marginTop: 8,
    marginBottom: 6
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  cell: {
    width: "100%",
    padding: 1
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: Color.secondary50
  },
  highlighted: {
    borderColor: Color.secondary400
  },
  selected: {
    borderColor: Color.secondary900,
    backgroundColor: Color.background
  },
  name: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    color: Color.secondary900
  },
  number: {
    fontSize: 11,
    color: Color.secondary600
  },
  mark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Color.secondary400,
    marginLeft: 10
  },
  markSelected: {
    backgroundColor: Color.secondary900,
    borderColor: Color.secondary900
  },
  more: {
    fontSize: 13,
    marginTop: 8,
    color: Color.secondary800
  }
};
var normalize = function (text) {
  return lodash.deburr(String(text)).toLowerCase();
};
var isTyping = function (target) {
  return !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
};
// Compact desktop list: frequent options first, search, two columns and keyboard control.
exports.DesktopOptionPicker = function (props) {
  var items = props.items;
  var selectedKey = props.selectedKey;
  var frequentKeys = props.frequentKeys;
  var onSelect = props.onSelect;
  var onConfirm = props.onConfirm;
  var t = (0, reactI18next.useTranslation)().t;
  var queryState = (0, react.useState)("");
  var query = queryState[0];
  var frequent = frequentKeys.map(function (key) {
    return items.find(function (item) {
      return item.key === key;
    });
  }).filter(Boolean);
  var rest = items.filter(function (item) {
    return frequent.indexOf(item) < 0;
  });
  var allState = (0, react.useState)(rest.length <= MAX_COLLAPSED_REST || rest.some(function (item) {
    return item.key === selectedKey;
  }));
  var showAll = allState[0];
  var searching = query.trim().length > 0;
  var found = items.filter(function (item) {
    return normalize(item.name).includes(normalize(query.trim()));
  });
  var visible = searching ? found : frequent.concat(showAll ? rest : []);
  var highlightState = (0, react.useState)(null);
  var highlightKey = highlightState[0] !== null && visible.some(function (item) {
    return item.key === highlightState[0];
  }) ? highlightState[0] : searching && visible.length ? visible[0].key : selectedKey;
  var inputRef = (0, react.useRef)(null);
  var highlightRef = (0, react.useRef)(null);
  (0, react.useEffect)(function () {
    var timer = setTimeout(function () {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
    return function () {
      return clearTimeout(timer);
    };
  }, []);
  (0, react.useEffect)(function () {
    if (highlightRef.current && highlightRef.current.scrollIntoView) {
      highlightRef.current.scrollIntoView({
        block: "nearest"
      });
    }
  }, [highlightKey, showAll]);
  (0, module58.useFocusEffect)(function () {
    function onKeyDown(event) {
      if (event.isComposing) {
        return;
      }
      var typing = isTyping(event.target);
      if (event.altKey && /^Digit[1-9]$/.test(event.code)) {
        event.preventDefault();
        var item = frequent[Number(event.code.slice(5)) - 1];
        if (item) {
          onSelect(item.key);
          highlightState[1](item.key);
        }
        return;
      }
      if (event.key === "/" && !typing) {
        event.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
        }
        return;
      }
      if (event.key === "Escape" && !searching && event.target === inputRef.current) {
        // TextInput stops keydown from bubbling, so hand Esc over to the page's own handler.
        event.preventDefault();
        event.stopImmediatePropagation();
        inputRef.current.blur();
        window.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true
        }));
        return;
      }
      if (event.key === "Escape" && searching) {
        event.preventDefault();
        event.stopImmediatePropagation();
        queryState[1]("");
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (typing && event.target !== inputRef.current) {
          return;
        }
        event.preventDefault();
        var index = visible.findIndex(function (entry) {
          return entry.key === highlightKey;
        });
        var next = visible[Math.min(visible.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)))];
        if (next) {
          highlightState[1](next.key);
        }
        return;
      }
      if (event.key === "Enter" && !event.repeat && (!typing || event.target === inputRef.current)) {
        event.preventDefault();
        if (highlightKey !== undefined && highlightKey !== selectedKey && visible.some(function (entry) {
          return entry.key === highlightKey;
        })) {
          onSelect(highlightKey);
        } else if (!searching && highlightKey === selectedKey) {
          onConfirm();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return function () {
      return window.removeEventListener("keydown", onKeyDown, true);
    };
  });
  var renderRow = function (item, number) {
    var isSelected = item.key === selectedKey;
    var isHighlighted = item.key === highlightKey;
    return <View style={styles.cell} key={item.key} ref={isHighlighted ? highlightRef : undefined}><module63.PressableOpacity accessibilityRole="radio" accessibilityState={{
        checked: isSelected
      }} onPress={function () {
        highlightState[1](item.key);
        onSelect(item.key);
      }}><View style={[styles.row, isHighlighted && styles.highlighted, isSelected && styles.selected]}>{!!item.icon && <Icon2.Icon icon={item.icon} fontSize={LetterSpacing.FontSize._16} fontWeight={IconFontWeight.IconFontWeight.Light} color={Color.secondary900} />}<module28.Text style={styles.name} numberOfLines={1}>{item.name}</module28.Text>{!!number && <module28.Text style={styles.number}>Alt+{number}</module28.Text>}<View style={[styles.mark, isSelected && styles.markSelected]} /></View></module63.PressableOpacity></View>;
  };
  return <View><TextInput ref={inputRef} style={styles.search} value={query} placeholder={t("automation.picker.search")} onChangeText={function (text) {
      highlightState[1](null);
      queryState[1](text);
    }} />{!!props.notice && <module63.PressableOpacity onPress={props.notice.undo}><module28.Text style={styles.more}>{t("automation.picker.devices_removed", {
          count: props.notice.count
        })}</module28.Text></module63.PressableOpacity>}{searching ? <View style={styles.grid}>{found.map(function (item) {
        return renderRow(item);
      })}</View> : <View>{frequent.length > 0 && <module28.Text style={styles.label}>{t("automation.picker.frequent")}</module28.Text>}<View style={styles.grid}>{frequent.map(function (item, index) {
          return renderRow(item, index + 1);
        })}</View>{rest.length > 0 && (showAll ? <View><module28.Text style={styles.label}>{t("automation.picker.all")}</module28.Text><View style={styles.grid}>{rest.map(function (item) {
            return renderRow(item);
          })}</View></View> : <module63.PressableOpacity onPress={function () {
          return allState[1](true);
        }}><module28.Text style={styles.more}>{t("automation.picker.show_all", {
            count: rest.length
          })}</module28.Text></module63.PressableOpacity>)}</View>}</View>;
};
