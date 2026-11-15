// In-page harness of tsh-preview-compare.mjs, bundled by the tool with esbuild (JSX, React Native Web from
// src/renderer/lib) and injected into the renderer page of a built app. It draws one screen record of a TSH input
// with the editor's static screen renderer (TshScreenRender, as the canvas draws it) at a fixed preview scale, on a white layer over the app, with the clock frozen
// at a given time. API: window.__tshCompare.render(input, recordIndex, scale, nowMs) -> Promise<[x, y, w, h]> of the
// keypad frame in CSS pixels, after fonts and pictures are loaded.
var react = require("../src/renderer/lib/react/react.reexport.js");
var AppRegistry = require("../src/renderer/lib/react-native-web/dist/exports/AppRegistry/index.js").default;
var View = require("../src/renderer/lib/react-native-web/dist/cjs/exports/View/index.js").default;
var TshEditorModel = require("../src/renderer/app/desktop/tshEditor/tshEditorModel.js");
var TshScreenRender = require("../src/renderer/app/desktop/tshEditor/TshScreenRender.js");
var TshLayout = require("../src/renderer/app/desktop/tshEditor/tshLayout.js");
var RealDate = Date;
var fixedNow = null;
// Date that returns the frozen time when built without arguments (the preview reads new Date()).
class FrozenDate extends RealDate {
  constructor(...args) {
    if (args.length === 0 && fixedNow !== null) {
      super(fixedNow);
    } else {
      super(...args);
    }
  }
  static now() {
    return fixedNow !== null ? fixedNow : RealDate.now();
  }
}
window.Date = FrozenDate;
var setView = null;
var noop = function () {};
// Root component: the screen of the current view at the requested scale in a frame (tabindex marks it for the tool).
function App() {
  var view = react.useState(null);
  setView = view[1];
  var v = view[0];
  if (!v) {
    return null;
  }
  var m = TshLayout.metricsFor(v.state.blob.width, v.state.blob.height);
  var screen = v.state.blob.records.find(function (r) {
    return r.uid === v.uid;
  });
  // Whole-pixel preview width, as TSH's own preview (617 px for 1024 at 0.6023) and the earlier baselines used it.
  var scale = Math.round(m.width * v.scale) / m.width;
  return <View style={{ padding: 16, alignItems: "flex-start" }}><div tabIndex={0} style={{ position: "relative", width: m.width * scale, height: m.height * scale, overflow: "hidden" }}><TshScreenRender.TshScreenRender state={v.state} screen={screen} themes={window.__TSH_THEMES__ || []} scale={scale} /></div></View>;
}
var layer = document.getElementById("tshcompare");
if (layer) {
  layer.remove();
}
layer = document.createElement("div");
layer.id = "tshcompare";
layer.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;z-index:99999;background:#fff;overflow:hidden";
document.body.appendChild(layer);
AppRegistry.registerComponent("tshcompare", function () {
  return App;
});
AppRegistry.runApplication("tshcompare", { rootTag: layer });
// Waits for two animation frames. Returns a promise.
var frames = function () {
  return new Promise(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(resolve);
    });
  });
};
window.__tshCompare = {
  render: async function (input, recordIndex, scale, nowMs) {
    if (!window.__TSH_THEMES__) {
      window.__TSH_THEMES__ = await (await fetch("/tsh/themes.json")).json();
    }
    fixedNow = nowMs;
    var loaded = TshEditorModel.loadEditor(input, function (k) {
      return k;
    });
    if (!loaded.ok) {
      throw new Error("input did not load: " + JSON.stringify(loaded.error));
    }
    var record = loaded.state.blob.records[recordIndex];
    setView({ state: loaded.state, uid: record.uid, scale: scale });
    await frames();
    await document.fonts.ready;
    await Promise.all(Array.from(document.querySelectorAll("#tshcompare *")).map(function (el) {
      var bg = getComputedStyle(el).backgroundImage;
      var url = /url\("?([^")]+)"?\)/.exec(bg);
      if (!url) {
        return null;
      }
      var img = new Image();
      img.src = url[1];
      return img.decode().catch(noop);
    }));
    await new Promise(function (resolve) {
      setTimeout(resolve, 300);
    });
    await frames();
    var frame = layer.querySelector('[tabindex="0"]');
    if (!frame) {
      throw new Error("no preview frame");
    }
    var b = frame.getBoundingClientRect();
    return [b.x, b.y, b.width, b.height];
  }
};
