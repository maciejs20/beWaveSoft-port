Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DesktopDevicePicker = undefined;
var View = require("../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var TextInput = require("../../lib/react-native-web/dist/cjs/exports/TextInput/index.js").default;
var react = require("../../lib/react/react.reexport.js");
var lodash = require("../../lib/lodash/lodash.js");
var reactI18next = require("../../lib/react-i18next/react-i18next.js");
var module28 = require("../misc/module_28.js");
var module58 = require("../misc/module_58.js");
var module63 = require("../misc/module_63.js");
var GetHexColorTransparent = require("./GetHexColorTransparent.js");
var GetDeviceKey = require("./GetDeviceKey.js");
var hubVirtualDevicesChangeListener = require("./hubVirtualDevicesChangeListener.js");
var Color = GetHexColorTransparent.Color;
var styles = {
  search: {
    borderWidth: 1,
    borderColor: Color.secondary300,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    fontSize: 14,
    marginBottom: 10,
    color: Color.secondary900
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Color.secondary400,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 24,
    marginRight: 6,
    marginBottom: 6
  },
  chipWarning: {
    borderColor: Color.warning400
  },
  chipText: {
    fontSize: 12,
    color: Color.secondary900
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    borderBottomWidth: 1,
    borderBottomColor: Color.secondary300
  },
  roomName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    color: Color.secondary900
  },
  count: {
    fontSize: 12,
    marginRight: 12,
    color: Color.secondary600
  },
  selectAll: {
    fontSize: 12,
    color: Color.secondary800
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 4
  },
  cell: {
    width: "50%"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "transparent"
  },
  rowHighlighted: {
    borderColor: Color.secondary400
  },
  box: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: Color.secondary600,
    borderRadius: 3,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  boxChecked: {
    backgroundColor: Color.secondary900,
    borderColor: Color.secondary900
  },
  check: {
    fontSize: 11,
    lineHeight: 14,
    color: Color.background
  },
  name: {
    fontSize: 13,
    flex: 1,
    color: Color.secondary900
  },
  empty: {
    fontSize: 13,
    paddingVertical: 8,
    color: Color.secondary600
  }
};
var normalize = function (text) {
  return lodash.deburr(String(text ?? "")).toLowerCase();
};
var isTyping = function (target) {
  return !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
};
// Desktop replacement of RoomWithDeviceGroup, with the same selected/setSelected/filter contract.
exports.DesktopDevicePicker = function (props) {
  var selected = props.selected;
  var setSelected = props.setSelected;
  var filter = props.filter;
  var t = (0, reactI18next.useTranslation)().t;
  var allDevices = (0, hubVirtualDevicesChangeListener.hubDevicesBaseChangeListener)();
  var queryState = (0, react.useState)("");
  var query = queryState[0];
  var searching = query.trim().length > 0;
  var inputRef = (0, react.useRef)(null);
  var highlightRef = (0, react.useRef)(null);
  var isSelected = function (key) {
    return selected.some(function (item) {
      return (0, GetDeviceKey.DeviceKeyEqual)(item, key);
    });
  };
  var allowed = allDevices.filter(function (device) {
    return filter(device);
  });
  var rooms = [];
  allowed.forEach(function (device) {
    var room = rooms.find(function (entry) {
      return entry.id === device.room.id;
    });
    if (!room) {
      room = {
        id: device.room.id,
        name: device.room.name,
        devices: []
      };
      rooms.push(room);
    }
    room.devices.push(device);
  });
  var expandedState = (0, react.useState)(function () {
    return rooms.filter(function (room) {
      return room.devices.some(function (device) {
        return isSelected(device.key);
      });
    }).map(function (room) {
      return room.id;
    });
  });
  var expanded = expandedState[0];
  var needle = normalize(query.trim());
  var visibleRooms = rooms.map(function (room) {
    if (!searching) {
      return Object.assign({}, room, {
        visible: expanded.includes(room.id) ? room.devices : []
      });
    }
    var roomMatches = normalize(room.name).includes(needle);
    return Object.assign({}, room, {
      visible: room.devices.filter(function (device) {
        return roomMatches || normalize(device.name).includes(needle);
      })
    });
  }).filter(function (room) {
    return !searching || room.visible.length > 0;
  });
  var visibleDevices = lodash.flatMap(visibleRooms, function (room) {
    return room.visible;
  });
  var highlightState = (0, react.useState)(null);
  var highlighted = visibleDevices.find(function (device) {
    return highlightState[0] && (0, GetDeviceKey.DeviceKeyEqual)(device.key, highlightState[0]);
  }) || (searching ? visibleDevices[0] : undefined);
  var toggle = function (key) {
    var owner = rooms.find(function (room) {
      return room.devices.some(function (device) {
        return (0, GetDeviceKey.DeviceKeyEqual)(device.key, key);
      });
    });
    if (owner && !expanded.includes(owner.id)) {
      expandedState[1](expanded.concat([owner.id]));
    }
    setSelected(isSelected(key) ? selected.filter(function (item) {
      return !(0, GetDeviceKey.DeviceKeyEqual)(item, key);
    }) : selected.concat([key]));
  };
  var setRoomVisible = function (room, value) {
    var keys = room.visible.map(function (device) {
      return device.key;
    });
    var rest = selected.filter(function (item) {
      return !keys.some(function (key) {
        return (0, GetDeviceKey.DeviceKeyEqual)(item, key);
      });
    });
    setSelected(value ? rest.concat(keys) : rest);
  };
  (0, react.useEffect)(function () {
    var timer = setTimeout(function () {
      if (inputRef.current && !isTyping(document.activeElement)) {
        inputRef.current.focus();
      }
    }, 80);
    return function () {
      return clearTimeout(timer);
    };
  }, []);
  (0, react.useEffect)(function () {
    if (highlightRef.current && highlightRef.current.scrollIntoView) {
      highlightRef.current.scrollIntoView({
        block: "nearest"
      });
    }
  }, [highlighted && highlighted.key]);
  (0, module58.useFocusEffect)(function () {
    function onKeyDown(event) {
      if (event.isComposing) {
        return;
      }
      var inSearch = event.target === inputRef.current;
      var typing = isTyping(event.target);
      if (event.key === "Escape" && !searching && event.target === inputRef.current) {
        // TextInput stops keydown from bubbling, so hand Esc over to the page's own handler.
        event.preventDefault();
        event.stopImmediatePropagation();
        inputRef.current.blur();
        window.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true
        }));
        return;
      }
      if (event.key === "/" && !typing) {
        event.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else if (event.key === "Escape" && searching) {
        event.preventDefault();
        event.stopImmediatePropagation();
        queryState[1]("");
      } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && (inSearch || !typing)) {
        event.preventDefault();
        var index = highlighted ? visibleDevices.indexOf(highlighted) : -1;
        var next = visibleDevices[Math.min(visibleDevices.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)))];
        if (next) {
          highlightState[1](next.key);
        }
      } else if (event.key === "Enter" && !event.repeat && inSearch || event.key === " " && !typing) {
        if (highlighted) {
          event.preventDefault();
          toggle(highlighted.key);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return function () {
      return window.removeEventListener("keydown", onKeyDown, true);
    };
  });
  return <View><TextInput ref={inputRef} style={styles.search} value={query} placeholder={t("automation.picker.search_devices")} onChangeText={function (text) {
      highlightState[1](null);
      queryState[1](text);
    }} />{!!props.children && <View style={{
        marginTop: 12
      }}>{props.children}</View>}{selected.length > 0 && <View style={styles.chips}>{selected.map(function (key, index) {
        var device = allDevices.find(function (entry) {
          return (0, GetDeviceKey.DeviceKeyEqual)(entry.key, key);
        });
        var fits = allowed.some(function (entry) {
          return (0, GetDeviceKey.DeviceKeyEqual)(entry.key, key);
        });
        return <module63.PressableOpacity key={index} accessibilityLabel={device?.name} onPress={function () {
          return toggle(key);
        }}><View style={[styles.chip, !fits && styles.chipWarning]}><module28.Text style={styles.chipText}>{device?.name ?? "?"}{!fits ? ` (${t("automation.picker.not_matching")})` : ""} ×</module28.Text></View></module63.PressableOpacity>;
      })}</View>}{visibleRooms.length === 0 && <module28.Text style={styles.empty}>{t("automation.picker.no_results")}</module28.Text>}{visibleRooms.map(function (room) {
        var count = room.devices.filter(function (device) {
          return isSelected(device.key);
        }).length;
        var isOpen = searching || expanded.includes(room.id);
        var allVisibleSelected = room.visible.length > 0 && room.visible.every(function (device) {
          return isSelected(device.key);
        });
        return <View key={room.id}><View style={styles.roomHeader}><module63.PressableOpacity style={{
              flex: 1
            }} accessibilityState={{
              expanded: isOpen
            }} onPress={function () {
              return expandedState[1](expanded.includes(room.id) ? expanded.filter(function (id) {
                return id !== room.id;
              }) : expanded.concat([room.id]));
            }}><module28.Text style={styles.roomName}>{isOpen ? "▾" : "▸"} {room.name}</module28.Text></module63.PressableOpacity><module28.Text style={styles.count}>{count}/{room.devices.length}</module28.Text>{isOpen && room.visible.length > 0 && <module63.PressableOpacity onPress={function () {
              return setRoomVisible(room, !allVisibleSelected);
            }}><module28.Text style={styles.selectAll}>{t(allVisibleSelected ? "automation.picker.deselect_visible" : "automation.picker.select_visible", {
                count: room.visible.length
              })}</module28.Text></module63.PressableOpacity>}</View>{isOpen && <View style={styles.grid}>{room.visible.map(function (device) {
              var checked = isSelected(device.key);
              var isHighlighted = device === highlighted;
              return <View style={styles.cell} key={`${device.key.uuid}-${device.key.uuidChannel}`} ref={isHighlighted ? highlightRef : undefined}><module63.PressableOpacity accessibilityRole="checkbox" accessibilityState={{
                  checked: checked
                }} onPress={function () {
                  highlightState[1](device.key);
                  toggle(device.key);
                }}><View style={[styles.row, isHighlighted && styles.rowHighlighted]}><View style={[styles.box, checked && styles.boxChecked]}>{checked && <module28.Text style={styles.check}>✓</module28.Text>}</View><module28.Text style={styles.name} numberOfLines={1}>{device.name}</module28.Text></View></module63.PressableOpacity></View>;
            })}</View>}</View>;
      })}</View>;
};
