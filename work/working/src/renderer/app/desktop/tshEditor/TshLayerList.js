// Layers of the TSH screens editor (docs/plans/2026-11-14-tsh-editor-redesign.md 3.3 "Layers"): the widgets of the
// shown screen in drawing order (top of the list is drawn first, as TSH stores them), each row with the widget's glyph
// and its human label (tshWidgetLabel.js), the type on hover, and a menu to bring it to the front or back or remove it.
// A click selects the widget on the canvas; arrow keys move through the rows; Delete on a row asks to remove (the
// editor's window keys); a widget selected on the canvas scrolls its row into view.
// Props: t, state, screen (record or null), selectedWidget, onSelectWidget(index), apply(result), onDelete(index),
// addMenu (element of the "+" menu or null).
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshLayerList = undefined;
var react = require("../../../lib/react/react.reexport.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var TshEditorModel = require("./tshEditorModel.js");
var TshWidgetLabel = require("./tshWidgetLabel.js");
var TshUi = require("./TshUi.js");
var TshAddWidgetMenu = require("./TshAddWidgetMenu.js");
var TshIcons = require("./TshIcons.js");
var Color = GetHexColorTransparent.Color;
// Menu of one layer row: front, forward, backward, back, remove. Returns the element.
var RowMenu = function (props) {
  var t = props.t;
  var open = (0, react.useState)(false);
  var anchor = (0, react.useRef)(null);
  var last = props.count - 1;
  var pick = function (fn) {
    return function () {
      open[1](false);
      fn();
    };
  };
  return <span className="tsh-hover" style={{
    display: "inline-flex"
  }} onClick={function (event) {
    event.stopPropagation();
  }}><TshUi.ToolButton buttonRef={anchor} icon="more" small={true} title={t("tsh_editor.layer_menu")} expanded={open[0]} onClick={function () {
      return open[1](!open[0]);
    }} /><TshUi.Popover open={open[0]} anchorRef={anchor} align="right" width={220} label={t("tsh_editor.layer_menu")} onClose={function () {
      return open[1](false);
    }}><TshUi.MenuItem lead={<TshIcons.Icon name="toTop" size={14} />} label={t("tsh_editor.layer_front")} disabled={props.index === last} onClick={pick(function () {
        return props.onMove(last);
      })} /><TshUi.MenuItem lead={<TshIcons.Icon name="chevronDown" size={14} />} label={t("tsh_editor.layer_forward")} disabled={props.index === last} onClick={pick(function () {
        return props.onMove(props.index + 1);
      })} /><TshUi.MenuItem lead={<TshIcons.Icon name="chevronUp" size={14} />} label={t("tsh_editor.layer_backward")} disabled={props.index === 0} onClick={pick(function () {
        return props.onMove(props.index - 1);
      })} /><TshUi.MenuItem lead={<TshIcons.Icon name="toBottom" size={14} />} label={t("tsh_editor.layer_back")} disabled={props.index === 0} onClick={pick(function () {
        return props.onMove(0);
      })} /><TshUi.MenuItem lead={<TshIcons.Icon name="trash" size={14} />} danger={true} label={t("tsh_editor.remove_widget_menu")} onClick={pick(props.onDelete)} /></TshUi.Popover></span>;
};
exports.TshLayerList = function (props) {
  var t = props.t;
  var screen = props.screen;
  var withWidgets = !!screen && (screen.type === "user" || screen.type === "additional");
  var widgets = withWidgets ? screen.widgets : [];
  var rowsRef = (0, react.useRef)([]);
  // Keeps the selected row in view when the selection comes from the canvas.
  (0, react.useEffect)(function () {
    var row = props.selectedWidget === null ? null : rowsRef.current[props.selectedWidget];
    row?.scrollIntoView?.({
      block: "nearest"
    });
  }, [props.selectedWidget, screen ? screen.uid : null]);
  // Selects a row and moves the keyboard focus to it.
  var focusRow = function (index) {
    props.onSelectWidget(index);
    rowsRef.current[index]?.focus();
  };
  var move = function (index, toIndex) {
    var r = TshEditorModel.reorderWidget(props.state, screen.uid, index, toIndex);
    props.apply(r);
    if (r.ok) {
      props.onSelectWidget(r.index);
    }
  };
  return <div style={{
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0
  }}><TshUi.PaneHeader title={t("tsh_editor.layers")} count={withWidgets ? widgets.length : undefined}>{withWidgets && props.addMenu}</TshUi.PaneHeader><div className="tsh-scroll" role="listbox" aria-label={t("tsh_editor.layers")} style={{
      flex: 1,
      padding: "0 8px 8px"
    }}>{!withWidgets && <div style={{
        padding: "4px 8px",
        fontSize: 12,
        color: Color.secondary500,
        fontFamily: TshUi.FONT
      }}>{t(screen ? "tsh_editor.layers_none" : "tsh_editor.select_screen")}</div>}{withWidgets && !widgets.length && <div style={{
        padding: "4px 8px",
        fontSize: 12,
        color: Color.secondary500,
        fontFamily: TshUi.FONT
      }}>{t("tsh_editor.no_widgets")}</div>}{widgets.map(function (w, index) {
      var label = TshWidgetLabel.widgetLabel(w, props.state, t);
      var selected = props.selectedWidget === index;
      return <div key={index} ref={function (el) {
          rowsRef.current[index] = el;
        }} role="option" aria-selected={selected} aria-label={label.title} tabIndex={selected || props.selectedWidget === null && index === 0 ? 0 : -1} className={"tsh-row" + (selected ? " tsh-selected" : "")} title={label.named ? `${label.subtitle}: ${label.title}` : label.title} onClick={function () {
          return props.onSelectWidget(index);
        }} onKeyDown={function (event) {
          // Keys of the row's "…" button and its menu (a portal: React events bubble through it) stay with them.
          if (event.target !== event.currentTarget) {
            return;
          }
          if (event.key === "ArrowDown" && index < widgets.length - 1 || event.key === "ArrowUp" && index > 0) {
            event.preventDefault();
            focusRow(index + (event.key === "ArrowDown" ? 1 : -1));
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            props.onSelectWidget(index);
          } else if (event.key === "Escape" && selected) {
            // Esc clears the selection and does not reach the page (it would close the editor).
            event.preventDefault();
            event.stopPropagation();
            props.onSelectWidget(null);
          }
        }} style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 32,
          padding: "0 4px 0 8px",
          fontFamily: TshUi.FONT
        }}><TshAddWidgetMenu.WidgetGlyph glyph={label.glyph} glyphKind={label.glyphKind} size={18} /><span style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 13,
            color: Color.secondary900
          }}>{label.title}</span>{label.named && <span className="tsh-hover" style={{
            fontSize: 11,
            color: Color.secondary500,
            whiteSpace: "nowrap",
            maxWidth: 90,
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>{label.subtitle}</span>}<RowMenu t={t} index={index} count={widgets.length} onMove={function (to) {
            return move(index, to);
          }} onDelete={function () {
            return props.onDelete(index);
          }} /></div>;
    })}</div></div>;
};
