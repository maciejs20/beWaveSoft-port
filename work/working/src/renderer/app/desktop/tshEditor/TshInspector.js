// Inspector of the TSH screens editor (docs/plans/2026-11-14-tsh-editor-redesign.md 3.3 "Inspector"): tabs "Ekran" and
// "Widżet" that follow the selection (selecting a widget opens Widżet, clearing it returns to Ekran), a header with the
// title and type, a scrolling body of collapsible sections (their state kept per section in localStorage) and, on the
// Widżet tab, "Usuń widżet" at the bottom. Screen sections: Ogólne (name with byte counter and a hint for names of
// spaces only, type, main), Wygląd (theme colours, own colours, grid on the keypad), Tło; the theme record's picker and
// the screensaver options. Widget sections: Położenie i wielkość (X, Y, size M/Ś/D, centre), Treść i urządzenie, Ikony,
// Kolory, Zachowanie. Fields come from TshPropertyPanel.js.
// Props: t, state, screenUid, selectedWidget, themes, themesFailed, apply(result, key), onCustomBackground(uid),
// onDelete() (removes the selected widget after the question), onClearSelection() (Esc).
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshInspector = exports.usedIcons = exports.SECTIONS_STORAGE_KEY = undefined;
var react = require("../../../lib/react/react.reexport.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var TshEditorModel = require("./tshEditorModel.js");
var TshWidgetTypes = require("./tshWidgetTypes.js");
var TshLayout = require("./tshLayout.js");
var TshWidgetLabel = require("./tshWidgetLabel.js");
var TshFormControls = require("./TshFormControls.js");
var TshPropertyPanel = require("./TshPropertyPanel.js");
var TshUi = require("./TshUi.js");
var TshIcons = require("./TshIcons.js");
var TshHistory = require("./tshHistory.js");
var Color = GetHexColorTransparent.Color;
var C = TshFormControls;
var P = TshPropertyPanel;
// localStorage key of the collapsed sections ({ "<section id>": true }).
var SECTIONS_STORAGE_KEY = exports.SECTIONS_STORAGE_KEY = "tshEditor.inspector.collapsed";
// Field kinds per widget section: icons and arm states under Ikony, option bits under Zachowanie, the rest under Treść.
var ICON_KINDS = ["icon", "states"];
var BEHAVIOUR_KINDS = ["flags"];
// Reads the collapsed sections (empty when storage is unavailable). Returns the object.
var readCollapsed = function () {
  try {
    return JSON.parse(window.localStorage.getItem(SECTIONS_STORAGE_KEY) ?? "{}") ?? {};
  } catch (error) {
    return {};
  }
};
// Stores the collapsed sections; a storage error only loses the setting. Returns nothing.
var writeCollapsed = function (collapsed) {
  try {
    window.localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(collapsed));
  } catch (error) {
    // Ruled: the section state is a convenience, the editor works without it.
  }
};
// Icon codes used anywhere in the layout (widget icons, arm states, link icons), in first-use order. Returns numbers.
var usedIcons = exports.usedIcons = function (state) {
  var codes = [];
  var add = function (code) {
    if (typeof code === "number" && code > 0 && codes.indexOf(code) < 0) {
      codes.push(code);
    }
  };
  state.blob.records.forEach(function (r) {
    (r.kind === "screen" ? r.widgets : []).forEach(function (w) {
      var d = w.kind === "widget" ? w.data : null;
      if (!d) {
        return;
      }
      add(d.iconOff);
      add(d.iconOn);
      add(d.icon);
      (d.icons ?? []).forEach(add);
      (d.states ?? []).forEach(function (s) {
        return add(s.icon);
      });
    });
  });
  return codes;
};
// Collapsible section: a header button with a chevron and the 11 px uppercase title, then the children. Returns the
// element.
var Section = function (props) {
  var closed = !!props.collapsed[props.id];
  return <section style={{
    borderBottom: `1px solid ${Color.secondary200}`,
    paddingBottom: closed ? 0 : 8
  }}><button type="button" aria-expanded={!closed} onClick={function () {
      return props.onToggle(props.id);
    }} style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      width: "100%",
      height: 36,
      padding: 0,
      border: 0,
      background: "transparent",
      cursor: "pointer",
      color: Color.secondary600,
      fontFamily: TshUi.FONT,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase"
    }}><span style={{
        transform: closed ? "none" : "rotate(90deg)",
        transition: "transform 120ms"
      }}><TshIcons.Icon name="chevronRight" size={14} /></span>{props.title}</button>{!closed && props.children}</section>;
};
// Grey note text. Returns the element.
var Note = function (props) {
  return <div style={{
    fontSize: 12,
    lineHeight: "16px",
    color: Color.secondary500,
    margin: "4px 0 8px",
    fontFamily: TshUi.FONT
  }}>{props.children}</div>;
};
// Sections of a theme, screensaver, user or additional screen. Returns the elements.
var ScreenSections = function (props) {
  var t = props.t;
  var state = props.state;
  var screen = props.screen;
  var apply = props.apply;
  var sec = function (id, title, children) {
    return <Section key={id} id={"screen." + id} title={title} collapsed={props.collapsed} onToggle={props.onToggle}>{children}</Section>;
  };
  var blankName = screen.name !== "" && !TshWidgetLabel.hasVisibleText(screen.name);
  var general = [<C.TextField key="name" label={t("tsh_editor.name")} value={screen.name} hint={blankName ? t("tsh_editor.name_blank_hint", {
    title: props.title
  }) : null} budget={TshEditorModel.fieldBudget(state, screen.uid, null, null)} onChange={function (name) {
    return apply(TshEditorModel.renameScreen(state, screen.uid, name), P.fieldKey(screen.uid, null, "name"));
  }} />];
  if (screen.type === "theme") {
    return [sec("general", t("tsh_editor.section.general"), general), sec("theme", t("tsh_editor.theme"), <P.ThemeField t={t} state={state} screen={screen} themes={props.themes} themesFailed={props.themesFailed} apply={apply} />)];
  }
  if (screen.type === "screensaver") {
    return [sec("general", t("tsh_editor.section.general"), general), sec("saver", t("tsh_editor.type.screensaver"), [<C.CheckField key="c" label={t("tsh_editor.saver_no_clock")} value={(screen.saverOptions & TshEditorModel.SAVER_OPTION.NO_CLOCK) !== 0} onChange={function (on) {
      return apply(TshEditorModel.setSaverOption(state, TshEditorModel.SAVER_OPTION.NO_CLOCK, on));
    }} />, <C.CheckField key="s" label={t("tsh_editor.saver_off")} value={(screen.saverOptions & TshEditorModel.SAVER_OPTION.NO_SAVER) !== 0} onChange={function (on) {
      return apply(TshEditorModel.setSaverOption(state, TshEditorModel.SAVER_OPTION.NO_SAVER, on));
    }} />])];
  }
  general.push(<C.SelectField key="type" label={t("tsh_editor.screen_type")} value={screen.type} options={["user", "additional"].map(function (type) {
    return {
      value: type,
      label: t("tsh_editor.type." + type)
    };
  })} onChange={function (type) {
    return apply(TshEditorModel.setScreenType(state, screen.uid, type));
  }} />);
  if (screen.type === "user") {
    general.push(<C.CheckField key="main" label={t("tsh_editor.main_screen")} value={screen.main} onChange={function (on) {
      return apply(TshEditorModel.setMainScreen(state, screen.uid, on));
    }} />);
  }
  var look = [<C.CheckField key="theme" label={t("tsh_editor.use_theme")} value={screen.useTheme} onChange={function (on) {
    return apply(TshEditorModel.updateScreen(state, screen.uid, {
      useTheme: on
    }));
  }} />];
  if (!screen.useTheme) {
    look.push(<C.ColorsField key="colors" labels={[t("tsh_editor.color_1"), t("tsh_editor.color_2"), t("tsh_editor.color_3")]} value={screen.colors} onChange={function (colors) {
      return apply(TshEditorModel.setScreenColors(state, screen.uid, colors), P.fieldKey(screen.uid, null, "colors"));
    }} />);
  }
  look.push(<C.CheckField key="grid" label={t("tsh_editor.grid")} value={screen.grid} onChange={function (on) {
    return apply(TshEditorModel.updateScreen(state, screen.uid, {
      grid: on
    }));
  }} />);
  return [sec("general", t("tsh_editor.section.general"), general), sec("look", t("tsh_editor.section.look"), look), sec("background", t("tsh_editor.section.background"), screen.useTheme ? <Note>{t("tsh_editor.background_theme")}</Note> : <P.BackgroundField t={t} state={state} screen={screen} themes={props.themes} apply={apply} onCustomBackground={props.onCustomBackground} />)];
};
// Sections of the selected widget. Returns the elements.
var WidgetSections = function (props) {
  var t = props.t;
  var state = props.state;
  var uid = props.uid;
  var index = props.index;
  var w = props.widget;
  var apply = props.apply;
  var def = w.kind === "widget" && w.data !== null ? TshWidgetTypes.widgetTypeDef(w.type) : null;
  if (!def) {
    return <Note>{t("tsh_editor.unsupported_note")}</Note>;
  }
  var sec = function (id, title, children) {
    return <Section key={id} id={"widget." + id} title={title} collapsed={props.collapsed} onToggle={props.onToggle}>{children}</Section>;
  };
  var update = function (patch, key) {
    return apply(TshEditorModel.updateWidget(state, uid, index, patch), key);
  };
  var setField = function (path, v, typing) {
    return apply(TshEditorModel.setWidgetField(state, uid, index, path, v), typing ? P.fieldKey(uid, index, path.join(".")) :
      null);
  };
  var field = function (f) {
    return <P.WidgetField key={f.id} t={t} field={f} widget={w} state={state} used={props.used} setField={setField} setValue={function (configIndex) {
        var unit = (state.input.devices ?? []).find(function (d) {
          return d.dev_index === w.data.devIndex;
        })?.dev_values?.find(function (v) {
          return v.config_index === configIndex;
        })?.unit;
        var r = TshEditorModel.setWidgetField(state, uid, index, f.path, configIndex);
        apply(r.ok && unit !== undefined ? TshEditorModel.setWidgetField(r.state, uid, index, ["unit"], unit) : r);
      }} budget={function (path) {
        return TshEditorModel.fieldBudget(state, uid, index, path);
      }} />;
  };
  var position = [<C.FieldRow key="xy" label={t("tsh_editor.position")}><span style={{
      fontSize: 12,
      color: Color.secondary600
    }}>X</span><C.NumberInput label={t("tsh_editor.x")} value={w.x} min={0} max={state.blob.width - 1} onChange={function (x) {
      return apply(TshEditorModel.moveWidget(state, uid, index, x, w.y), P.fieldKey(uid, index, "x"));
    }} /><span style={{
      fontSize: 12,
      color: Color.secondary600
    }}>Y</span><C.NumberInput label={t("tsh_editor.y")} value={w.y} min={0} max={state.blob.height - 1} onChange={function (y) {
      return apply(TshEditorModel.moveWidget(state, uid, index, w.x, y), P.fieldKey(uid, index, "y"));
    }} /></C.FieldRow>, <C.Segmented key="size" label={t("tsh_editor.size")} value={w.size} options={P.SIZES.map(function (s) {
    return {
      value: s,
      label: t("tsh_editor.size_short_" + s),
      title: t("tsh_editor.size_" + s)
    };
  })} onChange={function (size) {
    return update({
      size: size
    });
  }} />];
  if (def.align) {
    position.push(<C.CheckField key="center" label={t("tsh_editor.center")} value={w.center} onChange={function (on) {
      // TSH stores the middle of a centered widget as X: the widget stays where it is drawn.
      var m = TshLayout.metricsFor(state.blob.width, state.blob.height);
      var moved = TshEditorModel.moveWidget(state, uid, index, TshLayout.centerShift(w, m, {
        now: new Date(),
        lang: state.input.lang
      }, on), w.y);
      return apply(moved.ok ? TshEditorModel.updateWidget(moved.state, uid, index, {
        center: on
      }) : moved);
    }} />);
  }
  var variants = TshWidgetTypes.widgetVariants(w.type).filter(function (d) {
    return d.addable;
  });
  var content = variants.length > 1 ? [<C.SelectField key="variant" label={t("tsh_editor.variant")} value={w.type} options={variants.map(function (d) {
    return {
      value: d.type,
      label: t("tsh_editor.widget." + d.key)
    };
  })} onChange={function (type) {
    return apply(TshEditorModel.changeWidgetVariant(state, uid, index, type, t));
  }} />] : [];
  def.fields.filter(function (f) {
    return ICON_KINDS.indexOf(f.kind) < 0 && BEHAVIOUR_KINDS.indexOf(f.kind) < 0;
  }).forEach(function (f) {
    return content.push(field(f));
  });
  var icons = def.fields.filter(function (f) {
    return ICON_KINDS.indexOf(f.kind) >= 0;
  }).map(field);
  var behaviour = def.fields.filter(function (f) {
    return BEHAVIOUR_KINDS.indexOf(f.kind) >= 0;
  }).map(field);
  var colors = [<C.CheckField key="theme" label={t("tsh_editor.widget_use_theme")} value={w.useTheme} onChange={function (on) {
    return update({
      useTheme: on
    });
  }} />];
  if (!w.useTheme) {
    colors.push(<C.ColorsField key="colors" labels={[t("tsh_editor.color_1"), t("tsh_editor.color_2"), t("tsh_editor.color_3")]} value={w.colors} onChange={function (c) {
      return update({
        colors: c
      }, P.fieldKey(uid, index, "colors"));
    }} />);
  }
  return [sec("position", t("tsh_editor.section.position"), position), content.length > 0 && sec("content", t("tsh_editor.section.content"), content), icons.length > 0 && sec("icons", t("tsh_editor.section.icons"), icons), sec("colors", t("tsh_editor.section.colors"), colors), behaviour.length > 0 && sec("behaviour", t("tsh_editor.section.behaviour"), behaviour)];
};
exports.TshInspector = function (props) {
  var t = props.t;
  var state = props.state;
  var found = props.screenUid === null ? null : TshEditorModel.findScreen(state, props.screenUid);
  var screen = found ? found.record : null;
  var widget = screen && props.selectedWidget !== null ? screen.widgets[props.selectedWidget] ?? null : null;
  var tab = (0, react.useState)(widget ? "widget" : "screen");
  var collapsed = (0, react.useState)(readCollapsed);
  // The tabs follow the selection: a selected widget opens Widżet, none returns to Ekran.
  (0, react.useEffect)(function () {
    tab[1](props.selectedWidget !== null ? "widget" : "screen");
  }, [props.screenUid, props.selectedWidget]);
  var toggle = function (id) {
    var next = Object.assign({}, collapsed[0]);
    if (next[id]) {
      delete next[id];
    } else {
      next[id] = true;
    }
    collapsed[1](next);
    writeCollapsed(next);
  };
  var showWidget = tab[0] === "widget" && !!widget;
  var entries = TshEditorModel.screenEntries(state);
  var entry = props.screenUid === null ? null : entries.find(function (e) {
    return e.uid === props.screenUid;
  }) ?? null;
  var screenTitle = entry ? TshWidgetLabel.screenTitle(entry, entries.filter(function (e) {
    return e.type === entry.type;
  }).indexOf(entry), t) : "";
  var label = widget ? TshWidgetLabel.widgetLabel(widget, state, t) : null;
  var title = showWidget ? label.title : screenTitle;
  var subtitle = showWidget ? label.subtitle : entry ? entry.raw ? t("tsh_editor.unsupported") : t("tsh_editor.type." + entry.type) + (entry.main ? " · " + t("tsh_editor.main_badge") : "") : "";
  var tabButton = function (id, text, disabled) {
    return <button type="button" role="tab" aria-selected={tab[0] === id} disabled={disabled} className={"tsh-tab" + (tab[0] === id && !disabled ? " tsh-on" : "")} onClick={function () {
        return tab[1](id);
      }}>{text}</button>;
  };
  // Esc in a form field ends the editing (the field loses the focus); outside a field it returns to the screen by
  // clearing the widget selection. Neither reaches the page, where Esc would leave the editor (review M4).
  var onKeyDown = function (event) {
    if (event.key !== "Escape" || event.defaultPrevented) {
      return;
    }
    if (TshHistory.isFormField(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      event.target.blur?.();
      return;
    }
    if (props.selectedWidget !== null) {
      event.preventDefault();
      event.stopPropagation();
      props.onClearSelection();
    }
  };
  return <div onKeyDown={onKeyDown} style={{
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    fontFamily: TshUi.FONT
  }}><div role="tablist" aria-label={t("tsh_editor.inspector")} style={{
      display: "flex",
      padding: "4px 16px 0",
      borderBottom: `1px solid ${Color.secondary300}`,
      flexShrink: 0
    }}>{tabButton("screen", t("tsh_editor.tab_screen"), false)}{tabButton("widget", t("tsh_editor.tab_widget"), !widget)}</div>{entry && <div style={{
      padding: "12px 16px 8px",
      flexShrink: 0
    }}><div style={{
        fontSize: 15,
        fontWeight: 600,
        color: Color.secondary900,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }} title={title}>{title}</div><div style={{
        fontSize: 12,
        color: Color.secondary600,
        marginTop: 2
      }}>{subtitle}</div></div>}<div className="tsh-scroll" role="tabpanel" style={{
      flex: 1,
      padding: "0 16px 16px"
    }}>{!found && <Note>{t(props.screenUid !== null ? "tsh_editor.unsupported_note" : "tsh_editor.select_screen")}</Note>}{found && !showWidget && <ScreenSections t={t} state={state} screen={screen} title={screenTitle} themes={props.themes} themesFailed={props.themesFailed} apply={props.apply} onCustomBackground={props.onCustomBackground} collapsed={collapsed[0]} onToggle={toggle} />}{showWidget && <WidgetSections key={`${screen.uid}:${props.selectedWidget}`} t={t} state={state} uid={screen.uid} index={props.selectedWidget} widget={widget} used={usedIcons(state)} apply={props.apply} collapsed={collapsed[0]} onToggle={toggle} />}</div>{showWidget && <div style={{
      padding: "12px 16px",
      borderTop: `1px solid ${Color.secondary300}`,
      flexShrink: 0
    }}><TshUi.ToolButton variant="danger" icon="trash" label={t("tsh_editor.remove_widget_button")} onClick={props.onDelete} style={{
        width: "100%",
        justifyContent: "center"
      }} /></div>}</div>;
};
