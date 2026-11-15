// Human labels of the TSH screens editor lists (docs/plans/2026-11-14-tsh-editor-redesign.md 3.1 "Human words, not
// codes", 3.3 "Layers"): a widget's glyph and what it shows or controls ("„Brama”", "Brama Wjazdowa", "Wyjście"), and a
// screen's title with a fallback for names without a visible character (RC9: a name of four spaces collapsed the
// row). Pure functions, no React; t is the i18next translate function.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.screenTitle = exports.widgetLabel = exports.hasVisibleText = exports.MAX_LABEL_LENGTH = undefined;
var TshFormat = require("./tshFormat.js");
var TshWidgetTypes = require("./tshWidgetTypes.js");
var TshLayout = require("./tshLayout.js");
var T = TshFormat.WIDGET_TYPE;
// Longest quoted widget text in a label, in characters, before it is cut with "…" (plan 3.3).
var MAX_LABEL_LENGTH = exports.MAX_LABEL_LENGTH = 32;
// Characters that show nothing: white space, control characters, zero-width spaces and joiners, BOM (plan task 10).
var VISIBLE = /[^\s\u0000-\u001f​-‍﻿]/;
// Tells whether a text has at least one visible character. Returns a boolean.
var hasVisibleText = exports.hasVisibleText = function (text) {
  return typeof text === "string" && VISIBLE.test(text);
};
// Text cut to MAX_LABEL_LENGTH characters (code points) with "…". Returns the text.
var cut = function (text) {
  var chars = Array.from(text.trim());
  return chars.length > MAX_LABEL_LENGTH ? chars.slice(0, MAX_LABEL_LENGTH - 1).join("") + "…" : chars.join("");
};
// Name of an input list entry (devices, rooms, scenes, alarm modes) whose key field equals value, when it is visible.
// Returns the name or null.
var nameIn = function (list, key, value) {
  var found = (list ?? []).find(function (x) {
    return x[key] === value;
  });
  return found && hasVisibleText(found.name) ? found.name : null;
};
// Glyph of a widget in the lists: the WDGT glyph TSH draws for icon widgets, else the kind. Returns { glyph, glyphKind }.
var glyphOf = function (w, def) {
  if (def.look === "text") {
    return {
      glyph: null,
      glyphKind: "text"
    };
  }
  if (def.look === "rect") {
    return {
      glyph: null,
      glyphKind: "rect"
    };
  }
  if (def.look === "indicator") {
    return {
      glyph: null,
      glyphKind: "dot"
    };
  }
  var code = TshLayout.widgetIcon(w);
  return {
    glyph: code === null ? TshLayout.MISSING_ICON : TshLayout.widgetGlyph(code),
    glyphKind: "icon"
  };
};
/**
 * @typedef {Object} TshWidgetLabel
 * @property {number|null} glyph       WDGT char code (glyphKind "icon"), else null
 * @property {"icon"|"text"|"rect"|"dot"} glyphKind
 * @property {string} title            what the widget shows or controls; its type name when there is nothing better
 * @property {string} subtitle         the type name ("" for an unsupported widget)
 * @property {boolean} named           title is more than the type name
 */
// Label of a widget of a screen in state (the input's devices, rooms, scenes, alarm modes and the additional screens
// give the names). Returns a TshWidgetLabel.
exports.widgetLabel = function (w, state, t) {
  var def = w.kind === "widget" && w.data !== null ? TshWidgetTypes.widgetTypeDef(w.type) : null;
  if (!def) {
    return {
      glyph: null,
      glyphKind: "rect",
      title: t("tsh_editor.widget_unsupported"),
      subtitle: "",
      named: false
    };
  }
  var input = state.input ?? {};
  var d = w.data;
  var device = d.devIndex === undefined ? null : nameIn(input.devices, "dev_index", d.devIndex);
  var title = null;
  switch (w.type) {
    case T.TEXT:
    case T.INFO:
      title = hasVisibleText(d.text) ? t("tsh_editor.quoted", {
        text: cut(d.text)
      }) : null;
      break;
    case T.DATE_TIME:
      title = hasVisibleText(d.format) ? cut(d.format) : null;
      break;
    case T.VALUE:
      var values = (input.devices ?? []).find(function (x) {
        return x.dev_index === d.devIndex;
      })?.dev_values;
      var value = nameIn(values, "config_index", d.configIndex);
      title = device ? value ? `${device} · ${value}` : device : null;
      break;
    case T.ROOM_STATE:
      title = nameIn(input.rooms, "room_index", d.roomIndex);
      break;
    case T.SCENE_START:
    case T.SCENE_STOP:
      title = nameIn(input.scenes, "scene_index", d.sceneIndex);
      break;
    case T.ARM:
    case T.DISARM:
    case T.ARM_TOGGLE:
    case T.ALARM_CLEAR:
      title = nameIn(input.alarm_modes, "alarm_mode_index", d.alarmModeIndex);
      break;
    case T.PANIC:
      var kind = def.fields[0].options.find(function (o) {
        return o.value === d.alarmKind;
      });
      title = kind ? t("tsh_editor.option." + kind.label) : null;
      break;
    case T.LINK:
      title = d.target === TshWidgetTypes.LINK_BACK ? t("tsh_editor.link_back") : linkTarget(state, d.target, t);
      break;
    case T.RECTANGLE:
      title = t("tsh_editor.rect_label", {
        width: d.width,
        height: d.height
      });
      break;
    default:
      title = device;
  }
  var type = t("tsh_editor.widget." + def.key);
  return Object.assign(glyphOf(w, def), {
    title: title ?? type,
    subtitle: type,
    named: title !== null
  });
};
// Title of the additional screen a link points to, or null when there is none with that id. Returns the text.
var linkTarget = function (state, id, t) {
  var additional = state.blob.records.filter(function (r) {
    return r.kind === "screen" && r.type === "additional";
  });
  var index = additional.findIndex(function (r) {
    return r.id === id;
  });
  return index < 0 ? null : exports.screenTitle({
    type: "additional",
    name: additional[index].name,
    raw: false,
    id: id
  }, index, t);
};
// Title of a screen list entry (tshEditorModel.screenEntries) at 0-based position index among the records of its type:
// its name when it has a visible character, else "Ekran {n} (bez nazwy)" / "Ekran dodatkowy {n} (bez nazwy)" or the
// type name for the theme and the screensaver; an unsupported record "Nieobsługiwany ekran {id}". Returns the text.
exports.screenTitle = function (entry, index, t) {
  if (entry.raw) {
    return t("tsh_editor.screen_unsupported", {
      id: entry.id
    });
  }
  if (hasVisibleText(entry.name)) {
    return entry.name;
  }
  if (entry.type === "user" || entry.type === "additional") {
    return t("tsh_editor.screen_unnamed_" + entry.type, {
      n: index + 1
    });
  }
  return t("tsh_editor.type." + entry.type);
};
