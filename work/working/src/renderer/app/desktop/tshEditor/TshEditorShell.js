// Shell of the TSH screens editor (docs/plans/2026-11-14-tsh-editor-redesign.md 3.2): the toolbar over three panes that
// fill the page body, the structure panel on the left (264 px), the canvas in the middle (the rest, at least 360 px)
// and the inspector on the right (320 px, 280 px in windows narrower than 1200 px). The shell takes the height the Page
// gives its body (flex), so the page itself never scrolls; every pane scrolls on its own (their contents hold the
// scrolling parts).
// Props: toolbar (element), left, center, right (functions of the layout { narrow, compact } returning elements):
// narrow below 1200 px window width, compact below 1000 px (one-line screen rows).
// rootRef (optional ref): receives the shell element (the route tells presses inside the editor apart).
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshEditorShell = exports.LEFT_WIDTH = undefined;
var View = require("../../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var react = require("../../../lib/react/react.reexport.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var TshUi = require("./TshUi.js");
var Color = GetHexColorTransparent.Color;
// Pane widths in CSS px (plan 3.2).
var LEFT_WIDTH = exports.LEFT_WIDTH = 264;
var RIGHT_WIDTH = 320;
var RIGHT_WIDTH_NARROW = 280;
var CANVAS_MIN_WIDTH = 360;
// Window widths in CSS px of the narrow inspector and of the compact screen rows (plan 3.2).
var NARROW_WINDOW = 1200;
var COMPACT_WINDOW = 1000;
// Smallest shell height: the panes stay usable in a window of the editor's minimum height (600 px).
var MIN_HEIGHT = 420;
var styles = {
  shell: {
    flex: 1,
    minHeight: MIN_HEIGHT,
    borderWidth: 1,
    borderColor: Color.secondary300,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: Color.background
  },
  body: {
    flex: 1,
    minHeight: 0,
    flexDirection: "row"
  },
  left: {
    width: LEFT_WIDTH,
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: Color.secondary300,
    minHeight: 0
  },
  center: {
    flex: 1,
    minWidth: CANVAS_MIN_WIDTH,
    minHeight: 0
  },
  right: {
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: Color.secondary300,
    minHeight: 0
  }
};
exports.TshEditorShell = function (props) {
  var shellRef = (0, react.useRef)(null);
  var windowWidth = (0, react.useState)(window.innerWidth);
  // The window width in CSS px (the app zooms the body on HiDPI screens, TshUi.cssScale).
  (0, react.useEffect)(function () {
    var measure = function () {
      windowWidth[1](window.innerWidth / TshUi.cssScale(shellRef.current));
    };
    measure();
    window.addEventListener("resize", measure);
    return function () {
      window.removeEventListener("resize", measure);
    };
  }, []);
  var layout = {
    narrow: windowWidth[0] < NARROW_WINDOW,
    compact: windowWidth[0] < COMPACT_WINDOW
  };
  return <View ref={function (node) {
    shellRef.current = node;
    if (props.rootRef) {
      props.rootRef.current = node;
    }
  }} style={styles.shell}>{props.toolbar}<View style={styles.body}><View style={styles.left}>{props.left(layout)}</View><View style={styles.center}>{props.center(layout)}</View><View style={[styles.right, {
        width: layout.narrow ? RIGHT_WIDTH_NARROW : RIGHT_WIDTH
      }]}>{props.right(layout)}</View></View></View>;
};
