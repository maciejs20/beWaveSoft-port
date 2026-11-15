Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceTableScreen = undefined;
var View = require("../../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var TextInput = require("../../../lib/react-native-web/dist/cjs/exports/TextInput/index.js").default;
var react = require("../../../lib/react/react.reexport.js");
var lodash = require("../../../lib/lodash/lodash.js");
var reactI18next = require("../../../lib/react-i18next/react-i18next.js");
var module21 = require("../../misc/module_21.js");
var module28 = require("../../misc/module_28.js");
var module32 = require("../../misc/module_32.js");
var module58 = require("../../misc/module_58.js");
var module63 = require("../../misc/module_63.js");
var useScreenRoute = require("../../hooks/useScreenRoute.js");
var ScreenName = require("../../logic/ScreenName.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var useDeviceRows = require("./useDeviceRows.js");
var deviceTableModel = require("./deviceTableModel.js");
var deviceTableStore = require("./deviceTableStore.js");
var clickShield = require("./clickShield.js");
var Color = GetHexColorTransparent.Color;
var TABS = ["input", "output", "other"];
var HEADER_FONT = "12px Jost";
var CELL_FONT = "13px Jost";
// Text widths in the table font, cached per text; the cache starts again when the web font finishes loading.
var createMeasure = function () {
  var context = document.createElement("canvas").getContext("2d");
  var cache = new Map();
  return function (text, kind) {
    var font = kind === "header" ? HEADER_FONT : CELL_FONT;
    var cacheKey = `${font}|${text}`;
    if (!cache.has(cacheKey)) {
      if (context) {
        context.font = font;
      }
      cache.set(cacheKey, context ? context.measureText(text).width : text.length * 7);
    }
    return cache.get(cacheKey);
  };
};
var styles = {
  bar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 6,
    marginBottom: 8
  },
  searchBox: {
    position: "relative",
    maxWidth: 720,
    marginBottom: 8
  },
  search: {
    borderWidth: 1,
    borderColor: Color.secondary300,
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 36,
    height: 40,
    fontSize: 15,
    color: Color.secondary900
  },
  searchClear: {
    position: "absolute",
    right: 4,
    top: 4,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  searchClearText: {
    fontSize: 20,
    lineHeight: 22,
    color: Color.secondary600
  },
  chip: {
    borderWidth: 1,
    borderColor: Color.secondary300,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6
  },
  chipOn: {
    borderColor: Color.secondary900,
    backgroundColor: Color.secondary900
  },
  chipText: {
    fontSize: 13,
    color: Color.secondary900
  },
  chipTextOn: {
    color: Color.background
  },
  table: {
    overflow: "auto"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 32,
    borderBottomWidth: 1,
    borderBottomColor: Color.secondary300,
    paddingHorizontal: 6,
    cursor: "pointer"
  },
  rowHighlighted: {
    backgroundColor: Color.secondary200
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    backgroundColor: Color.background,
    cursor: "default"
  },
  cell: {
    fontSize: 13,
    paddingRight: 8,
    color: Color.secondary900
  },
  headerPress: {
    flex: 1,
    minWidth: 0
  },
  headerCell: {
    fontSize: 12,
    paddingRight: 8,
    color: Color.secondary600
  },
  empty: {
    fontSize: 13,
    padding: 12,
    color: Color.secondary600
  }
};
// Widths come in as CSS variables of the table, so resizing a column does not re-render the rows.
var cellStyle = function (column, last) {
  var width = `var(--dt-${column})`;
  return {
    display: "flex",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    width: width,
    minWidth: last ? width : 0,
    flexGrow: last ? 1 : 0,
    flexShrink: 0
  };
};
var RESIZE_HANDLE = {
  position: "absolute",
  top: 0,
  bottom: 0,
  right: 0,
  width: 6,
  cursor: "col-resize",
  touchAction: "none",
  zIndex: 1
};
var Row = (0, react.memo)(function (props) {
  var row = props.row;
  return <View nativeID={`device-row-${row.id}`} style={[styles.row, props.highlighted && styles.rowHighlighted]} accessibilityRole="row" onClick={function (event) {
    if (event.button === 0 && !String(window.getSelection?.() ?? "")) {
      props.onOpen(row);
    }
  }}>{props.columns.map(function (column, index) {
      var text = deviceTableModel.cellText(row, column);
      return <div key={column} title={row[`${column}Title`] || text || undefined} style={cellStyle(column, index === props.columns.length - 1)}><module28.Text style={styles.cell} numberOfLines={1}>{text}</module28.Text></div>;
    })}</View>;
}, function (previous, next) {
  return previous.highlighted === next.highlighted && previous.columns === next.columns && lodash.isEqual(previous.row, next.row);
});
// Read-only device table: a row can only open the details screen and never controls anything.
exports.DeviceTableScreen = function (props) {
  var t = (0, reactI18next.useTranslation)().t;
  var appNavigation = (0, module21.useAppNavigation)();
  var navigation = (0, module58.useNavigation)();
  var params = (0, useScreenRoute.useScreenRoute)().params;
  var category = params?.id !== null && params?.id !== undefined ? parseInt(params.id, 10) : null;
  var saved = deviceTableStore.loadTableState();
  var queryState = (0, react.useState)(saved.query);
  var tabState = (0, react.useState)(saved.tab);
  var sortState = (0, react.useState)(saved.sort);
  var filterState = (0, react.useState)(saved.filters);
  var roomState = (0, react.useState)(saved.room);
  var highlightState = (0, react.useState)(null);
  var widthState = (0, react.useState)(window.innerWidth);
  var storedWidthsState = (0, react.useState)(deviceTableStore.loadColumnWidths);
  var draftWidthState = (0, react.useState)(null);
  var fontsState = (0, react.useState)(0);
  var inputRef = (0, react.useRef)(null);
  var query = queryState[0];
  var tab = tabState[0];
  var rows = (0, useDeviceRows.useDeviceRows)();
  (0, react.useEffect)(function () {
    deviceTableStore.saveTableState({
      query: query,
      tab: tab,
      sort: sortState[0],
      filters: filterState[0],
      room: roomState[0]
    });
  }, [query, tab, sortState[0], filterState[0], roomState[0]]);
  (0, react.useEffect)(function () {
    function onResize() {
      widthState[1](window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return function () {
      return window.removeEventListener("resize", onResize);
    };
  }, []);
  (0, react.useEffect)(function () {
    var active = true;
    document.fonts?.ready?.then(function () {
      if (active) {
        fontsState[1](function (count) {
          return count + 1;
        });
      }
    });
    return function () {
      active = false;
    };
  }, []);
  var measure = (0, react.useMemo)(createMeasure, [fontsState[0]]);
  // Esc on details sitting directly above this table comes back here instead of the home screen.
  (0, react.useEffect)(function () {
    function onKeyDown(event) {
      if (event.key !== "Escape" || navigation.isFocused()) {
        return;
      }
      var state = navigation.getState();
      if (state?.routes?.[state.index]?.name === ScreenName.ScreenName.DeviceDashboard && state.routes[state.index - 1]?.name === ScreenName.ScreenName.GroupComponent) {
        event.preventDefault();
        event.stopImmediatePropagation();
        navigation.goBack();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return function () {
      return window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [navigation]);
  var filters = filterState[0];
  var inTab = function (row, name) {
    return name === "input" ? row.kind.input : name === "output" ? row.kind.output : !row.kind.input && !row.kind.output;
  };
  // Tab scope: category and room of this screen only, without the search and the filters.
  var base = (0, react.useMemo)(function () {
    return rows.filter(function (row) {
      return (category === null || row.category === category) && (!params?.roomId || row.roomId === params.roomId);
    });
  }, [rows, category, params?.roomId]);
  var tabBase = (0, react.useMemo)(function () {
    return base.filter(function (row) {
      return inTab(row, tab);
    });
  }, [base, tab]);
  var tabTypes = lodash.uniq(tabBase.map(function (row) {
    return row.deviceTypeId;
  }));
  var selectedTypes = filters.types ?? [];
  var filtered = base.filter(function (row) {
    return deviceTableModel.matchesQuery(row, query) && (!roomState[0] || row.room === roomState[0]) && (!filters.errors || row.hasErrors || row.hasErrorsInMemory) && (!filters.violated || row.violated) && (!filters.tampered || row.tampered) && (!filters.blocked || row.blocked);
  });
  var scoped = filtered.filter(function (row) {
    return !inTab(row, tab) || deviceTableModel.matchesTypes(row, selectedTypes, tabTypes);
  });
  var visible = deviceTableModel.sortRows(scoped.filter(function (row) {
    return inTab(row, tab);
  }), sortState[0]);
  var typeOptions = tabTypes.length > 1 ? deviceTableModel.typeOptions(tabBase, filtered.filter(function (row) {
    return inTab(row, tab);
  })) : [];
  var rooms = lodash.uniq(rows.map(function (row) {
    return row.room;
  })).sort();
  var shownColumns = deviceTableModel.visibleColumns(deviceTableModel.layoutFor(widthState[0], tab), tabBase);
  var columns = (0, react.useMemo)(function () {
    return shownColumns;
  }, [shownColumns.join("|")]);
  // Automatic widths fit every row of the tab, so they do not jump while searching or filtering.
  var autoWidths = (0, react.useMemo)(function () {
    var headers = {};
    columns.forEach(function (column) {
      headers[column] = `${t(`device_table.column_${column}`)} ▼`;
    });
    return deviceTableModel.autoWidths(columns, tabBase, measure, headers);
  }, [columns, tabBase, measure, t]);
  var storedWidths = storedWidthsState[0];
  var widths = deviceTableModel.columnWidths(columns, autoWidths, storedWidths[tab]);
  var draftWidth = draftWidthState[0];
  if (draftWidth && draftWidth.tab === tab && widths[draftWidth.column] !== undefined) {
    widths[draftWidth.column] = draftWidth.width;
  }
  var widthVariables = {};
  columns.forEach(function (column) {
    widthVariables[`--dt-${column}`] = `${widths[column]}px`;
  });
  var storeWidth = function (column, width) {
    var own = Object.assign({}, storedWidths[tab]);
    if (width === null) {
      delete own[column];
    } else {
      own[column] = width;
    }
    var next = Object.assign({}, storedWidths, {
      [tab]: own
    });
    storedWidthsState[1](next);
    deviceTableStore.saveColumnWidths(next);
  };
  // Dragging the right border of a header cell sets the width; the header text keeps sorting on click.
  var startResize = function (event, column) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    var handle = event.currentTarget;
    var startX = event.clientX;
    var startWidth = widths[column];
    var current = startWidth;
    var cursor = document.body.style.cursor;
    handle.setPointerCapture?.(event.pointerId);
    document.body.style.cursor = "col-resize";
    function onMove(moveEvent) {
      current = deviceTableModel.clampWidth(startWidth + moveEvent.clientX - startX);
      draftWidthState[1]({
        tab: tab,
        column: column,
        width: current
      });
    }
    function onEnd() {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onEnd);
      handle.removeEventListener("pointercancel", onEnd);
      document.body.style.cursor = cursor;
      draftWidthState[1](null);
      if (current !== startWidth) {
        storeWidth(column, current);
      }
    }
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
  };
  var highlightedRow = visible.find(function (row) {
    return row.id === highlightState[0];
  }) ?? visible[0];
  var openDetails = (0, react.useCallback)(function (row) {
    clickShield.armClickShield();
    appNavigation.navigate(ScreenName.ScreenName.DeviceDashboard, {
      key: row.key
    });
  }, [appNavigation]);
  var focusSearch = function () {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  (0, react.useEffect)(function () {
    var timer = setTimeout(focusSearch, 80);
    return function () {
      return clearTimeout(timer);
    };
  }, []);
  (0, module58.useFocusEffect)(function () {
    focusSearch();
    function onKeyDown(event) {
      if (event.isComposing) {
        return;
      }
      var target = event.target;
      var inSearch = target === inputRef.current;
      var typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (event.altKey && /^Digit[1-3]$/.test(event.code)) {
        event.preventDefault();
        tabState[1](TABS[Number(event.code.slice(5)) - 1]);
      } else if (event.key === "Escape" && query) {
        event.preventDefault();
        event.stopImmediatePropagation();
        queryState[1]("");
      } else if (event.key === "Escape" && inSearch) {
        // TextInput stops keydown from bubbling, so hand Esc over to the page's own handler.
        event.preventDefault();
        event.stopImmediatePropagation();
        inputRef.current.blur();
        window.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true
        }));
      } else if ((event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "PageDown" || event.key === "PageUp") && (inSearch || !typing)) {
        event.preventDefault();
        var step = event.key.startsWith("Page") ? 10 : 1;
        var index = highlightedRow ? visible.indexOf(highlightedRow) : -1;
        var next = visible[Math.min(visible.length - 1, Math.max(0, index + (event.key === "ArrowDown" || event.key === "PageDown" ? step : -step)))];
        if (next) {
          highlightState[1](next.id);
          document.getElementById(`device-row-${next.id}`)?.scrollIntoView({
            block: "nearest"
          });
        }
      } else if (event.key === "Enter" && (inSearch || !typing)) {
        event.preventDefault();
        if (!event.repeat && highlightedRow) {
          openDetails(highlightedRow);
        }
      } else if (!typing && /^[\p{L}\p{N}]$/u.test(event.key) && !event.ctrlKey && !event.metaKey) {
        focusSearch();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return function () {
      return window.removeEventListener("keydown", onKeyDown, true);
    };
  });
  var chip = function (key, label, active, onPress) {
    return <module63.PressableOpacity key={key} accessibilityState={{
      checked: active
    }} onPress={onPress}><View style={[styles.chip, active && styles.chipOn]}><module28.Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</module28.Text></View></module63.PressableOpacity>;
  };
  var headerCell = function (column, last) {
    var sort = sortState[0];
    return <div key={column} style={Object.assign(cellStyle(column, last), {
      alignSelf: "stretch",
      alignItems: "center"
    })}><module63.PressableOpacity style={styles.headerPress} onPress={function () {
        return sortState[1]({
          column: column,
          descending: sort.column === column && !sort.descending
        });
      }}><module28.Text style={styles.headerCell} numberOfLines={1}>{t(`device_table.column_${column}`)}{sort.column === column ? sort.descending ? " ▼" : " ▲" : ""}</module28.Text></module63.PressableOpacity><div role="separator" aria-orientation="vertical" style={RESIZE_HANDLE} onPointerDown={function (event) {
        return startResize(event, column);
      }} onDoubleClick={function () {
        return storeWidth(column, null);
      }} /></div>;
  };
  var toggleType = function (id) {
    var active = selectedTypes.filter(function (type) {
      return tabTypes.includes(type);
    });
    filterState[1](Object.assign({}, filters, {
      types: active.includes(id) ? active.filter(function (type) {
        return type !== id;
      }) : active.concat([id])
    }));
  };
  var activeTypes = selectedTypes.filter(function (type) {
    return tabTypes.includes(type);
  });
  return <module32.Page isModal={true} modalMaxWidth="100%" title={params?.name ?? t("all")}><View style={styles.bar}>{TABS.map(function (name) {
        return chip(name, `${t(`device_table.tab_${name}`)} ${scoped.filter(function (row) {
          return inTab(row, name);
        }).length}`, tab === name, function () {
          return tabState[1](name);
        });
      })}<View style={{
        width: 16
      }} />{["errors", "violated", "tampered", "blocked"].map(function (name) {
        return chip(name, t(`device_table.filter_${name}`), !!filters[name], function () {
          return filterState[1](Object.assign({}, filters, {
            [name]: !filters[name]
          }));
        });
      })}<select aria-label={t("device_table.column_room")} value={roomState[0]} style={{
        height: 30,
        fontSize: 13,
        borderRadius: 6
      }} onChange={function (event) {
        return roomState[1](event.target.value);
      }}><option value="">{t("device_table.all_rooms")}</option>{rooms.map(function (room) {
          return <option key={room} value={room}>{room}</option>;
        })}</select><View style={{
        marginLeft: "auto",
        paddingLeft: 12
      }}>{props.toggle}</View></View>{typeOptions.length > 0 && <View style={styles.bar}>{chip("all-types", t("device_table.filter_all_types"), activeTypes.length === 0, function () {
          return filterState[1](Object.assign({}, filters, {
            types: []
          }));
        })}{typeOptions.map(function (option) {
          return chip(`type-${option.id}`, `${option.label} ${option.count}`, activeTypes.includes(option.id), function () {
            return toggleType(option.id);
          });
        })}</View>}<View style={styles.searchBox}><TextInput ref={inputRef} style={styles.search} value={query} placeholder={t("device_table.search")} accessibilityLabel={t("device_table.search")} onChangeText={function (text) {
          highlightState[1](null);
          queryState[1](text);
        }} />{!!query && <module63.PressableOpacity style={styles.searchClear} accessibilityLabel="×" onPress={function () {
            highlightState[1](null);
            queryState[1]("");
            focusSearch();
          }}><module28.Text style={styles.searchClearText}>×</module28.Text></module63.PressableOpacity>}</View><View style={styles.table}><div style={Object.assign({
        display: "flex",
        flexDirection: "column",
        width: "max-content",
        minWidth: "100%"
      }, widthVariables)}><View style={[styles.row, styles.header]}>{columns.map(function (column, index) {
          return headerCell(column, index === columns.length - 1);
        })}</View>{visible.length === 0 && <module28.Text style={styles.empty}>{t("device_table.no_results")}</module28.Text>}{visible.map(function (row) {
        return <Row key={row.id} row={row} columns={columns} highlighted={row === highlightedRow} onOpen={openDetails} />;
      })}</div></View></module32.Page>;
};
