// Toolbar of the TSH screens editor (docs/plans/2026-11-14-tsh-editor-redesign.md 3.3), left to right: keypad model and
// resolution, undo/redo, the add-widget menu (props.addMenu), the editor grid toggle, zoom (-, level menu, +), "Karta
// SD", the byte budget meter, the shortcut list "?", then Cancel and Save with a badge that lists validation errors
// (a click on one selects what it names) and notes. Narrow toolbars drop button labels, then the model label.
// Props:
//   t, model           text, e.g. "INT-TSG2 · 480 × 272"
//   canUndo, canRedo, onUndo(), onRedo()
//   addMenu            element of the add-widget menu button, or null
//   grid, onGrid()     editor grid (snapping) state and toggle
//   zoom, zoomMode, onZoom(level | "fit")   zoom in use (CSS px per keypad px) and "fit" or the level chosen
//   onSd()
//   size, limit        blob bytes (null while there are errors) and the limit
//   errors             [{ text, onPick }]: validation errors; onPick selects the screen or widget (or null)
//   notes              [text]: warnings and load notes that do not block Save
//   canSave, onSave(), onCancel()
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshToolbar = exports.formatBytes = undefined;
var View = require("../../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var react = require("../../../lib/react/react.reexport.js");
var module28 = require("../../misc/module_28.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var TshZoom = require("./tshZoom.js");
var TshUi = require("./TshUi.js");
var TshIcons = require("./TshIcons.js");
var Color = GetHexColorTransparent.Color;
// Toolbar widths (CSS px) below which button labels, then the model label, are dropped.
var COMPACT_WIDTH = 1180;
var TINY_WIDTH = 960;
// Budget share from which the meter turns to the warning colour (plan 3.3).
var BUDGET_WARNING = 0.9;
var styles = {
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Color.secondary300,
    backgroundColor: Color.background,
    overflow: "hidden",
    flexShrink: 0
  },
  model: {
    fontSize: 13,
    fontWeight: "600",
    color: Color.secondary900,
    paddingHorizontal: 8,
    whiteSpace: "nowrap"
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: 6,
    backgroundColor: Color.secondary300,
    flexShrink: 0
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0
  },
  spacer: {
    flex: 1,
    minWidth: 8
  },
  meterText: {
    fontSize: 12,
    color: Color.secondary700,
    marginLeft: 8,
    whiteSpace: "nowrap",
    fontVariant: ["tabular-nums"]
  },
  helpLine: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  helpKey: {
    width: 150,
    fontSize: 12,
    fontWeight: "600",
    color: Color.secondary900
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: Color.secondary700
  },
  problem: {
    fontSize: 13,
    color: Color.secondary800,
    paddingHorizontal: 12,
    paddingVertical: 6
  }
};
// Shortcut list of the "?" popover: key label and i18n key of the description.
var SHORTCUTS = [["click", "help.click"], ["alt_click", "help.alt_click"], ["drag", "help.drag"], ["alt_drag",
  "help.alt_drag"], ["arrows", "help.arrows"], ["tab", "help.tab"], ["delete", "help.delete"], ["undo", "help.undo"],
  ["redo", "help.redo"], ["grid", "help.grid"], ["zoom", "help.zoom"], ["esc", "help.esc"]];
// Byte count with thin spaces between thousands ("65 535"). Returns the text.
var formatBytes = exports.formatBytes = function (n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
// Width of the toolbar in CSS px, followed with a ResizeObserver. Returns [ref, width].
var useWidth = function () {
  var ref = (0, react.useRef)(null);
  var width = (0, react.useState)(Infinity);
  (0, react.useEffect)(function () {
    var node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    var observer = new ResizeObserver(function () {
      width[1](node.clientWidth);
    });
    observer.observe(node);
    return function () {
      observer.disconnect();
    };
  }, []);
  return [ref, width[0]];
};
// Budget meter: a bar in primary500, warning500 from 90 %, danger500 over the limit or while errors hide the size, and
// "size / limit B". Returns the element.
var BudgetMeter = function (props) {
  var t = props.t;
  var share = props.size === null ? 1 : props.size / props.limit;
  var color = props.size === null || share > 1 ? Color.danger500 : share >= BUDGET_WARNING ? Color.warning500 :
    Color.primary500;
  var text = `${props.size === null ? "—" : formatBytes(props.size)} / ${formatBytes(props.limit)} B`;
  return <div style={{
    display: "flex",
    alignItems: "center",
    flexShrink: 0
  }} title={props.size === null ? t("tsh_editor.bytes_unknown", {
    limit: props.limit
  }) : t("tsh_editor.bytes", {
    size: props.size,
    limit: props.limit
  })}><div role="meter" aria-label={t("tsh_editor.budget")} aria-valuemin={0} aria-valuemax={props.limit} aria-valuenow={props.size ?? props.limit} style={{
      width: props.width,
      height: 6,
      borderRadius: 3,
      backgroundColor: Color.secondary200,
      overflow: "hidden",
      flexShrink: 0
    }}><div style={{
        width: `${Math.min(share, 1) * 100}%`,
        height: "100%",
        borderRadius: 3,
        backgroundColor: color
      }} /></div><module28.Text style={[styles.meterText, (props.size === null || share > 1) && {
      color: Color.danger500
    }]}>{text}</module28.Text></div>;
};
// Zoom group: -, the level menu (Fit and the levels), +. Returns the element.
var ZoomControl = function (props) {
  var t = props.t;
  var open = (0, react.useState)(false);
  var anchor = (0, react.useRef)(null);
  var pick = function (level) {
    open[1](false);
    props.onZoom(level);
  };
  var levels = TshZoom.ZOOM_LEVELS;
  return <View style={styles.group}><TshUi.ToolButton icon="minus" title={t("tsh_editor.zoom_out")} disabled={props.zoomMode !== "fit" && props.zoom <= levels[0]} onClick={function () {
      return props.onZoom(TshZoom.stepZoom(props.zoom, -1));
    }} /><TshUi.ToolButton buttonRef={anchor} menu={true} expanded={open[0]} title={t("tsh_editor.zoom_level")} label={props.zoomMode === "fit" ? t("tsh_editor.zoom_fit") : `${Math.round(props.zoom * 100)} %`} style={{
      minWidth: 92,
      justifyContent: "space-between"
    }} onClick={function () {
      return open[1](!open[0]);
    }} /><TshUi.ToolButton icon="plus" title={t("tsh_editor.zoom_in")} disabled={props.zoomMode !== "fit" && props.zoom >= levels[levels.length - 1]} onClick={function () {
      return props.onZoom(TshZoom.stepZoom(props.zoom, 1));
    }} /><TshUi.Popover open={open[0]} anchorRef={anchor} width={180} label={t("tsh_editor.zoom_level")} onClose={function () {
      return open[1](false);
    }}><TshUi.MenuItem label={t("tsh_editor.zoom_fit")} hint={`${Math.round(props.fit * 100)} %`} lead={props.zoomMode === "fit" ? "✓" : ""} onClick={function () {
        return pick("fit");
      }} />{levels.map(function (z) {
        return <TshUi.MenuItem key={z} label={`${Math.round(z * 100)} %`} lead={props.zoomMode === z ? "✓" : ""} onClick={function () {
            return pick(z);
          }} />;
      })}</TshUi.Popover></View>;
};
// Popover button with the editor shortcuts. Returns the element.
var HelpButton = function (props) {
  var t = props.t;
  var open = (0, react.useState)(false);
  var anchor = (0, react.useRef)(null);
  return <View style={styles.group}><TshUi.ToolButton buttonRef={anchor} icon="help" title={t("tsh_editor.help.title")} expanded={open[0]} onClick={function () {
      return open[1](!open[0]);
    }} /><TshUi.Popover open={open[0]} anchorRef={anchor} align="right" width={400} role="dialog" label={t("tsh_editor.help.title")} onClose={function () {
      return open[1](false);
    }}><TshUi.MenuSection title={t("tsh_editor.help.title")} />{SHORTCUTS.map(function (s) {
        return <View key={s[0]} style={styles.helpLine}><module28.Text style={styles.helpKey}>{t("tsh_editor.help.key_" + s[0])}</module28.Text><module28.Text style={styles.helpText}>{t("tsh_editor." + s[1])}</module28.Text></View>;
      })}</TshUi.Popover></View>;
};
// Badge before Save: the error count in red (or the note count) opening the list; a click on an error with a target
// selects it. Returns the element or null.
var ProblemsBadge = function (props) {
  var t = props.t;
  var open = (0, react.useState)(false);
  var anchor = (0, react.useRef)(null);
  var errors = props.errors;
  var notes = props.notes;
  if (!errors.length && !notes.length) {
    return null;
  }
  var label = errors.length ? t("tsh_editor.errors_badge", {
    count: errors.length
  }) : t("tsh_editor.notes_badge", {
    count: notes.length
  });
  return <View style={styles.group}><button ref={anchor} type="button" className="tsh-btn" aria-haspopup="dialog" aria-expanded={open[0]} title={label} onClick={function () {
      return open[1](!open[0]);
    }} style={{
      height: 24,
      borderRadius: 12,
      padding: "0 10px",
      marginRight: 8,
      backgroundColor: errors.length ? Color.danger500 : Color.secondary200,
      color: errors.length ? Color.white : Color.secondary800,
      fontWeight: 600,
      fontSize: 12
    }}><TshIcons.Icon name="alert" size={14} />{label}</button><TshUi.Popover open={open[0]} anchorRef={anchor} align="right" width={380} role="dialog" label={label} onClose={function () {
      return open[1](false);
    }}>{errors.length > 0 && <TshUi.MenuSection title={t("tsh_editor.errors_title")} />}{errors.map(function (e, i) {
        return <TshUi.MenuItem key={"e" + i} lead={<TshIcons.Icon name="alert" size={14} color={Color.danger500} />} label={<span style={{
            whiteSpace: "normal"
          }}>{e.text}</span>} disabled={!e.onPick} onClick={function () {
            open[1](false);
            e.onPick();
          }} />;
      })}{notes.length > 0 && <TshUi.MenuSection title={t("tsh_editor.notes_title")} />}{notes.map(function (text, i) {
        return <module28.Text key={"n" + i} style={styles.problem}>{text}</module28.Text>;
      })}</TshUi.Popover></View>;
};
exports.TshToolbar = function (props) {
  var t = props.t;
  var measured = useWidth();
  var compact = measured[1] < COMPACT_WIDTH;
  var tiny = measured[1] < TINY_WIDTH;
  var label = function (key) {
    return compact ? undefined : t(key);
  };
  return <View ref={measured[0]} style={styles.bar} accessibilityRole="toolbar">{!tiny && <module28.Text style={styles.model} numberOfLines={1}>{props.model}</module28.Text>}{!tiny && <View style={styles.separator} />}<View style={styles.group}><TshUi.ToolButton icon="undo" title={t("tsh_editor.undo")} disabled={!props.canUndo} onClick={props.onUndo} /><TshUi.ToolButton icon="redo" title={t("tsh_editor.redo")} disabled={!props.canRedo} onClick={props.onRedo} /></View>{props.addMenu && <View style={styles.separator} />}{props.addMenu && props.addMenu(compact)}<View style={styles.separator} /><TshUi.ToolButton icon="grid" label={label("tsh_editor.editor_grid")} title={t("tsh_editor.editor_grid_hint")} on={props.grid} onClick={props.onGrid} /><View style={styles.separator} /><ZoomControl t={t} zoom={props.zoom} zoomMode={props.zoomMode} fit={props.fit} onZoom={props.onZoom} /><View style={styles.separator} /><TshUi.ToolButton icon="sd" label={label("tsh_editor.sd.button")} title={t("tsh_editor.sd.button")} onClick={props.onSd} /><View style={styles.separator} /><BudgetMeter t={t} size={props.size} limit={props.limit} width={compact ? 64 : 120} /><View style={styles.spacer} /><HelpButton t={t} /><View style={styles.separator} /><ProblemsBadge t={t} errors={props.errors} notes={props.notes} /><TshUi.ToolButton label={t("cancel")} onClick={props.onCancel} style={{
      marginRight: 8
    }} /><TshUi.ToolButton variant="primary" label={t("common.save")} disabled={!props.canSave} onClick={props.onSave} /></View>;
};
