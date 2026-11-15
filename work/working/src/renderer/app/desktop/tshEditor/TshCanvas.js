// Canvas of the TSH screens editor (PROJEKT-TSH-EDYTOR.md "Warstwy kodu" layer 3, plan 3.3 "Canvas"): the middle pane
// with the selected screen drawn by TshScreenRender.js on a neutral background, at the toolbar zoom (Fit by default:
// as large as the pane allows with 24 px around it), with the selection and the pointer handling on top in CSS pixels
// (rules in tshPointer.js) and a status line below. When the stage is larger than the pane, the pane scrolls;
// Ctrl/Cmd+wheel zooms around the pointer. A click selects the widget under the pointer and never moves it; a drag past
// 4 CSS px moves it, snapping to the grid cells, screen edges and centre while the editor grid is on (Alt suspends it);
// arrows nudge the selected widget by 1 px, Shift+arrows by 8; only the anchor is kept on the screen. Tab and
// Shift+Tab select the next and previous widget; Esc cancels a drag or clears the selection.
// Props (the boundary agreed with the route):
//   state           TshEditorState (tshEditorModel.js)
//   screenUid       uid of the shown record
//   selectedWidget  index of the selected widget in that screen, or null
//   themes          themes.json list ([] until loaded or when it failed)
//   onSelectWidget(index|null)
//   onMoveWidget(index, x, y, key)   keypad pixels; the caller applies tshEditorModel.moveWidget; key is the undo
//                   coalescing key of arrow nudges ("nudge:<uid>:<index>"), undefined for a drag
//   snapEnabled     the editor grid is on: drags snap (not the screen's saved "grid on the keypad" flag)
//   zoom            "fit" or a level (CSS px per keypad px)
//   onFit(fit)      the Fit zoom of the pane, reported when it changes
//   onZoom(level)   Ctrl/Cmd+wheel asks for another level
//   viewRef         ref that gets { visibleCenter() } -> keypad point in the middle of the visible part of the stage
//   customImages    { "<image name>": url } of card backgrounds cut out in this session (optional)
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshCanvas = exports.CANVAS_PADDING = undefined;
var View = require("../../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var react = require("../../../lib/react/react.reexport.js");
var reactI18next = require("../../../lib/react-i18next/react-i18next.js");
var module28 = require("../../misc/module_28.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var TshEditorModel = require("./tshEditorModel.js");
var TshLayout = require("./tshLayout.js");
var TshScreenRender = require("./TshScreenRender.js");
var TshPointer = require("./tshPointer.js");
var TshHistory = require("./tshHistory.js");
var TshWidgetTypes = require("./tshWidgetTypes.js");
var TshZoom = require("./tshZoom.js");
var Color = GetHexColorTransparent.Color;
// Space around the stage in the pane, CSS px (plan 3.3: Fit leaves 24 px).
var CANVAS_PADDING = exports.CANVAS_PADDING = 24;
// Height of the status line under the pane, CSS px.
var STATUS_HEIGHT = 24;
// Pane width in CSS px below which the status line shows the pointer only without a selection and leaves out the type
// (the inspector shows it).
var BRIEF_STATUS_WIDTH = 560;
// Wheel travel (deltaY units) per zoom step of Ctrl/Cmd+wheel, so a trackpad pinch does not race through the levels.
var WHEEL_STEP = 40;
// Width of the selection outline in CSS pixels.
var OUTLINE = 2;
var styles = {
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: Color.secondary100
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyText: {
    color: Color.secondary500,
    fontSize: 14
  },
  status: {
    height: STATUS_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: Color.secondary300,
    backgroundColor: Color.background,
    flexShrink: 0
  },
  statusText: {
    color: Color.secondary700,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    marginRight: 16,
    whiteSpace: "nowrap"
  },
  statusSpacer: {
    flex: 1
  }
};
// Tells whether a widget can be moved: typed widgets with data (raw and type 0x15 are preserve-only).
var movable = function (w) {
  return !!w && w.kind === "widget" && w.data !== null;
};
// The screen with widget index at x, y (a copy; the others stay shared). Returns the screen record.
var withWidgetAt = function (screen, index, x, y) {
  var widgets = screen.widgets.slice();
  widgets[index] = Object.assign({}, widgets[index], {
    x: x,
    y: y
  });
  return Object.assign({}, screen, {
    widgets: widgets
  });
};
// Absolutely placed box in CSS pixels of a keypad box at zoom z, with extra style; widget boxes take their hit extent
// (TshPointer.hitBox: an empty text gets a visible outline). Returns the style object.
var boxStyle = function (l, z, extra) {
  var h = TshPointer.hitBox(l, z);
  return Object.assign({
    position: "absolute",
    left: h.left * z,
    top: l.top * z,
    width: h.width * z,
    height: Math.max(l.height, 1) * z,
    pointerEvents: "none",
    boxSizing: "border-box"
  }, extra);
};
// Size of the pane content and the stage's offset in it: the stage is centred while it fits, else it sits at the
// padding and the pane scrolls. The content clips the overlay, so outlines of boxes past the screen edge never make
// the pane scroll. Returns { width, height, x, y }.
var contentBox = function (pane, stageW, stageH) {
  var width = Math.max(pane.width, stageW + 2 * CANVAS_PADDING);
  var height = Math.max(pane.height, stageH + 2 * CANVAS_PADDING);
  return {
    width: width,
    height: height,
    x: Math.round((width - stageW) / 2),
    y: Math.round((height - stageH) / 2)
  };
};
exports.TshCanvas = function (props) {
  var t = (0, reactI18next.useTranslation)().t;
  var blob = props.state.blob;
  var m = (0, react.useMemo)(function () {
    return TshLayout.metricsFor(blob.width, blob.height);
  }, [blob.width, blob.height]);
  var paneRef = (0, react.useRef)(null);
  var pane = (0, react.useState)({
    width: 0,
    height: 0
  });
  // Follows the size of the scrolling pane (CSS px of its own box). clientWidth/Height are rounded, so 1 px is kept
  // back: content of the rounded-up size would overflow by a fraction, show scrollbars and make Fit oscillate.
  (0, react.useEffect)(function () {
    var node = paneRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    var measure = function () {
      var width = Math.max(node.clientWidth - 1, 0);
      var height = Math.max(node.clientHeight - 1, 0);
      pane[1](function (prev) {
        return prev.width === width && prev.height === height ? prev : {
          width: width,
          height: height
        };
      });
    };
    var observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return function () {
      observer.disconnect();
    };
  }, []);
  var fit = pane[0].width > 0 ? TshZoom.fitZoom(pane[0], m, CANVAS_PADDING) : 0;
  (0, react.useEffect)(function () {
    if (fit > 0) {
      props.onFit(fit);
    }
  }, [fit]);
  var scale = props.zoom === "fit" ? fit : props.zoom;
  var box = contentBox(pane[0], m.width * scale, m.height * scale);
  // Pending zoom around the pointer (Ctrl/Cmd+wheel) and the zoom and offset of the last render.
  var pendingRef = (0, react.useRef)(null);
  var lastRef = (0, react.useRef)({
    scale: scale,
    x: box.x,
    y: box.y
  });
  var wheelRef = (0, react.useRef)(0);
  // Pane scroll before the last change: reading it after a zoom out gives the value the browser already clamped.
  var scrollRef = (0, react.useRef)({
    left: 0,
    top: 0
  });
  // After a zoom change: keeps the keypad point under the pointer (wheel) or the middle of the pane (toolbar, keys).
  (0, react.useLayoutEffect)(function () {
    var node = paneRef.current;
    var last = lastRef.current;
    if (node && last.scale > 0 && scale > 0 && last.scale !== scale) {
      var p = pendingRef.current ?? {
        point: {
          x: node.clientWidth / 2,
          y: node.clientHeight / 2
        }
      };
      var next = TshZoom.zoomAround({
        left: scrollRef.current.left - last.x,
        top: scrollRef.current.top - last.y
      }, p.point, last.scale, scale);
      node.scrollLeft = next.left + box.x;
      node.scrollTop = next.top + box.y;
      scrollRef.current = {
        left: node.scrollLeft,
        top: node.scrollTop
      };
    }
    pendingRef.current = null;
    lastRef.current = {
      scale: scale,
      x: box.x,
      y: box.y
    };
  });
  var zoomRef = (0, react.useRef)(null);
  zoomRef.current = {
    scale: scale,
    onZoom: props.onZoom
  };
  // Ctrl/Cmd+wheel zooms around the pointer (a native listener: React's wheel listener is passive).
  (0, react.useEffect)(function () {
    var node = paneRef.current;
    if (!node) {
      return undefined;
    }
    var onWheel = function (event) {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }
      event.preventDefault();
      wheelRef.current += event.deltaY;
      if (Math.abs(wheelRef.current) < WHEEL_STEP) {
        return;
      }
      var dir = wheelRef.current < 0 ? 1 : -1;
      wheelRef.current = 0;
      var z = zoomRef.current;
      var level = TshZoom.stepZoom(z.scale, dir);
      if (level === z.scale) {
        return;
      }
      var rect = node.getBoundingClientRect();
      var s = rect.width / node.offsetWidth || 1;
      pendingRef.current = {
        point: {
          x: (event.clientX - rect.left) / s,
          y: (event.clientY - rect.top) / s
        }
      };
      z.onZoom(level);
    };
    node.addEventListener("wheel", onWheel, {
      passive: false
    });
    return function () {
      node.removeEventListener("wheel", onWheel);
    };
  }, []);
  // Press/drag state of the stage (tshPointer.js), read by the route to hold its keys during a press or drag.
  var pointerRef = (0, react.useRef)(TshPointer.IDLE);
  if (props.viewRef) {
    // Keypad point in the middle of the visible part of the stage (new widgets go there): the pane viewport cut to the
    // stage on each axis.
    props.viewRef.current = {
      visibleCenter: function () {
        var node = paneRef.current;
        if (!node || !(scale > 0)) {
          return {
            x: m.width / 2,
            y: m.height / 2
          };
        }
        var mid = function (scroll, size, offset, length) {
          var from = Math.max(scroll, offset);
          var to = Math.min(scroll + size, offset + length);
          return ((from < to ? (from + to) / 2 : offset + length / 2) - offset) / scale;
        };
        return {
          x: mid(node.scrollLeft, node.clientWidth, box.x, m.width * scale),
          y: mid(node.scrollTop, node.clientHeight, box.y, m.height * scale)
        };
      },
      // Tells whether a press or drag on the stage is in progress. Returns a boolean.
      busy: function () {
        return pointerRef.current.phase !== "idle";
      }
    };
  }
  var found = props.screenUid === null ? null : TshEditorModel.findScreen(props.state, props.screenUid);
  var missing = found && TshLayout.screenBackground(found.record, props.state.blob.records[0], props.themes,
    props.customImages).missing;
  var status = (0, react.useState)(null);
  return <View style={styles.root}><div ref={paneRef} onScroll={function (event) {
      scrollRef.current = {
        left: event.currentTarget.scrollLeft,
        top: event.currentTarget.scrollTop
      };
    }} style={{
      flex: 1,
      minHeight: 0,
      overflow: "auto",
      overflowAnchor: "none",
      position: "relative",
      display: "flex",
      flexDirection: "column"
    }}>{found && scale > 0 && <div style={{
        position: "relative",
        width: box.width,
        height: box.height,
        flexShrink: 0,
        overflow: "hidden"
      }}><KeypadScreen {...props} pointerRef={pointerRef} m={m} scale={scale} offset={box} paneRef={paneRef} screen={found.record} onStatus={status[1]} brief={pane[0].width < BRIEF_STATUS_WIDTH} /></div>}{!found && <View style={styles.empty}><module28.Text style={styles.emptyText}>{t("tsh_editor.preview_none")}</module28.Text></View>}{missing && <div role="note" style={{
        position: "sticky",
        left: 0,
        top: 0,
        marginBottom: -32,
        height: 32,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        backgroundColor: Color.warning100,
        borderBottom: `1px solid ${Color.warning300}`,
        color: Color.secondary900,
        fontSize: 12,
        zIndex: 2
      }}>{t("tsh_editor.sd.bg_missing", {
        name: found.record.image
      })}</div>}</div><View style={styles.status}>{(status[0] ?? []).map(function (text, i) {
      return <module28.Text key={i} style={styles.statusText} numberOfLines={1}>{text}</module28.Text>;
    })}<View style={styles.statusSpacer} /><module28.Text style={styles.statusText}>{t(props.snapEnabled ? "tsh_editor.grid_on" : "tsh_editor.grid_off")}</module28.Text><module28.Text style={[styles.statusText, {
        marginRight: 0
      }]}>{`${Math.round(scale * 100)} %`}</module28.Text></View></View>;
};
// The keypad screen in scale at offset in the pane content: the static drawing, the editor grid (snap targets) while
// snapping is on, the hover and selection outlines with the anchor handle, snap guides and the position tooltip while
// dragging. Pointer handling is on the stage (tshPointer.js): a press selects the widget under the pointer (Alt+press
// or Shift+press the next one under it) and moves nothing; a drag starts after DRAG_THRESHOLD_PX and commits one move
// on release; Esc cancels it. The press/drag state lives in props.pointerRef (TshCanvas reads it). The status line
// texts go to props.onStatus (props.brief: a narrow pane, the selected position and size, or the pointer without a
// selection). Returns the element.
var KeypadScreen = function (props) {
  var t = (0, reactI18next.useTranslation)().t;
  var screen = props.screen;
  var m = props.m;
  var scale = props.scale;
  var pointerRef = props.pointerRef;
  var drag = (0, react.useState)(null);
  var hover = (0, react.useState)(null);
  var cursor = (0, react.useState)(null);
  var frameRef = (0, react.useRef)(null);
  var opts = {
    now: new Date(),
    lang: props.state.input.lang
  };
  var d = drag[0];
  var shown = d ? withWidgetAt(screen, d.index, d.x, d.y) : screen;
  var layouts = shown.widgets.map(function (w) {
    return TshLayout.widgetLayout(w, m, opts);
  });
  // Keypad point of a pointer event, from the live rectangle of the stage (its drawn width gives the zoom, also under
  // the app's body zoom on HiDPI screens).
  var keypadPoint = function (event) {
    var rect = frameRef.current.getBoundingClientRect();
    return TshPointer.toKeypad(event.clientX, event.clientY, rect, rect.width / m.width);
  };
  // Runs a pointer event through the state machine and shows the drag; commits the move a release returns.
  var dispatch = function (event) {
    var next = TshPointer.pointerReducer(pointerRef.current, event);
    pointerRef.current = next;
    drag[1](next.phase === "dragging" ? {
      index: next.index,
      x: next.pos.x,
      y: next.pos.y,
      guides: next.guides
    } : null);
    if (next.commit) {
      props.onMoveWidget(next.commit.index, next.commit.x, next.commit.y);
    }
    return next;
  };
  // A press or drag ends without a commit when the screen changes under it (another screen picked, undo, a change
  // from elsewhere): its widget index may name another widget now (review I1, I3).
  (0, react.useEffect)(function () {
    if (pointerRef.current.phase !== "idle") {
      dispatch({
        type: "cancel"
      });
    }
  }, [screen]);
  (0, react.useEffect)(function () {
    return function () {
      pointerRef.current = TshPointer.IDLE;
    };
  }, []);
  var onPointerDown = function (event) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    frameRef.current?.focus({
      preventScroll: true
    });
    var point = keypadPoint(event);
    // Alt or Shift cycles (some Linux window managers keep Alt+click for moving windows).
    var index = TshPointer.hitTest(layouts, point, scale, event.altKey || event.shiftKey ? props.selectedWidget :
      null);
    props.onSelectWidget(index);
    if (index === null) {
      dispatch({
        type: "cancel"
      });
      return;
    }
    var w = screen.widgets[index];
    var origin = w.kind === "widget" ? {
      x: w.x,
      y: w.y
    } : TshLayout.rawWidgetPosition(w.bytes);
    // The stage takes the pointer at the press, so a release outside it still ends the press (review I1); the
    // threshold alone decides whether it becomes a drag.
    frameRef.current?.setPointerCapture?.(event.pointerId);
    dispatch({
      type: "down",
      index: index,
      pointerId: event.pointerId,
      movable: movable(w),
      client: {
        x: event.clientX,
        y: event.clientY
      },
      keypad: point,
      layout: layouts[index],
      origin: origin
    });
  };
  var onPointerMove = function (event) {
    var point = keypadPoint(event);
    cursor[1]({
      x: Math.floor(point.x),
      y: Math.floor(point.y)
    });
    var current = pointerRef.current;
    if (current.phase === "idle") {
      var over = TshPointer.hitTest(layouts, point, scale, null);
      if (over !== hover[0]) {
        hover[1](over);
      }
      return;
    }
    dispatch({
      type: "move",
      buttons: event.buttons,
      pointerId: event.pointerId,
      client: {
        x: event.clientX,
        y: event.clientY
      },
      keypad: point,
      snap: !!props.snapEnabled && !event.altKey,
      zoom: scale,
      m: m
    });
  };
  var onKeyDown = function (event) {
    if (event.key === "Escape") {
      // A handled Esc does not reach the page (it would close the editor).
      if (pointerRef.current.phase !== "idle") {
        event.preventDefault();
        event.stopPropagation();
        dispatch({
          type: "key",
          key: "Escape"
        });
      } else if (props.selectedWidget !== null) {
        event.preventDefault();
        event.stopPropagation();
        props.onSelectWidget(null);
      }
      return;
    }
    var index = props.selectedWidget;
    var count = screen.widgets.length;
    var action = TshHistory.shortcutFor(event);
    if ((action === "nextWidget" || action === "prevWidget") && count > 0) {
      // Tab and Shift+Tab walk through the widgets in drawing order, wrapping.
      event.preventDefault();
      var step = action === "nextWidget" ? 1 : -1;
      props.onSelectWidget(index === null ? step > 0 ? 0 : count - 1 : (index + step + count) % count);
      return;
    }
    var w = index === null ? null : screen.widgets[index];
    var delta = movable(w) && pointerRef.current.phase === "idle" ? TshLayout.nudgeDelta(event.key, event.shiftKey) :
      null;
    if (!delta) {
      return;
    }
    event.preventDefault();
    var pos = TshPointer.nudgeAnchor(w, delta, m);
    if (pos.x !== w.x || pos.y !== w.y) {
      // A held arrow is one undo step (coalescing key per widget).
      props.onMoveWidget(index, pos.x, pos.y, `nudge:${screen.uid}:${index}`);
    }
  };
  var selected = props.selectedWidget === null ? null : layouts[props.selectedWidget] ?? null;
  var selectedWidget = selected ? shown.widgets[props.selectedWidget] : null;
  var hovered = hover[0] !== null && hover[0] !== props.selectedWidget ? layouts[hover[0]] ?? null : null;
  // Scrolls a widget picked elsewhere (layers list, Tab) into view when the stage is larger than the pane.
  (0, react.useEffect)(function () {
    var node = props.paneRef.current;
    if (!node || !selected) {
      return;
    }
    // Only the part of the box on the screen counts (boxes may extend past the edges).
    var left = props.offset.x + Math.max(selected.left, 0) * scale;
    var top = props.offset.y + Math.max(selected.top, 0) * scale;
    var right = props.offset.x + Math.min(selected.left + selected.width, m.width) * scale;
    var bottom = props.offset.y + Math.min(selected.top + selected.height, m.height) * scale;
    if (left < node.scrollLeft || right > node.scrollLeft + node.clientWidth) {
      node.scrollLeft = Math.max(0, left - CANVAS_PADDING);
    }
    if (top < node.scrollTop || bottom > node.scrollTop + node.clientHeight) {
      node.scrollTop = Math.max(0, top - CANVAS_PADDING);
    }
  }, [props.selectedWidget, screen.uid]);
  // Status line: the pointer (or the selected anchor), the selected box size and type.
  var status = [];
  if (cursor[0] && (!props.brief || !selectedWidget)) {
    status.push(t("tsh_editor.canvas_pointer", cursor[0]));
  }
  if (selectedWidget) {
    var def = selectedWidget.kind === "widget" && selectedWidget.data !== null ?
      TshWidgetTypes.widgetTypeDef(selectedWidget.type) : null;
    var anchor = selectedWidget.kind === "widget" ? selectedWidget : TshLayout.rawWidgetPosition(selectedWidget.bytes);
    status.push(t("tsh_editor.canvas_widget", {
      x: anchor.x,
      y: anchor.y
    }));
    status.push(`${selected.width} × ${selected.height}`);
    if (!props.brief) {
      status.push(def ? t("tsh_editor.widget." + def.key) : t("tsh_editor.unsupported"));
    }
  }
  var statusKey = status.join("\u0000");
  (0, react.useEffect)(function () {
    props.onStatus(status);
  }, [statusKey]);
  (0, react.useEffect)(function () {
    return function () {
      props.onStatus(null);
    };
  }, []);
  return <div ref={frameRef} tabIndex={0} aria-label={screen.name} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={function (event) {
      dispatch({
        type: "up",
        pointerId: event.pointerId
      });
    }} onPointerCancel={function () {
      dispatch({
        type: "cancel"
      });
    }} onLostPointerCapture={function () {
      // After a release this finds the press already ended; otherwise the pointer was lost.
      if (pointerRef.current.phase !== "idle") {
        dispatch({
          type: "cancel"
        });
      }
    }} onPointerLeave={function () {
      hover[1](null);
      cursor[1](null);
    }} style={{
      position: "absolute",
      left: props.offset.x,
      top: props.offset.y,
      width: m.width * scale,
      height: m.height * scale,
      outline: "none",
      boxShadow: `0 0 0 1px ${Color.secondary300}, 0 4px 16px rgba(0, 0, 0, 0.12)`,
      userSelect: "none",
      touchAction: "none",
      cursor: d ? "grabbing" : hover[0] !== null && movable(screen.widgets[hover[0]]) ? "move" : "default"
    }}><div style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden"
      }}><TshScreenRender.TshScreenRender state={props.state} screen={shown} themes={props.themes} customImages={props.customImages} scale={scale} /></div>{props.snapEnabled && TshLayout.gridCells(m).map(function (c, i) {
      return <div key={"g" + i} style={boxStyle(c, scale, {
        outline: `1px dashed ${Color.primary300}`,
        opacity: 0.6
      })} />;
    })}{hovered && <div style={boxStyle(hovered, scale, {
      outline: `1px solid ${Color.primary300}`
    })} />}{selected && <div style={boxStyle(selected, scale, {
      outline: `${OUTLINE}px solid ${Color.primary500}`,
      outlineOffset: 1
    })}><div style={{
        position: "absolute",
        left: (selected.left - selected.offsetX - TshPointer.hitBox(selected, scale).left) * scale - 4,
        top: -4,
        width: 7,
        height: 7,
        boxSizing: "border-box",
        border: `1.5px solid ${Color.primary500}`,
        backgroundColor: Color.background
      }} /></div>}{d && d.guides.map(function (g, i) {
      var vertical = g.axis === "x";
      return <div key={"s" + i} style={{
        position: "absolute",
        left: vertical ? g.at * scale : 0,
        top: vertical ? 0 : g.at * scale,
        width: vertical ? 1 : m.width * scale,
        height: vertical ? m.height * scale : 1,
        backgroundColor: Color.warning500,
        pointerEvents: "none"
      }} />;
    })}{!screen.widgets.length && (screen.type === "user" || screen.type === "additional") && <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      padding: "6px 12px",
      borderRadius: 6,
      backgroundColor: Color.background,
      boxShadow: `0 0 0 1px ${Color.secondary300}`,
      color: Color.secondary700,
      fontSize: 13,
      whiteSpace: "nowrap",
      pointerEvents: "none",
      opacity: 0.92
    }}>{t("tsh_editor.canvas_empty")}</div>}{d && selected && <div style={{
      position: "absolute",
      left: selected.left * scale,
      top: Math.max(selected.top * scale - 26, 2),
      padding: "2px 6px",
      borderRadius: 4,
      backgroundColor: Color.secondary900,
      color: Color.background,
      fontSize: 11,
      whiteSpace: "nowrap",
      pointerEvents: "none",
      fontVariant: "tabular-nums"
    }}>{`${d.x}, ${d.y}`}</div>}</div>;
};
