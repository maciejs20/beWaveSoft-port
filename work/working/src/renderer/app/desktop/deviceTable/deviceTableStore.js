Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.saveColumnWidths = exports.loadColumnWidths = exports.saveViewMode = exports.loadViewMode = exports.saveTableState = exports.loadTableState = undefined;
var VIEW_KEY = "deviceTable.view";
var WIDTHS_KEY = "deviceTable.columnWidths";
var memory = {
  query: "",
  tab: "input",
  sort: {
    column: null,
    descending: false
  },
  filters: {},
  room: ""
};
// Kept in memory so the table state survives Esc from the details screen.
exports.loadTableState = function () {
  return memory;
};
exports.saveTableState = function (state) {
  memory = state;
};
exports.loadViewMode = function () {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "table" ? "table" : "graphic";
  } catch (error) {
    return "graphic";
  }
};
exports.saveViewMode = function (mode) {
  try {
    window.localStorage.setItem(VIEW_KEY, mode);
  } catch (error) {}
};
// Column widths set by the user, per tab and column: {input: {room: 140}, ...}.
exports.loadColumnWidths = function () {
  try {
    var value = JSON.parse(window.localStorage.getItem(WIDTHS_KEY) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (error) {
    return {};
  }
};
exports.saveColumnWidths = function (widths) {
  try {
    window.localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths));
  } catch (error) {}
};
