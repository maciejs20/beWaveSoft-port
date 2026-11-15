Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.desktopGroups = undefined;
var ScreenName = require("../../logic/ScreenName.js").ScreenName;
// Desktop grouping of the useHubSettingsMenu items, matched by screen.
var HIDDEN_SCREENS = [ScreenName.HubPowerConsumption, ScreenName.HubEnvironmentalData];
var SUMMARY_SCREENS = [ScreenName.GroupComponent, ScreenName.EventLogList, ScreenName.HubFailures];
// Monitoring right after Integrations and My profile right after Users are only fallbacks (see MOVED_SCREENS).
var CONFIGURATION_SCREENS = [ScreenName.Integrations, ScreenName.HubMonitoring, ScreenName.ScheduleList, ScreenName.HubPresenceSimulation, ScreenName.HubDiagnostics];
var OTHER_SCREENS = [ScreenName.SatelTokenKey, ScreenName.HomeUsers, ScreenName.UserProfile, ScreenName.EmailConfigScreen];
// Monitoring and My profile open from the Integrations and Users screens (rows on those screens), so they leave
// the menu only when that host item is present; a user without it (e.g. not an admin, so no Integrations) keeps
// the item in the menu where the host would be.
var MOVED_SCREENS = [[ScreenName.HubMonitoring, ScreenName.Integrations], [ScreenName.UserProfile, ScreenName.HomeUsers]];
function withoutMoved(items) {
  var present = items.map(function (item) {
    return item.screen;
  });
  return items.filter(function (item) {
    return !MOVED_SCREENS.some(function (pair) {
      return item.screen === pair[0] && present.includes(pair[1]);
    });
  });
}
function byScreenOrder(items, screens) {
  return screens.reduce(function (list, screen) {
    return list.concat(items.filter(function (item) {
      return item.screen === screen;
    }));
  }, []);
}
function byTitle(items, title) {
  return items.filter(function (item) {
    return !item.screen && item.title === title;
  });
}
// Items without a screen (installer data, edit object, delete object) are matched by their translated title, as
// useHubSettingsMenu builds them. "Object" nests the hub settings with edit and delete (delete last); anything not
// listed closes "Other" (items with a screen first), so no permitted item is lost.
function desktopGroups(groups, t) {
  var items = groups.reduce(function (list, group) {
    return list.concat(group.items);
  }, []);
  items = withoutMoved(items);
  var installer = byTitle(items, t("installer-data.title")).concat(byTitle(items, t("installer-data.help")));
  var edit = byTitle(items, t("hub-settings.edit_object"));
  var remove = byTitle(items, t("hub-settings.delete_object"));
  var objectChildren = byScreenOrder(items, [ScreenName.HubConfiguration]).concat(edit, remove);
  var listedScreens = HIDDEN_SCREENS.concat(SUMMARY_SCREENS, CONFIGURATION_SCREENS, OTHER_SCREENS, [ScreenName.HubConfiguration]);
  var known = installer.concat(edit, remove);
  var rest = items.filter(function (item) {
    return item.screen ? !listedScreens.includes(item.screen) : !known.includes(item);
  });
  var object = objectChildren.length > 0 ? [{
    id: "object",
    title: t("device_table.menu_object"),
    leftIcon: "home-wifi",
    children: objectChildren
  }] : [];
  return [{
    id: "summary",
    title: t("hub-settings.summary"),
    items: byScreenOrder(items, SUMMARY_SCREENS)
  }, {
    id: "configuration",
    title: t("device_table.menu_configuration"),
    items: byScreenOrder(items, CONFIGURATION_SCREENS)
  }, {
    id: "other",
    title: t("device_table.menu_other"),
    items: object.concat(installer, byScreenOrder(items, OTHER_SCREENS), rest.filter(function (item) {
      return item.screen;
    }), rest.filter(function (item) {
      return !item.screen;
    }))
  }].filter(function (group) {
    return group.items.length > 0;
  });
}
exports.desktopGroups = desktopGroups;
