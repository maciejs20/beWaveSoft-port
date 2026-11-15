// Icon picker of the TSH screens editor inspector (docs/plans/2026-11-14-tsh-editor-redesign.md 3.3 "Icon picker"): a
// field that shows the WDGT glyph only (the code is in the tooltip, RC13) and opens a popover with 8 columns of 40 px
// cells: the icons already used in this layout first, then every icon the keypad firmware draws up to the field's
// largest code (TshLayout.ICON_CODES, the link icon stops at 0xff). The current icon is ringed. Keyboard: arrows move,
// Enter picks, Esc closes.
// Props: t, label, value (icon code), max, used (codes used in the layout), onChange(code).
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshIconPicker = exports.PICKER_COLUMNS = undefined;
var react = require("../../../lib/react/react.reexport.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var TshLayout = require("./tshLayout.js");
var tshAssets = require("./tshAssets.js");
var TshUi = require("./TshUi.js");
var TshIcons = require("./TshIcons.js");
var Color = GetHexColorTransparent.Color;
// Cells per row (plan 3.3).
var PICKER_COLUMNS = exports.PICKER_COLUMNS = 8;
// Cell size and glyph size in CSS px (plan 3.3).
var CELL = 40;
var GLYPH = 28;
// Code as "0x11d". Returns the text.
var hex = function (code) {
  return "0x" + code.toString(16);
};
// WDGT glyph of a code in size px. Returns the element.
var Glyph = function (props) {
  return <span aria-hidden="true" style={{
    fontFamily: tshAssets.TSH_FONT.icons,
    fontSize: props.size,
    lineHeight: 1,
    width: props.size,
    height: props.size,
    color: Color.secondary900,
    whiteSpace: "pre",
    display: "block"
  }}>{String.fromCharCode(props.code)}</span>;
};
exports.TshIconPicker = function (props) {
  var t = props.t;
  var open = (0, react.useState)(false);
  var anchor = (0, react.useRef)(null);
  var cells = (0, react.useRef)([]);
  (0, react.useEffect)(function () {
    tshAssets.installTshFonts();
  }, []);
  var all = TshLayout.ICON_CODES.filter(function (code) {
    return code <= props.max;
  });
  var used = (props.used ?? []).filter(function (code, i, list) {
    return all.indexOf(code) >= 0 && list.indexOf(code) === i;
  });
  // Every cell in focus order: the used icons, then all of them.
  var order = used.concat(all);
  // Focuses the cell of the current icon (or the first one) when the popover opens.
  (0, react.useEffect)(function () {
    if (!open[0]) {
      return undefined;
    }
    var raf = requestAnimationFrame(function () {
      var at = all.indexOf(props.value);
      var cell = cells.current[at < 0 ? 0 : used.length + at];
      cell?.focus({
        preventScroll: true
      });
      cell?.scrollIntoView?.({
        block: "nearest"
      });
    });
    return function () {
      cancelAnimationFrame(raf);
    };
  }, [open[0]]);
  var pick = function (code) {
    open[1](false);
    anchor.current?.focus();
    if (code !== props.value) {
      props.onChange(code);
    }
  };
  // Arrow keys move the focus by one cell or one row of the focus order; Enter and Space pick the focused icon.
  var onKeyDown = function (event, index) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(order[index]);
      return;
    }
    var step = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -PICKER_COLUMNS,
      ArrowDown: PICKER_COLUMNS
    }[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    var next = Math.min(Math.max(index + step, 0), order.length - 1);
    cells.current[next]?.focus();
  };
  var grid = function (codes, offset) {
    return <div role="listbox" style={{
      display: "grid",
      gridTemplateColumns: `repeat(${PICKER_COLUMNS}, ${CELL}px)`,
      gap: 0,
      padding: "0 8px 4px"
    }}>{codes.map(function (code, i) {
        var selected = code === props.value;
        var title = t("tsh_editor.icon_code", {
          code: hex(code)
        });
        return <button key={code} ref={function (el) {
            cells.current[offset + i] = el;
          }} type="button" role="option" aria-selected={selected} aria-label={title} title={title} tabIndex={-1} className={"tsh-icon-cell" + (selected ? " tsh-on" : "")} onKeyDown={function (event) {
            return onKeyDown(event, offset + i);
          }} onClick={function () {
            return pick(code);
          }}><Glyph code={code} size={GLYPH} /></button>;
      })}</div>;
  };
  var current = t("tsh_editor.icon_code", {
    code: hex(props.value)
  });
  return <span style={{
    display: "inline-flex"
  }}><button ref={anchor} type="button" className="tsh-ctl" aria-label={`${props.label}: ${current}`} title={current} aria-haspopup="dialog" aria-expanded={open[0]} onClick={function () {
      return open[1](!open[0]);
    }} style={{
      width: 64,
      height: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 6px 0 8px",
      cursor: "pointer"
    }}><Glyph code={props.value} size={GLYPH} /><TshIcons.Icon name="chevronDown" size={14} color={Color.secondary500} /></button><TshUi.Popover open={open[0]} anchorRef={anchor} align="right" width={PICKER_COLUMNS * CELL + 16 + 12} maxHeight={420} role="dialog" label={props.label} onClose={function () {
      return open[1](false);
    }}>{used.length > 0 && <TshUi.MenuSection title={t("tsh_editor.icons_used")} />}{used.length > 0 && grid(used, 0)}<TshUi.MenuSection title={t("tsh_editor.icons_all")} />{grid(all, used.length)}</TshUi.Popover></span>;
};
