// Desktop route of the TSH keypad screens editor (PROJEKT-TSH-EDYTOR.md "Gdzie i jak się otwiera"): a full-width
// modal opened from KeypadSettingsScreen with params { input, onSave }. The shell (TshEditorShell.js) fills the page
// body: the toolbar (TshToolbar.js) on top, the screens and the layers of the shown screen on the left (TshScreenList.js,
// TshLayerList.js), the canvas in the middle, the inspector on the right (TshInspector.js). Save validates, warns about hub screens whose permissions would move, and hands the output object to
// onSave (KeypadSettingsScreen's YA, as the TSH Soft settings file did); nothing is sent to the hub from here. Cancel
// leaves without changes, with a question when there are unsaved ones. "Karta SD" opens the slideshow window and "Z
// pliku…" in the screen panel the crop window (TshSdTools.js); their pictures are kept for this session and written
// only to a folder the user picks. Every change goes through the undo history (tshHistory.js): Ctrl/Cmd+Z undoes,
// Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo, Delete/Backspace removes the selected widget after a question, G toggles the
// editor grid (snapping), Ctrl/Cmd+0, +1, = and - zoom; keys typed in form fields stay with the field. Questions go
// through tshAsk.js: Esc answers them "no" and the editor keys wait until they are answered.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshEditorRoute = undefined;
var View = require("../../../lib/react-native-web/dist/cjs/exports/View/index.js").default;
var react = require("../../../lib/react/react.reexport.js");
var reactI18next = require("../../../lib/react-i18next/react-i18next.js");
var module21 = require("../../misc/module_21.js");
var module28 = require("../../misc/module_28.js");
var module32 = require("../../misc/module_32.js");
var module623 = require("../../misc/module_623.js");
var useScreenRoute = require("../../hooks/useScreenRoute.js");
var usePreventLeave = require("../../hooks/usePreventLeave.js");
var ShowDefaultErrorToast = require("../../logic/ShowDefaultErrorToast.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var Logger = require("../../services/Logger.js").default;
var TshEditorModel = require("./tshEditorModel.js");
var TshHistory = require("./tshHistory.js");
var TshWidgetLabel = require("./tshWidgetLabel.js");
var TshLayerList = require("./TshLayerList.js");
var TshAddWidgetMenu = require("./TshAddWidgetMenu.js");
var TshAsk = require("./tshAsk.js");
var tshAssets = require("./tshAssets.js");
var TshScreenList = require("./TshScreenList.js");
var TshCanvas = require("./TshCanvas.js");
var TshToolbar = require("./TshToolbar.js");
var TshEditorShell = require("./TshEditorShell.js");
var TshZoom = require("./tshZoom.js");
var TshUi = require("./TshUi.js");
var TshInspector = require("./TshInspector.js");
var TshWidgetGroups = require("./tshWidgetGroups.js");
var TshLayout = require("./tshLayout.js");
var TshFormControls = require("./TshFormControls.js");
var TshSdTools = require("./TshSdTools.js");
var TshSdCard = require("./tshSdCard.js");
var TshImage = require("./tshImage.js");
var Color = GetHexColorTransparent.Color;
// Operation errors that need no message: the button had nothing to do (first or last screen of its group).
var SILENT_ERRORS = ["MOVE_RANGE"];
var styles = {
  error: {
    fontSize: 13,
    color: Color.danger500,
    marginBottom: 2
  },
  left: {
    flex: 1,
    minHeight: 0
  },
  screens: {
    flexGrow: 6,
    flexBasis: 0,
    minHeight: 120
  },
  layers: {
    flexGrow: 5,
    flexBasis: 0,
    minHeight: 120,
    borderTopWidth: 1,
    borderTopColor: Color.secondary300
  }
};
// User message of a model error. Returns the text.
var errorText = function (error, state, t) {
  var d = TshEditorModel.describeError(error, state);
  return (d.at ? t(d.at, d.params) : "") + t(d.key, d.params);
};
// Load errors and the option to start from the fresh template. Returns the element.
var LoadError = function (props) {
  var t = props.t;
  return <View><module28.Text style={styles.error}>{errorText(props.error, null, t)}</module28.Text>{props.error.code !== "UNSUPPORTED_MODEL" && <TshFormControls.SmallButton title={t("tsh_editor.start_fresh")} onPress={props.onFresh} />}</View>;
};
// Text of the screen id warning: one line per screen whose permissions move or vanish. Returns the text.
var idWarning = function (changes, t) {
  return t("tsh_editor.id_warning") + "\n" + changes.map(function (c) {
    var name = c.name ?? t("tsh_editor.unsupported");
    if (c.kind === "removed") {
      return t("tsh_editor.id_removed", {
        hub: c.hubName,
        old: c.oldId
      });
    }
    return c.kind === "changed" ? t("tsh_editor.id_changed", {
      name: name,
      old: c.oldId,
      new: c.newId
    }) : t("tsh_editor.id_reused", {
      name: name,
      new: c.newId,
      hub: c.hubName
    });
  }).join("\n");
};
// Question before "Utwórz nowe ekrany": the hub screens that the new ones replace. Returns the text.
var freshWarning = function (input, t) {
  var hub = TshEditorModel.hubScreens(input);
  return t("tsh_editor.fresh_warning") + (hub.length ? "\n" + hub.map(function (h) {
    return t("tsh_editor.fresh_screen", {
      name: h.name,
      id: h.id
    });
  }).join("\n") : "");
};
exports.TshEditorRoute = function () {
  var t = (0, reactI18next.useTranslation)().t;
  var appNavigation = (0, module21.useAppNavigation)();
  var params = (0, useScreenRoute.useScreenRoute)().params ?? {};
  var loaded = (0, react.useMemo)(function () {
    return params.input ? TshEditorModel.loadEditor(params.input, t) : null;
  }, []);
  // Undo history of the editor state (null without a loaded state) and the state it started from: "unsaved changes"
  // means the present differs from it, or it is a fresh template that has not been saved yet.
  var history = (0, react.useState)(loaded && loaded.ok ? TshHistory.createHistory(loaded.state) : null);
  var loadedRef = (0, react.useRef)(loaded && loaded.ok ? loaded.state : null);
  var loadError = (0, react.useState)(loaded && !loaded.ok ? loaded.error : null);
  // Selected screen and widget; the editor opens on the main screen (else the first user screen).
  var selection = (0, react.useState)(function () {
    var records = loaded && loaded.ok ? loaded.state.blob.records : [];
    var users = records.filter(function (r) {
      return r.kind === "screen" && r.type === "user";
    });
    var first = users.find(function (r) {
      return r.main;
    }) ?? users[0] ?? null;
    return {
      uid: first ? first.uid : null,
      widget: null
    };
  });
  // Editor grid toggled with G or the toolbar for a screen ({ uid, on }); other screens start with their saved grid
  // flag.
  var editorGrid = (0, react.useState)({
    uid: null,
    on: false
  });
  // Canvas zoom: "fit" or a level, and the Fit zoom the canvas measured.
  var zoom = (0, react.useState)("fit");
  var fit = (0, react.useState)(1);
  var themes = (0, react.useState)({
    list: [],
    failed: false
  });
  var saved = (0, react.useState)(false);
  // microSD session: picked folder, slideshow pictures and card backgrounds by image name; open windows.
  var sd = (0, react.useState)({
    folder: null,
    slides: [],
    backgrounds: {}
  });
  var sdOpen = (0, react.useState)(false);
  var crop = (0, react.useState)(null);
  var sdRef = (0, react.useRef)(sd[0]);
  sdRef.current = sd[0];
  var state = history[0] ? history[0].present : null;
  // Current state for async handlers that continue after an await (the crop OK).
  var stateRef = (0, react.useRef)(state);
  stateRef.current = state;
  // Latest history and selection for the window key handler.
  var historyRef = (0, react.useRef)(history[0]);
  historyRef.current = history[0];
  var selectionRef = (0, react.useRef)(selection[0]);
  selectionRef.current = selection[0];
  var canvasViewRef = (0, react.useRef)(null);
  // Editor element and its questions (tshAsk.js): Esc answers a question "no" instead of reaching the page.
  var rootRef = (0, react.useRef)(null);
  var asker = (0, react.useMemo)(function () {
    return TshAsk.createAsker({
      confirm: function (title, text, ok, cancel) {
        return (0, module623.confirmDialog)(title, text, ok, cancel);
      },
      hide: function () {
        (0, module623.hideConfirmDialog)();
      },
      target: window,
      inEditor: function (node) {
        return !!rootRef.current && !!node && rootRef.current.contains(node);
      },
      // The app's dialog card carries the accessibility label "<title>. <description>" while it shows a question.
      shows: function (title, text) {
        var label = `${title}. ${text}`;
        return Array.prototype.some.call(document.querySelectorAll("[aria-label]"), function (node) {
          return node.getAttribute("aria-label") === label;
        });
      }
    });
  }, []);
  (0, react.useEffect)(function () {
    return function () {
      asker.dismiss();
    };
  }, []);
  (0, TshUi.useEditorCss)();
  // Frees the picture URLs of the session when the editor closes.
  (0, react.useEffect)(function () {
    return function () {
      var s = sdRef.current;
      s.slides.forEach(function (x) {
        return URL.revokeObjectURL(x.url);
      });
      Object.values(s.backgrounds).forEach(function (x) {
        return URL.revokeObjectURL(x.url);
      });
    };
  }, []);
  var customImages = (0, react.useMemo)(function () {
    var map = {};
    Object.keys(sd[0].backgrounds).forEach(function (name) {
      map[name] = sd[0].backgrounds[name].url;
    });
    return map;
  }, [sd[0].backgrounds]);
  (0, react.useEffect)(function () {
    tshAssets.loadTshThemes().then(function (list) {
      return themes[1]({
        list: list,
        failed: false
      });
    }).catch(function (error) {
      Logger.error("TSH themes not loaded:", error.message);
      themes[1]({
        list: [],
        failed: true
      });
    });
  }, []);
  // Leaves after the render that turned the leave question off.
  (0, react.useEffect)(function () {
    if (saved[0]) {
      appNavigation.goBack();
    }
  }, [saved[0]]);
  // Snapping while dragging follows the editor grid: G toggles it per screen; a screen starts with its "grid on the
  // keypad" flag (rulings: the toggle starts on when that flag is on, and is not saved).
  var shownScreen = state && selection[0].uid !== null ? TshEditorModel.findScreen(state, selection[0].uid) : null;
  var snapEnabled = !!shownScreen && (editorGrid[0].uid === shownScreen.record.uid ? editorGrid[0].on :
    !!shownScreen.record.grid);
  var validation = (0, react.useMemo)(function () {
    return state ? TshEditorModel.validate(state) : null;
  }, [state]);
  (0, usePreventLeave.usePreventLeave)({
    condition: !!state && (state !== loadedRef.current || loadedRef.current.changed) && !saved[0],
    leaveText: t("leave_screen_alert.leave"),
    message: t("leave_screen_alert.unsaved_changes"),
    stayText: t("leave_screen_alert.stay"),
    title: t("leave_screen_alert.leave_screen")
  });
  // Takes the state of a successful operation into the history (key: coalescing key of typing or nudging, else a step
  // of its own), or shows its error.
  var apply = function (result, key) {
    if (result.ok) {
      history[1](function (h) {
        return TshHistory.record(h, result.state, key, Date.now());
      });
    } else if (SILENT_ERRORS.indexOf(result.error.code) < 0) {
      (0, ShowDefaultErrorToast.showToast)({
        type: "error",
        message: errorText(result.error, state, t)
      });
    }
  };
  // Replaces every screen with the fresh template after a question that names the hub screens it replaces; Save
  // then warns again about the permissions that would move (idChanges against input.screens).
  var startFresh = async function () {
    if (!(await asker.ask(t("tsh_editor.fresh_warning_title"), freshWarning(params.input, t), t("tsh_editor.start_fresh"), t("cancel")))) {
      return;
    }
    var r = TshEditorModel.loadEditor(Object.assign({}, params.input, {
      screens_config_base64: undefined
    }), t);
    if (r.ok) {
      loadError[1](null);
      loadedRef.current = r.state;
      history[1](TshHistory.createHistory(r.state));
    }
  };
  var toast = function (type, message) {
    (0, ShowDefaultErrorToast.showToast)({
      type: type,
      message: message
    });
  };
  // "Z pliku…": the microSD warning as in TSH, the file dialog, then the crop window.
  var customBackground = async function (uid) {
    if (!(await asker.ask(t("tsh_editor.sd.bg_warning_title"), t("tsh_editor.sd.bg_warning"), t("tsh_editor.sd.ok"), t("cancel")))) {
      return;
    }
    var files = await TshImage.pickImageFiles(false);
    if (!files.length) {
      return;
    }
    try {
      crop[1]({
        uid: uid,
        bitmap: await TshImage.decodeImage(files[0])
      });
    } catch (error) {
      Logger.error("TSH background picture not read:", error.message);
      toast("error", t("tsh_editor.sd.decode_failed", {
        name: files[0].name
      }));
    }
  };
  // Crop OK: the keypad-size JPEG becomes map<id>.jpg, the screen image field gets that name, and the file is written
  // to the card folder (picked now when there is none yet; otherwise the "Karta SD" window writes it later).
  // The state is read again after the JPEG is encoded and the image set by a functional update, so edits made
  // meanwhile are kept.
  var finishCrop = async function (rect) {
    var c = crop[0];
    crop[1](null);
    if (!TshEditorModel.findScreen(state, c.uid)) {
      return;
    }
    try {
      var jpeg = await TshImage.canvasToJpeg(TshImage.renderCrop(c.bitmap, rect, state.blob.width, state.blob.height));
      c.bitmap.close?.();
      var now = stateRef.current;
      var found = TshEditorModel.findScreen(now, c.uid);
      if (!found) {
        return;
      }
      var used = now.blob.records.filter(function (r) {
        return r.kind === "screen" && r.uid !== c.uid;
      }).map(function (r) {
        return r.image;
      });
      var name = TshSdCard.backgroundName(found.record.id, used);
      var item = {
        url: URL.createObjectURL(jpeg.blob),
        bytes: jpeg.bytes
      };
      sd[1](function (prev) {
        if (prev.backgrounds[name]) {
          URL.revokeObjectURL(prev.backgrounds[name].url);
        }
        var backgrounds = Object.assign({}, prev.backgrounds);
        backgrounds[name] = item;
        return Object.assign({}, prev, {
          backgrounds: backgrounds
        });
      });
      var check = TshEditorModel.setScreenImage(now, c.uid, name);
      if (!check.ok) {
        apply(check);
        return;
      }
      history[1](function (h) {
        var r = TshEditorModel.setScreenImage(h.present, c.uid, name);
        return r.ok ? TshHistory.record(h, r.state, null, Date.now()) : h;
      });
      var folder = sdRef.current.folder ?? (await TshSdTools.chooseCardFolder());
      if (!folder) {
        toast("warning", t("tsh_editor.sd.bg_later"));
        return;
      }
      sd[1](function (prev) {
        return Object.assign({}, prev, {
          folder: folder
        });
      });
      var file = await TshSdTools.writeCardFile(folder, TshSdCard.SD_DIR.map, name, jpeg.bytes);
      toast("success", t("tsh_editor.sd.bg_saved", {
        file: file
      }));
    } catch (error) {
      Logger.error("TSH background not written:", error.message);
      toast("error", t("tsh_editor.sd.save_failed", {
        error: error.message
      }));
    }
  };
  // Undo or redo (step: TshHistory.undo or redo); the selection is kept where it still exists and follows its widget
  // to another index (an undone reorder).
  var stepHistory = function (step) {
    var h = historyRef.current;
    var next = step(h);
    if (next !== h) {
      history[1](next);
      selection[1](TshHistory.clampSelection(next.present, selectionRef.current, h.present));
    }
  };
  // Delete key and the layer menu: removes a widget of the shown screen (the selected one without index) after the
  // question that names it by its label (tshWidgetLabel.js). The widget is removed only from the state the question
  // was asked in: a change meanwhile may have put another widget at that index (review I3).
  var deleteWidget = async function (index) {
    var sel = selectionRef.current;
    var at = index ?? sel.widget;
    var asked = stateRef.current;
    var found = at === null ? null : TshEditorModel.findScreen(asked, sel.uid);
    var w = found ? found.record.widgets[at] : null;
    if (!w) {
      return;
    }
    var label = TshWidgetLabel.widgetLabel(w, asked, t);
    var question = label.named ? t("tsh_editor.remove_widget_question", {
      type: label.subtitle,
      name: label.title
    }) : t("tsh_editor.remove_widget_question_type", {
      type: label.title
    });
    if (!(await asker.ask(t("tsh_editor.remove_widget_title"), question, t("tsh_editor.remove"), t("cancel"))) ||
      stateRef.current !== asked) {
      return;
    }
    var r = TshEditorModel.removeWidget(asked, sel.uid, at);
    apply(r);
    if (r.ok) {
      selection[1]({
        uid: sel.uid,
        widget: null
      });
    }
  };
  // Adds a widget of a type to the shown screen with its box centred on the visible middle of the canvas (one undo
  // step) and selects it; the inspector then shows its Widżet tab.
  var addWidget = function (type) {
    var uid = selectionRef.current.uid;
    var now = stateRef.current;
    var r = TshEditorModel.addWidget(now, uid, type, t);
    if (!r.ok) {
      apply(r);
      return;
    }
    var center = canvasViewRef.current ? canvasViewRef.current.visibleCenter() : {
      x: now.blob.width / 2,
      y: now.blob.height / 2
    };
    var w = TshEditorModel.findScreen(r.state, uid).record.widgets[r.index];
    var l = TshLayout.widgetLayout(w, TshLayout.metricsFor(now.blob.width, now.blob.height), {
      now: new Date(),
      lang: now.input.lang
    });
    var moved = TshEditorModel.moveWidget(r.state, uid, r.index, center.x - l.width / 2 - l.offsetX, center.y - l.height / 2);
    apply(moved.ok ? moved : r);
    selection[1]({
      uid: uid,
      widget: r.index
    });
  };
  // Toggles the editor grid of the shown screen.
  var toggleGrid = function () {
    if (shownScreen) {
      editorGrid[1]({
        uid: shownScreen.record.uid,
        on: !snapEnabled
      });
    }
  };
  var zoomValue = zoom[0] === "fit" ? fit[0] : zoom[0];
  // Window keys of the editor (tshHistory.shortcutFor): ignored in form fields and popups, while a window of the editor
  // or a question is open, during a press or drag on the canvas (its widget index must keep naming its widget,
  // review I3), and when the canvas already handled the key (Tab, arrows, Esc).
  var keyRef = (0, react.useRef)(null);
  keyRef.current = function (event) {
    if (event.defaultPrevented || !historyRef.current || sdOpen[0] || crop[0] || saved[0] || asker.pending() ||
      canvasViewRef.current?.busy?.()) {
      return;
    }
    var action = TshHistory.shortcutFor(event);
    if (action === "undo" || action === "redo") {
      event.preventDefault();
      stepHistory(action === "undo" ? TshHistory.undo : TshHistory.redo);
    } else if (action === "delete" && selectionRef.current.widget !== null) {
      event.preventDefault();
      deleteWidget(null);
    } else if (action === "grid" && shownScreen) {
      event.preventDefault();
      toggleGrid();
    } else if (action === "zoomIn" || action === "zoomOut" || action === "zoomFit" || action === "zoomActual") {
      event.preventDefault();
      zoom[1](action === "zoomFit" ? "fit" : action === "zoomActual" ? 1 : TshZoom.stepZoom(zoomValue, action ===
        "zoomIn" ? 1 : -1));
    }
  };
  (0, react.useEffect)(function () {
    var onKey = function (event) {
      keyRef.current(event);
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  var save = async function () {
    var changes = TshEditorModel.idChanges(state);
    if (changes.length && !(await asker.ask(t("tsh_editor.id_warning_title"), idWarning(changes, t), t("common.save"), t("cancel")))) {
      return;
    }
    var out = TshEditorModel.buildOutput(state);
    if (!out.ok) {
      return;
    }
    params.onSave(out.content);
    (0, ShowDefaultErrorToast.ShowSuccessToast)("tsh_editor.saved_hint");
    saved[1](true);
  };
  var canSave = !saved[0] && !!state && !!validation && !validation.errors.length && typeof params.onSave === "function";
  var issues = loaded && loaded.ok ? loaded.issues.length : 0;
  // Groups of the add-widget menu (toolbar and layers); widgets go only on user and additional screens.
  var addGroups = (0, react.useMemo)(function () {
    return TshWidgetGroups.widgetGroups(t);
  }, [t]);
  var canAdd = !!shownScreen && (shownScreen.record.type === "user" || shownScreen.record.type === "additional");
  var selectWidget = function (index) {
    selection[1]({
      uid: selection[0].uid,
      widget: index
    });
  };
  // Validation errors for the Save badge: a click selects the screen and widget an error names.
  var errors = validation ? validation.errors.map(function (error) {
    var record = error.record === undefined ? null : state.blob.records[error.record];
    return {
      text: errorText(error, state, t),
      onPick: record ? function () {
        selection[1]({
          uid: record.uid,
          widget: error.widget ?? null
        });
      } : null
    };
  }) : [];
  var notes = (issues > 0 ? [t("tsh_editor.issues", {
    count: issues
  })] : []).concat(validation ? validation.warnings.map(function (warning) {
    return errorText(warning, state, t);
  }) : []);
  return <module32.Page isModal={true} modalMaxWidth="100%" title={t("tsh_editor.title")}>{!params.input && <module28.Text style={styles.error}>{t("tsh_editor.no_input")}</module28.Text>}{loadError[0] && <LoadError t={t} error={loadError[0]} onFresh={startFresh} />}{state && <TshEditorShell.TshEditorShell rootRef={rootRef} toolbar={<TshToolbar.TshToolbar t={t} model={`INT-${state.resolution} · ${state.blob.width} × ${state.blob.height}`} canUndo={history[0].past.length > 0} canRedo={history[0].future.length > 0} onUndo={function () {
          return stepHistory(TshHistory.undo);
        }} onRedo={function () {
          return stepHistory(TshHistory.redo);
        }} addMenu={function (compact) {
          return <TshAddWidgetMenu.TshAddWidgetMenu t={t} label={compact ? undefined : t("tsh_editor.widget_button")} groups={addGroups} disabled={!canAdd} onAdd={addWidget} />;
        }} grid={snapEnabled} onGrid={toggleGrid} zoom={zoomValue} zoomMode={zoom[0]} fit={fit[0]} onZoom={zoom[1]} onSd={function () {
          return sdOpen[1](true);
        }} size={validation.size} limit={validation.limit} errors={errors} notes={notes} canSave={canSave} onSave={save} onCancel={function () {
          return appNavigation.goBack();
        }} />} left={function (layout) {
          return <View style={styles.left}><View style={styles.screens}><TshScreenList.TshScreenList t={t} state={state} selectedUid={selection[0].uid} apply={apply} themes={themes[0].list} customImages={customImages} compact={layout.compact} onSelect={function (uid) {
                return selection[1]({
                  uid: uid,
                  widget: null
                });
              }} /></View><View style={styles.layers}><TshLayerList.TshLayerList t={t} state={state} screen={shownScreen ? shownScreen.record : null} selectedWidget={selection[0].widget} onSelectWidget={selectWidget} apply={apply} onDelete={deleteWidget} addMenu={<TshAddWidgetMenu.TshAddWidgetMenu t={t} small={true} align="right" groups={addGroups} onAdd={addWidget} />} /></View></View>;
        }} center={function () {
          return <TshCanvas.TshCanvas state={state} screenUid={selection[0].uid} selectedWidget={selection[0].widget} themes={themes[0].list} snapEnabled={snapEnabled} zoom={zoom[0]} onFit={fit[1]} onZoom={zoom[1]} viewRef={canvasViewRef} onSelectWidget={selectWidget} onMoveWidget={function (index, x, y, key) {
              return apply(TshEditorModel.moveWidget(state, selection[0].uid, index, x, y), key);
            }} customImages={customImages} />;
        }} right={function () {
          return <TshInspector.TshInspector t={t} state={state} screenUid={selection[0].uid} selectedWidget={selection[0].widget} themes={themes[0].list} themesFailed={themes[0].failed} apply={apply} onCustomBackground={customBackground} onDelete={function () {
              return deleteWidget(null);
            }} onClearSelection={function () {
              return selectWidget(null);
            }} />;
        }} />}{state && sdOpen[0] && <TshSdTools.TshSdWindow t={t} width={state.blob.width} height={state.blob.height} sd={sd[0]} onChange={sd[1]} onClose={function () {
        return sdOpen[1](false);
      }} />}{state && crop[0] && <TshSdTools.TshCropDialog t={t} bitmap={crop[0].bitmap} width={state.blob.width} height={state.blob.height} onDone={finishCrop} onCancel={function () {
        crop[0].bitmap.close?.();
        crop[1](null);
      }} />}</module32.Page>;
};
