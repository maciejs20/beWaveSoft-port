// Desktop side menu grouping (desktop/shared/desktopMenuGroups.js): items of useHubSettingsMenu regrouped by screen
// (or translated title) into Summary, Configuration and Other with a nested Object entry; hidden screens dropped,
// nothing else lost.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const app = path.join(__dirname, "../../../src/renderer/app");
const { desktopGroups } = require(path.join(app, "desktop/shared/desktopMenuGroups.js"));
const { ScreenName: S } = require(path.join(app, "logic/ScreenName.js"));

const t = (key) => `t:${key}`;
const item = (screen, title = screen) => ({ screen, title });
const INSTALLER = "t:installer-data.title";
const EDIT = "t:hub-settings.edit_object";
const DELETE = "t:hub-settings.delete_object";
// Same groups and order as useHubSettingsMenu (1.2.0) on the desktop path.
const menu = () => [
  { info: { title: "summary" }, items: [item(S.GroupComponent), item(S.HubFailures), item(S.HubPowerConsumption), item(S.HubEnvironmentalData), item(S.EventLogList)] },
  { info: { title: "settings" }, items: [item(S.HubConfiguration), item(S.ScheduleList), item(S.HubMonitoring), item(S.Integrations), item(S.EmailConfigScreen), item(S.HubPresenceSimulation), item(S.UserProfile), item(S.HomeUsers), item(S.HubDiagnostics), item(S.SatelTokenKey)] },
  { info: { title: "management" }, items: [item(undefined, INSTALLER), item(undefined, EDIT), item(undefined, DELETE)] }
];
const shape = (entry) => (entry.children ? [entry.id, entry.title, entry.children.map((i) => i.title)] : entry.title);
const titles = (groups) => groups.map((g) => [g.id, g.title, g.items.map(shape)]);
const OBJECT = ["object", "t:device_table.menu_object", [S.HubConfiguration, EDIT, DELETE]];

describe("desktopGroups", () => {
  it("regroups all items into summary, configuration and other with a nested object entry", () => {
    assert.deepEqual(titles(desktopGroups(menu(), t)), [
      ["summary", "t:hub-settings.summary", [S.GroupComponent, S.EventLogList, S.HubFailures]],
      ["configuration", "t:device_table.menu_configuration", [S.Integrations, S.ScheduleList, S.HubPresenceSimulation, S.HubDiagnostics]],
      ["other", "t:device_table.menu_other", [OBJECT, INSTALLER, S.SatelTokenKey, S.HomeUsers, S.EmailConfigScreen]]
    ]);
  });
  it("gives the object entry its icon and keeps delete last", () => {
    const groups = menu();
    groups[2].items.reverse();
    const object = desktopGroups(groups, t)[2].items[0];
    assert.equal(object.leftIcon, "home-wifi");
    assert.equal(object.children.at(-1).title, DELETE);
  });
  it("matches the installer item also by its help title (non-admin)", () => {
    const groups = menu();
    groups[2].items[0] = item(undefined, "t:installer-data.help");
    assert.equal(desktopGroups(groups, t)[2].items[1].title, "t:installer-data.help");
  });
  it("keeps items it does not know at the end of other, those with a screen first", () => {
    const groups = menu();
    groups[1].items.push(item(undefined, "Unknown action"));
    groups[1].items.push(item("NewSatelScreen"));
    assert.deepEqual(desktopGroups(groups, t)[2].items.map(shape).slice(-2), ["NewSatelScreen", "Unknown action"]);
  });
  it("leaves out items filtered by permission, an empty object entry and empty groups", () => {
    const groups = menu();
    groups[1].items = groups[1].items.filter((i) => ![S.HubPresenceSimulation, S.HubDiagnostics, S.Integrations, S.ScheduleList, S.HubMonitoring, S.HubConfiguration].includes(i.screen));
    groups[2].items = [groups[2].items[0]];
    const result = desktopGroups(groups, t);
    assert.deepEqual(result.map((g) => g.id), ["summary", "other"]);
    assert.ok(!result[1].items.some((i) => i.id === "object"));
  });
  it("keeps Monitoring right after where Integrations would be when Integrations is not permitted (non-admin)", () => {
    const groups = menu();
    groups[1].items = groups[1].items.filter((i) => i.screen !== S.Integrations);
    assert.deepEqual(desktopGroups(groups, t)[1].items.map(shape), [S.HubMonitoring, S.ScheduleList, S.HubPresenceSimulation, S.HubDiagnostics]);
  });
  it("keeps My profile right after where Users would be when Users is not permitted", () => {
    const groups = menu();
    groups[1].items = groups[1].items.filter((i) => i.screen !== S.HomeUsers);
    assert.deepEqual(desktopGroups(groups, t)[2].items.map(shape), [OBJECT, INSTALLER, S.SatelTokenKey, S.UserProfile, S.EmailConfigScreen]);
  });
  it("passes the original item objects through", () => {
    const groups = menu();
    const result = desktopGroups(groups, t);
    assert.equal(result[0].items[1], groups[0].items[4]);
    assert.equal(result[2].items[0].children[0], groups[1].items[0]);
  });
});
