// Editor model of the TSH screens editor (PROJEKT-TSH-EDYTOR.md, layer 4 without React): loads the TSH input object,
// applies screen and widget operations, validates and builds the output object that KeypadSettingsScreen's YA reads.
// Pure functions on an immutable state; every operation returns a new state or { ok: false, error }.
//
/**
 * @typedef {Object} TshEditorState
 * @property {object} input            the TSH input object (tshSettingsInput.js), never changed
 * @property {"TSH2"|"TSG2"} resolution
 * @property {object} blob             codec model (tshBlob.js); every record also has uid and originId (null = new),
 *                                     which the encoder ignores
 * @property {number[]} originIds     ids of the loaded records after theme and screensaver
 * @property {number} nextUid
 * @property {boolean} changed         an operation changed the blob, or it was created from the fresh template
 */
/** @typedef {{ code: string, record?: number, widget?: number, detail?: string }} TshEditorError */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.describeError = exports.buildOutput = exports.hubScreens = exports.idChanges = exports.fieldBudget = exports.validate =
  exports.screenEntries = exports.findScreen = exports.changeWidgetVariant = exports.setWidgetField =
  exports.updateWidget = exports.moveWidget = exports.reorderWidget = exports.removeWidget = exports.addWidget = exports.setTheme =
  exports.setSaverOption = exports.setScreenImage = exports.setScreenColors = exports.updateScreen = exports.setScreenType =
  exports.setMainScreen = exports.renameScreen = exports.moveScreen = exports.removeScreen = exports.addScreen =
  exports.loadEditor = exports.SAVER_OPTION = exports.ID_RANGE = undefined;
