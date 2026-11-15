// Signal row of the desktop device tile (desktop/shared/deviceSignal.js): only BE WAVE radio devices with a signal.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const app = path.join(__dirname, "../../../src/renderer/app");
const { signalRowState } = require(path.join(app, "desktop/shared/deviceSignal.js"));
const E = require(path.join(app, "enums/ExpanderInputType.js"));

// Same list as StructureContainer.ConnectionErrorCodes.
const CONNECTION = [E.HubDeviceState_ErrorCode.CONNECTION_FAILURE, E.HubDeviceState_ErrorCode.CONNECTION_DISCONNECTED];
const radio = { product: E.HubDeviceProduct.BE_WAVE };
const state = (signal, errorCodes = []) => ({ settings: { signal }, errorCodes });

describe("signalRowState", () => {
  it("shows the signal of a connected radio device", () => {
    assert.deepEqual(signalRowState(radio, state(45), CONNECTION), { connected: true, signal: 45 });
    assert.deepEqual(signalRowState(radio, state(0), CONNECTION), { connected: true, signal: 0 });
  });
  it("shows no connection for connection error codes", () => {
    assert.deepEqual(signalRowState(radio, state(45, [E.HubDeviceState_ErrorCode.CONNECTION_DISCONNECTED]), CONNECTION), { connected: false });
    assert.deepEqual(signalRowState(radio, state(45, [E.HubDeviceState_ErrorCode.CONNECTION_FAILURE]), CONNECTION), { connected: false });
  });
  it("shows no connection even without a signal value", () => {
    const codes = [E.HubDeviceState_ErrorCode.CONNECTION_DISCONNECTED];
    assert.deepEqual(signalRowState(radio, state(undefined, codes), CONNECTION), { connected: false });
    assert.deepEqual(signalRowState(radio, { errorCodes: codes }, CONNECTION), { connected: false });
    assert.equal(signalRowState({ product: E.HubDeviceProduct.BUS_DEVICE }, state(undefined, codes), CONNECTION), null);
  });
  it("ignores other error codes", () => {
    assert.deepEqual(signalRowState(radio, state(70, [E.HubDeviceState_ErrorCode.TAMPER]), CONNECTION), { connected: true, signal: 70 });
  });
  it("has no row for bus, external and signal-less devices", () => {
    assert.equal(signalRowState({ product: E.HubDeviceProduct.BUS_DEVICE }, state(45), CONNECTION), null);
    assert.equal(signalRowState({ product: E.HubDeviceProduct.EXTERNAL }, state(45), CONNECTION), null);
    assert.equal(signalRowState(radio, state(undefined), CONNECTION), null);
    assert.equal(signalRowState(radio, { errorCodes: [] }, CONNECTION), null);
    assert.equal(signalRowState(radio, undefined, CONNECTION), null);
    assert.equal(signalRowState(undefined, state(45), CONNECTION), null);
  });
});
