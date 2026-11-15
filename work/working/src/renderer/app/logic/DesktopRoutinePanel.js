Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PanelDirtyReporter = exports.DesktopRoutineEditor = exports.usePanelRoute = exports.usePanelNavigation = exports.useEditorState = exports.useEditorNavigation = undefined;
var View = require("../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var react = require("../../lib/react/react.reexport.js");
var lodash = require("../../lib/lodash/lodash.js");
var reactI18next = require("../../lib/react-i18next/react-i18next.js");
var module21 = require("../misc/module_21.js");
var module28 = require("../misc/module_28.js");
var module63 = require("../misc/module_63.js");
var module623 = require("../misc/module_623.js");
var useScreenRoute = require("../hooks/useScreenRoute.js");
var GetHexColorTransparent = require("./GetHexColorTransparent.js");
var ScreenName = require("./ScreenName.js");
var Color = GetHexColorTransparent.Color;
var EditorContext = (0, react.createContext)(null);
var PanelScreenContext = (0, react.createContext)(null);
var conditionSelect = ScreenName.ScreenName.AutomationConditionSelectTrigger;
var conditionSet = ScreenName.ScreenName.AutomationConditionSet;
var actionSelect = ScreenName.ScreenName.AutomationActionSelectTrigger;
var actionSet = ScreenName.ScreenName.AutomationActionSet;
// Below this window width the panel takes the form's place; both stay mounted either way.
var TWO_PANES_MIN_WIDTH = 1300;
var styles = {
  frame: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    height: "100%"
  },
  form: {
    flex: 1,
    minWidth: 0,
    maxWidth: 800,
    height: "100%",
    justifyContent: "center"
  },
  panel: {
    flex: 1,
    minWidth: 0,
    maxWidth: 800,
    height: "100%",
    justifyContent: "center"
  },
  gap: {
    marginLeft: 12
  },
  unavailable: {
    backgroundColor: Color.background,
    borderRadius: 6,
    padding: 24
  },
  text: {
    fontSize: 14,
    marginBottom: 12,
    color: Color.secondary900
  },
  raw: {
    fontSize: 12,
    marginBottom: 12,
    color: Color.secondary600
  }
};
// In the editor, opening a condition or action goes to the side panel instead of a new modal.
exports.useEditorNavigation = function () {
  var base = (0, module21.useAppNavigation)();
  var editor = (0, react.useContext)(EditorContext);
  return (0, react.useMemo)(function () {
    if (!editor) {
      return base;
    }
    return Object.assign({}, base, {
      navigate: function (name, params) {
        if (name === conditionSelect || name === actionSelect) {
          return editor.open(name, params);
        }
        return base.navigate(name, params);
      }
    });
  }, [base, editor]);
};
exports.useEditorState = function () {
  return (0, react.useContext)(EditorContext);
};
// Navigation for the condition and action screens: the panel's when embedded, the app's otherwise.
exports.usePanelNavigation = function () {
  var base = (0, module21.useAppNavigation)();
  var screen = (0, react.useContext)(PanelScreenContext);
  return screen ? screen.navigation : base;
};
exports.usePanelRoute = function () {
  var route = (0, useScreenRoute.useScreenRoute)();
  var screen = (0, react.useContext)(PanelScreenContext);
  return screen ? {
    params: screen.params
  } : route;
};
// Marks the panel as having unconfirmed edits once its form differs from the first values.
exports.PanelDirtyReporter = function (props) {
  var screen = (0, react.useContext)(PanelScreenContext);
  var first = (0, react.useRef)(lodash.cloneDeep(props.values));
  var dirty = !lodash.isEqual(first.current, props.values);
  (0, react.useEffect)(function () {
    if (screen && dirty) {
      screen.markDirty();
    }
  }, [dirty]);
  return null;
};
function resolveOpen(name, params) {
  if (name === conditionSelect) {
    var condition = params.condition;
    if (!condition || !condition.expression) {
      return conditionSelect;
    }
    return params.triggers.some(function (item) {
      return item.type === condition.expression.trigger;
    }) ? conditionSet : "unavailable";
  }
  if (!params.action) {
    return actionSelect;
  }
  return params.actions.some(function (item) {
    return item.type === params.action.type;
  }) ? actionSet : "unavailable";
}
// Hosts the routine form and, next to it, the panel with the current condition or action.
exports.DesktopRoutineEditor = function (props) {
  var t = (0, reactI18next.useTranslation)().t;
  var base = (0, module21.useAppNavigation)();
  var panelState = (0, react.useState)(null);
  var panel = panelState[0];
  var dirtyState = (0, react.useState)(false);
  var dirty = dirtyState[0];
  var counter = (0, react.useRef)(0);
  var widthState = (0, react.useState)(window.innerWidth);
  (0, react.useEffect)(function () {
    function onResize() {
      widthState[1](window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return function () {
      return window.removeEventListener("resize", onResize);
    };
  }, []);
  var twoPanes = widthState[0] >= TWO_PANES_MIN_WIDTH;
  var closePanel = function () {
    dirtyState[1](false);
    panelState[1](null);
  };
  var confirmDiscard = function () {
    if (!dirty) {
      return Promise.resolve(true);
    }
    return (0, module623.confirmDialog)(t("automation.picker.discard_title"), t("automation.picker.discard_message"), t("automation.picker.discard"), t("automation.picker.keep_editing"));
  };
  var requestClose = function () {
    return confirmDiscard().then(function (accepted) {
      if (accepted) {
        closePanel();
      }
    });
  };
  var open = function (name, params) {
    return confirmDiscard().then(function (accepted) {
      if (accepted) {
        counter.current += 1;
        dirtyState[1](false);
        panelState[1]({
          id: counter.current,
          screen: resolveOpen(name, params),
          params: params
        });
      }
    });
  };
  var editor = {
    open: open,
    panelOpen: !!panel,
    dirty: dirty,
    requestClose: requestClose
  };
  var editorValue = (0, react.useMemo)(function () {
    return editor;
  }, [!!panel, dirty, counter.current]);
  var setStep = function (screen, params) {
    panelState[1](function (current) {
      return current && Object.assign({}, current, {
        screen: screen,
        params: params
      });
    });
  };
  var navigation = panel && Object.assign({}, base, {
    navigate: function (name, params) {
      return name === conditionSet || name === actionSet ? setStep(name, params) : base.navigate(name, params);
    },
    popTo: function (name, params) {
      return setStep(name, params);
    },
    pop: closePanel,
    goBack: requestClose,
    requestClose: requestClose,
    twoPanes: twoPanes
  });
  var screenValue = panel && {
    params: panel.params,
    navigation: navigation,
    markDirty: function () {
      return dirtyState[1](true);
    }
  };
  var PanelScreen = panel && props.screens[panel.screen];
  return <EditorContext.Provider value={editorValue}><View style={styles.frame}><View style={[styles.form, !!panel && !twoPanes && {
          display: "none"
        }]}>{props.children}</View>{!!panel && <View style={[styles.panel, twoPanes && styles.gap]}>{panel.screen === "unavailable" ? <View style={styles.unavailable}><module28.Text style={styles.text}>{t("automation.picker.unavailable")}</module28.Text><module28.Text style={styles.raw}>{JSON.stringify(panel.params.condition?.expression ?? panel.params.action)}</module28.Text><module63.PressableOpacity onPress={closePanel}><module28.Text style={styles.text}>{t("automation.picker.close")}</module28.Text></module63.PressableOpacity></View> : <PanelScreenContext.Provider value={screenValue}><PanelScreen key={`${panel.id}-${panel.screen}`} /></PanelScreenContext.Provider>}</View>}</View></EditorContext.Provider>;
};
