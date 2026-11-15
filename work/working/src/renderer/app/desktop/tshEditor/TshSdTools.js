// microSD tools of the TSH screens editor (PROJEKT-TSH-EDYTOR.md "Karta microSD", PROJEKT-TSH.md 2.5): the "Karta SD"
// window with the slideshow (TSH TFormSD: pictures scaled to the keypad and written as photo/imgN.jpg) and the
// "Kadrowanie" crop window of a custom screen background (TSH TFORMPICT: map/mapN.jpg). Files go only to a folder
// the user picks; copying it to the card is the user's job, as TSH warns. Nothing is sent through the hub.
// Session data lives in the route: { folder, slides: [{ key, name, url, bytes }], backgrounds: { name: { url, bytes } } }.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshCropDialog = exports.TshSdWindow = exports.writeCardFile = exports.chooseCardFolder = undefined;
var react = require("../../../lib/react/react.reexport.js");
var module28 = require("../../misc/module_28.js");
var GetHexColorTransparent = require("../../logic/GetHexColorTransparent.js");
var Logger = require("../../services/Logger.js").default;
var TshSdCard = require("./tshSdCard.js");
var TshImage = require("./tshImage.js");
var C = require("./TshFormControls.js");
var Color = GetHexColorTransparent.Color;
// Shown size of the picture in the crop window, CSS px.
var CROP_VIEW = {
  width: 760,
  height: 460
};
// Width of a slideshow thumbnail, CSS px.
var THUMB_WIDTH = 176;
var styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  dialog: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    backgroundColor: Color.white ?? "#ffffff",
    borderRadius: 10,
    padding: 16,
    maxWidth: "calc(100vw - 48px)",
    maxHeight: "calc(100vh - 48px)",
    overflowY: "auto",
    boxSizing: "border-box",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Color.secondary900,
    marginBottom: 8
  },
  note: {
    fontSize: 12,
    color: Color.secondary700,
    marginBottom: 8
  },
  warning: {
    fontSize: 12,
    color: Color.warning700 ?? Color.secondary900,
    marginBottom: 8
  },
  buttons: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 8
  },
  thumbs: {
    alignSelf: "stretch",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 120,
    maxHeight: 420,
    overflowY: "auto",
    padding: 8,
    border: `1px solid ${Color.secondary300}`,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: "#f7f7f7"
  },
  thumb: {
    width: THUMB_WIDTH,
    padding: 4,
    borderRadius: 4,
    border: "2px solid transparent",
    cursor: "pointer",
    fontSize: 11,
    color: Color.secondary900,
    background: "none",
    textAlign: "left"
  },
  thumbSelected: {
    borderColor: Color.primary500,
    backgroundColor: Color.secondary200
  }
};
// Folder dialog of the main process; the folder becomes writable for this session. Returns a Promise of the path
// or null.
exports.chooseCardFolder = function () {
  return window.electronAPI?.tshSdChooseFolder ? window.electronAPI.tshSdChooseFolder() : Promise.resolve(null);
};
// Writes one card picture. Returns a Promise of the written path; rejects with the main process error.
var writeCardFile = exports.writeCardFile = async function (folder, subdir, name, bytes) {
  var r = await window.electronAPI.tshSdWrite(folder, subdir, name, bytes);
  if (!r || !r.success) {
    throw new Error(r?.error ?? "write failed");
  }
  return r.filePath;
};
// Writes the slideshow (photo/) and the backgrounds of this session (map/) to the folder. Old img*.jpg files are
// removed when the user agrees (TSH asks the same); otherwise new pictures take the next free numbers, as in TSH.
// Map files of earlier sessions are kept: the editor has only the pictures cut out in this session.
// askDelete(count) answers the question about old pictures (Promise of boolean). Returns a Promise of the number of
// files written.
var saveToCard = async function (folder, sd, askDelete) {
  var listed = await window.electronAPI.tshSdList(folder, TshSdCard.SD_DIR.photo);
  if (!listed.success) {
    throw new Error(listed.error);
  }
  var existing = listed.names;
  if (existing.length && sd.slides.length && (await askDelete(existing.length))) {
    for (var old of existing) {
      var removed = await window.electronAPI.tshSdRemove(folder, TshSdCard.SD_DIR.photo, old);
      if (!removed.success) {
        throw new Error(removed.error);
      }
    }
    existing = [];
  }
  var names = TshSdCard.photoNames(existing, sd.slides.length);
  for (var i = 0; i < sd.slides.length; i++) {
    await writeCardFile(folder, TshSdCard.SD_DIR.photo, names[i], sd.slides[i].bytes);
  }
  for (var name of Object.keys(sd.backgrounds)) {
    await writeCardFile(folder, TshSdCard.SD_DIR.map, name, sd.backgrounds[name].bytes);
  }
  return sd.slides.length + Object.keys(sd.backgrounds).length;
};
// The "Karta SD" window. Props: t, width, height (keypad px), sd, onChange(sd or updater function), onClose.
// Returns the element.
exports.TshSdWindow = function (props) {
  var t = props.t;
  var sd = props.sd;
  var selected = (0, react.useState)(null);
  var busy = (0, react.useState)(false);
  // Question about old pictures in photo/ ({ count, answer(boolean) }) and the result line of the last save.
  var question = (0, react.useState)(null);
  var status = (0, react.useState)(null);
  var index = sd.slides.findIndex(function (s) {
    return s.key === selected[0];
  });
  var setSlides = function (slides) {
    return props.onChange(Object.assign({}, sd, {
      slides: slides
    }));
  };
  // Adds pictures; the window is busy until they are decoded, and the list is extended from the current session
  // state (functional update), not from the props of the click.
  var add = async function () {
    busy[1](true);
    var added = [];
    try {
      await addFiles(await TshImage.pickImageFiles(true), added);
    } finally {
      busy[1](false);
    }
    if (added.length) {
      props.onChange(function (prev) {
        return Object.assign({}, prev, {
          slides: prev.slides.concat(added)
        });
      });
    }
  };
  // Decodes the files into keypad-size JPEG slides pushed to added; a file that fails is reported. Returns a Promise.
  var addFiles = async function (files, added) {
    for (var file of files) {
      try {
        var bitmap = await TshImage.decodeImage(file);
        var jpeg = await TshImage.canvasToJpeg(TshImage.renderSlide(bitmap, props.width, props.height));
        bitmap.close?.();
        added.push({
          key: `${Date.now()}-${Math.random()}`,
          name: file.name,
          url: URL.createObjectURL(jpeg.blob),
          bytes: jpeg.bytes
        });
      } catch (error) {
        Logger.error("TSH slideshow picture not read:", error.message);
        status[1]({
          ok: false,
          text: t("tsh_editor.sd.decode_failed", {
            name: file.name
          })
        });
      }
    }
  };
  var removeAt = function (keys) {
    sd.slides.filter(function (s) {
      return keys.indexOf(s.key) >= 0;
    }).forEach(function (s) {
      return URL.revokeObjectURL(s.url);
    });
    setSlides(sd.slides.filter(function (s) {
      return keys.indexOf(s.key) < 0;
    }));
    selected[1](null);
  };
  var move = function (delta) {
    var to = index + delta;
    if (index < 0 || to < 0 || to >= sd.slides.length) {
      return;
    }
    var slides = sd.slides.slice();
    var item = slides.splice(index, 1)[0];
    slides.splice(to, 0, item);
    setSlides(slides);
  };
  var chooseFolder = async function () {
    var folder = await exports.chooseCardFolder();
    if (folder) {
      props.onChange(function (prev) {
        return Object.assign({}, prev, {
          folder: folder
        });
      });
    }
    return folder;
  };
  var save = async function () {
    var folder = sd.folder ?? (await chooseFolder());
    if (!folder) {
      return;
    }
    busy[1](true);
    status[1](null);
    try {
      var count = await saveToCard(folder, sd, function (n) {
        return new Promise(function (resolve) {
          question[1]({
            count: n,
            answer: function (yes) {
              question[1](null);
              resolve(yes);
            }
          });
        });
      });
      status[1]({
        ok: true,
        text: t("tsh_editor.sd.saved", {
          folder: folder,
          count: count
        })
      });
    } catch (error) {
      Logger.error("TSH card files not written:", error.message);
      status[1]({
        ok: false,
        text: t("tsh_editor.sd.save_failed", {
          error: error.message
        })
      });
    } finally {
      busy[1](false);
    }
  };
  var backgrounds = Object.keys(sd.backgrounds);
  var thumbHeight = Math.round(THUMB_WIDTH * props.height / props.width);
  return <div style={styles.backdrop} role="dialog" aria-label={t("tsh_editor.sd.title")}><div style={Object.assign({}, styles.dialog, {
        width: 840
      })}><module28.Text style={styles.title}>{`${t("tsh_editor.sd.title")} · ${t("tsh_editor.sd.slideshow")}`}</module28.Text><module28.Text style={styles.warning}>{t("tsh_editor.sd.warning")}</module28.Text><div style={styles.buttons}><C.SmallButton title={t("tsh_editor.sd.add")} disabled={busy[0]} onPress={add} /><C.SmallButton title={t("tsh_editor.sd.remove")} disabled={busy[0] || index < 0} onPress={function () {
            return removeAt([selected[0]]);
          }} /><C.SmallButton title={t("tsh_editor.sd.clear")} disabled={busy[0] || !sd.slides.length} onPress={function () {
            return removeAt(sd.slides.map(function (s) {
              return s.key;
            }));
          }} /><C.SmallButton title={t("tsh_editor.sd.left")} disabled={busy[0] || index <= 0} onPress={function () {
            return move(-1);
          }} /><C.SmallButton title={t("tsh_editor.sd.right")} disabled={busy[0] || index < 0 || index >= sd.slides.length - 1} onPress={function () {
            return move(1);
          }} /><module28.Text style={styles.note}>{t("tsh_editor.sd.count", {
              count: sd.slides.length
            })}</module28.Text></div><div style={styles.thumbs}>{!sd.slides.length && <module28.Text style={styles.note}>{t("tsh_editor.sd.empty")}</module28.Text>}{sd.slides.map(function (s, i) {
            return <button key={s.key} type="button" title={s.name} style={Object.assign({}, styles.thumb, s.key === selected[0] ? styles.thumbSelected : null)} onClick={function () {
                return selected[1](s.key);
              }}><img src={s.url} alt={s.name} width={THUMB_WIDTH - 12} height={thumbHeight} style={{
                  display: "block",
                  objectFit: "contain"
                }} /><div style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>{`${i + 1}. ${s.name}`}</div></button>;
          })}</div>{backgrounds.length > 0 && <module28.Text style={styles.note}>{t("tsh_editor.sd.backgrounds", {
            names: backgrounds.join(", ")
          })}</module28.Text>}<div style={styles.buttons}><module28.Text style={styles.note}>{`${t("tsh_editor.sd.folder")} ${sd.folder ?? t("tsh_editor.sd.folder_none")}`}</module28.Text></div><div style={styles.buttons}><C.SmallButton title={t("tsh_editor.sd.choose_folder")} disabled={busy[0]} onPress={chooseFolder} /><C.SmallButton title={t("tsh_editor.sd.save")} disabled={busy[0] || !sd.slides.length && !backgrounds.length} onPress={save} /><C.SmallButton title={t("tsh_editor.sd.close")} disabled={busy[0]} onPress={props.onClose} /></div>{question[0] && <div style={styles.buttons}><module28.Text style={styles.warning}>{t("tsh_editor.sd.photo_exists", {
            count: question[0].count
          })}</module28.Text><C.SmallButton title={t("tsh_editor.sd.photo_delete")} onPress={function () {
            return question[0].answer(true);
          }} /><C.SmallButton title={t("tsh_editor.sd.photo_keep")} onPress={function () {
            return question[0].answer(false);
          }} /></div>}{status[0] && <module28.Text style={[styles.note, !status[0].ok && {
          color: Color.danger500
        }]}>{status[0].text}</module28.Text>}</div></div>;
};
// The "Kadrowanie" window: the picture with a rectangle of the keypad proportions; dragging inside moves it, the
// bottom-right corner resizes it. Props: t, bitmap, width, height (keypad px), onCancel, onDone(rect in picture px).
// Returns the element.
exports.TshCropDialog = function (props) {
  var t = props.t;
  var bitmap = props.bitmap;
  var scale = Math.min(CROP_VIEW.width / bitmap.width, CROP_VIEW.height / bitmap.height);
  var rect = (0, react.useState)(function () {
    return TshSdCard.cropInit(bitmap.width, bitmap.height, props.width, props.height);
  });
  var cursor = (0, react.useState)("default");
  var canvasRef = (0, react.useRef)(null);
  var dragRef = (0, react.useRef)(null);
  (0, react.useEffect)(function () {
    var canvas = canvasRef.current;
    if (canvas) {
      var ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    }
  }, [bitmap]);
  // Picture point of a pointer event. Returns { x, y }.
  var pointOf = function (event) {
    var box = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) / scale,
      y: (event.clientY - box.top) / scale
    };
  };
  var down = function (event) {
    if (event.button !== 0) {
      return;
    }
    var p = pointOf(event);
    var mode = TshSdCard.cropHit(rect[0], p.x, p.y, scale);
    if (mode) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragRef.current = {
        mode: mode,
        start: p,
        rect: rect[0]
      };
    }
  };
  var moveTo = function (event) {
    var p = pointOf(event);
    var d = dragRef.current;
    if (!d) {
      var hit = TshSdCard.cropHit(rect[0], p.x, p.y, scale);
      cursor[1](hit === "resize" ? "nwse-resize" : hit === "move" ? "move" : "default");
      return;
    }
    var dx = p.x - d.start.x;
    var dy = p.y - d.start.y;
    rect[1](d.mode === "move" ? TshSdCard.cropMove(d.rect, dx, dy, bitmap.width, bitmap.height) :
      TshSdCard.cropResize(d.rect, dx, dy, bitmap.width, bitmap.height, props.width, props.height));
  };
  var up = function () {
    dragRef.current = null;
  };
  var r = rect[0];
  return <div style={styles.backdrop} role="dialog" aria-label={t("tsh_editor.sd.crop_title")}><div style={styles.dialog}><module28.Text style={styles.title}>{t("tsh_editor.sd.crop_title")}</module28.Text><module28.Text style={styles.note}>{t("tsh_editor.sd.crop_hint")}</module28.Text><div data-crop-area="1" onPointerDown={down} onPointerMove={moveTo} onPointerUp={up} onPointerCancel={up} style={{
          position: "relative",
          width: Math.round(bitmap.width * scale),
          height: Math.round(bitmap.height * scale),
          overflow: "hidden",
          cursor: cursor[0],
          userSelect: "none",
          touchAction: "none",
          backgroundColor: "#c0c0c0"
        }}><canvas ref={canvasRef} width={Math.round(bitmap.width * scale)} height={Math.round(bitmap.height * scale)} style={{
            display: "block"
          }} /><div data-crop-rect="1" style={{
            position: "absolute",
            left: r.x * scale,
            top: r.y * scale,
            width: r.width * scale,
            height: r.height * scale,
            boxSizing: "border-box",
            border: "1px dashed #ffffff",
            outline: "1px solid rgba(0, 0, 0, 0.6)",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
            pointerEvents: "none"
          }}><div style={{
              position: "absolute",
              right: -5,
              bottom: -5,
              width: 10,
              height: 10,
              backgroundColor: "#ffffff",
              border: "1px solid #000000"
            }} /></div></div><module28.Text style={styles.note}>{`${r.x}, ${r.y} · ${r.width} × ${r.height} → ${props.width} × ${props.height}`}</module28.Text><div style={styles.buttons}><C.SmallButton title={t("tsh_editor.sd.ok")} onPress={function () {
            return props.onDone(rect[0]);
          }} /><C.SmallButton title={t("cancel")} onPress={props.onCancel} /></div></div></div>;
};
