// Tests of the add-widget menu groups tshWidgetGroups.js (src/renderer/app/desktop/tshEditor/): every addable type
// exactly once, no other type, the plan's group order, and the default glyph of every item.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { plT } = require("../../support/tshEditorSupport.js");
const dir = path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor");
const G = require(path.join(dir, "tshWidgetGroups.js"));
const W = require(path.join(dir, "tshWidgetTypes.js"));

describe("widget groups", () => {
  it("hold every addable type exactly once and no other type", () => {
    const types = G.WIDGET_GROUPS.flatMap((g) => g.types);
    assert.equal(types.length, 21);
    assert.equal(new Set(types).size, 21);
    assert.deepEqual([...types].sort((a, b) => a - b), W.addableWidgetTypes().map((d) => d.type).sort((a, b) => a - b));
    assert.equal(types.includes(0x15), false);
  });
  it("give the menu items with their default glyphs in the plan's order", () => {
    const groups = G.widgetGroups(plT);
    assert.deepEqual(groups.map((g) => [g.key, g.items.map((i) => i.key)]), [
      ["text", ["text", "date_time", "value", "output_text"]],
      ["control", ["control", "button", "input_icon", "output_icon"]],
      ["alarm", ["arm", "disarm", "arm_toggle", "alarm_clear", "panic"]],
      ["indicators", ["room_state", "input_indicator", "output_indicator"]],
      ["navigation", ["link", "scene_start", "scene_stop"]],
      ["shapes", ["rectangle", "info"]]
    ]);
    const glyphs = Object.fromEntries(groups.flatMap((g) => g.items).map((i) => [i.key, [i.glyphKind, i.glyph]]));
    assert.deepEqual(glyphs, {
      text: ["text", null], date_time: ["text", null], value: ["text", null], output_text: ["text", null],
      control: ["icon", 0x11d], button: ["icon", 0x11d], input_icon: ["icon", 0x121], output_icon: ["icon", 0x124],
      arm: ["icon", 0x28e], disarm: ["icon", 0x28c], arm_toggle: ["icon", 0x28f], alarm_clear: ["icon", 0x28d],
      panic: ["icon", 0x105], room_state: ["dot", null], input_indicator: ["dot", null], output_indicator: ["dot", null],
      link: ["icon", 0xfa], scene_start: ["icon", 0x120], scene_stop: ["icon", 0x249], rectangle: ["rect", null],
      info: ["icon", 0x11b]
    });
  });
});
