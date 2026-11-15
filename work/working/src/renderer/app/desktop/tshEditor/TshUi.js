// Desktop chrome of the TSH screens editor: the editor style sheet (buttons, form controls, menus and list rows in the
// app's colour tokens, with hover and focus states that inline styles cannot give), toolbar buttons, the compact primary
// button, a popover anchored to an element and menu items. Plain DOM elements inside react-native-web views, as the
// desktop device table uses them.
// Spacing 4/8/12/16/24, controls 32 px high with radius 6, border secondary300 and focus ring primary500 (plan 3.1).
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PaneHeader = exports.MenuSection = exports.MenuItem = exports.Popover = exports.ToolButton = exports.useEditorCss = exports.cssScale =
  exports.FONT = undefined;
var react = require("../../../lib/react/react.reexport.js");
var reactDom = require("../../../lib/react-dom/cjs/react-dom-client.development.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var useThemeStyle = require("../../hooks/useThemeStyle.js");
var PrimaryButtonThemeStyle = require("../../logic/PrimaryButtonThemeStyle.js");
var TshIcons = require("./TshIcons.js");
var Color = GetHexColorTransparent.Color;
// Font of the editor chrome: the app's text font (static/main.css --font-family) with system fallbacks.
var FONT = exports.FONT = "Jost, system-ui, sans-serif";
// id of the editor style element (one per document, updated when the theme colours change).
var CSS_ID = "tsh-editor-css";
// Style sheet of the editor chrome in the current theme colours; primaryText is the title colour of the app's primary
// button. Returns the CSS text.
var editorCss = function (primaryText) {
  return `
.tsh-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border-radius:6px;box-sizing:border-box;
border:1px solid transparent;background:transparent;color:${Color.secondary800};font-family:${FONT};font-size:13px;
line-height:1;cursor:pointer;white-space:nowrap;flex-shrink:0}
.tsh-btn:hover:not(:disabled){background:${Color.secondary200}}
.tsh-btn:focus-visible{outline:2px solid ${Color.primary500};outline-offset:1px}
.tsh-btn:disabled{opacity:.4;cursor:default}
.tsh-btn.tsh-icon{width:32px;padding:0;justify-content:center}
.tsh-btn.tsh-small{height:24px;padding:0 6px;font-size:12px}
.tsh-btn.tsh-small.tsh-icon{width:24px;padding:0}
.tsh-btn.tsh-on{background:${Color.secondary200};border-color:${Color.secondary300};color:${Color.secondary900}}
.tsh-btn.tsh-outline{border-color:${Color.secondary300};background:${Color.background}}
.tsh-btn.tsh-outline:hover:not(:disabled){background:${Color.secondary100}}
.tsh-btn.tsh-primary{background:${Color.primary500};border-color:${Color.primary500};color:${primaryText};font-weight:600;
padding:0 16px}
.tsh-btn.tsh-primary:hover:not(:disabled){background:${Color.primary600};border-color:${Color.primary600}}
.tsh-btn.tsh-danger{border-color:${Color.danger300};color:${Color.danger500};background:${Color.background}}
.tsh-btn.tsh-danger:hover:not(:disabled){background:${Color.danger100}}
.tsh-ctl{height:32px;width:100%;box-sizing:border-box;border:1px solid ${Color.secondary300};border-radius:6px;
background:${Color.background};color:${Color.secondary900};font-family:${FONT};font-size:13px;padding:0 8px;min-width:0}
.tsh-ctl:focus{outline:none;border-color:${Color.primary500};box-shadow:0 0 0 2px ${Color.primary200}}
.tsh-ctl:disabled{opacity:.5}
input.tsh-ctl[type=color]{padding:2px;width:48px;cursor:pointer}
input.tsh-ctl[type=number]{padding:0 6px;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
input.tsh-ctl[type=number]::-webkit-inner-spin-button,input.tsh-ctl[type=number]::-webkit-outer-spin-button{
-webkit-appearance:none;margin:0}
input.tsh-check{width:16px;height:16px;margin:0;accent-color:${Color.primary500};cursor:pointer}
.tsh-menu-item{display:flex;align-items:center;gap:10px;width:100%;min-height:32px;padding:4px 12px;box-sizing:border-box;
border:0;background:transparent;color:${Color.secondary900};font-family:${FONT};font-size:13px;text-align:left;cursor:pointer;
white-space:nowrap}
.tsh-menu-item:hover:not(:disabled),.tsh-menu-item:focus-visible{background:${Color.secondary200};outline:none}
.tsh-menu-item:disabled{opacity:.4;cursor:default}
.tsh-menu-item.tsh-danger{color:${Color.danger500}}
.tsh-row{cursor:pointer;border-radius:6px;outline:none}
.tsh-row:hover{background:${Color.secondary100}}
.tsh-row:focus-visible{box-shadow:inset 0 0 0 2px ${Color.primary500}}
.tsh-row.tsh-selected{background:${Color.secondary200}}
.tsh-row .tsh-hover{visibility:hidden}
.tsh-row:hover .tsh-hover,.tsh-row:focus-within .tsh-hover,.tsh-row.tsh-selected .tsh-hover{visibility:visible}
.tsh-row{position:relative}
.tsh-row .tsh-actions{position:absolute;right:4px;top:4px;display:none;align-items:center;border-radius:6px;background:inherit}
.tsh-row:hover .tsh-actions,.tsh-row:focus-within .tsh-actions{display:inline-flex}
.tsh-seg{display:inline-flex;border:1px solid ${Color.secondary300};border-radius:6px;overflow:hidden;height:32px;
box-sizing:border-box}
.tsh-seg button{border:0;border-right:1px solid ${Color.secondary300};background:${Color.background};color:${Color.secondary800};
font-family:${FONT};font-size:13px;padding:0 12px;cursor:pointer;min-width:40px}
.tsh-seg button:last-child{border-right:0}
.tsh-seg button:hover{background:${Color.secondary100}}
.tsh-seg button.tsh-on{background:${Color.secondary800};color:${Color.background}}
.tsh-seg button:focus-visible{outline:2px solid ${Color.primary500};outline-offset:-2px}
.tsh-tab{flex:1;height:32px;border:0;border-bottom:2px solid transparent;background:transparent;color:${Color.secondary600};
font-family:${FONT};font-size:13px;font-weight:500;cursor:pointer}
.tsh-tab:hover:not(:disabled){color:${Color.secondary900}}
.tsh-tab.tsh-on{color:${Color.secondary900};border-bottom-color:${Color.primary500}}
.tsh-tab:disabled{opacity:.4;cursor:default}
.tsh-tab:focus-visible{outline:2px solid ${Color.primary500};outline-offset:-2px}
.tsh-icon-cell{width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid transparent;
border-radius:6px;background:transparent;cursor:pointer;padding:0;color:${Color.secondary900}}
.tsh-icon-cell:hover{background:${Color.secondary200}}
.tsh-icon-cell:focus-visible{outline:2px solid ${Color.primary500};outline-offset:-1px}
.tsh-icon-cell.tsh-on{border-color:${Color.primary500};box-shadow:inset 0 0 0 1px ${Color.primary500}}
.tsh-scroll{overflow-y:auto;overflow-x:hidden;min-height:0}
`;
};
// Ratio of an element's drawn size to its CSS size: 0.8 when the app zooms the body on HiDPI screens (module_1813),
// else 1. Positions from getBoundingClientRect() divided by it are CSS pixels of fixed elements. Returns the ratio.
var cssScale = exports.cssScale = function (el) {
  var w = el ? el.offsetWidth : 0;
  return w > 0 ? el.getBoundingClientRect().width / w : 1;
};
// Installs the editor style sheet in the current theme colours while the editor is open. Returns nothing.
exports.useEditorCss = function () {
  var primary = (0, useThemeStyle.useThemeStyle)(PrimaryButtonThemeStyle.PrimaryButtonThemeStyle);
  var css = editorCss(primary.titleFontColor ?? Color.white);
  (0, react.useEffect)(function () {
    var el = document.getElementById(CSS_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = CSS_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [css]);
  (0, react.useEffect)(function () {
    return function () {
      document.getElementById(CSS_ID)?.remove();
    };
  }, []);
};
// Toolbar or list button: icon (TshIcons name), optional label, tooltip; variant "plain" | "outline" | "primary" |
// "danger"; on: pressed look; small: 24 px. Extra props go to the <button> (ref via buttonRef). Returns the element.
exports.ToolButton = function (props) {
  var classes = ["tsh-btn"];
  if (props.variant && props.variant !== "plain") {
    classes.push("tsh-" + props.variant);
  }
  if (props.on) {
    classes.push("tsh-on");
  }
  if (props.small) {
    classes.push("tsh-small");
  }
  if (props.icon && !props.label && !props.children) {
    classes.push("tsh-icon");
  }
  return <button ref={props.buttonRef} type="button" className={classes.join(" ")} title={props.title} aria-label={props.ariaLabel ?? props.title ?? props.label} aria-pressed={props.on === undefined ? undefined : !!props.on} aria-haspopup={props.menu ? "menu" : undefined} aria-expanded={props.menu ? !!props.expanded : undefined} disabled={props.disabled} onClick={props.onClick} style={props.style}>{props.icon && <TshIcons.Icon name={props.icon} size={props.small ? 14 : 16} />}{props.label}{props.children}{props.menu && <TshIcons.Icon name="chevronDown" size={14} color={Color.secondary500} />}</button>;
};
// Popover anchored to anchorRef's element: rendered into document.body (above the panes' stacking contexts) and fixed in
// the window (not clipped by scrolling panes), below the anchor and
// aligned to its left or right edge (align), kept inside the window. Closes on a press outside it and the anchor, on
// Esc (the key does not reach the editor or the page) and on window resize. Props: open, anchorRef, onClose, align,
// width, maxHeight, role, label, children. Returns the element or null.
exports.Popover = function (props) {
  var boxRef = (0, react.useRef)(null);
  var pos = (0, react.useState)(null);
  var onClose = (0, react.useRef)(props.onClose);
  onClose.current = props.onClose;
  (0, react.useLayoutEffect)(function () {
    if (!props.open) {
      pos[1](null);
      return undefined;
    }
    var place = function () {
      var anchor = props.anchorRef.current;
      if (!anchor) {
        return;
      }
      var s = cssScale(anchor);
      var r = anchor.getBoundingClientRect();
      var box = boxRef.current;
      var w = box ? box.offsetWidth : props.width ?? 240;
      var h = box ? box.offsetHeight : 0;
      var vw = window.innerWidth / s;
      var vh = window.innerHeight / s;
      var left = props.align === "right" ? r.right / s - w : r.left / s;
      var top = r.bottom / s + 4;
      if (top + h > vh - 8 && r.top / s - 4 - h >= 8) {
        top = r.top / s - 4 - h;
      }
      pos[1]({
        left: Math.max(8, Math.min(left, vw - w - 8)),
        top: Math.max(8, Math.min(top, vh - h - 8)),
        maxHeight: vh - 16
      });
    };
    place();
    var raf = requestAnimationFrame(place);
    var onDown = function (event) {
      var anchor = props.anchorRef.current;
      if (boxRef.current && !boxRef.current.contains(event.target) && !(anchor && anchor.contains(event.target))) {
        onClose.current();
      }
    };
    var onKey = function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose.current();
        props.anchorRef.current?.focus?.();
      }
    };
    var onResize = function () {
      onClose.current();
    };
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    return function () {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onResize);
    };
  }, [props.open]);
  if (!props.open) {
    return null;
  }
  var p = pos[0];
  return reactDom.createPortal(<div ref={boxRef} role={props.role ?? "menu"} aria-label={props.label} style={{
    position: "fixed",
    left: p ? p.left : -9999,
    top: p ? p.top : -9999,
    width: props.width,
    maxHeight: Math.min(props.maxHeight ?? 480, p ? p.maxHeight : 480),
    overflowY: "auto",
    zIndex: 100000,
    boxSizing: "border-box",
    padding: "4px 0",
    backgroundColor: Color.background,
    border: `1px solid ${Color.secondary300}`,
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.16)",
    fontFamily: FONT
  }}>{props.children}</div>, document.body);
};
// Menu item: optional leading element (glyph or icon), label, optional trailing hint; danger look. Returns the element.
exports.MenuItem = function (props) {
  return <button type="button" role="menuitem" className={"tsh-menu-item" + (props.danger ? " tsh-danger" : "")} disabled={props.disabled} title={props.title} onClick={props.onClick}>{props.lead !== undefined && <span style={{
      width: 20,
      display: "flex",
      justifyContent: "center",
      flexShrink: 0
    }}>{props.lead}</span>}<span style={{
      flex: 1
    }}>{props.label}</span>{props.hint && <span style={{
      color: Color.secondary500,
      fontSize: 12
    }}>{props.hint}</span>}</button>;
};
// Small uppercase heading inside a menu. Returns the element.
exports.MenuSection = function (props) {
  return <div role="presentation" style={{
    padding: "8px 12px 4px",
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: Color.secondary600,
    fontFamily: FONT
  }}>{props.title}</div>;
};
// Header of a panel section: an 11 px uppercase title in secondary600 (plan 3.1), an optional count after it and
// elements on the right (props.children). Returns the element.
exports.PaneHeader = function (props) {
  return <div style={{
    display: "flex",
    alignItems: "center",
    height: 40,
    padding: "0 8px 0 16px",
    flexShrink: 0,
    boxSizing: "border-box",
    borderBottom: props.border ? `1px solid ${Color.secondary300}` : "none",
    fontFamily: FONT
  }}><span style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: Color.secondary600,
      whiteSpace: "nowrap"
    }}>{props.title}</span>{props.count !== undefined && <span style={{
      marginLeft: 8,
      fontSize: 11,
      color: Color.secondary500,
      fontVariant: "tabular-nums"
    }}>{props.count}</span>}<span style={{
      flex: 1
    }} />{props.children}</div>;
};
