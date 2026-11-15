// Groups of the "+ Widżet" menu of the TSH screens editor (docs/plans/2026-11-14-tsh-editor-redesign.md 3.3
// "Toolbar"): the 21 addable widget types in six groups, each with the glyph of the widget TshTemplates.newWidget
// creates. Pure data and functions, no React.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.widgetGroups = exports.WIDGET_GROUPS = undefined;
var TshFormat = require("./tshFormat.js");
var TshWidgetTypes = require("./tshWidgetTypes.js");
var TshTemplates = require("./tshTemplates.js");
var TshWidgetLabel = require("./tshWidgetLabel.js");
var T = TshFormat.WIDGET_TYPE;
// Group keys (i18n tsh_editor.widget_group.<key>) and their types in menu order (plan 3.3).
var WIDGET_GROUPS = exports.WIDGET_GROUPS = [{
  key: "text",
  types: [T.TEXT, T.DATE_TIME, T.VALUE, T.OUTPUT_TEXT]
}, {
  key: "control",
  types: [T.CONTROL, T.BUTTON, T.INPUT_ICON, T.OUTPUT_ICON]
}, {
  key: "alarm",
  types: [T.ARM, T.DISARM, T.ARM_TOGGLE, T.ALARM_CLEAR, T.PANIC]
}, {
  key: "indicators",
  types: [T.ROOM_STATE, T.INPUT_INDICATOR, T.OUTPUT_INDICATOR]
}, {
  key: "navigation",
  types: [T.LINK, T.SCENE_START, T.SCENE_STOP]
}, {
  key: "shapes",
  types: [T.RECTANGLE, T.INFO]
}];
// Screen the menu glyphs are made on (colors only; the glyph does not depend on them).
var GLYPH_SCREEN = {
  colors: ["000000", "000000", "000000"],
  widgets: []
};
// Menu groups with their items; t translates the default texts of the new widgets. Returns
// [{ key, items: [{ type, key, glyph, glyphKind }] }].
exports.widgetGroups = function (t) {
  var state = {
    input: {},
    blob: {
      records: []
    }
  };
  return WIDGET_GROUPS.map(function (group) {
    return {
      key: group.key,
      items: group.types.map(function (type) {
        var label = TshWidgetLabel.widgetLabel(TshTemplates.newWidget(type, GLYPH_SCREEN, t), state, t);
        return {
          type: type,
          key: TshWidgetTypes.widgetTypeDef(type).key,
          glyph: label.glyph,
          glyphKind: label.glyphKind
        };
      })
    };
  });
};