var TshBlob = require("./tshBlob.js");
var TshFormat = require("./tshFormat.js");
var TshWidgetTypes = require("./tshWidgetTypes.js");
var TshTemplates = require("./tshTemplates.js");
// Directory id ranges of new screens: user screens from 0x21, additional screens from 1 (PROJEKT-TSH.md 2.1,
// samples 024-039 and 054). Ruling: TSH renumbering after delete/reorder is not in the samples, so ids stay with
// their screens and a new screen takes the lowest free id of its range.
var ID_RANGE = exports.ID_RANGE = {
  user: {
    first: 0x21,
    last: 0xff
  },
  additional: {
    first: 0x01,
    last: 0x20
  }
};
// Screensaver option bits, byte 18 (2.2).
var SAVER_OPTION = exports.SAVER_OPTION = {
  NO_CLOCK: 0x02,
  NO_SAVER: 0x04
};
// Records before the user screens: theme and screensaver (2.1).
var FIXED_RECORDS = 2;
// Screen types the user can add, in directory order (2.1).
var USER_TYPES = ["user", "additional"];
// Screen type names of the TSH output object by model type (PROJEKT-TSH.md 1, samples 054 and 083).
var OUTPUT_TYPES = {
  theme: "THEME",
  screensaver: "SCREENSAVER",
  user: "USER_SCREEN",
  additional: "ADDITIONAL_SCREEN"
};
// Screen type by byte 17 of a raw record (2.2), for the output list.
var RAW_TYPES = {
  0: "theme",
  1: "screensaver",
  2: "user",
  3: "user",
  4: "additional"
};
// Offset of the screen type byte in a record (2.2).
var TYPE_OFFSET = 17;
// Theme layout bytes 2-5 hold width and height (2.2).
var THEME_SIZE_OFFSET = 2;
// Fixed header bytes before the name and image texts: length, layout, flags, colors, type, saver, name length, id,
// image length (2.2).
var HEADER_FIXED = TshFormat.NAME_LENGTH_OFFSET + 2;
// Builds an error. Returns it.
var fail = function (code, extra) {
  return {
    ok: false,
    error: Object.assign({
      code: code
    }, extra)
  };
};
// Returns a success result with the new state.
var done = function (state, extra) {
  return Object.assign({
    ok: true,
    state: state
  }, extra);
};
// Deep copy of a state (Uint8Array payloads included). Returns the copy.
var cloneState = function (state) {
  return structuredClone(state);
};
// Tells whether a record is a screen the editor understands. Returns a boolean.
var isScreen = function (r) {
  return r.kind === "screen";
};
// Type of a record: the model type, the byte 17 type of a raw record, or null. Returns the type name.
var recordType = function (r, index) {
  if (isScreen(r)) {
    return r.type;
  }
  if (index < FIXED_RECORDS) {
    return index === 0 ? "theme" : "screensaver";
  }
  return r.bytes.length > TYPE_OFFSET && RAW_TYPES[r.bytes[TYPE_OFFSET]] || null;
};
// Index of the record with a uid. Returns the index or -1.
var indexOf = function (state, uid) {
  return state.blob.records.findIndex(function (r) {
    return r.uid === uid;
  });
};
// Finds a screen record by uid. Returns { index, record } or null (raw records are not editable).
var findScreen = exports.findScreen = function (state, uid) {
  var index = indexOf(state, uid);
  var record = index < 0 ? null : state.blob.records[index];
  return record && isScreen(record) ? {
    index: index,
    record: record
  } : null;
};
// Applies fn to a copy of the state's screen with uid; fn returns nothing or an error result. Returns a result.
var editScreen = function (state, uid, fn) {
  var next = cloneState(state);
  var found = findScreen(next, uid);
  if (!found) {
    return fail("NO_SCREEN");
  }
  var r = fn(found.record, next, found.index);
  if (r && r.ok === false) {
    return r;
  }
  next.changed = true;
  return done(next, r);
};
// Theme colors, or null when the theme record is raw. Returns three "rrggbb" strings or null.
var themeColors = function (state) {
  var theme = state.blob.records[0];
  return theme && isScreen(theme) ? theme.colors : null;
};
// Gives the screen new colors and passes them to its widgets that use the theme colors. Returns nothing.
var paintScreen = function (screen, colors) {
  screen.colors = colors.slice();
  screen.widgets.forEach(function (w) {
    if (w.kind === "widget" && w.useTheme) {
      w.colors = colors.slice();
    }
  });
};
// Adds uid and originId to every record and keeps the loaded screen ids (originIds). Returns the state.
var tagRecords = function (state, origin) {
  state.blob.records.forEach(function (r) {
    r.uid = state.nextUid++;
    r.originId = origin ? r.id : null;
  });
  state.originIds = origin ? state.blob.records.slice(FIXED_RECORDS).map(function (r) {
    return r.id;
  }) : [];
  return state;
};
// Names of the theme and screensaver records of a fresh blob. Returns { theme, screensaver }.
var freshNames = function (t) {
  return {
    theme: t("tsh_editor.default.theme_record"),
    screensaver: t("tsh_editor.default.saver_record")
  };
};
// Loads the editor from the TSH input object; t translates default names. Without screens_config_base64 (or with
// an empty one) the blob of a fresh TSH save is created. Returns { ok, state, issues } or { ok: false, error }.
exports.loadEditor = function (input, t) {
  var resolution = TshTemplates.resolutionOf(input?.keypad?.model);
  if (!resolution) {
    return fail("UNSUPPORTED_MODEL", {
      detail: String(input?.keypad?.model)
    });
  }
  var state = {
    input: input,
    resolution: resolution,
    blob: null,
    nextUid: 1,
    changed: false
  };
  if (!input.screens_config_base64) {
    state.blob = TshTemplates.freshBlob(resolution, freshNames(t));
    state.changed = true;
    return done(tagRecords(state, false), {
      issues: []
    });
  }
  var bytes = TshBlob.base64ToBytes(input.screens_config_base64);
  var decoded = bytes ? TshBlob.decodeBlob(bytes) : {
    blob: null,
    issues: [{
      code: "BASE64"
    }]
  };
  if (!decoded.blob) {
    return fail("BLOB_INVALID", {
      detail: decoded.issues.map(function (i) {
        return i.code;
      }).join(", ")
    });
  }
  var r = TshFormat.RESOLUTIONS[resolution];
  if (decoded.blob.width !== r.width || decoded.blob.height !== r.height) {
    return fail("RESOLUTION_MISMATCH", {
      detail: decoded.blob.width + "x" + decoded.blob.height
    });
  }
  state.blob = decoded.blob;
  return done(tagRecords(state, true), {
    issues: decoded.issues
  });
};
// Ids used by the records after theme and screensaver. Returns a Set.
var usedIds = function (state) {
  return new Set(state.blob.records.slice(FIXED_RECORDS).map(function (r) {
    return r.id;
  }));
};
// Lowest free id of a screen type's range. Returns the id or null.
var freeId = function (state, type) {
  var used = usedIds(state);
  for (var id = ID_RANGE[type].first; id <= ID_RANGE[type].last; id++) {
    if (!used.has(id)) {
      return id;
    }
  }
  return null;
};
// Count of records of a type. Returns the number.
var countType = function (state, type) {
  return state.blob.records.filter(function (r, i) {
    return recordType(r, i) === type;
  }).length;
};
// Index where a new record of the type goes: after the last record of its type or of the types before it.
// Returns the index.
var insertIndex = function (records, type) {
  var rank = USER_TYPES.indexOf(type);
  var at = FIXED_RECORDS;
  records.forEach(function (r, i) {
    var t = recordType(r, i);
    if (i >= FIXED_RECORDS && USER_TYPES.indexOf(t) <= rank) {
      at = i + 1;
    }
  });
  return at;
};
// Checks that one more record of the type fits. Returns an error result or null.
var checkRoom = function (state, type) {
  if (type === "user" && countType(state, "user") >= TshFormat.MAX_USER_SCREENS) {
    return fail("TOO_MANY_USER_SCREENS");
  }
  if (state.blob.records.length >= TshFormat.MAX_RECORDS) {
    return fail("TOO_MANY_RECORDS");
  }
  return freeId(state, type) === null ? fail("NO_FREE_ID") : null;
};
// Tells whether a user screen is marked main. Returns a boolean.
var hasMain = function (records) {
  return records.some(function (r) {
    return isScreen(r) && r.type === "user" && r.main;
  });
};
// Marks the first user screen main when user screens exist but none is main. Called only when the operation took the
// main mark away or made the first user screen; a loaded layout without a main screen stays so (TSH saved such).
// Returns nothing.
var ensureMain = function (records) {
  var first = records.find(function (r) {
    return isScreen(r) && r.type === "user";
  });
  if (first && !hasMain(records)) {
    first.main = true;
  }
};
// Adds a user or additional screen at the end of its group, with the theme colors and the default name with the
// lowest free number.
// The first user screen of a layout without user screens becomes the main screen.
// Returns { ok, state, uid } or { ok: false, error }.
exports.addScreen = function (state, type, t) {
  if (USER_TYPES.indexOf(type) < 0) {
    return fail("SCREEN_TYPE");
  }
  var full = checkRoom(state, type);
  if (full) {
    return full;
  }
  var next = cloneState(state);
  var records = next.blob.records;
  var colors = themeColors(next) ?? TshTemplates.FRESH_THEME.colors;
  var key = type === "user" ? "tsh_editor.default.user_screen" : "tsh_editor.default.additional_screen";
  var n = 1;
  var names = new Set(records.map(function (r) {
    return r.name;
  }));
  while (names.has(t(key, {
    n: n
  }))) {
    n++;
  }
  var record = TshTemplates.newScreen(type, freeId(next, type), t(key, {
    n: n
  }), colors);
  record.uid = next.nextUid++;
  record.originId = null;
  var firstUser = type === "user" && countType(state, "user") === 0;
  records.splice(insertIndex(records, type), 0, record);
  if (firstUser) {
    ensureMain(records);
  }
  next.changed = true;
  return done(next, {
    uid: record.uid
  });
};
// Removes a user or additional screen (raw ones too); when it was the main screen, the main mark moves to the first
// user screen. Returns { ok, state } or { ok: false, error }.
exports.removeScreen = function (state, uid) {
  var index = indexOf(state, uid);
  if (index < FIXED_RECORDS) {
    return fail("NO_SCREEN");
  }
  var next = cloneState(state);
  var removed = next.blob.records.splice(index, 1)[0];
  if (isScreen(removed) && removed.type === "user" && removed.main) {
    ensureMain(next.blob.records);
  }
  next.changed = true;
  return done(next);
};
// Moves a screen by delta places within the screens of its type. Returns { ok, state } or { ok: false, error }.
exports.moveScreen = function (state, uid, delta) {
  var index = indexOf(state, uid);
  if (index < FIXED_RECORDS) {
    return fail("NO_SCREEN");
  }
  var records = state.blob.records;
  var type = recordType(records[index], index);
  var target = index + delta;
  if (target < FIXED_RECORDS || target >= records.length || recordType(records[target], target) !== type) {
    return fail("MOVE_RANGE");
  }
  var next = cloneState(state);
  var moved = next.blob.records.splice(index, 1)[0];
  next.blob.records.splice(target, 0, moved);
  next.changed = true;
  return done(next);
};
// Renames a screen. Returns { ok, state } or { ok: false, error }.
exports.renameScreen = function (state, uid, name) {
  return editScreen(state, uid, function (screen) {
    screen.name = String(name);
  });
};
// Makes a user screen the only main screen, or with on false takes its main mark away (no main screen is allowed
// with a warning, as TSH saved it). Returns { ok, state } or { ok: false, error }.
exports.setMainScreen = function (state, uid, on) {
  return editScreen(state, uid, function (screen, next) {
    if (screen.type !== "user") {
      return fail("NOT_USER_SCREEN");
    }
    if (on === false) {
      screen.main = false;
      return;
    }
    next.blob.records.forEach(function (r) {
      if (isScreen(r) && r.type === "user") {
        r.main = r === screen;
      }
    });
  });
};
// Switches a screen between user and additional: it gets the lowest free id of the new range and goes to the end
// of its new group. A main screen switched away passes the mark to the first user screen, and a screen switched in as
// the only user screen becomes main. Returns { ok, state } or { ok: false, error }.
exports.setScreenType = function (state, uid, type) {
  var found = findScreen(state, uid);
  if (!found || USER_TYPES.indexOf(found.record.type) < 0 || USER_TYPES.indexOf(type) < 0) {
    return fail("NO_SCREEN");
  }
  if (found.record.type === type) {
    return done(state);
  }
  if (type === "user" && countType(state, "user") >= TshFormat.MAX_USER_SCREENS) {
    return fail("TOO_MANY_USER_SCREENS");
  }
  var id = freeId(state, type);
  if (id === null) {
    return fail("NO_FREE_ID");
  }
  var wasMain = found.record.type === "user" && found.record.main;
  var firstUser = type === "user" && countType(state, "user") === 0;
  var next = cloneState(state);
  var records = next.blob.records;
  var screen = records.splice(found.index, 1)[0];
  screen.type = type;
  screen.id = id;
  screen.main = false;
  records.splice(insertIndex(records, type), 0, screen);
  if (wasMain || firstUser) {
    ensureMain(records);
  }
  next.changed = true;
  return done(next);
};
// Changes header flags of a screen: { useTheme, grid }. Turning the theme on takes the theme colors.
// Returns { ok, state } or { ok: false, error }.
exports.updateScreen = function (state, uid, patch) {
  return editScreen(state, uid, function (screen, next) {
    if (patch.grid !== undefined) {
      screen.grid = !!patch.grid;
    }
    if (patch.useTheme !== undefined) {
      screen.useTheme = !!patch.useTheme;
      var colors = themeColors(next);
      if (screen.useTheme && colors && screen.type !== "theme") {
        paintScreen(screen, colors);
      }
    }
  });
};
// Sets the three colors of a screen that does not use the theme; its theme-colored widgets follow.
// Returns { ok, state } or { ok: false, error }.
exports.setScreenColors = function (state, uid, colors) {
  return editScreen(state, uid, function (screen) {
    if (screen.useTheme || screen.type === "theme") {
      return fail("USES_THEME");
    }
    paintScreen(screen, colors);
  });
};
// Sets the image field of a user or additional screen that does not use the theme: "" (no picture), a built-in
// "int://<name>.jpg" or a card file name such as "map2.jpg" (tshSdCard.js). The size limits are checked by validate.
// Returns { ok, state } or { ok: false, error }.
exports.setScreenImage = function (state, uid, image) {
  return editScreen(state, uid, function (screen) {
    if (screen.type !== "user" && screen.type !== "additional") {
      return fail("SCREEN_TYPE");
    }
    if (screen.useTheme) {
      return fail("USES_THEME");
    }
    screen.image = String(image);
  });
};
// Sets or clears one screensaver option bit (SAVER_OPTION). Returns { ok, state } or { ok: false, error }.
exports.setSaverOption = function (state, bit, on) {
  var saver = state.blob.records[1];
  return saver && isScreen(saver) ? editScreen(state, saver.uid, function (screen) {
    screen.saverOptions = on ? screen.saverOptions | bit : screen.saverOptions & ~bit;
  }) : fail("NO_SCREEN");
};
// Applies a theme of themes.json (index = position in the list, 0 = Abstract): theme id 256 - (index + 1), colors,
// built-in image, and the colors of every screen and widget that uses the theme (samples 002, 023, 064-066).
// Returns { ok, state } or { ok: false, error }.
exports.setTheme = function (state, theme, index) {
  var record = state.blob.records[0];
  if (!record || !isScreen(record)) {
    return fail("NO_SCREEN");
  }
  var c = theme.colors;
  var colors = [c.cl1, c.cl2, c.cl3].map(function (v) {
    return String(v).replace(/^#/, "").toLowerCase();
  });
  return editScreen(state, record.uid, function (screen, next) {
    screen.id = 0xff - index;
    screen.colors = colors;
    screen.image = theme.backgroundFile ? "int://" + theme.name + ".jpg" : "";
    next.blob.records.slice(1).forEach(function (r) {
      if (isScreen(r) && r.useTheme) {
        paintScreen(r, colors);
      }
    });
  });
};
// Applies fn to a copy of widget index of screen uid; only typed widgets are editable. Returns a result.
var editWidget = function (state, uid, index, fn) {
  return editScreen(state, uid, function (screen) {
    var w = screen.widgets[index];
    if (!w || w.kind !== "widget" || w.data === null) {
      return fail("WIDGET_NOT_EDITABLE");
    }
    return fn(w, screen);
  });
};
// Adds a widget of a table type at the TSH default position. Returns { ok, state, index } or { ok: false, error }.
exports.addWidget = function (state, uid, type, t) {
  var def = TshWidgetTypes.widgetTypeDef(type);
  if (!def || !def.addable) {
    return fail("WIDGET_TYPE");
  }
  var index;
  var r = editScreen(state, uid, function (screen) {
    screen.widgets.push(TshTemplates.newWidget(type, screen, t));
    index = screen.widgets.length - 1;
  });
  return r.ok ? done(r.state, {
    index: index
  }) : r;
};
// Removes a widget (unsupported ones too). Returns { ok, state } or { ok: false, error }.
exports.removeWidget = function (state, uid, index) {
  return editScreen(state, uid, function (screen) {
    if (!screen.widgets[index]) {
      return fail("NO_WIDGET");
    }
    screen.widgets.splice(index, 1);
  });
};
// Moves a widget (unsupported ones too) to place toIndex of its screen's drawing order: 0 is drawn first, under the
// others (TSH stores widgets in drawing order). Returns { ok, state, index } or { ok: false, error }: NO_WIDGET, or
// MOVE_RANGE for the same place or one outside the list.
exports.reorderWidget = function (state, uid, index, toIndex) {
  return editScreen(state, uid, function (screen) {
    if (!screen.widgets[index]) {
      return fail("NO_WIDGET");
    }
    if (toIndex === index || !Number.isInteger(toIndex) || toIndex < 0 || toIndex >= screen.widgets.length) {
      return fail("MOVE_RANGE");
    }
    screen.widgets.splice(toIndex, 0, screen.widgets.splice(index, 1)[0]);
    return {
      index: toIndex
    };
  });
};
// Moves a widget to keypad pixel x, y, kept inside the screen. Returns { ok, state } or { ok: false, error }.
exports.moveWidget = function (state, uid, index, x, y) {
  var width = state.blob.width;
  var height = state.blob.height;
  return editWidget(state, uid, index, function (w) {
    w.x = Math.min(Math.max(Math.round(x), 0), width - 1);
    w.y = Math.min(Math.max(Math.round(y), 0), height - 1);
  });
};
// Changes widget fields outside the payload: { size, center, useTheme, colors }. Turning the theme colors on copies
// the screen colors. Returns { ok, state } or { ok: false, error }.
exports.updateWidget = function (state, uid, index, patch) {
  return editWidget(state, uid, index, function (w, screen) {
    if (patch.size !== undefined) {
      w.size = patch.size;
    }
    if (patch.center !== undefined) {
      w.center = !!patch.center;
    }
    if (patch.useTheme !== undefined) {
      w.useTheme = !!patch.useTheme;
      if (w.useTheme) {
        w.colors = screen.colors.slice();
      }
    }
    if (patch.colors !== undefined) {
      if (w.useTheme) {
        return fail("USES_THEME");
      }
      w.colors = patch.colors.slice();
    }
  });
};
// Sets one payload field (TshFieldDef path). Returns { ok, state } or { ok: false, error }.
exports.setWidgetField = function (state, uid, index, path, value) {
  return editWidget(state, uid, index, function (w) {
    w.data = TshWidgetTypes.setField(w.data, path, value);
  });
};
// Switches a widget to another variant of its group (TSH "Typ"): new type and defaults, same device.
// Returns { ok, state } or { ok: false, error }.
exports.changeWidgetVariant = function (state, uid, index, type, t) {
  return editWidget(state, uid, index, function (w) {
    var allowed = TshWidgetTypes.widgetVariants(w.type).some(function (d) {
      return d.type === type && d.addable;
    });
    if (!allowed) {
      return fail("WIDGET_TYPE");
    }
    var data = TshWidgetTypes.widgetTypeDef(type).defaults(t);
    data.devIndex = w.data.devIndex;
    w.type = type;
    w.data = data;
    w.payload = new Uint8Array();
  });
};
// Screen list of the editor, one entry per record. Returns [{ uid, index, id, type, name, main, raw, widgets }];
// widgets is null for a raw record (it may hold widgets the codec did not decode).
exports.screenEntries = function (state) {
  return state.blob.records.map(function (r, index) {
    return {
      uid: r.uid,
      index: index,
      id: r.id,
      type: recordType(r, index),
      name: isScreen(r) ? r.name : null,
      main: isScreen(r) && r.main,
      raw: !isScreen(r),
      widgets: isScreen(r) ? r.widgets.length : null
    };
  });
};
// Editor rules the codec does not check: at most one main screen, unique screen ids, the size of a raw theme record,
// link targets. Returns errors.
var editorErrors = function (state) {
  var errors = [];
  var records = state.blob.records;
  var users = records.filter(function (r) {
    return isScreen(r) && r.type === "user";
  });
  var mains = users.filter(function (r) {
    return r.main;
  }).length;
  if (mains > 1) {
    errors.push({
      code: "MAIN_SCREEN_COUNT"
    });
  }
  var seen = new Set();
  records.forEach(function (r, i) {
    if (i >= FIXED_RECORDS) {
      if (seen.has(r.id)) {
        errors.push({
          code: "DUPLICATE_ID",
          record: i
        });
      }
      seen.add(r.id);
    }
  });
  var theme = records[0];
  if (theme && !isScreen(theme)) {
    var res = TshFormat.RESOLUTIONS[state.resolution];
    var b = theme.bytes;
    var o = THEME_SIZE_OFFSET;
    if (b.length < o + 4 || ((b[o] << 8) | b[o + 1]) !== res.width || ((b[o + 2] << 8) | b[o + 3]) !== res.height) {
      errors.push({
        code: "THEME_RESOLUTION",
        record: 0
      });
    }
  }
  var targets = new Set(records.filter(function (r, i) {
    return recordType(r, i) === "additional";
  }).map(function (r) {
    return r.id;
  }));
  records.forEach(function (r, i) {
    (isScreen(r) ? r.widgets : []).forEach(function (w, k) {
      var target = w.kind === "widget" && w.type === TshFormat.WIDGET_TYPE.LINK && w.data ? w.data.target : null;
      if (target !== null && target !== TshWidgetTypes.LINK_BACK && !targets.has(target)) {
        errors.push({
          code: "LINK_TARGET",
          record: i,
          widget: k
        });
      }
    });
  });
  return errors;
};
// Editor notes that do not block Save: user screens without a main screen. Ruling: TSH Soft saved such blobs (samples
// 004-043), so only more than one main screen is an error. Returns warnings ({ code }).
var editorWarnings = function (state) {
  var users = state.blob.records.filter(function (r) {
    return isScreen(r) && r.type === "user";
  });
  return users.length && !users.some(function (r) {
    return r.main;
  }) ? [{
    code: "NO_MAIN_SCREEN"
  }] : [];
};
// Validates the state and encodes the blob. Returns { errors, warnings, bytes, size, limit }: bytes and size are null
// when there are errors; warnings never block Save; limit is the largest end offset of the last record (u16).
var validate = exports.validate = function (state) {
  var errors = editorErrors(state);
  var encoded = TshBlob.encodeBlob(state.blob);
  if (!encoded.ok) {
    errors = errors.concat(encoded.errors);
  }
  var ok = !errors.length;
  return {
    errors: errors,
    warnings: editorWarnings(state),
    bytes: ok ? encoded.bytes : null,
    size: ok ? encoded.bytes.length : null,
    limit: TshBlob.MAX_BLOB_SIZE
  };
};
// Byte use of a text field against its limit: a widget text field (index and path) or the screen name (index null).
// Returns { used, max } in UTF-8 bytes, or null when the field is not a text of an editable widget or screen.
exports.fieldBudget = function (state, uid, index, path) {
  var found = findScreen(state, uid);
  if (!found) {
    return null;
  }
  var screen = found.record;
  if (index === null) {
    var image = screen.type === "theme" ? TshBlob.THEME_IMAGE_SIZE : TshBlob.encodeUtf8(screen.image).length;
    return {
      used: TshBlob.encodeUtf8(screen.name).length,
      max: Math.min(TshFormat.MAX_FIELD_LENGTH, TshFormat.MAX_FIELD_LENGTH - HEADER_FIXED - image)
    };
  }
  var w = screen.widgets[index];
  var value = w && w.kind === "widget" && w.data ? TshWidgetTypes.getField(w.data, path) : undefined;
  if (typeof value !== "string") {
    return null;
  }
  var empty = TshBlob.encodeWidgetData(w.type, TshWidgetTypes.setField(w.data, path, ""));
  if (!empty.ok) {
    return null;
  }
  var room = TshBlob.MAX_WIDGET_LENGTH - (TshBlob.WIDGET_FIXED - 1) - empty.bytes.length;
  return {
    used: TshBlob.encodeUtf8(value).length,
    max: Math.min(TshFormat.MAX_FIELD_LENGTH, room)
  };
};
// Screens whose user permissions would move or vanish on Save. YA carries users, availableAfterSignIn and
// defaultScreen from the hub screen list (input.screens) by guid === screen_id, so the check is against that list, not
// against the loaded blob (after "Utwórz nowe ekrany" or with empty hub data nothing was loaded):
// "changed": a loaded screen got a new id, and the hub has its old or its new id;
// "reused": a screen that was not loaded takes the id of a hub screen (hubName) and with it its permissions;
// "removed": a hub user or additional screen the editor never showed disappears (deleted screens were shown).
// Without input.screens YA carries nothing, so nothing is reported. Returns [{ uid, name, kind, oldId, newId,
// hubName }] (uid and name null for "removed").
exports.idChanges = function (state) {
  var records = state.blob.records;
  var hub = new Map();
  (Array.isArray(state.input?.screens) ? state.input.screens : []).forEach(function (h) {
    hub.set(String(h.screen_id), h);
  });
  var list = [];
  var outputIds = new Set();
  records.forEach(function (r, i) {
    if (i < FIXED_RECORDS) {
      return;
    }
    outputIds.add(String(r.id));
    var name = isScreen(r) ? r.name : null;
    var taken = hub.get(String(r.id));
    if (r.originId !== null && r.originId !== r.id && (taken || hub.has(String(r.originId)))) {
      list.push({
        uid: r.uid,
        name: name,
        kind: "changed",
        oldId: r.originId,
        newId: r.id,
        hubName: taken ? taken.screen_name : null
      });
    } else if (r.originId === null && taken) {
      list.push({
        uid: r.uid,
        name: name,
        kind: "reused",
        oldId: null,
        newId: r.id,
        hubName: taken.screen_name
      });
    }
  });
  var shown = new Set(state.originIds.map(String));
  hub.forEach(function (h, id) {
    if ((h.screen_type === OUTPUT_TYPES.user || h.screen_type === OUTPUT_TYPES.additional) && !outputIds.has(id) &&
      !shown.has(id)) {
      list.push({
        uid: null,
        name: null,
        kind: "removed",
        oldId: h.screen_id,
        newId: null,
        hubName: h.screen_name
      });
    }
  });
  return list;
};
// User and additional screens of the hub list of a TSH input object (input.screens), which "Utwórz nowe ekrany"
// replaces. Returns [{ id, name }].
exports.hubScreens = function (input) {
  return (Array.isArray(input?.screens) ? input.screens : []).filter(function (h) {
    return h.screen_type === OUTPUT_TYPES.user || h.screen_type === OUTPUT_TYPES.additional;
  }).map(function (h) {
    return {
      id: h.screen_id,
      name: h.screen_name
    };
  });
};
// Output screens list in directory order (theme and screensaver included, as TSH writes it); a raw record gets an
// empty name and the type from its byte 17. Returns [{ screen_name, screen_type, screen_id, screen_image }].
var outputScreens = function (records) {
  var list = [];
  records.forEach(function (r, i) {
    var type = recordType(r, i);
    if (type) {
      list.push({
        screen_name: isScreen(r) ? r.name : "",
        screen_type: OUTPUT_TYPES[type],
        screen_id: r.id,
        screen_image: ""
      });
    }
  });
  return list;
};
// Builds the output object for YA: the input plus screens and screens_config_base64.
// Returns { ok: true, content } or { ok: false, errors }.
exports.buildOutput = function (state) {
  var v = validate(state);
  if (v.errors.length) {
    return {
      ok: false,
      errors: v.errors
    };
  }
  return {
    ok: true,
    content: Object.assign({}, state.input, {
      screens: outputScreens(state.blob.records),
      screens_config_base64: TshBlob.bytesToBase64(v.bytes)
    })
  };
};
// Codes with their own user message (tsh_editor.error.<code>); the others use tsh_editor.error.OTHER.
var KNOWN_CODES = ["MAIN_SCREEN_COUNT", "NO_MAIN_SCREEN", "DUPLICATE_ID", "THEME_RESOLUTION", "LINK_TARGET",
  "FIELD_RANGE", "TEXT_TOO_LONG", "WIDGET_TOO_LONG", "HEADER_TOO_LONG", "THEME_IMAGE_TOO_LONG", "RECORD_TOO_LARGE",
  "BLOB_TOO_LARGE", "TOO_MANY_RECORDS", "TOO_MANY_USER_SCREENS", "RECORD_ORDER", "THEME_LAYOUT", "NO_FREE_ID",
  "UNSUPPORTED_MODEL", "BLOB_INVALID", "RESOLUTION_MISMATCH"];
// User message of an error: i18n key, parameters and an optional location key (screen, widget number from 1).
// Returns { key, params, at } where at is null, "tsh_editor.error_at_screen" or "tsh_editor.error_at_widget".
exports.describeError = function (error, state) {
  var record = error.record !== undefined && state ? state.blob.records[error.record] : null;
  var screen = record ? isScreen(record) && record.name ? record.name : "#" + (error.record + 1) : null;
  var params = {
    screen: screen,
    widget: error.widget !== undefined ? error.widget + 1 : null,
    detail: error.detail ?? ""
  };
  var at = screen === null ? null : error.widget !== undefined ? "tsh_editor.error_at_widget" :
    "tsh_editor.error_at_screen";
  return {
    key: "tsh_editor.error." + (KNOWN_CODES.indexOf(error.code) >= 0 ? error.code : "OTHER"),
    params: params,
    at: at
  };
};
