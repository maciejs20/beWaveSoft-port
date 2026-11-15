Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DesktopSideMenu = undefined;
var View = require("../../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var react = require("../../../lib/react/react.reexport.js");
var reactI18next = require("../../../lib/react-i18next/react-i18next.js");
var module28 = require("../../misc/module_28.js");
var module63 = require("../../misc/module_63.js");
var ActionButton = require("../../logic/ActionButton.js");
var PrimaryButtonThemeStyle = require("../../logic/PrimaryButtonThemeStyle.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var Icon2 = require("../../logic/Icon.js");
var IconFontWeight = require("../../logic/IconFontWeight.js");
var ScreenName = require("../../logic/ScreenName.js").ScreenName;
var hubVirtualDevicesChangeListener = require("../../logic/hubVirtualDevicesChangeListener.js");
var desktopMenuGroups = require("./desktopMenuGroups.js");
var Color = GetHexColorTransparent.Color;
// Collapsed state per id (stable across languages): groups summary, configuration, other and the nested object.
var STORAGE_KEY = "sideMenu.collapsed";
var DEFAULT_COLLAPSED = {
  other: true,
  object: true
};
// Routes of the object entries: opening one of them expands the object entry and its group.
var OBJECT_ROUTES = [ScreenName.HubConfiguration, ScreenName.HubEdit];
var styles = {
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 40,
    paddingVertical: 6,
    marginTop: 4
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: Color.white
  },
  badge: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: Color.warning500
  },
  chevron: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  children: {
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: Color.secondary600
  },
  danger: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Color.secondary600
  }
};
function loadCollapsed() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch (error) {
    return {};
  }
}
function isCollapsed(stored, id) {
  return id in stored ? !!stored[id] : !!DEFAULT_COLLAPSED[id];
}
function saveCollapsed(next) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {}
}
// Collapsible groups; the object entry nests its settings with the destructive entry set apart at the end.
exports.DesktopSideMenu = function (props) {
  var t = (0, reactI18next.useTranslation)().t;
  var deleteTitle = t("hub-settings.delete_object");
  var failuresCount = (0, hubVirtualDevicesChangeListener.useRoomContainer)().failuresCount ?? 0;
  var state = (0, react.useState)(loadCollapsed);
  var stored = state[0];
  var groups = desktopMenuGroups.desktopGroups(props.groups, t);
  var objectGroup = groups.find(function (group) {
    return group.items.some(function (item) {
      return item.id === "object";
    });
  });
  var objectGroupId = objectGroup ? objectGroup.id : undefined;
  (0, react.useEffect)(function () {
    if (!objectGroupId || !OBJECT_ROUTES.includes(props.routeName)) {
      return;
    }
    state[1](function (current) {
      if (!isCollapsed(current, "object") && !isCollapsed(current, objectGroupId)) {
        return current;
      }
      var next = Object.assign({}, current, {
        object: false,
        [objectGroupId]: false
      });
      saveCollapsed(next);
      return next;
    });
  }, [props.routeName, objectGroupId]);
  var toggle = function (id) {
    var next = Object.assign({}, stored, {
      [id]: !isCollapsed(stored, id)
    });
    state[1](next);
    saveCollapsed(next);
  };
  var renderItem = function (item) {
    var failures = item.screen === ScreenName.HubFailures;
    return <ActionButton.ActionButton key={item.screen ?? item.title} title={failures ? t("device_table.menu_failures", {
      failuresCount: failuresCount
    }) : item.title} selected={props.routeName === item.screen} leftIcon={item.leftIcon} hasError={failures && failuresCount > 0} onPress={item.onPress} themeStyle={PrimaryButtonThemeStyle.BackgroundColorButtonThemeStyle} />;
  };
  var renderObject = function (entry) {
    var expanded = !isCollapsed(stored, entry.id);
    return <View key={entry.id}><ActionButton.ActionButton title={entry.title} leftIcon={entry.leftIcon} rightIcon={expanded ? "chevron-up" : "chevron-down"} onPress={function () {
        return toggle(entry.id);
      }} themeStyle={PrimaryButtonThemeStyle.BackgroundColorButtonThemeStyle} />{expanded && <View style={styles.children}>{entry.children.filter(function (item) {
          return item.title !== deleteTitle;
        }).map(renderItem)}{entry.children.filter(function (item) {
          return item.title === deleteTitle;
        }).map(function (item) {
          return <View key={item.title} style={styles.danger}><ActionButton.ActionButton title={item.title} leftIcon="danger" leftIconColor={Color.danger500} onPress={item.onPress} themeStyle={PrimaryButtonThemeStyle.BackgroundColorButtonThemeStyle} /></View>;
        })}</View>}</View>;
  };
  return <View>{groups.map(function (group) {
      var collapsed = isCollapsed(stored, group.id);
      return <View key={group.id}><module63.PressableOpacity accessibilityState={{
          expanded: !collapsed
        }} onPress={function () {
          return toggle(group.id);
        }}><View style={styles.header}><View style={styles.headerTitle}><module28.Text style={styles.title}>{group.title}</module28.Text>{collapsed && failuresCount > 0 && group.items.some(function (item) {
                return item.screen === ScreenName.HubFailures;
              }) && <module28.Text style={styles.badge}>{`⚠ ${failuresCount}`}</module28.Text>}</View><View style={styles.chevron}><Icon2.Icon icon={collapsed ? "chevron-right" : "chevron-down"} fontSize={18} fontWeight={IconFontWeight.IconFontWeight.Regular} color={Color.white} /></View></View></module63.PressableOpacity>{!collapsed && group.items.map(function (item) {
          return item.children ? renderObject(item) : renderItem(item);
        })}</View>;
    })}</View>;
};
