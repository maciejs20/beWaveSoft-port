// Desktop object table (desktop/deviceTable/deviceTableModel.js): rows take the live state from the state stream
// (since 1.2.0 Realm keeps no device state), module column, type filter, hiding of empty columns, column layouts and widths.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const app = path.join(__dirname, "../../../src/renderer/app");
const M = require(path.join(app, "desktop/deviceTable/deviceTableModel.js"));
const { returnsToTable } = require(path.join(app, "desktop/shared/tableDetailsClose.js"));
const { ScreenName: S } = require(path.join(app, "logic/ScreenName.js"));
const E = require(path.join(app, "enums/ExpanderInputType.js"));

const T = E.HubDeviceType;
const C = E.HubDeviceState_Settings_Command;
const t = (key) => `t:${key}`;
// Stand-ins for deviceTableNames: expander channels 1-4 are inputs, every device type has a short name.
const names = {
  roomName: (tr, room) => room.name,
  isInput: (type, channel) => type === T.ACX_220 || type === T.MAIN_BOARD ? channel <= 4 : false,
  isTamper: () => false,
  channelName: (type, channel) => `Z${channel}`,
  deviceName: (type) => ({ [T.ACX_220]: "ACX-220", [T.ASW_210]: "ASW-210", [T.MAIN_BOARD]: "BE WAVE" })[type]
};
const key = (uuid, uuidChannel) => ({ uuid, uuidChannel });
const device = (type, k, extra = {}) => Object.assign({ type, key: k, name: `dev ${k.uuid}/${k.uuidChannel}`, category: 1 }, extra);
const rooms = (...devices) => [{ room: { id: "r1", name: "Salon", devices } }];
const states = (...entries) => new Map(entries.map(([k, state]) => [`${k.uuid}-${k.uuidChannel}`, state]));

describe("buildRows", () => {
  it("takes the state from the state stream", () => {
    const k = key("1234567", "2");
    const state = {
      settings: { inputType: E.ExpanderInputType.Input_2EOL_NC, inputState: E.ExpanderInputState.VIOLATION, inputValue: 2199.96, signal: 80, voltageSupply: 13.8 },
      errorCodes: [E.HubDeviceState_ErrorCode.TAMPER],
      errorCodesMemory: []
    };
    const [row] = M.buildRows(t, rooms(device(T.ACX_220, k)), states([k, state]), names);
    assert.equal(row.circuit, "t:common.options.device.expander-input-type.values.Input_2EOL_NC");
    assert.equal(row.inputState, "t:widgets.expander.input-state-values.violation");
    assert.equal(row.inputValue, "2200Ω");
    assert.equal(row.signal, "80%");
    assert.equal(row.power, "13.80V");
    assert.equal(row.errors, "t:common.options.device.error-codes.values.TAMPER");
    assert.equal(row.hasErrors, true);
    assert.equal(row.violated, true);
    assert.equal(row.module, "ACX-220 1234567");
    assert.equal(row.channel, "Z2");
    assert.deepEqual(row.kind, { input: true, output: false });
  });
  it("falls back to a state kept on the device", () => {
    const k = key("77", "1");
    const [row] = M.buildRows(t, rooms(device(T.ACX_220, k, { state: { settings: { violation: false } } })), new Map(), names);
    assert.equal(row.inputState, "t:widgets.expander.input-state-values.normal");
    assert.equal(row.violated, false);
    assert.equal(row.inputValue, "");
  });
  it("shows faults kept in memory after the current ones", () => {
    const k = key("77", "1");
    const state = { settings: {}, errorCodes: [E.HubDeviceState_ErrorCode.TAMPER], errorCodesMemory: [E.HubDeviceState_ErrorCode.TAMPER, E.HubDeviceState_ErrorCode.BATTERY_LOW] };
    const [row] = M.buildRows(t, rooms(device(T.ACX_220, k)), states([k, state]), names);
    assert.equal(row.errors, "t:common.options.device.error-codes.values.TAMPER; t:device_table.in_memory: t:common.options.device.error-codes.values.BATTERY_LOW");
    assert.equal(row.hasErrorsInMemory, true);
  });
  it("names the main board and gives the generic name as the module title", () => {
    const [board, expander] = M.buildRows(t, rooms(device(T.MAIN_BOARD, key("0", "1")), device(T.ACX_220, key("55", "1"))), new Map(), names);
    assert.equal(board.module, "t:device_table.main_board");
    assert.equal(board.typeLabel, "t:device_table.main_board");
    assert.equal(expander.moduleTitle, "Multi Extender");
  });
  it("classifies outputs by the on/off options of the live state", () => {
    const k = key("9", "1");
    const [row] = M.buildRows(t, rooms(device(T.ASW_210, k)), states([k, { settings: { options: [C.SET_ON_OFF], onOff: true } }]), names);
    assert.deepEqual(row.kind, { input: false, output: true });
    assert.equal(row.state, "t:device_table.on");
    const [stateless] = M.buildRows(t, rooms(device(T.ASW_210, k)), new Map(), names);
    assert.deepEqual(stateless.kind, { input: false, output: false });
  });
});

describe("matchesQuery", () => {
  it("finds rows by module serial, name and room", () => {
    const [row] = M.buildRows(t, rooms(device(T.ACX_220, key("1234567", "1"), { name: "Drzwi łazienka" })), new Map(), names);
    assert.equal(M.matchesQuery(row, "1234567"), true);
    assert.equal(M.matchesQuery(row, "acx lazienka"), true);
    assert.equal(M.matchesQuery(row, "salon"), true);
    assert.equal(M.matchesQuery(row, "kuchnia"), false);
  });
});

