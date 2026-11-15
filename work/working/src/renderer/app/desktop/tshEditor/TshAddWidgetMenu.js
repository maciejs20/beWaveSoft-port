// "+ Widżet" menu of the TSH screens editor (toolbar and layers header): a button that opens the addable widget types
// with their default glyphs; picking one calls props.onAdd(type). The button is disabled when the shown screen cannot
// hold widgets. Props: t, groups ([{ key, items: [{ type, key, glyph, glyphKind }] }], key null for one unnamed group),
// onAdd(type), disabled, label (button text or undefined for the icon only), align ("left" | "right"), small.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshAddWidgetMenu = exports.WidgetGlyph = undefined;
var react = require("../../../lib/react/react.reexport.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var tshAssets = require("./tshAssets.js");
var TshUi = require("./TshUi.js");
var Color = GetHexColorTransparent.Color;
// Glyph of a widget in the lists and menus (tshWidgetLabel glyph and glyphKind): the WDGT icon, "T" for texts, a frame
// for the rectangle, a dot for indicators, in a size x size box. Returns the element.
var WidgetGlyph = exports.WidgetGlyph = function (props) {
  var size = props.size ?? 20;
  (0, react.useEffect)(function () {
    tshAssets.installTshFonts();
  }, []);
  var inner;
  if (props.glyphKind === "icon" && props.glyph !== null) {
    inner = <span style={{
      fontFamily: tshAssets.TSH_FONT.icons,
      fontSize: size,
      lineHeight: 1,
      width: size,
      height: size,
      color: Color.secondary800,
      whiteSpace: "pre"
    }}>{String.fromCharCode(props.glyph)}</span>;
  } else if (props.glyphKind === "text") {
    inner = <span style={{
      fontFamily: TshUi.FONT,
      fontSize: Math.round(size * 0.7),
      fontWeight: 700,
      color: Color.secondary600
    }}>T</span>;
  } else if (props.glyphKind === "dot") {
    inner = <span style={{
      width: Math.round(size * 0.5),
      height: Math.round(size * 0.5),
      borderRadius: "50%",
      border: `1.5px solid ${Color.secondary600}`,
      backgroundColor: Color.secondary300,
      boxSizing: "border-box"
    }} />;
  } else {
    inner = <span style={{
      width: Math.round(size * 0.75),
      height: Math.round(size * 0.55),
      borderRadius: 2,
      border: `1.5px solid ${Color.secondary600}`,
      boxSizing: "border-box"
    }} />;
  }
  return <span aria-hidden="true" style={{
    width: size,
    height: size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden"
  }}>{inner}</span>;
};
exports.TshAddWidgetMenu = function (props) {
  var t = props.t;
  var open = (0, react.useState)(false);
  var anchor = (0, react.useRef)(null);
  return <span style={{
    display: "inline-flex",
    flexShrink: 0
  }}><TshUi.ToolButton buttonRef={anchor} icon="plus" label={props.label} small={props.small} menu={!!props.label} expanded={open[0]} title={t("tsh_editor.add_widget")} disabled={props.disabled} onClick={function () {
      return open[1](!open[0]);
    }} /><TshUi.Popover open={open[0]} anchorRef={anchor} align={props.align} width={260} maxHeight={560} label={t("tsh_editor.add_widget")} onClose={function () {
      return open[1](false);
    }}>{props.groups.map(function (group, gi) {
      return <react.Fragment key={group.key ?? gi}>{group.key && <TshUi.MenuSection title={t("tsh_editor.widget_group." + group.key)} />}{group.items.map(function (item) {
          return <TshUi.MenuItem key={item.type} lead={item.glyphKind ? <WidgetGlyph glyph={item.glyph} glyphKind={item.glyphKind} size={18} /> : undefined} label={t("tsh_editor.widget." + item.key)} onClick={function () {
              open[1](false);
              props.onAdd(item.type);
            }} />;
        })}</react.Fragment>;
    })}</TshUi.Popover></span>;
};
