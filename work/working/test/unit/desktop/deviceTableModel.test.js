// Desktop object table (desktop/deviceTable/deviceTableModel.js): rows take the live state from the state stream
// (since 1.2.0 Realm keeps no device state), module column, type filter and hiding of empty columns.
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
  const columns = [["room", 130], ["circuit", 80], ["signal", 60], ["errors", 0]];
  it("returns the same columns when every column has a value", () => {
    const rows = [{ room: "a", circuit: "x", signal: "1%", errors: "e" }];
    assert.equal(M.visibleColumns(columns, rows), columns);
  });
  it("drops columns empty in all rows and gives the free width to the last one", () => {
    const rows = [{ room: "a", circuit: "", signal: "1%", errors: "" }, { room: "b", circuit: "x", signal: "", errors: "" }];
    assert.deepEqual(M.visibleColumns(columns, rows), [["room", 130], ["circuit", 80], ["signal", 0]]);
  });
  it("keeps the flexible column when it has a value", () => {
    const rows = [{ room: "a", circuit: "", signal: "", errors: "e" }];
    assert.deepEqual(M.visibleColumns(columns, rows), [["room", 130], ["errors", 0]]);
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