describe("type filter", () => {
  const rows = M.buildRows(t, rooms(device(T.ACX_220, key("1", "1")), device(T.ACX_220, key("1", "2")), device(T.ASW_210, key("2", "1"))), new Map(), names);
  it("lists each type once with the count of the counted rows", () => {
    assert.deepEqual(M.typeOptions(rows, rows.slice(1)), [
      { id: T.ACX_220, label: "ACX-220", count: 1 },
      { id: T.ASW_210, label: "ASW-210", count: 1 }
    ]);
  });
  it("keeps the selected types; no selection or only absent types keep everything", () => {
    assert.deepEqual(rows.filter((row) => M.matchesTypes(row, [T.ASW_210])).map((row) => row.id), ["2-1"]);
    assert.equal(rows.every((row) => M.matchesTypes(row, [])), true);
    assert.equal(rows.every((row) => M.matchesTypes(row, [T.MAIN_BOARD], [T.ACX_220, T.ASW_210])), true);
  });
});

describe("visibleColumns", () => {
  const columns = ["room", "circuit", "signal", "errors"];
  it("returns the same columns when every column has a value", () => {
    const rows = [{ room: "a", circuit: "x", signal: "1%", errors: "e" }];
    assert.equal(M.visibleColumns(columns, rows), columns);
  });
  it("drops columns empty in all rows", () => {
    const rows = [{ room: "a", circuit: "", signal: "1%", errors: "" }, { room: "b", circuit: "x", signal: "", errors: "" }];
    assert.deepEqual(M.visibleColumns(columns, rows), ["room", "circuit", "signal"]);
  });
});

describe("layouts", () => {
  it("show the module right after the room on inputs and outputs in every width", () => {
    for (const width of [1000, 1300, 1750]) {
      for (const tab of ["input", "output"]) {
        const layout = M.layoutFor(width, tab);
        assert.equal(layout.indexOf("module"), layout.indexOf("room") + 1, `${width} ${tab}`);
      }
    }
  });
  it("show the operating mode on outputs in every width", () => {
    for (const width of [1000, 1300, 1750]) {
      assert.ok(M.layoutFor(width, "output").includes("outputReaction"), String(width));
    }
  });
});

describe("operating mode", () => {
  it("uses the output reaction type of the device, as the details screen does", () => {
    const k = key("9", "1");
    const live = states([k, { settings: { options: [C.SET_ON_OFF] } }]);
    const [bi] = M.buildRows(t, rooms(device(T.ASW_210, k, { outputReactionType: E.OutputReactionType.SWITCH_BI })), live, names);
    assert.equal(bi.outputReaction, "t:common.options.device.output_reaction_type.values.switch_bi");
    const [none] = M.buildRows(t, rooms(device(T.ASW_210, k)), live, names);
    assert.equal(none.outputReaction, "");
  });
});

describe("column widths", () => {
  const measure = (text, kind) => text.length * (kind === "header" ? 5 : 10);
  it("fit the longest cell or header text plus padding", () => {
    const rows = [{ name: "abc", kind: { input: true, output: true }, room: "Salon", module: "" }, { name: "a", kind: {}, room: "Kuchnia duża", module: null }];
    const widths = M.autoWidths(["name", "room", "module"], rows, measure, { name: "Nazwa", room: "Pomieszczenie", module: "Moduł ▼" });
    assert.equal(widths.name, "abc (We/Wy)".length * 10 + 12);
    assert.equal(widths.room, "Kuchnia duża".length * 10 + 12);
    assert.equal(widths.module, "Moduł ▼".length * 5 + 12);
  });
  it("keep automatic widths between the minimum and the maximum", () => {
    const widths = M.autoWidths(["a", "b"], [{ a: "", b: "x".repeat(100) }], measure, {});
    assert.equal(widths.a, M.MIN_COLUMN_WIDTH);
    assert.equal(widths.b, 320);
  });
  it("clamp to the minimum width and round up", () => {
    assert.equal(M.clampWidth(10), 40);
    assert.equal(M.clampWidth(120.2), 121);
    assert.equal(M.clampWidth(500, 320), 320);
  });
  it("take stored widths over automatic ones and ignore bad values", () => {
    const widths = M.columnWidths(["room", "module", "errors", "signal"], { room: 100, module: 150, errors: 90 }, { room: 200, module: "x", errors: 5, other: 80 });
    assert.deepEqual(widths, { room: 200, module: 150, errors: 40, signal: 40 });
    assert.deepEqual(M.columnWidths(["room"], { room: 100 }, undefined), { room: 100 });
  });
});

describe("returnsToTable", () => {
  const state = (...names) => ({ index: names.length - 1, routes: names.map((name) => ({ name })) });
  it("is true for details opened from the object table or the failures list", () => {
    assert.equal(returnsToTable(state(S.HomeDashboard, S.GroupComponent, S.DeviceDashboard)), true);
    assert.equal(returnsToTable(state(S.HomeDashboard, S.HubFailures, S.DeviceDashboard)), true);
  });
  it("is false otherwise", () => {
    assert.equal(returnsToTable(state(S.HomeDashboard, S.DeviceDashboard)), false);
    assert.equal(returnsToTable(state(S.DeviceDashboard)), false);
    assert.equal(returnsToTable(undefined), false);
  });
});
