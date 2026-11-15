// Form controls of the TSH screens editor inspector (plan 3.1 "App look": labels 13 px secondary800, controls 32 px with
// radius 6, border secondary300 and focus ring primary500, classes of TshUi.js): labelled row, checkbox, select, number,
// text with a byte counter, colours, a segmented control, the icon field (TshIconPicker.js: glyph only, code in the
// tooltip), a small button and an inline yes/no question. Plain DOM inputs inside react-native-web views, as the desktop
// device table uses them.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ConfirmRow = exports.IconField = exports.SmallButton = exports.Segmented = exports.ColorsField = exports.TextField =
  exports.NumberInput = exports.NumberField = exports.SelectField = exports.CheckField = exports.FieldRow = undefined;
var react = require("../../../lib/react/react.reexport.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var TshUi = require("./TshUi.js");
var TshIconPicker = require("./TshIconPicker.js");
var Color = GetHexColorTransparent.Color;
// Width of the label column in CSS px (the inspector is 320 or 280 px wide).
var LABEL_WIDTH = 104;
var styles = {
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 32,
    marginBottom: 8,
    fontFamily: TshUi.FONT
  },
  label: {
    width: LABEL_WIDTH,
    flexShrink: 0,
    fontSize: 13,
    lineHeight: "16px",
    color: Color.secondary800
  },
  control: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  counter: {
    fontSize: 11,
    color: Color.secondary500,
    whiteSpace: "nowrap",
    fontVariant: "tabular-nums"
  },
  hint: {
    fontSize: 11,
    lineHeight: "14px",
    color: Color.secondary600,
    margin: "-4px 0 8px",
    paddingLeft: LABEL_WIDTH + 8,
    fontFamily: TshUi.FONT
  }
};
// Label and control in one row (props.label, props.children, props.htmlFor). Returns the element.
var FieldRow = exports.FieldRow = function (props) {
  return <div style={styles.row}><label htmlFor={props.htmlFor} style={styles.label}>{props.label}</label><div style={styles.control}>{props.children}</div></div>;
};
// Unique id of a control for its label. Returns the id.
var useId = function () {
  return (0, react.useId)();
};
// Checkbox with its label on the right, over the whole row. Returns the element.
exports.CheckField = function (props) {
  return <label style={Object.assign({}, styles.row, {
    cursor: props.disabled ? "default" : "pointer"
  })}><input type="checkbox" className="tsh-check" aria-label={props.label} checked={!!props.value} disabled={props.disabled} onChange={function (event) {
      return props.onChange(event.target.checked);
    }} /><span style={{
      fontSize: 13,
      color: Color.secondary800
    }}>{props.label}</span></label>;
};
// Select of numeric or string values: options [{ value, label }]. Returns the element.
exports.SelectField = function (props) {
  var id = useId();
  var known = props.options.some(function (o) {
    return o.value === props.value;
  });
  return <FieldRow label={props.label} htmlFor={id}><select id={id} className="tsh-ctl" aria-label={props.label} value={String(props.value)} disabled={props.disabled} onChange={function (event) {
      var option = props.options.find(function (o) {
        return String(o.value) === event.target.value;
      });
      if (option) {
        props.onChange(option.value);
      }
    }}>{!known && <option value={String(props.value)}>{props.unknownLabel ?? String(props.value)}</option>}{props.options.map(function (o) {
        return <option key={String(o.value)} value={String(o.value)}>{o.label}</option>;
      })}</select></FieldRow>;
};
// Integer input within min..max; a value outside or not a number is not passed on (the text stays until blur).
// Props: label (aria), value, min, max, onChange, id, style. Returns the element.
var NumberInput = exports.NumberInput = function (props) {
  var draft = (0, react.useState)(null);
  return <input id={props.id} type="number" className="tsh-ctl" aria-label={props.label} min={props.min} max={props.max} value={draft[0] ?? String(props.value)} style={props.style} onChange={function (event) {
      var text = event.target.value;
      var v = Number(text);
      var valid = text !== "" && Number.isInteger(v) && v >= props.min && v <= props.max;
      draft[1](valid ? null : text);
      if (valid) {
        props.onChange(v);
      }
    }} onBlur={function () {
      return draft[1](null);
    }} />;
};
// Labelled integer input. Returns the element.
exports.NumberField = function (props) {
  var id = useId();
  return <FieldRow label={props.label} htmlFor={id}><NumberInput id={id} label={props.label} value={props.value} min={props.min} max={props.max} onChange={props.onChange} /></FieldRow>;
};
// Text input with the UTF-8 byte counter of tshEditorModel.fieldBudget ({ used, max } or null) and an optional hint
// line under it. Returns the element.
exports.TextField = function (props) {
  var id = useId();
  var budget = props.budget;
  var over = budget && budget.used > budget.max;
  return <div><FieldRow label={props.label} htmlFor={id}><input id={id} type="text" className="tsh-ctl" aria-label={props.label} value={props.value} aria-invalid={over || undefined} style={over ? {
        borderColor: Color.danger500
      } : undefined} onChange={function (event) {
        return props.onChange(event.target.value);
      }} />{budget && <span style={Object.assign({}, styles.counter, over ? {
        color: Color.danger500
      } : null)}>{`${budget.used}/${budget.max} B`}</span>}</FieldRow>{props.hint && <div style={styles.hint}>{props.hint}</div>}</div>;
};
// Colour pickers for "rrggbb" colours with their labels, each with its hex value. Returns the element.
exports.ColorsField = function (props) {
  return <div>{props.labels.map(function (label, i) {
      return <FieldRow key={i} label={label}><input type="color" className="tsh-ctl" aria-label={label} value={"#" + props.value[i]} disabled={props.disabled} onChange={function (event) {
          var next = props.value.slice();
          next[i] = event.target.value.replace(/^#/, "").toLowerCase();
          props.onChange(next);
        }} /><span style={{
          fontSize: 12,
          color: Color.secondary600,
          fontVariant: "tabular-nums"
        }}>{"#" + props.value[i]}</span></FieldRow>;
    })}</div>;
};
// Segmented control: options [{ value, label, title }], one pressed. Returns the element.
exports.Segmented = function (props) {
  return <FieldRow label={props.label}><div role="radiogroup" aria-label={props.label} className="tsh-seg">{props.options.map(function (o) {
        var on = o.value === props.value;
        return <button key={String(o.value)} type="button" role="radio" aria-checked={on} title={o.title} className={on ? "tsh-on" : ""} onClick={function () {
            if (!on) {
              props.onChange(o.value);
            }
          }}>{o.label}</button>;
      })}</div></FieldRow>;
};
// Small outlined button (props.title, props.onPress, props.disabled, props.danger). Returns the element.
exports.SmallButton = function (props) {
  return <button type="button" className={"tsh-btn " + (props.danger ? "tsh-danger" : "tsh-outline")} disabled={props.disabled} onClick={props.onPress} style={{
    height: 28,
    marginRight: 6,
    marginBottom: 4
  }}>{props.title}</button>;
};
// Inline question with a confirm and a cancel button (as the "Karta SD" window asks). Props: text, confirmTitle,
// cancelTitle, onConfirm, onCancel. Returns the element.
exports.ConfirmRow = function (props) {
  return <div role="alertdialog" aria-label={props.text} style={{
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    width: "100%",
    fontFamily: TshUi.FONT
  }}><div style={{
      fontSize: 12,
      color: Color.danger500,
      marginBottom: 6,
      width: "100%"
    }}>{props.text}</div><exports.SmallButton title={props.confirmTitle} danger={true} onPress={props.onConfirm} /><exports.SmallButton title={props.cancelTitle} onPress={props.onCancel} /></div>;
};
// Icon field: the label and the picker (glyph only; props t, label, value, max, used, onChange). Returns the element.
exports.IconField = function (props) {
  return <FieldRow label={props.label}><TshIconPicker.TshIconPicker t={props.t} label={props.label} value={props.value} max={props.max} used={props.used} onChange={props.onChange} /></FieldRow>;
};
