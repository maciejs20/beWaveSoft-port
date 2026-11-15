// Line icons of the TSH screens editor toolbar, lists and menus: small inline SVGs in the current text colour (24-unit
// grid, 2-unit stroke), so they follow the app theme without image files.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Icon = undefined;
// Path data per icon name (24 x 24 grid).
var PATHS = {
  undo: ["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
  redo: ["m15 14 5-5-5-5", "M20 9H9.5a5.5 5.5 0 0 0 0 11H13"],
  plus: ["M12 5v14", "M5 12h14"],
  minus: ["M5 12h14"],
  grid: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M3 9h18", "M3 15h18", "M9 3v18",
    "M15 3v18"],
  sd: ["M6 22a2 2 0 0 1-2-2V6l4-4h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2Z", "M8 10V7", "M12 10V7", "M16 10V7"],
  help: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3", "M12 17h.01"],
  alert: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 8v4", "M12 16h.01"],
  chevronDown: ["m6 9 6 6 6-6"],
  chevronUp: ["m18 15-6-6-6 6"],
  chevronRight: ["m9 18 6-6-6-6"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  trash: ["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"],
  toTop: ["M5 3h14", "m18 13-6-6-6 6", "M12 7v14"],
  toBottom: ["M19 21H5", "m18 11-6 6-6-6", "M12 17V3"]
};
// Icon by name in size CSS px and color (default: the current text color). Returns the element.
exports.Icon = function (props) {
  var size = props.size ?? 16;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={props.color ?? "currentColor"} strokeWidth={props.name === "more" ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{
    display: "block",
    flexShrink: 0
  }}>{(PATHS[props.name] ?? []).map(function (d, i) {
      return <path key={i} d={d} />;
    })}</svg>;
};
