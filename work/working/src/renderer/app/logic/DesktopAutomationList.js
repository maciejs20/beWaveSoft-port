// Desktop path only: table of scenes or routines shown by AutomationList instead of the tile grid.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DesktopAutomationList = undefined;
var View = require("../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var react = require("../../lib/react/react.reexport.js");
var reactI18next = require("../../lib/react-i18next/react-i18next.js");
var module21 = require("../misc/module_21.js");
var module28 = require("../misc/module_28.js");
var module63 = require("../misc/module_63.js");
var module231 = require("../misc/module_231.js");
var ServiceProvider = require("../services/ServiceProvider.js");
var AppProvider = require("../services/AppProvider.js");
var ExpanderInputType = require("../enums/ExpanderInputType.js");
var OperationType = require("../enums/OperationType.js");
var SetRoutineState = require("../enums/SetRoutineState.js");
var ScreenName = require("./ScreenName.js");
var Icon2 = require("./Icon.js");
var IconFontWeight = require("./IconFontWeight.js");
var LetterSpacing = require("./LetterSpacing.js");
var GetHexColorTransparent = require("./GetHexColorTransparent.js");
var GetActionCardTitle = require("./GetActionCardTitle.js");
var AutomationActionButton = require("./AutomationActionButton.js");
var Color = GetHexColorTransparent.Color;
var styles = {
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: Color.secondary300,
    backgroundColor: Color.background,
    paddingHorizontal: 12
  },
  header: {
    minHeight: 28,
    backgroundColor: "transparent"
  },
  headerText: {
    fontSize: 12,
    color: Color.secondary600
  },
  open: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0
  },
  name: {
    flexBasis: 240,
    fontSize: 14,
    paddingRight: 12,
    color: Color.secondary900
  },
  summary: {
    flex: 1,
    fontSize: 12,
    paddingRight: 12,
    color: Color.secondary600
  },
  icon: {
    width: 28
  },
  enabled: {
    width: 64
  },
  actions: {
    width: 96,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center"
  }
};
// Flattens nested condition groups into a list of expressions; returns `out`.
function collectConditions(conditions, out) {
  (conditions ?? []).forEach(function (item) {
    if (item.expression) {
      out.push(item.expression);
    }
    collectConditions(item.conditions ?? item.Conditions, out);
  });
  return out;
}
// Returns " (n)" for n selected devices, or an empty string.
function deviceSuffix(count) {
  return count > 0 ? ` (${count})` : "";
}
// Returns the comma-separated trigger names of a routine, each with its device count.
function conditionSummary(t, automation) {
  return collectConditions(automation.triggerConditions?.conditions, []).map(function (expression) {
    var name = ExpanderInputType.SceneScenario_Condition_Trigger[expression.trigger];
    return (name ? t(`automation.condition.trigger-type.${name.toLowerCase()}`) : "?") + deviceSuffix(expression.deviceIds?.length ?? 0);
  }).join(", ");
}
// Returns the comma-separated action titles (delays skipped), each with its device count.
function actionSummary(automation) {
  return (automation.triggerActions?.actions ?? []).filter(function (action) {
    return action.type !== ExpanderInputType.SceneScenario_Action_Type.DELAY;
  }).map(function (action) {
    return (0, GetActionCardTitle.GetActionCardTitle)(action) + deviceSuffix(action.deviceIds?.length ?? 0);
  }).join(", ");
}
// One table row: name opens the editor, switch enables the routine, buttons run the same actions as the tile.
function Row(props) {
  var automation = props.automation;
  var isRoutine = props.isRoutine;
  var isReadOnly = props.isReadOnly;
  var t = (0, reactI18next.useTranslation)().t;
  var appNavigation = (0, module21.useAppNavigation)();
  var hub = (0, ServiceProvider.useService)().hub;
  var state = (0, AppProvider.useAppState)().state;
  var buttons = (0, react.useMemo)(function () {
    return hub.scene.states(automation);
  }, [automation.status, automation.isEnabled]);
  return <View style={styles.row}><module63.PressableOpacity style={styles.open} disabled={isReadOnly} accessibilityLabel={automation.name} onPress={function () {
      return appNavigation.navigate(ScreenName.ScreenName.AutomationAddEdit, {
        operationType: OperationType.OperationType.Edit,
        automationType: automation.type,
        automation: automation
      });
    }}><View style={styles.icon}><Icon2.Icon icon={automation.icon} fontWeight={IconFontWeight.IconFontWeight.Light} fontSize={LetterSpacing.FontSize._16} color={Color.secondary900} /></View><module28.Text style={styles.name} numberOfLines={1}>{automation.name}</module28.Text>{isRoutine && <module28.Text style={styles.summary} numberOfLines={2}>{conditionSummary(t, automation)}</module28.Text>}<module28.Text style={styles.summary} numberOfLines={2}>{actionSummary(automation)}</module28.Text></module63.PressableOpacity>{isRoutine && <View style={styles.enabled}><module231.Switch value={automation.isEnabled} disabled={isReadOnly} onValueChange={function (value) {
        return (0, SetRoutineState.SetRoutineState)(automation, value, state, hub);
      }} /></View>}<View style={styles.actions}>{buttons.map(function (button) {
        return <AutomationActionButton.AutomationActionButton key={button} icon={(0, SetRoutineState.GetAutomationActionIcon)(button)} onPress={function () {
          return (0, SetRoutineState.ExecuteSceneAction)(automation, button, state, hub);
        }} />;
      })}</View></View>;
}
// Desktop list of scenes or routines: one row per item with what each one does. The list arrives already filtered
// by the original search field above it (AutomationList), so the table has no search of its own.
exports.DesktopAutomationList = function (props) {
  var t = (0, reactI18next.useTranslation)().t;
  var isRoutine = props.automationsType === ExpanderInputType.Scene_Type.CONDITION;
  return <View><View style={[styles.row, styles.header]}><View style={styles.open}><View style={styles.icon} /><module28.Text style={[styles.name, styles.headerText]}>{t("automation.picker.column_name")}</module28.Text>{isRoutine && <module28.Text style={[styles.summary, styles.headerText]}>{t("automation.picker.column_if")}</module28.Text>}<module28.Text style={[styles.summary, styles.headerText]}>{t("automation.picker.column_then")}</module28.Text></View>{isRoutine && <View style={styles.enabled}><module28.Text style={styles.headerText}>{t("automation.picker.column_enabled")}</module28.Text></View>}<View style={styles.actions} /></View>{props.automations.map(function (automation) {
      return <Row key={automation.id} automation={automation} isRoutine={isRoutine} isReadOnly={props.isReadOnly} />;
    })}</View>;
};
