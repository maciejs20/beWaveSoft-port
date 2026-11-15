// Screens of the TSH screens editor (docs/plans/2026-11-14-tsh-editor-redesign.md 3.3 "Left panel"): the records of
// the blob in directory order, the theme and the screensaver first, then "Ekrany użytkownika n/16" and "Ekrany
// dodatkowe n". Each row has a thumbnail drawn by TshScreenRender.js (a one-line row in compact windows), the title
// (tshWidgetLabel.screenTitle: "Ekran 1 (bez nazwy)" for a name of spaces only) and badges; on hover ↑ ↓ and a menu to
// move or remove a user or additional screen (removal asks inline). "+" adds a user or an additional screen.
// Operations go through tshEditorModel; props.apply(result) takes the new state or reports the error.
// Props: t, state, selectedUid, onSelect(uid), apply, themes, customImages, compact.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshScreenList = exports.THUMB_HEIGHT = exports.THUMB_WIDTH = undefined;
var react = require("../../../lib/react/react.reexport.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var TshEditorModel = require("./tshEditorModel.js");
var TshFormat = require("./tshFormat.js");
var TshLayout = require("./tshLayout.js");
var TshScreenRender = require("./TshScreenRender.js");
var TshWidgetLabel = require("./tshWidgetLabel.js");
var TshFormControls = require("./TshFormControls.js");
var TshUi = require("./TshUi.js");
var TshIcons = require("./TshIcons.js");
var Color = GetHexColorTransparent.Color;
// Thumbnail box in CSS px (plan 3.3: 96 x 54 for TSH2; TSG2 letterboxed).
var THUMB_WIDTH = exports.THUMB_WIDTH = 96;
var THUMB_HEIGHT = exports.THUMB_HEIGHT = 56;
// Records before the user screens: theme and screensaver (PROJEKT-TSH.md 2.1).
var FIXED_RECORDS = 2;
// Small badge after the title. Returns the element.
var Badge = function (props) {
  return <span style={{
    fontSize: 10,
    lineHeight: "16px",
    padding: "0 6px",
    borderRadius: 8,
    whiteSpace: "nowrap",
    backgroundColor: props.strong ? Color.primary100 : Color.secondary200,
    color: props.strong ? Color.primary700 : Color.secondary700
  }}>{props.text}</span>;
};
// Thumbnail of a record: the screen drawn at the scale that fits the box, letterboxed; a hatched box for a raw record.
// Returns the element.
var Thumbnail = function (props) {
  var blob = props.state.blob;
  var scale = Math.min(THUMB_WIDTH / blob.width, THUMB_HEIGHT / blob.height);
  var record = props.record;
  return <div aria-hidden="true" style={{
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: Color.secondary200,
    boxShadow: `0 0 0 1px ${props.selected ? Color.primary500 : Color.secondary300}`
  }}>{record.kind === "screen" ? <div style={{
      position: "relative",
      width: blob.width * scale,
      height: blob.height * scale,
      overflow: "hidden",
      pointerEvents: "none"
    }}><TshScreenRender.TshScreenRender state={props.state} screen={record} themes={props.themes} customImages={props.customImages} scale={scale} /></div> : <div style={{
      width: "100%",
      height: "100%",
      backgroundImage: `repeating-linear-gradient(45deg, ${Color.secondary300} 0 4px, transparent 4px 8px)`
    }} />}</div>;
};
// Menu of a movable screen row: move up, move down, remove. Returns the element.
var RowMenu = function (props) {
  var t = props.t;
  var open = (0, react.useState)(false);
  var anchor = (0, react.useRef)(null);
  var pick = function (fn) {
    return function () {
      open[1](false);
      fn();
    };
  };
  return <span style={{
    display: "inline-flex"
  }}><TshUi.ToolButton buttonRef={anchor} icon="more" small={true} title={t("tsh_editor.screen_menu")} expanded={open[0]} onClick={function () {
      return open[1](!open[0]);
    }} /><TshUi.Popover open={open[0]} anchorRef={anchor} align="right" width={200} label={t("tsh_editor.screen_menu")} onClose={function () {
      return open[1](false);
    }}><TshUi.MenuItem lead={<TshIcons.Icon name="chevronUp" size={14} />} label={t("tsh_editor.move_up")} disabled={!props.canUp} onClick={pick(props.onUp)} /><TshUi.MenuItem lead={<TshIcons.Icon name="chevronDown" size={14} />} label={t("tsh_editor.move_down")} disabled={!props.canDown} onClick={pick(props.onDown)} /><TshUi.MenuItem lead={<TshIcons.Icon name="trash" size={14} />} danger={true} label={t("tsh_editor.remove_screen_menu")} onClick={pick(props.onRemove)} /></TshUi.Popover></span>;
};
exports.TshScreenList = function (props) {
  var t = props.t;
  var state = props.state;
  var entries = TshEditorModel.screenEntries(state);
  // uid of the screen whose removal waits for the answer, or null.
  var removing = (0, react.useState)(null);
  var addOpen = (0, react.useState)(false);
  var addAnchor = (0, react.useRef)(null);
  var rowsRef = (0, react.useRef)({});
  var add = function (type) {
    addOpen[1](false);
    var r = TshEditorModel.addScreen(state, type, t);
    props.apply(r);
    if (r.ok) {
      props.onSelect(r.uid);
    }
  };
  // Keeps the selected row in view (a screen picked from a validation error, an added screen).
  (0, react.useEffect)(function () {
    rowsRef.current[props.selectedUid]?.scrollIntoView?.({
      block: "nearest"
    });
  }, [props.selectedUid]);
  var users = entries.filter(function (e) {
    return e.type === "user";
  });
  var additional = entries.filter(function (e) {
    return e.index >= FIXED_RECORDS && e.type !== "user";
  });
  var position = function (entry) {
    var same = entries.filter(function (e) {
      return e.type === entry.type;
    });
    return same.indexOf(entry);
  };
  // Neighbour of a row in the visible order for the arrow keys. Returns the entry or undefined.
  var neighbour = function (entry, dir) {
    return entries[entries.indexOf(entry) + dir];
  };
  var row = function (entry) {
    var record = state.blob.records[entry.index];
    var selected = entry.uid === props.selectedUid;
    var movable = entry.index >= FIXED_RECORDS;
    var asking = movable && removing[0] === entry.uid;
    var title = TshWidgetLabel.screenTitle(entry, position(entry), t);
    var canUp = movable && entry.index > FIXED_RECORDS && entries[entry.index - 1].type === entry.type;
    var canDown = movable && entry.index < entries.length - 1 && entries[entry.index + 1].type === entry.type;
    var theme = entry.type === "theme" && record.kind === "screen" ? TshLayout.themeOf(record, props.themes) : null;
    var badges = [];
    if (entry.main) {
      badges.push(<Badge key="m" strong={true} text={t("tsh_editor.main_badge")} />);
    }
    if (record.kind === "screen" && (entry.type === "user" || entry.type === "additional") && !record.useTheme) {
      badges.push(<Badge key="t" text={t("tsh_editor.own_colors_badge")} />);
    }
    var meta = entry.raw ? t("tsh_editor.unsupported") : entry.type === "theme" ? theme ? theme.name.replace(/_/g,
      " ") : "" : entry.type === "screensaver" ? "" : t("tsh_editor.screen_meta", {
      id: entry.id,
      count: entry.widgets
    });
    return <div key={entry.uid}><div ref={function (el) {
          rowsRef.current[entry.uid] = el;
        }} role="option" aria-selected={selected} aria-label={title} tabIndex={selected ? 0 : -1} className={"tsh-row" + (selected ? " tsh-selected" : "")} title={title} onClick={function () {
          return props.onSelect(entry.uid);
        }} onKeyDown={function (event) {
          // Keys of the row's buttons and its menu (a portal: React events bubble through it) stay with them.
          if (event.target !== event.currentTarget) {
            return;
          }
          var next = event.key === "ArrowDown" ? neighbour(entry, 1) : event.key === "ArrowUp" ? neighbour(entry, -1) :
            null;
          if (next) {
            event.preventDefault();
            props.onSelect(next.uid);
            rowsRef.current[next.uid]?.focus();
          }
        }} style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: props.compact ? "4px 4px 4px 8px" : 6,
          minHeight: props.compact ? 32 : undefined,
          fontFamily: TshUi.FONT
        }}>{!props.compact && <Thumbnail state={state} record={record} themes={props.themes} customImages={props.customImages} selected={selected} />}<div style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: props.compact ? "row" : "column",
            alignItems: props.compact ? "center" : "flex-start",
            gap: props.compact ? 6 : 3
          }}><span style={{
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 13,
              fontWeight: selected ? 600 : 400,
              color: TshWidgetLabel.hasVisibleText(entry.name) || entry.index < FIXED_RECORDS ? Color.secondary900 :
                Color.secondary600,
              flexShrink: 1
            }}>{title}</span>{(badges.length > 0 || meta && !props.compact) && <span style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexWrap: "wrap"
            }}>{badges}{!props.compact && meta && <span style={{
                fontSize: 11,
                color: Color.secondary500,
                whiteSpace: "nowrap"
              }}>{meta}</span>}</span>}</div>{movable && <span className="tsh-actions" onClick={function (event) {
            event.stopPropagation();
          }}><TshUi.ToolButton icon="chevronUp" small={true} title={t("tsh_editor.move_up")} disabled={!canUp} onClick={function () {
              return props.apply(TshEditorModel.moveScreen(state, entry.uid, -1));
            }} /><TshUi.ToolButton icon="chevronDown" small={true} title={t("tsh_editor.move_down")} disabled={!canDown} onClick={function () {
              return props.apply(TshEditorModel.moveScreen(state, entry.uid, 1));
            }} /><RowMenu t={t} canUp={canUp} canDown={canDown} onUp={function () {
              return props.apply(TshEditorModel.moveScreen(state, entry.uid, -1));
            }} onDown={function () {
              return props.apply(TshEditorModel.moveScreen(state, entry.uid, 1));
            }} onRemove={function () {
              return removing[1](entry.uid);
            }} /></span>}</div>{asking && <div style={{
          padding: "4px 8px 8px"
        }}><TshFormControls.ConfirmRow text={entry.raw ? t("tsh_editor.remove_screen_question_raw", {
            id: entry.id
          }) : t("tsh_editor.remove_screen_question", {
            name: title,
            widgets: entry.widgets
          })} confirmTitle={t("tsh_editor.remove")} cancelTitle={t("cancel")} onConfirm={function () {
            removing[1](null);
            props.apply(TshEditorModel.removeScreen(state, entry.uid));
            if (selected) {
              props.onSelect(null);
            }
          }} onCancel={function () {
            return removing[1](null);
          }} /></div>}</div>;
  };
  var heading = function (key, text, count) {
    return <div key={key} style={{
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      padding: "12px 8px 4px",
      fontFamily: TshUi.FONT
    }}><span style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: Color.secondary600
      }}>{text}</span><span style={{
        fontSize: 11,
        color: Color.secondary500
      }}>{count}</span></div>;
  };
  return <div style={{
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0
  }}><TshUi.PaneHeader title={t("tsh_editor.screens")}><TshUi.ToolButton buttonRef={addAnchor} icon="plus" small={true} title={t("tsh_editor.add_screen")} expanded={addOpen[0]} onClick={function () {
        return addOpen[1](!addOpen[0]);
      }} /><TshUi.Popover open={addOpen[0]} anchorRef={addAnchor} width={220} label={t("tsh_editor.add_screen")} onClose={function () {
        return addOpen[1](false);
      }}><TshUi.MenuItem label={t("tsh_editor.type.user")} disabled={users.length >= TshFormat.MAX_USER_SCREENS} onClick={function () {
          return add("user");
        }} /><TshUi.MenuItem label={t("tsh_editor.type.additional")} onClick={function () {
          return add("additional");
        }} /></TshUi.Popover></TshUi.PaneHeader><div className="tsh-scroll" role="listbox" aria-label={t("tsh_editor.screens")} style={{
      flex: 1,
      padding: "0 8px 8px"
    }}>{entries.slice(0, FIXED_RECORDS).map(row)}{heading("u", t("tsh_editor.user_screens"), `${users.length}/${TshFormat.MAX_USER_SCREENS}`)}{users.map(row)}{heading("a", t("tsh_editor.additional_screens"), String(additional.length))}{additional.map(row)}</div></div>;
};
