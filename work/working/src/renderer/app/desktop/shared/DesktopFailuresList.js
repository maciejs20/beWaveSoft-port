Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DesktopFailuresList = undefined;
var View = require("../../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var reactI18next = require("../../../lib/react-i18next/react-i18next.js");
var module21 = require("../../misc/module_21.js");
var module28 = require("../../misc/module_28.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var GetDeviceKey = require("../../logic/GetDeviceKey.js");
var getDeviceImage = require("../../logic/getDeviceImage.js");
var Image = require("../../../lib/react-native-web/dist/cjs/exports/Image/index.js").default;
var ScreenName = require("../../logic/ScreenName.js");
var DeviceInfoComponent2 = require("../../components/DeviceInfoComponent.js");
var useDeviceRows = require("../deviceTable/useDeviceRows.js");
var clickShield = require("../deviceTable/clickShield.js");
var Color = GetHexColorTransparent.Color;
var COLUMNS = [["room", 130], ["deviceType", 80], ["errors", 0], ["signal", 50], ["power", 62]];
var styles = {
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 32,
    borderBottomWidth: 1,
    borderBottomColor: Color.secondary300,
    paddingHorizontal: 6,
    cursor: "pointer"
  },
  header: {
    cursor: "default"
  },
  cell: {
    fontSize: 13,
    paddingRight: 8,
    color: Color.secondary900
  },
  headerCell: {
    fontSize: 12,
    paddingRight: 8,
    color: Color.secondary600
  }
};
var cellStyle = function (width) {
  return width ? {
    width: width,
    flexShrink: 0
  } : {
    flex: 1,
    minWidth: 60
  };
};
// Faults in a compact table; an entry that is not a device keeps the original card.
exports.DesktopFailuresList = function (props) {
  var t = (0, reactI18next.useTranslation)().t;
  var appNavigation = (0, module21.useAppNavigation)();
  var rows = (0, useDeviceRows.useDeviceRows)();
  var items = [];
  (props.sections ?? []).forEach(function (section) {
    (section.data ?? []).forEach(function (item) {
      if (item.hasErrors || item.hasErrorsInMemory) {
        items.push(item);
      }
    });
  });
  var entries = items.map(function (item) {
    return {
      item: item,
      row: rows.find(function (row) {
        return (0, GetDeviceKey.DeviceKeyEqual)(row.key, item.key);
      })
    };
  });
  return <View style={{
    paddingHorizontal: 32
  }}>{entries.filter(function (entry) {
      return !entry.row;
    }).map(function (entry) {
      return <View key={(0, GetDeviceKey.GetDeviceKey)(entry.item.key)} style={{
        marginBottom: 8
      }}><DeviceInfoComponent2.DeviceInfoComponent deviceKey={entry.item.key} /></View>;
    })}<View style={[styles.row, styles.header]}><View style={cellStyle(200)}><module28.Text style={styles.headerCell}>{t("device_table.column_name")}</module28.Text></View>{COLUMNS.map(function (column) {
        return <View key={column[0]} style={cellStyle(column[1])}><module28.Text style={styles.headerCell} numberOfLines={1}>{t(`device_table.column_${column[0]}`)}</module28.Text></View>;
      })}</View>{entries.filter(function (entry) {
      return entry.row;
    }).map(function (entry) {
      var row = entry.row;
      var values = Object.assign({}, row, {
        errors: row.errors || (entry.item.hasErrorsInMemory ? t("device_table.in_memory") : "")
      });
      return <View key={row.id} style={styles.row} accessibilityRole="row" onClick={function (event) {
        if (event.button === 0 && !String(window.getSelection?.() ?? "")) {
          clickShield.armClickShield();
          appNavigation.navigate(ScreenName.ScreenName.DeviceDashboard, {
            key: row.key,
            readonly: true
          });
        }
      }}><View style={[cellStyle(200), {
          flexDirection: "row",
          alignItems: "center"
        }]}><Image source={(0, getDeviceImage.getDeviceImage)(row.deviceTypeId)} resizeMode="contain" style={{
            width: 24,
            height: 24,
            marginRight: 8
          }} /><module28.Text style={styles.cell} numberOfLines={1}>{row.name}</module28.Text></View>{COLUMNS.map(function (column) {
          return <div key={column[0]} title={values[column[0]] || undefined} style={Object.assign({
            display: "flex",
            minWidth: 0
          }, cellStyle(column[1]))}><module28.Text style={styles.cell} numberOfLines={1}>{values[column[0]]}</module28.Text></div>;
        })}</View>;
    })}</View>;
};
