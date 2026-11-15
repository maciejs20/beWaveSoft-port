// Field controls of the TSH screens editor inspector (TshInspector.js lays them out in sections): one control per payload
// field of a widget, generated from the field definitions of tshWidgetTypes.js with data sources (devices, rooms,
// scenes, alarm modes, additional screens) from the TSH input; the theme picker of the theme record and the background
// picker of a screen. Operations go through tshEditorModel; apply(result, key) takes the new state or reports the
// error. Typing in a text, number or colour field passes a coalescing key "field:<screen uid>:<widget index or
// ->:<path>", so a run of keystrokes is one undo step (tshHistory.js).
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BackgroundField = exports.ThemeField = exports.WidgetField = exports.fieldKey = exports.SIZES = undefined;
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var TshEditorModel = require("./tshEditorModel.js");
var TshWidgetTypes = require("./tshWidgetTypes.js");
var TshFormControls = require("./TshFormControls.js");
var TshSdCard = require("./tshSdCard.js");
var Color = GetHexColorTransparent.Color;
var C = TshFormControls;
var TshIconPicker = require("./TshIconPicker.js");
// Widget sizes offered in the panel: byte 7 bits 0-1, 0 small, 1 medium, 2 large (PROJEKT-TSH.md 2.3).
var SIZES = exports.SIZES = [0, 1, 2];
// Device filters of the device field: which input flag a device needs.
var DEVICE_FILTERS = {
  input: function (d) {
    return d.has_input === 1;
  },
  output: function (d) {
    return d.has_on_off === 1;
  },
  value: function (d) {
    return Array.isArray(d.dev_values) && d.dev_values.length > 0;
  }
};
// Options of a data source field from the TSH input and the blob. Returns [{ value, label }].
var sourceOptions = function (field, data, input, state, t) {
  var none = {
    value: 0,
    label: t("tsh_editor.none")
  };
  switch (field.kind) {
    case "device":
      return (input.devices ?? []).filter(DEVICE_FILTERS[field.devices]).map(function (d) {
        return {
          value: d.dev_index,
          label: d.name
        };
      });
    case "deviceValue":
      var device = (input.devices ?? []).find(function (d) {
        return d.dev_index === data.devIndex;
      });
      return (device?.dev_values ?? []).map(function (v) {
        return {
          value: v.config_index,
          label: v.unit ? `${v.name} (${v.unit})` : v.name
        };
      });
    case "room":
      return (input.rooms ?? []).filter(function (r) {
        return r.room_index !== undefined;
      }).map(function (r) {
        return {
          value: r.room_index,
          label: r.name
        };
      });
    case "scene":
      return [none].concat((input.scenes ?? []).map(function (s) {
        return {
          value: s.scene_index,
          label: s.name
        };
      }));
    case "alarmMode":
      return [none].concat((input.alarm_modes ?? []).map(function (m) {
        return {
          value: m.alarm_mode_index,
          label: m.name
        };
      }));
    case "link":
      return [{
        value: TshWidgetTypes.LINK_BACK,
        label: t("tsh_editor.link_back")
      }].concat(TshEditorModel.screenEntries(state).filter(function (e) {
        return e.type === "additional";
      }).map(function (e) {
        return {
          value: e.id,
          label: e.name ?? t("tsh_editor.unsupported")
        };
      }));
    default:
      return (field.options ?? []).map(function (o) {
        return {
          value: o.value,
          label: t("tsh_editor.option." + o.label)
        };
      });
  }
};
// Coalescing key of typing in a field of a screen (widget null) or widget. Returns the key.
var fieldKey = exports.fieldKey = function (uid, widget, path) {
  return `field:${uid}:${widget === null ? "-" : widget}:${path}`;
};
// Form control of one payload field (props: t, field, widget, state, setField(path, value, typing), setValue(configIndex),
// budget(path), used: icon codes of the layout). Returns the element.
exports.WidgetField = function (props) {
  var t = props.t;
  var field = props.field;
  var w = props.widget;
  var value = TshWidgetTypes.getField(w.data, field.path);
  var label = t("tsh_editor.field." + field.id);
  var set = function (v) {
    return props.setField(field.path, v);
  };
  // Typing: one undo step per run of keystrokes.
  var type = function (v) {
    return props.setField(field.path, v, true);
  };
  switch (field.kind) {
    case "text":
      return <C.TextField label={label} value={value} budget={props.budget(field.path)} onChange={type} />;
    case "number":
      return <C.NumberField label={label} value={value} min={field.min} max={field.max} onChange={type} />;
    case "icon":
      return <C.IconField t={t} label={label} value={value} max={field.max} used={props.used} onChange={set} />;
    case "states":
      return <div>{value.map(function (st, i) {
          var stateLabel = t("tsh_editor.state_n", {
            n: i + 1
          });
          return <C.FieldRow key={i} label={stateLabel}><TshIconPicker.TshIconPicker t={t} label={`${stateLabel}: ${t("tsh_editor.field.icon")}`} value={st.icon} max={field.max} used={props.used} onChange={function (code) {
              return props.setField(field.path.concat([i, "icon"]), code);
            }} /><input type="color" className="tsh-ctl" aria-label={`${stateLabel}: ${t("tsh_editor.state_color")}`} title={t("tsh_editor.state_color")} value={"#" + st.color} onChange={function (event) {
              return props.setField(field.path.concat([i, "color"]), event.target.value.replace(/^#/, "").toLowerCase());
            }} /></C.FieldRow>;
        })}</div>;
    case "flags":
      return <div>{field.bits.map(function (bit) {
          return <C.CheckField key={bit.mask} label={t("tsh_editor.bit." + bit.label)} value={(value & bit.mask) !== 0} onChange={function (on) {
              return set(on ? value | bit.mask : value & ~bit.mask);
            }} />;
        })}</div>;
    case "deviceValue":
      return <C.SelectField label={label} value={value} options={sourceOptions(field, w.data, props.state.input, props.state, t)} unknownLabel={t("tsh_editor.none")} onChange={function (v) {
          return props.setValue(v);
        }} />;
    default:
      return <C.SelectField label={label} value={value} options={sourceOptions(field, w.data, props.state.input, props.state, t)} unknownLabel={`${t("tsh_editor.none")} (${value})`} onChange={set} />;
  }
};
// Theme picker of the theme record: themes.json order is the TSH theme number (id 255 - index).
exports.ThemeField = function (props) {
  var t = props.t;
  var screen = props.screen;
  if (!props.themes.length) {
    return <div style={{
      fontSize: 12,
      color: Color.secondary500,
      marginBottom: 8
    }}>{t(props.themesFailed ? "tsh_editor.themes_unavailable" : "tsh_editor.themes_loading")}</div>;
  }
  var index = 0xff - screen.id;
  return <C.SelectField label={t("tsh_editor.theme")} value={index >= 0 && index < props.themes.length ? index : -1} unknownLabel={t("tsh_editor.theme_none")} options={props.themes.map(function (theme, i) {
      return {
        value: i,
        label: theme.name.replace(/_/g, " ")
      };
    })} onChange={function (i) {
      return props.apply(TshEditorModel.setTheme(props.state, props.themes[i], i));
    }} />;
};
// Select value of the "Z pliku…" entry of the background picker (never a stored image name: those have no "*").
var BACKGROUND_FROM_FILE = "*file";
// Background picker of a screen that does not use the theme, as TSH's "..." menu at "Obraz:": no picture, the
// built-in pictures (one per themes.json background, written "int://<name>.jpg" as in Satel's sample), the
// current card file, and "Z pliku…" which opens the crop window (props.onCustomBackground). Returns the element.
exports.BackgroundField = function (props) {
  var t = props.t;
  var screen = props.screen;
  var options = [{
    value: "",
    label: t("tsh_editor.sd.bg_none")
  }].concat(props.themes.filter(function (theme, i, all) {
    return !!theme.backgroundFile && all.findIndex(function (o) {
      return o.backgroundFile === theme.backgroundFile;
    }) === i;
  }).map(function (theme) {
    return {
      value: "int://" + theme.name + ".jpg",
      label: theme.name.replace(/_/g, " ")
    };
  }));
  if (TshSdCard.isCustomBackground(screen.image)) {
    options.push({
      value: screen.image,
      label: `${t("tsh_editor.sd.bg_card")}: ${screen.image}`
    });
  }
  if (props.onCustomBackground) {
    options.push({
      value: BACKGROUND_FROM_FILE,
      label: t("tsh_editor.sd.bg_file")
    });
  }
  return <C.SelectField label={t("tsh_editor.sd.bg_label")} value={screen.image} options={options} unknownLabel={screen.image} onChange={function (image) {
      return image === BACKGROUND_FROM_FILE ? props.onCustomBackground(screen.uid) : props.apply(TshEditorModel.setScreenImage(props.state, screen.uid, image));
    }} />;
};
